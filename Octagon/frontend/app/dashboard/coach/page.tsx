"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";
import {
    BarChart2, TrendingUp, Calendar, Users, Loader2,
    ChevronRight, Flame, Award, Shield, Search,
    Swords, History, Eye,
    Activity, MessageSquare, Scale, UserCheck, UserPlus, Send,
    CheckCircle2, Clock, X,
} from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ConnectionHub } from "@/components/ConnectionHub";
import {
    strategyApi, coachAnalyticsApi, relationshipApi,
    CoachStats, StrategyHistoryItem,
    TraineeAnalytics, CoachAnalyticsData, DiscoverAthlete, Relationship,
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
    const [strategyHistory, setStrategyHistory] = useState<StrategyHistoryItem[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [coachStats] = useState<CoachStats | null>(null);
    const [scoutSearch, setScoutSearch] = useState("");
    const [scoutOptions, setScoutOptions] = useState<FighterOption[]>([]);
    const [showScoutDropdown, setShowScoutDropdown] = useState(false);
    const [scoutFighter, setScoutFighter] = useState<FighterOption | null>(null);
    const [analyticsData, setAnalyticsData] = useState<CoachAnalyticsData | null>(null);
    const [loadingAnalytics, setLoadingAnalytics] = useState(true);

    // Athletes / discover state
    const [activeTrainees, setActiveTrainees] = useState<Relationship[]>([]);
    const [discoverAthletes, setDiscoverAthletes] = useState<DiscoverAthlete[]>([]);
    const [loadingAthletes, setLoadingAthletes] = useState(true);
    const [discoverView, setDiscoverView] = useState(false);
    const [requestingId, setRequestingId] = useState<string | null>(null);
    const [athleteSearch, setAthleteSearch] = useState("");

    useEffect(() => {
        if (!isLoading && !isAuthenticated) router.push("/login");
        else if (!isLoading && user?.role !== "coach") router.push("/dashboard/fan");
    }, [isAuthenticated, isLoading, user, router]);

    const loadAthletes = useCallback(async () => {
        if (!token) return;
        setLoadingAthletes(true);
        try {
            const [relRes, discRes] = await Promise.all([
                relationshipApi.list(token, 'active'),
                relationshipApi.discover(token),
            ]);
            if (relRes.success && relRes.data) setActiveTrainees(relRes.data);
            if (discRes.success && discRes.data) setDiscoverAthletes(discRes.data);
        } catch { /* silent */ }
        finally { setLoadingAthletes(false); }
    }, [token]);

    useEffect(() => { loadAthletes(); }, [loadAthletes]);
    useEffect(() => { if (!token) return; strategyApi.getHistory(token, 5).then(r => { if (r.success && r.data) setStrategyHistory(r.data); }).catch(() => {}).finally(() => setLoadingHistory(false)); }, [token]);
    useEffect(() => { if (!token) return; coachAnalyticsApi.getTraineeAnalytics(token).then(r => { if (r.success && r.data) setAnalyticsData(r.data); }).catch(() => {}).finally(() => setLoadingAnalytics(false)); }, [token]);

    useEffect(() => {
        const handle = () => setShowScoutDropdown(false);
        document.addEventListener("click", handle);
        return () => document.removeEventListener("click", handle);
    }, []);

    const searchFighters = useCallback(async (query: string) => {
        if (query.length < 2) { setScoutOptions([]); return; }
        try {
            const { fighterApi } = await import("@/lib/api");
            const r = await fighterApi.searchFighters(query, 6);
            if (r.success && r.data) setScoutOptions(r.data as unknown as FighterOption[]);
        } catch { setScoutOptions([]); }
    }, []);

    useEffect(() => { const t = setTimeout(() => searchFighters(scoutSearch), 300); return () => clearTimeout(t); }, [scoutSearch, searchFighters]);

    const handleRequestAthlete = async (athlete: DiscoverAthlete) => {
        if (!token || requestingId) return;
        setRequestingId(athlete._id);
        try {
            await relationshipApi.create({ traineeId: athlete._id }, token);
            await loadAthletes();
        } catch { /* silent */ }
        finally { setRequestingId(null); }
    };

    const handleCancelRequest = async (relId: string) => {
        if (!token) return;
        try {
            await relationshipApi.end(relId, token);
            await loadAthletes();
        } catch { /* silent */ }
    };

    const filteredAthletes = useMemo(() => {
        if (!athleteSearch.trim()) return discoverAthletes;
        const q = athleteSearch.toLowerCase();
        return discoverAthletes.filter(a =>
            a.name.toLowerCase().includes(q) ||
            a.role.toLowerCase().includes(q) ||
            (a.discipline || "").toLowerCase().includes(q)
        );
    }, [discoverAthletes, athleteSearch]);

    const stats = useMemo(() => {
        if (!user) return [];
        return [
            { label: "Active Trainees", value: activeTrainees.length, icon: Users, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
            { label: "Strategies Generated", value: coachStats?.strategiesGenerated ?? 0, icon: Swords, color: "text-red-600", bg: "bg-red-50", border: "border-red-100" },
            { label: "Athletes on Platform", value: discoverAthletes.length + activeTrainees.length, icon: UserPlus, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
            { label: "Avg Confidence", value: `${coachStats?.avgConfidence ?? 0}%`, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
        ];
    }, [user, activeTrainees, discoverAthletes, coachStats]);

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

                {/* Athletes — Manage Trainees + Discover */}
                <motion.div variants={itemVariants} className="mb-6">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                        {/* Header + tabs */}
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
                                <Users className="w-5 h-5 text-amber-500" /> Athletes
                            </h2>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setDiscoverView(false)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${!discoverView ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                                    <UserCheck className="w-3.5 h-3.5 inline mr-1" /> My Trainees
                                </button>
                                <button onClick={() => setDiscoverView(true)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${discoverView ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                                    <UserPlus className="w-3.5 h-3.5 inline mr-1" /> Discover
                                </button>
                            </div>
                        </div>

                        {loadingAthletes ? (
                            <div className="flex items-center justify-center py-10">
                                <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                            </div>
                        ) : !discoverView ? (
                            /* ── MY TRAINEES ── */
                            activeTrainees.length === 0 ? (
                                <div className="text-center py-10">
                                    <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                                    <p className="text-gray-500 text-sm font-semibold">No active trainees yet</p>
                                    <p className="text-gray-400 text-xs mt-1">Switch to <button onClick={() => setDiscoverView(true)} className="text-amber-500 hover:underline font-semibold">Discover</button> to find athletes on the platform</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {activeTrainees.map(r => {
                                        const t = r.traineeId;
                                        return (
                                            <div key={r._id} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 hover:border-amber-200 hover:bg-amber-50/20 rounded-xl transition-colors group">
                                                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                                                    {t.name[0]?.toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-gray-900 text-sm font-bold truncate">{t.name}</p>
                                                    <p className="text-gray-400 text-xs capitalize">{t.role}{t.discipline ? ` · ${t.discipline}` : ""}</p>
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Link href={`/messages?with=${t._id}`} title="Message">
                                                        <div className="p-1.5 bg-white border border-gray-200 hover:border-amber-300 hover:text-amber-600 text-gray-400 rounded-lg transition-colors cursor-pointer">
                                                            <MessageSquare className="w-3.5 h-3.5" />
                                                        </div>
                                                    </Link>
                                                    <Link href={`/assignments?trainee=${t._id}`} title="Assign training">
                                                        <div className="p-1.5 bg-white border border-gray-200 hover:border-red-300 hover:text-red-600 text-gray-400 rounded-lg transition-colors cursor-pointer">
                                                            <Award className="w-3.5 h-3.5" />
                                                        </div>
                                                    </Link>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        ) : (
                            /* ── DISCOVER ATHLETES ── */
                            <div>
                                <div className="relative mb-4">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={athleteSearch}
                                        onChange={e => setAthleteSearch(e.target.value)}
                                        placeholder="Search by name, role, or discipline…"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-400 focus:bg-white transition-colors"
                                    />
                                </div>
                                {filteredAthletes.length === 0 ? (
                                    <p className="text-center text-gray-400 text-sm py-8">
                                        {discoverAthletes.length === 0 ? "No new athletes on the platform yet." : "No athletes match your search."}
                                    </p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
                                        {filteredAthletes.map(a => {
                                            const isPending = !!a.pendingRelId;
                                            const isRequesting = requestingId === a._id;
                                            const joinedDays = Math.floor((Date.now() - new Date(a.createdAt).getTime()) / 86400000);
                                            return (
                                                <div key={a._id} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 hover:border-gray-200 rounded-xl transition-colors">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm flex-shrink-0 ${
                                                        a.role === 'fighter' ? 'bg-gradient-to-br from-red-500 to-red-700' :
                                                        a.role === 'beginner' ? 'bg-gradient-to-br from-blue-500 to-blue-700' :
                                                        'bg-gradient-to-br from-gray-400 to-gray-600'
                                                    }`}>
                                                        {a.name[0]?.toUpperCase()}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-gray-900 text-sm font-bold truncate">{a.name}</p>
                                                        <p className="text-gray-400 text-[11px] capitalize">{a.role}{a.discipline ? ` · ${a.discipline}` : ""}</p>
                                                        <p className="text-gray-300 text-[10px]">Joined {joinedDays === 0 ? "today" : joinedDays === 1 ? "yesterday" : `${joinedDays}d ago`}</p>
                                                    </div>
                                                    {isPending ? (
                                                        <button
                                                            onClick={() => handleCancelRequest(a.pendingRelId!)}
                                                            className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 hover:bg-red-50 hover:border-red-200 hover:text-red-600 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap"
                                                            title="Cancel request"
                                                        >
                                                            <Clock className="w-3 h-3" /> Requested
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleRequestAthlete(a)}
                                                            disabled={isRequesting}
                                                            className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[11px] font-bold transition-colors disabled:opacity-60 whitespace-nowrap"
                                                        >
                                                            {isRequesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                                            Request
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Strategy History */}
                <motion.div variants={itemVariants} className="mb-6">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
                                <History className="w-5 h-5 text-amber-500" /> Recent Strategies
                            </h2>
                            <Link href="/strategy" className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-0.5">
                                View all <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                        {loadingHistory ? (
                            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-amber-500" /></div>
                        ) : strategyHistory.length === 0 ? (
                            <div className="text-center py-4">
                                <p className="text-gray-400 text-sm mb-3">No strategies yet.</p>
                                <Link href="/strategy" className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors">
                                    <Swords className="w-3 h-3" /> Create Strategy
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                </motion.div>

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
