"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useRef } from "react";
import { Target, TrendingUp, Calendar, Star, Zap, Camera, Trophy, Clock, ChevronRight, Flame, Award } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { eventApi, statsApi, Event, UserStats } from "@/lib/api";
import { getAuthToken } from "@/contexts/AuthContext";
import gsap from "gsap";

// Animation variants for staggered children
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

export default function FanDashboard() {
    const { user, isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
    const [loadingEvents, setLoadingEvents] = useState(true);
    const [userStats, setUserStats] = useState<UserStats | null>(null);
    const [loadingStats, setLoadingStats] = useState(true);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const [titleAnimated, setTitleAnimated] = useState(false);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push("/login");
        } else if (!isLoading && user?.role !== "fan") {
            router.push("/dashboard/coach");
        }
    }, [isAuthenticated, isLoading, user, router]);

    // GSAP Split Text Animation for Dashboard Title
    useEffect(() => {
        if (!isLoading && user && titleRef.current && !titleAnimated) {
            setTitleAnimated(true);
            const title = titleRef.current;
            const text = title.innerText;
            const chars = text.split('');
            title.innerHTML = chars.map(char => 
                char === ' ' ? ' ' : `<span class="inline-block opacity-0">${char}</span>`
            ).join('');
            
            gsap.fromTo(
                title.querySelectorAll('span'),
                { opacity: 0, y: 40, rotateX: -90 },
                { 
                    opacity: 1, 
                    y: 0, 
                    rotateX: 0,
                    duration: 0.6,
                    stagger: 0.04,
                    ease: "back.out(1.7)"
                }
            );
        }
    }, [isLoading, user, titleAnimated]);

    // Fetch upcoming events
    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const response = await eventApi.getUpcomingEvents(5);
                if (response.success && response.data) {
                    setUpcomingEvents(response.data);
                }
            } catch (error) {
                console.error("Failed to fetch events:", error);
            } finally {
                setLoadingEvents(false);
            }
        };
        fetchEvents();
    }, []);

    // Fetch real user stats from backend
    useEffect(() => {
        const fetchStats = async () => {
            const token = getAuthToken();
            if (!token) { setLoadingStats(false); return; }
            try {
                const response = await statsApi.getUserStats(token);
                if (response.success && response.data) {
                    setUserStats(response.data);
                }
            } catch (error) {
                console.error("Failed to fetch stats:", error);
            } finally {
                setLoadingStats(false);
            }
        };
        fetchStats();
    }, []);

    // Memoized stats for performance - uses real API data
    const stats = useMemo(() => {
        if (!user) return [];
        const s = userStats;
        return [
            {
                label: "Predictions Made",
                value: s?.predictionsMade?.toString() || "0",
                icon: Target
            },
            {
                label: "Accuracy Rate",
                value: `${s?.accuracyRate || 0}%`,
                icon: TrendingUp
            },
            {
                label: "Training Sessions",
                value: s?.trainingSessions?.toString() || "0",
                icon: Trophy
            },
            {
                label: "Days Active",
                value: s?.daysActive?.toString() || "1",
                icon: Calendar
            }
        ];
    }, [user, userStats]);

    // Format date for display
    const formatEventDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Get greeting based on time of day
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    };

    if (isLoading || !user) {
        return (
            <div className="min-h-screen bg-black pt-24 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-octagon-red/20 rounded-full" />
                        <div className="w-16 h-16 border-4 border-octagon-red border-t-transparent rounded-full animate-spin absolute inset-0" />
                    </div>
                    <p className="text-gray-400 text-sm">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black pt-24 px-4 sm:px-6 lg:px-8 pb-12">
            {/* Subtle background gradient */}
            <div className="fixed inset-0 bg-gradient-to-br from-octagon-red/5 via-transparent to-transparent pointer-events-none" />
            
            <motion.div 
                className="max-w-7xl mx-auto relative"
                initial="hidden"
                animate="visible"
                variants={containerVariants}
            >
                {/* Header */}
                <motion.div className="mb-12" variants={itemVariants}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 ref={titleRef} className="text-4xl sm:text-5xl font-display italic text-white" style={{ perspective: '1000px' }}>
                                    FAN DASHBOARD
                                </h1>
                            </div>
                            <p className="text-gray-400 flex items-center gap-2">
                                <Flame className="w-4 h-4 text-octagon-red" />
                                {getGreeting()}, <span className="text-white font-semibold">{user.name}</span>
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <motion.div 
                                className="bg-octagon-red/20 text-octagon-red px-4 py-2 rounded-lg text-xs font-bold uppercase border border-octagon-red/30 flex items-center gap-2"
                                whileHover={{ scale: 1.05 }}
                                transition={{ type: "spring", stiffness: 400 }}
                            >
                                <Star className="w-4 h-4" />
                                Fan/Learner
                            </motion.div>
                        </div>
                    </div>
                </motion.div>

                {/* Stats Grid */}
                <motion.div 
                    className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12"
                    variants={containerVariants}
                >
                    {stats.map((stat, idx) => (
                        <motion.div key={idx} variants={itemVariants}>
                            <Card variant="glass" className="p-5 sm:p-6 hover:border-white/20 transition-all cursor-default">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="p-2 rounded-lg bg-white/5">
                                        <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-octagon-red" />
                                    </div>
                                    <div className="text-2xl sm:text-3xl font-display font-bold text-octagon-red">{stat.value}</div>
                                </div>
                                <div className="text-xs sm:text-sm text-gray-400 uppercase tracking-wider font-medium">{stat.label}</div>
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Quick Actions */}
                    <motion.div variants={itemVariants} className="lg:col-span-2">
                        <Card variant="glass" className="p-6 sm:p-8 h-full">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl sm:text-2xl font-display uppercase text-white flex items-center gap-2">
                                    <Flame className="w-5 h-5 text-octagon-red" />
                                    Quick Actions
                                </h2>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {[
                                    { href: "/prediction", icon: Zap, title: "Fight Predictions", desc: "Predict upcoming fight outcomes" },
                                    { href: "/form-check", icon: Camera, title: "Form Correction", desc: "Improve your technique with AI" },
                                    { href: "/comparison", icon: Target, title: "Fighter Comparison", desc: "Compare fighter statistics" },
                                    { href: "/training", icon: Star, title: "Training", desc: "Learn MMA fundamentals" },
                                ].map((action, idx) => (
                                    <Link key={idx} href={action.href}>
                                        <motion.div 
                                            className="p-5 sm:p-6 bg-white/5 rounded-xl border border-white/10 hover:border-octagon-red/50 hover:bg-white/10 transition-all cursor-pointer group"
                                            whileHover={{ y: -4 }}
                                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                        >
                                            <action.icon className="w-8 h-8 text-octagon-red mb-3 group-hover:scale-110 transition-transform" />
                                            <h3 className="text-base sm:text-lg font-display text-white mb-1 flex items-center gap-2">
                                                {action.title}
                                                <ChevronRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                            </h3>
                                            <p className="text-xs sm:text-sm text-gray-400">{action.desc}</p>
                                        </motion.div>
                                    </Link>
                                ))}
                            </div>

                            {/* Upcoming Events from API */}
                            <div className="mt-8">
                                <h3 className="text-lg font-display uppercase text-white mb-4 flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-octagon-red" />
                                    Upcoming Events
                                </h3>
                                {loadingEvents ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="w-6 h-6 border-2 border-octagon-red/20 border-t-octagon-red rounded-full animate-spin" />
                                    </div>
                                ) : upcomingEvents.length > 0 ? (
                                    <div className="space-y-3">
                                        {upcomingEvents.map((event, idx) => (
                                            <motion.div 
                                                key={event._id} 
                                                className="p-4 bg-white/5 rounded-lg border border-white/10 hover:border-octagon-red/30 transition-colors"
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.1 }}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <span className="text-white font-semibold">{event.name}</span>
                                                        <p className="text-xs text-gray-500 mt-1">{event.location}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-sm text-octagon-red font-bold">{formatEventDate(event.date)}</div>
                                                        <div className="text-xs text-gray-500 uppercase">{event.status}</div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-4 bg-white/5 rounded-lg border border-white/10 text-center text-gray-500">
                                        No upcoming events found
                                    </div>
                                )}
                            </div>
                        </Card>
                    </motion.div>

                    {/* User Stats & Activity */}
                    <motion.div variants={itemVariants}>
                        <Card variant="glass" className="p-6 sm:p-8">
                            <h2 className="text-xl sm:text-2xl font-display uppercase text-white mb-6 flex items-center gap-2">
                                <Award className="w-5 h-5 text-octagon-red" />
                                Your Progress
                            </h2>
                            
                            {/* User Info */}
                            <motion.div 
                                className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10"
                                whileHover={{ scale: 1.02 }}
                                transition={{ type: "spring", stiffness: 400 }}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <div className="w-16 h-16 bg-gradient-to-br from-octagon-red to-octagon-gold octagon-avatar flex items-center justify-center shadow-lg shadow-octagon-red/20">
                                            <span className="text-2xl font-bold text-white">{user.name.charAt(0).toUpperCase()}</span>
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-black" title="Online" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-white font-bold text-lg truncate">{user.name}</h3>
                                        <p className="text-gray-400 text-sm truncate">{user.email}</p>
                                        <p className="text-octagon-red text-xs uppercase mt-1 flex items-center gap-1">
                                            <Star className="w-3 h-3" />
                                            Member since {user.joinDate}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Profile Details */}
                            <div className="space-y-2 mb-6">
                                {[
                                    { label: "Experience Level", value: user.experienceLevel || 'Not set' },
                                    { label: "Training Goal", value: user.trainingGoal || 'Not set' },
                                    { label: "Discipline", value: user.discipline || 'Not set' },
                                ].map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center py-2.5 px-3 rounded-lg hover:bg-white/5 transition-colors">
                                        <span className="text-gray-400 text-sm">{item.label}</span>
                                        <span className="text-white font-semibold text-sm">{item.value}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Quick Stats Summary */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-white/5 rounded-lg border border-white/10 text-center">
                                    <div className="text-2xl font-display text-octagon-red">{userStats?.accuracyRate || 0}%</div>
                                    <div className="text-xs text-gray-400">Accuracy</div>
                                </div>
                                <div className="p-3 bg-white/5 rounded-lg border border-white/10 text-center">
                                    <div className="text-2xl font-display text-octagon-red">{userStats?.predictionsMade || 0}</div>
                                    <div className="text-xs text-gray-400">Predictions</div>
                                </div>
                            </div>

                            {/* Edit Profile Link */}
                            <Link href="/profile" className="block mt-6">
                                <Button variant="outline" className="w-full group">
                                    <span>Edit Profile</span>
                                    <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </Link>
                        </Card>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
}
