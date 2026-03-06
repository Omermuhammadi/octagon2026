"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { gymApi, GymData } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
    MapPin, Phone, Star, Navigation, Loader2,
    Clock, Globe, ChevronDown, Search, X,
    Dumbbell, CheckCircle, Database
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Types
type City = "All Cities" | "Karachi" | "Lahore" | "Islamabad" | "Rawalpindi" | "Faisalabad";
type Discipline = "All" | "MMA" | "BJJ" | "Boxing" | "Muay Thai" | "Karate" | "Taekwondo" | "Wrestling" | "Kickboxing";
type SortOption = "rating" | "reviews" | "name";

const cities: City[] = ["All Cities", "Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad"];
const disciplines: Discipline[] = ["All", "MMA", "BJJ", "Boxing", "Muay Thai", "Karate", "Taekwondo", "Wrestling", "Kickboxing"];

export default function GymsPage() {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    // Gyms data from API
    const [gyms, setGyms] = useState<GymData[]>([]);
    const [gymsLoading, setGymsLoading] = useState(true);
    const [gymsError, setGymsError] = useState<string | null>(null);
    const [seeding, setSeeding] = useState(false);

    // Filters state
    const [selectedCity, setSelectedCity] = useState<City>("All Cities");
    const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline>("All");
    const [sortBy, setSortBy] = useState<SortOption>("rating");
    const [searchQuery, setSearchQuery] = useState("");

    // Geolocation state
    const [userLocation, setUserLocation] = useState<{lat: number; lng: number} | null>(null);
    const [locatingUser, setLocatingUser] = useState(false);

    // Dropdown states
    const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
    const [disciplineDropdownOpen, setDisciplineDropdownOpen] = useState(false);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isLoading, isAuthenticated, router]);

    // Fetch gyms from API on mount and when filters change
    useEffect(() => {
        if (!isAuthenticated) return;

        const fetchGyms = async () => {
            setGymsLoading(true);
            setGymsError(null);
            try {
                const res = await gymApi.getGyms({
                    city: selectedCity !== "All Cities" ? selectedCity : undefined,
                    discipline: selectedDiscipline !== "All" ? selectedDiscipline : undefined,
                    sort: sortBy,
                });
                if (res.success && res.data) {
                    setGyms(res.data);
                } else {
                    setGyms([]);
                }
            } catch {
                setGymsError("Failed to load gyms. The API may be unavailable.");
                setGyms([]);
            } finally {
                setGymsLoading(false);
            }
        };

        // Don't re-fetch if user is viewing nearby results
        if (!userLocation) {
            fetchGyms();
        }
    }, [isAuthenticated, selectedCity, selectedDiscipline, sortBy, userLocation]);

    // Geolocation handler
    const handleGeolocation = () => {
        if (navigator.geolocation) {
            setLocatingUser(true);
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
                    setUserLocation(loc);
                    // Fetch nearby gyms
                    gymApi.getNearbyGyms(loc.lat, loc.lng).then(res => {
                        if (res.success && res.data) {
                            setGyms(res.data);
                        }
                    }).catch(() => {
                        setGymsError("Failed to fetch nearby gyms.");
                    }).finally(() => {
                        setLocatingUser(false);
                    });
                },
                () => {
                    alert("Unable to get location. Please enable location services.");
                    setLocatingUser(false);
                }
            );
        } else {
            alert("Geolocation is not supported by your browser.");
        }
    };

    // Clear location filter
    const clearLocation = () => {
        setUserLocation(null);
        // Will trigger re-fetch via useEffect
    };

    // Seed gyms handler
    const handleSeedGyms = async () => {
        setSeeding(true);
        try {
            const res = await gymApi.seedGyms();
            if (res.success) {
                // Re-fetch gyms after seeding
                const gymsRes = await gymApi.getGyms();
                if (gymsRes.success && gymsRes.data) {
                    setGyms(gymsRes.data);
                }
                setGymsError(null);
            }
        } catch {
            setGymsError("Failed to seed gyms data.");
        } finally {
            setSeeding(false);
        }
    };

    // Client-side search filter (API handles city/discipline/sort, search is client-side)
    const filteredGyms = useMemo(() => {
        if (!searchQuery) return gyms;
        const query = searchQuery.toLowerCase();
        return gyms.filter(gym =>
            gym.name.toLowerCase().includes(query) ||
            gym.area.toLowerCase().includes(query) ||
            gym.disciplines.some(d => d.toLowerCase().includes(query))
        );
    }, [gyms, searchQuery]);

    // Show loading while checking auth state
    if (isLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-octagon-red" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black pt-24 px-4 sm:px-6 lg:px-8 pb-12">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-10"
                >
                    <h1 className="text-4xl md:text-5xl font-display italic text-white mb-4">
                        FIND A <span className="text-octagon-red">GYM</span>
                    </h1>
                    <p className="text-gray-400 max-w-2xl mx-auto">
                        Discover top-rated MMA and martial arts gyms across Pakistan
                    </p>
                </motion.div>

                {/* Filters Section */}
                            <div className="mb-8 space-y-4">
                                {/* Search Bar */}
                                <div className="relative max-w-xl mx-auto">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                    <input
                                        type="text"
                                        placeholder="Search gyms by name, area, or discipline..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-12 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-octagon-red/50 focus:ring-1 focus:ring-octagon-red/50 transition-all"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery("")}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                {/* Filter Row */}
                                <div className="flex flex-wrap items-center justify-center gap-3">
                                    {/* City Dropdown */}
                                    <div className="relative">
                                        <button
                                            onClick={() => {
                                                setCityDropdownOpen(!cityDropdownOpen);
                                                setDisciplineDropdownOpen(false);
                                            }}
                                            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-all min-w-[160px] justify-between"
                                        >
                                            <span className="flex items-center gap-2">
                                                <MapPin className="w-4 h-4 text-octagon-red" />
                                                <span className="text-sm">{selectedCity}</span>
                                            </span>
                                            <ChevronDown className={`w-4 h-4 transition-transform ${cityDropdownOpen ? "rotate-180" : ""}`} />
                                        </button>

                                        <AnimatePresence>
                                            {cityDropdownOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    className="absolute top-full left-0 mt-2 w-full bg-neutral-900 border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden"
                                                >
                                                    {cities.map((city) => (
                                                        <button
                                                            key={city}
                                                            onClick={() => {
                                                                setSelectedCity(city);
                                                                setCityDropdownOpen(false);
                                                            }}
                                                            className={`w-full px-4 py-2.5 text-left text-sm transition-all ${
                                                                selectedCity === city
                                                                    ? "bg-octagon-red text-white"
                                                                    : "text-gray-300 hover:bg-white/10"
                                                            }`}
                                                        >
                                                            {city}
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Discipline Dropdown */}
                                    <div className="relative">
                                        <button
                                            onClick={() => {
                                                setDisciplineDropdownOpen(!disciplineDropdownOpen);
                                                setCityDropdownOpen(false);
                                            }}
                                            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-all min-w-[140px] justify-between"
                                        >
                                            <span className="flex items-center gap-2">
                                                <Dumbbell className="w-4 h-4 text-octagon-gold" />
                                                <span className="text-sm">{selectedDiscipline}</span>
                                            </span>
                                            <ChevronDown className={`w-4 h-4 transition-transform ${disciplineDropdownOpen ? "rotate-180" : ""}`} />
                                        </button>

                                        <AnimatePresence>
                                            {disciplineDropdownOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    className="absolute top-full left-0 mt-2 w-full bg-neutral-900 border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden"
                                                >
                                                    {disciplines.map((discipline) => (
                                                        <button
                                                            key={discipline}
                                                            onClick={() => {
                                                                setSelectedDiscipline(discipline);
                                                                setDisciplineDropdownOpen(false);
                                                            }}
                                                            className={`w-full px-4 py-2.5 text-left text-sm transition-all ${
                                                                selectedDiscipline === discipline
                                                                    ? "bg-octagon-red text-white"
                                                                    : "text-gray-300 hover:bg-white/10"
                                                            }`}
                                                        >
                                                            {discipline}
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Sort Options */}
                                    <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
                                        <span className="text-xs text-gray-500 uppercase">Sort:</span>
                                        {(["rating", "reviews", "name"] as SortOption[]).map((option) => (
                                            <button
                                                key={option}
                                                onClick={() => setSortBy(option)}
                                                className={`px-3 py-1 rounded text-xs font-bold uppercase transition-all ${
                                                    sortBy === option
                                                        ? "bg-octagon-red text-white"
                                                        : "text-gray-400 hover:text-white"
                                                }`}
                                            >
                                                {option}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Use My Location Button */}
                                    <button
                                        onClick={handleGeolocation}
                                        disabled={locatingUser}
                                        className="px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {locatingUser ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <MapPin className="w-4 h-4" />
                                        )}
                                        Use My Location
                                    </button>
                                </div>

                                {/* Location Active Indicator */}
                                {userLocation && (
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="text-xs text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                                            Showing nearby gyms ({userLocation.lat.toFixed(2)}, {userLocation.lng.toFixed(2)})
                                        </span>
                                        <button onClick={clearLocation} className="text-xs text-gray-400 hover:text-white underline">
                                            Clear
                                        </button>
                                    </div>
                                )}

                                {/* Results Count */}
                                <div className="text-center text-sm text-gray-500">
                                    Found <span className="text-white font-bold">{filteredGyms.length}</span> gym{filteredGyms.length !== 1 ? "s" : ""}
                                    {selectedCity !== "All Cities" && <span> in <span className="text-octagon-red">{selectedCity}</span></span>}
                                </div>
                            </div>

                            {/* Loading State */}
                            {gymsLoading && (
                                <div className="flex items-center justify-center py-20">
                                    <Loader2 className="w-8 h-8 animate-spin text-octagon-red" />
                                    <span className="ml-3 text-gray-400">Loading gyms...</span>
                                </div>
                            )}

                            {/* Error State */}
                            {gymsError && !gymsLoading && (
                                <div className="text-center py-12">
                                    <Card variant="glass" className="p-8 max-w-md mx-auto">
                                        <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                                        <h3 className="text-xl text-white font-bold mb-2">Could not load gyms</h3>
                                        <p className="text-gray-400 mb-4">{gymsError}</p>
                                        <button
                                            onClick={handleSeedGyms}
                                            disabled={seeding}
                                            className="px-4 py-2 bg-octagon-red/20 border border-octagon-red/40 rounded-lg text-octagon-red hover:bg-octagon-red/30 transition-colors flex items-center gap-2 mx-auto disabled:opacity-50"
                                        >
                                            {seeding ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Database className="w-4 h-4" />
                                            )}
                                            Seed Gym Data
                                        </button>
                                    </Card>
                                </div>
                            )}

                            {/* Gyms Grid */}
                            {!gymsLoading && !gymsError && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredGyms.length > 0 ? (
                                        filteredGyms.map((gym, index) => (
                                            <GymCard key={gym._id} gym={gym} index={index} />
                                        ))
                                    ) : (
                                        <div className="col-span-full">
                                            <Card variant="glass" className="p-12 text-center">
                                                <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                                                <h3 className="text-xl text-white font-bold mb-2">No gyms found</h3>
                                                <p className="text-gray-400 mb-4">Try adjusting your filters or search query</p>
                                                <button
                                                    onClick={handleSeedGyms}
                                                    disabled={seeding}
                                                    className="px-4 py-2 bg-octagon-red/20 border border-octagon-red/40 rounded-lg text-octagon-red hover:bg-octagon-red/30 transition-colors flex items-center gap-2 mx-auto disabled:opacity-50"
                                                >
                                                    {seeding ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Database className="w-4 h-4" />
                                                    )}
                                                    Seed Gym Data
                                                </button>
                                            </Card>
                                        </div>
                                    )}
                                </div>
                            )}
            </div>
        </div>
    );
}

