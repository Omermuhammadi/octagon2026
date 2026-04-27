"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/contexts/AuthContext";
import { weightCutApi, WeightLogData, WeightEntry } from "@/lib/api";
import {
    Scale, TrendingDown, TrendingUp, Minus,
    Plus, Loader2, AlertTriangle, CheckCircle2, X,
    Target, Trash2, ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ReferenceLine, ResponsiveContainer, Area, AreaChart,
} from "recharts";

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function getTrend(entries: WeightEntry[]): "up" | "down" | "stable" {
    if (entries.length < 2) return "stable";
    const last3 = entries.slice(-3);
    const first = last3[0].weightKg;
    const last = last3[last3.length - 1].weightKg;
    const delta = last - first;
    if (delta < -0.3) return "down";
    if (delta > 0.3) return "up";
    return "stable";
}

const CustomTooltip = ({ active, payload, label, target }: any) => {
    if (!active || !payload?.length) return null;
    const val = payload[0]?.value;
    const diff = val - target;
    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
            <p className="font-bold text-gray-700 mb-1">{label}</p>
            <p className="font-black text-gray-900">{val} kg</p>
            <p className={diff > 0 ? "text-red-500" : "text-emerald-600"}>
                {diff > 0 ? `+${diff.toFixed(1)} above target` : `${Math.abs(diff).toFixed(1)} below target`}
            </p>
        </div>
    );
};

// ─── main page ────────────────────────────────────────────────────────────────

