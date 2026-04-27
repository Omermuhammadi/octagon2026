"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
    messageApi, ConversationSummary, Thread, ChatMessage,
} from "@/lib/api";
import {
    Loader2, Send, MessageSquare, ArrowLeft, Search, Users,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

const POLL_INTERVAL = 8000;

function MessagesContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, token, isAuthenticated, isLoading: authLoading } = useAuth();

    const [conversations, setConversations] = useState<ConversationSummary[]>([]);
    const [thread, setThread] = useState<Thread | null>(null);
    const [activeUserId, setActiveUserId] = useState<string | null>(searchParams.get("with"));
    const [loadingList, setLoadingList] = useState(true);
    const [loadingThread, setLoadingThread] = useState(false);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [search, setSearch] = useState("");
    const [error, setError] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const meId = user ? ((user as any).id || (user as any)._id) : "";

    // Auth gate
    useEffect(() => {
        if (!authLoading && !isAuthenticated) router.push("/login");
        if (user?.role === "fan") router.push("/dashboard/fan");
    }, [authLoading, isAuthenticated, user, router]);

    // Fetch conversations
    const loadConversations = useCallback(async () => {
        if (!token) return;
        try {
            const res = await messageApi.conversations(token);
            if (res.success && res.data) setConversations(res.data);
        } finally {
            setLoadingList(false);
        }
    }, [token]);

    // Fetch one thread
    const loadThread = useCallback(async (userId: string) => {
        if (!token) return;
        setLoadingThread(true);
        setError("");
        try {
            const res = await messageApi.thread(userId, token);
            if (res.success && res.data) {
                setThread(res.data);
                // Mark conversation as read in list
                setConversations((prev) =>
                    prev.map((c) => (c.otherUser._id === userId ? { ...c, unread: 0 } : c))
                );
            } else {
                setError(res.message || "Could not load thread");
            }
        } catch (err: any) {
            setError(err?.message || "Could not load thread");
        } finally {
            setLoadingThread(false);
        }
    }, [token]);

    useEffect(() => { if (token) loadConversations(); }, [token, loadConversations]);

    useEffect(() => {
        if (activeUserId) loadThread(activeUserId);
    }, [activeUserId, loadThread]);

    // Polling for new messages while thread is open
    useEffect(() => {
        if (!activeUserId || !token) return;
        const id = setInterval(() => {
            loadThread(activeUserId);
            loadConversations();
        }, POLL_INTERVAL);
        return () => clearInterval(id);
    }, [activeUserId, token, loadThread, loadConversations]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [thread?.messages.length]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !activeUserId || !token || sending) return;
        const text = input.trim();
        setInput("");
        setSending(true);
        try {
            const res = await messageApi.send(activeUserId, text, token);
            if (res.success && res.data && thread) {
                setThread({ ...thread, messages: [...thread.messages, res.data] });
            }
            loadConversations();
        } catch (err: any) {
            setError(err?.message || "Failed to send");
            setInput(text);
        } finally {
            setSending(false);
        }
    };

    const filtered = conversations.filter((c) =>
        c.otherUser.name.toLowerCase().includes(search.toLowerCase())
    );

    if (authLoading || !user) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-red-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero (compact) */}
            <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-red-900 text-white">
                <div className="max-w-6xl mx-auto px-6 py-6">
                    <p className="text-red-300 text-xs uppercase tracking-widest font-semibold mb-1">
                        Direct Messaging
                    </p>
                    <h1 className="text-2xl md:text-3xl font-bold font-heading">Messages</h1>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-3 md:px-6 py-6">
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex h-[calc(100vh-220px)] min-h-[500px]">
                    {/* Conversation list */}
                    <div className={`w-full md:w-[320px] border-r border-gray-100 flex flex-col ${activeUserId ? "hidden md:flex" : "flex"}`}>
                        <div className="p-4 border-b border-gray-100">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search conversations…"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-red-300"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {loadingList ? (
                                <div className="py-12 flex justify-center">
                                    <Loader2 className="w-6 h-6 animate-spin text-red-500" />
                                </div>
                            ) : filtered.length === 0 ? (
                                <div className="p-6 text-center">
                                    <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                    <p className="text-gray-700 font-semibold text-sm">No conversations</p>
                                    <p className="text-gray-500 text-xs mt-1 mb-4">
                                        Connect with a {user.role === "coach" ? "trainee" : "coach"} first.
                                    </p>
                                    <Link
                                        href="/connections"
                                        className="inline-block bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2 rounded-lg"
                                    >
                                        Manage Connections
                                    </Link>
                                </div>
                            ) : (
                                filtered.map((c) => (
                                    <button
                                        key={c._id}
                                        onClick={() => setActiveUserId(c.otherUser._id)}
                                        className={`w-full px-4 py-3 flex items-start gap-3 border-b border-gray-50 hover:bg-gray-50 transition-colors text-left ${
                                            activeUserId === c.otherUser._id ? "bg-red-50/40 border-l-2 border-l-red-500" : ""
                                        }`}
                                    >
                                        <div className="w-10 h-10 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center text-gray-700 font-bold text-sm flex-shrink-0">
                                            {c.otherUser.name[0]?.toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <p className="font-semibold text-gray-900 text-sm truncate">{c.otherUser.name}</p>
                                                {c.lastMessage && (
                                                    <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">
                                                        {timeAgo(c.lastMessage.sentAt)}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 truncate mt-0.5">
                                                {c.lastMessage?.text || `New conversation · ${c.otherUser.role}`}
                                            </p>
                                        </div>
                                        {c.unread > 0 && (
                                            <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">
                                                {c.unread}
                                            </span>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Thread */}
                    <div className={`flex-1 flex flex-col ${activeUserId ? "flex" : "hidden md:flex"}`}>
                        {!activeUserId ? (
                            <div className="flex-1 flex items-center justify-center text-center p-8">
                                <div>
                                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-700 font-semibold">Select a conversation</p>
                                    <p className="text-gray-500 text-sm mt-1">Pick someone from the list to start messaging.</p>
                                </div>
                            </div>
                        ) : loadingThread && !thread ? (
                            <div className="flex-1 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                            </div>
                        ) : error ? (
                            <div className="flex-1 flex items-center justify-center">
                                <p className="text-red-600 text-sm">{error}</p>
                            </div>
                        ) : thread ? (
                            <>
                                {/* Thread header */}
                                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                                    <button
                                        onClick={() => setActiveUserId(null)}
                                        className="md:hidden text-gray-500 hover:text-gray-900"
                                    >
                                        <ArrowLeft className="w-5 h-5" />
                                    </button>
                                    <div className="w-10 h-10 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center text-gray-700 font-bold text-sm">
                                        {thread.otherUser.name[0]?.toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900 text-sm">{thread.otherUser.name}</p>
                                        <p className="text-xs text-gray-500">
                                            {thread.otherUser.role}
                                            {thread.otherUser.discipline && ` · ${thread.otherUser.discipline}`}
                                        </p>
                                    </div>
                                </div>

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-gray-50/30">
                                    {thread.messages.length === 0 ? (
                                        <div className="text-center py-12">
                                            <p className="text-gray-500 text-sm">No messages yet. Say hi!</p>
                                        </div>
                                    ) : (
                                        thread.messages.map((m) => {
                                            const isMine = m.senderId === meId;
                                            return (
                                                <motion.div
                                                    key={m._id}
                                                    initial={{ opacity: 0, y: 4 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                                                >
                                                    <div
                                                        className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-snug ${
                                                            isMine
                                                                ? "bg-red-600 text-white rounded-br-sm"
                                                                : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm"
                                                        }`}
                                                    >
                                                        <p className="whitespace-pre-wrap break-words">{m.text}</p>
                                                        <p className={`text-[10px] mt-1 ${isMine ? "text-red-200" : "text-gray-400"}`}>
                                                            {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                        </p>
                                                    </div>
                                                </motion.div>
                                            );
                                        })
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Composer */}
                                <form onSubmit={handleSend} className="p-4 border-t border-gray-100 flex gap-2">
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="Type a message…"
                                        className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-400"
                                    />
                                    <button
                                        type="submit"
                                        disabled={sending || !input.trim()}
                                        className="bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white px-4 rounded-xl"
                                    >
                                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    </button>
                                </form>
                            </>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}

function timeAgo(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    const m = Math.floor(ms / 60000);
    if (m < 1) return "now";
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d`;
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function MessagesPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-white flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-red-500" />
            </div>
        }>
            <MessagesContent />
        </Suspense>
    );
}
