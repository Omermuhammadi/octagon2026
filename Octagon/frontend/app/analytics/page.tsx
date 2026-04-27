"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, BarChart3, Brain, Database, Grid3X3, Loader2, Target, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { analyticsApi, AnalyticsSummary } from "@/lib/api";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const percent = (value?: number | null, decimals = 2) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }
  return `${(value * 100).toFixed(decimals)}%`;
};

const formatImportance = (value: number) => `${(value * 100).toFixed(1)}%`;
const STYLE_ORDER = ["Striker", "Grappler", "Well-Rounded"] as const;

const WEIGHT_CLASS_ORDER = [
  "Heavyweight",
  "Light Heavyweight",
  "Middleweight",
  "Welterweight",
  "Lightweight",
  "Featherweight",
  "Bantamweight",
  "Flyweight",
  "Strawweight",
];

const WEIGHT_CLASS_ABBREVIATIONS: Record<string, string> = {
  Heavyweight: "HW",
  "Light Heavyweight": "LHW",
  Middleweight: "MW",
  Welterweight: "WW",
  Lightweight: "LW",
  Featherweight: "FW",
  Bantamweight: "BW",
  Flyweight: "FLW",
  Strawweight: "SW",
};

const formatPercent1 = (value: number) => `${(value * 100).toFixed(1)}%`;

const getWeightClassBarColor = (value: number, cvAccuracy: number) => {
  if (value >= cvAccuracy) {
    return "#16A34A";
  }
  if (value >= 0.65) {
    return "#D97706";
  }
  return "#DC2626";
};

const getStyleCellColor = (value: number) => {
  if (value >= 0.6) {
    return { background: "#DCFCE7", text: "#166534" };
  }
  if (value <= 0.4) {
    return { background: "#FEE2E2", text: "#991B1B" };
  }
  return { background: "#FEF3C7", text: "#92400E" };
};

