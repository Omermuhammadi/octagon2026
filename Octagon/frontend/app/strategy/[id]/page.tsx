"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { strategyApi, SavedStrategy } from "@/lib/api";
import {
  ArrowLeft, Loader2, Lock, Target, Clock, Award, Shield,
  Swords, AlertTriangle, Copy, Check, Trash2, BarChart3,
  TrendingUp, ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type TabKey = "overview" | "strengths" | "rounds" | "range" | "targeting" | "takedown" | "dangers" | "corner";

const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "overview", label: "Overview", icon: <BarChart3 className="w-4 h-4" /> },
  { key: "strengths", label: "Strengths", icon: <TrendingUp className="w-4 h-4" /> },
  { key: "rounds", label: "Rounds", icon: <Clock className="w-4 h-4" /> },
  { key: "range", label: "Range", icon: <Target className="w-4 h-4" /> },
  { key: "targeting", label: "Targeting", icon: <Swords className="w-4 h-4" /> },
  { key: "takedown", label: "Takedown", icon: <Shield className="w-4 h-4" /> },
  { key: "dangers", label: "Dangers", icon: <AlertTriangle className="w-4 h-4" /> },
  { key: "corner", label: "Corner", icon: <Award className="w-4 h-4" /> },
];

function ratingColor(rating: string) {
  if (rating === "HIGH") return "bg-green-500/20 text-green-400 border-green-500/30";
  if (rating === "MEDIUM") return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  return "bg-red-500/20 text-red-400 border-red-500/30";
}

function severityColor(severity: string) {
  if (severity === "HIGH") return "border-red-500/30 bg-red-500/10";
  if (severity === "MEDIUM") return "border-yellow-500/30 bg-yellow-500/10";
  return "border-green-500/30 bg-green-500/10";
}

