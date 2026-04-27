"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
    assignmentApi, relationshipApi,
    Assignment, AssignmentStatus, AssignmentType, AssignmentStats,
    TraineeSummary,
} from "@/lib/api";
import {
    Loader2, Plus, X, Send, CheckCircle2, AlertCircle, Clock,
    Dumbbell, Video, Scale, BookOpen, Swords, Star,
    Calendar, Eye, Trash2, MessageSquare, ArrowLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const TYPE_META: Record<AssignmentType, { label: string; icon: any; color: string; bg: string }> = {
    training: { label: "Training", icon: Dumbbell, color: "text-red-700", bg: "bg-red-50" },
    video:    { label: "Video Drill", icon: Video, color: "text-purple-700", bg: "bg-purple-50" },
    weight:   { label: "Weight Check", icon: Scale, color: "text-amber-700", bg: "bg-amber-50" },
    reading:  { label: "Reading", icon: BookOpen, color: "text-blue-700", bg: "bg-blue-50" },
    sparring: { label: "Sparring", icon: Swords, color: "text-orange-700", bg: "bg-orange-50" },
    custom:   { label: "Custom", icon: Star, color: "text-emerald-700", bg: "bg-emerald-50" },
};

const STATUS_META: Record<AssignmentStatus, { label: string; color: string; ring: string }> = {
    assigned:  { label: "Assigned",  color: "bg-blue-50 text-blue-700",       ring: "ring-blue-200" },
    submitted: { label: "Submitted", color: "bg-purple-50 text-purple-700",   ring: "ring-purple-200" },
    completed: { label: "Completed", color: "bg-emerald-50 text-emerald-700", ring: "ring-emerald-200" },
    overdue:   { label: "Overdue",   color: "bg-amber-50 text-amber-800",     ring: "ring-amber-300" },
};

function formatDueDate(iso: string): { text: string; urgent: boolean } {
    const due = new Date(iso);
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffHours / 24);

    if (diffMs < 0) {
        const overdueDays = Math.abs(diffDays);
        return { text: overdueDays === 0 ? "Overdue today" : `${overdueDays}d overdue`, urgent: true };
    }
    if (diffHours <= 24) return { text: `Due in ${diffHours}h`, urgent: true };
    if (diffDays === 1) return { text: "Due tomorrow", urgent: true };
    if (diffDays <= 7) return { text: `Due in ${diffDays}d`, urgent: false };
    return { text: due.toLocaleDateString("en-US", { month: "short", day: "numeric" }), urgent: false };
}

