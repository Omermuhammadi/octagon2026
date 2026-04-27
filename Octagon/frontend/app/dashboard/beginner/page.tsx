"use client";

import { useAuth, getAuthToken } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import {
    Target, Dumbbell, Calendar, BookOpen,
    ChevronRight, Loader2, CheckCircle, ArrowRight,
    Shield, Users, Zap, Star, MessageCircle,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { ConnectionHub } from "@/components/ConnectionHub";
import { authApi, statsApi, UserStats } from "@/lib/api";

const QUIZ_STEPS = [
    {
        question: "What's your training goal?",
        options: ["Get Fit & Healthy", "Learn Self-Defense", "Compete in MMA", "Explore the Sport"],
        field: "trainingGoal" as const,
        icon: Target,
    },
    {
        question: "Any martial arts experience?",
        options: ["Complete Beginner", "Tried a few classes", "Trained casually", "Some competition experience"],
        field: "experienceLevel" as const,
        icon: Shield,
    },
    {
        question: "Which discipline interests you most?",
        options: ["Boxing", "BJJ (Ground Game)", "Muay Thai", "Wrestling", "Full MMA"],
        field: "discipline" as const,
        icon: Dumbbell,
    },
    {
        question: "How many days per week can you train?",
        options: ["1-2 days", "3 days", "4 days", "5+ days"],
        field: "daysPerWeek" as const,
        icon: Calendar,
    },
];

const goalApiMap: Record<string, string> = {
    "Get Fit & Healthy": "Fitness",
    "Learn Self-Defense": "Self-Defense",
    "Compete in MMA": "Competition Preparation",
    "Explore the Sport": "Fitness",
};

const experienceApiMap: Record<string, string> = {
    "Complete Beginner": "Beginner",
    "Tried a few classes": "Beginner",
    "Trained casually": "Intermediate",
    "Some competition experience": "Advanced",
};

const disciplineApiMap: Record<string, string> = {
    "Boxing": "Boxing",
    "BJJ (Ground Game)": "BJJ",
    "Muay Thai": "Muay Thai",
    "Wrestling": "Wrestling",
    "Full MMA": "MMA",
};

function ProgressBar({ step, total }: { step: number; total: number }) {
    return (
        <div className="w-full bg-gray-100 rounded-full h-2 mb-6">
            <motion.div
                className="h-2 bg-red-600 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(step / total) * 100}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
            />
        </div>
    );
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

export default function BeginnerDashboard() {
    const { user, isAuthenticated, isLoading, refreshUser } = useAuth();
    const router = useRouter();
    const [userStats, setUserStats] = useState<UserStats | null>(null);
    const [quizStep, setQuizStep] = useState(0);
    const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
    const [quizComplete, setQuizComplete] = useState(false);
    const [savingQuiz, setSavingQuiz] = useState(false);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) router.push("/login");
    }, [isAuthenticated, isLoading, router]);

    useEffect(() => {
        const token = getAuthToken();
        if (!token) return;
        statsApi.getUserStats(token).then(r => {
            if (r.success && r.data) setUserStats(r.data);
        }).catch(() => {});
    }, []);

    // If user already has a discipline set, skip quiz
    const showQuiz = !user?.discipline && !quizComplete;

    const handleQuizSelect = (value: string) => {
        const field = QUIZ_STEPS[quizStep].field;
        const updated = { ...quizAnswers, [field]: value };
        setQuizAnswers(updated);

        if (quizStep < QUIZ_STEPS.length - 1) {
            setQuizStep(quizStep + 1);
        } else {
            // Last step — save and complete
            handleQuizSubmit(updated);
        }
    };

    const handleQuizSubmit = async (answers: Record<string, string>) => {
        const token = getAuthToken();
        if (!token) return;
        setSavingQuiz(true);
        try {
            await authApi.updateProfile({
                discipline: disciplineApiMap[answers.discipline] as any || "MMA",
                experienceLevel: experienceApiMap[answers.experienceLevel] as any || "Beginner",
                trainingGoal: goalApiMap[answers.trainingGoal] as any || "Fitness",
            }, token);
            await refreshUser();
            setQuizComplete(true);
        } catch {}
        finally { setSavingQuiz(false); }
    };

    const stats = [
        { label: "Training Sessions", value: userStats?.trainingSessions ?? 0, icon: Dumbbell, color: "text-red-600", bg: "bg-red-50", border: "border-red-100" },
        { label: "Predictions Made", value: userStats?.predictionsMade ?? 0, icon: Target, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
        { label: "Days Active", value: userStats?.daysActive ?? 1, icon: Calendar, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
        { label: "Progress", value: `${Math.min((userStats?.trainingSessions ?? 0) * 5, 100)}%`, icon: Star, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
    ];

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
                            <span className="px-3 py-1 rounded-full bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-widest">Beginner</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1">
                            Welcome, <span className="text-red-400">{user?.name?.split(" ")[0] ?? "Champion"}</span>
                        </h1>
                        <p className="text-gray-400 text-sm">Your MMA journey starts here. Train smart. Grow every day.</p>
                        {showQuiz && (
                            <div className="mt-4">
                                <ProgressBar step={quizStep} total={QUIZ_STEPS.length} />
                                <p className="text-xs text-gray-400">Step {quizStep + 1} of {QUIZ_STEPS.length} — Let's personalize your experience</p>
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 pb-16">
                {/* Onboarding Quiz */}
                <AnimatePresence mode="wait">
                    {showQuiz && (
                        <motion.div
                            key={quizStep}
                            initial={{ opacity: 0, x: 24 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -24 }}
                            transition={{ duration: 0.3 }}
                            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 mb-8"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                {(() => { const Icon = QUIZ_STEPS[quizStep].icon; return <Icon className="w-6 h-6 text-red-600" />; })()}
                                <h2 className="text-xl font-black text-gray-900">{QUIZ_STEPS[quizStep].question}</h2>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {QUIZ_STEPS[quizStep].options.map(opt => (
                                    <button
                                        key={opt}
                                        disabled={savingQuiz}
                                        onClick={() => handleQuizSelect(opt)}
                                        className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-100 hover:border-red-300 hover:bg-red-50 text-left transition-all group"
                                    >
                                        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-red-500 flex-shrink-0 transition-colors" />
                                        <span className="font-semibold text-gray-800 text-sm">{opt}</span>
                                    </button>
                                ))}
                            </div>
                            {savingQuiz && (
                                <div className="flex items-center gap-2 mt-4 text-gray-500 text-sm">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving your preferences...
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Quiz Complete Banner */}
                {(quizComplete || user?.discipline) && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl p-5 mb-8 flex items-center gap-4"
                    >
                        <CheckCircle className="w-8 h-8 text-emerald-500 flex-shrink-0" />
                        <div>
                            <p className="font-black text-emerald-800">Profile set up! You're ready to train.</p>
                            <p className="text-xs text-emerald-600">Discipline: <strong>{user?.discipline ?? quizAnswers.discipline}</strong> · Goal: <strong>{user?.trainingGoal ?? quizAnswers.trainingGoal}</strong></p>
                        </div>
                        <Link href="/training" className="ml-auto flex-shrink-0 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors">
                            Start Training →
                        </Link>
                    </motion.div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {stats.map((s, i) => <StatCard key={s.label} {...s} delay={i * 0.1} />)}
                </div>

                <div className="mb-8">
                    <ConnectionHub />
                </div>

                {/* Recommended Roadmap Card */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Dumbbell className="w-5 h-5 text-red-600" />
                            <h2 className="text-base font-black text-gray-900 uppercase tracking-wide">Your Recommended Roadmap</h2>
                        </div>
                        <span className="px-2.5 py-1 bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold rounded-full uppercase tracking-widest">Recommended</span>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Dumbbell className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-gray-900">{user?.discipline ?? "MMA"} — Beginner Track</p>
                            <p className="text-xs text-gray-500 mt-0.5">4 weeks · 4 sessions/week · Progressive difficulty</p>
                            <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                                <div className="h-1.5 bg-red-600 rounded-full" style={{ width: `${Math.min((userStats?.trainingSessions ?? 0) * 6.25, 100)}%` }} />
                            </div>
                        </div>
                        <Link href="/training"
                            className="flex-shrink-0 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-colors"
                        >
                            Continue
                        </Link>
                    </div>
                </div>

                {/* Beginner Resources */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
                    <h2 className="text-base font-black text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-red-600" /> Beginner Resources
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                            { title: "UFC Rules Explained", desc: "Understand the rules, scoring, and how fights are decided", icon: Shield, color: "bg-blue-50 border-blue-100", iconColor: "text-blue-600", href: "/self-defense" },
                            { title: "Basic MMA Glossary", desc: "Key terms every MMA beginner needs to know", icon: BookOpen, color: "bg-amber-50 border-amber-100", iconColor: "text-amber-600", href: "/training" },
                            { title: "Safe Training Tips", desc: "How to train smart, avoid injury, and progress faster", icon: CheckCircle, color: "bg-emerald-50 border-emerald-100", iconColor: "text-emerald-600", href: "/training" },
                        ].map(r => (
                            <Link key={r.title} href={r.href}
                                className={`${r.color} border rounded-xl p-4 hover:shadow-sm transition-all group`}
                            >
                                <r.icon className={`w-6 h-6 ${r.iconColor} mb-3 group-hover:scale-110 transition-transform`} />
                                <p className="font-bold text-gray-900 text-sm mb-1">{r.title}</p>
                                <p className="text-xs text-gray-500 leading-relaxed">{r.desc}</p>
                                <div className="flex items-center gap-1 mt-3 text-xs font-bold text-gray-400">
                                    Learn more <ChevronRight className="w-3 h-3" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Chatbot CTA */}
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6 text-white flex items-center justify-between">
                    <div>
                        <p className="text-xs text-red-400 font-bold uppercase tracking-widest mb-1">AI Coach</p>
                        <h3 className="text-lg font-black">Ask anything about training</h3>
                        <p className="text-gray-400 text-sm mt-1">Get instant answers from the MMA Oracle AI</p>
                    </div>
                    <button
                        className="flex-shrink-0 ml-4 px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl transition-colors flex items-center gap-2"
                        onClick={() => document.getElementById("chatbot-toggle")?.click()}
                    >
                        <MessageCircle className="w-4 h-4" />
                        Ask Now
                    </button>
                </div>
            </div>
        </div>
    );
}
