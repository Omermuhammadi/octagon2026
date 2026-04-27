"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
    MessageCircle,
    X,
    Send,
    Shield,
    AlertTriangle,
    Eye,
    Users,
    Car,
    Moon,
    Home,
    MapPin,
    Phone,
    ChevronRight,
    CheckCircle,
    Play,
    BookOpen,
    Target,
    Zap,
    Clock,
    Loader2
} from "lucide-react";

// ============================================
// TYPES
// ============================================

type Scenario = {
    id: string;
    title: string;
    category: string;
    threat: "low" | "medium" | "high";
    description: string;
    keyPoints: string[];
    doList: string[];
    dontList: string[];
};

type ChatMessage = {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
};

// ============================================
// SCENARIO DATA (25 scenarios)
// ============================================

const scenarios: Scenario[] = [
    {
        id: "1",
        title: "Being Followed on Foot",
        category: "Street Safety",
        threat: "high",
        description: "You notice someone has been walking behind you for several blocks, matching your pace and turns.",
        keyPoints: ["Trust your instincts", "Don't go home directly", "Seek populated areas"],
        doList: ["Cross the street to confirm they're following", "Enter a store or public place", "Call someone and speak loudly", "Head toward a police station or busy area"],
        dontList: ["Don't confront them alone", "Don't lead them to your home", "Don't ignore your gut feeling", "Don't take shortcuts through isolated areas"]
    },
    {
        id: "2",
        title: "ATM Safety",
        category: "Financial Safety",
        threat: "medium",
        description: "You need to withdraw cash from an ATM, especially at night or in an unfamiliar area.",
        keyPoints: ["Awareness is key", "Quick transactions", "Shield your PIN"],
        doList: ["Use ATMs inside banks when possible", "Check surroundings before approaching", "Have your card ready", "Cover keypad when entering PIN"],
        dontList: ["Don't count money at the ATM", "Don't use ATMs in poorly lit areas", "Don't let strangers 'help' you", "Don't leave receipt behind"]
    },
    {
        id: "3",
        title: "Parking Lot Awareness",
        category: "Vehicle Safety",
        threat: "medium",
        description: "Walking to your car in a parking garage or lot, especially when it's dark or empty.",
        keyPoints: ["Park strategically", "Keys ready", "Stay alert"],
        doList: ["Park near lights and exits", "Have keys in hand before leaving store", "Check back seat before entering", "Lock doors immediately"],
        dontList: ["Don't park next to vans or trucks", "Don't sit in car with doors unlocked", "Don't be distracted by phone", "Don't ignore suspicious people nearby"]
    },
    {
        id: "4",
        title: "Home Invasion Prevention",
        category: "Home Safety",
        threat: "high",
        description: "Preventing unauthorized entry to your home and what to do if someone breaks in.",
        keyPoints: ["Secure entry points", "Have a plan", "Safe room concept"],
        doList: ["Install quality locks and deadbolts", "Use door reinforcement", "Keep phone charged by bed", "Create a family emergency plan"],
        dontList: ["Don't open door to strangers", "Don't announce you're home alone", "Don't hide keys outside", "Don't confront intruders if possible"]
    },
    {
        id: "5",
        title: "Ride-Share Safety",
        category: "Transportation",
        threat: "medium",
        description: "Using ride-sharing services safely, from booking to arrival.",
        keyPoints: ["Verify before entering", "Share your trip", "Trust instincts"],
        doList: ["Confirm driver name, car, and plate", "Share trip details with someone", "Sit in back seat", "Keep phone charged and accessible"],
        dontList: ["Don't get in unverified vehicles", "Don't share personal details with driver", "Don't let driver deviate from route", "Don't fall asleep"]
    },
    {
        id: "6",
        title: "Bar & Club Safety",
        category: "Social Safety",
        threat: "medium",
        description: "Staying safe while enjoying nightlife with friends.",
        keyPoints: ["Buddy system", "Watch your drink", "Plan your exit"],
        doList: ["Go with trusted friends", "Never leave drink unattended", "Set a check-in time", "Arrange safe transportation home"],
        dontList: ["Don't accept drinks from strangers", "Don't leave alone with someone you just met", "Don't share your address", "Don't get separated from friends"]
    },
    {
        id: "7",
        title: "Verbal Confrontation",
        category: "De-escalation",
        threat: "medium",
        description: "Someone is verbally aggressive and threatening you.",
        keyPoints: ["Stay calm", "Create distance", "Don't escalate"],
        doList: ["Keep voice calm and low", "Maintain safe distance", "Look for exits", "Use open hand gestures"],
        dontList: ["Don't match their aggression", "Don't use provocative language", "Don't turn your back", "Don't make sudden movements"]
    },
    {
        id: "8",
        title: "Attempted Grab from Behind",
        category: "Physical Defense",
        threat: "high",
        description: "Someone attempts to grab you from behind in a bear hug or chokehold.",
        keyPoints: ["React immediately", "Create space", "Target weak points"],
        doList: ["Drop your weight immediately", "Tuck chin to protect throat", "Strike back with elbows", "Stomp on instep and run"],
        dontList: ["Don't freeze", "Don't try to pull arms off", "Don't stay in place", "Don't forget to yell for help"]
    },
    {
        id: "9",
        title: "Wrist Grab Escape",
        category: "Physical Defense",
        threat: "medium",
        description: "Someone grabs your wrist to control or drag you.",
        keyPoints: ["Act fast", "Use leverage", "Move toward thumb"],
        doList: ["Pull toward their thumb (weak point)", "Step toward them to create slack", "Use free hand to strike if needed", "Run once free"],
        dontList: ["Don't pull straight back", "Don't wait to react", "Don't stay close after escaping", "Don't underestimate the threat"]
    },
    {
        id: "10",
        title: "Ground Defense",
        category: "Physical Defense",
        threat: "high",
        description: "You've been knocked down and someone is attacking you on the ground.",
        keyPoints: ["Protect vital areas", "Create distance", "Get up safely"],
        doList: ["Keep hands up to protect head", "Use legs to create distance", "Kick at knees and groin", "Technical stand-up when possible"],
        dontList: ["Don't turn your back", "Don't stay flat on back", "Don't let them mount you", "Don't forget to breathe"]
    },
    {
        id: "11",
        title: "Multiple Attackers",
        category: "Physical Defense",
        threat: "high",
        description: "Facing more than one potential attacker.",
        keyPoints: ["Avoid if possible", "Don't get surrounded", "Escape priority"],
        doList: ["Try to de-escalate first", "Keep moving to avoid encirclement", "Line them up if possible", "Focus on escape, not winning"],
        dontList: ["Don't let them surround you", "Don't focus on just one", "Don't go to ground voluntarily", "Don't stay and fight if you can run"]
    },
    {
        id: "12",
        title: "Weapon Threat - Knife",
        category: "Weapon Defense",
        threat: "high",
        description: "Someone threatens you with a knife or edged weapon.",
        keyPoints: ["Distance is life", "Comply if robbery", "Run if possible"],
        doList: ["Create maximum distance", "Give valuables if demanded", "Use barriers between you", "Run to safety if opportunity"],
        dontList: ["Don't try to disarm unless no choice", "Don't underestimate knife wounds", "Don't turn your back", "Don't assume they won't use it"]
    },
    {
        id: "13",
        title: "Road Rage Encounter",
        category: "Vehicle Safety",
        threat: "medium",
        description: "Another driver is aggressive and following you or trying to confront you.",
        keyPoints: ["Stay in car", "Don't engage", "Drive to safety"],
        doList: ["Lock doors and close windows", "Drive to police station", "Call 911 while driving", "Don't go home"],
        dontList: ["Don't get out of car", "Don't make eye contact", "Don't gesture back", "Don't stop in isolated area"]
    },
    {
        id: "14",
        title: "Public Transport Safety",
        category: "Transportation",
        threat: "low",
        description: "Using buses, trains, or subways safely.",
        keyPoints: ["Position strategically", "Stay aware", "Know stops"],
        doList: ["Sit near driver or in busy cars", "Know your route and stops", "Keep belongings secure", "Stay awake and alert"],
        dontList: ["Don't display expensive items", "Don't fall asleep", "Don't wear both earbuds", "Don't block your exits"]
    },
    {
        id: "15",
        title: "Jogging/Running Safety",
        category: "Exercise Safety",
        threat: "low",
        description: "Staying safe while exercising outdoors.",
        keyPoints: ["Vary your route", "Stay visible", "Carry ID"],
        doList: ["Tell someone your route", "Carry phone and ID", "Run against traffic", "Use one earbud or none"],
        dontList: ["Don't run in isolated areas", "Don't run same route daily", "Don't have music too loud", "Don't run at predictable times"]
    },
    {
        id: "16",
        title: "Hotel Room Safety",
        category: "Travel Safety",
        threat: "low",
        description: "Staying safe in hotels during travel.",
        keyPoints: ["Check the room", "Use all locks", "Know exits"],
        doList: ["Request room between 2nd-6th floor", "Use deadbolt and chain", "Check closets and bathroom", "Locate emergency exits"],
        dontList: ["Don't open door without verifying", "Don't announce room number loudly", "Don't leave valuables visible", "Don't prop door open"]
    },
    {
        id: "17",
        title: "Elevator Safety",
        category: "Building Safety",
        threat: "low",
        description: "Using elevators safely, especially when alone.",
        keyPoints: ["Position matters", "Trust instincts", "Have a plan"],
        doList: ["Stand near buttons", "Know which floor to exit", "Exit if uncomfortable", "Press multiple floors if threatened"],
        dontList: ["Don't stand in corners", "Don't ignore gut feeling", "Don't enter with suspicious person", "Don't face the wall"]
    },
    {
        id: "18",
        title: "Dog Attack Defense",
        category: "Animal Safety",
        threat: "medium",
        description: "An aggressive dog approaches or attacks.",
        keyPoints: ["Don't run", "Protect throat", "Use barriers"],
        doList: ["Stand still, avoid eye contact", "Use bag or jacket as shield", "If knocked down, curl into ball", "Protect face and throat"],
        dontList: ["Don't run (triggers chase)", "Don't scream or panic", "Don't make direct eye contact", "Don't put hands near mouth"]
    },
    {
        id: "19",
        title: "Domestic Violence Escape",
        category: "Relationship Safety",
        threat: "high",
        description: "Planning to safely leave an abusive situation.",
        keyPoints: ["Plan carefully", "Gather resources", "Seek help"],
        doList: ["Create safety plan", "Save money secretly", "Document abuse", "Contact domestic violence hotline"],
        dontList: ["Don't announce you're leaving", "Don't underestimate danger", "Don't feel ashamed to seek help", "Don't delete evidence"]
    },
    {
        id: "20",
        title: "Stalking Response",
        category: "Personal Safety",
        threat: "high",
        description: "Someone is persistently following or monitoring you.",
        keyPoints: ["Document everything", "Report to police", "Change patterns"],
        doList: ["Keep detailed log with dates/times", "Save all messages/evidence", "Vary your routine", "Alert trusted people"],
        dontList: ["Don't engage with stalker", "Don't delete threatening messages", "Don't minimize the threat", "Don't think it will just stop"]
    },
    {
        id: "21",
        title: "Carjacking Prevention",
        category: "Vehicle Safety",
        threat: "high",
        description: "Someone attempts to take your vehicle by force.",
        keyPoints: ["Stay aware", "Don't resist for property", "Escape if possible"],
        doList: ["Keep doors locked always", "Leave space to escape at stops", "Give up car if threatened", "Remember details for police"],
        dontList: ["Don't fight over property", "Don't make sudden moves", "Don't forget children in car", "Don't chase the carjacker"]
    },
    {
        id: "22",
        title: "Online Dating Safety",
        category: "Social Safety",
        threat: "medium",
        description: "Meeting someone from a dating app for the first time.",
        keyPoints: ["Public places only", "Tell someone", "Trust instincts"],
        doList: ["Meet in busy public place", "Tell friend where you'll be", "Arrange own transportation", "Video chat before meeting"],
        dontList: ["Don't share home address", "Don't go to their place first time", "Don't leave drink unattended", "Don't ignore red flags"]
    },
    {
        id: "23",
        title: "Child Safety Awareness",
        category: "Family Safety",
        threat: "high",
        description: "Teaching children to stay safe from strangers.",
        keyPoints: ["Code words", "Trusted adults", "Body autonomy"],
        doList: ["Establish family code word", "Teach 'no, go, tell' rule", "Role play scenarios", "Identify trusted adults"],
        dontList: ["Don't scare children excessively", "Don't use 'stranger danger' only", "Don't teach blind obedience", "Don't dismiss their concerns"]
    },
    {
        id: "24",
        title: "Workplace Violence",
        category: "Work Safety",
        threat: "medium",
        description: "Recognizing and responding to threats at work.",
        keyPoints: ["Know warning signs", "Report concerns", "Know exits"],
        doList: ["Report threatening behavior to HR", "Know evacuation routes", "Have emergency contacts ready", "Trust your instincts about coworkers"],
        dontList: ["Don't ignore warning signs", "Don't confront alone", "Don't spread rumors", "Don't assume it won't happen"]
    },
    {
        id: "25",
        title: "Active Shooter Response",
        category: "Emergency",
        threat: "high",
        description: "Responding to an active shooter situation.",
        keyPoints: ["Run, Hide, Fight", "Have a plan", "Help others if safe"],
        doList: ["Run if safe path exists", "Hide and barricade if can't run", "Fight as last resort", "Call 911 when safe"],
        dontList: ["Don't freeze", "Don't assume it's a drill", "Don't pull fire alarm", "Don't approach police with hands hidden"]
    }
];

