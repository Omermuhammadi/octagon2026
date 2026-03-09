"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { formCheckApi } from "@/lib/api";
import {
    Upload,
    Play,
    Pause,
    RotateCcw,
    CheckCircle2,
    AlertCircle,
    TrendingUp,
    Target,
    Zap,
    Shield,
    Activity,
    ChevronRight,
    FileVideo,
    X,
    Loader2,
    Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ============================================
// TYPES
// ============================================

type AnalysisStatus = "idle" | "loading-model" | "analyzing" | "complete" | "error";

type BodyPartFeedback = {
    part: string;
    status: "correct" | "needs-work" | "incorrect";
    angle?: number;
    feedback: string;
};

type TechniqueAnalysis = {
    technique: string;
    techniqueName: string;
    overallScore: number;
    result: string;
    breakdown: {
        category: string;
        score: number;
        maxScore: number;
        tips: string[];
    }[];
    bodyParts: BodyPartFeedback[];
    keyMoments: {
        timestamp: string;
        description: string;
        type: "positive" | "negative" | "neutral";
    }[];
    frameCount: number;
    poseDetected: boolean;
};

// ============================================
// HELPER COMPONENTS
// ============================================

const ScoreCircle = ({ score, size = "lg" }: { score: number; size?: "sm" | "lg" }) => {
    const getColor = (s: number) => {
        if (s >= 80) return { stroke: "#22c55e", text: "text-green-500", bg: "bg-green-500/10" };
        if (s >= 60) return { stroke: "#eab308", text: "text-yellow-500", bg: "bg-yellow-500/10" };
        return { stroke: "#ef4444", text: "text-red-500", bg: "bg-red-500/10" };
    };

    const colors = getColor(score);
    const circumference = 2 * Math.PI * 45;
    const strokeDashoffset = circumference - (score / 100) * circumference;
    const dimensions = size === "lg" ? "w-36 h-36" : "w-20 h-20";
    const strokeWidth = size === "lg" ? 6 : 4;
    const fontSize = size === "lg" ? "text-4xl" : "text-lg";

    return (
        <div className={`relative ${dimensions}`}>
            <svg className="w-full h-full -rotate-90">
                <circle
                    cx="50%"
                    cy="50%"
                    r="45%"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth={strokeWidth}
                />
                <motion.circle
                    cx="50%"
                    cy="50%"
                    r="45%"
                    fill="none"
                    stroke={colors.stroke}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                />
            </svg>
            <div className={`absolute inset-0 flex items-center justify-center ${fontSize} font-bold ${colors.text}`}>
                {score}
            </div>
        </div>
    );
};

const ProgressBar = ({ value, max, color }: { value: number; max: number; color: string }) => {
    const percentage = (value / max) * 100;
    return (
        <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
            <motion.div
                className={`h-full rounded-full ${color}`}
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
            />
        </div>
    );
};

const StatusBadge = ({ status }: { status: "correct" | "needs-work" | "incorrect" }) => {
    const config = {
        correct: { bg: "bg-green-500/10", border: "border-green-500/30", text: "text-green-400", icon: CheckCircle2 },
        "needs-work": { bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-400", icon: AlertCircle },
        incorrect: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", icon: X }
    };
    const { bg, border, text, icon: Icon } = config[status];

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${bg} ${border} border ${text}`}>
            <Icon className="w-3 h-3" />
            {status === "needs-work" ? "Needs Work" : status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function FormCheckPage() {
    const { isAuthenticated, isLoading, token } = useAuth();
    const router = useRouter();

    const [status, setStatus] = useState<AnalysisStatus>("idle");
    const [uploadedVideo, setUploadedVideo] = useState<File | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<TechniqueAnalysis | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [selectedTechnique, setSelectedTechnique] = useState("jab-cross");
    const [progress, setProgress] = useState(0);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isLoading, isAuthenticated, router]);

    // Cleanup video URL on unmount
    useEffect(() => {
        return () => {
            if (videoUrl) URL.revokeObjectURL(videoUrl);
        };
    }, [videoUrl]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith("video/")) {
            setUploadedVideo(file);
            const url = URL.createObjectURL(file);
            setVideoUrl(url);
            setStatus("idle");
            setAnalysis(null);
            setErrorMessage(null);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith("video/")) {
            setUploadedVideo(file);
            const url = URL.createObjectURL(file);
            setVideoUrl(url);
            setStatus("idle");
            setAnalysis(null);
            setErrorMessage(null);
        }
    };

    const handleAnalyze = useCallback(async () => {
        if (!videoRef.current || !videoUrl) return;

        setStatus("loading-model");
        setProgress(0);
        setErrorMessage(null);

        try {
            // Dynamically import pose analysis (heavy module)
            const { analyzeVideo, initPoseDetection } = await import("@/lib/poseAnalysis");

            // Initialize MediaPipe model (first time takes longer)
            await initPoseDetection();

            setStatus("analyzing");

            // Ensure video metadata is loaded
            if (videoRef.current.readyState < 1) {
                await new Promise<void>((resolve) => {
                    videoRef.current!.onloadedmetadata = () => resolve();
                    videoRef.current!.load();
                });
            }

            // Run analysis
            const result = await analyzeVideo(
                videoRef.current,
                selectedTechnique,
                (p) => setProgress(p)
            );

            setAnalysis(result as TechniqueAnalysis);
            setStatus("complete");

            // Save to backend
            if (token) {
                try {
                    await formCheckApi.analyze(selectedTechnique, token);
                } catch {
                    // Non-critical: backend save failed, but analysis is complete
                }
            }
        } catch (err: any) {
            console.error("Analysis error:", err);
            setStatus("error");
            setErrorMessage(
                err.message?.includes("GPU")
                    ? "GPU not available. Try using Chrome or Edge for best performance."
                    : "Analysis failed. Please try a different video or check your browser supports WebAssembly."
            );
        }
    }, [videoUrl, selectedTechnique, token]);

    const handleReset = () => {
        if (videoUrl) URL.revokeObjectURL(videoUrl);
        setUploadedVideo(null);
        setVideoUrl(null);
        setAnalysis(null);
        setStatus("idle");
        setIsPlaying(false);
        setProgress(0);
        setErrorMessage(null);
    };

    const togglePlayPause = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const techniques = [
        { id: "jab-cross", name: "Jab-Cross Combo", icon: Zap },
        { id: "hook", name: "Lead Hook", icon: Target },
        { id: "kick", name: "Roundhouse Kick", icon: Activity },
        { id: "defense", name: "Slip & Counter", icon: Shield }
    ];

    if (isLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-red-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-black via-neutral-950 to-black pt-24 pb-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <h1 className="text-4xl md:text-5xl font-display italic text-white mb-4">
                        FORM <span className="text-octagon-red">ANALYSIS</span>
                    </h1>
                    <p className="text-neutral-400 max-w-xl mx-auto text-lg">
                        Upload your training video for AI-powered pose analysis and technique feedback
                    </p>
                </motion.div>

                {/* Technique Selection */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-8"
                >
                    <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-4">
                        Select Technique to Analyze
                    </h2>
                    <div className="flex flex-wrap gap-3">
                        {techniques.map((tech) => (
                            <button
                                key={tech.id}
                                onClick={() => setSelectedTechnique(tech.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all duration-200 ${
                                    selectedTechnique === tech.id
                                        ? "bg-red-500/10 border-red-500/50 text-red-400"
                                        : "bg-white/5 border-white/10 text-neutral-400 hover:bg-white/10 hover:border-white/20"
                                }`}
                            >
                                <tech.icon className="w-4 h-4" />
                                <span className="font-medium">{tech.name}</span>
                            </button>
                        ))}
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

                    {/* Left Panel - Video Upload & Preview */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="lg:col-span-3 space-y-6"
                    >
                        {/* Upload Area */}
                        <div className="bg-neutral-900/50 backdrop-blur-sm rounded-2xl border border-white/5 overflow-hidden">
                            {!videoUrl ? (
                                <div
                                    className="aspect-video flex flex-col items-center justify-center p-8 cursor-pointer"
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
                                        <Upload className="w-10 h-10 text-red-500" />
                                    </div>
                                    <h3 className="text-white font-semibold text-lg mb-2">Upload Training Video</h3>
                                    <p className="text-neutral-500 text-sm mb-4">MP4, MOV, AVI - drag and drop or click to browse</p>
                                    <div className="px-6 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors">
                                        Choose File
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="video/*"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />
                                </div>
                            ) : (
                                <div className="relative">
                                    {/* Video Player */}
                                    <div className="aspect-video bg-black relative group">
                                        <video
                                            ref={videoRef}
                                            src={videoUrl || undefined}
                                            className="w-full h-full object-contain"
                                            onEnded={() => setIsPlaying(false)}
                                            playsInline
                                            crossOrigin="anonymous"
                                        />

                                        {/* Canvas overlay for pose skeleton */}
                                        <canvas
                                            ref={canvasRef}
                                            className="absolute inset-0 w-full h-full pointer-events-none"
                                        />

                                        {/* Play/Pause Overlay */}
                                        <div
                                            onClick={togglePlayPause}
                                            className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                        >
                                                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                                    {isPlaying ? (
                                                        <Pause className="w-8 h-8 text-white" />
                                                    ) : (
                                                        <Play className="w-8 h-8 text-white ml-1" />
                                                    )}
                                                </div>
                                            </div>
                                    </div>

                                    {/* Video Info Bar */}
                                    <div className="p-4 bg-black/40 border-t border-white/5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <FileVideo className="w-5 h-5 text-neutral-500" />
                                                <div>
                                                    <p className="text-white font-medium text-sm truncate max-w-[200px]">
                                                        {uploadedVideo?.name}
                                                    </p>
                                                    <p className="text-neutral-500 text-xs">
                                                        {uploadedVideo && `${(uploadedVideo.size / (1024 * 1024)).toFixed(2)} MB`}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleReset}
                                                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                                                >
                                                    <RotateCcw className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Analyze Button */}
                        {videoUrl && status !== "complete" && (
                            <motion.button
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={handleAnalyze}
                                disabled={status === "loading-model" || status === "analyzing"}
                                className="w-full py-4 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-semibold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-2"
                            >
                                {status === "idle" && (
                                    <div className="flex items-center gap-3">
                                        <Activity className="w-5 h-5" />
                                        <span>Analyze My Form with AI</span>
                                    </div>
                                )}
                                {status === "loading-model" && (
                                    <>
                                        <div className="flex items-center gap-3">
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Loading AI Model...</span>
                                        </div>
                                        <p className="text-sm text-white/60">First load may take a few seconds</p>
                                    </>
                                )}
                                {status === "analyzing" && (
                                    <>
                                        <div className="flex items-center gap-3">
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Analyzing Pose... {progress}%</span>
                                        </div>
                                        <div className="w-full max-w-xs bg-white/20 rounded-full h-2 overflow-hidden">
                                            <div
                                                className="bg-white h-full rounded-full transition-all duration-300"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </>
                                )}
                                {status === "error" && (
                                    <div className="flex items-center gap-3">
                                        <AlertCircle className="w-5 h-5" />
                                        <span>Retry Analysis</span>
                                    </div>
                                )}
                            </motion.button>
                        )}

                        {/* Error Message */}
                        {errorMessage && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                            >
                                {errorMessage}
                            </motion.div>
                        )}

                        {/* Key Moments Timeline */}
                        {analysis && analysis.keyMoments.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-neutral-900/50 backdrop-blur-sm rounded-2xl border border-white/5 p-6"
                            >
                                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-red-500" />
                                    Key Moments
                                </h3>
                                <div className="space-y-3">
                                    {analysis.keyMoments.map((moment, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-start gap-4 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                                        >
                                            <span className="text-sm font-mono text-neutral-500 min-w-[40px]">
                                                {moment.timestamp}
                                            </span>
                                            <div className="flex-1">
                                                <p className="text-white text-sm">{moment.description}</p>
                                            </div>
                                            <div className={`w-2 h-2 rounded-full mt-1.5 ${
                                                moment.type === "positive" ? "bg-green-500" :
                                                moment.type === "negative" ? "bg-red-500" : "bg-yellow-500"
                                            }`} />
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* Pose Detection Info */}
                        {analysis && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-neutral-400"
                            >
                                {analysis.poseDetected ? (
                                    <p>Analyzed {analysis.frameCount} frames using MediaPipe Pose Landmarker (33 body points per frame)</p>
                                ) : (
                                    <p>Pose detection could not find a clear body pose. Try recording with better lighting and ensure your full body is visible.</p>
                                )}
                            </motion.div>
                        )}
                    </motion.div>

                    {/* Right Panel - Analysis Results */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="lg:col-span-2 space-y-6"
                    >
                        {/* Overall Score Card */}
                        <div className="bg-neutral-900/50 backdrop-blur-sm rounded-2xl border border-white/5 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-white">Performance Score</h3>
                                    <p className="text-neutral-500 text-sm">
                                        {analysis ? analysis.result : "Overall technique rating"}
                                    </p>
                                </div>
                                {analysis && (
                                    <div className={`flex items-center gap-1 text-sm ${
                                        analysis.overallScore >= 60 ? "text-green-500" : "text-yellow-500"
                                    }`}>
                                        {analysis.overallScore >= 60 ? (
                                            <CheckCircle2 className="w-4 h-4" />
                                        ) : (
                                            <AlertCircle className="w-4 h-4" />
                                        )}
                                        <span>{analysis.result}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col items-center">
                                <AnimatePresence mode="wait">
                                    {analysis ? (
                                        <motion.div
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            className="flex flex-col items-center"
                                        >
                                            <ScoreCircle score={analysis.overallScore} />
                                            <p className="text-neutral-400 mt-4 text-sm">
                                                {analysis.overallScore >= 80 ? "Excellent Form!" :
                                                 analysis.overallScore >= 60 ? "Good - Keep Practicing" : "Needs Improvement"}
                                            </p>
                                        </motion.div>
                                    ) : (
                                        <div className="flex flex-col items-center py-4">
                                            <div className="w-36 h-36 rounded-full border-4 border-dashed border-white/10 flex items-center justify-center">
                                                <span className="text-neutral-600 text-5xl font-bold">?</span>
                                            </div>
                                            <p className="text-neutral-500 mt-4 text-sm">Upload video to see score</p>
                                        </div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Category Breakdown */}
                        <div className="bg-neutral-900/50 backdrop-blur-sm rounded-2xl border border-white/5 p-6">
                            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                                <Target className="w-5 h-5 text-red-500" />
                                Score Breakdown
                            </h3>

                            <AnimatePresence mode="wait">
                                {analysis ? (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="space-y-5"
                                    >
                                        {analysis.breakdown.map((item, idx) => (
                                            <div key={idx}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-white text-sm font-medium">{item.category}</span>
                                                    <span className={`text-sm font-bold ${
                                                        item.score >= 80 ? "text-green-500" :
                                                        item.score >= 60 ? "text-yellow-500" : "text-red-500"
                                                    }`}>
                                                        {item.score}%
                                                    </span>
                                                </div>
                                                <ProgressBar
                                                    value={item.score}
                                                    max={item.maxScore}
                                                    color={
                                                        item.score >= 80 ? "bg-green-500" :
                                                        item.score >= 60 ? "bg-yellow-500" : "bg-red-500"
                                                    }
                                                />
                                            </div>
                                        ))}
                                    </motion.div>
                                ) : (
                                    <div className="space-y-5">
                                        {[1, 2, 3, 4].map((i) => (
                                            <div key={i}>
                                                <div className="flex justify-between mb-2">
                                                    <div className="h-4 w-24 bg-white/5 rounded animate-pulse" />
                                                    <div className="h-4 w-10 bg-white/5 rounded animate-pulse" />
                                                </div>
                                                <div className="h-2 bg-white/5 rounded-full" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Body Part Analysis */}
                        <div className="bg-neutral-900/50 backdrop-blur-sm rounded-2xl border border-white/5 p-6">
                            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-red-500" />
                                Body Position Feedback
                            </h3>

                            <AnimatePresence mode="wait">
                                {analysis ? (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="space-y-3"
                                    >
                                        {analysis.bodyParts.map((bp, idx) => (
                                            <div
                                                key={idx}
                                                className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-white font-medium text-sm">{bp.part}</span>
                                                    <StatusBadge status={bp.status} />
                                                </div>
                                                <p className="text-neutral-400 text-xs">{bp.feedback}</p>
                                                {bp.angle !== undefined && (
                                                    <p className="text-neutral-500 text-xs mt-1">Measured angle: {bp.angle}°</p>
                                                )}
                                            </div>
                                        ))}
                                    </motion.div>
                                ) : (
                                    <div className="text-center py-8">
                                        <Info className="w-10 h-10 text-neutral-700 mx-auto mb-3" />
                                        <p className="text-neutral-500 text-sm">
                                            Body analysis will appear here after video upload
                                        </p>
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Tips Section */}
                        {analysis && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-gradient-to-br from-red-500/10 to-transparent rounded-2xl border border-red-500/20 p-6"
                            >
                                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-red-500" />
                                    AI Recommendations
                                </h3>
                                <ul className="space-y-3">
                                    {analysis.breakdown.flatMap(b => b.tips.slice(0, 1)).map((tip, idx) => (
                                        <li key={idx} className="flex items-start gap-3 text-sm">
                                            <ChevronRight className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                            <span className="text-neutral-300">{tip}</span>
                                        </li>
                                    ))}
                                </ul>
                            </motion.div>
                        )}
                    </motion.div>
                </div>

                {/* Bottom Info Banner */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-12 p-6 rounded-2xl bg-gradient-to-r from-neutral-900 to-neutral-800 border border-white/5 flex items-center justify-between flex-wrap gap-4"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                            <Info className="w-6 h-6 text-red-500" />
                        </div>
                        <div>
                            <h4 className="text-white font-semibold">MediaPipe Pose Analysis</h4>
                            <p className="text-neutral-400 text-sm">
                                Real-time pose estimation running locally in your browser - your video never leaves your device
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-white">33</p>
                            <p className="text-neutral-500">Body Points</p>
                        </div>
                        <div className="w-px h-10 bg-white/10" />
                        <div className="text-center">
                            <p className="text-2xl font-bold text-white">2fps</p>
                            <p className="text-neutral-500">Sample Rate</p>
                        </div>
                        <div className="w-px h-10 bg-white/10" />
                        <div className="text-center">
                            <p className="text-2xl font-bold text-white">4</p>
                            <p className="text-neutral-500">Techniques</p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
