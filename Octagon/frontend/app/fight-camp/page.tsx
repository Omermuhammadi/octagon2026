"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/contexts/AuthContext";
import {
    fightCampApi,
    FightCamp,
    Milestone,
    SparringEntry,
} from "@/lib/api";
import {
    Swords, Calendar, Flag, CheckCircle2, Circle,
    Plus, Loader2, ChevronRight, Star, Trash2,
    Users, Clock, Target, Trophy, Zap, X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

// ─── helpers ─────────────────────────────────────────────────────────────────

function daysUntil(date: string): number {
    return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
}

function fmt(date: string): string {
    return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fmtShort(date: string): string {
    return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const WEIGHT_CLASSES = [
    "Strawweight", "Flyweight", "Bantamweight", "Featherweight",
    "Lightweight", "Welterweight", "Middleweight", "Light Heavyweight", "Heavyweight",
];

// ─── sub-components ───────────────────────────────────────────────────────────

function Countdown({ fightDate }: { fightDate: string }) {
    const days = daysUntil(fightDate);
    const urgency = days <= 7 ? "text-red-500" : days <= 21 ? "text-amber-500" : "text-emerald-500";
    return (
        <div className="flex flex-col items-center">
            <span className={`text-6xl font-black tabular-nums ${urgency}`}>{Math.max(0, days)}</span>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Days to Fight</span>
            <span className="text-sm text-gray-500 mt-1">{fmt(fightDate)}</span>
        </div>
    );
}

function MilestoneRow({
    ms,
    campId,
    token,
    onUpdate,
}: {
    ms: Milestone;
    campId: string;
    token: string;
    onUpdate: (updated: FightCamp) => void;
}) {
    const [saving, setSaving] = useState(false);

    const toggle = async () => {
        setSaving(true);
        const r = await fightCampApi.updateMilestone(campId, ms._id, { completed: !ms.completed }, token);
        if (r.success && r.data) onUpdate(r.data);
        setSaving(false);
    };

    return (
        <motion.div
            layout
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer hover:shadow-sm ${ms.completed
                ? "bg-emerald-50 border-emerald-200"
                : "bg-white border-gray-100 hover:border-red-200"
                }`}
            onClick={toggle}
        >
            {saving ? (
                <Loader2 className="w-5 h-5 text-gray-400 animate-spin flex-shrink-0" />
            ) : ms.completed ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            ) : (
                <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />
            )}
            <span className={`text-sm font-medium flex-1 ${ms.completed ? "line-through text-gray-400" : "text-gray-800"}`}>
                {ms.title}
            </span>
            {ms.targetDate && (
                <span className="text-xs text-gray-400 whitespace-nowrap">{fmtShort(ms.targetDate)}</span>
            )}
        </motion.div>
    );
}

function SparringCard({ entry, onDelete }: { entry: SparringEntry; onDelete: () => void }) {
    const stars = Array.from({ length: 5 }, (_, i) => i < entry.performanceRating);
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-gray-100 rounded-xl p-4 flex items-start gap-3"
        >
            <div className="w-10 h-10 bg-red-50 border border-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold text-gray-900 text-sm">{entry.partnerName}</span>
                    <span className="text-xs text-gray-400">· {entry.rounds} rds</span>
                </div>
                <div className="flex items-center gap-0.5 mb-1">
                    {stars.map((filled, i) => (
                        <Star key={i} className={`w-3 h-3 ${filled ? "text-amber-400 fill-amber-400" : "text-gray-200"}`} />
                    ))}
                </div>
                {entry.notes && <p className="text-xs text-gray-500 leading-relaxed">{entry.notes}</p>}
                <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-gray-400">{fmtShort(entry.date)}</span>
                    {entry.tags.map(t => (
                        <span key={t} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-full uppercase">{t}</span>
                    ))}
                </div>
            </div>
            <button onClick={onDelete} className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
            </button>
        </motion.div>
    );
}

// ─── create fight camp modal ──────────────────────────────────────────────────

function CreateCampModal({ token, onCreated, onClose }: {
    token: string;
    onCreated: (camp: FightCamp) => void;
    onClose: () => void;
}) {
    const [form, setForm] = useState({
        opponentName: "", opponentRecord: "", fightDate: "", weightClass: "", venue: "", notes: "",
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.opponentName || !form.fightDate || !form.weightClass) {
            setError("Opponent name, fight date, and weight class are required.");
            return;
        }
        setSaving(true);
        const r = await fightCampApi.create(form, token);
        setSaving(false);
        if (r.success && r.data) { onCreated(r.data); }
        else setError(r.message || "Failed to create fight camp.");
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <motion.div
                initial={{ scale: 0.95, y: 16 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 16 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6"
            >
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-black text-gray-900">New Fight Camp</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Opponent Name *</label>
                            <input value={form.opponentName} onChange={e => set("opponentName", e.target.value)}
                                placeholder="e.g. Jon Jones" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-400" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Opponent Record</label>
                            <input value={form.opponentRecord} onChange={e => set("opponentRecord", e.target.value)}
                                placeholder="e.g. 27-1-0" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-400" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Weight Class *</label>
                            <select value={form.weightClass} onChange={e => set("weightClass", e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-400">
                                <option value="">Select...</option>
                                {WEIGHT_CLASSES.map(w => <option key={w}>{w}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Fight Date *</label>
                            <input type="date" value={form.fightDate} onChange={e => set("fightDate", e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-400" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Venue</label>
                            <input value={form.venue} onChange={e => set("venue", e.target.value)}
                                placeholder="e.g. T-Mobile Arena, Las Vegas" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-400" />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Notes</label>
                            <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2}
                                placeholder="Any additional context..." className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-400 resize-none" />
                        </div>
                    </div>
                    {error && <p className="text-xs text-red-600">{error}</p>}
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            {saving ? "Creating..." : "Create Camp"}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

// ─── add sparring modal ────────────────────────────────────────────────────────

function AddSparringModal({ token, campId, onAdded, onClose }: {
    token: string;
    campId?: string;
    onAdded: (e: SparringEntry) => void;
    onClose: () => void;
}) {
    const [form, setForm] = useState({
        partnerName: "", date: new Date().toISOString().slice(0, 10), rounds: "3",
        performanceRating: "3", notes: "", tags: [] as string[],
    });
    const [saving, setSaving] = useState(false);
    const TAG_OPTIONS = ["striking", "grappling", "clinch", "cardio", "defense", "ground"];

    const toggleTag = (t: string) => setForm(f => ({
        ...f, tags: f.tags.includes(t) ? f.tags.filter(x => x !== t) : [...f.tags, t],
    }));

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.partnerName) return;
        setSaving(true);
        const r = await fightCampApi.addSparring({
            partnerName: form.partnerName,
            date: form.date,
            rounds: Number(form.rounds),
            performanceRating: Number(form.performanceRating),
            notes: form.notes,
            tags: form.tags,
            fightCampId: campId,
        }, token);
        setSaving(false);
        if (r.success && r.data) onAdded(r.data);
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            >
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-black text-gray-900">Log Sparring Session</h2>
                    <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
                </div>
                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Partner Name *</label>
                        <input value={form.partnerName} onChange={e => setForm(f => ({ ...f, partnerName: e.target.value }))}
                            placeholder="Sparring partner's name" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-400" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Date</label>
                            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-400" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Rounds</label>
                            <select value={form.rounds} onChange={e => setForm(f => ({ ...f, rounds: e.target.value }))}
                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-400">
                                {[1, 2, 3, 4, 5, 6, 8, 10, 12].map(n => <option key={n}>{n}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Performance ({form.performanceRating}/5)</label>
                        <input type="range" min={1} max={5} value={form.performanceRating}
                            onChange={e => setForm(f => ({ ...f, performanceRating: e.target.value }))}
                            className="w-full accent-red-600" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Focus Areas</label>
                        <div className="flex flex-wrap gap-2">
                            {TAG_OPTIONS.map(t => (
                                <button type="button" key={t} onClick={() => toggleTag(t)}
                                    className={`px-2.5 py-1 rounded-full text-xs font-bold transition-colors border ${form.tags.includes(t) ? "bg-red-600 text-white border-red-600" : "bg-gray-50 text-gray-600 border-gray-200 hover:border-red-300"}`}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Notes</label>
                        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                            rows={2} placeholder="What went well? What to improve?" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-400 resize-none" />
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={saving || !form.partnerName}
                            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Log Session
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function FightCampPage() {
    const { user, isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const [camp, setCamp] = useState<FightCamp | null>(null);
    const [sparring, setSparring] = useState<SparringEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [showSparring, setShowSparring] = useState(false);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) router.push("/login");
    }, [isAuthenticated, isLoading, router]);

    const load = async () => {
        const token = getAuthToken();
        if (!token) return;
        setLoading(true);
        const [campRes, sparRes] = await Promise.all([
            fightCampApi.getActive(token),
            fightCampApi.listSparring(token),
        ]);
        if (campRes.success) setCamp(campRes.data ?? null);
        if (sparRes.success && sparRes.data) setSparring(sparRes.data);
        setLoading(false);
    };

    useEffect(() => { if (isAuthenticated) load(); }, [isAuthenticated]);

    const token = getAuthToken() || "";

    const completedMilestones = camp?.milestones.filter(m => m.completed).length ?? 0;
    const totalMilestones = camp?.milestones.length ?? 0;
    const progress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

    const totalRounds = sparring.reduce((s, e) => s + e.rounds, 0);
    const avgRating = sparring.length > 0
        ? (sparring.reduce((s, e) => s + e.performanceRating, 0) / sparring.length).toFixed(1)
        : "—";

    if (isLoading || !isAuthenticated) {
        return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-red-600" /></div>;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero */}
            <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-red-900 text-white pt-24 pb-10 px-4 mb-8">
                <div className="max-w-5xl mx-auto">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <span className="px-3 py-1 rounded-full bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-widest">Fight Camp</span>
                            <h1 className="text-3xl md:text-4xl font-black tracking-tight mt-2 mb-1">
                                {camp ? (
                                    <>vs <span className="text-red-400">{camp.opponentName}</span></>
                                ) : (
                                    "No Active Camp"
                                )}
                            </h1>
                            {camp && (
                                <p className="text-gray-400 text-sm">{camp.weightClass} · {camp.venue || "Venue TBD"}</p>
                            )}
                        </div>
                        {!loading && !camp && (
                            <button onClick={() => setShowCreate(true)}
                                className="flex-shrink-0 px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl flex items-center gap-2 transition-colors">
                                <Plus className="w-4 h-4" /> New Camp
                            </button>
                        )}
                        {camp && (
                            <Link href="/opponent-dossier"
                                className="flex-shrink-0 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 border border-white/20 transition-colors">
                                <Target className="w-3.5 h-3.5" /> AI Game Plan
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 pb-16">
                {loading ? (
                    <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-red-600" /></div>
                ) : !camp ? (
                    /* Empty state */
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl border border-gray-200 p-12 text-center"
                    >
                        <Swords className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h2 className="text-xl font-black text-gray-900 mb-2">Start Your Fight Camp</h2>
                        <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">
                            Enter your opponent, fight date, and weight class to get a personalised preparation plan with 10 milestones and sparring journal.
                        </p>
                        <button onClick={() => setShowCreate(true)}
                            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center gap-2 mx-auto transition-colors">
                            <Plus className="w-4 h-4" /> Create Fight Camp
                        </button>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* LEFT: countdown + milestones */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Countdown card */}
                            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-red-600" />
                                        <h2 className="font-black text-gray-900 uppercase tracking-wide text-sm">Fight Countdown</h2>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${camp.status === 'upcoming' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                        {camp.status}
                                    </span>
                                </div>
                                <div className="flex items-center gap-8 flex-wrap">
                                    <Countdown fightDate={camp.fightDate} />
                                    <div className="flex-1 min-w-[200px]">
                                        <div className="grid grid-cols-3 gap-3">
                                            {[
                                                { label: "Camp Progress", value: `${progress}%`, icon: Trophy, color: "text-emerald-600", bg: "bg-emerald-50" },
                                                { label: "Sparring Sessions", value: sparring.length, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
                                                { label: "Total Rounds", value: totalRounds, icon: Zap, color: "text-amber-600", bg: "bg-amber-50" },
                                            ].map(s => (
                                                <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
                                                    <s.icon className={`w-4 h-4 ${s.color} mx-auto mb-1`} />
                                                    <div className={`text-lg font-black ${s.color}`}>{s.value}</div>
                                                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider leading-tight">{s.label}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                {/* Progress bar */}
                                <div className="mt-5">
                                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                                        <span className="font-bold">{completedMilestones}/{totalMilestones} milestones</span>
                                        <span className="font-bold text-emerald-600">{progress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <motion.div
                                            className="h-2 bg-emerald-500 rounded-full"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progress}%` }}
                                            transition={{ duration: 0.6, ease: "easeOut" }}
                                        />
                                    </div>
                                </div>
                            </motion.div>

                            {/* Milestones */}
                            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
                            >
                                <div className="flex items-center gap-2 mb-4">
                                    <Flag className="w-5 h-5 text-red-600" />
                                    <h2 className="font-black text-gray-900 uppercase tracking-wide text-sm">Camp Milestones</h2>
                                </div>
                                <div className="space-y-2">
                                    {camp.milestones.map(ms => (
                                        <MilestoneRow
                                            key={ms._id}
                                            ms={ms}
                                            campId={camp._id}
                                            token={token}
                                            onUpdate={setCamp}
                                        />
                                    ))}
                                </div>
                                {camp.notes && (
                                    <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <p className="text-xs text-gray-500 leading-relaxed">{camp.notes}</p>
                                    </div>
                                )}
                            </motion.div>
                        </div>

                        {/* RIGHT: sparring journal + quick links */}
                        <div className="space-y-6">
                            {/* Quick links */}
                            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-2"
                            >
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Fight Camp Tools</p>
                                {[
                                    { label: "Weight Cut Tracker", href: "/weight-cut", icon: Target, color: "text-blue-600", bg: "bg-blue-50" },
                                    { label: "AI Opponent Dossier", href: "/opponent-dossier", icon: Swords, color: "text-red-600", bg: "bg-red-50" },
                                    { label: "Assignments", href: "/assignments", icon: Calendar, color: "text-emerald-600", bg: "bg-emerald-50" },
                                ].map(l => (
                                    <Link key={l.label} href={l.href}
                                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
                                    >
                                        <div className={`w-8 h-8 ${l.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                            <l.icon className={`w-4 h-4 ${l.color}`} />
                                        </div>
                                        <span className="text-sm font-bold text-gray-700 group-hover:text-gray-900">{l.label}</span>
                                        <ChevronRight className="w-3.5 h-3.5 text-gray-300 ml-auto group-hover:text-gray-500" />
                                    </Link>
                                ))}
                            </motion.div>

                            {/* Sparring journal */}
                            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-red-600" />
                                        <h3 className="font-black text-gray-900 uppercase tracking-wide text-xs">Sparring Journal</h3>
                                    </div>
                                    <button onClick={() => setShowSparring(true)}
                                        className="flex items-center gap-1 px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors">
                                        <Plus className="w-3 h-3" /> Log
                                    </button>
                                </div>

                                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl mb-3">
                                    <div className="text-center flex-1">
                                        <div className="text-lg font-black text-gray-900">{sparring.length}</div>
                                        <div className="text-[10px] font-bold text-gray-500 uppercase">Sessions</div>
                                    </div>
                                    <div className="h-8 w-px bg-gray-200" />
                                    <div className="text-center flex-1">
                                        <div className="text-lg font-black text-gray-900">{totalRounds}</div>
                                        <div className="text-[10px] font-bold text-gray-500 uppercase">Rounds</div>
                                    </div>
                                    <div className="h-8 w-px bg-gray-200" />
                                    <div className="text-center flex-1">
                                        <div className="text-lg font-black text-amber-500">{avgRating}</div>
                                        <div className="text-[10px] font-bold text-gray-500 uppercase">Avg Rating</div>
                                    </div>
                                </div>

                                <div className="space-y-2 max-h-80 overflow-y-auto">
                                    <AnimatePresence>
                                        {sparring.slice(0, 6).map(e => (
                                            <SparringCard key={e._id} entry={e} onDelete={async () => {
                                                await fightCampApi.deleteSparring(e._id, token);
                                                setSparring(s => s.filter(x => x._id !== e._id));
                                            }} />
                                        ))}
                                    </AnimatePresence>
                                    {sparring.length === 0 && (
                                        <p className="text-xs text-gray-400 text-center py-4">No sparring sessions logged yet.</p>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <AnimatePresence>
                {showCreate && (
                    <CreateCampModal token={token} onCreated={c => { setCamp(c); setShowCreate(false); }} onClose={() => setShowCreate(false)} />
                )}
                {showSparring && (
                    <AddSparringModal token={token} campId={camp?._id} onAdded={e => { setSparring(s => [e, ...s]); setShowSparring(false); }} onClose={() => setShowSparring(false)} />
                )}
            </AnimatePresence>
        </div>
    );
}