export default function AssignmentsPage() {
    const router = useRouter();
    const { user, token, isAuthenticated, isLoading: authLoading } = useAuth();

    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [stats, setStats] = useState<AssignmentStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<AssignmentStatus | "all">("all");
    const [createOpen, setCreateOpen] = useState(false);
    const [trainees, setTrainees] = useState<TraineeSummary[]>([]);
    const [selected, setSelected] = useState<Assignment | null>(null);

    const isCoach = user?.role === "coach";
    const isTrainee = user?.role === "fighter" || user?.role === "beginner";

    const loadData = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const [aRes, sRes] = await Promise.all([
                assignmentApi.list(token, statusFilter === "all" ? undefined : { status: statusFilter }),
                assignmentApi.stats(token),
            ]);
            if (aRes.success && aRes.data) setAssignments(aRes.data);
            if (sRes.success && sRes.data) setStats(sRes.data);
        } finally {
            setLoading(false);
        }
    }, [token, statusFilter]);

    const loadTrainees = useCallback(async () => {
        if (!token || !isCoach) return;
        const res = await relationshipApi.myTrainees(token);
        if (res.success && res.data) setTrainees(res.data);
    }, [token, isCoach]);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) router.push("/login");
        if (user?.role === "fan") router.push("/dashboard/fan");
    }, [authLoading, isAuthenticated, user, router]);

    useEffect(() => {
        if (token) {
            loadData();
            loadTrainees();
        }
    }, [token, loadData, loadTrainees]);

    const grouped = useMemo(() => {
        const groups: Record<AssignmentStatus, Assignment[]> = {
            overdue: [], assigned: [], submitted: [], completed: [],
        };
        for (const a of assignments) groups[a.status].push(a);
        return groups;
    }, [assignments]);

    const orderedStatuses: AssignmentStatus[] = ["overdue", "assigned", "submitted", "completed"];

    if (authLoading || !user) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-red-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero */}
            <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-red-900 text-white">
                <div className="max-w-6xl mx-auto px-6 py-10">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <p className="text-red-300 text-xs uppercase tracking-widest font-semibold mb-2">
                                {isCoach ? "Coach Console" : "Your Training Tasks"}
                            </p>
                            <h1 className="text-3xl md:text-4xl font-bold font-heading">Assignments</h1>
                            <p className="text-white/60 mt-2 text-sm max-w-xl">
                                {isCoach
                                    ? "Assign drills, check submissions, give feedback. Every action is tracked."
                                    : "Tasks from your coach. Submit work, get feedback, level up."}
                            </p>
                        </div>
                        {isCoach && (
                            <button
                                onClick={() => setCreateOpen(true)}
                                disabled={trainees.length === 0}
                                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-5 py-3 rounded-lg font-semibold flex items-center gap-2 text-sm shadow-lg"
                            >
                                <Plus className="w-4 h-4" /> New Assignment
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-8">
                {/* Stats row */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                        <StatTile label="Total" value={stats.total} color="text-gray-900" />
                        <StatTile label="Overdue" value={stats.overdue} color="text-amber-700" />
                        <StatTile label="Active" value={stats.assigned} color="text-blue-700" />
                        <StatTile label="To Review" value={stats.submitted} color="text-purple-700" />
                        <StatTile label="Done" value={stats.completed} color="text-emerald-700" />
                    </div>
                )}

                {isCoach && trainees.length === 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-amber-900 font-semibold text-sm">No active trainees yet</p>
                                <p className="text-amber-800 text-sm mt-1">
                                    Connect with a fighter or beginner first to start assigning work.{" "}
                                    <button
                                        onClick={() => router.push("/connections")}
                                        className="underline font-semibold"
                                    >
                                        Manage connections →
                                    </button>
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Filter chips */}
                <div className="flex gap-2 mb-5 flex-wrap">
                    {(["all", "overdue", "assigned", "submitted", "completed"] as const).map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                                statusFilter === s
                                    ? "bg-gray-900 text-white border-gray-900"
                                    : "bg-white text-gray-700 border-gray-300 hover:border-gray-500"
                            }`}
                        >
                            {s === "all" ? "All" : STATUS_META[s].label}
                        </button>
                    ))}
                </div>

                {/* List */}
                {loading ? (
                    <div className="py-20 flex justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                    </div>
                ) : assignments.length === 0 ? (
                    <EmptyState isCoach={isCoach} />
                ) : (
                    <div className="space-y-6">
                        {(statusFilter === "all" ? orderedStatuses : [statusFilter]).map((status) => {
                            const list = statusFilter === "all" ? grouped[status] : assignments;
                            if (list.length === 0) return null;
                            return (
                                <div key={status}>
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                                        {STATUS_META[status].label} ({list.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {list.map((a) => (
                                            <AssignmentRow
                                                key={a._id}
                                                assignment={a}
                                                isCoach={isCoach}
                                                onClick={() => setSelected(a)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Create modal */}
            <AnimatePresence>
                {createOpen && (
                    <CreateAssignmentModal
                        trainees={trainees}
                        onClose={() => setCreateOpen(false)}
                        onCreated={() => { setCreateOpen(false); loadData(); }}
                        token={token!}
                    />
                )}
            </AnimatePresence>

            {/* Detail modal */}
            <AnimatePresence>
                {selected && (
                    <AssignmentDetailModal
                        assignment={selected}
                        isCoach={isCoach}
                        onClose={() => setSelected(null)}
                        onUpdated={(updated) => {
                            setAssignments((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
                            setSelected(updated);
                            // refresh stats
                            if (token) assignmentApi.stats(token).then(r => r.success && r.data && setStats(r.data));
                        }}
                        onDeleted={(id) => {
                            setAssignments((prev) => prev.filter((p) => p._id !== id));
                            setSelected(null);
                            if (token) assignmentApi.stats(token).then(r => r.success && r.data && setStats(r.data));
                        }}
                        token={token!}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// ===========================================================================
// Sub-components
// ===========================================================================

function StatTile({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color} font-heading`}>{value}</p>
        </div>
    );
}