// Gym Card Component
function GymCard({ gym, index }: { gym: GymData; index: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="h-full"
        >
            <Card
                variant="glass"
                className="overflow-hidden group h-full transition-all duration-300 hover:border-octagon-red/50"
            >
                {/* Image */}
                <div className="relative h-48 overflow-hidden">
                    <img
                        src={gym.image}
                        alt={gym.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

                    {/* Price Badge */}
                    <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-sm px-3 py-1 rounded-full">
                        <span className="text-xs font-bold text-octagon-gold">{gym.priceRange}</span>
                    </div>

                    {/* Rating Badge */}
                    <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-xs font-bold text-white">{gym.rating}</span>
                        <span className="text-xs text-gray-400">({gym.reviewCount})</span>
                    </div>

                    {/* City Badge */}
                    <div className="absolute bottom-3 left-3">
                        <span className="bg-octagon-red/90 text-white text-xs font-bold px-3 py-1 rounded-full">
                            {gym.city}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="p-5">
                    <h3 className="text-lg font-display uppercase text-white group-hover:text-octagon-red transition-colors mb-1">
                        {gym.name}
                    </h3>
                    <p className="text-sm text-gray-500 mb-3">{gym.area}</p>

                    {/* Disciplines */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                        {gym.disciplines.map((discipline) => (
                            <span
                                key={discipline}
                                className="text-[10px] bg-white/10 text-gray-300 px-2 py-1 rounded-full uppercase font-bold tracking-wider"
                            >
                                {discipline}
                            </span>
                        ))}
                    </div>

                    {/* Info Grid */}
                    <div className="space-y-2 mb-4 text-sm">
                        <div className="flex items-center text-gray-400">
                            <MapPin className="w-4 h-4 mr-2 text-octagon-red flex-shrink-0" />
                            <span className="truncate">{gym.address}</span>
                        </div>
                        <div className="flex items-center text-gray-400">
                            <Clock className="w-4 h-4 mr-2 text-octagon-gold flex-shrink-0" />
                            <span>{gym.hours}</span>
                        </div>
                        <div className="flex items-center text-gray-400">
                            <Phone className="w-4 h-4 mr-2 text-green-500 flex-shrink-0" />
                            <span>{gym.phone}</span>
                        </div>
                    </div>

                    {/* Features */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        {gym.features.slice(0, 3).map((feature) => (
                            <span key={feature} className="flex items-center text-[10px] text-gray-500">
                                <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                                {feature}
                            </span>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-4 border-t border-white/10">
                        <a
                            href={`tel:${gym.phone}`}
                            className="flex-1"
                        >
                            <Button variant="outline" size="sm" className="w-full h-9 text-xs">
                                <Phone className="w-3 h-3 mr-1" />
                                Call
                            </Button>
                        </a>
                        <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(gym.name + " " + gym.city)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1"
                        >
                            <Button variant="primary" size="sm" className="w-full h-9 text-xs">
                                <Navigation className="w-3 h-3 mr-1" />
                                Directions
                            </Button>
                        </a>
                        {gym.website && (
                            <a
                                href={gym.website}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                                    <Globe className="w-4 h-4" />
                                </Button>
                            </a>
                        )}
                    </div>
                </div>
            </Card>
        </motion.div>
    );
}
