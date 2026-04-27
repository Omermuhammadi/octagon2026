"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
    fighterApi,
    strategyApi,
    StrategyResult,
    StrategyHistoryItem,
    API_BASE_URL,
} from "@/lib/api";
import type { LucideIcon } from "lucide-react";
import {
    Search,
    Zap,
    Shield,
    Target,
    Clock,
    Loader2,
    BarChart3,
    History,
    AlertCircle,
    Swords,
    Copy,
    Check,
    Trash2,
    ChevronRight,
    Lock,
    RotateCcw,
    Eye,
    EyeOff,
    Crosshair,
    AlertTriangle,
    MessageSquare,
    TrendingUp,
    Activity,
    Award,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FighterOption {
    _id: string;
    name: string;
    wins: number;
    losses: number;
    draws: number;
    weight: string;
}

type TabKey =
    | "overview"
    | "strengths"
    | "rounds"
    | "range"
    | "strikes"
    | "takedowns"
    | "dangers"
    | "corner";

const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "strengths", label: "Strengths", icon: Shield },
    { key: "rounds", label: "Round Strategy", icon: Clock },
    { key: "range", label: "Range", icon: Crosshair },
    { key: "strikes", label: "Strike Targeting", icon: Target },
    { key: "takedowns", label: "Takedown Plan", icon: Swords },
    { key: "dangers", label: "Danger Zones", icon: AlertTriangle },
    { key: "corner", label: "Corner Advice", icon: MessageSquare },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strategy generation requires an LLM call -- use a 30-second timeout. */
