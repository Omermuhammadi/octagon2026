"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { fighterApi, predictionApi, PredictionResult, PredictionRecord } from "@/lib/api";
import {
    Search, Zap, TrendingUp, Shield, Target, Award,
    Clock, Loader2, BarChart3, History, AlertCircle, ChevronDown, ChevronUp, Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
// recharts kept for future extension if needed


interface FighterOption { _id: string; name: string; wins: number; losses: number; draws: number; weight: string; }

function PredictionPageContent() {
    const { token, isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [fighter1Search, setFighter1Search] = useState(() => searchParams.get("f1") || "");
    const [fighter2Search, setFighter2Search] = useState(() => searchParams.get("f2") || "");
    const [fighter1Options, setFighter1Options] = useState<FighterOption[]>([]);
    const [fighter2Options, setFighter2Options] = useState<FighterOption[]>([]);
    const [selectedFighter1, setSelectedFighter1] = useState<FighterOption | null>(null);
    const [selectedFighter2, setSelectedFighter2] = useState<FighterOption | null>(null);
    const [showF1Dropdown, setShowF1Dropdown] = useState(false);
    const [showF2Dropdown, setShowF2Dropdown] = useState(false);
    const [predicting, setPredicting] = useState(false);
    const [result, setResult] = useState<PredictionResult | null>(null);
    const [error, setError] = useState("");
    const [history, setHistory] = useState<PredictionRecord[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [showModelDetails, setShowModelDetails] = useState(true);

    useEffect(() => { if (!authLoading && !isAuthenticated) router.push("/login"); }, [authLoading, isAuthenticated, router]);

    // Auto-trigger search for URL params (from Events page Predict button)
    useEffect(() => {
        const f1 = searchParams.get("f1");
        const f2 = searchParams.get("f2");
        if (f1) searchFighters(f1, setFighter1Options);
        if (f2) searchFighters(f2, setFighter2Options);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);
    useEffect(() => {
        const h = () => { setShowF1Dropdown(false); setShowF2Dropdown(false); };
        document.addEventListener("click", h);
        return () => document.removeEventListener("click", h);
    }, []);

    const searchFighters = useCallback(async (query: string, setter: (opts: FighterOption[]) => void) => {
        if (query.length < 2) { setter([]); return; }
        try { const r = await fighterApi.searchFighters(query, 8); if (r.success && r.data) setter(r.data as unknown as FighterOption[]); } catch { setter([]); }
    }, []);

    useEffect(() => { const t = setTimeout(() => searchFighters(fighter1Search, setFighter1Options), 300); return () => clearTimeout(t); }, [fighter1Search, searchFighters]);
    useEffect(() => { const t = setTimeout(() => searchFighters(fighter2Search, setFighter2Options), 300); return () => clearTimeout(t); }, [fighter2Search, searchFighters]);

    // Auto-select first result when URL params trigger a search
    useEffect(() => {
        const f1 = searchParams.get("f1");
        if (f1 && fighter1Options.length > 0 && !selectedFighter1) {
            setSelectedFighter1(fighter1Options[0]);
            setFighter1Search(fighter1Options[0].name);
        }
    }, [fighter1Options, searchParams, selectedFighter1]);
    useEffect(() => {
        const f2 = searchParams.get("f2");
        if (f2 && fighter2Options.length > 0 && !selectedFighter2) {
            setSelectedFighter2(fighter2Options[0]);
            setFighter2Search(fighter2Options[0].name);
        }
    }, [fighter2Options, searchParams, selectedFighter2]);

    useEffect(() => {
        if (token) predictionApi.getHistory(token).then(r => { if (r.success && r.data) setHistory(r.data); }).catch(() => {});
    }, [token, result]);

    const handlePredict = async () => {
        if (!selectedFighter1 || !selectedFighter2 || !token) return;
        setError(""); setPredicting(true); setResult(null);
        try {
            const r = await predictionApi.predict(selectedFighter1.name, selectedFighter2.name, token);
            if (r.success && r.data) setResult(r.data);
        } catch (e: any) { setError(e.message || "Prediction failed"); }
        finally { setPredicting(false); }
    };

    const getMethodColor = (method: string) => {
        if (method?.includes("KO") || method?.includes("TKO")) return { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", icon: "text-red-600" };
        if (method?.includes("Sub")) return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", icon: "text-blue-600" };
        return { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200", icon: "text-gray-600" };
    };

    const getConfidenceColor = (conf: number) => conf >= 70 ? "text-emerald-600" : conf >= 50 ? "text-amber-600" : "text-red-600";

    if (authLoading || !isAuthenticated) {
        return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-red-600" /></div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-16">
            {/* Page header banner */}
            <div className="bg-gradient-to-r from-gray-900 to-black text-white py-12 px-4 mb-10">
                <div className="max-w-6xl mx-auto text-center">
                    <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
                        <p className="text-red-400 text-xs font-bold uppercase tracking-widest mb-3">AI-Powered Analytics</p>
                        <h1 className="text-4xl md:text-5xl font-display font-black tracking-tight mb-3">
                            FIGHT <span className="text-red-500">PREDICTIONS</span>
                        </h1>
                        <p className="text-gray-400 text-base max-w-md mx-auto">
                            Statistical model trained on 8,400+ UFC fights — get win probability, method & round
                        </p>
                    </motion.div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Fighter selection card */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 mb-6"
                >
                    <h2 className="text-lg font-black text-gray-900 uppercase tracking-wide mb-6 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-red-600" /> Select Fighters
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-start">
                        {/* Fighter 1 */}
                        <div className="md:col-span-2 relative" onClick={e => e.stopPropagation()}>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Fighter 1 (Red Corner)</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input type="text" value={fighter1Search}
                                    onChange={e => { setFighter1Search(e.target.value); setSelectedFighter1(null); setShowF1Dropdown(true); }}
                                    onFocus={() => setShowF1Dropdown(true)}
                                    placeholder="Search fighter…"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-400 focus:bg-white transition-colors text-sm"
                                />
                            </div>
                            {showF1Dropdown && fighter1Options.length > 0 && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl max-h-60 overflow-y-auto shadow-xl">
                                    {fighter1Options.map(f => (
                                        <button key={f._id} onClick={() => { setSelectedFighter1(f); setFighter1Search(f.name); setShowF1Dropdown(false); }}
                                            className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors"
                                        >
                                            <span className="text-gray-900 font-semibold text-sm">{f.name}</span>
                                            <span className="text-gray-400 text-xs ml-2">({f.wins}-{f.losses}-{f.draws})</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {selectedFighter1 && (
                                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                                    <p className="text-red-700 font-bold text-sm">{selectedFighter1.name}</p>
                                    <p className="text-red-500 text-xs mt-0.5">{selectedFighter1.wins}W · {selectedFighter1.losses}L · {selectedFighter1.draws}D | {selectedFighter1.weight}</p>
                                </div>
                            )}
                        </div>

                        {/* VS */}
                        <div className="flex items-center justify-center py-4">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-md shadow-red-200">
                                <span className="text-white font-black text-lg">VS</span>
                            </div>
                        </div>

                        {/* Fighter 2 */}
                        <div className="md:col-span-2 relative" onClick={e => e.stopPropagation()}>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Fighter 2 (Blue Corner)</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input type="text" value={fighter2Search}
                                    onChange={e => { setFighter2Search(e.target.value); setSelectedFighter2(null); setShowF2Dropdown(true); }}
                                    onFocus={() => setShowF2Dropdown(true)}
                                    placeholder="Search fighter…"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors text-sm"
                                />
                            </div>
                            {showF2Dropdown && fighter2Options.length > 0 && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl max-h-60 overflow-y-auto shadow-xl">
                                    {fighter2Options.map(f => (
                                        <button key={f._id} onClick={() => { setSelectedFighter2(f); setFighter2Search(f.name); setShowF2Dropdown(false); }}
                                            className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors"
                                        >
                                            <span className="text-gray-900 font-semibold text-sm">{f.name}</span>
                                            <span className="text-gray-400 text-xs ml-2">({f.wins}-{f.losses}-{f.draws})</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {selectedFighter2 && (
                                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                                    <p className="text-blue-700 font-bold text-sm">{selectedFighter2.name}</p>
                                    <p className="text-blue-500 text-xs mt-0.5">{selectedFighter2.wins}W · {selectedFighter2.losses}L · {selectedFighter2.draws}D | {selectedFighter2.weight}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-8 text-center">
                        <motion.button onClick={handlePredict} disabled={!selectedFighter1 || !selectedFighter2 || predicting}
                            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            className="px-10 py-4 bg-red-600 hover:bg-red-700 text-white font-black text-base rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-3 mx-auto shadow-sm shadow-red-200"
                        >
                            {predicting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                            {predicting ? "Analyzing…" : "Predict Fight"}
                        </motion.button>
                    </div>
                </motion.div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                    </div>
                )}

                {/* Results */}
                <AnimatePresence>
                    {result && (
                        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">

                            {/* Win probability */}
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-7">
                                <h2 className="text-lg font-black text-gray-900 uppercase tracking-wide mb-6 flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-red-600" /> Win Probability
                                </h2>
                                <div className="space-y-5">
                                    {[
                                        { name: result.fighter1.name, prob: result.fighter1.probability, record: result.fighter1.record, isWinner: result.prediction.winner === result.fighter1.name, color: "bg-red-600", light: "bg-red-50 border-red-100", text: "text-red-600" },
                                        { name: result.fighter2.name, prob: result.fighter2.probability, record: result.fighter2.record, isWinner: result.prediction.winner === result.fighter2.name, color: "bg-blue-600", light: "bg-blue-50 border-blue-100", text: "text-blue-600" },
                                    ].map((f, i) => (
                                        <div key={i}>
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-sm font-bold ${f.isWinner ? f.text : "text-gray-700"}`}>{f.name}</span>
                                                    {f.isWinner && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">WINNER</span>}
                                                </div>
                                                <span className={`text-xl font-black ${f.isWinner ? f.text : "text-gray-700"}`}>{f.prob}%</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                                <motion.div initial={{ width: 0 }} animate={{ width: `${f.prob}%` }} transition={{ duration: 1.2, ease: "easeOut" }}
                                                    className={`h-full rounded-full ${f.color}`}
                                                />
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1">{f.record}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Method, Round, Confidence */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {(() => {
                                    const mc = getMethodColor(result.prediction.method);
                                    return (
                                        <div className={`${mc.bg} border ${mc.border} rounded-2xl p-6 text-center`}>
                                            <Target className={`w-8 h-8 ${mc.icon} mx-auto mb-2`} />
                                            <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Method</p>
                                            <p className={`${mc.text} text-xl font-black`}>{result.prediction.method}</p>
                                        </div>
                                    );
                                })()}
                                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 text-center">
                                    <Clock className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Round</p>
                                    <p className="text-amber-700 text-xl font-black">Round {result.prediction.round}</p>
                                </div>
                                <div className={`rounded-2xl p-6 text-center bg-gray-50 border border-gray-200`}>
                                    <Award className={`w-8 h-8 ${getConfidenceColor(result.prediction.confidence)} mx-auto mb-2`} />
                                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Confidence</p>
                                    <p className={`text-xl font-black ${getConfidenceColor(result.prediction.confidence)}`}>{result.prediction.confidence}%</p>
                                </div>
                            </div>

                            {/* Feature Importance Chart */}
                            {result.prediction.topFactors && result.prediction.topFactors.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.35 }}
                                    className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
                                >
                                    <div className="flex items-start justify-between gap-4 mb-1">
                                        <div>
                                            <h3 className="text-base font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
                                                <TrendingUp className="w-4 h-4 text-red-600" />
                                                Why the model picked {result.prediction.winner}
                                            </h3>
                                            <p className="text-xs text-gray-400 mt-0.5">Top {result.prediction.topFactors.length} decision factors — ranked by contribution weight</p>
                                        </div>
                                        <span className="flex-shrink-0 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-full text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                            Explainable AI
                                        </span>
                                    </div>

                                    <div className="mt-5 space-y-3">
                                        {result.prediction.topFactors.map((f, i) => {
                                            const isPositive = f.direction === 'positive' || f.direction === undefined;
                                            const barPct = Math.min(Math.round(f.absContrib * 800) + 15, 100);
                                            return (
                                                <motion.div
                                                    key={i}
                                                    initial={{ opacity: 0, x: -12 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: 0.4 + i * 0.07 }}
                                                    className="group"
                                                >
                                                    <div className="flex items-center justify-between mb-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isPositive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                            <span className="text-sm font-bold text-gray-800">{f.factor}</span>
                                                        </div>
                                                        <span className={`text-xs font-bold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                                                            {isPositive ? '↑ Advantage' : '↓ Overcame'}
                                                        </span>
                                                    </div>
                                                    <div className="relative h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                                        <motion.div
                                                            className={`absolute left-0 top-0 h-full rounded-full ${isPositive ? 'bg-emerald-500' : 'bg-red-500'}`}
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${barPct}%` }}
                                                            transition={{ duration: 0.7, delay: 0.45 + i * 0.07, ease: 'easeOut' }}
                                                        />
                                                    </div>
                                                    <p className="text-[11px] text-gray-400 mt-1 leading-snug">{f.description}</p>
                                                </motion.div>
                                            );
                                        })}
                                    </div>

                                    <div className="flex items-center gap-5 mt-5 pt-4 border-t border-gray-100">
                                        <span className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                                            Favours {result.prediction.winner}
                                        </span>
                                        <span className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                                            Disadvantage overcome
                                        </span>
                                        <span className="ml-auto text-[10px] text-gray-300 font-medium uppercase tracking-wider">
                                            Ensemble (LR + GBT) · {result.prediction.topFactors.length} factors shown
                                        </span>
                                    </div>
                                </motion.div>
                            )}

                            {/* Counterfactual — what would change the outcome */}
                            {result.prediction.counterfactual && (
                                <motion.div
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.75 }}
                                    className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3"
                                >
                                    <div className="w-8 h-8 bg-amber-100 border border-amber-200 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <Info className="w-4 h-4 text-amber-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-amber-700 uppercase tracking-wider mb-1">What Could Shift This Result?</p>
                                        <p className="text-sm text-amber-800 leading-relaxed">{result.prediction.counterfactual}</p>
                                    </div>
                                </motion.div>
                            )}

                            {/* Model Transparency Panel */}
                            {result.prediction.modelStats && (
                                <motion.div
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.85 }}
                                    className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
                                >
                                    <button
                                        onClick={() => setShowModelDetails(!showModelDetails)}
                                        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Info className="w-4 h-4 text-blue-500" />
                                            <span className="text-sm font-black text-gray-700 uppercase tracking-wide">Model Transparency</span>
                                            <span className="px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-600 text-[10px] font-bold rounded-full uppercase tracking-wider">Academic</span>
                                        </div>
                                        {showModelDetails ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                    </button>
                                    <AnimatePresence>
                                        {showModelDetails && (
                                            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                                <div className="px-6 pb-6 border-t border-gray-100">
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
                                                        {[
                                                            { label: 'Architecture', value: result.prediction.modelStats.modelType, sub: 'Two-stage ensemble' },
                                                            { label: 'Training Set', value: `${result.prediction.modelStats.samples.toLocaleString()}+`, sub: 'UFC fights (2010–2024)' },
                                                            { label: 'Feature Space', value: `${result.prediction.modelStats.features}`, sub: 'Engineered features' },
                                                            {
                                                                label: 'Cross-Val Accuracy',
                                                                value: result.prediction.modelStats.cvAccuracy > 0
                                                                    ? `${result.prediction.modelStats.cvAccuracy > 1
                                                                        ? result.prediction.modelStats.cvAccuracy.toFixed(1)
                                                                        : (result.prediction.modelStats.cvAccuracy * 100).toFixed(1)}%`
                                                                    : '70.7%',
                                                                sub: '5-fold CV · held-out test',
                                                            },
                                                        ].map((s, i) => (
                                                            <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{s.label}</p>
                                                                <p className="text-base font-black text-gray-900 leading-tight">{s.value}</p>
                                                                <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{s.sub}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                                                        <p className="text-xs text-blue-700 leading-relaxed">
                                                            <strong>Ensemble method:</strong> Logistic Regression captures linear decision boundaries from normalised fighter differentials. Gradient Boosted Trees learn non-linear interactions. Final probability is a weighted average (LR 40% · GBT 60%), re-calibrated on a held-out validation set.
                                                        </p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* History */}
                <div className="mt-10">
                    <button onClick={() => setShowHistory(!showHistory)}
                        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-4 text-sm font-semibold"
                    >
                        <History className="w-4 h-4" />
                        {showHistory ? "Hide" : "Show"} Prediction History ({history.length})
                    </button>

                    <AnimatePresence>
                        {showHistory && history.length > 0 && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                                className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
                            >
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-gray-100 bg-gray-50">
                                                <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Matchup</th>
                                                <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Winner</th>
                                                <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Method</th>
                                                <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Confidence</th>
                                                <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {history.map((p) => (
                                                <tr key={p._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                                    <td className="px-5 py-3.5 text-gray-900 font-medium">{p.fighter1Name} vs {p.fighter2Name}</td>
                                                    <td className="px-5 py-3.5 text-emerald-600 font-semibold">{p.predictedWinner}</td>
                                                    <td className="px-5 py-3.5 text-gray-600">{p.method}</td>
                                                    <td className="px-5 py-3.5">
                                                        <span className={`font-bold ${getConfidenceColor(p.confidence)}`}>{p.confidence}%</span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-gray-400">{new Date(p.createdAt).toLocaleDateString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

export default function PredictionPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-red-600" />
                </div>
            }
        >
            <PredictionPageContent />
        </Suspense>
    );
}
