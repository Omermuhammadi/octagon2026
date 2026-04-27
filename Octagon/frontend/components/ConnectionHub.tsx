"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
    relationshipApi, assignmentApi, activityApi, messageApi,
    Relationship, Assignment, ActivityItem,
    AssignmentStats, ConversationSummary, ApiError,
} from "@/lib/api";
import {
    Loader2, ChevronRight, UserPlus, Users, Bell,
    ClipboardList, MessageSquare, RefreshCw,
    Dumbbell, Video, Scale, BookOpen, Swords, Star, X, Check,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const TYPE_ICON: Record<string, LucideIcon> = {
    training: Dumbbell, video: Video, weight: Scale,
    reading: BookOpen, sparring: Swords, custom: Star,
};

const STATUS_COLOR: Record<string, string> = {
    assigned:  "bg-blue-50 text-blue-700",
    submitted: "bg-purple-50 text-purple-700",
    completed: "bg-emerald-50 text-emerald-700",
    overdue:   "bg-amber-50 text-amber-800",
};

interface Props {
    /** "compact" hides activity feed, useful for narrow grid slots */
    variant?: "default" | "compact";
}

export function ConnectionHub({ variant = "default" }: Props) {
    const { user, token } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [respondingId, setRespondingId] = useState<string | null>(null);
    const [relationships, setRelationships] = useState<Relationship[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [stats, setStats] = useState<AssignmentStats | null>(null);
    const [activity, setActivity] = useState<ActivityItem[]>([]);
    const [conversations, setConversations] = useState<ConversationSummary[]>([]);

    const isCoach = user?.role === "coach";
    const meId = user?.id || "";

    const getErrorMessage = (err: unknown, fallback: string) => {
        if (err instanceof ApiError) return err.message;
        if (err instanceof Error) return err.message;
        return fallback;
    };

    const load = useCallback(async (opts?: { silent?: boolean }) => {
        if (!token) return;
        if (opts?.silent) setRefreshing(true);
        else setLoading(true);
        setError(null);
        try {
            const [relRes, asnRes, statsRes, actRes, convRes] = await Promise.all([
                relationshipApi.list(token),
                assignmentApi.list(token),
                assignmentApi.stats(token),
                activityApi.list(token, 8),
                messageApi.conversations(token),
            ]);
            if (relRes.success && relRes.data) setRelationships(relRes.data);
            if (asnRes.success && asnRes.data) setAssignments(asnRes.data);
            if (statsRes.success && statsRes.data) setStats(statsRes.data);
            if (actRes.success && actRes.data) setActivity(actRes.data);
            if (convRes.success && convRes.data) setConversations(convRes.data);
        } catch (err) {
            setError(getErrorMessage(err, "Failed to load connection data. Please retry."));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token]);

    useEffect(() => { load(); }, [load]);

    if (!user || user.role === "fan") return null;

    const incoming = relationships.filter(
        (r) =>
            r.status === "pending" &&
            ((r.requestedBy === "coach" && r.traineeId._id === meId) ||
             (r.requestedBy === "trainee" && r.coachId._id === meId))
    );
    const active = relationships.filter((r) => r.status === "active");
    const myCoach = !isCoach && active.length > 0 ? active[0].coachId : null;
    const totalUnread = conversations.reduce((s, c) => s + (c.unread || 0), 0);

    const upcomingAssignments = assignments
        .filter((a) => a.status === "assigned" || a.status === "overdue" || a.status === "submitted")
        .slice(0, 3);

    const handleRespond = async (id: string, action: "accept" | "decline") => {
        if (!token) return;
        setRespondingId(id);
        setError(null);
        try {
            const res = await relationshipApi.respond(id, action, token);
            if (!res.success) {
                throw new Error(res.message || "Unable to update request");
            }
            await load({ silent: true });
        } catch (err) {
            setError(getErrorMessage(err, "Unable to update request. Please try again."));
        } finally {
            setRespondingId(null);
        }
    };

    if (loading) {
        return (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 flex items-center justify-center min-h-[200px]">
                <Loader2 className="w-6 h-6 animate-spin text-red-500" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                    <p className="text-xs text-red-700 font-medium">{error}</p>
                    <button
                        onClick={() => load({ silent: true })}
                        className="text-xs font-semibold text-red-700 hover:text-red-800 inline-flex items-center gap-1"
                    >
                        <RefreshCw className="w-3 h-3" /> Retry
                    </button>
                </div>
            )}

            {/* Header strip */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-base font-bold text-gray-900 font-heading">
                            {isCoach ? "Your Roster" : "Your Coach"}
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {isCoach ? `${active.length} active · ${incoming.length} pending` : myCoach ? "Connected" : "Not connected yet"}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => load({ silent: true })}
                            className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700"
                            title="Refresh"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                        </button>
                        <Link
                            href="/messages"
                            className="relative p-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700"
                            title="Messages"
                        >
                            <MessageSquare className="w-4 h-4" />
                            {totalUnread > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                    {totalUnread > 9 ? "9+" : totalUnread}
                                </span>
                            )}
                        </Link>
                        <Link
                            href="/connections"
                            className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700"
                            title="Manage connections"
                        >
                            <UserPlus className="w-4 h-4" />
                        </Link>
                    </div>
                </div>

                {/* Coach view — show roster summary or empty state */}
                {isCoach ? (
                    active.length === 0 ? (
                        <div className="text-center py-4">
                            <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-700 font-semibold">No trainees yet</p>
                            <Link
                                href="/connections"
                                className="text-xs text-red-600 font-semibold hover:underline mt-1 inline-block"
                            >
                                Invite your first trainee →
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2">
                            {active.slice(0, 4).map((r) => (
                                <Link
                                    key={r._id}
                                    href={`/messages?with=${r.traineeId._id}`}
                                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <div className="w-8 h-8 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center text-xs font-bold text-gray-700 flex-shrink-0">
                                        {r.traineeId.name[0]?.toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-gray-900 truncate">{r.traineeId.name}</p>
                                        <p className="text-[10px] text-gray-500 truncate">{r.traineeRole}</p>
                                    </div>
                                </Link>
                            ))}
                            {active.length > 4 && (
                                <Link
                                    href="/connections"
                                    className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs font-semibold text-gray-600"
                                >
                                    +{active.length - 4} more
                                </Link>
                            )}
                        </div>
                    )
                ) : myCoach ? (
                    <Link
                        href={`/messages?with=${myCoach._id}`}
                        className="flex items-center gap-3 p-3 bg-gradient-to-br from-red-50 to-orange-50 border border-red-100 rounded-xl hover:border-red-300 transition-colors"
                    >
                        <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                            {myCoach.name[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 truncate">{myCoach.name}</p>
                            <p className="text-xs text-gray-600 truncate">
                                Coach{myCoach.discipline && ` · ${myCoach.discipline}`}
                            </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                    </Link>
                ) : (
                    <div className="text-center py-4">
                        <UserPlus className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-700 font-semibold">Find a coach</p>
                        <Link
                            href="/connections"
                            className="text-xs text-red-600 font-semibold hover:underline mt-1 inline-block"
                        >
                            Send a connection request →
                        </Link>
                    </div>
                )}

                {/* Pending incoming */}
                {incoming.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                        <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest flex items-center gap-1">
                            <Bell className="w-3 h-3" /> Pending Requests
                        </p>
                        {incoming.slice(0, 2).map((r) => {
                            const other = r.coachId._id === meId ? r.traineeId : r.coachId;
                            return (
                                <div key={r._id} className="flex items-center gap-2 bg-amber-50/50 border border-amber-100 rounded-lg p-2">
                                    <div className="w-7 h-7 bg-amber-200 rounded-full flex items-center justify-center text-xs font-bold text-amber-800 flex-shrink-0">
                                        {other.name[0]?.toUpperCase()}
                                    </div>
                                    <p className="text-xs text-gray-800 flex-1 min-w-0 truncate">
                                        <span className="font-semibold">{other.name}</span>
                                    </p>
                                    <button
                                        onClick={() => handleRespond(r._id, "accept")}
                                        disabled={respondingId === r._id}
                                        className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded"
                                        title="Accept"
                                    >
                                        {respondingId === r._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                    </button>
                                    <button
                                        onClick={() => handleRespond(r._id, "decline")}
                                        disabled={respondingId === r._id}
                                        className="p-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-600 rounded"
                                        title="Decline"
                                    >
                                        {respondingId === r._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Assignments preview */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-red-600" />
                        <h2 className="text-base font-bold text-gray-900 font-heading">
                            {isCoach ? "Active Assignments" : "Your Tasks"}
                        </h2>
                    </div>
                    <Link
                        href="/assignments"
                        className="text-xs font-semibold text-gray-500 hover:text-red-600 flex items-center gap-1"
                    >
                        View all <ChevronRight className="w-3 h-3" />
                    </Link>
                </div>

                {stats && stats.total > 0 && (
                    <div className="grid grid-cols-4 gap-2 mb-3">
                        <MiniStat label="Active" val={stats.assigned} color="text-blue-700" />
                        <MiniStat label="Overdue" val={stats.overdue} color="text-amber-700" />
                        <MiniStat label="Review" val={stats.submitted} color="text-purple-700" />
                        <MiniStat label="Done" val={stats.completed} color="text-emerald-700" />
                    </div>
                )}

                {upcomingAssignments.length === 0 ? (
                    <div className="text-center py-3 text-xs text-gray-500">
                        {isCoach ? "No pending assignments." : "Nothing assigned. Free time!"}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {upcomingAssignments.map((a) => {
                            const Icon = TYPE_ICON[a.type] || Star;
                            const otherUser = isCoach ? a.traineeId : a.coachId;
                            const dueIn = new Date(a.dueDate).getTime() - Date.now();
                            const dueText = dueIn < 0
                                ? `${Math.abs(Math.round(dueIn / 86400000))}d overdue`
                                : dueIn < 86400000 ? "Due today" : `${Math.round(dueIn / 86400000)}d left`;
                            return (
                                <Link
                                    key={a._id}
                                    href="/assignments"
                                    className="flex items-center gap-3 p-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center flex-shrink-0">
                                        <Icon className="w-4 h-4 text-gray-700" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 truncate">{a.title}</p>
                                        <p className="text-[10px] text-gray-500 truncate">
                                            {isCoach ? `→ ${otherUser?.name}` : `from ${otherUser?.name}`}
                                        </p>
                                    </div>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${STATUS_COLOR[a.status]}`}>
                                        {dueText}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Activity feed */}
            {variant !== "compact" && (
                <div className="bg-white border border-gray-200 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Bell className="w-4 h-4 text-red-600" />
                        <h2 className="text-base font-bold text-gray-900 font-heading">Recent Activity</h2>
                    </div>
                    {activity.length === 0 ? (
                        <p className="text-xs text-gray-500 text-center py-4">No activity yet.</p>
                    ) : (
                        <div className="space-y-2.5">
                            {activity.map((a) => (
                                <ActivityRow key={a._id} item={a} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function MiniStat({ label, val, color }: { label: string; val: number; color: string }) {
    return (
        <div className="bg-gray-50 rounded-lg px-2 py-1.5 text-center">
            <p className={`text-base font-bold ${color}`}>{val}</p>
            <p className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">{label}</p>
        </div>
    );
}

function ActivityRow({ item }: { item: ActivityItem }) {
    const phrasing: Record<string, string> = {
        relationship_requested: " sent you a connection request",
        relationship_accepted: " accepted your request",
        relationship_declined: " declined your request",
        relationship_ended: " ended your connection",
        assignment_created: ` assigned: ${item.metadata.title || "a task"}`,
        assignment_submitted: ` submitted: ${item.metadata.title || "a task"}`,
        assignment_completed: ` reviewed: ${item.metadata.title || "a task"}`,
        assignment_overdue: ` task overdue: ${item.metadata.title || ""}`,
        message_received: `: "${(item.metadata.snippet || "").slice(0, 50)}${(item.metadata.snippet || "").length > 50 ? "…" : ""}"`,
        training_week_completed: ` completed a training week`,
        prediction_made: ` made a new prediction`,
    };
    const text = phrasing[item.action] || ` did something`;
    const icon = item.action.startsWith("assignment") ? ClipboardList :
                 item.action.startsWith("message") ? MessageSquare :
                 item.action.startsWith("relationship") ? Users : Bell;
    const Icon = icon;
    const ago = timeAgo(item.createdAt);
    return (
        <div className="flex items-start gap-2.5">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${item.read ? "bg-gray-100" : "bg-red-50"}`}>
                <Icon className={`w-3.5 h-3.5 ${item.read ? "text-gray-500" : "text-red-600"}`} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-800 leading-snug">
                    <span className="font-semibold">{item.actorName}</span>
                    {text}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">{ago}</p>
            </div>
        </div>
    );
}

function timeAgo(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    const m = Math.floor(ms / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return new Date(iso).toLocaleDateString();
}
