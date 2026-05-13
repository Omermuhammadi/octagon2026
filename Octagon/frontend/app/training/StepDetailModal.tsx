"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Play, BookOpen, Dumbbell, CheckCircle2, Circle,
    Trophy, Loader2, Sparkles, Award, ChevronRight,
    Target, Clock, ChevronLeft, RotateCw,
} from "lucide-react";
import { roadmapApi, RoadmapQuizResult, RoadmapPracticeEntry } from "@/lib/api";
import { getQuizFor, Quiz } from "./quizBank";

interface Exercise {
    id: string;
    name: string;
    description: string;
    duration: string;
    videoUrl: string;
}

type Tab = "watch" | "quiz" | "log";

interface Props {
    open: boolean;
    exercise: Exercise | null;
    week: number;
    discipline: string;
    ageGroup: string;
    roadmapId: string;
    token: string | null;
    isCompleted: boolean;
    quizResult?: RoadmapQuizResult | null;
    practiceEntries?: RoadmapPracticeEntry[];
    onClose: () => void;
    onMarkComplete: () => Promise<void>;
    onUnmarkComplete?: () => Promise<void>;
    onQuizSaved: (result: RoadmapQuizResult) => void;
    onPracticeLogged: (entry: RoadmapPracticeEntry) => void;
}

