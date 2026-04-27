"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, ExternalLink, Trash2, Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { chatApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

type Message = {
    id: string;
    text: string;
    sender: "user" | "bot";
    timestamp: Date;
    links?: { label: string; url: string }[];
};

const ROLE_QUICK_ACTIONS: Record<string, string[]> = {
    coach: [
        "Scout my next opponent",
        "Best counter to wrestling",
        "Analyze fighter stats",
        "Game plan for a striker",
        "Upcoming UFC events?",
    ],
    fighter: [
        "How to improve takedown defense?",
        "Weight cutting tips",
        "Drill for striking combinations",
        "How to improve cardio?",
        "Best BJJ drills for MMA",
    ],
    beginner: [
        "How to start MMA?",
        "Best beginner workout",
        "What gear do I need?",
        "Explain guard position",
        "Safe training tips",
    ],
    fan: [
        "Who would win: McGregor vs Khabib?",
        "Explain fight strategy",
        "Upcoming UFC events?",
        "Best UFC fights of all time",
        "Tell me about Jon Jones",
    ],
};

const DEFAULT_WELCOME =
    "Hey! I'm **Oracle AI** — your elite MMA analyst. Ask me about fighters, training, matchups, or anything MMA.";

function renderMarkdown(text: string): string {
    const escaped = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    return escaped
        .replace(/^### (.+)$/gm, '<h3 class="font-bold text-sm mt-2 mb-1">$1</h3>')
        .replace(/^## (.+)$/gm, '<h2 class="font-bold text-sm mt-2 mb-1">$1</h2>')
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
        .replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-gray-800 px-1 rounded text-xs font-mono">$1</code>')
        .replace(/^\d+\.\s(.+)$/gm, '<li class="ml-4 list-decimal list-outside text-sm">$1</li>')
        .replace(/^[-•]\s(.+)$/gm, '<li class="ml-4 list-disc list-outside text-sm">$1</li>')
        .replace(/(<li[^>]*>[\s\S]*?<\/li>\n?)+/g, (m) => `<ul class="space-y-0.5 my-1">${m}</ul>`)
        .replace(/\[([^\]]+)\]\(\/[^)]+\)/g, '<span class="text-red-600 font-medium underline">$1</span>')
        .replace(/\n/g, "<br/>");
}

function getStorageKey(userId: string) {
    return `oracle_chat_${userId}`;
}

function loadHistory(userId: string): Message[] {
    try {
        const raw = localStorage.getItem(getStorageKey(userId));
        if (!raw) return [];
        const parsed: any[] = JSON.parse(raw);
        return parsed.map((m) => ({ ...m, timestamp: new Date(m.timestamp) }));
    } catch {
        return [];
    }
}

function saveHistory(userId: string, messages: Message[]) {
    try {
        localStorage.setItem(getStorageKey(userId), JSON.stringify(messages.slice(-50)));
    } catch {
        // storage full — ignore
    }
}