const resolveStyleMatrixValue = (
  matrix: Record<string, Record<string, number>> | undefined,
  attacker: string,
  defender: string,
) => {
  if (!matrix) {
    return null;
  }

  const aliases = (label: string) => {
    if (label === "Well-Rounded") {
      return ["Well-Rounded", "WellRounded", "Well Rounded"];
    }
    return [label];
  };

  for (const attackerLabel of aliases(attacker)) {
    const row = matrix[attackerLabel];
    if (!row) {
      continue;
    }

    for (const defenderLabel of aliases(defender)) {
      const value = row[defenderLabel];
      if (typeof value === "number") {
        return value;
      }
    }
  }

  return null;
};

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const response = await analyticsApi.getSummary();
        if (response.success && response.data) {
          setSummary(response.data);
        } else {
          setError(response.message || "Analytics data is unavailable right now.");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load analytics.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadSummary();
  }, []);

  const featureData = useMemo(() => {
    if (!summary?.featureImportance) {
      return [];
    }

    return [...summary.featureImportance]
      .sort((a, b) => b.importance - a.importance)
      .map((item) => ({
        ...item,
        importanceLabel: formatImportance(item.importance),
      }));
  }, [summary]);

  const cvAccuracy = summary?.trainingStats?.cvAccuracy ?? 0;

  const weightClassData = useMemo(() => {
    if (!summary?.weightClassAccuracy) {
      return [];
    }

    const orderMap = new Map(WEIGHT_CLASS_ORDER.map((name, index) => [name, index]));

    return [...summary.weightClassAccuracy]
      .sort((a, b) => (orderMap.get(a.weightClass) ?? 999) - (orderMap.get(b.weightClass) ?? 999))
      .map((item) => ({
        ...item,
        abbreviation: WEIGHT_CLASS_ABBREVIATIONS[item.weightClass] ?? item.weightClass,
        accuracyLabel: formatPercent1(item.accuracy),
        barColor: getWeightClassBarColor(item.accuracy, cvAccuracy),
      }));
  }, [summary, cvAccuracy]);

  const weightClassDomain = useMemo<[number, number]>(() => {
    if (weightClassData.length === 0) {
      return [0.5, 0.8];
    }

    const values = weightClassData.map((item) => item.accuracy);
    const lower = Math.max(0, Math.min(...values, cvAccuracy) - 0.05);
    const upper = Math.min(1, Math.max(...values, cvAccuracy) + 0.05);
    return [lower, upper];
  }, [weightClassData, cvAccuracy]);

  const styleMatrixData = useMemo(() => {
    return STYLE_ORDER.map((attacker) => ({
      attacker,
      cells: STYLE_ORDER.map((defender) => ({
        defender,
        value: resolveStyleMatrixValue(summary?.styleMatrix, attacker, defender),
      })),
    }));
  }, [summary]);

  const styleRules = {
    striker: summary?.styleClassificationRules?.Striker ?? "slpm > 4.0 AND takedown_avg < 1.5",
    grappler: summary?.styleClassificationRules?.Grappler ?? "takedown_avg > 2.5 OR submission_avg > 0.5",
    wellRounded:
      summary?.styleClassificationRules?.WellRounded ??
      "all others",
  };

  const chartHeight = Math.max(420, featureData.length * 30);

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-amber-900 text-white py-12 px-4 mb-10">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-3">
              Data Science Intelligence Layer
            </p>
            <h1 className="text-4xl md:text-5xl font-display font-black tracking-tight mb-3">
              MODEL <span className="text-amber-400">ANALYTICS</span>
            </h1>
            <p className="text-gray-300 text-base max-w-2xl">
              Transparent view of the Octagon Oracle ensemble model trained on UFC fighter statistics.
            </p>
          </motion.div>
        </div>
      </div>

      <motion.div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div variants={itemVariants} className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <Database className="w-5 h-5 text-amber-600" />
              <span className="text-2xl font-black text-gray-900">{summary?.trainingStats?.samples ?? "-"}</span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Training Samples</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <Target className="w-5 h-5 text-emerald-600" />
              <span className="text-2xl font-black text-emerald-600">{percent(summary?.trainingStats?.cvAccuracy)}</span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">CV Accuracy</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <span className="text-2xl font-black text-blue-600">{percent(summary?.trainingStats?.cvPrecision)}</span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Precision</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <Brain className="w-5 h-5 text-red-600" />
              <span className="text-2xl font-black text-red-600">{percent(summary?.trainingStats?.cvF1)}</span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">F1 Score</p>
          </div>
        </motion.div>

        <motion.section variants={itemVariants} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
            <div>
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-600" />
                Global Feature Importance
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Ranked by Gradient Boosting Tree Gini importance (normalized, largest to smallest).
              </p>
            </div>
          </div>

          {loading ? (
            <div className="h-[380px] flex items-center justify-center">
              <Loader2 className="w-7 h-7 animate-spin text-amber-600" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          ) : featureData.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-600 text-sm">
              No feature importance data available.
            </div>
          ) : (
            <div className="space-y-4">
              <div style={{ width: "100%", height: chartHeight }}>
                <ResponsiveContainer>
                  <BarChart
                    data={featureData}
                    layout="vertical"
                    margin={{ top: 8, right: 30, left: 18, bottom: 8 }}
                  >
                    <XAxis
                      type="number"
                      tickFormatter={formatImportance}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: "#6B7280" }}
                    />
                    <YAxis
                      type="category"
                      dataKey="displayName"
                      width={190}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: "#374151" }}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(245, 158, 11, 0.08)" }}
                      formatter={(value: string | number) => [formatImportance(Number(value)), "Importance"]}
                      labelFormatter={(label) => `${label}`}
                    />
                    <Bar dataKey="importance" fill="#F59E0B" radius={[0, 6, 6, 0]}>
                      <LabelList
                        dataKey="importanceLabel"
                        position="right"
                        style={{ fontSize: 11, fill: "#6B7280", fontWeight: 700 }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-800 leading-relaxed">
                The bars show each feature&apos;s global contribution strength in the GBT submodel. Higher values indicate stronger influence on prediction decisions.
              </div>
            </div>
          )}
        </motion.section>

        <motion.section variants={itemVariants} className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="mb-6">
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-600" />
              Weight Class Generalization (4.2)
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Per-division agreement against a win-rate proxy, benchmarked against overall cross-validation accuracy.
            </p>
          </div>

          {loading ? (
            <div className="h-[340px] flex items-center justify-center">
              <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          ) : weightClassData.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-600 text-sm">
              No weight class performance data available.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="h-[360px] w-full">
                <ResponsiveContainer>
                  <BarChart data={weightClassData} margin={{ top: 24, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis
                      dataKey="abbreviation"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: "#374151", fontWeight: 700 }}
                    />
                    <YAxis
                      type="number"
                      domain={weightClassDomain}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value: number) => formatPercent1(value)}
                      tick={{ fontSize: 11, fill: "#6B7280" }}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(16, 185, 129, 0.08)" }}
                      labelFormatter={(_, payload) => {
                        const row = payload?.[0]?.payload as
                          | { weightClass?: string; sampleSize?: number }
                          | undefined;
                        if (!row?.weightClass) {
                          return "Weight Class";
                        }
                        return `${row.weightClass} (n=${row.sampleSize ?? 0})`;
                      }}
                      formatter={(value: string | number) => [formatPercent1(Number(value)), "Agreement"]}
                    />
                    <ReferenceLine
                      y={cvAccuracy}
                      stroke="#1F2937"
                      strokeDasharray="5 4"
                      ifOverflow="extendDomain"
                      label={{ value: `CV ${formatPercent1(cvAccuracy)}`, position: "insideTopRight", fill: "#374151", fontSize: 11 }}
                    />
                    <Bar dataKey="accuracy" radius={[8, 8, 0, 0]}>
                      {weightClassData.map((entry) => (
                        <Cell key={entry.weightClass} fill={entry.barColor} />
                      ))}
                      <LabelList dataKey="accuracyLabel" position="top" style={{ fontSize: 11, fill: "#374151", fontWeight: 700 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-700 leading-relaxed">
                Green bars exceed the global CV benchmark, amber bars are near-benchmark (0.65 &lt;= x &lt; CV), and red bars indicate weaker transferability.
              </div>
            </div>
          )}
        </motion.section>

        <motion.section variants={itemVariants} className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="mb-6">
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
              <Grid3X3 className="w-5 h-5 text-blue-600" />
              Stylistic Matchup Bias Matrix (4.5)
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Cell value is the model-implied probability that the row style defeats the column style.
            </p>
          </div>

          {loading ? (
            <div className="h-[260px] flex items-center justify-center">
              <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-2">
                  <thead>
                    <tr>
                      <th className="text-left text-xs uppercase tracking-wide text-gray-500 px-3 py-2">Attacker / Opponent</th>
                      {STYLE_ORDER.map((style) => (
                        <th key={style} className="text-center text-xs uppercase tracking-wide text-gray-600 px-3 py-2">
                          {style}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {styleMatrixData.map((row) => (
                      <tr key={row.attacker}>
                        <td className="px-3 py-3 text-sm font-bold text-gray-800 bg-gray-100 rounded-lg">{row.attacker}</td>
                        {row.cells.map((cell) => {
                          const value = cell.value ?? 0.5;
                          const tone = getStyleCellColor(value);
                          return (
                            <td
                              key={`${row.attacker}-${cell.defender}`}
                              className="px-3 py-3 text-center text-sm font-bold rounded-lg border border-white"
                              style={{ backgroundColor: tone.background, color: tone.text }}
                            >
                              {percent(value, 1)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-green-800">x &gt;= 60% : favorable edge</div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">40% &lt; x &lt; 60% : balanced matchup</div>
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-red-800">x &lt;= 40% : unfavorable edge</div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-700 leading-relaxed space-y-1">
                <p><strong>Style rules:</strong></p>
                <p>Striker: {styleRules.striker}</p>
                <p>Grappler: {styleRules.grappler}</p>
                <p>Well-Rounded: {styleRules.wellRounded}</p>
              </div>
            </div>
          )}
        </motion.section>
      </motion.div>
    </div>
  );
}