function getYoutubeEmbedUrl(url: string): string {
    const match = url.match(/[?&]v=([^&]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : url;
}

export default function StepDetailModal({
    open, exercise, week, discipline, ageGroup, roadmapId, token,
    isCompleted, quizResult, practiceEntries = [],
    onClose, onMarkComplete, onUnmarkComplete, onQuizSaved, onPracticeLogged,
}: Props) {
    const [tab, setTab] = useState<Tab>("watch");
    const quiz: Quiz = useMemo(() => getQuizFor(discipline, week), [discipline, week]);

    // Quiz state
    const [answers, setAnswers] = useState<(number | null)[]>([]);
    const [submitted, setSubmitted] = useState(false);
    const [submittingQuiz, setSubmittingQuiz] = useState(false);

    // Practice log state
    const [logMinutes, setLogMinutes] = useState<number>(30);
    const [logNotes, setLogNotes] = useState("");
    const [savingLog, setSavingLog] = useState(false);
    const [logSaved, setLogSaved] = useState(false);

    const [markingComplete, setMarkingComplete] = useState(false);

    useEffect(() => {
        if (open && exercise) {
            setTab("watch");
            setAnswers(Array(quiz.questions.length).fill(null));
            setSubmitted(!!quizResult);
            setLogMinutes(30);
            setLogNotes("");
            setLogSaved(false);
            // If a previous attempt exists, prefill answers
            if (quizResult && quizResult.answers && quizResult.answers.length === quiz.questions.length) {
                setAnswers(quizResult.answers.map((n) => (n < 0 ? null : n)));
                setSubmitted(true);
            }
        }
    }, [open, exercise, quiz.questions.length, quizResult]);

    if (!open || !exercise) return null;

    const score = answers.reduce<number>((sum, a, i) => sum + (a === quiz.questions[i].correct ? 1 : 0), 0);
    const allAnswered = answers.every((a) => a !== null);
    const numericAnswers = answers.map((a) => (a == null ? -1 : a));
    const passingScore = Math.ceil(quiz.questions.length * 0.66); // 2/3 to pass
    const passed = submitted && score >= passingScore;

    const handleSubmitQuiz = async () => {
        if (!token || !allAnswered) return;
        setSubmittingQuiz(true);
        try {
            const res = await roadmapApi.submitQuiz(
                {
                    roadmapId,
                    taskId: exercise.id,
                    score,
                    total: quiz.questions.length,
                    answers: numericAnswers,
                    discipline,
                    ageGroup,
                },
                token,
            );
            setSubmitted(true);
            if (res.success) {
                onQuizSaved({
                    taskId: exercise.id,
                    score,
                    total: quiz.questions.length,
                    answers: numericAnswers,
                    passedAt: new Date().toISOString(),
                });
            }
        } catch (e) {
            console.error("Quiz submit failed:", e);
            setSubmitted(true);
        } finally {
            setSubmittingQuiz(false);
        }
    };

    const handleRetake = () => {
        setAnswers(Array(quiz.questions.length).fill(null));
        setSubmitted(false);
    };

    const handleSavePractice = async () => {
        if (!token || logMinutes <= 0) return;
        setSavingLog(true);
        try {
            const res = await roadmapApi.logPractice(
                { roadmapId, taskId: exercise.id, minutes: logMinutes, notes: logNotes, discipline, ageGroup },
                token,
            );
            if (res.success) {
                onPracticeLogged({
                    taskId: exercise.id,
                    minutes: logMinutes,
                    notes: logNotes,
                    loggedAt: new Date().toISOString(),
                });
                setLogSaved(true);
                setTimeout(() => setLogSaved(false), 2000);
                setLogNotes("");
            }
        } catch (e) {
            console.error("Practice log failed:", e);
        } finally {
            setSavingLog(false);
        }
    };

    const handleMarkComplete = async () => {
        setMarkingComplete(true);
        try {
            if (isCompleted && onUnmarkComplete) {
                await onUnmarkComplete();
            } else {
                await onMarkComplete();
            }
        } finally {
            setMarkingComplete(false);
        }
    };

    const minutesForThisStep = practiceEntries.reduce((sum, e) => sum + (e.minutes || 0), 0);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-3xl max-h-[92vh] overflow-hidden bg-white rounded-2xl shadow-2xl flex flex-col"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-gray-900 to-red-900 text-white px-5 py-4 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] uppercase tracking-widest text-red-300 font-bold mb-0.5">
                                Week {week} · {discipline} · {ageGroup}
                            </p>
                            <h2 className="text-lg sm:text-xl font-display font-black truncate">{exercise.name}</h2>
                            <p className="text-gray-300 text-xs mt-0.5 truncate">{exercise.description}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="flex-shrink-0 w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                            aria-label="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => setTab("watch")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                tab === "watch" ? "bg-red-600 text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"
                            }`}
                        >
                            <Play className="w-3 h-3" /> 1. Watch
                        </button>
                        <button
                            onClick={() => setTab("quiz")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                tab === "quiz" ? "bg-red-600 text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"
                            }`}
                        >
                            <BookOpen className="w-3 h-3" /> 2. Concept Check
                            {passed && <CheckCircle2 className="w-3 h-3 text-emerald-300" />}
                        </button>
                        <button
                            onClick={() => setTab("log")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                tab === "log" ? "bg-red-600 text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"
                            }`}
                        >
                            <Dumbbell className="w-3 h-3" /> 3. Log Practice
                            {practiceEntries.length > 0 && (
                                <span className="bg-amber-400 text-amber-950 px-1.5 rounded font-bold text-[10px]">
                                    {practiceEntries.length}
                                </span>
                            )}
                        </button>

                        <div className="ml-auto flex items-center gap-2 text-[10px] text-gray-500 font-semibold">
                            <Clock className="w-3 h-3" />
                            {minutesForThisStep > 0 ? `${minutesForThisStep} min logged` : exercise.duration}
                        </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto">

                        {/* WATCH TAB */}
                        {tab === "watch" && (
                            <div className="p-5">
                                <div className="relative w-full bg-black rounded-xl overflow-hidden" style={{ paddingTop: "56.25%" }}>
                                    <iframe
                                        className="absolute inset-0 w-full h-full"
                                        src={getYoutubeEmbedUrl(exercise.videoUrl)}
                                        title={exercise.name}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                </div>
                                <div className="mt-5 bg-blue-50 border border-blue-200 rounded-xl p-4">
                                    <p className="text-xs font-bold text-blue-900 mb-1.5 flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5" /> Coach's Note
                                    </p>
                                    <p className="text-sm text-blue-900 leading-relaxed">
                                        Watch fully, then test your understanding in the <strong>Concept Check</strong>. Once you've drilled it,
                                        come back and <strong>Log Practice</strong> — your coach can see this in their dashboard.
                                    </p>
                                </div>
                                <div className="mt-3 flex items-center justify-between">
                                    <p className="text-xs text-gray-500">Step {exercise.id}</p>
                                    <button
                                        onClick={() => setTab("quiz")}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-bold transition-colors"
                                    >
                                        Next: Concept Check <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* QUIZ TAB */}
                        {tab === "quiz" && (
                            <div className="p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                                            <BookOpen className="w-4 h-4 text-red-600" /> {quiz.title}
                                        </h3>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {quiz.questions.length} questions · pass with {passingScore} correct
                                        </p>
                                    </div>
                                    {submitted && (
                                        <div className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                                            passed ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                                                   : "bg-amber-50 border border-amber-200 text-amber-700"
                                        }`}>
                                            {score}/{quiz.questions.length} {passed ? "Passed" : "Try again"}
                                        </div>
                                    )}
                                </div>

                                {quiz.questions.map((q, qIdx) => {
                                    const userAnswer = answers[qIdx];
                                    const isCorrect = userAnswer === q.correct;
                                    return (
                                        <div key={qIdx} className={`rounded-xl p-4 border transition-colors ${
                                            submitted
                                                ? isCorrect
                                                    ? "bg-emerald-50 border-emerald-200"
                                                    : "bg-red-50 border-red-200"
                                                : "bg-gray-50 border-gray-200"
                                        }`}>
                                            <p className="text-sm font-bold text-gray-900 mb-3">
                                                <span className="text-gray-400 mr-2">{qIdx + 1}.</span>
                                                {q.question}
                                            </p>
                                            <div className="space-y-2">
                                                {q.choices.map((choice, cIdx) => {
                                                    const selected = userAnswer === cIdx;
                                                    const isThisCorrect = q.correct === cIdx;
                                                    let cls = "bg-white border-gray-200 hover:border-red-300";
                                                    if (submitted) {
                                                        if (isThisCorrect) cls = "bg-emerald-100 border-emerald-300 text-emerald-900 font-semibold";
                                                        else if (selected) cls = "bg-red-100 border-red-300 text-red-800";
                                                        else cls = "bg-white border-gray-200 opacity-60";
                                                    } else if (selected) {
                                                        cls = "bg-red-50 border-red-400 text-red-900 font-semibold";
                                                    }
                                                    return (
                                                        <button
                                                            key={cIdx}
                                                            onClick={() => {
                                                                if (submitted) return;
                                                                setAnswers((prev) => prev.map((a, i) => (i === qIdx ? cIdx : a)));
                                                            }}
                                                            disabled={submitted}
                                                            className={`w-full text-left px-3.5 py-2.5 rounded-lg border-2 text-sm transition-all ${cls}`}
                                                        >
                                                            <span className="inline-flex items-center gap-2">
                                                                {submitted && isThisCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />}
                                                                {submitted && selected && !isThisCorrect && <X className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />}
                                                                {!submitted && (
                                                                    <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                                                                        selected ? "border-red-500 bg-red-500" : "border-gray-300"
                                                                    }`}>
                                                                        {selected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                                    </span>
                                                                )}
                                                                <span>{choice}</span>
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {submitted && (
                                                <div className="mt-3 px-3 py-2 bg-white/60 border border-gray-200 rounded-lg text-xs text-gray-700 flex items-start gap-2">
                                                    <Sparkles className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                                                    <span><strong>Why:</strong> {q.rationale}</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {!submitted ? (
                                    <button
                                        onClick={handleSubmitQuiz}
                                        disabled={!allAnswered || submittingQuiz}
                                        className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                                    >
                                        {submittingQuiz ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
                                        {allAnswered ? "Submit Quiz" : `Answer all ${quiz.questions.length} questions`}
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleRetake}
                                            className="flex-1 py-2.5 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                                        >
                                            <RotateCw className="w-3.5 h-3.5" /> Retake
                                        </button>
                                        <button
                                            onClick={() => setTab("log")}
                                            className="flex-1 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                                        >
                                            Next: Log Practice <ChevronRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* LOG TAB */}
                        {tab === "log" && (
                            <div className="p-5 space-y-4">
                                <div>
                                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5 mb-1">
                                        <Dumbbell className="w-4 h-4 text-red-600" /> Log Your Practice
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        Drilled this on the mat? Log it. Your coach sees the time you've put in — proof of work matters more than streaks.
                                    </p>
                                </div>

                                <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200 rounded-xl p-4 space-y-3">
                                    <div>
                                        <label className="text-xs font-bold text-amber-900 uppercase tracking-wide">Minutes drilled</label>
                                        <div className="flex items-center gap-2 mt-2">
                                            {[15, 30, 45, 60, 90].map((m) => (
                                                <button
                                                    key={m}
                                                    onClick={() => setLogMinutes(m)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                                        logMinutes === m
                                                            ? "bg-red-600 text-white"
                                                            : "bg-white border border-gray-200 text-gray-600 hover:border-red-300"
                                                    }`}
                                                >
                                                    {m}m
                                                </button>
                                            ))}
                                            <input
                                                type="number"
                                                value={logMinutes}
                                                onChange={(e) => setLogMinutes(Math.max(0, Math.min(600, parseInt(e.target.value) || 0)))}
                                                className="w-16 px-2 py-1.5 rounded-lg bg-white border border-gray-200 text-xs text-center font-bold focus:outline-none focus:border-red-400"
                                                min={0} max={600}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-amber-900 uppercase tracking-wide">Notes (optional)</label>
                                        <textarea
                                            value={logNotes}
                                            onChange={(e) => setLogNotes(e.target.value)}
                                            placeholder="What worked? What was hard? Any reps that felt off?"
                                            maxLength={500}
                                            rows={3}
                                            className="mt-2 w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm placeholder-gray-400 focus:outline-none focus:border-red-400 resize-none"
                                        />
                                        <p className="text-[10px] text-amber-700 mt-1 text-right">{logNotes.length}/500</p>
                                    </div>

                                    <button
                                        onClick={handleSavePractice}
                                        disabled={savingLog || logMinutes <= 0}
                                        className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                                    >
                                        {savingLog ? <Loader2 className="w-4 h-4 animate-spin" /> : logSaved ? <CheckCircle2 className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                                        {logSaved ? "Saved" : `Log ${logMinutes} min`}
                                    </button>
                                </div>

                                {/* Past entries */}
                                {practiceEntries.length > 0 && (
                                    <div>
                                        <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Past Sessions</p>
                                        <div className="space-y-2 max-h-44 overflow-y-auto">
                                            {[...practiceEntries].reverse().map((entry, i) => (
                                                <div key={i} className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs font-bold text-gray-900 flex items-center gap-1">
                                                            <Clock className="w-3 h-3 text-gray-400" /> {entry.minutes} min
                                                        </span>
                                                        <span className="text-[10px] text-gray-400">
                                                            {new Date(entry.loggedAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    {entry.notes && (
                                                        <p className="text-xs text-gray-600 italic">"{entry.notes}"</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-50 border-t border-gray-200 px-5 py-3 flex items-center justify-between gap-3">
                        <div className="text-[11px] text-gray-500 flex items-center gap-3 flex-wrap">
                            <span className="flex items-center gap-1">
                                {passed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Circle className="w-3.5 h-3.5 text-gray-300" />}
                                Quiz {passed ? "passed" : submitted ? "below threshold" : "pending"}
                            </span>
                            <span className="flex items-center gap-1">
                                {practiceEntries.length > 0
                                    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                    : <Circle className="w-3.5 h-3.5 text-gray-300" />}
                                Practice logged
                            </span>
                        </div>
                        <button
                            onClick={handleMarkComplete}
                            disabled={markingComplete}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                                isCompleted
                                    ? "bg-emerald-50 border border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            }`}
                        >
                            {markingComplete ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : isCompleted ? <Award className="w-3.5 h-3.5" />
                                : <CheckCircle2 className="w-3.5 h-3.5" />}
                            {isCompleted ? "Completed (click to undo)" : "Mark step complete"}
                        </button>
                    </div>

                    <ChevronLeft className="hidden" />
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
