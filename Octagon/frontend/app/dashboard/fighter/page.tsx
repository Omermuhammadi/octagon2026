"use client";

import { useAuth, getAuthToken } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import {
    Target, TrendingUp, Calendar, Trophy,
    Search, Loader2, Swords, BarChart2,
    Dumbbell, ChevronRight, Shield, Zap, Clock, Scale, Flag,
} from "lucide-react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { ConnectionHub } from "@/components/ConnectionHub";
import { fighterApi, predictionApi, statsApi, UserStats, fightCampApi, weightCutApi, FightCamp, WeightLogData } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface FighterOption {
    _id: string;
    name: string;
    wins: number;
    losses: number;
    draws: number;
    weight: string;
    slpm?: number;
    strikingAccuracy?: number;
    takedownAvg?: number;
}

function StatCard({ label, value, icon: Icon, color, bg, border, delay }: {
    label: string; value: string | number; icon: any;
    color: string; bg: string; border: string; delay: number;
}) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: "-60px" });
    return (
        <motion.div ref={ref}
            initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay }}
            className={`${bg} ${border} border rounded-2xl p-5`}
        >
            <div className={`w-10 h-10 rounded-xl ${bg} ${border} border flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div className={`text-2xl font-black ${color} mb-1`}>{value}</div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</div>
        </motion.div>
    );
}

export default function FighterDashboard() {
    const { user, isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const [userStats, setUserStats] = useState<UserStats | null>(null);
    const [opponentSearch, setOpponentSearch] = useState("");
    const [opponentOptions, setOpponentOptions] = useState<FighterOption[]>([]);
    const [selectedOpponent, setSelectedOpponent] = useState<FighterOption | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [weightClassLeaders, setWeightClassLeaders] = useState<FighterOption[]>([]);
    const [loadingLeaders, setLoadingLeaders] = useState(false);
    const [activeCamp, setActiveCamp] = useState<FightCamp | null>(null);
    const [weightLog, setWeightLog] = useState<WeightLogData | null>(null);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) router.push("/login");
    }, [isAuthenticated, isLoading, router]);

    useEffect(() => {
        const token = getAuthToken();
        if (!token) return;
        statsApi.getUserStats(token).then(r => {
            if (r.success && r.data) setUserStats(r.data);
        }).catch(() => {});
        fightCampApi.getActive(token).then(r => {
            if (r.success) setActiveCamp(r.data ?? null);
        }).catch(() => {});
        weightCutApi.getHistory(token).then(r => {
            if (r.success && r.data) setWeightLog(r.data);
        }).catch(() => {});
    }, []);

    // Load weight class leaders when user's weight is known
    useEffect(() => {
        if (!user) return;
        setLoadingLeaders(true);
        const weightQuery = user.weight || "Welterweight";
        fighterApi.searchFighters(weightQuery, 5).then(r => {
            if (r.success && r.data) {
                const sorted = (r.data as unknown as FighterOption[])
                    .sort((a, b) => b.wins - a.wins)
                    .slice(0, 5);
                setWeightClassLeaders(sorted);
            }
        }).catch(() => {}).finally(() => setLoadingLeaders(false));
    }, [user]);

    // Opponent search debounce
    useEffect(() => {
        if (opponentSearch.length < 2) { setOpponentOptions([]); return; }
        const t = setTimeout(() => {
            fighterApi.searchFighters(opponentSearch, 8).then(r => {
                if (r.success && r.data) setOpponentOptions(r.data as unknown as FighterOption[]);
            }).catch(() => {});
        }, 300);
        return () => clearTimeout(t);
    }, [opponentSearch]);

    const stats = [
        { label: "Predictions Made", value: userStats?.predictionsMade ?? 0, icon: Target, color: "text-red-600", bg: "bg-red-50", border: "border-red-100" },
        { label: "Win/Loss Record", value: userStats ? `${userStats.predictionsMade ?? 0}W` : "—", icon: Trophy, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
        { label: "Training Sessions", value: userStats?.trainingSessions ?? 0, icon: Dumbbell, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
        { label: "Days Active", value: userStats?.daysActive ?? 1, icon: Calendar, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
    ];

    const predictUrl = selectedOpponent
        ? `/prediction?f1=${encodeURIComponent(user?.name || "")}&f2=${encodeURIComponent(selectedOpponent.name)}`
        : "#";

    if (isLoading || !isAuthenticated) {
        return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-red-600" /></div>;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Dark hero banner */}
            <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-red-900 text-white pt-24 pb-10 px-4 mb-8">
                <div className="max-w-6xl mx-auto">
                    <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="px-3 py-1 rounded-full bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-widest">Fighter</span>
                            {user?.weight && <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300 text-xs font-bold uppercase tracking-widest">{user.weight}</span>}
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1">
                            Welcome back, <span className="text-red-400">{user?.name?.split(" ")[0] ?? "Fighter"}</span>
                        </h1>
                        <p className="text-gray-400 text-sm">Your next fight is waiting. Study your opponents. Train smart.</p>
                    </motion.div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 pb-16">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {stats.map((s, i) => (
                        <StatCard key={s.label} {...s} delay={i * 0.1} />
                    ))}
                </div>

                <div className="mb-8">
                    <ConnectionHub />
                </div>

                {/* Fight Camp + Weight Strip */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
                    {/* Fight Camp countdown */}
                    <Link href="/fight-camp" className="block group">
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                            className="bg-gradient-to-br from-gray-900 to-red-900 rounded-2xl p-5 text-white hover:shadow-lg transition-shadow h-full"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-red-400" />
                                    <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Fight Camp</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                            </div>
                            {activeCamp ? (
                                <>
                                    <p className="text-xs text-gray-400 mb-1">vs</p>
                                    <h3 className="text-xl font-black text-white mb-1">{activeCamp.opponentName}</h3>
                                    <div className="flex items-end gap-3">
                                        <div>
                                            <span className="text-4xl font-black text-red-400">
                                                {Math.max(0, Math.ceil((new Date(activeCamp.fightDate).getTime() - Date.now()) / 86_400_000))}
                                            </span>
                                            <span className="text-sm text-gray-400 ml-1">days</span>
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-xs text-gray-400 mb-1">
                                                {activeCamp.milestones.filter(m => m.completed).length}/{activeCamp.milestones.length} milestones
                                            </div>
                                            <div className="w-full bg-white/10 rounded-full h-1.5">
                                                <div className="h-1.5 bg-emerald-400 rounded-full" style={{
                                                    width: `${activeCamp.milestones.length > 0
                                                        ? Math.round((activeCamp.milestones.filter(m => m.completed).length / activeCamp.milestones.length) * 100)
                                                        : 0}%`
                                                }} />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center gap-3 mt-2">
                                    <Flag className="w-8 h-8 text-gray-600" />
                                    <div>
                                        <p className="font-bold text-white text-sm">No active camp</p>
                                        <p className="text-xs text-gray-400">Set up your fight camp →</p>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </Link>

                    {/* Weight Cut strip */}
                    <Link href="/weight-cut" className="block group">
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow h-full"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Scale className="w-4 h-4 text-blue-600" />
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Weight Cut</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                            </div>
                            {weightLog && weightLog.entries.length > 0 ? (
                                <>
                                    {(() => {
                                        const last = weightLog.entries[weightLog.entries.length - 1];
                                        const diff = last.weightKg - weightLog.targetWeightKg;
                                        return (
                                            <>
                                                <div className="flex items-end gap-2 mb-2">
                                                    <span className="text-3xl font-black text-gray-900">{last.weightKg}</span>
                                                    <span className="text-sm text-gray-400 pb-1">kg</span>
                                                    <span className={`text-sm font-bold pb-1 ${diff > 0 ? "text-red-500" : "text-emerald-500"}`}>
                                                        {diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)} from target
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                                    <span>Target: <strong className="text-gray-700">{weightLog.targetWeightKg} kg</strong></span>
                                                    <span>·</span>
                                                    <span>{weightLog.entries.length} weigh-ins</span>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </>
                            ) : (
                                <div className="flex items-center gap-3 mt-2">
                                    <Scale className="w-8 h-8 text-gray-200" />
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">Start tracking weight</p>
                                        <p className="text-xs text-gray-400">Log daily weigh-ins →</p>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Opponent Scouting */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Swords className="w-5 h-5 text-red-600" />
                            <h2 className="text-base font-black text-gray-900 uppercase tracking-wide">Opponent Scouting</h2>
                        </div>
                        <p className="text-xs text-gray-500 mb-4">Search an opponent to analyze their stats and predict the outcome</p>
                        <div className="relative" onClick={e => e.stopPropagation()}>
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={opponentSearch}
                                onChange={e => { setOpponentSearch(e.target.value); setSelectedOpponent(null); setShowDropdown(true); }}
                                onFocus={() => setShowDropdown(true)}
                                placeholder="Search opponent name..."
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-400 focus:bg-white transition-colors text-sm"
                            />
                            {showDropdown && opponentOptions.length > 0 && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl max-h-52 overflow-y-auto shadow-xl">
                                    {opponentOptions.map(f => (
                                        <button key={f._id}
                                            onClick={() => { setSelectedOpponent(f); setOpponentSearch(f.name); setShowDropdown(false); }}
                                            className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors"
                                        >
                                            <span className="text-gray-900 font-semibold text-sm">{f.name}</span>
                                            <span className="text-gray-400 text-xs ml-2">({f.wins}W-{f.losses}L)</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selectedOpponent && (
                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 mb-3">
                                    <div className="flex justify-between items-center mb-3">
                                        <div>
                                            <p className="font-bold text-gray-900">{selectedOpponent.name}</p>
                                            <p className="text-xs text-gray-500">{selectedOpponent.wins}W · {selectedOpponent.losses}L · {selectedOpponent.weight}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-400">Strikes/Min</p>
                                            <p className="font-black text-red-600">{selectedOpponent.slpm?.toFixed(1) ?? "—"}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                        <div className="bg-white rounded-lg p-2 border border-gray-100">
                                            <div className="font-black text-gray-900">{selectedOpponent.strikingAccuracy ?? "—"}%</div>
                                            <div className="text-gray-400">Str. Acc</div>
                                        </div>
                                        <div className="bg-white rounded-lg p-2 border border-gray-100">
                                            <div className="font-black text-gray-900">{selectedOpponent.takedownAvg?.toFixed(1) ?? "—"}</div>
                                            <div className="text-gray-400">TD/min</div>
                                        </div>
                                        <div className="bg-white rounded-lg p-2 border border-gray-100">
                                            <div className="font-black text-gray-900">{selectedOpponent.wins}W</div>
                                            <div className="text-gray-400">Total Wins</div>
                                        </div>
                                    </div>
                                </div>
                                <Link href={predictUrl}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-black text-sm rounded-xl transition-colors"
                                >
                                    <Zap className="w-4 h-4" />
                                    Predict This Fight
                                </Link>
                            </motion.div>
                        )}

                        {!selectedOpponent && (
                            <div className="mt-6 text-center py-6">
                                <Shield className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                                <p className="text-xs text-gray-400">Select an opponent above to start scouting</p>
                            </div>
                        )}
                    </div>

                    {/* Weight Class Leaders */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <BarChart2 className="w-5 h-5 text-red-600" />
                            <h2 className="text-base font-black text-gray-900 uppercase tracking-wide">
                                Weight Class Leaders
                            </h2>
                        </div>
                        <p className="text-xs text-gray-500 mb-4">
                            Top fighters by wins — {user?.weight || "your weight class"}
                        </p>
                        {loadingLeaders ? (
                            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-red-400" /></div>
                        ) : weightClassLeaders.length > 0 ? (
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={weightClassLeaders.map(f => ({ name: f.name.split(" ").pop()!, wins: f.wins }))} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} />
                                    <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                                    <Bar dataKey="wins" radius={[4, 4, 0, 0]} maxBarSize={48}>
                                        {weightClassLeaders.map((_, i) => (
                                            <Cell key={i} fill={i === 0 ? '#DC2626' : i === 1 ? '#F59E0B' : '#93C5FD'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-center py-8 text-gray-400 text-sm">No data available</div>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <h2 className="text-base font-black text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-red-600" /> Quick Actions
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: "Make Prediction", icon: Target, href: "/prediction", color: "text-red-600", bg: "bg-red-50 hover:bg-red-100 border-red-100" },
                            { label: "AI Game Plan", icon: Swords, href: "/opponent-dossier", color: "text-purple-600", bg: "bg-purple-50 hover:bg-purple-100 border-purple-100" },
                            { label: "Training Plan", icon: Dumbbell, href: "/training", color: "text-amber-600", bg: "bg-amber-50 hover:bg-amber-100 border-amber-100" },
                            { label: "Strategy Lab", icon: Shield, href: "/strategy", color: "text-emerald-600", bg: "bg-emerald-50 hover:bg-emerald-100 border-emerald-100" },
                        ].map(a => (
                            <Link key={a.label} href={a.href}
                                className={`${a.bg} border rounded-xl p-4 flex flex-col items-center gap-2 transition-all hover:shadow-sm group`}
                            >
                                <a.icon className={`w-6 h-6 ${a.color} group-hover:scale-110 transition-transform`} />
                                <span className="text-xs font-bold text-gray-700 text-center">{a.label}</span>
                                <ChevronRight className="w-3 h-3 text-gray-300" />
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Training CTA */}
                <div className="mt-6 bg-gradient-to-r from-gray-900 to-red-900 rounded-2xl p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-red-400 text-xs font-bold uppercase tracking-widest mb-1">Continue Training</p>
                            <h3 className="text-xl font-black mb-1">
                                {user?.discipline ?? "MMA"} Roadmap
                            </h3>
                            <p className="text-gray-400 text-sm">
                                {user?.experienceLevel ?? "Intermediate"} level · Keep the streak going
                            </p>
                        </div>
                        <Link href="/training"
                            className="flex-shrink-0 px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl transition-colors flex items-center gap-2"
                        >
                            <Dumbbell className="w-4 h-4" />
                            Train Now
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