export default function WeightCutPage() {
    const { user, isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const [log, setLog] = useState<WeightLogData | null>(null);
    const [loading, setLoading] = useState(true);
    const [showLog, setShowLog] = useState(false);
    const [showTarget, setShowTarget] = useState(false);

    // Log weight form
    const [weightInput, setWeightInput] = useState("");
    const [dateInput, setDateInput] = useState(new Date().toISOString().slice(0, 10));
    const [notesInput, setNotesInput] = useState("");
    const [saving, setSaving] = useState(false);
    const [logError, setLogError] = useState("");

    // Target form
    const [targetInput, setTargetInput] = useState("");
    const [thresholdInput, setThresholdInput] = useState("3");
    const [savingTarget, setSavingTarget] = useState(false);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) router.push("/login");
    }, [isAuthenticated, isLoading, router]);

    const load = useCallback(async () => {
        const token = getAuthToken();
        if (!token) return;
        setLoading(true);
        const r = await weightCutApi.getHistory(token);
        if (r.success && r.data) {
            setLog(r.data);
            setTargetInput(String(r.data.targetWeightKg));
            setThresholdInput(String(r.data.alertThresholdKg));
        }
        setLoading(false);
    }, []);

    useEffect(() => { if (isAuthenticated) load(); }, [isAuthenticated, load]);

    const token = getAuthToken() || "";

    const handleLog = async (e: React.FormEvent) => {
        e.preventDefault();
        const kg = parseFloat(weightInput);
        if (isNaN(kg) || kg < 30 || kg > 200) { setLogError("Enter a valid weight (30–200 kg)."); return; }
        setSaving(true);
        const r = await weightCutApi.logWeight({ weightKg: kg, date: dateInput, notes: notesInput }, token);
        setSaving(false);
        if (r.success && r.data) {
            setLog(r.data);
            setShowLog(false);
            setWeightInput("");
            setNotesInput("");
            setLogError("");
        } else {
            setLogError(r.message || "Failed to log weight.");
        }
    };

    const handleSetTarget = async (e: React.FormEvent) => {
        e.preventDefault();
        const t = parseFloat(targetInput);
        if (isNaN(t)) return;
        setSavingTarget(true);
        const r = await weightCutApi.setTarget({ targetWeightKg: t, alertThresholdKg: parseFloat(thresholdInput) || 3 }, token);
        setSavingTarget(false);
        if (r.success && r.data) { setLog(r.data); setShowTarget(false); }
    };

    const handleDeleteEntry = async (id: string) => {
        const r = await weightCutApi.deleteEntry(id, token);
        if (r.success && r.data) setLog(r.data);
    };

    if (isLoading || !isAuthenticated) {
        return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-red-600" /></div>;
    }

    const entries = log?.entries ?? [];
    const target = log?.targetWeightKg ?? 70;
    const threshold = log?.alertThresholdKg ?? 3;
    const latest = entries[entries.length - 1];
    const trend = getTrend(entries);
    const overTarget = latest ? (latest.weightKg - target) : 0;
    const isAlert = overTarget > threshold;

    const chartData = entries.map(e => ({
        date: fmtDate(e.date),
        weight: e.weightKg,
        _id: e._id,
    }));

    const TrendIcon = trend === "down" ? TrendingDown : trend === "up" ? TrendingUp : Minus;
    const trendColor = trend === "down" ? "text-emerald-500" : trend === "up" ? "text-red-500" : "text-gray-400";

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero */}
            <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-blue-900 text-white pt-24 pb-10 px-4 mb-8">
                <div className="max-w-4xl mx-auto">
                    <span className="px-3 py-1 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-widest">Weight Management</span>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight mt-2 mb-1">Weight Cut Tracker</h1>
                    <p className="text-gray-400 text-sm">Daily weigh-ins · trend analysis · coach alerts</p>
                    <div className="flex items-center gap-3 mt-4">
                        <button onClick={() => setShowLog(true)}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl flex items-center gap-2 transition-colors">
                            <Plus className="w-4 h-4" /> Log Weight
                        </button>
                        <button onClick={() => setShowTarget(true)}
                            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 border border-white/20 transition-colors">
                            <Target className="w-3.5 h-3.5" /> Set Target
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 pb-16 space-y-6">
                {/* Alert banner */}
                {isAlert && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3"
                    >
                        <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
                        <div>
                            <p className="font-black text-red-800 text-sm">Weight Alert</p>
                            <p className="text-xs text-red-600">
                                You are <strong>{overTarget.toFixed(1)} kg</strong> above your target of <strong>{target} kg</strong>.
                                Your coach has been notified.
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* Stats row */}
                {!loading && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            {
                                label: "Current Weight",
                                value: latest ? `${latest.weightKg} kg` : "—",
                                icon: Scale,
                                color: "text-gray-900",
                                bg: "bg-white",
                                border: "border-gray-200",
                            },
                            {
                                label: "Target Weight",
                                value: `${target} kg`,
                                icon: Target,
                                color: "text-blue-600",
                                bg: "bg-blue-50",
                                border: "border-blue-100",
                            },
                            {
                                label: "To Cut",
                                value: latest ? `${Math.max(0, overTarget).toFixed(1)} kg` : "—",
                                icon: TrendIcon,
                                color: overTarget > 0 ? "text-red-500" : "text-emerald-600",
                                bg: overTarget > 0 ? "bg-red-50" : "bg-emerald-50",
                                border: overTarget > 0 ? "border-red-100" : "border-emerald-100",
                            },
                            {
                                label: "Weigh-ins Logged",
                                value: entries.length,
                                icon: CheckCircle2,
                                color: "text-amber-600",
                                bg: "bg-amber-50",
                                border: "border-amber-100",
                            },
                        ].map((s, i) => (
                            <motion.div key={s.label}
                                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                                className={`${s.bg} ${s.border} border rounded-2xl p-4`}
                            >
                                <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
                                <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-0.5">{s.label}</div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Chart */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <TrendIcon className={`w-5 h-5 ${trendColor}`} />
                            <h2 className="font-black text-gray-900 uppercase tracking-wide text-sm">Weight Trend</h2>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500 inline-block rounded" /> Weight</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-400 border-dashed inline-block rounded" /> Target</span>
                        </div>
                    </div>
                    {chartData.length < 2 ? (
                        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                            Log at least 2 weigh-ins to see your trend chart.
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip target={target} />} />
                                <ReferenceLine y={target} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'Target', position: 'insideTopRight', fontSize: 10, fill: '#ef4444' }} />
                                <Area type="monotone" dataKey="weight" stroke="#3B82F6" strokeWidth={2.5} fill="url(#wGrad)" dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </motion.div>

                {/* Entry history */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
                >
                    <h2 className="font-black text-gray-900 uppercase tracking-wide text-sm mb-4 flex items-center gap-2">
                        <Scale className="w-4 h-4 text-blue-600" /> Weigh-in Log
                    </h2>
                    {entries.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-6">No entries yet. Log your first weigh-in above.</p>
                    ) : (
                        <div className="space-y-2">
                            {[...entries].reverse().map(e => {
                                const diff = e.weightKg - target;
                                return (
                                    <div key={e._id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${diff > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
                                            {diff > 0 ? <TrendingUp className="w-3.5 h-3.5 text-red-500" /> : <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <span className="font-black text-gray-900 text-sm">{e.weightKg} kg</span>
                                            {e.notes && <span className="text-xs text-gray-400 ml-2">{e.notes}</span>}
                                        </div>
                                        <span className={`text-xs font-bold ${diff > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                            {diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)} kg
                                        </span>
                                        <span className="text-xs text-gray-400 whitespace-nowrap">{fmtDate(e.date)}</span>
                                        <button onClick={() => handleDeleteEntry(e._id)} className="text-gray-200 hover:text-red-400 transition-colors">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Log weight modal */}
            <AnimatePresence>
                {showLog && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={e => { if (e.target === e.currentTarget) setShowLog(false); }}
                    >
                        <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
                        >
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-lg font-black text-gray-900">Log Today's Weight</h2>
                                <button onClick={() => setShowLog(false)}><X className="w-5 h-5 text-gray-400" /></button>
                            </div>
                            <form onSubmit={handleLog} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Weight (kg) *</label>
                                    <input type="number" step="0.1" value={weightInput} onChange={e => setWeightInput(e.target.value)}
                                        placeholder="e.g. 77.5" autoFocus
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 text-center text-2xl font-black" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Date</label>
                                    <input type="date" value={dateInput} onChange={e => setDateInput(e.target.value)}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Notes (optional)</label>
                                    <input value={notesInput} onChange={e => setNotesInput(e.target.value)}
                                        placeholder="Morning fasted, post-training, etc." className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
                                </div>
                                {logError && <p className="text-xs text-red-600">{logError}</p>}
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setShowLog(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-50">Cancel</button>
                                    <button type="submit" disabled={saving || !weightInput}
                                        className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                                        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                        Save
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}

                {/* Set target modal */}
                {showTarget && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={e => { if (e.target === e.currentTarget) setShowTarget(false); }}
                    >
                        <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
                        >
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-lg font-black text-gray-900">Set Target Weight</h2>
                                <button onClick={() => setShowTarget(false)}><X className="w-5 h-5 text-gray-400" /></button>
                            </div>
                            <form onSubmit={handleSetTarget} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Target Weight (kg) *</label>
                                    <input type="number" step="0.5" value={targetInput} onChange={e => setTargetInput(e.target.value)}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Alert Threshold (kg over target)</label>
                                    <input type="number" step="0.5" min="0.5" max="10" value={thresholdInput} onChange={e => setThresholdInput(e.target.value)}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
                                    <p className="text-xs text-gray-400 mt-1">Coach is notified when you exceed target by this amount.</p>
                                </div>
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setShowTarget(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-50">Cancel</button>
                                    <button type="submit" disabled={savingTarget}
                                        className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                                        {savingTarget && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                        Save Target
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
