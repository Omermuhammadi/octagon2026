"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";
import {
    BarChart2, TrendingUp, Calendar, Users, Loader2,
    ChevronRight, Flame, Award, Shield, Search, Plus, X,
    Swords, History, UserPlus, AlertCircle, Eye,
    Activity, MessageSquare, Scale,
} from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ConnectionHub } from "@/components/ConnectionHub";
import {
    eventApi, fighterApi, strategyApi, coachRosterApi, coachAnalyticsApi,
    Event, CoachStats, RosterFighter, UpcomingFight, StrategyHistoryItem,
    TraineeAnalytics, CoachAnalyticsData,
} from "@/lib/api";

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const itemVariants = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

function TraineeCard({ trainee }: { trainee: TraineeAnalytics }) {
    const isOver = trainee.weight?.overTarget != null && trainee.weight.overTarget > 0;
    const pct = trainee.assignmentCompletionPct;
    const barColor = pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
    const pctColor = pct >= 80 ? "text-green-600" : pct >= 50 ? "text-amber-600" : "text-red-600";

    return (
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-3 hover:border-amber-200 hover:bg-amber-50/30 transition-colors">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-gray-900 font-bold text-sm">{trainee.name}</p>
                    <p className="text-gray-400 text-xs capitalize">{trainee.role}</p>
                </div>
                <Link href={`/messages?with=${trainee.traineeId}`}>
                    <div className="p-1.5 bg-white hover:bg-amber-50 border border-gray-200 hover:border-amber-300 text-gray-400 hover:text-amber-600 rounded-lg transition-colors cursor-pointer" title="Message trainee">
                        <MessageSquare className="w-3.5 h-3.5" />
                    </div>
                </Link>
            </div>

            {trainee.weight && trainee.weight.current != null ? (
                <div className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold ${
                    isOver ? "bg-red-50 border border-red-200 text-red-700" : "bg-green-50 border border-green-200 text-green-700"
                }`}>
                    <span className="flex items-center gap-1.5">
                        <Scale className="w-3 h-3" />
                        {trainee.weight.current}kg
                        {trainee.weight.target != null && (
                            <span className="font-normal opacity-60">/ {trainee.weight.target}kg</span>
                        )}
                    </span>
                    {isOver && trainee.weight.overTarget != null && (
                        <span className="bg-red-600 text-white px-1.5 py-0.5 rounded text-[10px] font-bold">
                            +{trainee.weight.overTarget}kg
                        </span>
                    )}
                    {!isOver && <span className="text-[10px] font-medium opacity-70">on target</span>}
                </div>
            ) : (
                <div className="px-3 py-2 bg-gray-100 rounded-lg text-xs text-gray-400">No weight data</div>
            )}

            <div>
                <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gray-500">Assignments</span>
                    <span className={`font-bold ${pctColor}`}>{pct}%</span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                </div>
            </div>

            <div className="flex items-center justify-between pt-0.5">
                <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Swords className="w-3 h-3" /> {trainee.sparringThisWeek} sparring this week
                </span>
                {trainee.fightCamp ? (
                    <span className="px-2 py-0.5 bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold rounded-full">
                        {trainee.fightCamp.daysRemaining}d to fight
                    </span>
                ) : (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-400 text-[10px] rounded-full">No camp</span>
                )}
            </div>

            {trainee.fightCamp && (
                <div className="pt-2 border-t border-gray-200">
                    <p className="text-[10px] text-gray-400 mb-1.5">vs {trainee.fightCamp.opponentName}</p>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-amber-500 rounded-full"
                                style={{ width: `${Math.round((trainee.fightCamp.milestonesCompleted / Math.max(trainee.fightCamp.milestonesTotal, 1)) * 100)}%` }}
                            />
                        </div>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap">
                            {trainee.fightCamp.milestonesCompleted}/{trainee.fightCamp.milestonesTotal} milestones
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

interface FighterOption { _id: string; name: string; wins: number; losses: number; draws: number; weight: string; slpm: number; strikingAccuracy: number; stance: string; }

export default function CoachDashboard() {
    const { user, token, isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const [roster, setRoster] = useState<RosterFighter[]>([]);
    const [loadingRoster, setLoadingRoster] = useState(true);
    const [rosterSearch, setRosterSearch] = useState("");
    const [rosterOptions, setRosterOptions] = useState<FighterOption[]>([]);
    const [showRosterDropdown, setShowRosterDropdown] = useState(false);
    const [addingFighter, setAddingFighter] = useState(false);
    const [rosterError, setRosterError] = useState("");
    const [upcomingFights, setUpcomingFights] = useState<UpcomingFight[]>([]);
    const [loadingUpcoming, setLoadingUpcoming] = useState(true);
    const [strategyHistory, setStrategyHistory] = useState<StrategyHistoryItem[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [coachStats, setCoachStats] = useState<CoachStats | null>(null);
    const [scoutSearch, setScoutSearch] = useState("");
    const [scoutOptions, setScoutOptions] = useState<FighterOption[]>([]);
    const [showScoutDropdown, setShowScoutDropdown] = useState(false);
    const [scoutFighter, setScoutFighter] = useState<FighterOption | null>(null);
    const [analyticsData, setAnalyticsData] = useState<CoachAnalyticsData | null>(null);
    const [loadingAnalytics, setLoadingAnalytics] = useState(true);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) router.push("/login");
        else if (!isLoading && user?.role !== "coach") router.push("/dashboard/fan");
    }, [isAuthenticated, isLoading, user, router]);

    useEffect(() => { eventApi.getRecentEvents(5).catch(() => {}); }, []);
    useEffect(() => { if (!token) return; coachRosterApi.getCoachStats(token).then(r => { if (r.success && r.data) setCoachStats(r.data); }).catch(() => {}); }, [token]);
    useEffect(() => { if (!token) return; coachRosterApi.getRoster(token).then(r => { if (r.success && r.data) setRoster(r.data); }).catch(() => {}).finally(() => setLoadingRoster(false)); }, [token]);
    useEffect(() => { if (!token) return; coachRosterApi.getUpcomingFights(token).then(r => { if (r.success && r.data) setUpcomingFights(r.data); }).catch(() => {}).finally(() => setLoadingUpcoming(false)); }, [token]);
    useEffect(() => { if (!token) return; strategyApi.getHistory(token, 5).then(r => { if (r.success && r.data) setStrategyHistory(r.data); }).catch(() => {}).finally(() => setLoadingHistory(false)); }, [token]);
    useEffect(() => { if (!token) return; coachAnalyticsApi.getTraineeAnalytics(token).then(r => { if (r.success && r.data) setAnalyticsData(r.data); }).catch(() => {}).finally(() => setLoadingAnalytics(false)); }, [token]);

    useEffect(() => {
        const handle = () => { setShowRosterDropdown(false); setShowScoutDropdown(false); };
        document.addEventListener("click", handle);
        return () => document.removeEventListener("click", handle);
    }, []);

    const searchFighters = useCallback(async (query: string, setter: (opts: FighterOption[]) => void) => {
        if (query.length < 2) { setter([]); return; }
        try { const r = await fighterApi.searchFighters(query, 6); if (r.success && r.data) setter(r.data as unknown as FighterOption[]); } catch { setter([]); }
    }, []);

    useEffect(() => { const t = setTimeout(() => searchFighters(rosterSearch, setRosterOptions), 300); return () => clearTimeout(t); }, [rosterSearch, searchFighters]);
    useEffect(() => { const t = setTimeout(() => searchFighters(scoutSearch, setScoutOptions), 300); return () => clearTimeout(t); }, [scoutSearch, searchFighters]);

    const handleAddToRoster = async (name: string) => {
        if (!token) return;
        setAddingFighter(true); setRosterError("");
        try {
            const r = await coachRosterApi.addFighter(name, token);
            if (r.success && r.data) { setRoster(prev => [r.data!, ...prev]); setRosterSearch(""); setRosterOptions([]); setShowRosterDropdown(false); }
        } catch (e: any) { setRosterError(e.message || "Failed to add fighter"); }
        finally { setAddingFighter(false); }
    };

    const handleRemoveFromRoster = async (fighterId: string) => {
        if (!token) return;
        try { await coachRosterApi.removeFighter(fighterId, token); setRoster(prev => prev.filter(r => r.fighterId !== fighterId)); } catch {}
    };

    const stats = useMemo(() => {
        if (!user) return [];
        return [
            { label: "Roster Size", value: roster.length, icon: Users, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
            { label: "Strategies Generated", value: coachStats?.strategiesGenerated ?? 0, icon: Swords, color: "text-red-600", bg: "bg-red-50", border: "border-red-100" },
            { label: "Upcoming Fights", value: upcomingFights.length, icon: Calendar, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
            { label: "Avg Confidence", value: `${coachStats?.avgConfidence ?? 0}%`, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
        ];
    }, [user, roster, upcomingFights, coachStats]);

    const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const greeting = () => { const h = new Date().getHours(); if (h < 12) return "Good morning"; if (h < 18) return "Good afternoon"; return "Good evening"; };

    if (isLoading || !user) {
        return (
            <div className="min-h-screen bg-gray-50 pt-24 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-500 text-sm">Loading your dashboard…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Dark hero banner */}
            <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-amber-900 text-white pt-24 pb-10 px-4 mb-8">
                <motion.div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
                    initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-3 py-1 rounded-full bg-amber-600/20 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-widest">
                                <Shield className="w-3 h-3 inline mr-1" /> Coach
                            </span>
                        </div>
                        <p className="text-gray-400 text-sm mb-1 flex items-center gap-1.5">
                            <Flame className="w-3.5 h-3.5 text-amber-500" />
                            {greeting()}, <span className="text-white font-semibold ml-1">{user.name}</span>
                        </p>
                        <h1 className="text-3xl sm:text-4xl font-display font-black tracking-tight">
                            COACH <span className="text-amber-400">DASHBOARD</span>
                        </h1>
                    </div>
                    <Link href="/strategy">
                        <motion.div whileHover={{ scale: 1.04 }} className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-wide shadow-sm transition-colors cursor-pointer">
                            <Swords className="w-3.5 h-3.5" /> Strategy Optimizer
                        </motion.div>
                    </Link>
                </motion.div>
            </div>

            <motion.div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16" initial="hidden" animate="visible" variants={containerVariants}>

                {/* Stats */}
                <motion.div variants={containerVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                    {stats.map((s, i) => (
                        <motion.div key={i} variants={itemVariants}>
                            <div className={`bg-white rounded-2xl border ${s.border} p-5 shadow-sm hover:shadow-md transition-shadow`}>
                                <div className="flex items-center justify-between mb-3">
                                    <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center`}>
                                        <s.icon className={`w-5 h-5 ${s.color}`} />
                                    </div>
                                    <span className={`text-3xl font-black ${s.color}`}>{s.value}</span>
                                </div>
                                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{s.label}</p>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                <motion.div variants={itemVariants} className="mb-8">
                    <ConnectionHub />
                </motion.div>

                {/* Trainee Analytics */}
                <motion.div variants={itemVariants} className="mb-8">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
                                <Activity className="w-5 h-5 text-amber-500" /> Trainee Analytics
                            </h2>
                            <span className="text-xs text-gray-400 font-semibold">
                                {analyticsData?.trainees.length ?? 0} active trainee{analyticsData?.trainees.length !== 1 ? "s" : ""}
                            </span>
                        </div>

                        {loadingAnalytics ? (
                            <div className="flex items-center justify-center py-10">
                                <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                            </div>
                        ) : !analyticsData || analyticsData.trainees.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-gray-400 text-sm">No active trainees yet.</p>
                                <p className="text-gray-300 text-xs mt-1">Invite fighters or beginners from <Link href="/connections" className="text-amber-500 hover:underline">Connections</Link>.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {analyticsData.trainees.map(t => (
                                        <TraineeCard key={t.traineeId} trainee={t} />
                                    ))}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                        <BarChart2 className="w-3.5 h-3.5" /> Assignment Completion
                                    </p>
                                    <div className="h-44">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={analyticsData.trainees.map(t => ({
                                                name: t.name.split(" ")[0],
                                                pct: t.assignmentCompletionPct,
                                            }))} barCategoryGap="30%">
                                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                                                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} unit="%" width={36} />
                                                <Tooltip
                                                    formatter={(v: any) => [`${v}%`, "Completion"]}
                                                    contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 12 }}
                                                />
                                                <Bar dataKey="pct" radius={[6, 6, 0, 0]}>
                                                    {analyticsData.trainees.map((t, i) => (
                                                        <Cell
                                                            key={i}
                                                            fill={t.assignmentCompletionPct >= 80 ? "#16a34a" : t.assignmentCompletionPct >= 50 ? "#d97706" : "#dc2626"}
                                                        />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* My Fighters Roster */}
                    <motion.div variants={itemVariants}>
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 h-full">
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-lg font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
                                    <Users className="w-5 h-5 text-amber-500" /> My Fighters
                                </h2>
                                <span className="text-xs text-gray-400 font-semibold">{roster.length}/20</span>
                            </div>

                            {/* Add fighter */}
                            <div className="relative mb-4" onClick={e => e.stopPropagation()}>
                                <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input type="text" value={rosterSearch}
                                    onChange={e => { setRosterSearch(e.target.value); setShowRosterDropdown(true); }}
                                    onFocus={() => setShowRosterDropdown(true)}
                                    placeholder="Add fighter to roster…"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-amber-400 focus:bg-white transition-colors"
                                />
                                {showRosterDropdown && rosterOptions.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl max-h-48 overflow-y-auto shadow-xl">
                                        {rosterOptions.map(f => (
                                            <button key={f._id} onClick={() => handleAddToRoster(f.name)} disabled={addingFighter}
                                                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 flex items-center justify-between"
                                            >
                                                <div>
                                                    <span className="text-gray-900 text-sm font-medium">{f.name}</span>
                                                    <span className="text-gray-400 text-xs ml-2">({f.wins}-{f.losses}-{f.draws})</span>
                                                </div>
                                                <Plus className="w-4 h-4 text-amber-500" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {rosterError && (
                                <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs flex items-center gap-2">
                                    <AlertCircle className="w-3 h-3" /> {rosterError}
                                </div>
                            )}

                            {loadingRoster ? (
                                <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-amber-500" /></div>
                            ) : roster.length === 0 ? (
                                <p className="text-gray-400 text-sm text-center py-6">No fighters yet. Search above to add.</p>
                            ) : (
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {roster.map(r => (
                                        <div key={r._id} className="flex items-center justify-between p-3 bg-gray-50 hover:bg-amber-50 border border-gray-100 hover:border-amber-200 rounded-xl transition-all group">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-gray-900 text-sm font-semibold truncate">{r.fighterName}</p>
                                                <p className="text-gray-500 text-xs">{r.record} | {r.stance || "N/A"}</p>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Link href={`/strategy?fighter1=${encodeURIComponent(r.fighterName)}`}>
                                                    <div className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors cursor-pointer" title="Strategy">
                                                        <Swords className="w-3.5 h-3.5" />
                                                    </div>
                                                </Link>
                                                <button onClick={() => handleRemoveFromRoster(r.fighterId)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Strategy History + Upcoming */}
                    <motion.div variants={itemVariants} className="space-y-5">
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
                                    <History className="w-5 h-5 text-amber-500" /> Recent Strategies
                                </h2>
                                <Link href="/strategy" className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-0.5">
                                    View all <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>
                            {loadingHistory ? <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-amber-500" /></div>
                                : strategyHistory.length === 0 ? (
                                    <div className="text-center py-4">
                                        <p className="text-gray-400 text-sm mb-3">No strategies yet.</p>
                                        <Link href="/strategy" className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors">
                                            <Swords className="w-3 h-3" /> Create Strategy
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {strategyHistory.map(s => (
                                            <Link key={s._id} href={`/strategy/${s._id}`}>
                                                <motion.div whileHover={{ x: 3 }} className="flex items-center justify-between p-3 bg-gray-50 hover:bg-amber-50 border border-gray-100 hover:border-amber-200 rounded-xl transition-all cursor-pointer">
                                                    <div>
                                                        <p className="text-gray-900 text-sm font-semibold">{s.fighter1Name} vs {s.fighter2Name}</p>
                                                        <p className="text-gray-500 text-xs">{s.prediction?.winner} via {s.prediction?.method} · {new Date(s.createdAt).toLocaleDateString()}</p>
                                                    </div>
                                                    <Eye className="w-4 h-4 text-gray-400" />
                                                </motion.div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                            <h2 className="text-lg font-black text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-amber-500" /> Upcoming Fights
                            </h2>
                            {loadingUpcoming ? <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-amber-500" /></div>
                                : upcomingFights.length === 0 ? <p className="text-gray-400 text-sm text-center py-4">{roster.length === 0 ? "Add fighters to track fights." : "No upcoming fights."}</p>
                                : (
                                    <div className="space-y-2">
                                        {upcomingFights.slice(0, 3).map((f, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-xl">
                                                <div>
                                                    <p className="text-gray-900 text-sm font-semibold">{f.fighterName} vs {f.opponent}</p>
                                                    <p className="text-gray-500 text-xs">{f.eventName} · {fmtDate(f.eventDate)}</p>
                                                </div>
                                                <Link href={`/strategy?fighter1=${encodeURIComponent(f.fighterName)}&fighter2=${encodeURIComponent(f.opponent)}`}
                                                    className="text-xs text-red-600 hover:text-red-700 font-bold flex items-center gap-0.5"
                                                >
                                                    <Swords className="w-3 h-3" /> Prep
                                                </Link>
                                            </div>
                                        ))}
                                    </div>
                                )}
                        </div>
                    </motion.div>
                </div>

                {/* Quick Actions + Scout + Profile */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <motion.div variants={itemVariants} className="lg:col-span-2">
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                            <h2 className="text-lg font-black text-gray-900 uppercase tracking-wide mb-5 flex items-center gap-2">
                                <Flame className="w-5 h-5 text-amber-500" /> Quick Actions
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {[
                                    { href: "/strategy", icon: Swords, title: "Strategy Optimizer", desc: "AI fight game plan generator", color: "bg-red-600" },
                                    { href: "/comparison", icon: BarChart2, title: "Fighter Comparison", desc: "Head-to-head radar analysis", color: "bg-blue-600" },
                                    { href: "/training", icon: Award, title: "Training Programs", desc: "Manage fighter development", color: "bg-emerald-600" },
                                    { href: "/prediction", icon: TrendingUp, title: "Fight Predictions", desc: "ML-powered win probability", color: "bg-amber-500" },
                                ].map((a, i) => (
                                    <Link key={i} href={a.href}>
                                        <motion.div whileHover={{ y: -2, scale: 1.01 }}
                                            className="flex items-center gap-4 p-4 bg-gray-50 hover:bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm rounded-xl transition-all group cursor-pointer"
                                        >
                                            <div className={`w-10 h-10 ${a.color} rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm`}>
                                                <a.icon className="w-5 h-5 text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-gray-900 group-hover:text-red-600 transition-colors">{a.title}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">{a.desc}</p>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-red-500 transition-all flex-shrink-0" />
                                        </motion.div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="space-y-5">
                        {/* Quick Scout */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5" onClick={e => e.stopPropagation()}>
                            <h2 className="text-base font-black text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                                <Search className="w-4 h-4 text-amber-500" /> Quick Scout
                            </h2>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input type="text" value={scoutSearch}
                                    onChange={e => { setScoutSearch(e.target.value); setScoutFighter(null); setShowScoutDropdown(true); }}
                                    onFocus={() => setShowScoutDropdown(true)}
                                    placeholder="Scout an opponent…"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-amber-400 focus:bg-white transition-colors"
                                />
                                {showScoutDropdown && scoutOptions.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl max-h-48 overflow-y-auto shadow-xl">
                                        {scoutOptions.map(f => (
                                            <button key={f._id} onClick={() => { setScoutFighter(f); setScoutSearch(f.name); setShowScoutDropdown(false); }}
                                                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-gray-900 text-sm"
                                            >
                                                {f.name} <span className="text-gray-400 text-xs ml-1">({f.wins}-{f.losses}-{f.draws})</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <AnimatePresence>
                                {scoutFighter && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                                        className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl"
                                    >
                                        <p className="text-gray-900 font-bold text-sm">{scoutFighter.name}</p>
                                        <div className="grid grid-cols-2 gap-1.5 mt-2 text-xs text-gray-600">
                                            <span>Record: <b>{scoutFighter.wins}-{scoutFighter.losses}-{scoutFighter.draws}</b></span>
                                            <span>Stance: <b>{scoutFighter.stance || "N/A"}</b></span>
                                            <span>SLPM: <b>{scoutFighter.slpm}</b></span>
                                            <span>Accuracy: <b>{scoutFighter.strikingAccuracy}%</b></span>
                                        </div>
                                        <Link href={`/strategy?fighter2=${encodeURIComponent(scoutFighter.name)}`}
                                            className="mt-3 flex items-center justify-center gap-1.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors"
                                        >
                                            <Swords className="w-3 h-3" /> Full Strategy Analysis
                                        </Link>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Profile */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                            <h2 className="text-base font-black text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                                <Award className="w-4 h-4 text-amber-500" /> Profile
                            </h2>
                            <div className="flex items-center gap-3 mb-4 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 octagon-avatar flex items-center justify-center flex-shrink-0">
                                    <span className="text-lg font-black text-white">{user.name.charAt(0)}</span>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-gray-900 font-bold text-sm truncate">{user.name}</p>
                                    <p className="text-gray-500 text-xs truncate">{user.email}</p>
                                    <p className="text-amber-600 text-xs font-bold flex items-center gap-1 mt-0.5"><Shield className="w-3 h-3" /> Coach</p>
                                </div>
                            </div>
                            <Link href="/profile"
                                className="flex items-center justify-center gap-2 w-full py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-bold transition-colors"
                            >
                                Edit Profile <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
}