// ============================================
// CHATBOT RESPONSES (Static for now)
// ============================================

const chatbotResponses: Record<string, string> = {
    default: "I'm your Octagon Oracle self-defense assistant. I can help you with safety tips, self-defense techniques, and situational awareness. What would you like to know?",
    greeting: "Hello! I'm here to help you stay safe. Ask me about any self-defense scenario, safety tips, or training advice!",
    defense: "For self-defense, remember the basics: awareness, avoidance, and action. The best fight is the one you avoid. Would you like specific techniques or scenario advice?",
    escape: "When escaping a grab, always move toward the attacker's thumb - it's the weakest point of any grip. Create space, strike if needed, and run to safety.",
    awareness: "Situational awareness is your first line of defense. Keep your head up, minimize distractions, trust your instincts, and always know your exits.",
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function SelfDefensePage() {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    
    const [selectedCategory, setSelectedCategory] = useState<string>("All");
    const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
    const [chatOpen, setChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
        { id: "1", role: "assistant", content: chatbotResponses.default, timestamp: new Date() }
    ]);
    const [inputMessage, setInputMessage] = useState("");

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isLoading, isAuthenticated, router]);

    const categories = ["All", ...Array.from(new Set(scenarios.map(s => s.category)))];
    
    const filteredScenarios = selectedCategory === "All" 
        ? scenarios 
        : scenarios.filter(s => s.category === selectedCategory);

    const getThreatColor = (threat: string) => {
        switch (threat) {
            case "high": return "bg-red-100 text-red-700 border-red-200";
            case "medium": return "bg-amber-100 text-amber-700 border-amber-200";
            case "low": return "bg-green-100 text-green-700 border-green-200";
            default: return "bg-gray-100 text-gray-600 border-gray-200";
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case "Street Safety": return Eye;
            case "Vehicle Safety": return Car;
            case "Home Safety": return Home;
            case "Physical Defense": return Shield;
            case "De-escalation": return Users;
            case "Transportation": return MapPin;
            case "Social Safety": return Users;
            case "Travel Safety": return MapPin;
            case "Emergency": return AlertTriangle;
            default: return Shield;
        }
    };

    const handleSendMessage = () => {
        if (!inputMessage.trim()) return;
        
        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: "user",
            content: inputMessage,
            timestamp: new Date()
        };
        
        setChatMessages(prev => [...prev, userMsg]);
        setInputMessage("");
        
        // Simple keyword-based response (will be replaced with AI later)
        setTimeout(() => {
            let response = chatbotResponses.default;
            const lower = inputMessage.toLowerCase();
            
            if (lower.includes("hello") || lower.includes("hi")) {
                response = chatbotResponses.greeting;
            } else if (lower.includes("defense") || lower.includes("protect")) {
                response = chatbotResponses.defense;
            } else if (lower.includes("escape") || lower.includes("grab")) {
                response = chatbotResponses.escape;
            } else if (lower.includes("aware") || lower.includes("situational")) {
                response = chatbotResponses.awareness;
            }
            
            const botMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: response,
                timestamp: new Date()
            };
            setChatMessages(prev => [...prev, botMsg]);
        }, 1000);
    };

    if (isLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Header */}
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 border border-red-100 mb-6">
                        <Shield className="w-4 h-4 text-red-600" />
                        <span className="text-red-600 text-sm font-medium">25+ Real-World Scenarios</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-display italic text-gray-900 mb-4">
                        SELF-DEFENSE <span className="text-red-600">GUIDE</span>
                    </h1>
                    <p className="text-gray-500 max-w-2xl mx-auto text-lg">
                        Learn how to protect yourself in any situation. Browse scenarios, get expert advice, and chat with our AI assistant.
                    </p>
                </motion.div>

                {/* Quick Stats */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
                >
                    {[
                        { icon: BookOpen, label: "Scenarios", value: "25+" },
                        { icon: Target, label: "Categories", value: "12" },
                        { icon: Zap, label: "Techniques", value: "50+" },
                        { icon: Clock, label: "Avg. Read", value: "3 min" }
                    ].map((stat, idx) => (
                        <div key={idx} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm text-center">
                            <stat.icon className="w-6 h-6 text-red-600 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                            <p className="text-gray-500 text-sm">{stat.label}</p>
                        </div>
                    ))}
                </motion.div>

                {/* Women's Safety Section */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                    className="mb-12 bg-purple-50 rounded-2xl border border-purple-200 p-6 md:p-8"
                >
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                        <Shield className="w-6 h-6 text-purple-600" />
                        Women&apos;s Safety Guide
                    </h2>
                    <p className="text-gray-600 mb-6">
                        Practical safety tips and self-defense techniques designed specifically for women, covering awareness, prevention, and response strategies.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-white rounded-xl border border-purple-100">
                            <h3 className="text-gray-900 font-semibold mb-2">Situational Awareness</h3>
                            <ul className="space-y-2 text-sm text-gray-600">
                                <li>- Stay aware of your surroundings, especially at night</li>
                                <li>- Trust your instincts - if something feels wrong, leave</li>
                                <li>- Keep your phone charged and share your location</li>
                                <li>- Avoid wearing headphones in isolated areas</li>
                                <li>- Park in well-lit areas and check your surroundings before exiting</li>
                            </ul>
                        </div>
                        <div className="p-4 bg-white rounded-xl border border-purple-100">
                            <h3 className="text-gray-900 font-semibold mb-2">Key Techniques</h3>
                            <ul className="space-y-2 text-sm text-gray-600">
                                <li>- Palm strike to the nose - simple, effective, no training needed</li>
                                <li>- Knee to groin - close range, high impact</li>
                                <li>- Wrist escape - when someone grabs your wrist, rotate towards the thumb</li>
                                <li>- Elbow strikes - strongest close-range weapon</li>
                                <li>- Bear hug escape - drop weight, create space, strike and run</li>
                            </ul>
                        </div>
                        <div className="p-4 bg-white rounded-xl border border-purple-100">
                            <h3 className="text-gray-900 font-semibold mb-2">Prevention Strategies</h3>
                            <ul className="space-y-2 text-sm text-gray-600">
                                <li>- Walk with confidence and purpose</li>
                                <li>- Use the buddy system when possible</li>
                                <li>- Tell someone where you are going</li>
                                <li>- Keep keys between fingers as improvised tool</li>
                                <li>- Take a self-defense class at a local gym</li>
                            </ul>
                        </div>
                        <div className="p-4 bg-white rounded-xl border border-purple-100">
                            <h3 className="text-gray-900 font-semibold mb-2">Emergency Resources (Pakistan)</h3>
                            <ul className="space-y-2 text-sm text-gray-600">
                                <li>- Police Emergency: 15</li>
                                <li>- Women&apos;s Helpline: 1099</li>
                                <li>- Edhi Foundation: 115</li>
                                <li>- Punjab Women Helpline: 1043</li>
                                <li>- Madadgar (NGO): 0800-22444</li>
                            </ul>
                        </div>
                    </div>
                </motion.div>

                {/* Category Filter */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mb-8"
                >
                    <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                        Filter by Category
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    selectedCategory === cat
                                        ? "bg-red-600 text-white"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Scenarios Grid */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12"
                >
                    {filteredScenarios.map((scenario, idx) => {
                        const Icon = getCategoryIcon(scenario.category);
                        return (
                            <motion.div
                                key={scenario.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                onClick={() => setSelectedScenario(scenario)}
                                className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:border-red-200 hover:shadow-md cursor-pointer transition-all group"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                                        <Icon className="w-6 h-6 text-red-600" />
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getThreatColor(scenario.threat)}`}>
                                        {scenario.threat.toUpperCase()}
                                    </span>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-red-600 transition-colors">
                                    {scenario.title}
                                </h3>
                                <p className="text-gray-500 text-sm mb-4 line-clamp-2">
                                    {scenario.description}
                                </p>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-400">{scenario.category}</span>
                                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-red-500 transition-colors" />
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>

                {/* Emergency Contacts Banner */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl p-6 mb-8 shadow-md"
                >
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                            <Phone className="w-6 h-6 text-red-200" />
                            <div>
                                <p className="text-white font-semibold">Emergency: 911</p>
                                <p className="text-red-200 text-sm">Immediate danger</p>
                            </div>
                        </div>
                        <div className="w-px h-10 bg-white/30 hidden md:block" />
                        <div>
                            <p className="text-white font-semibold">National DV Hotline</p>
                            <p className="text-red-200 text-sm">1-800-799-7233</p>
                        </div>
                        <div className="w-px h-10 bg-white/30 hidden md:block" />
                        <div>
                            <p className="text-white font-semibold">Crisis Text Line</p>
                            <p className="text-red-200 text-sm">Text HOME to 741741</p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Scenario Detail Modal */}
            <AnimatePresence>
                {selectedScenario && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setSelectedScenario(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-gray-200 shadow-2xl"
                        >
                            <div className="p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getThreatColor(selectedScenario.threat)}`}>
                                            {selectedScenario.threat.toUpperCase()} THREAT
                                        </span>
                                        <h2 className="text-2xl font-bold text-gray-900 mt-2">{selectedScenario.title}</h2>
                                        <p className="text-gray-500 text-sm">{selectedScenario.category}</p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedScenario(null)}
                                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                        <X className="w-5 h-5 text-gray-400" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Scenario</h3>
                                    <p className="text-gray-900">{selectedScenario.description}</p>
                                </div>

                                <div>
                                    <h3 className="text-sm font-medium text-gray-500 uppercase mb-3">Key Points</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedScenario.keyPoints.map((point, idx) => (
                                            <span key={idx} className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm border border-red-100">
                                                {point}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                                        <h3 className="text-green-700 font-semibold mb-3 flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4" />
                                            DO
                                        </h3>
                                        <ul className="space-y-2">
                                            {selectedScenario.doList.map((item, idx) => (
                                                <li key={idx} className="text-gray-700 text-sm flex items-start gap-2">
                                                    <span className="text-green-600 mt-1">✓</span>
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                                        <h3 className="text-red-700 font-semibold mb-3 flex items-center gap-2">
                                            <X className="w-4 h-4" />
                                            DON&apos;T
                                        </h3>
                                        <ul className="space-y-2">
                                            {selectedScenario.dontList.map((item, idx) => (
                                                <li key={idx} className="text-gray-700 text-sm flex items-start gap-2">
                                                    <span className="text-red-600 mt-1">✗</span>
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Chatbot Button */}
            <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                onClick={() => setChatOpen(true)}
                className={`fixed bottom-6 right-6 w-16 h-16 rounded-full bg-gradient-to-r from-red-600 to-red-500 shadow-lg shadow-red-500/30 flex items-center justify-center z-40 hover:scale-110 transition-transform ${chatOpen ? "hidden" : ""}`}
            >
                <MessageCircle className="w-7 h-7 text-white" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-black" />
            </motion.button>

            {/* Chat Window */}
            <AnimatePresence>
                {chatOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 100, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 100, scale: 0.9 }}
                        className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden"
                    >
                        {/* Chat Header */}
                        <div className="p-4 bg-gradient-to-r from-red-600 to-red-500 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                    <Shield className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-white font-semibold">Safety Assistant</h3>
                                    <p className="text-white/70 text-xs">Online • Ask me anything</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setChatOpen(false)}
                                className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                            >
                                <X className="w-5 h-5 text-white" />
                            </button>
                        </div>

                        {/* Chat Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {chatMessages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    <div
                                        className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                                            msg.role === "user"
                                                ? "bg-red-600 text-white rounded-br-md"
                                                : "bg-gray-100 text-gray-800 rounded-bl-md"
                                        }`}
                                    >
                                        <p className="text-sm">{msg.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Chat Input */}
                        <div className="p-4 border-t border-gray-100">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                                    placeholder="Ask about self-defense..."
                                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-400"
                                />
                                <button
                                    onClick={handleSendMessage}
                                    className="p-3 bg-red-500 rounded-xl hover:bg-red-600 transition-colors"
                                >
                                    <Send className="w-5 h-5 text-white" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