async function generateStrategyWithTimeout(
    fighter1Name: string,
    fighter2Name: string,
    token: string
): Promise<StrategyResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
        const response = await fetch(`${API_BASE_URL}/strategy/generate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ fighter1Name, fighter2Name }),
            signal: controller.signal,
            credentials: "include",
        });
        clearTimeout(timeoutId);

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Strategy generation failed");
        }
        return data.data as StrategyResult;
    } catch (error: unknown) {
        clearTimeout(timeoutId);
        if (error instanceof DOMException && error.name === "AbortError") {
            throw new Error(
                "Request timed out. Strategy generation can take up to 30 seconds -- please try again."
            );
        }
        throw error;
    }
}

function ratingColor(rating: "HIGH" | "MEDIUM" | "LOW") {
    switch (rating) {
        case "HIGH":
            return "bg-green-500/20 text-green-400 border-green-500/30";
        case "MEDIUM":
            return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
        case "LOW":
            return "bg-red-500/20 text-red-400 border-red-500/30";
    }
}

function severityColor(severity: "HIGH" | "MEDIUM" | "LOW") {
    switch (severity) {
        case "HIGH":
            return "bg-red-500/20 text-red-400 border-red-500/30";
        case "MEDIUM":
            return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
        case "LOW":
            return "bg-green-500/20 text-green-400 border-green-500/30";
    }
}

function approachStyle(approach: "aggressive" | "patient" | "defensive") {
    switch (approach) {
        case "aggressive":
            return "bg-red-500/20 text-red-400 border-red-500/30";
        case "patient":
            return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
        case "defensive":
            return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    }
}

function riskStyle(risk: "high" | "medium" | "low") {
    switch (risk) {
        case "high":
            return "text-red-400";
        case "medium":
            return "text-yellow-400";
        case "low":
            return "text-green-400";
    }
}

function verdictStyle(verdict: "shoot" | "stuff" | "neutral") {
    switch (verdict) {
        case "shoot":
            return "bg-green-500/20 text-green-400 border-green-500/30";
        case "stuff":
            return "bg-red-500/20 text-red-400 border-red-500/30";
        case "neutral":
            return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    }
}

function priorityStyle(priority: "primary" | "secondary" | "low") {
    switch (priority) {
        case "primary":
            return "bg-red-50 text-red-700 border-red-200";
        case "secondary":
            return "bg-amber-50 text-amber-700 border-amber-200";
        case "low":
            return "bg-gray-100 text-gray-600 border-gray-200";
    }
}

// ---------------------------------------------------------------------------
// Animation Variants
// ---------------------------------------------------------------------------

const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.07 },
    },
};

const staggerItem = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function StrategyPage() {
    const { user, token, isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();

    // Fighter search state
    const [fighter1Search, setFighter1Search] = useState("");
    const [fighter2Search, setFighter2Search] = useState("");
    const [fighter1Options, setFighter1Options] = useState<FighterOption[]>([]);
    const [fighter2Options, setFighter2Options] = useState<FighterOption[]>([]);
    const [selectedFighter1, setSelectedFighter1] = useState<FighterOption | null>(null);
    const [selectedFighter2, setSelectedFighter2] = useState<FighterOption | null>(null);
    const [showF1Dropdown, setShowF1Dropdown] = useState(false);
    const [showF2Dropdown, setShowF2Dropdown] = useState(false);

    // Strategy state
    const [generating, setGenerating] = useState(false);
    const [result, setResult] = useState<StrategyResult | null>(null);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState<TabKey>("overview");

    // Corner advice copy
    const [copied, setCopied] = useState(false);

    // History state
    const [history, setHistory] = useState<StrategyHistoryItem[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // -----------------------------------------------------------------------
    // Auth guard
    // -----------------------------------------------------------------------

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [authLoading, isAuthenticated, router]);

    // -----------------------------------------------------------------------
    // Close dropdowns on outside click
    // -----------------------------------------------------------------------

    useEffect(() => {
        const handleClick = () => {
            setShowF1Dropdown(false);
            setShowF2Dropdown(false);
        };
        document.addEventListener("click", handleClick);
        return () => document.removeEventListener("click", handleClick);
    }, []);

    // -----------------------------------------------------------------------
    // Fighter search with debounce
    // -----------------------------------------------------------------------

    const searchFighters = useCallback(
        async (query: string, setter: (opts: FighterOption[]) => void) => {
            if (query.length < 2) {
                setter([]);
                return;
            }
            try {
                const res = await fighterApi.searchFighters(query, 8);
                if (res.success && res.data) {
                    setter(res.data as unknown as FighterOption[]);
                }
            } catch {
                setter([]);
            }
        },
        []
    );

    useEffect(() => {
        const timer = setTimeout(
            () => searchFighters(fighter1Search, setFighter1Options),
            300
        );
        return () => clearTimeout(timer);
    }, [fighter1Search, searchFighters]);

    useEffect(() => {
        const timer = setTimeout(
            () => searchFighters(fighter2Search, setFighter2Options),
            300
        );
        return () => clearTimeout(timer);
    }, [fighter2Search, searchFighters]);

    // -----------------------------------------------------------------------
    // Load history
    // -----------------------------------------------------------------------

    const loadHistory = useCallback(async () => {
        if (!token) return;
        try {
            const res = await strategyApi.getHistory(token, 20);
            if (res.success && res.data) {
                setHistory(res.data);
            }
        } catch {
            // silent
        }
    }, [token]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory, result]);

    // -----------------------------------------------------------------------
    // Generate strategy
    // -----------------------------------------------------------------------

    const handleGenerate = async () => {
        if (!selectedFighter1 || !selectedFighter2 || !token) return;
        setError("");
        setGenerating(true);
        setResult(null);
        setActiveTab("overview");

        try {
            const data = await generateStrategyWithTimeout(
                selectedFighter1.name,
                selectedFighter2.name,
                token
            );
            setResult(data);
        } catch (e: unknown) {
            const message =
                e instanceof Error ? e.message : "Strategy generation failed";
            setError(message);
        } finally {
            setGenerating(false);
        }
    };

    // -----------------------------------------------------------------------
    // Delete history item
    // -----------------------------------------------------------------------

    const handleDelete = async (id: string) => {
        if (!token) return;
        setDeletingId(id);
        try {
            await strategyApi.delete(id, token);
            setHistory((prev) => prev.filter((h) => h._id !== id));
        } catch {
            // silent
        } finally {
            setDeletingId(null);
        }
    };

    // -----------------------------------------------------------------------
    // Copy corner advice
    // -----------------------------------------------------------------------

    const handleCopyCornerAdvice = async () => {
        if (!result?.cornerAdvice) return;
        const text = result.cornerAdvice
            .map(
                (r) =>
                    `Round ${r.round}:\n${r.advice.map((a) => `  - ${a}`).join("\n")}`
            )
            .join("\n\n");

        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // fallback: do nothing
        }
    };

    // -----------------------------------------------------------------------
    // Reset state for new strategy
    // -----------------------------------------------------------------------

    const handleReset = () => {
        setFighter1Search("");
        setFighter2Search("");
        setFighter1Options([]);
        setFighter2Options([]);
        setSelectedFighter1(null);
        setSelectedFighter2(null);
        setResult(null);
        setError("");
        setActiveTab("overview");
        setCopied(false);
    };

    // -----------------------------------------------------------------------
    // Render gates
    // -----------------------------------------------------------------------

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
            </div>
        );
    }

    // Coach-only gate
    if (user?.role !== "coach") {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 max-w-md w-full text-center"
                >
                    <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
                        <Lock className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-3">
                        Coach Access Required
                    </h1>
                    <p className="text-gray-500 mb-8 leading-relaxed">
                        The Strategy Optimizer is an advanced tool available exclusively
                        to coaches. Upgrade your account to access AI-powered game plans.
                    </p>
                    <button
                        onClick={() => router.push("/dashboard/fan")}
                        className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-gray-900 font-bold rounded-xl transition-all"
                    >
                        Back to Dashboard
                    </button>
                </motion.div>
            </div>
        );
    }

    // -----------------------------------------------------------------------
    // Tab Content Renderers
    // -----------------------------------------------------------------------

    const renderOverview = () => {
        if (!result) return null;
        const { prediction, fighter1, fighter2, fightStatsAvailable } = result;

        return (
            <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="space-y-6"
            >
                {/* Win Probability */}
                <motion.div
                    variants={staggerItem}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8"
                >
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-red-500" /> Win Probability
                    </h2>
                    <div className="space-y-5">
                        {/* Fighter 1 bar */}
                        <div>
                            <div className="flex justify-between mb-2">
                                <span
                                    className={`font-bold ${
                                        prediction.winner === fighter1.name
                                            ? "text-green-600"
                                            : "text-gray-900"
                                    }`}
                                >
                                    {fighter1.name}
                                    {prediction.winner === fighter1.name && (
                                        <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                            WINNER
                                        </span>
                                    )}
                                </span>
                                <span className="text-gray-900 font-bold font-mono">
                                    {prediction.winnerProbability > prediction.loserProbability
                                        ? prediction.winner === fighter1.name
                                            ? prediction.winnerProbability
                                            : prediction.loserProbability
                                        : prediction.winner === fighter1.name
                                        ? prediction.winnerProbability
                                        : prediction.loserProbability}
                                    %
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{
                                        width: `${
                                            prediction.winner === fighter1.name
                                                ? prediction.winnerProbability
                                                : prediction.loserProbability
                                        }%`,
                                    }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className={`h-full rounded-full ${
                                        prediction.winner === fighter1.name
                                            ? "bg-gradient-to-r from-green-600 to-green-400"
                                            : "bg-gradient-to-r from-red-600 to-red-400"
                                    }`}
                                />
                            </div>
                            <p className="text-gray-500 text-sm mt-1">
                                {fighter1.record}
                            </p>
                        </div>

                        {/* Fighter 2 bar */}
                        <div>
                            <div className="flex justify-between mb-2">
                                <span
                                    className={`font-bold ${
                                        prediction.winner === fighter2.name
                                            ? "text-green-600"
                                            : "text-gray-900"
                                    }`}
                                >
                                    {fighter2.name}
                                    {prediction.winner === fighter2.name && (
                                        <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                            WINNER
                                        </span>
                                    )}
                                </span>
                                <span className="text-gray-900 font-bold font-mono">
                                    {prediction.winner === fighter2.name
                                        ? prediction.winnerProbability
                                        : prediction.loserProbability}
                                    %
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{
                                        width: `${
                                            prediction.winner === fighter2.name
                                                ? prediction.winnerProbability
                                                : prediction.loserProbability
                                        }%`,
                                    }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className={`h-full rounded-full ${
                                        prediction.winner === fighter2.name
                                            ? "bg-gradient-to-r from-green-600 to-green-400"
                                            : "bg-gradient-to-r from-blue-600 to-blue-400"
                                    }`}
                                />
                            </div>
                            <p className="text-gray-500 text-sm mt-1">
                                {fighter2.record}
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Method / Round / Confidence cards */}
                <motion.div
                    variants={staggerItem}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                >
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center">
                        <Target className="w-8 h-8 text-red-500 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm uppercase tracking-wider mb-1">
                            Predicted Method
                        </p>
                        <p className="text-gray-900 text-xl font-bold">
                            {prediction.predictedMethod}
                        </p>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center">
                        <Clock className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm uppercase tracking-wider mb-1">
                            Predicted Round
                        </p>
                        <p className="text-gray-900 text-xl font-bold">
                            Round {prediction.predictedRound}
                        </p>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center">
                        <Award className="w-8 h-8 text-green-500 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm uppercase tracking-wider mb-1">
                            Confidence
                        </p>
                        <p className="text-gray-900 text-xl font-bold">
                            {prediction.confidence}%
                        </p>
                    </div>
                </motion.div>

                {/* Physical Comparison */}
                <motion.div
                    variants={staggerItem}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8"
                >
                    <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-red-500" /> Physical
                        Comparison
                    </h3>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        {/* Fighter 1 values */}
                        <div className="space-y-4">
                            <p className="text-sm font-bold text-red-400 uppercase tracking-wider">
                                {fighter1.name.split(" ").pop()}
                            </p>
                            <p className="text-gray-900 text-lg font-mono">
                                {fighter1.height || "N/A"}
                            </p>
                            <p className="text-gray-900 text-lg font-mono">
                                {fighter1.reach ? `${fighter1.reach}"` : "N/A"}
                            </p>
                            <p className="text-gray-900 text-lg">
                                {fighter1.stance || "N/A"}
                            </p>
                        </div>
                        {/* Labels */}
                        <div className="space-y-4">
                            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                                Stat
                            </p>
                            <p className="text-gray-600 text-lg">Height</p>
                            <p className="text-gray-600 text-lg">Reach</p>
                            <p className="text-gray-600 text-lg">Stance</p>
                        </div>
                        {/* Fighter 2 values */}
                        <div className="space-y-4">
                            <p className="text-sm font-bold text-blue-400 uppercase tracking-wider">
                                {fighter2.name.split(" ").pop()}
                            </p>
                            <p className="text-gray-900 text-lg font-mono">
                                {fighter2.height || "N/A"}
                            </p>
                            <p className="text-gray-900 text-lg font-mono">
                                {fighter2.reach ? `${fighter2.reach}"` : "N/A"}
                            </p>
                            <p className="text-gray-900 text-lg">
                                {fighter2.stance || "N/A"}
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Method Probabilities */}
                {prediction.methodProbabilities &&
                    prediction.methodProbabilities.length > 0 && (
                        <motion.div
                            variants={staggerItem}
                            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8"
                        >
                            <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-red-500" /> Method
                                Probabilities
                            </h3>
                            <div className="space-y-3">
                                {prediction.methodProbabilities.map((mp) => (
                                    <div key={mp.method}>
                                        <div className="flex justify-between mb-1">
                                            <span className="text-gray-700 text-sm">
                                                {mp.method}
                                            </span>
                                            <span className="text-gray-900 font-mono text-sm font-bold">
                                                {mp.probability}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{
                                                    width: `${mp.probability}%`,
                                                }}
                                                transition={{
                                                    duration: 0.8,
                                                    ease: "easeOut",
                                                }}
                                                className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                {/* Top Factors */}
                {prediction.topFactors && prediction.topFactors.length > 0 && (
                    <motion.div
                        variants={staggerItem}
                        className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8"
                    >
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-red-500" /> Top
                            Factors
                        </h3>
                        <ul className="space-y-3">
                            {prediction.topFactors.map((f, idx) => (
                                <li
                                    key={idx}
                                    className="flex items-start gap-3 text-sm"
                                >
                                    <ChevronRight className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <span className="text-gray-900 font-semibold">
                                            {f.factor}
                                        </span>
                                        <span className="text-gray-500 ml-1">
                                            -- {f.description}
                                        </span>
                                        {f.impact && (
                                            <span className="ml-2 text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full">
                                                {f.impact}
                                            </span>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                )}

                {/* Data Availability Note */}
                {fightStatsAvailable && (
                    <motion.div
                        variants={staggerItem}
                        className="text-center text-gray-500 text-xs"
                    >
                        Analysis based on {fightStatsAvailable.fighter1} fight
                        stats for {fighter1.name} and{" "}
                        {fightStatsAvailable.fighter2} fight stats for{" "}
                        {fighter2.name}
                    </motion.div>
                )}
            </motion.div>
        );
    };

    const renderStrengths = () => {
        if (!result) return null;
        const { strengthsWeaknesses, fighter1, fighter2 } = result;

        return (
            <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
                {/* Fighter 1 S/W */}
                <motion.div
                    variants={staggerItem}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
                >
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-red-500" />
                        {fighter1.name}
                        <span className="text-xs text-gray-500 font-normal ml-1">
                            (Your Fighter)
                        </span>
                    </h3>
                    <div className="space-y-3">
                        {strengthsWeaknesses.fighter1.map((sw, idx) => (
                            <div
                                key={idx}
                                className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100"
                            >
                                <span
                                    className={`px-2 py-0.5 rounded-md text-xs font-bold border flex-shrink-0 ${ratingColor(
                                        sw.rating
                                    )}`}
                                >
                                    {sw.rating}
                                </span>
                                <div>
                                    <p className="text-gray-900 font-medium text-sm">
                                        {sw.category}
                                    </p>
                                    <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">
                                        {sw.detail}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Fighter 2 S/W */}
                <motion.div
                    variants={staggerItem}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
                >
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-500" />
                        {fighter2.name}
                        <span className="text-xs text-gray-500 font-normal ml-1">
                            (Opponent)
                        </span>
                    </h3>
                    <div className="space-y-3">
                        {strengthsWeaknesses.fighter2.map((sw, idx) => (
                            <div
                                key={idx}
                                className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100"
                            >
                                <span
                                    className={`px-2 py-0.5 rounded-md text-xs font-bold border flex-shrink-0 ${ratingColor(
                                        sw.rating
                                    )}`}
                                >
                                    {sw.rating}
                                </span>
                                <div>
                                    <p className="text-gray-900 font-medium text-sm">
                                        {sw.category}
                                    </p>
                                    <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">
                                        {sw.detail}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </motion.div>
        );
    };

    const renderRoundStrategy = () => {
        if (!result) return null;

        return (
            <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
                {result.roundStrategy.map((rs) => (
                    <motion.div
                        key={rs.round}
                        variants={staggerItem}
                        className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900">
                                Round {rs.round}
                            </h3>
                            <span
                                className={`px-3 py-1 rounded-full text-xs font-bold border uppercase ${approachStyle(
                                    rs.approach
                                )}`}
                            >
                                {rs.approach}
                            </span>
                        </div>

                        <div className="mb-4">
                            <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">
                                Tactics
                            </p>
                            <ul className="space-y-1.5">
                                {rs.tactics.map((t, i) => (
                                    <li
                                        key={i}
                                        className="flex items-start gap-2 text-sm"
                                    >
                                        <ChevronRight className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                                        <span className="text-gray-600">
                                            {t}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                            <div className="flex items-center gap-1.5">
                                <span className="text-gray-500 text-xs">
                                    Risk:
                                </span>
                                <span
                                    className={`text-xs font-bold uppercase ${riskStyle(
                                        rs.riskLevel
                                    )}`}
                                >
                                    {rs.riskLevel}
                                </span>
                            </div>
                        </div>

                        {rs.notes && (
                            <p className="text-gray-500 text-xs mt-3 italic leading-relaxed">
                                {rs.notes}
                            </p>
                        )}
                    </motion.div>
                ))}
            </motion.div>
        );
    };

    const renderRange = () => {
        if (!result) return null;
        const { rangeAnalysis, fighter1, fighter2 } = result;
        const ranges = [
            { key: "distance", label: "Distance", data: rangeAnalysis.distance },
            { key: "clinch", label: "Clinch", data: rangeAnalysis.clinch },
            { key: "ground", label: "Ground", data: rangeAnalysis.ground },
        ];

        return (
            <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="space-y-6"
            >
                {/* Best Range Callout */}
                <motion.div
                    variants={staggerItem}
                    className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 flex items-center gap-4"
                >
                    <Crosshair className="w-8 h-8 text-red-500 flex-shrink-0" />
                    <div>
                        <p className="text-gray-900 font-bold text-lg">
                            Best Range:{" "}
                            <span className="text-octagon-red capitalize">
                                {rangeAnalysis.bestRange}
                            </span>
                        </p>
                        <p className="text-gray-500 text-sm">
                            Your fighter has the greatest advantage at this range.
                            Build the game plan around controlling{" "}
                            {rangeAnalysis.bestRange} distance.
                        </p>
                    </div>
                </motion.div>

                {/* Range Bars */}
                {ranges.map(({ key, label, data }) => (
                    <motion.div
                        key={key}
                        variants={staggerItem}
                        className={`bg-white rounded-2xl border p-6 shadow-sm ${
                            rangeAnalysis.bestRange.toLowerCase() === key
                                ? "border-red-500/30"
                                : "border-gray-200"
                        }`}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-gray-900 font-bold text-lg flex items-center gap-2">
                                {label}
                                {rangeAnalysis.bestRange.toLowerCase() === key && (
                                    <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-medium">
                                        OPTIMAL
                                    </span>
                                )}
                            </h3>
                        </div>

                        {/* Score comparison */}
                        <div className="space-y-3 mb-4">
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-red-400 font-medium">
                                        {fighter1.name}
                                    </span>
                                    <span className="text-gray-900 font-mono font-bold">
                                        {data.fighter1Score}/10
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{
                                            width: `${data.fighter1Score * 10}%`,
                                        }}
                                        transition={{
                                            duration: 0.8,
                                            ease: "easeOut",
                                        }}
                                        className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400"
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-blue-400 font-medium">
                                        {fighter2.name}
                                    </span>
                                    <span className="text-gray-900 font-mono font-bold">
                                        {data.fighter2Score}/10
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{
                                            width: `${data.fighter2Score * 10}%`,
                                        }}
                                        transition={{
                                            duration: 0.8,
                                            ease: "easeOut",
                                        }}
                                        className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-gray-100">
                            <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">
                                Recommendation
                            </p>
                            <p className="text-gray-700 text-sm leading-relaxed">
                                {data.recommendation}
                            </p>
                        </div>
                    </motion.div>
                ))}
            </motion.div>
        );
    };

    const renderStrikeTargeting = () => {
        if (!result) return null;
        const { strikeTargeting, fighter2 } = result;
        const zones = [
            { key: "head", label: "Head", data: strikeTargeting.head },
            { key: "body", label: "Body", data: strikeTargeting.body },
            { key: "legs", label: "Legs", data: strikeTargeting.legs },
        ];

        return (
            <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="space-y-6"
            >
                {/* Primary Target Banner */}
                <motion.div
                    variants={staggerItem}
                    className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 flex items-center gap-4"
                >
                    <Target className="w-8 h-8 text-red-500 flex-shrink-0" />
                    <div>
                        <p className="text-gray-900 font-bold text-lg">
                            Primary Target:{" "}
                            <span className="text-octagon-red capitalize">
                                {strikeTargeting.primaryTarget}
                            </span>
                        </p>
                        <p className="text-gray-500 text-sm">
                            Focus striking attacks on this target zone against{" "}
                            {fighter2.name} for maximum effectiveness.
                        </p>
                    </div>
                </motion.div>

                {/* Strike Zones */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {zones.map(({ key, label, data }) => (
                        <motion.div
                            key={key}
                            variants={staggerItem}
                            className={`bg-white rounded-2xl border p-6 shadow-sm ${
                                strikeTargeting.primaryTarget.toLowerCase() ===
                                key
                                    ? "border-red-500/30"
                                    : "border-gray-200"
                            }`}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-gray-900 font-bold text-lg">
                                    {label}
                                </h3>
                                <span
                                    className={`px-2.5 py-1 rounded-full text-xs font-bold border uppercase ${priorityStyle(
                                        data.priority
                                    )}`}
                                >
                                    {data.priority}
                                </span>
                            </div>

                            <div className="mb-4">
                                <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">
                                    Opponent Defense
                                </p>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{
                                                width: `${data.opponentDefense}%`,
                                            }}
                                            transition={{
                                                duration: 0.8,
                                                ease: "easeOut",
                                            }}
                                            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400"
                                        />
                                    </div>
                                    <span className="text-gray-900 font-mono text-sm font-bold">
                                        {data.opponentDefense}%
                                    </span>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-gray-100">
                                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">
                                    Recommendation
                                </p>
                                <p className="text-gray-700 text-sm leading-relaxed">
                                    {data.recommendation}
                                </p>
                            </div>

                            {strikeTargeting.primaryTarget.toLowerCase() ===
                                key && (
                                <div className="mt-3 text-center">
                                    <span className="text-xs bg-red-500/20 text-red-400 px-3 py-1 rounded-full font-bold">
                                        PRIMARY TARGET
                                    </span>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        );
    };

    const renderTakedownPlan = () => {
        if (!result) return null;
        const { takedownPlan, fighter1, fighter2 } = result;

        return (
            <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="space-y-6"
            >
                {/* Verdict Badge */}
                <motion.div
                    variants={staggerItem}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8 text-center"
                >
                    <div
                        className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xl font-bold border ${verdictStyle(
                            takedownPlan.verdict
                        )}`}
                    >
                        <Swords className="w-6 h-6" />
                        <span className="uppercase">
                            {takedownPlan.verdict === "shoot"
                                ? "SHOOT -- Take it to the Ground"
                                : takedownPlan.verdict === "stuff"
                                ? "STUFF -- Keep it Standing"
                                : "NEUTRAL -- Situational"}
                        </span>
                    </div>
                    <p className="text-gray-500 text-sm mt-4 max-w-xl mx-auto leading-relaxed">
                        {takedownPlan.details}
                    </p>
                </motion.div>

                {/* Stats Grid */}
                <motion.div
                    variants={staggerItem}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4"
                >
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-center">
                        <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">
                            Your TD Accuracy
                        </p>
                        <p className="text-gray-900 text-2xl font-bold font-mono">
                            {takedownPlan.yourTdAccuracy}%
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                            {fighter1.name}
                        </p>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-center">
                        <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">
                            Opp. TD Defense
                        </p>
                        <p className="text-gray-900 text-2xl font-bold font-mono">
                            {takedownPlan.opponentTdDefense}%
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                            {fighter2.name}
                        </p>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-center">
                        <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">
                            Opp. TD Accuracy
                        </p>
                        <p className="text-gray-900 text-2xl font-bold font-mono">
                            {takedownPlan.opponentTdAccuracy}%
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                            {fighter2.name}
                        </p>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-center">
                        <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">
                            Your TD Defense
                        </p>
                        <p className="text-gray-900 text-2xl font-bold font-mono">
                            {takedownPlan.yourTdDefense}%
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                            {fighter1.name}
                        </p>
                    </div>
                </motion.div>
            </motion.div>
        );
    };

    const renderDangerZones = () => {
        if (!result) return null;

        return (
            <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="space-y-4"
            >
                {result.dangerZones.length === 0 && (
                    <motion.div
                        variants={staggerItem}
                        className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center"
                    >
                        <Shield className="w-10 h-10 text-green-500 mx-auto mb-3" />
                        <p className="text-gray-900 font-bold text-lg">
                            No Major Threats Identified
                        </p>
                        <p className="text-gray-500 text-sm mt-1">
                            The analysis did not flag any critical danger zones for
                            this matchup.
                        </p>
                    </motion.div>
                )}

                {result.dangerZones.map((dz, idx) => (
                    <motion.div
                        key={idx}
                        variants={staggerItem}
                        className={`bg-white rounded-2xl border p-5 shadow-sm flex items-start gap-4 ${
                            dz.severity === "HIGH"
                                ? "border-red-500/20"
                                : dz.severity === "MEDIUM"
                                ? "border-yellow-500/20"
                                : "border-gray-200"
                        }`}
                    >
                        <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                dz.severity === "HIGH"
                                    ? "bg-red-500/20"
                                    : dz.severity === "MEDIUM"
                                    ? "bg-yellow-500/20"
                                    : "bg-green-500/20"
                            }`}
                        >
                            <AlertTriangle
                                className={`w-5 h-5 ${
                                    dz.severity === "HIGH"
                                        ? "text-red-400"
                                        : dz.severity === "MEDIUM"
                                        ? "text-yellow-400"
                                        : "text-green-400"
                                }`}
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <p className="text-gray-900 font-bold">
                                    {dz.threat}
                                </p>
                                <span
                                    className={`px-2 py-0.5 rounded-md text-xs font-bold border ${severityColor(
                                        dz.severity
                                    )}`}
                                >
                                    {dz.severity}
                                </span>
                            </div>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                {dz.detail}
                            </p>
                        </div>
                    </motion.div>
                ))}
            </motion.div>
        );
    };

    const renderCornerAdvice = () => {
        if (!result) return null;

        return (
            <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="space-y-6"
            >
                {/* Copy Button */}
                <motion.div variants={staggerItem} className="flex justify-end">
                    <button
                        onClick={handleCopyCornerAdvice}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                            copied
                                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                : "bg-neutral-800 text-gray-600 border border-white/10 hover:bg-neutral-700 hover:text-white"
                        }`}
                    >
                        {copied ? (
                            <>
                                <Check className="w-4 h-4" /> Copied
                            </>
                        ) : (
                            <>
                                <Copy className="w-4 h-4" /> Copy All Corner
                                Advice
                            </>
                        )}
                    </button>
                </motion.div>

                {/* Round Advice Cards */}
                {result.cornerAdvice.map((ca) => (
                    <motion.div
                        key={ca.round}
                        variants={staggerItem}
                        className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                                <span className="text-red-400 font-bold text-lg">
                                    {ca.round}
                                </span>
                            </div>
                            <h3 className="text-gray-900 font-bold text-lg">
                                Round {ca.round} Corner
                            </h3>
                        </div>
                        <ul className="space-y-2">
                            {ca.advice.map((a, i) => (
                                <li
                                    key={i}
                                    className="flex items-start gap-3 text-sm"
                                >
                                    <MessageSquare className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                    <span className="text-gray-600 leading-relaxed">
                                        {a}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                ))}
            </motion.div>
        );
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case "overview":
                return renderOverview();
            case "strengths":
                return renderStrengths();
            case "rounds":
                return renderRoundStrategy();
            case "range":
                return renderRange();
            case "strikes":
                return renderStrikeTargeting();
            case "takedowns":
                return renderTakedownPlan();
            case "dangers":
                return renderDangerZones();
            case "corner":
                return renderCornerAdvice();
            default:
                return null;
        }
    };

    // -----------------------------------------------------------------------
    // Main Render
    // -----------------------------------------------------------------------

    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-16">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <h1 className="text-4xl md:text-5xl font-display italic text-gray-900 mb-4">
                        STRATEGY <span className="text-red-600">OPTIMIZER</span>
                    </h1>
                    <p className="text-gray-500 max-w-xl mx-auto text-lg">
                        AI-powered fight game plans built from statistical analysis
                        and matchup intelligence
                    </p>
                </motion.div>

                {/* Fighter Selection */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-10"
                >
                    {/* Fighter 1 -- Your Fighter */}
                    <div
                        className="md:col-span-2 relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <label className="block text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
                            Your Fighter
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={fighter1Search}
                                onChange={(e) => {
                                    setFighter1Search(e.target.value);
                                    setSelectedFighter1(null);
                                    setShowF1Dropdown(true);
                                }}
                                onFocus={() => setShowF1Dropdown(true)}
                                placeholder="Search fighter..."
                                className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-400 transition-colors shadow-sm"
                            />
                        </div>
                        {showF1Dropdown && fighter1Options.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl max-h-60 overflow-y-auto shadow-xl">
                                {fighter1Options.map((f) => (
                                    <button
                                        key={f._id}
                                        onClick={() => {
                                            setSelectedFighter1(f);
                                            setFighter1Search(f.name);
                                            setShowF1Dropdown(false);
                                        }}
                                        className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                                    >
                                        <span className="text-gray-900 font-medium">
                                            {f.name}
                                        </span>
                                        <span className="text-gray-500 text-sm ml-2">
                                            ({f.wins}-{f.losses}-{f.draws})
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                        {selectedFighter1 && (
                            <div className="mt-2 p-3 bg-red-50 border border-red-100 rounded-lg">
                                <p className="text-gray-900 font-semibold">
                                    {selectedFighter1.name}
                                </p>
                                <p className="text-gray-500 text-sm">
                                    {selectedFighter1.wins}W-{selectedFighter1.losses}L-
                                    {selectedFighter1.draws}D |{" "}
                                    {selectedFighter1.weight}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* VS Circle */}
                    <div className="flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-lg shadow-red-500/20">
                            <span className="text-gray-900 font-bold text-xl">
                                VS
                            </span>
                        </div>
                    </div>

                    {/* Fighter 2 -- Opponent */}
                    <div
                        className="md:col-span-2 relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <label className="block text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
                            Opponent
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={fighter2Search}
                                onChange={(e) => {
                                    setFighter2Search(e.target.value);
                                    setSelectedFighter2(null);
                                    setShowF2Dropdown(true);
                                }}
                                onFocus={() => setShowF2Dropdown(true)}
                                placeholder="Search fighter..."
                                className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-400 transition-colors shadow-sm"
                            />
                        </div>
                        {showF2Dropdown && fighter2Options.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl max-h-60 overflow-y-auto shadow-xl">
                                {fighter2Options.map((f) => (
                                    <button
                                        key={f._id}
                                        onClick={() => {
                                            setSelectedFighter2(f);
                                            setFighter2Search(f.name);
                                            setShowF2Dropdown(false);
                                        }}
                                        className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                                    >
                                        <span className="text-gray-900 font-medium">
                                            {f.name}
                                        </span>
                                        <span className="text-gray-500 text-sm ml-2">
                                            ({f.wins}-{f.losses}-{f.draws})
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                        {selectedFighter2 && (
                            <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                <p className="text-gray-900 font-semibold">
                                    {selectedFighter2.name}
                                </p>
                                <p className="text-gray-500 text-sm">
                                    {selectedFighter2.wins}W-{selectedFighter2.losses}L-
                                    {selectedFighter2.draws}D |{" "}
                                    {selectedFighter2.weight}
                                </p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Generate / Reset Buttons */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center justify-center gap-4 mb-10"
                >
                    {result ? (
                        <button
                            onClick={handleReset}
                            className="px-8 py-4 bg-neutral-800 hover:bg-neutral-700 text-gray-900 font-bold text-lg rounded-xl transition-all flex items-center gap-3 border border-white/10"
                        >
                            <RotateCcw className="w-5 h-5" />
                            New Strategy
                        </button>
                    ) : (
                        <button
                            onClick={handleGenerate}
                            disabled={
                                !selectedFighter1 ||
                                !selectedFighter2 ||
                                generating
                            }
                            className="px-10 py-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-gray-900 font-bold text-lg rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-3"
                        >
                            {generating ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Zap className="w-5 h-5" />
                            )}
                            {generating
                                ? "Analyzing matchup..."
                                : "Generate Strategy"}
                        </button>
                    )}
                </motion.div>

                {/* Error */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-center flex items-center justify-center gap-2"
                    >
                        <AlertCircle className="w-5 h-5" /> {error}
                    </motion.div>
                )}

                {/* Loading Skeleton */}
                {generating && (
                    <div className="space-y-4 mb-10">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="bg-white rounded-2xl border border-gray-200 p-8 animate-pulse"
                            >
                                <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
                                <div className="h-3 bg-gray-200 rounded w-full mb-2" />
                                <div className="h-3 bg-gray-200 rounded w-2/3" />
                            </div>
                        ))}
                    </div>
                )}

                {/* Results */}
                <AnimatePresence>
                    {result && (
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="space-y-6"
                        >
                            {/* Matchup Title */}
                            <div className="text-center mb-2">
                                <p className="text-gray-500 text-sm uppercase tracking-wider">
                                    Game Plan
                                </p>
                                <p className="text-gray-900 text-xl font-bold">
                                    {result.fighter1.name}{" "}
                                    <span className="text-gray-400">vs</span>{" "}
                                    {result.fighter2.name}
                                </p>
                            </div>

                            {/* Pill Tabs */}
                            <div className="flex flex-wrap justify-center gap-2 mb-6">
                                {TABS.map((tab) => {
                                    const Icon = tab.icon;
                                    const isActive = activeTab === tab.key;

                                    return (
                                        <motion.button
                                            key={tab.key}
                                            onClick={() =>
                                                setActiveTab(tab.key)
                                            }
                                            whileHover={{ scale: 1.03 }}
                                            whileTap={{ scale: 0.97 }}
                                            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                                isActive
                                                    ? "bg-red-600 text-white shadow-sm"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
                                            }`}
                                        >
                                            <Icon className="w-3.5 h-3.5" />
                                            <span className="hidden sm:inline">
                                                {tab.label}
                                            </span>
                                        </motion.button>
                                    );
                                })}
                            </div>

                            {/* Tab Content */}
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -12 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {renderTabContent()}
                                </motion.div>
                            </AnimatePresence>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* History Section */}
                <div className="mt-12">
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors mb-6"
                    >
                        {showHistory ? (
                            <EyeOff className="w-5 h-5" />
                        ) : (
                            <Eye className="w-5 h-5" />
                        )}
                        <span className="font-medium">
                            {showHistory ? "Hide" : "Show"} Strategy History (
                            {history.length})
                        </span>
                    </button>

                    <AnimatePresence>
                        {showHistory && history.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
                            >
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-white/10">
                                                <th className="text-left p-4 text-gray-500 font-medium">
                                                    Matchup
                                                </th>
                                                <th className="text-left p-4 text-gray-500 font-medium">
                                                    Predicted Winner
                                                </th>
                                                <th className="text-left p-4 text-gray-500 font-medium">
                                                    Method
                                                </th>
                                                <th className="text-left p-4 text-gray-500 font-medium">
                                                    Win %
                                                </th>
                                                <th className="text-left p-4 text-gray-500 font-medium">
                                                    Date
                                                </th>
                                                <th className="p-4" />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {history.map((h) => (
                                                <tr
                                                    key={h._id}
                                                    onClick={() =>
                                                        router.push(
                                                            `/strategy/${h._id}`
                                                        )
                                                    }
                                                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                                                >
                                                    <td className="p-4 text-gray-900">
                                                        {h.fighter1Name} vs{" "}
                                                        {h.fighter2Name}
                                                    </td>
                                                    <td className="p-4 text-green-400 font-medium">
                                                        {h.prediction.winner}
                                                    </td>
                                                    <td className="p-4 text-gray-600">
                                                        {h.prediction.method}
                                                    </td>
                                                    <td className="p-4 text-gray-600 font-mono">
                                                        {h.prediction.winProbability}%
                                                    </td>
                                                    <td className="p-4 text-gray-500">
                                                        {new Date(
                                                            h.createdAt
                                                        ).toLocaleDateString()}
                                                    </td>
                                                    <td className="p-4">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDelete(
                                                                    h._id
                                                                );
                                                            }}
                                                            disabled={
                                                                deletingId ===
                                                                h._id
                                                            }
                                                            className="text-gray-500 hover:text-red-600 transition-colors disabled:opacity-40"
                                                            title="Delete strategy"
                                                        >
                                                            {deletingId ===
                                                            h._id ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        )}

                        {showHistory && history.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center"
                            >
                                <History className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500">
                                    No strategy history yet. Generate your first
                                    game plan above.
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
