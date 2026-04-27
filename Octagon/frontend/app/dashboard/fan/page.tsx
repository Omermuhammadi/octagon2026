"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import {
    Target, TrendingUp, Calendar, Star, Zap, Camera,
    Trophy, Clock, ChevronRight, Flame, Award, Shield,
    BookOpen, MapPin, BarChart2, Sword, Users, MessageSquare,
    Check, X, Loader2, UserPlus,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { eventApi, statsApi, relationshipApi, Event, UserStats, Relationship } from "@/lib/api";
import { getAuthToken } from "@/contexts/AuthContext";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function FanDashboard() {
    const { user, token: authToken, isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
    const [loadingEvents, setLoadingEvents] = useState(true);
    const [userStats, setUserStats] = useState<UserStats | null>(null);
    const [loadingStats, setLoadingStats] = useState(true);
    const [relationships, setRelationships] = useState<Relationship[]>([]);
    const [loadingRel, setLoadingRel] = useState(true);
    const [respondingId, setRespondingId] = useState<string | null>(null);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) router.push("/login");
        else if (!isLoading && user?.role === "coach") router.push("/dashboard/coach");
    }, [isAuthenticated, isLoading, user, router]);

    useEffect(() => {
        eventApi.getUpcomingEvents(5).then(r => {
            if (r.success && r.data) setUpcomingEvents(r.data);
        }).catch(() => {}).finally(() => setLoadingEvents(false));
    }, []);

    useEffect(() => {
        const token = getAuthToken();
        if (!token) { setLoadingStats(false); return; }
        statsApi.getUserStats(token).then(r => {
            if (r.success && r.data) setUserStats(r.data);
        }).catch(() => {}).finally(() => setLoadingStats(false));
    }, []);

    useEffect(() => {
        const token = authToken || getAuthToken();
        if (!token) { setLoadingRel(false); return; }
        relationshipApi.list(token).then(r => {
            if (r.success && r.data) setRelationships(r.data);
        }).catch(() => {}).finally(() => setLoadingRel(false));
    }, [authToken]);

    const handleRespond = async (id: string, action: 'accept' | 'decline') => {
        const token = authToken || getAuthToken();
        if (!token) return;
        setRespondingId(id);
        try {
            await relationshipApi.respond(id, action, token);
            const r = await relationshipApi.list(token);
            if (r.success && r.data) setRelationships(r.data);
        } catch { /* silent */ }
        finally { setRespondingId(null); }
    };

    const stats = useMemo(() => {
        if (!user) return [];
        const s = userStats;
        return [
            { label: "Predictions Made", value: s?.predictionsMade ?? 0, icon: Target, color: "text-red-600", bg: "bg-red-50", border: "border-red-100" },
            { label: "Accuracy Rate", value: `${s?.accuracyRate ?? 0}%`, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
            { label: "Training Sessions", value: s?.trainingSessions ?? 0, icon: Trophy, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
            { label: "Days Active", value: s?.daysActive ?? 1, icon: Calendar, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
        ];
    }, [user, userStats]);

    const quickActions = [
        { href: "/prediction", icon: Zap, title: "Fight Predictions", desc: "AI-powered fight outcome analysis", color: "bg-red-600", light: "bg-red-50 text-red-700" },
        { href: "/comparison", icon: BarChart2, title: "Fighter Comparison", desc: "Side-by-side radar chart analysis", color: "bg-blue-600", light: "bg-blue-50 text-blue-700" },
        { href: "/training", icon: BookOpen, title: "Training Roadmap", desc: "Structured BJJ, Wrestling & MMA plans", color: "bg-emerald-600", light: "bg-emerald-50 text-emerald-700" },
        { href: "/form-check", icon: Camera, title: "Form Correction", desc: "AI pose analysis on your technique", color: "bg-purple-600", light: "bg-purple-50 text-purple-700" },
        { href: "/gyms", icon: MapPin, title: "Find Gyms", desc: "Martial arts gyms near you", color: "bg-amber-600", light: "bg-amber-50 text-amber-700" },
        { href: "/self-defense", icon: Shield, title: "Self-Defense", desc: "Real-world safety & defense guide", color: "bg-slate-600", light: "bg-slate-50 text-slate-700" },
    ];

    const formatEventDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

    const getGreeting = () => {
        const h = new Date().getHours();
        if (h < 12) return "Good morning";
        if (h < 18) return "Good afternoon";
        return "Good evening";
    };

    if (isLoading || !user) {
        return (
            <div className="min-h-screen bg-gray-50 pt-24 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-500 text-sm">Loading your dashboard…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Dark hero banner */}
            <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-red-900 text-white pt-24 pb-10 px-4 mb-8">
                <motion.div className="max-w-7xl mx-auto" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-3 py-1 rounded-full bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-widest">
                                    <Star className="w-3 h-3 inline mr-1" />
                                    Fan / Learner
                                </span>
                            </div>
                            <p className="text-gray-400 text-sm mb-1 flex items-center gap-1.5">
                                <Flame className="w-3.5 h-3.5 text-red-500" />
                                {getGreeting()}, <span className="text-white font-semibold ml-1">{user.name}</span>
                            </p>
                            <h1 className="text-3xl sm:text-4xl font-display font-black tracking-tight">
                                YOUR <span className="text-red-400">DASHBOARD</span>
                            </h1>
                        </div>
                    </div>
                </motion.div>
            </div>

            <motion.div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16" initial="hidden" animate="visible" variants={containerVariants}>

                {/* ── Stats Grid ── */}
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

                {/* ── Coaching Section ── */}
                <motion.div variants={itemVariants} className="mb-8">
                    {(() => {
                        const myCoach = relationships.find(r => r.status === 'active')?.coachId;
                        const incoming = relationships.filter(r =>
                            r.status === 'pending' && r.requestedBy === 'coach'
                        );
                        return (
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
                                        <Users className="w-5 h-5 text-red-600" /> Coaching
                                    </h2>
                                    {incoming.length > 0 && (
                                        <span className="px-2.5 py-1 bg-red-600 text-white text-xs font-bold rounded-full">
                                            {incoming.length} new request{incoming.length > 1 ? "s" : ""}
                                        </span>
                                    )}
                                </div>

                                {loadingRel ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                                    </div>
                                ) : myCoach ? (
                                    /* Active coach */
                                    <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-red-50 to-orange-50 border border-red-100 rounded-xl">
                                        <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white text-xl font-black flex-shrink-0">
                                            {myCoach.name[0]?.toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-500 mb-0.5">Your coach</p>
                                            <p className="text-gray-900 font-black text-base truncate">{myCoach.name}</p>
                                            {myCoach.discipline && <p className="text-gray-500 text-xs">{myCoach.discipline}</p>}
                                        </div>
                                        <Link href={`/messages?with=${myCoach._id}`}
                                            className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors"
                                        >
                                            <MessageSquare className="w-3.5 h-3.5" /> Message
                                        </Link>
                                    </div>
                                ) : incoming.length > 0 ? (
                                    /* Incoming requests */
                                    <div className="space-y-3">
                                        <p className="text-xs text-gray-500">Coaches want to work with you — accept or decline below.</p>
                                        {incoming.map(r => (
                                            <div key={r._id} className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                                                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center text-white font-black flex-shrink-0">
                                                    {r.coachId.name[0]?.toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-gray-900 text-sm font-bold truncate">{r.coachId.name}</p>
                                                    <p className="text-gray-500 text-xs">wants to coach you</p>
                                                </div>
                                                <div className="flex gap-1.5">
                                                    <button
                                                        onClick={() => handleRespond(r._id, 'accept')}
                                                        disabled={respondingId === r._id}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-60"
                                                    >
                                                        {respondingId === r._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                                        Accept
                                                    </button>
                                                    <button
                                                        onClick={() => handleRespond(r._id, 'decline')}
                                                        disabled={respondingId === r._id}
                                                        className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-600 text-xs font-bold rounded-lg transition-colors"
                                                    >
                                                        <X className="w-3 h-3" /> Decline
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    /* No coach yet */
                                    <div className="flex items-center gap-4 py-4">
                                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                            <UserPlus className="w-5 h-5 text-gray-400" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-gray-700 font-semibold text-sm">No coach yet</p>
                                            <p className="text-gray-400 text-xs mt-0.5">Get personalised training, assignments, and feedback from a coach.</p>
                                        </div>
                                        <Link href="/connections"
                                            className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors whitespace-nowrap"
                                        >
                                            Find a coach
                                        </Link>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* ── Quick Actions ── */}
                    <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                            <h2 className="text-lg font-black text-gray-900 uppercase tracking-wide mb-5 flex items-center gap-2">
                                <Flame className="w-5 h-5 text-red-600" /> Quick Actions
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {quickActions.map((a, i) => (
                                    <Link key={i} href={a.href}>
                                        <motion.div
                                            whileHover={{ y: -2, scale: 1.01 }}
                                            className="flex items-center gap-4 p-4 bg-gray-50 hover:bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm rounded-xl transition-all cursor-pointer group"
                                        >
                                            <div className={`w-10 h-10 ${a.color} rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm`}>
                                                <a.icon className="w-5 h-5 text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-gray-900 group-hover:text-red-600 transition-colors">{a.title}</p>
                                                <p className="text-xs text-gray-500 mt-0.5 truncate">{a.desc}</p>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-red-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                                        </motion.div>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Upcoming Events */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-lg font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-red-600" /> Upcoming Events
                                </h2>
                                <Link href="/events" className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-0.5">
                                    View all <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>
                            {loadingEvents ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : upcomingEvents.length > 0 ? (
                                <div className="space-y-2">
                                    {upcomingEvents.map((e, i) => (
                                        <motion.div key={e._id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                                            className="flex items-center justify-between p-3.5 bg-gray-50 hover:bg-red-50 border border-gray-100 hover:border-red-100 rounded-xl transition-all"
                                        >
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">{e.name}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">{e.location}</p>
                                            </div>
                                            <div className="text-right flex-shrink-0 ml-3">
                                                <p className="text-sm font-bold text-red-600">{formatEventDate(e.date)}</p>
                                                <p className="text-xs text-gray-400 uppercase">{e.status}</p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-8 text-center text-gray-400 text-sm">No upcoming events found</div>
                            )}
                        </div>
                    </motion.div>

                    {/* ── Profile & Progress ── */}
                    <motion.div variants={itemVariants} className="space-y-5">
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                            <h2 className="text-lg font-black text-gray-900 uppercase tracking-wide mb-5 flex items-center gap-2">
                                <Award className="w-5 h-5 text-red-600" /> Your Profile
                            </h2>

                            {/* Avatar */}
                            <div className="flex items-center gap-4 mb-5 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="relative flex-shrink-0">
                                    <div className="w-14 h-14 bg-gradient-to-br from-red-600 to-red-700 octagon-avatar flex items-center justify-center shadow-sm">
                                        <span className="text-xl font-black text-white">{user.name.charAt(0).toUpperCase()}</span>
                                    </div>
                                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-base font-bold text-gray-900 truncate">{user.name}</p>
                                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                    <p className="text-xs text-red-600 font-semibold mt-0.5">Member since {user.joinDate}</p>
                                </div>
                            </div>

                            {/* Details */}
                            <div className="space-y-1.5 mb-5">
                                {[
                                    { label: "Experience Level", value: user.experienceLevel || "Not set" },
                                    { label: "Training Goal", value: user.trainingGoal || "Not set" },
                                    { label: "Discipline", value: user.discipline || "Not set" },
                                ].map((item, i) => (
                                    <div key={i} className="flex justify-between items-center py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                                        <span className="text-xs text-gray-500">{item.label}</span>
                                        <span className="text-xs font-semibold text-gray-900">{item.value}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Quick stats */}
                            <div className="grid grid-cols-2 gap-3 mb-5">
                                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-center">
                                    <p className="text-2xl font-black text-red-600">{userStats?.accuracyRate ?? 0}%</p>
                                    <p className="text-xs text-gray-500 mt-0.5">Accuracy</p>
                                </div>
                                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-center">
                                    <p className="text-2xl font-black text-amber-600">{userStats?.predictionsMade ?? 0}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">Predictions</p>
                                </div>
                            </div>

                            <Link href="/profile"
                                className="flex items-center justify-center gap-2 w-full py-2.5 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-bold transition-colors"
                            >
                                Edit Profile <ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>

                        {/* UFC Tip Card */}
                        <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-2xl p-5 text-white shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                                <Sword className="w-4 h-4 text-red-200" />
                                <span className="text-xs font-bold uppercase tracking-wide text-red-200">Training Tip</span>
                            </div>
                            <p className="text-sm font-semibold leading-relaxed">
                                Consistency beats intensity. Train 4× per week with purpose rather than 7× with fatigue.
                            </p>
                            <Link href="/training" className="inline-flex items-center gap-1 text-xs text-red-200 hover:text-white font-bold mt-3 transition-colors">
                                Start roadmap <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
}
