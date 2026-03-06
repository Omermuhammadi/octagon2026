"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { fighterApi, predictionApi, PredictionResult, PredictionRecord } from "@/lib/api";
import {
    Search,
    Zap,
    TrendingUp,
    Shield,
    Target,
    Award,
    Clock,
    ChevronRight,
    Loader2,
    Swords,
    BarChart3,
    History,
    AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FighterOption {
    _id: string;
    name: string;
    wins: number;
    losses: number;
    draws: number;
    weight: string;
}

export default function PredictionPage() {
    const { user, token, isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const [fighter1Search, setFighter1Search] = useState("");
    const [fighter2Search, setFighter2Search] = useState("");
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

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [authLoading, isAuthenticated, router]);

    // Fighter search debounce
    const searchFighters = useCallback(async (query: string, setter: (opts: FighterOption[]) => void) => {
        if (query.length < 2) { setter([]); return; }
        try {
            const res = await fighterApi.searchFighters(query, 8);
            if (res.success && res.data) {
                setter(res.data as unknown as FighterOption[]);
            }
        } catch { setter([]); }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => searchFighters(fighter1Search, setFighter1Options), 300);
        return () => clearTimeout(timer);
    }, [fighter1Search, searchFighters]);

    useEffect(() => {
        const timer = setTimeout(() => searchFighters(fighter2Search, setFighter2Options), 300);
        return () => clearTimeout(timer);
    }, [fighter2Search, searchFighters]);

    // Load history
    useEffect(() => {
        if (token) {
            predictionApi.getHistory(token).then(res => {
                if (res.success && res.data) setHistory(res.data);
            }).catch(() => {});
        }
    }, [token, result]);

    const handlePredict = async () => {
        if (!selectedFighter1 || !selectedFighter2 || !token) return;
        setError("");
        setPredicting(true);
        setResult(null);
        try {
            const res = await predictionApi.predict(selectedFighter1.name, selectedFighter2.name, token);
            if (res.success && res.data) {
                setResult(res.data);
            }
        } catch (e: any) {
            setError(e.message || "Prediction failed");
        } finally {
            setPredicting(false);
        }
    };

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-red-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-black via-neutral-950 to-black pt-24 pb-16">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                        Fight <span className="text-red-500">Predictions</span>
                    </h1>
                    <p className="text-neutral-400 max-w-xl mx-auto text-lg">
                        AI-powered predictions using statistical analysis of 4,400+ UFC fighters
                    </p>
                </motion.div>

                {/* Fighter Selection */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-10"
                >
                    {/* Fighter 1 */}
                    <div className="md:col-span-2 relative">
                        <label className="block text-sm font-medium text-neutral-400 uppercase tracking-wider mb-2">Fighter 1</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                            <input
                                type="text"
                                value={fighter1Search}
                                onChange={(e) => { setFighter1Search(e.target.value); setSelectedFighter1(null); setShowF1Dropdown(true); }}
                                onFocus={() => setShowF1Dropdown(true)}
                                placeholder="Search fighter..."
                                className="w-full bg-neutral-900/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-red-500/50 transition-colors"
                            />
                        </div>
                        {showF1Dropdown && fighter1Options.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-neutral-900 border border-white/10 rounded-xl max-h-60 overflow-y-auto shadow-2xl">
                                {fighter1Options.map(f => (
                                    <button key={f._id} onClick={() => { setSelectedFighter1(f); setFighter1Search(f.name); setShowF1Dropdown(false); }}
                                        className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                                    >
                                        <span className="text-white font-medium">{f.name}</span>
                                        <span className="text-neutral-500 text-sm ml-2">({f.wins}-{f.losses}-{f.draws})</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        {selectedFighter1 && (
                            <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <p className="text-white font-semibold">{selectedFighter1.name}</p>
                                <p className="text-neutral-400 text-sm">{selectedFighter1.wins}W-{selectedFighter1.losses}L-{selectedFighter1.draws}D | {selectedFighter1.weight}</p>
                            </div>
                        )}
                    </div>

                    {/* VS */}
                    <div className="flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-lg shadow-red-500/20">
                            <span className="text-white font-bold text-xl">VS</span>
                        </div>
                    </div>

                    {/* Fighter 2 */}
                    <div className="md:col-span-2 relative">
                        <label className="block text-sm font-medium text-neutral-400 uppercase tracking-wider mb-2">Fighter 2</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                            <input
                                type="text"
                                value={fighter2Search}
                                onChange={(e) => { setFighter2Search(e.target.value); setSelectedFighter2(null); setShowF2Dropdown(true); }}
                                onFocus={() => setShowF2Dropdown(true)}
                                placeholder="Search fighter..."
                                className="w-full bg-neutral-900/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-red-500/50 transition-colors"
                            />
                        </div>
                        {showF2Dropdown && fighter2Options.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-neutral-900 border border-white/10 rounded-xl max-h-60 overflow-y-auto shadow-2xl">
                                {fighter2Options.map(f => (
                                    <button key={f._id} onClick={() => { setSelectedFighter2(f); setFighter2Search(f.name); setShowF2Dropdown(false); }}
                                        className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                                    >
                                        <span className="text-white font-medium">{f.name}</span>
                                        <span className="text-neutral-500 text-sm ml-2">({f.wins}-{f.losses}-{f.draws})</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        {selectedFighter2 && (
                            <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                <p className="text-white font-semibold">{selectedFighter2.name}</p>
                                <p className="text-neutral-400 text-sm">{selectedFighter2.wins}W-{selectedFighter2.losses}L-{selectedFighter2.draws}D | {selectedFighter2.weight}</p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Predict Button */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-center mb-10">
                    <button
                        onClick={handlePredict}
                        disabled={!selectedFighter1 || !selectedFighter2 || predicting}
                        className="px-10 py-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold text-lg rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-3 mx-auto"
                    >
                        {predicting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                        {predicting ? "Analyzing..." : "Predict Fight"}
                    </button>
                </motion.div>

                {error && (
                    <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-center flex items-center justify-center gap-2">
                        <AlertCircle className="w-5 h-5" /> {error}
                    </div>
                )}

                {/* Results */}
                <AnimatePresence>
                    {result && (
                        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                            {/* Win Probability */}
                            <div className="bg-neutral-900/50 backdrop-blur-sm rounded-2xl border border-white/5 p-8">
                                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-red-500" /> Win Probability
                                </h2>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <span className={`font-bold ${result.prediction.winner === result.fighter1.name ? 'text-green-400' : 'text-white'}`}>
                                                {result.fighter1.name} {result.prediction.winner === result.fighter1.name && '(Winner)'}
                                            </span>
                                            <span className="text-white font-bold">{result.fighter1.probability}%</span>
                                        </div>
                                        <div className="w-full bg-white/5 rounded-full h-4 overflow-hidden">
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${result.fighter1.probability}%` }} transition={{ duration: 1, ease: "easeOut" }}
                                                className={`h-full rounded-full ${result.prediction.winner === result.fighter1.name ? 'bg-gradient-to-r from-green-600 to-green-400' : 'bg-gradient-to-r from-red-600 to-red-400'}`}
                                            />
                                        </div>
                                        <span className="text-neutral-500 text-sm">{result.fighter1.record}</span>
                                    </div>
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <span className={`font-bold ${result.prediction.winner === result.fighter2.name ? 'text-green-400' : 'text-white'}`}>
                                                {result.fighter2.name} {result.prediction.winner === result.fighter2.name && '(Winner)'}
                                            </span>
                                            <span className="text-white font-bold">{result.fighter2.probability}%</span>
                                        </div>
                                        <div className="w-full bg-white/5 rounded-full h-4 overflow-hidden">
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${result.fighter2.probability}%` }} transition={{ duration: 1, ease: "easeOut" }}
                                                className={`h-full rounded-full ${result.prediction.winner === result.fighter2.name ? 'bg-gradient-to-r from-green-600 to-green-400' : 'bg-gradient-to-r from-blue-600 to-blue-400'}`}
                                            />
                                        </div>
                                        <span className="text-neutral-500 text-sm">{result.fighter2.record}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Prediction Details */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-neutral-900/50 backdrop-blur-sm rounded-2xl border border-white/5 p-6 text-center">
                                    <Target className="w-8 h-8 text-red-500 mx-auto mb-3" />
                                    <p className="text-neutral-400 text-sm uppercase tracking-wider mb-1">Method</p>
                                    <p className="text-white text-2xl font-bold">{result.prediction.method}</p>
                                </div>
                                <div className="bg-neutral-900/50 backdrop-blur-sm rounded-2xl border border-white/5 p-6 text-center">
                                    <Clock className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
                                    <p className="text-neutral-400 text-sm uppercase tracking-wider mb-1">Round</p>
                                    <p className="text-white text-2xl font-bold">Round {result.prediction.round}</p>
                                </div>
                                <div className="bg-neutral-900/50 backdrop-blur-sm rounded-2xl border border-white/5 p-6 text-center">
                                    <Award className="w-8 h-8 text-green-500 mx-auto mb-3" />
                                    <p className="text-neutral-400 text-sm uppercase tracking-wider mb-1">Confidence</p>
                                    <p className="text-white text-2xl font-bold">{result.prediction.confidence}%</p>
                                </div>
                            </div>

                            {/* Key Factors */}
                            {result.prediction.factors.length > 0 && (
                                <div className="bg-neutral-900/50 backdrop-blur-sm rounded-2xl border border-white/5 p-6">
                                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-red-500" /> Key Factors
                                    </h3>
                                    <ul className="space-y-3">
                                        {result.prediction.factors.map((factor, idx) => (
                                            <li key={idx} className="flex items-start gap-3 text-sm">
                                                <ChevronRight className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                                <span className="text-neutral-300">{factor}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* History Toggle */}
                <div className="mt-12">
                    <button onClick={() => setShowHistory(!showHistory)}
                        className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors mb-6"
                    >
                        <History className="w-5 h-5" />
                        <span className="font-medium">{showHistory ? 'Hide' : 'Show'} Prediction History ({history.length})</span>
                    </button>

                    <AnimatePresence>
                        {showHistory && history.length > 0 && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                className="bg-neutral-900/50 backdrop-blur-sm rounded-2xl border border-white/5 overflow-hidden"
                            >
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-white/10">
                                                <th className="text-left p-4 text-neutral-400 font-medium">Matchup</th>
                                                <th className="text-left p-4 text-neutral-400 font-medium">Predicted Winner</th>
                                                <th className="text-left p-4 text-neutral-400 font-medium">Method</th>
                                                <th className="text-left p-4 text-neutral-400 font-medium">Confidence</th>
                                                <th className="text-left p-4 text-neutral-400 font-medium">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {history.map((p) => (
                                                <tr key={p._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                    <td className="p-4 text-white">{p.fighter1Name} vs {p.fighter2Name}</td>
                                                    <td className="p-4 text-green-400 font-medium">{p.predictedWinner}</td>
                                                    <td className="p-4 text-neutral-300">{p.method}</td>
                                                    <td className="p-4 text-neutral-300">{p.confidence}%</td>
                                                    <td className="p-4 text-neutral-500">{new Date(p.createdAt).toLocaleDateString()}</td>
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