function EmptyState({ isCoach }: { isCoach: boolean }) {
    return (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-700 font-semibold">
                {isCoach ? "No assignments created yet." : "Nothing assigned yet."}
            </p>
            <p className="text-gray-500 text-sm mt-1">
                {isCoach
                    ? "Hit 'New Assignment' once you've connected with a trainee."
                    : "When your coach assigns a task, it'll show up here."}
            </p>
        </div>
    );
}

function AssignmentRow({
    assignment, isCoach, onClick,
}: {
    assignment: Assignment;
    isCoach: boolean;
    onClick: () => void;
}) {
    const t = TYPE_META[assignment.type];
    const Icon = t.icon;
    const due = formatDueDate(assignment.dueDate);
    const status = STATUS_META[assignment.status];
    const otherUser = isCoach ? assignment.traineeId : assignment.coachId;

    return (
        <button
            onClick={onClick}
            className="w-full bg-white border border-gray-200 hover:border-gray-400 rounded-xl px-5 py-4 flex items-center gap-4 transition-all text-left group"
        >
            <div className={`w-11 h-11 rounded-lg ${t.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${t.color}`} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-gray-900 truncate">{assignment.title}</h4>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${status.color}`}>
                        {status.label}
                    </span>
                </div>
                <p className="text-sm text-gray-500 truncate mt-0.5">
                    {isCoach ? `For ${otherUser?.name}` : `From ${otherUser?.name}`} · {t.label}
                </p>
            </div>
            <div className="text-right flex-shrink-0">
                <div className={`text-xs font-semibold flex items-center gap-1 justify-end ${
                    due.urgent && assignment.status !== "completed" ? "text-amber-700" : "text-gray-500"
                }`}>
                    <Clock className="w-3 h-3" />
                    {due.text}
                </div>
                {assignment.feedback?.rating && (
                    <div className="flex items-center gap-0.5 justify-end mt-1">
                        {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-3 h-3 ${i < assignment.feedback!.rating! ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
                        ))}
                    </div>
                )}
            </div>
        </button>
    );
}

// -------- Create Assignment Modal --------

