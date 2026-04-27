"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { getAuthToken } from "@/contexts/AuthContext";
import { opponentDossierApi, fightCampApi, DossierResult, FightCamp, OpponentStats } from "@/lib/api";
import {
    Swords, Search, Loader2, Brain, Target, Shield,
    Zap, ChevronRight, AlertCircle, CheckCircle2,
    TrendingUp, Users, BarChart2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import React, { Suspense } from "react";
import {
    RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

// ─── markdown renderer ────────────────────────────────────────────────────────

function renderMarkdown(text: string): React.ReactElement[] {
    const lines = text.split("\n");
    const elements: React.ReactElement[] = [];
    let key = 0;

    for (const line of lines) {
        const k = key++;
        if (line.startsWith("## ")) {
            elements.push(<h2 key={k} className="text-base font-black text-gray-900 mt-5 mb-2 flex items-center gap-2"><span className="w-1.5 h-4 bg-red-600 rounded-full inline-block" />{line.slice(3)}</h2>);
        } else if (line.startsWith("**") && line.endsWith("**")) {
            elements.push(<p key={k} className="font-black text-gray-800 text-sm mt-3 mb-1">{line.slice(2, -2)}</p>);
        } else if (line.startsWith("- ")) {
            const content = line.slice(2).replace(/\*\*(.*?)\*\*/g, (_: string, m: string) => `<strong>${m}</strong>`);
            elements.push(<li key={k} className="text-sm text-gray-700 leading-relaxed ml-4 flex items-start gap-2 mb-1">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0 mt-2" />
                <span dangerouslySetInnerHTML={{ __html: content }} />
            </li>);
        } else if (line.trim() === "") {
            elements.push(<div key={k} className="h-1" />);
        } else {
            const html = line.replace(/\*\*(.*?)\*\*/g, (_: string, m: string) => `<strong>${m}</strong>`);
            elements.push(<p key={k} className="text-sm text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />);
        }
    }
    return elements;
}

// ─── stat bar ─────────────────────────────────────────────────────────────────

function StatBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
    const pct = Math.min((value / max) * 100, 100);
    return (
        <div>
            <div className="flex items-center justify-between mb-1 text-xs">
                <span className="font-bold text-gray-600 uppercase tracking-wider">{label}</span>
                <span className="font-black text-gray-900">{value}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
                <motion.div
                    className={`h-2 ${color} rounded-full`}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                />
            </div>
        </div>
    );
}

// ─── inner (uses useSearchParams) ────────────────────────────────────────────

function OpponentDossierInner() {
    const { user, isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const params = useSearchParams();

    const [query, setQuery] = useState(params.get("opponent") || "");
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [selectedName, setSelectedName] = useState(params.get("opponent") || "");
    const [activeCamp, setActiveCamp] = useState<FightCamp | null>(null);
    const [dossier, setDossier] = useState<DossierResult | null>(null);
    const [generating, setGenerating] = useState(false);
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState("");
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) router.push("/login");
    }, [isAuthenticated, isLoading, router]);

    const token = getAuthToken() || "";

    // Load active fight camp
    useEffect(() => {
        if (!isAuthenticated) return;
        fightCampApi.getActive(token).then(r => {
            if (r.success && r.data) setActiveCamp(r.data);
        }).catch(() => {});
    }, [isAuthenticated, token]);

    // Auto-generate if opponent param provided
    useEffect(() => {
        if (selectedName && isAuthenticated) generate(selectedName);
    }, [isAuthenticated]);

    const handleSearch = useCallback((val: string) => {
        setQuery(val);
        setSelectedName("");
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (val.length < 2) { setSuggestions([]); return; }
        debounceRef.current = setTimeout(async () => {
            setSearching(true);
            const r = await opponentDossierApi.search(val, token);
            if (r.success && r.data) setSuggestions(r.data);
            setSearching(false);
        }, 300);
    }, [token]);

    const generate = async (name: string) => {
        if (!name) return;
        setGenerating(true);
        setError("");
        setDossier(null);
        const r = await opponentDossierApi.generate(name, activeCamp?._id, token);
        setGenerating(false);
        if (r.success && r.data) setDossier(r.data);
        else setError(r.message || "Failed to generate dossier.");
    };

    const selectSuggestion = (f: any) => {
        setQuery(f.name);
        setSelectedName(f.name);
        setSuggestions([]);
    };

    if (isLoading || !isAuthenticated) {
        return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-red-600" /></div>;
    }

    const stats = dossier?.opponentStats;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero */}
            <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-red-900 text-white pt-24 pb-10 px-4 mb-8">
                <div className="max-w-4xl mx-auto">
                    <span className="px-3 py-1 rounded-full bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-widest">AI Scouting</span>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight mt-2 mb-1">Opponent Dossier</h1>
                    <p className="text-gray-400 text-sm">Search any UFC fighter · view stats · get an AI-generated game plan</p>
                    {activeCamp && (
                        <div className="mt-3 flex items-center gap-2 text-xs">
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-gray-300">Active fight camp: <strong className="text-white">vs {activeCamp.opponentName}</strong></span>
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 pb-16">
                {/* Search */}
                <div className="relative mb-6">
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                value={query}
                                onChange={e => handleSearch(e.target.value)}
                                placeholder="Search UFC fighter (e.g. Jon Jones, Conor McGregor)..."
                                className="w-full pl-10 pr-4 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400 shadow-sm bg-white"
                            />
                            {searching && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />}
                        </div>
                        <button
                            onClick={() => generate(query)}
                            disabled={!query || generating}
                            className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50 shadow-sm whitespace-nowrap"
                        >
                            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                            {generating ? "Generating..." : "Get Game Plan"}
                        </button>
                    </div>

                    {/* Suggestions dropdown */}
                    <AnimatePresence>
                        {suggestions.length > 0 && (
                            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                                className="absolute top-full left-0 right-16 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden"
                            >
                                {suggestions.map((f: any) => (
                                    <button key={f._id} onClick={() => selectSuggestion(f)}
                                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
                                    >
                                        <div>
                                            <span className="font-bold text-gray-900 text-sm">{f.name}</span>
                                            <span className="text-xs text-gray-400 ml-2">{f.wins ?? 0}-{f.losses ?? 0}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs text-gray-400">{f.weightClass || f.weight_class || ""}</span>
                                        </div>
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {error && (
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                    </div>
                )}

                {/* Generating skeleton */}
                {generating && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="bg-white rounded-2xl border border-gray-200 p-8 text-center"
                    >
                        <Brain className="w-10 h-10 text-red-400 mx-auto mb-3 animate-pulse" />
                        <p className="font-black text-gray-900">Analysing opponent...</p>
                        <p className="text-sm text-gray-400 mt-1">Pulling fight stats · building game plan with AI</p>
                    </motion.div>
                )}

                {/* Results */}
                {dossier && !generating && (
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        {/* Opponent header */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900">{dossier.opponentName}</h2>
                                    {stats && (
                                        <div className="flex flex-wrap items-center gap-3 mt-2">
                                            <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full">{stats.weightClass}</span>
                                            <span className="px-3 py-1 bg-red-50 text-red-700 text-xs font-bold rounded-full border border-red-100">{stats.record}</span>
                                            <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full">{stats.stance}</span>
                                        </div>
                                    )}
                                    {!stats && (
                                        <p className="text-xs text-gray-400 mt-1">No UFC stats on record — game plan based on general analysis</p>
                                    )}
                                </div>
                                <CheckCircle2 className="w-8 h-8 text-emerald-500 flex-shrink-0" />
                            </div>

                            {stats && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
                                    <StatBar label="Strikes/min" value={stats.slpm} max={8} color="bg-red-500" />
                                    <StatBar label="Strike Acc %" value={stats.stracc} max={100} color="bg-orange-400" />
                                    <StatBar label="Takedown Avg" value={stats.tdavg} max={6} color="bg-blue-500" />
                                    <StatBar label="Sub Avg" value={stats.subavg} max={2} color="bg-purple-500" />
                                </div>
                            )}
                        </div>

                        {/* AI Game Plan */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 bg-red-50 border border-red-100 rounded-lg flex items-center justify-center">
                                    <Brain className="w-4 h-4 text-red-600" />
                                </div>
                                <div>
                                    <h3 className="font-black text-gray-900 text-sm">AI-Generated Game Plan</h3>
                                    <p className="text-xs text-gray-400">Powered by Groq · {new Date(dossier.generatedAt).toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="prose-sm text-gray-700 leading-relaxed">
                                {renderMarkdown(dossier.gamePlan)}
                            </div>
                        </div>

                        {/* CTA */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <a href="/fight-camp" className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl hover:border-red-300 transition-colors group">
                                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <Target className="w-5 h-5 text-red-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-black text-gray-900 text-sm">Fight Camp</p>
                                    <p className="text-xs text-gray-500">Track milestones & sparring</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-red-500 transition-colors" />
                            </a>
                            <a href="/weight-cut" className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl hover:border-blue-300 transition-colors group">
                                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <TrendingUp className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-black text-gray-900 text-sm">Weight Tracker</p>
                                    <p className="text-xs text-gray-500">Monitor your cut to weight</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                            </a>
                        </div>
                    </motion.div>
                )}

                {/* Empty state */}
                {!dossier && !generating && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="bg-white rounded-2xl border border-gray-200 p-10 text-center"
                    >
                        <Swords className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                        <h3 className="font-black text-gray-900 mb-1">Know Your Enemy</h3>
                        <p className="text-sm text-gray-400 max-w-sm mx-auto">
                            Search for any UFC fighter above and get an AI-generated game plan tailored to your discipline and experience level.
                        </p>
                        <div className="flex flex-wrap justify-center gap-2 mt-4">
                            {["Jon Jones", "Conor McGregor", "Khabib Nurmagomedov", "Israel Adesanya", "Alexander Volkanovski"].map(n => (
                                <button key={n} onClick={() => { setQuery(n); generate(n); }}
                                    className="px-3 py-1.5 bg-gray-50 border border-gray-200 text-gray-600 text-xs font-bold rounded-full hover:border-red-300 hover:bg-red-50 hover:text-red-600 transition-colors"
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}

export default function OpponentDossierPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-red-600" /></div>}>
            <OpponentDossierInner />
        </Suspense>
    );
}
