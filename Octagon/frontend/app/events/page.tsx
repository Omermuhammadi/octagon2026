"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { eventApi, Event as EventData, EventFight } from "@/lib/api";
import {
    Calendar, MapPin, Search, Loader2, ChevronDown, ChevronUp,
    Trophy, Clock, RefreshCw, Swords, Shield, Crown, Flame
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type TabFilter = "upcoming" | "completed" | "all";

function getCountdown(dateStr: string): string {
    const diff = new Date(dateStr).getTime() - Date.now();
    if (diff <= 0) return "Event started";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 30) {
        const months = Math.floor(days / 30);
        return `${months}mo ${days % 30}d`;
    }
    if (days > 0) return `${days}d ${hours}h`;
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m`;
}

function getFightLabel(position: number, totalFights: number): string | null {
    if (position === 1) return "MAIN EVENT";
    if (position === 2) return "CO-MAIN EVENT";
    return null;
}

export default function EventsPage() {
    const { token, isAuthenticated } = useAuth();

    const [events, setEvents] = useState<EventData[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<TabFilter>("upcoming");
    const [search, setSearch] = useState("");
    const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
    const [fightCards, setFightCards] = useState<Record<string, EventFight[]>>({});
    const [loadingFights, setLoadingFights] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchEvents();
    }, [tab, page]);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const status = tab === "all" ? undefined : tab;
            const response = await eventApi.getEvents(page, 20, status);
            setEvents(response.data || []);
            if (response.pagination) {
                setTotalPages(response.pagination.totalPages);
            }
        } catch (err) {
            console.error("Failed to fetch events:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        if (!token || syncing) return;
        setSyncing(true);
        try {
            await eventApi.syncEvents(token);
            await fetchEvents();
        } catch (err) {
            console.error("Sync failed:", err);
        } finally {
            setSyncing(false);
        }
    };

    const toggleFightCard = async (event: EventData) => {
        const id = event._id;
        if (expandedEvent === id) {
            setExpandedEvent(null);
            return;
        }
        setExpandedEvent(id);

        if (fightCards[id]) return;
        if (event.fights && event.fights.length > 0) {
            setFightCards((prev) => ({ ...prev, [id]: event.fights! }));
            return;
        }

        setLoadingFights(id);
        try {
            const response = await eventApi.getEventFightCard(id);
            setFightCards((prev) => ({ ...prev, [id]: response.data || [] }));
        } catch {
            setFightCards((prev) => ({ ...prev, [id]: [] }));
        } finally {
            setLoadingFights(null);
        }
    };

    const filteredEvents = search.trim()
        ? events.filter(
              (e) =>
                  e.name.toLowerCase().includes(search.toLowerCase()) ||
                  e.location?.toLowerCase().includes(search.toLowerCase()) ||
                  e.venue?.toLowerCase().includes(search.toLowerCase())
          )
        : events;

    const tabCounts = useMemo(() => ({
        upcoming: events.length,
        completed: events.length,
        all: events.length,
    }), [events]);

    return (
        <div className="min-h-screen bg-black text-white pt-28 pb-16">
            {/* Hero Header */}
            <div className="relative overflow-hidden mb-10">
                <div className="absolute inset-0 bg-gradient-to-b from-octagon-red/10 via-black/0 to-black pointer-events-none" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-octagon-red/5 rounded-full blur-[120px] pointer-events-none" />

                <div className="relative max-w-6xl mx-auto px-4">
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-1 h-8 bg-octagon-red rounded-full" />
                                <span className="text-xs font-bold uppercase tracking-[0.2em] text-octagon-red">
                                    Event Tracker
                                </span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-display italic tracking-tight leading-none">
                                UFC <span className="text-octagon-red">FIGHT</span> SCHEDULE
                            </h1>
                            <p className="text-gray-500 mt-2 text-sm">
                                Upcoming bouts, full fight cards, and live results — auto-synced daily
                            </p>
                        </div>
                        {isAuthenticated && (
                            <button
                                onClick={handleSync}
                                disabled={syncing}
                                className="group flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl hover:border-octagon-red/30 hover:bg-octagon-red/5 transition-all text-sm disabled:opacity-50 self-start md:self-auto"
                            >
                                <RefreshCw className={`w-4 h-4 text-gray-400 group-hover:text-octagon-red transition-colors ${syncing ? "animate-spin" : ""}`} />
                                <span className="text-gray-300 group-hover:text-white transition-colors">
                                    {syncing ? "Syncing..." : "Sync Events"}
                                </span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4">
                {/* Tabs + Search */}
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    <div className="flex bg-white/[0.03] border border-white/10 rounded-xl p-1 gap-1">
                        {(["upcoming", "completed", "all"] as TabFilter[]).map((t) => (
                            <button
                                key={t}
                                onClick={() => { setTab(t); setPage(1); }}
                                className={`relative px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                                    tab === t
                                        ? "bg-octagon-red text-white shadow-lg shadow-octagon-red/20"
                                        : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                                }`}
                            >
                                {t === "upcoming" && <Clock className="w-3 h-3 inline mr-1.5 -mt-0.5" />}
                                {t === "completed" && <Trophy className="w-3 h-3 inline mr-1.5 -mt-0.5" />}
                                {t === "all" && <Flame className="w-3 h-3 inline mr-1.5 -mt-0.5" />}
                                {t}
                            </button>
                        ))}
                    </div>
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                        <input
                            type="text"
                            placeholder="Search events, venues..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-octagon-red/40 focus:bg-white/[0.05] text-sm transition-all"
                        />
                    </div>
                </div>

                {/* Events List */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <Loader2 className="w-10 h-10 animate-spin text-octagon-red mb-4" />
                        <span className="text-sm text-gray-500">Loading events...</span>
                    </div>
                ) : filteredEvents.length === 0 ? (
                    <div className="text-center py-24">
                        <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-800" />
                        <p className="text-lg text-gray-500 font-medium">No events found</p>
                        <p className="text-sm text-gray-600 mt-1">Try a different filter or search term</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredEvents.map((event, i) => (
                            <EventCard
                                key={event._id}
                                event={event}
                                index={i}
                                isExpanded={expandedEvent === event._id}
                                fights={fightCards[event._id] || event.fights || []}
                                isLoadingFights={loadingFights === event._id}
                                onToggle={() => toggleFightCard(event)}
                            />
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-10">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm disabled:opacity-20 hover:bg-white/10 hover:border-white/20 transition-all font-medium"
                        >
                            Prev
                        </button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                            const pageNum = start + i;
                            if (pageNum > totalPages) return null;
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => setPage(pageNum)}
                                    className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
                                        page === pageNum
                                            ? "bg-octagon-red text-white shadow-lg shadow-octagon-red/20"
                                            : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                                    }`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm disabled:opacity-20 hover:bg-white/10 hover:border-white/20 transition-all font-medium"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ============================================
   EVENT CARD COMPONENT
   ============================================ */