function CreateAssignmentModal({
    trainees, onClose, onCreated, token,
}: {
    trainees: TraineeSummary[];
    onClose: () => void;
    onCreated: () => void;
    token: string;
}) {
    const [traineeId, setTraineeId] = useState(trainees[0]?._id || "");
    const [type, setType] = useState<AssignmentType>("training");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [dueDate, setDueDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d.toISOString().slice(0, 10);
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!traineeId || !title.trim() || !description.trim()) {
            setError("All fields are required");
            return;
        }
        setSubmitting(true);
        setError("");
        try {
            const res = await assignmentApi.create({
                traineeId,
                type,
                title: title.trim(),
                description: description.trim(),
                dueDate: new Date(dueDate).toISOString(),
            }, token);
            if (res.success) onCreated();
            else setError(res.message || "Failed to create");
        } catch (err: any) {
            setError(err?.message || "Failed to create");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ModalShell onClose={onClose} title="New Assignment">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Field label="Trainee">
                    <select
                        value={traineeId}
                        onChange={(e) => setTraineeId(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-400"
                    >
                        {trainees.map((t) => (
                            <option key={t._id} value={t._id}>
                                {t.name} ({t.role}{t.discipline ? ` · ${t.discipline}` : ""})
                            </option>
                        ))}
                    </select>
                </Field>

                <Field label="Type">
                    <div className="grid grid-cols-3 gap-2">
                        {(Object.keys(TYPE_META) as AssignmentType[]).map((t) => {
                            const meta = TYPE_META[t];
                            const Icon = meta.icon;
                            return (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setType(t)}
                                    className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 ${
                                        type === t
                                            ? "border-red-400 bg-red-50 text-red-700"
                                            : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"
                                    }`}
                                >
                                    <Icon className="w-3.5 h-3.5" /> {meta.label}
                                </button>
                            );
                        })}
                    </div>
                </Field>

                <Field label="Title">
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Heavy bag — 5 rounds, 3 min each"
                        maxLength={120}
                        className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-400"
                    />
                </Field>

                <Field label="Instructions / Details">
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        maxLength={2000}
                        placeholder="What you want them to do, how to deliver, any safety notes…"
                        className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-400 resize-none"
                    />
                </Field>

                <Field label="Due Date">
                    <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        min={new Date().toISOString().slice(0, 10)}
                        className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-400"
                    />
                </Field>

                {error && <p className="text-red-600 text-xs">{error}</p>}

                <div className="flex gap-2 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-semibold"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2"
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Create Assignment
                    </button>
                </div>
            </form>
        </ModalShell>
    );
}

// -------- Assignment Detail Modal --------

function AssignmentDetailModal({
    assignment, isCoach, onClose, onUpdated, onDeleted, token,
}: {
    assignment: Assignment;
    isCoach: boolean;
    onClose: () => void;
    onUpdated: (a: Assignment) => void;
    onDeleted: (id: string) => void;
    token: string;
}) {
    const t = TYPE_META[assignment.type];
    const Icon = t.icon;
    const status = STATUS_META[assignment.status];
    const due = formatDueDate(assignment.dueDate);
    const otherUser = isCoach ? assignment.traineeId : assignment.coachId;

    // Trainee submission state
    const [subText, setSubText] = useState(assignment.submission?.text || "");
    const [subVideo, setSubVideo] = useState(assignment.submission?.videoUrl || "");
    const [subWeight, setSubWeight] = useState(assignment.submission?.weightKg?.toString() || "");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    // Coach review state
    const [feedback, setFeedback] = useState(assignment.feedback?.text || "");
    const [rating, setRating] = useState(assignment.feedback?.rating || 0);
    const [reviewing, setReviewing] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const canTraineeSubmit = !isCoach && assignment.status !== "completed";
    const canCoachReview = isCoach && (assignment.status === "submitted" || assignment.status === "completed");
    const showWeightField = assignment.type === "weight";
    const showVideoField = assignment.type === "video" || assignment.type === "sparring";

    const handleSubmit = async () => {
        if (!subText && !subVideo && !subWeight) {
            setError("Provide at least one of: notes, video URL, weight");
            return;
        }
        setSubmitting(true);
        setError("");
        try {
            const body: any = {};
            if (subText.trim()) body.text = subText.trim();
            if (subVideo.trim()) body.videoUrl = subVideo.trim();
            if (subWeight.trim()) body.weightKg = parseFloat(subWeight);
            const res = await assignmentApi.submit(assignment._id, body, token);
            if (res.success && res.data) onUpdated(res.data);
            else setError(res.message || "Failed");
        } catch (err: any) {
            setError(err?.message || "Failed");
        } finally {
            setSubmitting(false);
        }
    };

    const handleReview = async (markComplete: boolean) => {
        if (!feedback.trim()) {
            setError("Feedback text required");
            return;
        }
        setReviewing(true);
        setError("");
        try {
            const res = await assignmentApi.review(assignment._id, {
                text: feedback.trim(),
                rating: rating || undefined,
                markComplete,
            }, token);
            if (res.success && res.data) onUpdated(res.data);
            else setError(res.message || "Failed");
        } catch (err: any) {
            setError(err?.message || "Failed");
        } finally {
            setReviewing(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Delete this assignment?")) return;
        setDeleting(true);
        try {
            const res = await assignmentApi.delete(assignment._id, token);
            if (res.success) onDeleted(assignment._id);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <ModalShell onClose={onClose}>
            <div className="space-y-5">
                {/* Header */}
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className={`w-9 h-9 rounded-lg ${t.bg} flex items-center justify-center`}>
                            <Icon className={`w-4 h-4 ${t.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 uppercase tracking-wider">{t.label}</p>
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${status.color}`}>
                            {status.label}
                        </span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 font-heading">{assignment.title}</h2>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1.5">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {due.text}</span>
                        <span>·</span>
                        <span>{isCoach ? `For ${otherUser?.name}` : `From ${otherUser?.name}`}</span>
                    </div>
                </div>

                {/* Description */}
                <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{assignment.description}</p>
                </div>

                {/* Submission display */}
                {assignment.submission && (
                    <div className="border border-purple-200 bg-purple-50/50 rounded-lg p-4">
                        <p className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Submission
                        </p>
                        {assignment.submission.text && (
                            <p className="text-sm text-gray-800 whitespace-pre-wrap mb-2">{assignment.submission.text}</p>
                        )}
                        {assignment.submission.weightKg !== undefined && (
                            <p className="text-sm"><span className="font-semibold">Weight:</span> {assignment.submission.weightKg} kg</p>
                        )}
                        {assignment.submission.videoUrl && (
                            <a
                                href={assignment.submission.videoUrl}
                                target="_blank" rel="noopener noreferrer"
                                className="text-sm text-purple-700 hover:underline inline-flex items-center gap-1"
                            >
                                <Video className="w-3 h-3" /> View video
                            </a>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                            Submitted {new Date(assignment.submission.submittedAt).toLocaleString()}
                        </p>
                    </div>
                )}

                {/* Feedback display */}
                {assignment.feedback && (
                    <div className="border border-emerald-200 bg-emerald-50/50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" /> Coach Feedback
                            </p>
                            {assignment.feedback.rating && (
                                <div className="flex items-center gap-0.5">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className={`w-3.5 h-3.5 ${i < assignment.feedback!.rating! ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
                                    ))}
                                </div>
                            )}
                        </div>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{assignment.feedback.text}</p>
                        <p className="text-xs text-gray-500 mt-2">
                            Reviewed {new Date(assignment.feedback.reviewedAt).toLocaleString()}
                        </p>
                    </div>
                )}

                {/* Trainee submit form */}
                {canTraineeSubmit && (
                    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                        <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                            {assignment.submission ? "Update submission" : "Submit your work"}
                        </p>
                        <textarea
                            value={subText}
                            onChange={(e) => setSubText(e.target.value)}
                            rows={3}
                            placeholder="Notes about what you did, how it felt, any questions…"
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-400 resize-none"
                        />
                        {showVideoField && (
                            <input
                                type="url"
                                value={subVideo}
                                onChange={(e) => setSubVideo(e.target.value)}
                                placeholder="Video URL (YouTube, Drive, etc.)"
                                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-400"
                            />
                        )}
                        {showWeightField && (
                            <input
                                type="number"
                                step="0.1"
                                min="30" max="300"
                                value={subWeight}
                                onChange={(e) => setSubWeight(e.target.value)}
                                placeholder="Weight in kg"
                                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-400"
                            />
                        )}
                        {error && <p className="text-red-600 text-xs">{error}</p>}
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
                        >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {assignment.submission ? "Update Submission" : "Submit"}
                        </button>
                    </div>
                )}

                {/* Coach review form */}
                {canCoachReview && (
                    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                        <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                            {assignment.feedback ? "Update feedback" : "Review & Feedback"}
                        </p>
                        <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            rows={3}
                            placeholder="Specific feedback. What went well, what to improve…"
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-400 resize-none"
                        />
                        <div>
                            <p className="text-xs text-gray-600 mb-1.5">Rating (optional)</p>
                            <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((r) => (
                                    <button key={r} type="button" onClick={() => setRating(r === rating ? 0 : r)}>
                                        <Star className={`w-6 h-6 ${r <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
                                    </button>
                                ))}
                            </div>
                        </div>
                        {error && <p className="text-red-600 text-xs">{error}</p>}
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleReview(false)}
                                disabled={reviewing}
                                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-semibold disabled:opacity-50"
                            >
                                Save Feedback
                            </button>
                            <button
                                onClick={() => handleReview(true)}
                                disabled={reviewing}
                                className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2"
                            >
                                {reviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                Mark Complete
                            </button>
                        </div>
                    </div>
                )}

                {/* Coach delete */}
                {isCoach && assignment.status !== "completed" && (
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="w-full text-red-600 hover:text-red-700 text-xs font-semibold flex items-center justify-center gap-1 py-2"
                    >
                        <Trash2 className="w-3 h-3" /> Delete assignment
                    </button>
                )}
            </div>
        </ModalShell>
    );
}

// -------- Reusable bits --------

function ModalShell({
    children, onClose, title,
}: {
    children: React.ReactNode;
    onClose: () => void;
    title?: string;
}) {
    return (
        <>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 20 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto pointer-events-auto">
                    <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                        <h2 className="font-bold text-gray-900 font-heading">{title || "Details"}</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-6">{children}</div>
                </div>
            </motion.div>
        </>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 block">{label}</label>
            {children}
        </div>
    );
}
