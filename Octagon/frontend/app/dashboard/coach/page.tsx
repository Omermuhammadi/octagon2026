"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
  BarChart2, TrendingUp, Calendar, Users, Loader2, Clock,
  ChevronRight, Flame, Award, Shield, Search, Plus, X, Swords, History,
  UserPlus, AlertCircle, Eye,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  eventApi, fighterApi, strategyApi, coachRosterApi,
  Event, CoachStats, RosterFighter, UpcomingFight, StrategyHistoryItem,
} from "@/lib/api";
import gsap from "gsap";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

interface FighterOption {
  _id: string;
  name: string;
  wins: number;
  losses: number;
  draws: number;
  weight: string;
  slpm: number;
  strikingAccuracy: number;
  stance: string;
}

export default function CoachDashboard() {
  const { user, token, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [recentEvents, setRecentEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [coachStats, setCoachStats] = useState<CoachStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [titleAnimated, setTitleAnimated] = useState(false);

  // ---- Roster state ----
  const [roster, setRoster] = useState<RosterFighter[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(true);
  const [rosterSearch, setRosterSearch] = useState("");
  const [rosterOptions, setRosterOptions] = useState<FighterOption[]>([]);
  const [showRosterDropdown, setShowRosterDropdown] = useState(false);
  const [addingFighter, setAddingFighter] = useState(false);
  const [rosterError, setRosterError] = useState("");

  // ---- Upcoming fights state ----
  const [upcomingFights, setUpcomingFights] = useState<UpcomingFight[]>([]);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);

  // ---- Strategy history state ----
  const [strategyHistory, setStrategyHistory] = useState<StrategyHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // ---- Quick scout state ----
  const [scoutSearch, setScoutSearch] = useState("");
  const [scoutOptions, setScoutOptions] = useState<FighterOption[]>([]);
  const [showScoutDropdown, setShowScoutDropdown] = useState(false);
  const [scoutFighter, setScoutFighter] = useState<FighterOption | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/login");
    else if (!isLoading && user?.role !== "coach") router.push("/dashboard/fan");
  }, [isAuthenticated, isLoading, user, router]);

  // GSAP title animation
  useEffect(() => {
    if (!isLoading && user && titleRef.current && !titleAnimated) {
      setTitleAnimated(true);
      const title = titleRef.current;
      const text = title.innerText;
      const chars = text.split("");
      title.innerHTML = chars
        .map((char) =>
          char === " "
            ? " "
            : `<span class="inline-block opacity-0">${char}</span>`
        )
        .join("");
      gsap.fromTo(
        title.querySelectorAll("span"),
        { opacity: 0, y: 40, rotateX: -90 },
        { opacity: 1, y: 0, rotateX: 0, duration: 0.6, stagger: 0.04, ease: "back.out(1.7)" }
      );
    }
  }, [isLoading, user, titleAnimated]);

  // Fetch recent events
  useEffect(() => {
    eventApi.getRecentEvents(5).then((r) => { if (r.success && r.data) setRecentEvents(r.data); }).catch(() => {}).finally(() => setLoadingEvents(false));
  }, []);

  // Fetch coach stats
  useEffect(() => {
    if (!token) { setLoadingStats(false); return; }
    coachRosterApi.getCoachStats(token).then((r) => { if (r.success && r.data) setCoachStats(r.data); }).catch(() => {}).finally(() => setLoadingStats(false));
  }, [token]);

  // Fetch roster
  useEffect(() => {
    if (!token) return;
    coachRosterApi.getRoster(token).then((r) => { if (r.success && r.data) setRoster(r.data); }).catch(() => {}).finally(() => setLoadingRoster(false));
  }, [token]);

  // Fetch upcoming fights
  useEffect(() => {
    if (!token) return;
    coachRosterApi.getUpcomingFights(token).then((r) => { if (r.success && r.data) setUpcomingFights(r.data); }).catch(() => {}).finally(() => setLoadingUpcoming(false));
  }, [token]);

  // Fetch strategy history
  useEffect(() => {
    if (!token) return;
    strategyApi.getHistory(token, 5).then((r) => { if (r.success && r.data) setStrategyHistory(r.data); }).catch(() => {}).finally(() => setLoadingHistory(false));
  }, [token]);

  // Close dropdowns
  useEffect(() => {
    const handle = () => { setShowRosterDropdown(false); setShowScoutDropdown(false); };
    document.addEventListener("click", handle);
    return () => document.removeEventListener("click", handle);
  }, []);

  // Fighter search (shared)
  const searchFighters = useCallback(async (query: string, setter: (opts: FighterOption[]) => void) => {
    if (query.length < 2) { setter([]); return; }
    try {
      const res = await fighterApi.searchFighters(query, 6);
      if (res.success && res.data) setter(res.data as unknown as FighterOption[]);
    } catch { setter([]); }
  }, []);

  // Roster search debounce
  useEffect(() => {
    const timer = setTimeout(() => searchFighters(rosterSearch, setRosterOptions), 300);
    return () => clearTimeout(timer);
  }, [rosterSearch, searchFighters]);

  // Scout search debounce
  useEffect(() => {
    const timer = setTimeout(() => searchFighters(scoutSearch, setScoutOptions), 300);
    return () => clearTimeout(timer);
  }, [scoutSearch, searchFighters]);

  // Add fighter to roster
  const handleAddToRoster = async (name: string) => {
    if (!token) return;
    setAddingFighter(true);
    setRosterError("");
    try {
      const res = await coachRosterApi.addFighter(name, token);
      if (res.success && res.data) {
        setRoster((prev) => [res.data!, ...prev]);
        setRosterSearch("");
        setRosterOptions([]);
        setShowRosterDropdown(false);
      }
    } catch (e: any) {
      setRosterError(e.message || "Failed to add fighter");
    } finally {
      setAddingFighter(false);
    }
  };

  // Remove fighter from roster
  const handleRemoveFromRoster = async (fighterId: string) => {
    if (!token) return;
    try {
      await coachRosterApi.removeFighter(fighterId, token);
      setRoster((prev) => prev.filter((r) => r.fighterId !== fighterId));
    } catch {}
  };

  const stats = useMemo(() => {
    if (!user) return [];
    return [
      { label: "Roster Size", value: roster.length.toString(), icon: Users },
      { label: "Strategies Generated", value: coachStats?.strategiesGenerated?.toString() || "0", icon: Swords },
      { label: "Upcoming Fights", value: upcomingFights.length.toString(), icon: Calendar },
      { label: "Avg Confidence", value: `${coachStats?.avgConfidence || 0}%`, icon: TrendingUp },
    ];
  }, [user, roster, upcomingFights, coachStats]);

  const formatEventDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-black pt-24 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-octagon-gold/20 rounded-full" />
            <div className="w-16 h-16 border-4 border-octagon-gold border-t-transparent rounded-full animate-spin absolute inset-0" />
          </div>
          <p className="text-gray-400 text-sm">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-24 px-4 sm:px-6 lg:px-8 pb-12">
      <div className="fixed inset-0 bg-gradient-to-br from-octagon-gold/5 via-transparent to-transparent pointer-events-none" />

      <motion.div className="max-w-7xl mx-auto relative" initial="hidden" animate="visible" variants={containerVariants}>
        {/* Header */}
        <motion.div className="mb-12" variants={itemVariants}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 ref={titleRef} className="text-4xl sm:text-5xl font-display italic text-white" style={{ perspective: "1000px" }}>
                  COACH DASHBOARD
                </h1>
              </div>
              <p className="text-gray-400 flex items-center gap-2">
                <Flame className="w-4 h-4 text-octagon-gold" />
                {getGreeting()}, <span className="text-white font-semibold">{user.name}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/strategy">
                <motion.div
                  className="bg-gradient-to-r from-red-600/20 to-red-500/20 text-red-400 px-4 py-2 rounded-lg text-xs font-bold uppercase border border-red-500/30 flex items-center gap-2 cursor-pointer hover:from-red-600/30 hover:to-red-500/30 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <Swords className="w-4 h-4" />
                  Strategy Optimizer
                </motion.div>
              </Link>
              <motion.div
                className="bg-gradient-to-r from-octagon-gold/20 to-orange-500/20 text-octagon-gold px-4 py-2 rounded-lg text-xs font-bold uppercase border border-octagon-gold/30 flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <Shield className="w-4 h-4" />
                Coach
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12" variants={containerVariants}>
          {stats.map((stat, idx) => (
            <motion.div key={idx} variants={itemVariants}>
              <Card variant="glass" className="p-5 sm:p-6 hover:border-white/20 transition-all cursor-default">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-lg bg-white/5">
                    <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-octagon-gold" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-display font-bold text-octagon-gold">{stat.value}</div>
                </div>
                <div className="text-xs sm:text-sm text-gray-400 uppercase tracking-wider font-medium">{stat.label}</div>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* ====== NEW: Roster + Upcoming Fights Row ====== */}
        <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12" variants={containerVariants}>
          {/* My Fighters Roster */}
          <motion.div variants={itemVariants}>
            <Card variant="glass" className="p-6 sm:p-8 h-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-display uppercase text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-octagon-gold" />
                  My Fighters
                </h2>
                <span className="text-neutral-500 text-sm">{roster.length}/20</span>
              </div>

              {/* Add fighter search */}
              <div className="relative mb-4" onClick={(e) => e.stopPropagation()}>
                <div className="relative">
                  <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    type="text"
                    value={rosterSearch}
                    onChange={(e) => { setRosterSearch(e.target.value); setShowRosterDropdown(true); }}
                    onFocus={() => setShowRosterDropdown(true)}
                    placeholder="Add fighter to roster..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-octagon-gold/50 transition-colors"
                  />
                </div>
                {showRosterDropdown && rosterOptions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-neutral-900 border border-white/10 rounded-xl max-h-48 overflow-y-auto shadow-2xl">
                    {rosterOptions.map((f) => (
                      <button
                        key={f._id}
                        onClick={() => handleAddToRoster(f.name)}
                        disabled={addingFighter}
                        className="w-full text-left px-4 py-2.5 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 flex items-center justify-between"
                      >
                        <div>
                          <span className="text-white text-sm font-medium">{f.name}</span>
                          <span className="text-neutral-500 text-xs ml-2">({f.wins}-{f.losses}-{f.draws})</span>
                        </div>
                        <Plus className="w-4 h-4 text-octagon-gold" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {rosterError && (
                <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-3 h-3" /> {rosterError}
                </div>
              )}

              {/* Roster list */}
              {loadingRoster ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-octagon-gold" />
                </div>
              ) : roster.length === 0 ? (
                <p className="text-neutral-500 text-sm text-center py-6">No fighters in your roster yet. Search above to add.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {roster.map((r) => (
                    <div key={r._id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:border-octagon-gold/20 transition-colors group">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{r.fighterName}</p>
                        <p className="text-neutral-500 text-xs">{r.record} | {r.stance || "N/A"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={`/strategy?fighter1=${encodeURIComponent(r.fighterName)}`}>
                          <motion.div whileHover={{ scale: 1.1 }} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer" title="Generate Strategy">
                            <Swords className="w-3.5 h-3.5" />
                          </motion.div>
                        </Link>
                        <button onClick={() => handleRemoveFromRoster(r.fighterId)} className="p-1.5 rounded-lg text-neutral-600 hover:text-red-400 hover:bg-white/5 transition-colors opacity-0 group-hover:opacity-100" title="Remove">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>

          {/* Upcoming Fights + Strategy History */}
          <motion.div variants={itemVariants} className="space-y-8">
            {/* Upcoming Fights */}
            <Card variant="glass" className="p-6 sm:p-8">
              <h2 className="text-xl font-display uppercase text-white mb-6 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-octagon-gold" />
                Upcoming Fights
              </h2>
              {loadingUpcoming ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-octagon-gold" />
                </div>
              ) : upcomingFights.length === 0 ? (
                <p className="text-neutral-500 text-sm text-center py-4">
                  {roster.length === 0 ? "Add fighters to your roster to track upcoming fights." : "No upcoming fights for your roster fighters."}
                </p>
              ) : (
                <div className="space-y-3">
                  {upcomingFights.slice(0, 3).map((f, idx) => (
                    <motion.div
                      key={idx}
                      className="p-4 bg-white/5 rounded-xl border border-white/10 hover:border-octagon-gold/30 transition-colors"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-white font-semibold text-sm">{f.fighterName} vs {f.opponent}</p>
                        <Link href={`/strategy?fighter1=${encodeURIComponent(f.fighterName)}&fighter2=${encodeURIComponent(f.opponent)}`}>
                          <span className="text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer flex items-center gap-1">
                            <Swords className="w-3 h-3" /> Prepare
                          </span>
                        </Link>
                      </div>
                      <p className="text-neutral-500 text-xs">{f.eventName} - {formatEventDate(f.eventDate)}</p>
                    </motion.div>
                  ))}
                </div>
              )}
            </Card>

            {/* Strategy History */}
            <Card variant="glass" className="p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-display uppercase text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-octagon-gold" />
                  Recent Strategies
                </h2>
                {strategyHistory.length > 0 && (
                  <Link href="/strategy" className="text-xs text-octagon-gold hover:text-white transition-colors">View all</Link>
                )}
              </div>
              {loadingHistory ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-octagon-gold" />
                </div>
              ) : strategyHistory.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-neutral-500 text-sm mb-3">No strategies generated yet.</p>
                  <Link href="/strategy">
                    <Button variant="outline" className="text-xs">
                      <Swords className="w-3 h-3 mr-1" /> Create Strategy
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {strategyHistory.map((s) => (
                    <Link key={s._id} href={`/strategy/${s._id}`}>
                      <motion.div
                        className="p-3 bg-white/5 rounded-xl border border-white/5 hover:border-octagon-gold/20 transition-colors cursor-pointer flex items-center justify-between"
                        whileHover={{ x: 4 }}
                      >
                        <div>
                          <p className="text-white text-sm font-medium">{s.fighter1Name} vs {s.fighter2Name}</p>
                          <p className="text-neutral-500 text-xs">
                            {s.prediction?.winner} wins via {s.prediction?.method} - {new Date(s.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Eye className="w-4 h-4 text-neutral-600" />
                      </motion.div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        </motion.div>

        {/* Quick Actions + Profile + Quick Scout Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <Card variant="glass" className="p-6 sm:p-8 h-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl sm:text-2xl font-display uppercase text-white flex items-center gap-2">
                  <Flame className="w-5 h-5 text-octagon-gold" />
                  Quick Actions
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { href: "/strategy", icon: Swords, title: "Strategy Optimizer", desc: "AI-powered fight game plans" },
                  { href: "/comparison", icon: BarChart2, title: "Fighter Comparison", desc: "Analyze fighter stats head-to-head" },
                  { href: "/training", icon: Award, title: "Training Programs", desc: "Coach development & fighter programs" },
                  { href: "/prediction", icon: TrendingUp, title: "Fight Predictions", desc: "ML-powered win probability" },
                ].map((action, idx) => (
                  <Link key={idx} href={action.href}>
                    <motion.div
                      className="p-5 sm:p-6 bg-white/5 rounded-xl border border-white/10 hover:border-octagon-gold/50 hover:bg-white/10 transition-all cursor-pointer group"
                      whileHover={{ y: -4 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                      <action.icon className="w-8 h-8 text-octagon-gold mb-3 group-hover:scale-110 transition-transform" />
                      <h3 className="text-base sm:text-lg font-display text-white mb-1 flex items-center gap-2">
                        {action.title}
                        <ChevronRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-400">{action.desc}</p>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Quick Scout + Profile */}
          <motion.div variants={itemVariants} className="space-y-8">
            {/* Quick Opponent Scout */}
            <Card variant="glass" className="p-6">
              <h2 className="text-lg font-display uppercase text-white mb-4 flex items-center gap-2">
                <Search className="w-5 h-5 text-octagon-gold" />
                Quick Scout
              </h2>
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    type="text"
                    value={scoutSearch}
                    onChange={(e) => { setScoutSearch(e.target.value); setScoutFighter(null); setShowScoutDropdown(true); }}
                    onFocus={() => setShowScoutDropdown(true)}
                    placeholder="Scout an opponent..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-octagon-gold/50 transition-colors"
                  />
                </div>
                {showScoutDropdown && scoutOptions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-neutral-900 border border-white/10 rounded-xl max-h-48 overflow-y-auto shadow-2xl">
                    {scoutOptions.map((f) => (
                      <button
                        key={f._id}
                        onClick={() => { setScoutFighter(f); setScoutSearch(f.name); setShowScoutDropdown(false); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                      >
                        <span className="text-white text-sm">{f.name}</span>
                        <span className="text-neutral-500 text-xs ml-2">({f.wins}-{f.losses}-{f.draws})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <AnimatePresence>
                {scoutFighter && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 p-4 bg-white/5 rounded-xl border border-octagon-gold/20"
                  >
                    <p className="text-white font-bold">{scoutFighter.name}</p>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                      <div className="text-neutral-400">Record: <span className="text-white">{scoutFighter.wins}-{scoutFighter.losses}-{scoutFighter.draws}</span></div>
                      <div className="text-neutral-400">Stance: <span className="text-white">{scoutFighter.stance || "N/A"}</span></div>
                      <div className="text-neutral-400">SLPM: <span className="text-white">{scoutFighter.slpm}</span></div>
                      <div className="text-neutral-400">Accuracy: <span className="text-white">{scoutFighter.strikingAccuracy}%</span></div>
                    </div>
                    <Link href={`/strategy?fighter2=${encodeURIComponent(scoutFighter.name)}`}>
                      <Button variant="outline" className="w-full mt-3 text-xs">
                        <Swords className="w-3 h-3 mr-1" /> Full Strategy Analysis
                      </Button>
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>

            {/* Profile Card */}
            <Card variant="glass" className="p-6">
              <h2 className="text-lg font-display uppercase text-white mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-octagon-gold" />
                Your Profile
              </h2>
              <motion.div
                className="mb-4 p-4 bg-gradient-to-br from-octagon-gold/10 to-transparent rounded-xl border border-octagon-gold/20"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-14 h-14 bg-gradient-to-br from-octagon-gold to-orange-500 octagon-avatar flex items-center justify-center shadow-lg shadow-octagon-gold/20">
                      <span className="text-xl font-bold text-white">{user.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-black" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-base truncate">{user.name}</h3>
                    <p className="text-gray-400 text-xs truncate">{user.email}</p>
                    <p className="text-octagon-gold text-xs uppercase mt-1 flex items-center gap-1">
                      <Shield className="w-3 h-3" /> Coach
                    </p>
                  </div>
                </div>
              </motion.div>
              <div className="space-y-1.5 mb-4">
                {[
                  { label: "Experience", value: user.experienceLevel || "Not set" },
                  { label: "Discipline", value: user.discipline || "Not set" },
                ].map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2 px-3 rounded-lg hover:bg-white/5 transition-colors">
                    <span className="text-gray-400 text-xs">{item.label}</span>
                    <span className="text-white font-semibold text-xs">{item.value}</span>
                  </div>
                ))}
              </div>
              <Link href="/profile">
                <Button variant="outline" className="w-full text-xs group">
                  <span>Edit Profile</span>
                  <ChevronRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
