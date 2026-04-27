"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { relationshipApi, Relationship, ApiError } from "@/lib/api";
import {
    Loader2, UserPlus, Mail, Check, XCircle, LinkIcon, Users,
    AlertCircle, CheckCircle2, Inbox, Send, Clock, MessageSquare,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function ConnectionsPage() {
    const router = useRouter();
    const { user, token, isAuthenticated, isLoading: authLoading } = useAuth();

    const [relationships, setRelationships] = useState<Relationship[]>([]);
    const [loading, setLoading] = useState(true);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviting, setInviting] = useState(false);
    const [inviteError, setInviteError] = useState("");
    const [inviteSuccess, setInviteSuccess] = useState("");
    const [listError, setListError] = useState("");
    const [actionError, setActionError] = useState("");
    const [pendingActionId, setPendingActionId] = useState<string | null>(null);

    const isCoach = user?.role === "coach";

    const getErrorMessage = (err: unknown, fallback: string) => {
        if (err instanceof ApiError) return err.message;
        if (err instanceof Error) return err.message;
        return fallback;
    };

    const load = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setListError("");
        try {
            const res = await relationshipApi.list(token);
            if (res.success && res.data) setRelationships(res.data);
            else setListError(res.message || "Failed to load connections");
        } catch (err) {
            setListError(getErrorMessage(err, "Failed to load connections"));
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) router.push("/login");
        if (user?.role === "fan") router.push("/dashboard/fan");
    }, [authLoading, isAuthenticated, user, router]);

    useEffect(() => {
        if (token) load();
    }, [token, load]);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail.trim() || !token) return;
        setInviting(true);
        setInviteError("");
        setInviteSuccess("");
        try {
            const body = isCoach
                ? { traineeEmail: inviteEmail.trim() }
                : { coachEmail: inviteEmail.trim() };
            const res = await relationshipApi.create(body, token);
            if (res.success) {
                setInviteSuccess(`Request sent to ${inviteEmail.trim()}`);
                setInviteEmail("");
                load();
            } else {
                setInviteError(res.message || "Failed to send");
            }
        } catch (err) {
            setInviteError(getErrorMessage(err, "Failed to send"));
        } finally {
            setInviting(false);
        }
    };

    const handleRespond = async (id: string, action: "accept" | "decline") => {
        if (!token) return;
        setActionError("");
        setPendingActionId(id);
        try {
            const res = await relationshipApi.respond(id, action, token);
            if (res.success) await load();
            else setActionError(res.message || "Unable to update request");
        } catch (err) {
            setActionError(getErrorMessage(err, "Unable to update request"));
        } finally {
            setPendingActionId(null);
        }
    };

    const handleEnd = async (id: string) => {
        if (!token) return;
        if (!confirm("End this connection? You can reconnect later if both parties agree.")) return;
        setActionError("");
        setPendingActionId(id);
        try {
            const res = await relationshipApi.end(id, token);
            if (res.success) await load();
            else setActionError(res.message || "Unable to end connection");
        } catch (err) {
            setActionError(getErrorMessage(err, "Unable to end connection"));
        } finally {
            setPendingActionId(null);
        }
    };

    if (authLoading || !user) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-red-500" />
            </div>
        );
    }

    const meId = user.id;
    const incoming = relationships.filter(
        (r) =>
            r.status === "pending" &&
            ((r.requestedBy === "coach" && r.traineeId._id === meId) ||
             (r.requestedBy === "trainee" && r.coachId._id === meId))
    );
    const outgoing = relationships.filter(
        (r) =>
            r.status === "pending" &&
            ((r.requestedBy === "coach" && r.coachId._id === meId) ||
             (r.requestedBy === "trainee" && r.traineeId._id === meId))
    );
    const active = relationships.filter((r) => r.status === "active");
    const ended = relationships.filter((r) => r.status === "ended" || r.status === "declined");

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero */}
            <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-red-900 text-white">
                <div className="max-w-5xl mx-auto px-6 py-10">
                    <p className="text-red-300 text-xs uppercase tracking-widest font-semibold mb-2">
                        {isCoach ? "Your Trainee Network" : "Your Coach Network"}
                    </p>
                    <h1 className="text-3xl md:text-4xl font-bold font-heading">Connections</h1>
                    <p className="text-white/60 mt-2 text-sm max-w-xl">
                        {isCoach
                            ? "Build your roster. Connect with fighters and beginners to assign training, exchange messages, and track progress."
                            : "Connect with a coach to receive personalized training, feedback, and direct messages."}
                    </p>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
                {/* Invite */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center">
                            <UserPlus className="w-4 h-4 text-red-600" />
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-900 font-heading">
                                {isCoach ? "Invite a trainee" : "Connect with a coach"}
                            </h2>
                            <p className="text-xs text-gray-500">
                                Enter the email they signed up with.
                            </p>
                        </div>
                    </div>
                    <form onSubmit={handleInvite} className="flex gap-2">
                        <div className="relative flex-1">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder={isCoach ? "trainee@example.com" : "coach@example.com"}
                                required
                                className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:border-red-400"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={inviting}
                            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-5 rounded-lg text-sm font-semibold flex items-center gap-2"
                        >
                            {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            Send Request
                        </button>
                    </form>
                    {inviteSuccess && (
                        <div className="mt-3 text-emerald-700 text-xs flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> {inviteSuccess}
                        </div>
                    )}
                    {inviteError && (
                        <div className="mt-3 text-red-600 text-xs flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {inviteError}
                        </div>
                    )}
                </div>

                {actionError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700 flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5" /> {actionError}
                    </div>
                )}

                {listError && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> {listError}</span>
                        <button onClick={load} className="font-semibold underline">Retry</button>
                    </div>
                )}

                {loading ? (
                    <div className="py-20 flex justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                    </div>
                ) : (
                    <>
                        {/* Incoming requests */}
                        <Section title="Incoming Requests" icon={Inbox} count={incoming.length} accent="amber">
                            {incoming.length === 0 ? (
                                <EmptyRow text="No pending requests." />
                            ) : (
                                incoming.map((r) => (
                                    <RelationshipRow
                                        key={r._id}
                                        rel={r}
                                        meId={meId}
                                        actions={
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleRespond(r._id, "accept")}
                                                    disabled={pendingActionId === r._id}
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                                                >
                                                    {pendingActionId === r._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Accept
                                                </button>
                                                <button
                                                    onClick={() => handleRespond(r._id, "decline")}
                                                    disabled={pendingActionId === r._id}
                                                    className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                                                >
                                                    {pendingActionId === r._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />} Decline
                                                </button>
                                            </div>
                                        }
                                    />
                                ))
                            )}
                        </Section>

                        {/* Outgoing requests */}
                        <Section title="Sent Requests" icon={Clock} count={outgoing.length} accent="blue">
                            {outgoing.length === 0 ? (
                                <EmptyRow text="No outgoing requests." />
                            ) : (
                                outgoing.map((r) => (
                                    <RelationshipRow
                                        key={r._id}
                                        rel={r}
                                        meId={meId}
                                        statusLabel="Awaiting response"
                                        actions={
                                            <button
                                                onClick={() => handleEnd(r._id)}
                                                disabled={pendingActionId === r._id}
                                                className="text-xs text-gray-500 hover:text-red-600 font-semibold"
                                            >
                                                {pendingActionId === r._id ? "Working..." : "Cancel"}
                                            </button>
                                        }
                                    />
                                ))
                            )}
                        </Section>

                        {/* Active connections */}
                        <Section title="Active Connections" icon={LinkIcon} count={active.length} accent="emerald">
                            {active.length === 0 ? (
                                <EmptyRow text={isCoach ? "No active trainees yet." : "Not connected with any coach yet."} />
                            ) : (
                                active.map((r) => {
                                    const other = r.coachId._id === meId ? r.traineeId : r.coachId;
                                    return (
                                        <RelationshipRow
                                            key={r._id}
                                            rel={r}
                                            meId={meId}
                                            actions={
                                                <div className="flex gap-2">
                                                    <Link
                                                        href={`/messages?with=${other._id}`}
                                                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                                                    >
                                                        <MessageSquare className="w-3 h-3" /> Message
                                                    </Link>
                                                    <button
                                                        onClick={() => handleEnd(r._id)}
                                                        disabled={pendingActionId === r._id}
                                                        className="text-xs text-gray-500 hover:text-red-600 font-semibold"
                                                    >
                                                        {pendingActionId === r._id ? "Working..." : "End"}
                                                    </button>
                                                </div>
                                            }
                                        />
                                    );
                                })
                            )}
                        </Section>

                        {/* Past */}
                        {ended.length > 0 && (
                            <Section title="Past" icon={Users} count={ended.length} accent="gray" collapsible>
                                {ended.map((r) => (
                                    <RelationshipRow key={r._id} rel={r} meId={meId} dim />
                                ))}
                            </Section>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------

function Section({
    title, icon: Icon, count, accent, children, collapsible,
}: {
    title: string;
    icon: LucideIcon;
    count: number;
    accent: "amber" | "blue" | "emerald" | "gray";
    children: React.ReactNode;
    collapsible?: boolean;
}) {
    const [open, setOpen] = useState(!collapsible);
    const accentClasses: Record<string, string> = {
        amber: "bg-amber-50 text-amber-700",
        blue: "bg-blue-50 text-blue-700",
        emerald: "bg-emerald-50 text-emerald-700",
        gray: "bg-gray-100 text-gray-600",
    };

    return (
        <div>
            <button
                onClick={() => collapsible && setOpen((o) => !o)}
                className="flex items-center gap-2 mb-3 w-full text-left"
            >
                <div className={`w-7 h-7 rounded-lg ${accentClasses[accent]} flex items-center justify-center`}>
                    <Icon className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-bold text-gray-900 text-sm">{title}</h3>
                <span className="text-xs text-gray-500 font-semibold">({count})</span>
            </button>
            {open && <div className="space-y-2">{children}</div>}
        </div>
    );
}

function RelationshipRow({
    rel, meId, actions, statusLabel, dim,
}: {
    rel: Relationship;
    meId: string;
    actions?: React.ReactNode;
    statusLabel?: string;
    dim?: boolean;
}) {
    const isCoachOnRow = rel.coachId._id === meId;
    const other = isCoachOnRow ? rel.traineeId : rel.coachId;
    const otherRoleLabel = isCoachOnRow ? rel.traineeRole : "coach";

    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white border ${dim ? "border-gray-100 opacity-70" : "border-gray-200"} rounded-xl px-4 py-3 flex items-center gap-3`}
        >
            <div className="w-10 h-10 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center text-gray-700 font-bold text-sm flex-shrink-0">
                {other.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{other.name}</p>
                <p className="text-xs text-gray-500 truncate">
                    {otherRoleLabel}
                    {other.discipline && ` · ${other.discipline}`}
                    {other.experienceLevel && ` · ${other.experienceLevel}`}
                </p>
                {statusLabel && (
                    <p className="text-[10px] text-gray-400 italic mt-0.5">{statusLabel}</p>
                )}
                {rel.status === "ended" && rel.endedAt && (
                    <p className="text-[10px] text-gray-400 italic mt-0.5">
                        Ended {new Date(rel.endedAt).toLocaleDateString()}
                    </p>
                )}
                {rel.status === "declined" && (
                    <p className="text-[10px] text-gray-400 italic mt-0.5">Declined</p>
                )}
            </div>
            {actions}
        </motion.div>
    );
}

function EmptyRow({ text }: { text: string }) {
    return (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl px-4 py-6 text-center">
            <p className="text-gray-500 text-sm">{text}</p>
        </div>
    );
}