export default function StrategyViewPage() {
  const { user, token, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [strategy, setStrategy] = useState<SavedStrategy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!token || !id) return;
    setLoading(true);
    strategyApi.getById(id, token)
      .then((res) => {
        if (res.success && res.data) setStrategy(res.data);
        else setError("Strategy not found");
      })
      .catch((e: any) => setError(e.message || "Failed to load strategy"))
      .finally(() => setLoading(false));
  }, [token, id]);

  const handleDelete = async () => {
    if (!token || !id || !confirm("Delete this strategy?")) return;
    setDeleting(true);
    try {
      await strategyApi.delete(id, token);
      router.push("/strategy");
    } catch {
      setError("Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const copyCornerAdvice = () => {
    if (!strategy?.cornerAdvice) return;
    const text = strategy.cornerAdvice
      .map((r) => `Round ${r.round}:\n${r.advice.map((a) => `  - ${a}`).join("\n")}`)
      .join("\n\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
      </div>
    );
  }

  if (user?.role !== "coach") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="bg-neutral-900/50 backdrop-blur-sm rounded-2xl border border-white/5 p-8 text-center max-w-md">
          <Lock className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Coach Access Required</h2>
          <p className="text-neutral-400 mb-6">The Strategy Optimizer is available exclusively for coaches.</p>
          <button onClick={() => router.push("/dashboard")} className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-colors">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-neutral-950 to-black pt-24 pb-16 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-red-500 mx-auto mb-4" />
          <p className="text-neutral-400">Loading strategy...</p>
        </div>
      </div>
    );
  }

  if (error || !strategy) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-neutral-950 to-black pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-red-400 mb-4">{error || "Strategy not found"}</p>
          <button onClick={() => router.push("/strategy")} className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl transition-colors">
            Back to Strategy Optimizer
          </button>
        </div>
      </div>
    );
  }

  const s = strategy;
  const pred = s.prediction;

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-neutral-950 to-black pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => router.push("/strategy")} className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" /> Back
          </button>
          <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-2 text-neutral-500 hover:text-red-400 transition-colors text-sm">
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete
          </button>
        </div>

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-display italic text-white mb-2">
            {s.fighter1Name} <span className="text-octagon-red">vs</span> {s.fighter2Name}
          </h1>
          <p className="text-neutral-500 text-sm">
            Generated {new Date(s.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-red-600 text-white shadow-lg shadow-red-500/20"
                  : "bg-neutral-800/80 text-neutral-400 hover:text-white border border-white/5"
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>

            {/* OVERVIEW */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="bg-neutral-900/50 backdrop-blur-sm rounded-2xl border border-white/5 p-8">
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-red-500" /> Win Probability
                  </h2>
                  {[
                    { name: s.fighter1Name, prob: pred.winner === s.fighter1Name ? Math.round(pred.winnerProbability * 100) : Math.round(pred.loserProbability * 100), isWinner: pred.winner === s.fighter1Name },
                    { name: s.fighter2Name, prob: pred.winner === s.fighter2Name ? Math.round(pred.winnerProbability * 100) : Math.round(pred.loserProbability * 100), isWinner: pred.winner === s.fighter2Name },
                  ].map((f, i) => (
                    <div key={i} className="mb-4">
                      <div className="flex justify-between mb-1">
                        <span className={`font-bold ${f.isWinner ? "text-green-400" : "text-white"}`}>
                          {f.name} {f.isWinner && "(Winner)"}
                        </span>
                        <span className="text-white font-bold">{f.prob}%</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-4 overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${f.prob}%` }} transition={{ duration: 1 }}
                          className={`h-full rounded-full ${f.isWinner ? "bg-gradient-to-r from-green-600 to-green-400" : "bg-gradient-to-r from-red-600 to-red-400"}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-neutral-900/50 backdrop-blur-sm rounded-2xl border border-white/5 p-6 text-center">
                    <Target className="w-8 h-8 text-red-500 mx-auto mb-3" />
                    <p className="text-neutral-400 text-sm uppercase tracking-wider mb-1">Method</p>
                    <p className="text-white text-2xl font-bold">{pred.predictedMethod}</p>
                  </div>
                  <div className="bg-neutral-900/50 backdrop-blur-sm rounded-2xl border border-white/5 p-6 text-center">
                    <Clock className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
                    <p className="text-neutral-400 text-sm uppercase tracking-wider mb-1">Round</p>
                    <p className="text-white text-2xl font-bold">Round {pred.predictedRound}</p>
                  </div>
                  <div className="bg-neutral-900/50 backdrop-blur-sm rounded-2xl border border-white/5 p-6 text-center">
                    <Award className="w-8 h-8 text-green-500 mx-auto mb-3" />
                    <p className="text-neutral-400 text-sm uppercase tracking-wider mb-1">Confidence</p>
                    <p className="text-white text-2xl font-bold">{pred.confidence}%</p>
                  </div>
                </div>
                {pred.topFactors && pred.topFactors.length > 0 && (
                  <div className="bg-neutral-900/50 backdrop-blur-sm rounded-2xl border border-white/5 p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-red-500" /> Top Factors
                    </h3>
                    <ul className="space-y-3">
                      {pred.topFactors.map((f, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm">
                          <ChevronRight className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <span className="text-neutral-300">{f.description}</span>
                          <span className={`ml-auto text-xs px-2 py-0.5 rounded-full border ${
                            f.impact === "high" ? "bg-red-500/20 text-red-400 border-red-500/30"
                            : f.impact === "medium" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                            : "bg-green-500/20 text-green-400 border-green-500/30"
                          }`}>{f.impact}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* STRENGTHS */}
            {activeTab === "strengths" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { label: s.fighter1Name, data: s.strengthsWeaknesses?.fighter1, color: "red" },
                  { label: s.fighter2Name, data: s.strengthsWeaknesses?.fighter2, color: "blue" },
                ].map((side, sIdx) => (
                  <div key={sIdx} className="bg-neutral-900/50 backdrop-blur-sm rounded-2xl border border-white/5 p-6">
                    <h3 className="text-lg font-bold text-white mb-4">{side.label}</h3>
                    <div className="space-y-3">
                      {(side.data || []).map((r, i) => (
                        <div key={i} className="flex items-center justify-between gap-3">
                          <span className="text-neutral-300 text-sm">{r.category}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ratingColor(r.rating)}`}>{r.rating}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ROUND STRATEGY */}
            {activeTab === "rounds" && (
              <div className="space-y-6">
                {(s.roundStrategy || []).map((r) => (
                  <div key={r.round} className="bg-neutral-900/50 backdrop-blur-sm rounded-2xl border border-white/5 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-white font-bold text-lg">Round {r.round}</span>
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                        r.approach === "aggressive" ? "bg-red-500/20 text-red-400"
                        : r.approach === "patient" ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-blue-500/20 text-blue-400"
                      }`}>{r.approach.toUpperCase()}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        r.riskLevel === "high" ? "bg-red-500/10 text-red-400"
                        : r.riskLevel === "medium" ? "bg-yellow-500/10 text-yellow-400"
                        : "bg-green-500/10 text-green-400"
                      }`}>Risk: {r.riskLevel}</span>
                    </div>
                    <ul className="space-y-2 mb-3">
                      {r.tactics.map((t, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-neutral-300">
                          <ChevronRight className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" /> {t}
                        </li>
                      ))}
                    </ul>
                    {r.notes && <p className="text-neutral-500 text-sm italic">{r.notes}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* RANGE ANALYSIS */}
            {activeTab === "range" && (
              <div className="space-y-6">
                {s.rangeAnalysis?.bestRange && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                    <span className="text-red-400 font-bold">Optimal Range: {s.rangeAnalysis.bestRange}</span>
                  </div>
                )}
                {(["distance", "clinch", "ground"] as const).map((range) => {
                  const data = s.rangeAnalysis?.[range];
                  if (!data) return null;
                  const isBest = s.rangeAnalysis?.bestRange?.toLowerCase() === range;
                  return (
                    <div key={range} className={`bg-neutral-900/50 backdrop-blur-sm rounded-2xl border p-6 ${isBest ? "border-red-500/30" : "border-white/5"}`}>
                      <div className="flex items-center gap-2 mb-4">
                        <h3 className="text-white font-bold capitalize">{range}</h3>
                        {isBest && <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full">OPTIMAL</span>}
                      </div>
                      <div className="space-y-2 mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-neutral-400 text-sm w-32 truncate">{s.fighter1Name}</span>
                          <div className="flex-1 bg-white/5 rounded-full h-3 overflow-hidden">
                            <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(data.fighter1Score * 10, 100)}%` }} />
                          </div>
                          <span className="text-white text-sm w-12 text-right">{data.fighter1Score}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-neutral-400 text-sm w-32 truncate">{s.fighter2Name}</span>
                          <div className="flex-1 bg-white/5 rounded-full h-3 overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(data.fighter2Score * 10, 100)}%` }} />
                          </div>
                          <span className="text-white text-sm w-12 text-right">{data.fighter2Score}</span>
                        </div>
                      </div>
                      <p className="text-neutral-500 text-sm">{data.recommendation}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* STRIKE TARGETING */}
            {activeTab === "targeting" && (
              <div className="space-y-6">
                {s.strikeTargeting?.primaryTarget && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                    <span className="text-red-400 font-bold">Primary Target: {s.strikeTargeting.primaryTarget}</span>
                  </div>
                )}
                {(["head", "body", "legs"] as const).map((zone) => {
                  const data = s.strikeTargeting?.[zone];
                  if (!data) return null;
                  const isPrimary = data.priority === "primary";
                  return (
                    <div key={zone} className={`bg-neutral-900/50 backdrop-blur-sm rounded-2xl border p-6 ${isPrimary ? "border-red-500/30" : "border-white/5"}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <h3 className="text-white font-bold capitalize">{zone}</h3>
                          {isPrimary && <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full">PRIMARY TARGET</span>}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                          data.priority === "primary" ? "bg-red-500/20 text-red-400 border-red-500/30"
                          : data.priority === "secondary" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                          : "bg-neutral-500/20 text-neutral-400 border-neutral-500/30"
                        }`}>{data.priority}</span>
                      </div>
                      <div className="mb-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-neutral-400">Opponent Defense</span>
                          <span className="text-white">{data.opponentDefense}%</span>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${data.opponentDefense}%` }} />
                        </div>
                      </div>
                      <p className="text-neutral-500 text-sm">{data.recommendation}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAKEDOWN PLAN */}
            {activeTab === "takedown" && (
              <div className="space-y-6">
                <div className="bg-neutral-900/50 backdrop-blur-sm rounded-2xl border border-white/5 p-8 text-center">
                  <div className={`inline-block px-6 py-3 rounded-xl text-xl font-bold mb-4 ${
                    s.takedownPlan?.verdict === "shoot" ? "bg-green-500/20 text-green-400"
                    : s.takedownPlan?.verdict === "stuff" ? "bg-red-500/20 text-red-400"
                    : "bg-yellow-500/20 text-yellow-400"
                  }`}>
                    {s.takedownPlan?.verdict?.toUpperCase()}
                  </div>
                  <p className="text-neutral-300 max-w-2xl mx-auto">{s.takedownPlan?.details}</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Your TD Accuracy", value: `${s.takedownPlan?.yourTdAccuracy || 0}%` },
                    { label: "Opponent TD Defense", value: `${s.takedownPlan?.opponentTdDefense || 0}%` },
                    { label: "Opponent TD Accuracy", value: `${s.takedownPlan?.opponentTdAccuracy || 0}%` },
                    { label: "Your TD Defense", value: `${s.takedownPlan?.yourTdDefense || 0}%` },
                  ].map((stat, i) => (
                    <div key={i} className="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-white/5 p-4 text-center">
                      <p className="text-neutral-500 text-xs uppercase tracking-wider mb-1">{stat.label}</p>
                      <p className="text-white text-2xl font-bold">{stat.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DANGER ZONES */}
            {activeTab === "dangers" && (
              <div className="space-y-4">
                {(!s.dangerZones || s.dangerZones.length === 0) ? (
                  <div className="bg-neutral-900/50 backdrop-blur-sm rounded-2xl border border-white/5 p-8 text-center">
                    <Shield className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="text-neutral-400">No major threats identified for this opponent.</p>
                  </div>
                ) : (
                  s.dangerZones.map((d, i) => (
                    <div key={i} className={`rounded-2xl border p-6 ${severityColor(d.severity)}`}>
                      <div className="flex items-center gap-3 mb-2">
                        <AlertTriangle className={`w-5 h-5 ${d.severity === "HIGH" ? "text-red-400" : d.severity === "MEDIUM" ? "text-yellow-400" : "text-green-400"}`} />
                        <span className="text-white font-bold">{d.threat}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ratingColor(d.severity)}`}>{d.severity}</span>
                      </div>
                      <p className="text-neutral-300 text-sm pl-8">{d.detail}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* CORNER ADVICE */}
            {activeTab === "corner" && (
              <div className="space-y-6">
                <div className="flex justify-end">
                  <button onClick={copyCornerAdvice} className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-xl text-sm text-neutral-300 transition-colors">
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied!" : "Copy All"}
                  </button>
                </div>
                {(s.cornerAdvice || []).map((r) => (
                  <div key={r.round} className="bg-neutral-900/50 backdrop-blur-sm rounded-2xl border border-white/5 p-6">
                    <h3 className="text-white font-bold text-lg mb-4">Round {r.round}</h3>
                    <ul className="space-y-2">
                      {r.advice.map((a, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-neutral-300">
                          <ChevronRight className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" /> {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
