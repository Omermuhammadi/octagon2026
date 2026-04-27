"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Search, ArrowRightLeft, Download, Target, Brain, Loader2, User, Lightbulb } from "lucide-react";
import { FighterRadarChart } from "@/components/charts/FighterRadarChart";
import { fighterApi, Fighter, FightStats } from "@/lib/api";

export default function ComparisonPage() {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const [fighter1Search, setFighter1Search] = useState("");
    const [fighter2Search, setFighter2Search] = useState("");
    const [fighter1Suggestions, setFighter1Suggestions] = useState<Fighter[]>([]);
    const [fighter2Suggestions, setFighter2Suggestions] = useState<Fighter[]>([]);
    const [selectedFighter1, setSelectedFighter1] = useState<Fighter | null>(null);
    const [selectedFighter2, setSelectedFighter2] = useState<Fighter | null>(null);
    const [fighter1Stats, setFighter1Stats] = useState<FightStats[]>([]);
    const [fighter2Stats, setFighter2Stats] = useState<FightStats[]>([]);
    const [loading, setLoading] = useState(false);
    const [showSuggestions1, setShowSuggestions1] = useState(false);
    const [showSuggestions2, setShowSuggestions2] = useState(false);
    const [searching1, setSearching1] = useState(false);
    const [searching2, setSearching2] = useState(false);

    const dropdown1Ref = useRef<HTMLDivElement>(null);
    const dropdown2Ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [authLoading, isAuthenticated, router]);

    // Handle click outside to close dropdowns
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdown1Ref.current && !dropdown1Ref.current.contains(event.target as Node)) {
                setShowSuggestions1(false);
            }
            if (dropdown2Ref.current && !dropdown2Ref.current.contains(event.target as Node)) {
                setShowSuggestions2(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Search for fighters
    const searchFighters = useCallback(async (query: string, setterFn: (fighters: Fighter[]) => void) => {
        if (query.length < 2) {
            setterFn([]);
            return;
        }
        try {
            const response = await fighterApi.searchFighters(query, 10);
            if (response.success && response.data) {
                setterFn(response.data);
            }
        } catch (error) {
            console.error("Search error:", error);
        }
    }, []);

    // Debounced search for fighter 1
    useEffect(() => {
        if (fighter1Search.length >= 2) setSearching1(true);
        const timer = setTimeout(async () => {
            await searchFighters(fighter1Search, setFighter1Suggestions);
            setSearching1(false);
        }, 300);
        return () => clearTimeout(timer);
    }, [fighter1Search, searchFighters]);

    // Debounced search for fighter 2
    useEffect(() => {
        if (fighter2Search.length >= 2) setSearching2(true);
        const timer = setTimeout(async () => {
            await searchFighters(fighter2Search, setFighter2Suggestions);
            setSearching2(false);
        }, 300);
        return () => clearTimeout(timer);
    }, [fighter2Search, searchFighters]);

    // Fetch comparison data when both fighters are selected
    useEffect(() => {
        const fetchComparison = async () => {
            if (!selectedFighter1 || !selectedFighter2) return;

            setLoading(true);
            try {
                const response = await fighterApi.compareFighters(
                    selectedFighter1.name,
                    selectedFighter2.name
                );
                if (response.success && response.data) {
                    setFighter1Stats(response.data.fighter1.recentStats);
                    setFighter2Stats(response.data.fighter2.recentStats);
                }
            } catch (error) {
                console.error("Comparison error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchComparison();
    }, [selectedFighter1, selectedFighter2]);

    const selectFighter1 = (fighter: Fighter) => {
        setSelectedFighter1(fighter);
        setFighter1Search(fighter.name);
        setShowSuggestions1(false);
    };

    const selectFighter2 = (fighter: Fighter) => {
        setSelectedFighter2(fighter);
        setFighter2Search(fighter.name);
        setShowSuggestions2(false);
    };

    const getWinRate = (f: Fighter) => {
        const total = (f.wins || 0) + (f.losses || 0) + (f.draws || 0);
        return total > 0 ? Math.round((f.wins / total) * 100) : 0;
    };

    const getOffensiveOutput = (f: Fighter) => {
        const raw = (f.slpm || 0) * 10 + (f.takedownAvg || 0) * 15;
        return Math.min(Math.round(raw), 100);
    };

    const getFighterStyle = (f: Fighter): { label: string; color: string; bg: string } => {
        if ((f.slpm || 0) > 4.0 && (f.takedownAvg || 0) < 1.5) return { label: 'Striker', color: '#DC2626', bg: 'bg-red-50 border-red-200 text-red-700' };
        if ((f.takedownAvg || 0) > 2.0 || (f.submissionAvg || 0) > 0.6) return { label: 'Grappler', color: '#2563EB', bg: 'bg-blue-50 border-blue-200 text-blue-700' };
        return { label: 'Well-Rounded', color: '#16A34A', bg: 'bg-green-50 border-green-200 text-green-700' };
    };

    const getRadarData = () => {
        if (!selectedFighter1 || !selectedFighter2) return [];
        return [
            { subject: 'Str. Accuracy', A: selectedFighter1.strikingAccuracy || 0, B: selectedFighter2.strikingAccuracy || 0, fullMark: 100 },
            { subject: 'Str. Defense', A: selectedFighter1.strikingDefense || 0, B: selectedFighter2.strikingDefense || 0, fullMark: 100 },
            { subject: 'TD Accuracy', A: selectedFighter1.takedownAccuracy || 0, B: selectedFighter2.takedownAccuracy || 0, fullMark: 100 },
            { subject: 'TD Defense', A: selectedFighter1.takedownDefense || 0, B: selectedFighter2.takedownDefense || 0, fullMark: 100 },
            { subject: 'Str/Min', A: Math.min((selectedFighter1.slpm || 0) * 10, 100), B: Math.min((selectedFighter2.slpm || 0) * 10, 100), fullMark: 100 },
            { subject: 'Sub Avg', A: Math.min((selectedFighter1.submissionAvg || 0) * 20, 100), B: Math.min((selectedFighter2.submissionAvg || 0) * 20, 100), fullMark: 100 },
            { subject: 'Win Rate', A: getWinRate(selectedFighter1), B: getWinRate(selectedFighter2), fullMark: 100 },
            { subject: 'Offense', A: getOffensiveOutput(selectedFighter1), B: getOffensiveOutput(selectedFighter2), fullMark: 100 },
        ];
    };

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pt-24 px-4 sm:px-6 lg:px-8 pb-16">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-display italic text-gray-900 mb-4">FIGHTER <span className="text-red-600">COMPARISON</span></h1>
                    <p className="text-gray-500 max-w-2xl mx-auto">Select two fighters to analyze their stats head-to-head.</p>
                </div>

                {/* Fighter Selection */}
                <div className="grid grid-cols-1 md:grid-cols-11 gap-6 items-start mb-12">
                    <div className="md:col-span-5">
                        <Card variant="glass" className="p-12 border-octagon-red/30 min-h-[350px]">
                            <label className="block text-lg font-bold uppercase tracking-wider text-octagon-red mb-6">Fighter A</label>
                            <div className="relative" ref={dropdown1Ref}>
                                {searching1 ? (
                                    <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-octagon-red animate-spin" />
                                ) : (
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                )}
                                <input
                                    type="text"
                                    className="w-full bg-white border-2 border-gray-200 rounded-xl py-3 pl-12 pr-4 text-gray-900 text-base focus:border-red-500 focus:ring-2 focus:ring-red-100 focus:outline-none transition-all placeholder:text-gray-400 shadow-sm"
                                    placeholder="Type fighter name..."
                                    value={fighter1Search}
                                    onChange={(e) => {
                                        setFighter1Search(e.target.value);
                                        setShowSuggestions1(true);
                                        if (!e.target.value) setSelectedFighter1(null);
                                    }}
                                    onFocus={() => setShowSuggestions1(true)}
                                />
                                {/* Dropdown Results */}
                                {showSuggestions1 && fighter1Search.length >= 2 && (
                                    <div className="absolute z-[100] w-full mt-3 bg-white border-2 border-red-200 rounded-2xl shadow-xl overflow-hidden" style={{ minHeight: '300px' }}>
                                        {/* Header */}
                                        <div className="sticky top-0 bg-red-600 px-5 py-3 z-10">
                                            <span className="text-sm text-gray-700 font-bold uppercase tracking-wider">
                                                {searching1 ? '🔍 Searching...' : `✅ ${fighter1Suggestions.length} fighters found - Click to select`}
                                            </span>
                                        </div>
                                        <div className="max-h-[400px] overflow-y-auto">
                                            {fighter1Suggestions.length > 0 ? (
                                                fighter1Suggestions.map((fighter, index) => (
                                                    <button
                                                        key={fighter._id}
                                                        className={`w-full px-5 py-5 text-left text-gray-900 hover:bg-red-50 active:bg-red-100 transition-all flex items-center gap-5 group cursor-pointer ${index !== fighter1Suggestions.length - 1 ? 'border-b border-gray-100' : ''}`}
                                                        onClick={() => selectFighter1(fighter)}
                                                    >
                                                        <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-amber-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-md">
                                                            <span className="text-gray-900 font-bold text-2xl">{fighter.name.charAt(0)}</span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-bold text-xl text-gray-900 group-hover:text-red-600 transition-colors">{fighter.name}</div>
                                                            <div className="text-base text-gray-600 flex items-center gap-3 mt-2">
                                                                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold text-sm">{fighter.wins} Wins</span>
                                                                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-bold text-sm">{fighter.losses} Losses</span>
                                                                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-bold text-sm">{fighter.draws} Draws</span>
                                                            </div>
                                                            {fighter.weight && <div className="text-sm text-gray-500 mt-1">Weight: {fighter.weight}</div>}
                                                        </div>
                                                        <div className="text-red-600 text-sm font-bold uppercase group-hover:translate-x-1 transition-transform">
                                                            SELECT →
                                                        </div>
                                                    </button>
                                                ))
                                            ) : !searching1 && (
                                                <div className="px-6 py-12 text-center text-gray-400">
                                                    <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                                    <p className="text-lg">No fighters found for "{fighter1Search}"</p>
                                                    <p className="text-sm mt-2">Try a different name</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            {selectedFighter1 && (
                                <div className="mt-4 flex items-center gap-4">
                                    <div className="w-16 h-16 bg-gray-800 rounded-full overflow-hidden border border-white/10 flex items-center justify-center">
                                        <span className="text-2xl font-display text-gray-900">
                                            {selectedFighter1.name.charAt(0)}
                                        </span>
                                    </div>
                                    <div>
                                        <div className="text-xl font-display text-gray-900 uppercase">{selectedFighter1.name}</div>
                                        <div className="text-xs text-gray-400 font-bold uppercase">
                                            {selectedFighter1.nickname || `${selectedFighter1.wins}-${selectedFighter1.losses}-${selectedFighter1.draws}`}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </div>

                    <div className="md:col-span-1 flex justify-center items-center h-full pt-12">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200">
                            <ArrowRightLeft className="w-4 h-4 text-gray-400" />
                        </div>
                    </div>

                    <div className="md:col-span-5">
                        <Card variant="glass" className="p-12 min-h-[350px]">
                            <label className="block text-lg font-bold uppercase tracking-wider text-octagon-gold mb-6">Fighter B</label>
                            <div className="relative" ref={dropdown2Ref}>
                                {searching2 ? (
                                    <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-octagon-gold animate-spin" />
                                ) : (
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                )}
                                <input
                                    type="text"
                                    className="w-full bg-white border-2 border-gray-200 rounded-xl py-3 pl-12 pr-4 text-gray-900 text-base focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none transition-all placeholder:text-gray-400 shadow-sm"
                                    placeholder="Type fighter name..."
                                    value={fighter2Search}
                                    onChange={(e) => {
                                        setFighter2Search(e.target.value);
                                        setShowSuggestions2(true);
                                        if (!e.target.value) setSelectedFighter2(null);
                                    }}
                                    onFocus={() => setShowSuggestions2(true)}
                                />
                                {/* Dropdown Results */}
                                {showSuggestions2 && fighter2Search.length >= 2 && (
                                    <div className="absolute z-[100] w-full mt-3 bg-white border-2 border-amber-200 rounded-2xl shadow-xl overflow-hidden" style={{ minHeight: '300px' }}>
                                        {/* Header */}
                                        <div className="sticky top-0 bg-amber-500 px-5 py-3 z-10">
                                            <span className="text-sm text-gray-700 font-bold uppercase tracking-wider">
                                                {searching2 ? '🔍 Searching...' : `✅ ${fighter2Suggestions.length} fighters found - Click to select`}
                                            </span>
                                        </div>
                                        <div className="max-h-[400px] overflow-y-auto">
                                            {fighter2Suggestions.length > 0 ? (
                                                fighter2Suggestions.map((fighter, index) => (
                                                    <button
                                                        key={fighter._id}
                                                        className={`w-full px-5 py-5 text-left text-gray-900 hover:bg-amber-50 active:bg-amber-100 transition-all flex items-center gap-5 group cursor-pointer ${index !== fighter2Suggestions.length - 1 ? 'border-b border-gray-100' : ''}`}
                                                        onClick={() => selectFighter2(fighter)}
                                                    >
                                                        <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-md">
                                                            <span className="text-gray-900 font-bold text-2xl">{fighter.name.charAt(0)}</span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-bold text-xl text-gray-900 group-hover:text-amber-600 transition-colors">{fighter.name}</div>
                                                            <div className="text-base text-gray-600 flex items-center gap-3 mt-2">
                                                                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold text-sm">{fighter.wins} Wins</span>
                                                                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-bold text-sm">{fighter.losses} Losses</span>
                                                                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-bold text-sm">{fighter.draws} Draws</span>
                                                            </div>
                                                            {fighter.weight && <div className="text-sm text-gray-500 mt-1">Weight: {fighter.weight}</div>}
                                                        </div>
                                                        <div className="text-amber-600 text-sm font-bold uppercase group-hover:translate-x-1 transition-transform">
                                                            SELECT →
                                                        </div>
                                                    </button>
                                                ))
                                            ) : !searching2 && (
                                                <div className="px-6 py-12 text-center text-gray-400">
                                                    <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                                    <p className="text-lg">No fighters found for "{fighter2Search}"</p>
                                                    <p className="text-sm mt-2">Try a different name</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            {selectedFighter2 && (
                                <div className="mt-4 flex items-center gap-4">
                                    <div className="w-16 h-16 bg-gray-800 rounded-full overflow-hidden border border-white/10 flex items-center justify-center">
                                        <span className="text-2xl font-display text-gray-900">
                                            {selectedFighter2.name.charAt(0)}
                                        </span>
                                    </div>
                                    <div>
                                        <div className="text-xl font-display text-gray-900 uppercase">{selectedFighter2.name}</div>
                                        <div className="text-xs text-gray-400 font-bold uppercase">
                                            {selectedFighter2.nickname || `${selectedFighter2.wins}-${selectedFighter2.losses}-${selectedFighter2.draws}`}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </div>
                </div>

                {/* Comparison Stats */}
                {selectedFighter1 && selectedFighter2 && (
                    <Card variant="glass" className="p-8">
                        {loading ? (
                            <div className="flex justify-center items-center h-64">
                                <Loader2 className="w-8 h-8 text-octagon-red animate-spin" />
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-3 gap-8 items-center border-b border-gray-200 pb-8 mb-8">
                                    <div className="text-center">
                                        <div className="text-5xl font-display text-gray-900">{selectedFighter1.height || '--'}</div>
                                        <div className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Height</div>
                                    </div>
                                    <div className="text-center text-gray-700 font-display text-2xl">VS</div>
                                    <div className="text-center">
                                        <div className="text-5xl font-display text-gray-900">{selectedFighter2.height || '--'}</div>
                                        <div className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Height</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-8 items-center border-b border-gray-200 pb-8 mb-8">
                                    <div className="text-center">
                                        <div className={`text-5xl font-display ${(selectedFighter1.reach || 0) > (selectedFighter2.reach || 0) ? 'text-octagon-red' : 'text-gray-900'}`}>
                                            {selectedFighter1.reach ? `${selectedFighter1.reach}"` : '--'}
                                        </div>
                                        <div className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Reach</div>
                                    </div>
                                    <div className="text-center text-gray-700 font-display text-2xl">VS</div>
                                    <div className="text-center">
                                        <div className={`text-5xl font-display ${(selectedFighter2.reach || 0) > (selectedFighter1.reach || 0) ? 'text-octagon-red' : 'text-gray-900'}`}>
                                            {selectedFighter2.reach ? `${selectedFighter2.reach}"` : '--'}
                                        </div>
                                        <div className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Reach</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-8 items-center border-b border-gray-200 pb-8 mb-8">
                                    <div className="text-center">
                                        <div className="text-5xl font-display text-gray-900">
                                            {selectedFighter1.wins}-{selectedFighter1.losses}-{selectedFighter1.draws}
                                        </div>
                                        <div className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Record</div>
                                    </div>
                                    <div className="text-center text-gray-700 font-display text-2xl">VS</div>
                                    <div className="text-center">
                                        <div className="text-5xl font-display text-gray-900">
                                            {selectedFighter2.wins}-{selectedFighter2.losses}-{selectedFighter2.draws}
                                        </div>
                                        <div className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Record</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-8 items-center">
                                    <div className="text-center">
                                        <div className="text-5xl font-display text-gray-900">{selectedFighter1.slpm.toFixed(1)}</div>
                                        <div className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Strikes/Min</div>
                                    </div>
                                    <div className="text-center text-gray-700 font-display text-2xl">VS</div>
                                    <div className="text-center">
                                        <div className="text-5xl font-display text-gray-900">{selectedFighter2.slpm.toFixed(1)}</div>
                                        <div className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Strikes/Min</div>
                                    </div>
                                </div>

                                <div className="mt-12 p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col items-center justify-center min-h-[400px]">
                                    <div className="w-full flex justify-between items-center mb-4 px-4">
                                        <div className="text-gray-900 font-display text-xl uppercase">Advanced Analytics (8 Metrics)</div>
                                        <div className="flex gap-4 text-xs font-bold uppercase">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 bg-red-600 rounded-full" />
                                                <span>{selectedFighter1.name.split(' ').pop()}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getFighterStyle(selectedFighter1).bg}`}>{getFighterStyle(selectedFighter1).label}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 bg-blue-600 rounded-full" />
                                                <span>{selectedFighter2.name.split(' ').pop()}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getFighterStyle(selectedFighter2).bg}`}>{getFighterStyle(selectedFighter2).label}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <FighterRadarChart
                                        data={getRadarData()}
                                        fighterAName={selectedFighter1.name.split(' ').pop() || 'A'}
                                        fighterBName={selectedFighter2.name.split(' ').pop() || 'B'}
                                    />
                                </div>

                                {/* Head-to-Head Stat Table */}
                                <div className="mt-8 overflow-hidden rounded-xl border border-gray-200">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-200">
                                                <th className="text-left px-4 py-3 text-xs font-bold text-red-600 uppercase tracking-wider">{selectedFighter1.name.split(' ').pop()}</th>
                                                <th className="text-center px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Metric</th>
                                                <th className="text-right px-4 py-3 text-xs font-bold text-blue-600 uppercase tracking-wider">{selectedFighter2.name.split(' ').pop()}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[
                                                { label: 'Str. Accuracy', a: `${selectedFighter1.strikingAccuracy}%`, b: `${selectedFighter2.strikingAccuracy}%`, aVal: selectedFighter1.strikingAccuracy, bVal: selectedFighter2.strikingAccuracy },
                                                { label: 'Str. Defense', a: `${selectedFighter1.strikingDefense}%`, b: `${selectedFighter2.strikingDefense}%`, aVal: selectedFighter1.strikingDefense, bVal: selectedFighter2.strikingDefense },
                                                { label: 'Strikes/Min', a: selectedFighter1.slpm?.toFixed(1), b: selectedFighter2.slpm?.toFixed(1), aVal: selectedFighter1.slpm, bVal: selectedFighter2.slpm },
                                                { label: 'TD Accuracy', a: `${selectedFighter1.takedownAccuracy}%`, b: `${selectedFighter2.takedownAccuracy}%`, aVal: selectedFighter1.takedownAccuracy, bVal: selectedFighter2.takedownAccuracy },
                                                { label: 'TD Defense', a: `${selectedFighter1.takedownDefense}%`, b: `${selectedFighter2.takedownDefense}%`, aVal: selectedFighter1.takedownDefense, bVal: selectedFighter2.takedownDefense },
                                                { label: 'Sub Avg', a: selectedFighter1.submissionAvg?.toFixed(2), b: selectedFighter2.submissionAvg?.toFixed(2), aVal: selectedFighter1.submissionAvg, bVal: selectedFighter2.submissionAvg },
                                                { label: 'Win Rate', a: `${getWinRate(selectedFighter1)}%`, b: `${getWinRate(selectedFighter2)}%`, aVal: getWinRate(selectedFighter1), bVal: getWinRate(selectedFighter2) },
                                            ].map((row, i) => (
                                                <tr key={i} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                                    <td className={`px-4 py-3 font-bold ${(row.aVal || 0) > (row.bVal || 0) ? 'text-red-600' : 'text-gray-700'}`}>{row.a}</td>
                                                    <td className="px-4 py-3 text-center text-gray-500 text-xs font-medium">{row.label}</td>
                                                    <td className={`px-4 py-3 font-bold text-right ${(row.bVal || 0) > (row.aVal || 0) ? 'text-blue-600' : 'text-gray-700'}`}>{row.b}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </Card>
                )}

                {/* Placeholder when no fighters selected */}
                {(!selectedFighter1 || !selectedFighter2) && (
                    <Card variant="glass" className="p-8">
                        <div className="text-center py-16">
                            <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                            <h3 className="text-xl font-display text-gray-400 uppercase">Select Two Fighters</h3>
                            <p className="text-gray-500 mt-2">Search and select two fighters above to see their comparison</p>
                        </div>
                    </Card>
                )}

                {/* Training Suggestions - only show when both fighters selected */}
                {selectedFighter1 && selectedFighter2 && !loading && (
                    <Card variant="glass" className="p-8 mt-8">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-display uppercase text-gray-900 flex items-center">
                                <Brain className="w-6 h-6 mr-3 text-octagon-gold" />
                                Training Suggestions
                            </h2>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    alert('Export functionality will generate a downloadable comparison report.');
                                }}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Export Comparison
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Fighter 1 Suggestions */}
                            <div>
                                <h3 className="text-lg font-display text-octagon-gold mb-4 flex items-center">
                                    <Target className="w-5 h-5 mr-2" />
                                    For {selectedFighter1.name}
                                </h3>
                                <div className="space-y-3">
                                    {selectedFighter1.takedownDefense < selectedFighter2.takedownAccuracy && (
                                        <SuggestionItem
                                            title="Improve Takedown Defense"
                                            description={`Current TD defense is ${selectedFighter1.takedownDefense}% vs opponent's ${selectedFighter2.takedownAccuracy}% accuracy`}
                                            priority="high"
                                        />
                                    )}
                                    {selectedFighter1.strikingDefense < 55 && (
                                        <SuggestionItem
                                            title="Work on Striking Defense"
                                            description={`Striking defense at ${selectedFighter1.strikingDefense}% - focus on head movement and footwork`}
                                            priority="medium"
                                        />
                                    )}
                                    {selectedFighter1.slpm < selectedFighter2.slpm && (
                                        <SuggestionItem
                                            title="Increase Output"
                                            description={`Output is ${selectedFighter1.slpm.toFixed(1)} strikes/min vs opponent's ${selectedFighter2.slpm.toFixed(1)}`}
                                            priority="medium"
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Fighter 2 Suggestions */}
                            <div>
                                <h3 className="text-lg font-display text-octagon-red mb-4 flex items-center">
                                    <Target className="w-5 h-5 mr-2" />
                                    For {selectedFighter2.name}
                                </h3>
                                <div className="space-y-3">
                                    {selectedFighter2.takedownDefense < selectedFighter1.takedownAccuracy && (
                                        <SuggestionItem
                                            title="Improve Takedown Defense"
                                            description={`Current TD defense is ${selectedFighter2.takedownDefense}% vs opponent's ${selectedFighter1.takedownAccuracy}% accuracy`}
                                            priority="high"
                                        />
                                    )}
                                    {selectedFighter2.strikingDefense < 55 && (
                                        <SuggestionItem
                                            title="Work on Striking Defense"
                                            description={`Striking defense at ${selectedFighter2.strikingDefense}% - focus on head movement and footwork`}
                                            priority="medium"
                                        />
                                    )}
                                    {selectedFighter2.slpm < selectedFighter1.slpm && (
                                        <SuggestionItem
                                            title="Increase Output"
                                            description={`Output is ${selectedFighter2.slpm.toFixed(1)} strikes/min vs opponent's ${selectedFighter1.slpm.toFixed(1)}`}
                                            priority="medium"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Strategy Suggestions Section */}
                {selectedFighter1 && selectedFighter2 && !loading && (
                    <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                            <Lightbulb className="w-6 h-6 text-yellow-500" />
                            Strategy Suggestions
                        </h2>
                        <div className="space-y-4">
                            {generateStrategySuggestions(selectedFighter1, selectedFighter2).map((suggestion, idx) => (
                                <div key={idx} className={`p-4 rounded-xl border ${
                                    suggestion.advantage === 'fighter1' ? 'bg-red-500/5 border-red-500/20' :
                                    suggestion.advantage === 'fighter2' ? 'bg-blue-500/5 border-blue-500/20' :
                                    'bg-yellow-500/5 border-yellow-500/20'
                                }`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`text-sm font-bold px-2 py-0.5 rounded ${
                                            suggestion.advantage === 'fighter1' ? 'bg-red-500/20 text-red-400' :
                                            suggestion.advantage === 'fighter2' ? 'bg-blue-500/20 text-blue-400' :
                                            'bg-yellow-500/20 text-yellow-400'
                                        }`}>
                                            {suggestion.advantage === 'fighter1' ? selectedFighter1.name :
                                             suggestion.advantage === 'fighter2' ? selectedFighter2.name : 'Even'}
                                        </span>
                                        <h3 className="text-gray-900 font-semibold">{suggestion.title}</h3>
                                    </div>
                                    <p className="text-gray-500 text-sm">{suggestion.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function generateStrategySuggestions(
    f1: Fighter,
    f2: Fighter
): { title: string; description: string; advantage: 'fighter1' | 'fighter2' | 'neutral' }[] {
    const suggestions: { title: string; description: string; advantage: 'fighter1' | 'fighter2' | 'neutral' }[] = [];

    // Striking accuracy comparison
    if (f1.strikingAccuracy > f2.strikingAccuracy + 5) {
        suggestions.push({
            title: 'Striking Accuracy Edge',
            description: `${f1.name} has a ${(f1.strikingAccuracy - f2.strikingAccuracy).toFixed(0)}% striking accuracy advantage. Should look to keep the fight on the feet and use precise combinations.`,
            advantage: 'fighter1',
        });
    } else if (f2.strikingAccuracy > f1.strikingAccuracy + 5) {
        suggestions.push({
            title: 'Striking Accuracy Edge',
            description: `${f2.name} has a ${(f2.strikingAccuracy - f1.strikingAccuracy).toFixed(0)}% striking accuracy advantage. Should look to keep the fight on the feet and use precise combinations.`,
            advantage: 'fighter2',
        });
    }

    // Takedown accuracy comparison
    if (f1.takedownAccuracy > f2.takedownAccuracy + 10) {
        suggestions.push({
            title: 'Takedown Threat',
            description: `${f1.name} has superior takedown accuracy (${f1.takedownAccuracy}% vs ${f2.takedownAccuracy}%). Could control the fight by taking it to the ground.`,
            advantage: 'fighter1',
        });
    } else if (f2.takedownAccuracy > f1.takedownAccuracy + 10) {
        suggestions.push({
            title: 'Takedown Threat',
            description: `${f2.name} has superior takedown accuracy (${f2.takedownAccuracy}% vs ${f1.takedownAccuracy}%). Could control the fight by taking it to the ground.`,
            advantage: 'fighter2',
        });
    }

    // Striking defense comparison
    if (f1.strikingDefense > f2.strikingDefense + 5) {
        suggestions.push({
            title: 'Defensive Edge',
            description: `${f1.name} has better striking defense (${f1.strikingDefense}% vs ${f2.strikingDefense}%), making them harder to hit cleanly.`,
            advantage: 'fighter1',
        });
    } else if (f2.strikingDefense > f1.strikingDefense + 5) {
        suggestions.push({
            title: 'Defensive Edge',
            description: `${f2.name} has better striking defense (${f2.strikingDefense}% vs ${f1.strikingDefense}%), making them harder to hit cleanly.`,
            advantage: 'fighter2',
        });
    }

    // Volume comparison (SLPM)
    if (f1.slpm > f2.slpm + 1) {
        suggestions.push({
            title: 'Higher Output',
            description: `${f1.name} throws more strikes per minute (${f1.slpm.toFixed(1)} vs ${f2.slpm.toFixed(1)}), which could lead to a volume advantage on the scorecards.`,
            advantage: 'fighter1',
        });
    } else if (f2.slpm > f1.slpm + 1) {
        suggestions.push({
            title: 'Higher Output',
            description: `${f2.name} throws more strikes per minute (${f2.slpm.toFixed(1)} vs ${f1.slpm.toFixed(1)}), which could lead to a volume advantage on the scorecards.`,
            advantage: 'fighter2',
        });
    }

    // Submission threat
    if (f1.submissionAvg > f2.submissionAvg + 0.5) {
        suggestions.push({
            title: 'Submission Danger',
            description: `${f1.name} averages ${f1.submissionAvg.toFixed(1)} submissions per 15 min vs ${f2.submissionAvg.toFixed(1)}. Watch for submission attempts if the fight hits the ground.`,
            advantage: 'fighter1',
        });
    } else if (f2.submissionAvg > f1.submissionAvg + 0.5) {
        suggestions.push({
            title: 'Submission Danger',
            description: `${f2.name} averages ${f2.submissionAvg.toFixed(1)} submissions per 15 min vs ${f1.submissionAvg.toFixed(1)}. Watch for submission attempts if the fight hits the ground.`,
            advantage: 'fighter2',
        });
    }

    // Takedown defense comparison
    if (f1.takedownDefense > f2.takedownDefense + 10) {
        suggestions.push({
            title: 'Takedown Defense',
            description: `${f1.name}'s superior takedown defense (${f1.takedownDefense}%) means they can likely keep the fight where they want it.`,
            advantage: 'fighter1',
        });
    } else if (f2.takedownDefense > f1.takedownDefense + 10) {
        suggestions.push({
            title: 'Takedown Defense',
            description: `${f2.name}'s superior takedown defense (${f2.takedownDefense}%) means they can likely keep the fight where they want it.`,
            advantage: 'fighter2',
        });
    }

    if (suggestions.length === 0) {
        suggestions.push({
            title: 'Close Matchup',
            description: 'These fighters are very evenly matched across key statistics. Expect a competitive fight that could go either way.',
            advantage: 'neutral',
        });
    }

    return suggestions;
}

function SuggestionItem({ title, description, priority }: { title: string; description: string; priority: "high" | "medium" | "low" }) {
    const priorityColors = {
        high: "border-red-200 bg-red-50",
        medium: "border-amber-200 bg-amber-50",
        low: "border-gray-200 bg-gray-50"
    };

    return (
        <div className={`p-4 rounded-xl border ${priorityColors[priority]} transition-colors hover:shadow-sm`}>
            <h4 className="text-gray-900 font-bold text-sm mb-1">{title}</h4>
            <p className="text-gray-500 text-xs">{description}</p>
            <div className="mt-2">
                <span className={`text-xs uppercase font-bold ${priority === "high" ? "text-red-600" :
                    priority === "medium" ? "text-amber-600" :
                        "text-gray-500"
                    }`}>
                    {priority} priority
                </span>
            </div>
        </div>
    );
}
