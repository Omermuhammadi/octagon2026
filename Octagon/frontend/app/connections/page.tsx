"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
    relationshipApi, Relationship, ApiError,
    DiscoverAthlete, DiscoverCoach,
} from "@/lib/api";
import {
    Loader2, UserPlus, Check, XCircle, Users, Search,
    AlertCircle, CheckCircle2, Inbox, Send, Clock, MessageSquare,
    Shield, Award, Sparkles, Flame, ChevronRight, Mail, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

type TabKey = "discover" | "incoming" | "outgoing" | "active" | "past";

export default function ConnectionsPage() {
    const router = useRouter();
    const { user, token, isAuthenticated, isLoading: authLoading } = useAuth();

    const [relationships, setRelationships] = useState<Relationship[]>([]);
    const [discoverList, setDiscoverList] = useState<(DiscoverAthlete | DiscoverCoach)[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingDiscover, setLoadingDiscover] = useState(true);
    const [actionError, setActionError] = useState("");
    const [listError, setListError] = useState("");
    const [pendingActionId, setPendingActionId] = useState<string | null>(null);
    const [requestingId, setRequestingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabKey>("discover");
    const [discoverSearch, setDiscoverSearch] = useState("");
    const [showFallback, setShowFallback] = useState(false);
    const [fallbackEmail, setFallbackEmail] = useState("");
    const [fallbackBusy, setFallbackBusy] = useState(false);
    const [fallbackError, setFallbackError] = useState("");
    const [fallbackSuccess, setFallbackSuccess] = useState("");
    const [toast, setToast] = useState<string | null>(null);

    const isCoach = user?.role === "coach";

    const getErrorMessage = (err: unknown, fallback: string) => {
        if (err instanceof ApiError) return err.message;
        if (err instanceof Error) return err.message;
        return fallback;
    };

    const showToast = useCallback((msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 2600);
    }, []);

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

    const loadDiscover = useCallback(async () => {
        if (!token || !user) return;
        setLoadingDiscover(true);
        try {
            if (user.role === "coach") {
                const res = await relationshipApi.discover(token);
                if (res.success && res.data) setDiscoverList(res.data);
            } else {
                const res = await relationshipApi.discoverCoaches(token);
                if (res.success && res.data) setDiscoverList(res.data);
            }
        } catch { /* silent */ }
        finally { setLoadingDiscover(false); }
    }, [token, user]);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) router.push("/login");
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => { if (token) { load(); loadDiscover(); } }, [token, load, loadDiscover]);

    const handleQuickRequest = async (item: DiscoverAthlete | DiscoverCoach) => {
        if (!token || requestingId) return;
        setRequestingId(item._id);
        setActionError("");
        try {
            const body = isCoach
                ? { traineeId: item._id }
                : { coachId: item._id };
            const res = await relationshipApi.create(body, token);
            if (res.success) {
                showToast(`Request sent to ${item.name}`);
                await Promise.all([load(), loadDiscover()]);
            } else {
                setActionError(res.message || "Failed to send request");
            }
        } catch (err) {
            setActionError(getErrorMessage(err, "Failed to send request"));
        } finally {
            setRequestingId(null);
        }
    };

    const handleCancelPending = async (relId: string) => {
        if (!token) return;
        setRequestingId(relId);
        try {
            await relationshipApi.end(relId, token);
            await Promise.all([load(), loadDiscover()]);
            showToast("Request cancelled");
        } catch (err) {
            setActionError(getErrorMessage(err, "Failed to cancel"));
        } finally {
            setRequestingId(null);
        }
    };

    const handleFallbackInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fallbackEmail.trim() || !token) return;
        setFallbackBusy(true);
        setFallbackError("");
        setFallbackSuccess("");
        try {
            const body = isCoach
                ? { traineeEmail: fallbackEmail.trim() }
                : { coachEmail: fallbackEmail.trim() };
            const res = await relationshipApi.create(body, token);
            if (res.success) {
                setFallbackSuccess(`Request sent to ${fallbackEmail.trim()}`);
                setFallbackEmail("");
                await Promise.all([load(), loadDiscover()]);
            } else {
                setFallbackError(res.message || "Failed to send");
            }
        } catch (err) {
            setFallbackError(getErrorMessage(err, "Failed to send"));
        } finally {
            setFallbackBusy(false);
        }
    };

    const handleRespond = async (id: string, action: "accept" | "decline") => {
        if (!token) return;
        setActionError("");
        setPendingActionId(id);
        try {
            const res = await relationshipApi.respond(id, action, token);
            if (res.success) {
                showToast(action === "accept" ? "Connection accepted" : "Request declined");
                await load();
            } else {
                setActionError(res.message || "Unable to update request");
            }
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
            if (res.success) { await load(); showToast("Connection ended"); }
            else setActionError(res.message || "Unable to end connection");
        } catch (err) {
            setActionError(getErrorMessage(err, "Unable to end connection"));
        } finally {
            setPendingActionId(null);
        }
    };

    const meId = user?.id || "";

    const incoming = useMemo(() => relationships.filter(
        (r) => r.status === "pending" &&
            ((r.requestedBy === "coach" && r.traineeId._id === meId) ||
             (r.requestedBy === "trainee" && r.coachId._id === meId))
    ), [relationships, meId]);

    const outgoing = useMemo(() => relationships.filter(
        (r) => r.status === "pending" &&
            ((r.requestedBy === "coach" && r.coachId._id === meId) ||
             (r.requestedBy === "trainee" && r.traineeId._id === meId))
    ), [relationships, meId]);

    const active = useMemo(() => relationships.filter((r) => r.status === "active"), [relationships]);
    const ended = useMemo(() => relationships.filter((r) => r.status === "ended" || r.status === "declined"), [relationships]);

    const filteredDiscover = useMemo(() => {
        const q = discoverSearch.trim().toLowerCase();
        if (!q) return discoverList;
        return discoverList.filter((d) =>
            d.name.toLowerCase().includes(q) ||
            (d.discipline || "").toLowerCase().includes(q) ||
            (d.experienceLevel || "").toLowerCase().includes(q) ||
            ('role' in d && d.role.toLowerCase().includes(q))
        );
    }, [discoverList, discoverSearch]);

    if (authLoading || !user) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-red-500" />
            </div>
        );
    }

    const tabs: { key: TabKey; label: string; count: number; icon: LucideIcon }[] = [
        { key: "discover", label: isCoach ? "Discover Athletes" : "Discover Coaches", count: filteredDiscover.length, icon: Sparkles },
        { key: "incoming", label: "Incoming", count: incoming.length, icon: Inbox },
        { key: "outgoing", label: "Sent", count: outgoing.length, icon: Clock },
        { key: "active", label: "Active", count: active.length, icon: Users },
        { key: "past", label: "Past", count: ended.length, icon: Shield },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero */}
            <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-red-950 text-white pt-24 pb-10 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="px-3 py-1 rounded-full bg-red-600/20 border border-red-500/30 text-red-300 text-xs font-bold uppercase tracking-widest">
                            <Flame className="w-3 h-3 inline mr-1" /> Connections Hub
                        </span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-display font-black tracking-tight mb-2">
                        {isCoach ? <>BUILD YOUR <span className="text-amber-400">ROSTER</span></> : <>FIND YOUR <span className="text-red-500">COACH</span></>}
                    </h1>
                    <p className="text-gray-300 text-sm max-w-2xl">
                        {isCoach
                            ? "Browse every athlete on the platform. Click ‘Request’ to send a coaching invite — no emails, no friction. Manage your incoming requests, active trainees, and past connections all in one place."
                            : "Browse every coach on the platform. See their discipline, experience and how many fighters they're already training. One click sends a request — they'll see it in their dashboard and accept or decline."}
                    </p>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Tabs */}
                <div className="flex flex-wrap items-center gap-2 mb-6 bg-white rounded-2xl border border-gray-200 p-1.5 shadow-sm">
                    {tabs.map((t) => {
                        const Icon = t.icon;
                        const isActive = activeTab === t.key;
                        return (
                            <button
                                key={t.key}
                                onClick={() => setActiveTab(t.key)}
                                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                                    isActive
                                        ? "bg-red-600 text-white shadow-sm"
                                        : "text-gray-600 hover:bg-gray-100"
                                }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{t.label}</span>
                                <span className="sm:hidden">{t.label.split(" ")[0]}</span>
                                <span className={`min-w-[20px] text-center px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                                    isActive ? "bg-white/20" : "bg-gray-200 text-gray-600"
                                }`}>{t.count}</span>
                            </button>
                        );
                    })}
                </div>

                {actionError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-xs text-red-700 flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {actionError}
                        <button onClick={() => setActionError("")} className="ml-auto text-red-400 hover:text-red-600">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}

                {listError && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-xs text-amber-800 flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> {listError}</span>
                        <button onClick={load} className="font-semibold underline">Retry</button>
                    </div>
                )}

                {/* Tab content */}
                <AnimatePresence mode="wait">
                    {activeTab === "discover" && (
                        <motion.div
                            key="discover"
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            {/* Search bar */}
                            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm mb-5">
                                <div className="relative">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={discoverSearch}
                                        onChange={(e) => setDiscoverSearch(e.target.value)}
                                        placeholder={isCoach
                                            ? "Search athletes by name, role, or discipline…"
                                            : "Search coaches by name, discipline, or experience…"}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-400 focus:bg-white transition-colors"
                                    />
                                </div>
                                <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
                                    <p className="text-xs text-gray-500">
                                        {loadingDiscover
                                            ? "Loading…"
                                            : `${filteredDiscover.length} ${isCoach ? "athlete" : "coach"}${filteredDiscover.length === 1 ? "" : "s"} on the platform`}
                                    </p>
                                    <button
                                        onClick={() => setShowFallback((s) => !s)}
                                        className="text-[11px] text-gray-500 hover:text-red-600 underline font-semibold"
                                    >
                                        {showFallback ? "Hide" : "Don’t see them?"} Invite by email
                                    </button>
                                </div>

                                {/* Email fallback (collapsed by default) */}
                                <AnimatePresence>
                                    {showFallback && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="mt-4 pt-4 border-t border-gray-100"
                                        >
                                            <p className="text-xs text-gray-500 mb-2">
                                                Use this only if the {isCoach ? "athlete" : "coach"} hasn’t shown up yet — e.g. they just registered.
                                            </p>
                                            <form onSubmit={handleFallbackInvite} className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                                    <input
                                                        type="email"
                                                        value={fallbackEmail}
                                                        onChange={(e) => setFallbackEmail(e.target.value)}
                                                        placeholder={isCoach ? "athlete@example.com" : "coach@example.com"}
                                                        required
                                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-red-400"
                                                    />
                                                </div>
                                                <button
                                                    type="submit"
                                                    disabled={fallbackBusy}
                                                    className="bg-gray-900 hover:bg-black disabled:opacity-50 text-white px-4 rounded-lg text-xs font-bold flex items-center gap-1.5"
                                                >
                                                    {fallbackBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                                    Send
                                                </button>
                                            </form>
                                            {fallbackSuccess && (
                                                <div className="mt-2 text-emerald-700 text-[11px] flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3" /> {fallbackSuccess}
                                                </div>
                                            )}
                                            {fallbackError && (
                                                <div className="mt-2 text-red-600 text-[11px] flex items-center gap-1">
                                                    <AlertCircle className="w-3 h-3" /> {fallbackError}
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Discover grid */}
                            {loadingDiscover ? (
                                <div className="py-20 flex justify-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                                </div>
                            ) : filteredDiscover.length === 0 ? (
                                <div className="bg-white border border-dashed border-gray-200 rounded-2xl py-16 text-center">
                                    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Sparkles className="w-6 h-6 text-gray-400" />
                                    </div>
                                    <p className="text-gray-500 text-sm font-semibold">
                                        {discoverList.length === 0
                                            ? isCoach
                                                ? "No new athletes on the platform right now."
                                                : "No coaches available right now — check back soon."
                                            : "No matches for your search."}
                                    </p>
                                    <p className="text-gray-400 text-xs mt-1">
                                        {discoverList.length === 0 ? "Once they register, they’ll appear here automatically." : "Try a different search term."}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredDiscover.map((item) => {
                                        const isCoachCard = "activeTrainees" in item;
                                        const joinedDays = Math.floor((Date.now() - new Date(item.createdAt).getTime()) / 86400000);
                                        const joinedLabel = joinedDays === 0 ? "today" : joinedDays === 1 ? "yesterday" : `${joinedDays}d ago`;
                                        const isPending = !!item.pendingRelId;
                                        const isBusy = requestingId === item._id || (item.pendingRelId && requestingId === item.pendingRelId);

                                        return (
                                            <motion.div
                                                key={item._id}
                                                whileHover={{ y: -2 }}
                                                className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:border-red-200 transition-all group"
                                            >
                                                <div className="flex items-start gap-3 mb-3">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg flex-shrink-0 ${
                                                        isCoachCard
                                                            ? "bg-gradient-to-br from-amber-500 to-amber-700"
                                                            : (item as DiscoverAthlete).role === "fighter"
                                                                ? "bg-gradient-to-br from-red-500 to-red-700"
                                                                : (item as DiscoverAthlete).role === "beginner"
                                                                    ? "bg-gradient-to-br from-blue-500 to-blue-700"
                                                                    : "bg-gradient-to-br from-gray-500 to-gray-700"
                                                    }`}>
                                                        {item.name[0]?.toUpperCase()}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-gray-900 font-bold text-sm truncate">{item.name}</p>
                                                        <p className="text-[11px] text-gray-500 capitalize flex items-center gap-1 mt-0.5">
                                                            {isCoachCard ? <Shield className="w-3 h-3 text-amber-500" /> : <Award className="w-3 h-3 text-gray-400" />}
                                                            {isCoachCard ? "Coach" : (item as DiscoverAthlete).role}
                                                            {item.discipline && <span>· {item.discipline}</span>}
                                                        </p>
                                                        {item.experienceLevel && (
                                                            <p className="text-[10px] text-gray-400 mt-0.5">{item.experienceLevel}</p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Coach-specific badges */}
                                                {isCoachCard && (
                                                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-md text-[10px] font-bold">
                                                            <Users className="w-2.5 h-2.5" />
                                                            {(item as DiscoverCoach).activeTrainees} {(item as DiscoverCoach).activeTrainees === 1 ? "trainee" : "trainees"}
                                                        </span>
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md text-[10px] font-medium">
                                                            <Clock className="w-2.5 h-2.5" /> Joined {joinedLabel}
                                                        </span>
                                                    </div>
                                                )}
                                                {!isCoachCard && (
                                                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md text-[10px] font-medium">
                                                            <Clock className="w-2.5 h-2.5" /> Signed up {joinedLabel}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Action button */}
                                                {isPending ? (
                                                    <button
                                                        onClick={() => item.pendingRelId && handleCancelPending(item.pendingRelId)}
                                                        disabled={!!isBusy}
                                                        className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-amber-50 border border-amber-200 text-amber-700 hover:bg-red-50 hover:border-red-200 hover:text-red-600 rounded-xl text-xs font-bold transition-colors disabled:opacity-60"
                                                    >
                                                        {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
                                                        Requested — click to cancel
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleQuickRequest(item)}
                                                        disabled={!!isBusy}
                                                        className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-60 group-hover:shadow-md"
                                                    >
                                                        {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                                        {isCoach ? "Send Coach Request" : "Request to Connect"}
                                                    </button>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === "incoming" && (
                        <motion.div key="incoming" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                            {loading ? (
                                <Center><Loader2 className="w-8 h-8 animate-spin text-red-500" /></Center>
                            ) : incoming.length === 0 ? (
                                <EmptyState icon={Inbox} title="No pending requests"
                                    desc={isCoach
                                        ? "When athletes request to train with you, they’ll appear here for you to accept or decline."
                                        : "When a coach invites you to their roster, the request will show up here."} />
                            ) : (
                                <div className="space-y-3">
                                    {incoming.map((r) => (
                                        <RelationshipRow
                                            key={r._id} rel={r} meId={meId}
                                            actions={
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleRespond(r._id, "accept")}
                                                        disabled={pendingActionId === r._id}
                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                                                    >
                                                        {pendingActionId === r._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Accept
                                                    </button>
                                                    <button
                                                        onClick={() => handleRespond(r._id, "decline")}
                                                        disabled={pendingActionId === r._id}
                                                        className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                                                    >
                                                        <XCircle className="w-3 h-3" /> Decline
                                                    </button>
                                                </div>
                                            }
                                        />
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === "outgoing" && (
                        <motion.div key="outgoing" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                            {loading ? (
                                <Center><Loader2 className="w-8 h-8 animate-spin text-red-500" /></Center>
                            ) : outgoing.length === 0 ? (
                                <EmptyState icon={Clock} title="No outgoing requests"
                                    desc="Requests you send will appear here until the recipient accepts or declines." />
                            ) : (
                                <div className="space-y-3">
                                    {outgoing.map((r) => (
                                        <RelationshipRow
                                            key={r._id} rel={r} meId={meId}
                                            statusLabel="Awaiting response"
                                            actions={
                                                <button
                                                    onClick={() => handleEnd(r._id)}
                                                    disabled={pendingActionId === r._id}
                                                    className="text-xs text-gray-500 hover:text-red-600 font-semibold px-2"
                                                >
                                                    {pendingActionId === r._id ? "Working…" : "Cancel"}
                                                </button>
                                            }
                                        />
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === "active" && (
                        <motion.div key="active" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                            {loading ? (
                                <Center><Loader2 className="w-8 h-8 animate-spin text-red-500" /></Center>
                            ) : active.length === 0 ? (
                                <EmptyState icon={Users} title={isCoach ? "No active trainees yet" : "Not connected with any coach yet"}
                                    desc={isCoach
                                        ? "Start by browsing the Discover tab — every athlete who joins shows up there."
                                        : "Head over to Discover to find a coach. One click sends a request."} />
                            ) : (
                                <div className="space-y-3">
                                    {active.map((r) => {
                                        const other = r.coachId._id === meId ? r.traineeId : r.coachId;
                                        return (
                                            <RelationshipRow
                                                key={r._id} rel={r} meId={meId}
                                                actions={
                                                    <div className="flex gap-2">
                                                        <Link
                                                            href={`/messages?with=${other._id}`}
                                                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                                                        >
                                                            <MessageSquare className="w-3 h-3" /> Message
                                                        </Link>
                                                        {isCoach && (
                                                            <Link
                                                                href={`/assignments?trainee=${other._id}`}
                                                                className="bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                                                            >
                                                                <Award className="w-3 h-3" /> Assign
                                                            </Link>
                                                        )}
                                                        <button
                                                            onClick={() => handleEnd(r._id)}
                                                            disabled={pendingActionId === r._id}
                                                            className="text-xs text-gray-500 hover:text-red-600 font-semibold px-2"
                                                        >
                                                            End
                                                        </button>
                                                    </div>
                                                }
                                            />
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === "past" && (
                        <motion.div key="past" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                            {loading ? (
                                <Center><Loader2 className="w-8 h-8 animate-spin text-red-500" /></Center>
                            ) : ended.length === 0 ? (
                                <EmptyState icon={Shield} title="No past connections"
                                    desc="Ended or declined connections will be archived here." />
                            ) : (
                                <div className="space-y-3">
                                    {ended.map((r) => (
                                        <RelationshipRow key={r._id} rel={r} meId={meId} dim />
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-xl bg-gray-900 text-white shadow-xl border border-gray-700"
                    >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm">{toast}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ---------------------------------------------------------------------------

function Center({ children }: { children: React.ReactNode }) {
    return <div className="py-20 flex justify-center">{children}</div>;
}

function EmptyState({ icon: Icon, title, desc }: { icon: LucideIcon; title: string; desc: string }) {
    return (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl py-16 px-6 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Icon className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-700 font-bold text-sm">{title}</p>
            <p className="text-gray-500 text-xs mt-1.5 max-w-md mx-auto">{desc}</p>
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
            className={`bg-white border ${dim ? "border-gray-100 opacity-70" : "border-gray-200 hover:border-gray-300"} rounded-xl px-4 py-3.5 flex items-center gap-3 transition-colors`}
        >
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-base flex-shrink-0 ${
                otherRoleLabel === "coach"
                    ? "bg-gradient-to-br from-amber-500 to-amber-700"
                    : otherRoleLabel === "fighter"
                        ? "bg-gradient-to-br from-red-500 to-red-700"
                        : otherRoleLabel === "beginner"
                            ? "bg-gradient-to-br from-blue-500 to-blue-700"
                            : "bg-gradient-to-br from-gray-500 to-gray-700"
            }`}>
                {other.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm truncate">{other.name}</p>
                <p className="text-xs text-gray-500 truncate capitalize">
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
                {rel.acceptedAt && rel.status === "active" && (
                    <p className="text-[10px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Connected since {new Date(rel.acceptedAt).toLocaleDateString()}
                    </p>
                )}
            </div>
            {actions}
        </motion.div>
    );
}