function EventCard({
    event,
    index,
    isExpanded,
    fights,
    isLoadingFights,
    onToggle,
}: {
    event: EventData;
    index: number;
    isExpanded: boolean;
    fights: EventFight[];
    isLoadingFights: boolean;
    onToggle: () => void;
}) {
    const isUpcoming = event.status === "upcoming";
    const hasPoster = !!event.poster || !!event.thumb;
    const mainEvent = fights.find((f) => f.position === 1);
    const eventDate = new Date(event.date);
    const dateFormatted = eventDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
    });

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.3 }}
            className="group rounded-2xl overflow-hidden border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent hover:border-white/10 transition-all duration-300"
        >
            {/* Event Banner */}
            <button onClick={onToggle} className="w-full text-left">
                <div className="relative">
                    {/* Poster background */}
                    {hasPoster && (
                        <div className="absolute inset-0 z-0">
                            <img
                                src={event.poster || event.thumb}
                                alt=""
                                className="w-full h-full object-cover opacity-[0.08]"
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black/70" />
                        </div>
                    )}

                    <div className="relative z-10 px-5 py-5 sm:px-6 sm:py-6 flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center">
                        {/* Date Block */}
                        <div className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl flex flex-col items-center justify-center border ${
                            isUpcoming
                                ? "bg-octagon-red/10 border-octagon-red/30"
                                : "bg-white/5 border-white/10"
                        }`}>
                            <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${
                                isUpcoming ? "text-octagon-red" : "text-gray-500"
                            }`}>
                                {eventDate.toLocaleDateString("en-US", { month: "short" })}
                            </span>
                            <span className="text-2xl sm:text-3xl font-display font-bold text-white leading-none">
                                {eventDate.getDate()}
                            </span>
                            <span className="text-[9px] sm:text-[10px] text-gray-500 uppercase">
                                {eventDate.toLocaleDateString("en-US", { weekday: "short" })}
                            </span>
                        </div>

                        {/* Event Details */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                                <h2 className="text-lg sm:text-xl font-display italic font-bold text-white tracking-tight truncate">
                                    {event.name}
                                </h2>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap ${
                                    isUpcoming
                                        ? "bg-octagon-red/20 text-octagon-red border border-octagon-red/30"
                                        : "bg-green-500/15 text-green-400 border border-green-500/20"
                                }`}>
                                    {isUpcoming ? "Upcoming" : "Completed"}
                                </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-gray-500">
                                <span className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {dateFormatted}
                                </span>
                                {(event.venue || event.city || event.location) && (
                                    <span className="flex items-center gap-1.5">
                                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                        {[event.venue, event.city, event.country].filter(Boolean).join(", ") || event.location}
                                    </span>
                                )}
                                {isUpcoming && (
                                    <span className="flex items-center gap-1.5 text-octagon-red font-semibold">
                                        <Clock className="w-3.5 h-3.5" />
                                        {getCountdown(event.date)}
                                    </span>
                                )}
                            </div>

                            {/* Main Event Preview */}
                            {mainEvent && (
                                <div className="mt-3 flex items-center gap-3">
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-octagon-red bg-octagon-red/10 px-2 py-0.5 rounded">
                                        Main Event
                                    </span>
                                    <span className="text-sm text-gray-300">
                                        <span className={`font-semibold ${mainEvent.winner === mainEvent.fighter1 ? "text-green-400" : "text-white"}`}>
                                            {mainEvent.fighter1}
                                        </span>
                                        <span className="text-gray-600 mx-2">vs</span>
                                        <span className={`font-semibold ${mainEvent.winner === mainEvent.fighter2 ? "text-green-400" : "text-white"}`}>
                                            {mainEvent.fighter2}
                                        </span>
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Right side - poster thumb + expand */}
                        <div className="hidden md:flex items-center gap-4 flex-shrink-0">
                            {hasPoster && (
                                <div className="w-16 h-22 rounded-lg overflow-hidden border border-white/10 shadow-lg">
                                    <img
                                        src={event.thumb || event.poster}
                                        alt={event.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}
                            <div className="flex flex-col items-center gap-1">
                                {fights.length > 0 && (
                                    <span className="text-[10px] text-gray-500 font-bold">
                                        {fights.length} BOUTS
                                    </span>
                                )}
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                    isExpanded ? "bg-octagon-red/20 text-octagon-red" : "bg-white/5 text-gray-500 group-hover:bg-white/10"
                                }`}>
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </div>
                            </div>
                        </div>

                        {/* Mobile expand indicator */}
                        <div className="sm:hidden absolute top-5 right-5">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                                isExpanded ? "bg-octagon-red/20 text-octagon-red" : "bg-white/5 text-gray-500"
                            }`}>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </div>
                        </div>
                    </div>
                </div>
            </button>

            {/* Fight Card */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="overflow-hidden"
                    >
                        <div className="border-t border-white/[0.06]">
                            {isLoadingFights ? (
                                <div className="flex items-center justify-center py-10">
                                    <Loader2 className="w-6 h-6 animate-spin text-octagon-red" />
                                    <span className="ml-3 text-sm text-gray-500">Loading fight card...</span>
                                </div>
                            ) : fights.length === 0 ? (
                                <div className="py-10 text-center">
                                    <Swords className="w-10 h-10 mx-auto mb-3 text-gray-800" />
                                    <p className="text-sm text-gray-500">Fight card not available yet</p>
                                    <p className="text-xs text-gray-600 mt-1">Check back closer to the event date</p>
                                </div>
                            ) : (
                                <FightCardList fights={fights} isCompleted={event.status === "completed"} />
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

/* ============================================
   FIGHT CARD LIST
   ============================================ */

function FightCardList({ fights, isCompleted }: { fights: EventFight[]; isCompleted: boolean }) {
    const sorted = [...fights].sort((a, b) => a.position - b.position);
    const mainCard = sorted.filter((f) => f.position <= 5);
    const prelims = sorted.filter((f) => f.position > 5);

    return (
        <div className="px-4 sm:px-6 py-5">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <Swords className="w-4 h-4 text-octagon-red" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">
                    Fight Card
                </h3>
                <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent ml-2" />
                <span className="text-[10px] text-gray-600 font-medium">
                    {fights.length} Bouts
                </span>
            </div>

            {/* Main Card */}
            {mainCard.length > 0 && (
                <div className="space-y-2 mb-4">
                    {mainCard.map((fight, i) => (
                        <FightRow
                            key={i}
                            fight={fight}
                            totalFights={fights.length}
                            isCompleted={isCompleted}
                        />
                    ))}
                </div>
            )}

            {/* Prelims Divider */}
            {prelims.length > 0 && (
                <>
                    <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 h-px bg-white/[0.06]" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 flex items-center gap-1.5">
                            <Shield className="w-3 h-3" />
                            Preliminary Card
                        </span>
                        <div className="flex-1 h-px bg-white/[0.06]" />
                    </div>
                    <div className="space-y-2">
                        {prelims.map((fight, i) => (
                            <FightRow
                                key={i}
                                fight={fight}
                                totalFights={fights.length}
                                isCompleted={isCompleted}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

/* ============================================
   INDIVIDUAL FIGHT ROW
   ============================================ */

function FightRow({
    fight,
    totalFights,
    isCompleted,
}: {
    fight: EventFight;
    totalFights: number;
    isCompleted: boolean;
}) {
    const label = getFightLabel(fight.position, totalFights);
    const isMainEvent = fight.position === 1;
    const f1Won = fight.winner === fight.fighter1;
    const f2Won = fight.winner === fight.fighter2;
    const hasResult = f1Won || f2Won;

    return (
        <div className={`relative rounded-xl overflow-hidden transition-all ${
            isMainEvent
                ? "bg-gradient-to-r from-octagon-red/[0.08] via-octagon-red/[0.04] to-octagon-red/[0.08] border border-octagon-red/20"
                : "bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08]"
        }`}>
            {/* Fight label */}
            {label && (
                <div className={`text-center py-1 ${
                    isMainEvent
                        ? "bg-octagon-red/20 border-b border-octagon-red/20"
                        : "bg-white/[0.03] border-b border-white/[0.05]"
                }`}>
                    <span className={`text-[9px] font-bold uppercase tracking-[0.2em] ${
                        isMainEvent ? "text-octagon-red" : "text-gray-500"
                    }`}>
                        {isMainEvent && <Crown className="w-3 h-3 inline mr-1 -mt-0.5" />}
                        {label}
                    </span>
                </div>
            )}

            {/* Fighter matchup */}
            <div className="flex items-center px-3 sm:px-5 py-3 sm:py-4">
                {/* Fighter 1 */}
                <div className="flex-1 flex items-center justify-end gap-2 sm:gap-3 min-w-0">
                    {hasResult && f1Won && (
                        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-500/15 text-green-400 text-[9px] font-bold uppercase tracking-wider flex-shrink-0">
                            <Trophy className="w-2.5 h-2.5" />
                            WIN
                        </span>
                    )}
                    <span className={`text-sm sm:text-base font-bold text-right truncate ${
                        f1Won ? "text-green-400" :
                        hasResult && !f1Won ? "text-gray-600" :
                        "text-white"
                    }`}>
                        {fight.fighter1}
                    </span>
                    {f1Won && (
                        <span className="sm:hidden w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                    )}
                </div>

                {/* VS Divider */}
                <div className="flex-shrink-0 mx-3 sm:mx-5">
                    <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center border ${
                        isMainEvent
                            ? "bg-octagon-red/20 border-octagon-red/30 text-octagon-red"
                            : hasResult
                            ? "bg-green-500/10 border-green-500/20 text-green-500/70"
                            : "bg-white/5 border-white/10 text-gray-600"
                    }`}>
                        <span className="text-[10px] sm:text-xs font-black">VS</span>
                    </div>
                </div>

                {/* Fighter 2 */}
                <div className="flex-1 flex items-center gap-2 sm:gap-3 min-w-0">
                    {f2Won && (
                        <span className="sm:hidden w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                    )}
                    <span className={`text-sm sm:text-base font-bold truncate ${
                        f2Won ? "text-green-400" :
                        hasResult && !f2Won ? "text-gray-600" :
                        "text-white"
                    }`}>
                        {fight.fighter2}
                    </span>
                    {hasResult && f2Won && (
                        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-500/15 text-green-400 text-[9px] font-bold uppercase tracking-wider flex-shrink-0">
                            <Trophy className="w-2.5 h-2.5" />
                            WIN
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
