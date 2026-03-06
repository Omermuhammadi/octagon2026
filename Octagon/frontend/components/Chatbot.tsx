"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Minimize2, Loader2, ExternalLink } from "lucide-react";
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

const quickActions = [
    "How do I improve my jab?",
    "Find gyms near me",
    "Predict a fight",
    "Show training roadmaps",
    "What gear do I need?",
    "Self-defense tips",
    "Tell me about Conor McGregor",
    "I'm a beginner",
];

export function Chatbot() {
    const { token } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "1",
            text: "Hey! I'm Oracle AI, your MMA assistant. I can help with fight predictions, training, finding gyms, gear recommendations, and more. What would you like to know?",
            sender: "bot",
            timestamp: new Date(),
        },
    ]);
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    const [showQuickActions, setShowQuickActions] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const sendMessage = async (text: string) => {
        if (!text.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            text,
            sender: "user",
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);
        setInputValue("");
        setIsTyping(true);
        setShowQuickActions(false);

        try {
            // Works with or without auth token
            const res = await chatApi.sendMessage(text, sessionId, token || null);
            if (res.success && res.data) {
                const botMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    text: res.data.response,
                    sender: "bot",
                    timestamp: new Date(),
                    links: res.data.links,
                };
                setMessages((prev) => [...prev, botMessage]);
            } else {
                throw new Error("Failed to get response");
            }
        } catch {
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: "Sorry, I'm having trouble connecting right now. You can try:\n\n- Fight predictions on the Predictions page\n- Training roadmaps on the Training page\n- Finding gyms on the Gyms page\n\nOr try again in a moment!",
                sender: "bot",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsTyping(false);
        }
    };

    // Format markdown-like bold text with HTML escaping
    const formatText = (text: string) => {
        const escaped = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
        return escaped
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br/>');
    };

    return (
        <>
            {/* Floating Button */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        onClick={() => setIsOpen(true)}
                        className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-red-600 hover:bg-red-500 rounded-full shadow-2xl flex items-center justify-center transition-all group"
                    >
                        <MessageCircle className="w-7 h-7 text-white group-hover:scale-110 transition-transform" />
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full animate-pulse" />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className={`fixed bottom-6 right-6 z-50 w-96 bg-neutral-900 border border-white/20 rounded-2xl shadow-2xl overflow-hidden ${
                            isMinimized ? "h-16" : "h-[600px]"
                        } transition-all flex flex-col`}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-red-600 to-red-700 p-4 flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                    <MessageCircle className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-lg">Oracle AI</h3>
                                    <p className="text-white/70 text-xs">
                                        {isTyping ? "Typing..." : "Online - Ask me anything"}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setIsMinimized(!isMinimized)} className="text-white/70 hover:text-white transition-colors">
                                    <Minimize2 className="w-5 h-5" />
                                </button>
                                <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {!isMinimized && (
                            <>
                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/40">
                                    {messages.map((message) => (
                                        <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                                            <div className={`max-w-[85%] rounded-2xl p-3 ${
                                                message.sender === "user"
                                                    ? "bg-red-600 text-white rounded-br-sm"
                                                    : "bg-white/10 text-gray-200 border border-white/10 rounded-bl-sm"
                                            }`}>
                                                <p
                                                    className="text-sm leading-relaxed"
                                                    dangerouslySetInnerHTML={{ __html: formatText(message.text) }}
                                                />
                                                {/* Links */}
                                                {message.links && message.links.length > 0 && (
                                                    <div className="mt-2 space-y-1 border-t border-white/10 pt-2">
                                                        {message.links.map((link, idx) => (
                                                            <Link key={idx} href={link.url}
                                                                onClick={() => setIsOpen(false)}
                                                                className="flex items-center gap-1 text-xs text-red-300 hover:text-red-200 transition-colors"
                                                            >
                                                                <ExternalLink className="w-3 h-3" />
                                                                {link.label}
                                                            </Link>
                                                        ))}
                                                    </div>
                                                )}
                                                <span className="text-xs opacity-50 mt-1 block">
                                                    {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                </span>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Typing Indicator */}
                                    {isTyping && (
                                        <div className="flex justify-start">
                                            <div className="bg-white/10 border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3">
                                                <div className="flex items-center gap-1">
                                                    <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                                    <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                                    <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Quick Actions */}
                                {showQuickActions && (
                                    <div className="px-4 py-2 bg-black/20 border-t border-white/10 flex-shrink-0">
                                        <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Quick Actions</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {quickActions.map((action, idx) => (
                                                <button key={idx} onClick={() => sendMessage(action)}
                                                    className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 px-2.5 py-1 rounded-full transition-colors"
                                                >
                                                    {action}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Input */}
                                <div className="p-4 bg-black/40 border-t border-white/10 flex-shrink-0">
                                    <form onSubmit={(e) => { e.preventDefault(); sendMessage(inputValue); }} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            placeholder="Ask me anything about MMA..."
                                            disabled={isTyping}
                                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 transition-colors disabled:opacity-50"
                                        />
                                        <button type="submit" disabled={isTyping || !inputValue.trim()}
                                            className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white p-2.5 rounded-xl transition-colors"
                                        >
                                            {isTyping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                        </button>
                                    </form>
                                </div>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