export function Chatbot() {
    const { user, token } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [sessionId] = useState(
        () => `session_${Date.now()}_${Math.random().toString(36).slice(2)}`
    );
    const [showQuickActions, setShowQuickActions] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const role = user?.role ?? "fan";
    const quickActions = ROLE_QUICK_ACTIONS[role] ?? ROLE_QUICK_ACTIONS.fan;

    // Load history from localStorage when user changes
    useEffect(() => {
        if (!user?.id) {
            setMessages([
                { id: "welcome", text: DEFAULT_WELCOME, sender: "bot", timestamp: new Date() },
            ]);
            setShowQuickActions(true);
            return;
        }
        const history = loadHistory(user.id);
        if (history.length > 0) {
            setMessages(history);
            setShowQuickActions(false);
        } else {
            setMessages([
                { id: "welcome", text: DEFAULT_WELCOME, sender: "bot", timestamp: new Date() },
            ]);
            setShowQuickActions(true);
        }
    }, [user?.id]);

    // Persist history on change
    useEffect(() => {
        if (user?.id && messages.length > 0) {
            saveHistory(user.id, messages);
        }
    }, [messages, user?.id]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isTyping]);

    // Focus input when panel opens
    useEffect(() => {
        if (isOpen) {
            const t = setTimeout(() => inputRef.current?.focus(), 320);
            return () => clearTimeout(t);
        }
    }, [isOpen]);

    const buildUserContext = (): string => {
        if (!user) return "";
        const parts = [
            `role=${user.role}`,
            user.experienceLevel ? `experienceLevel=${user.experienceLevel}` : null,
            user.discipline ? `discipline=${user.discipline}` : null,
        ].filter(Boolean);
        return parts.length > 0 ? `[User context: ${parts.join(", ")}]\n` : "";
    };

    const sendMessage = async (text: string) => {
        if (!text.trim() || isTyping) return;
        const userMsg: Message = {
            id: Date.now().toString(),
            text,
            sender: "user",
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMsg]);
        setInputValue("");
        setIsTyping(true);
        setShowQuickActions(false);

        try {
            const fullMessage = buildUserContext() + text;
            const res = await chatApi.sendMessage(fullMessage, sessionId, token || null);
            if (res.success && res.data) {
                const data = res.data;
                setMessages((prev) => [
                    ...prev,
                    {
                        id: (Date.now() + 1).toString(),
                        text: data.response,
                        sender: "bot",
                        timestamp: new Date(),
                        links: data.links,
                    },
                ]);
            } else {
                throw new Error("No response");
            }
        } catch {
            setMessages((prev) => [
                ...prev,
                {
                    id: (Date.now() + 1).toString(),
                    text: "Connection issue. Try [Predictions](/prediction), [Training](/training), or [Events](/events) directly.",
                    sender: "bot",
                    timestamp: new Date(),
                },
            ]);
        } finally {
            setIsTyping(false);
        }
    };

    const clearHistory = () => {
        if (user?.id) localStorage.removeItem(getStorageKey(user.id));
        const welcome: Message = {
            id: "welcome",
            text: DEFAULT_WELCOME,
            sender: "bot",
            timestamp: new Date(),
        };
        setMessages([welcome]);
        setShowQuickActions(true);
    };

    return (
        <>
            {/* Floating trigger */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        onClick={() => setIsOpen(true)}
                        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-red-600 hover:bg-red-700 rounded-full shadow-lg shadow-red-200 flex items-center justify-center transition-colors"
                    >
                        <MessageCircle className="w-6 h-6 text-white" />
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-white animate-pulse" />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Backdrop */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                    />
                )}
            </AnimatePresence>

            {/* Side panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ x: 440 }}
                        animate={{ x: 0 }}
                        exit={{ x: 440 }}
                        transition={{ type: "spring", stiffness: 320, damping: 34 }}
                        className="fixed right-0 top-0 h-screen w-[420px] z-50 bg-white border-l border-gray-200 shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-red-900 px-5 py-4 flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
                                    <Bot className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-white font-bold text-sm leading-tight font-heading">
                                        Oracle AI
                                    </p>
                                    <div className="flex items-center gap-1.5">
                                        <div
                                            className={`w-1.5 h-1.5 rounded-full ${
                                                isTyping ? "bg-amber-400 animate-pulse" : "bg-green-400"
                                            }`}
                                        />
                                        <p className="text-white/60 text-xs">
                                            {isTyping ? "Thinking…" : "MMA Expert · Online"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <button
                                    onClick={clearHistory}
                                    title="Clear conversation"
                                    className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Messages area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex gap-2 ${
                                        msg.sender === "user" ? "justify-end" : "justify-start"
                                    }`}
                                >
                                    {msg.sender === "bot" && (
                                        <div className="w-7 h-7 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <Bot className="w-3.5 h-3.5 text-white" />
                                        </div>
                                    )}
                                    <div
                                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                                            msg.sender === "user"
                                                ? "bg-red-600 text-white rounded-br-sm shadow-sm"
                                                : "bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm"
                                        }`}
                                    >
                                        <div
                                            className="text-sm leading-relaxed"
                                            dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }}
                                        />
                                        {msg.links && msg.links.length > 0 && (
                                            <div className="mt-2 pt-2 border-t border-gray-100 flex flex-wrap gap-1.5">
                                                {msg.links.map((link, i) => (
                                                    <Link
                                                        key={i}
                                                        href={link.url}
                                                        onClick={() => setIsOpen(false)}
                                                        className="flex items-center gap-1 text-xs bg-red-50 border border-red-100 text-red-600 hover:bg-red-100 px-2.5 py-1 rounded-full transition-colors font-medium"
                                                    >
                                                        <ExternalLink className="w-3 h-3" />
                                                        {link.label}
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                        <span
                                            className={`text-xs mt-1.5 block ${
                                                msg.sender === "user" ? "text-red-200" : "text-gray-400"
                                            }`}
                                        >
                                            {msg.timestamp.toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </span>
                                    </div>
                                </div>
                            ))}

                            {isTyping && (
                                <div className="flex gap-2 justify-start">
                                    <div className="w-7 h-7 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                                        <Bot className="w-3.5 h-3.5 text-white" />
                                    </div>
                                    <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                                        <div className="flex items-center gap-1">
                                            <div
                                                className="w-2 h-2 bg-red-500 rounded-full animate-bounce"
                                                style={{ animationDelay: "0ms" }}
                                            />
                                            <div
                                                className="w-2 h-2 bg-red-500 rounded-full animate-bounce"
                                                style={{ animationDelay: "150ms" }}
                                            />
                                            <div
                                                className="w-2 h-2 bg-red-500 rounded-full animate-bounce"
                                                style={{ animationDelay: "300ms" }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Quick actions */}
                        <AnimatePresence>
                            {showQuickActions && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="px-4 py-3 bg-white border-t border-gray-100 flex-shrink-0 overflow-hidden"
                                >
                                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">
                                        Quick Actions
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {quickActions.map((action, i) => (
                                            <button
                                                key={i}
                                                onClick={() => sendMessage(action)}
                                                className="text-xs bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-200 text-gray-600 hover:text-red-700 px-3 py-1.5 rounded-full transition-all font-medium"
                                            >
                                                {action}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Input */}
                        <div className="p-4 bg-white border-t border-gray-100 flex-shrink-0">
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    sendMessage(inputValue);
                                }}
                                className="flex gap-2"
                            >
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="Ask anything about MMA…"
                                    disabled={isTyping}
                                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-400 focus:bg-white transition-colors text-sm disabled:opacity-50"
                                />
                                <button
                                    type="submit"
                                    disabled={isTyping || !inputValue.trim()}
                                    className="bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white px-4 py-3 rounded-xl transition-colors"
                                >
                                    {isTyping ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
