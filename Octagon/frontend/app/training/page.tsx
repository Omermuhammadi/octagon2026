"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { roadmapApi, RoadmapProgressData } from "@/lib/api";
import {
    ChevronDown, ChevronRight, CheckCircle2, Circle,
    Trophy, Dumbbell, Shield, Target, Clock, Users,
    Loader2, Zap, Star, BookOpen
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type AgeGroup = "under-15" | "15-25" | "25+";
type Discipline = "BJJ" | "Wrestling" | "MMA";

interface Exercise {
    id: string;
    name: string;
    description: string;
    duration: string;
}

interface Week {
    week: number;
    title: string;
    focus: string;
    exercises: Exercise[];
}

// Age-tailored roadmap data
const roadmapData: Record<Discipline, Record<AgeGroup, Week[]>> = {
    BJJ: {
        "under-15": [
            { week: 1, title: "Fun Fundamentals", focus: "Body awareness and basic movements", exercises: [
                { id: "bjj-u15-w1-1", name: "Animal Walks", description: "Bear crawls, crab walks, and frog jumps to build coordination", duration: "15 min" },
                { id: "bjj-u15-w1-2", name: "Safe Falling (Breakfalls)", description: "Learn to fall safely from different positions - this protects you!", duration: "10 min" },
                { id: "bjj-u15-w1-3", name: "Partner Balance Games", description: "Fun push-pull games with a partner to learn balance", duration: "15 min" },
                { id: "bjj-u15-w1-4", name: "Base Position Drill", description: "Practice maintaining a strong base on your knees", duration: "10 min" },
            ]},
            { week: 2, title: "Ground Adventures", focus: "Basic ground positions and escapes", exercises: [
                { id: "bjj-u15-w2-1", name: "Mount Position", description: "Learn the mount position and how to stay balanced on top", duration: "15 min" },
                { id: "bjj-u15-w2-2", name: "Escape the Mount", description: "Learn the bridge and roll escape - your first escape technique!", duration: "15 min" },
                { id: "bjj-u15-w2-3", name: "Guard Position", description: "Understanding closed guard and keeping someone in your guard", duration: "10 min" },
                { id: "bjj-u15-w2-4", name: "Positional Sparring Game", description: "Light positional games starting from mount", duration: "15 min" },
            ]},
            { week: 3, title: "Gentle Submissions", focus: "Safe submission techniques", exercises: [
                { id: "bjj-u15-w3-1", name: "Cross Collar Choke", description: "Basic choke from mount position - always tap when caught!", duration: "15 min" },
                { id: "bjj-u15-w3-2", name: "Americana from Mount", description: "A safe shoulder lock that teaches you control", duration: "15 min" },
                { id: "bjj-u15-w3-3", name: "Tapping & Safety", description: "Practice tapping early and often - it keeps everyone safe", duration: "10 min" },
                { id: "bjj-u15-w3-4", name: "Flow Rolling", description: "Very light, playful rolling focusing on positions", duration: "15 min" },
            ]},
            { week: 4, title: "Putting It Together", focus: "Combining techniques in live situations", exercises: [
                { id: "bjj-u15-w4-1", name: "Technique Chain", description: "Mount > Americana > if they escape > take back", duration: "15 min" },
                { id: "bjj-u15-w4-2", name: "Escape Drills", description: "Partner gives you mount, side control - you escape!", duration: "15 min" },
                { id: "bjj-u15-w4-3", name: "Mini Tournament", description: "Fun mini-tournament with friends using what you learned", duration: "20 min" },
                { id: "bjj-u15-w4-4", name: "Goal Setting", description: "Set your next training goals with your coach", duration: "10 min" },
            ]},
        ],
        "15-25": [
            { week: 1, title: "Foundation Building", focus: "Core positions and movements", exercises: [
                { id: "bjj-1525-w1-1", name: "Breakfalls & Rolls", description: "Forward rolls, backward rolls, and side breakfalls", duration: "15 min" },
                { id: "bjj-1525-w1-2", name: "Shrimping & Bridging", description: "Essential hip escape and bridging movements", duration: "15 min" },
                { id: "bjj-1525-w1-3", name: "Closed Guard Basics", description: "Maintaining closed guard, breaking posture, basic sweeps", duration: "20 min" },
                { id: "bjj-1525-w1-4", name: "Mount Escapes", description: "Bridge and roll, elbow-knee escape from mount", duration: "20 min" },
            ]},
            { week: 2, title: "Submission Hunting", focus: "Fundamental submissions", exercises: [
                { id: "bjj-1525-w2-1", name: "Armbar from Guard", description: "Classic armbar setup from closed guard", duration: "20 min" },
                { id: "bjj-1525-w2-2", name: "Triangle Choke", description: "Triangle setup, angle adjustment, and finishing", duration: "20 min" },
                { id: "bjj-1525-w2-3", name: "Kimura/Americana", description: "Kimura from guard, Americana from mount and side control", duration: "20 min" },
                { id: "bjj-1525-w2-4", name: "Positional Sparring", description: "5-minute rounds from specific positions", duration: "25 min" },
            ]},
            { week: 3, title: "Guard Game", focus: "Developing your guard", exercises: [
                { id: "bjj-1525-w3-1", name: "Open Guard Fundamentals", description: "De La Riva, spider guard, and lasso guard basics", duration: "20 min" },
                { id: "bjj-1525-w3-2", name: "Sweep Combinations", description: "Scissor sweep, hip bump, flower sweep chains", duration: "20 min" },
                { id: "bjj-1525-w3-3", name: "Guard Retention", description: "Framing, hip movement, and recovering guard", duration: "15 min" },
                { id: "bjj-1525-w3-4", name: "Live Rolling", description: "Full rolling rounds with focus on guard work", duration: "30 min" },
            ]},
            { week: 4, title: "Competition Prep", focus: "Live training and strategy", exercises: [
                { id: "bjj-1525-w4-1", name: "Takedown to Pass", description: "Single leg > guard pass > submission chain", duration: "25 min" },
                { id: "bjj-1525-w4-2", name: "Scramble Drills", description: "Reaction drills from bad positions", duration: "20 min" },
                { id: "bjj-1525-w4-3", name: "Timed Rounds", description: "Competition-pace 6-minute rounds", duration: "30 min" },
                { id: "bjj-1525-w4-4", name: "Strategy Review", description: "Game plan development based on your strengths", duration: "15 min" },
            ]},
        ],
        "25+": [
            { week: 1, title: "Smart Foundations", focus: "Technique-first approach with joint care", exercises: [
                { id: "bjj-25p-w1-1", name: "Joint Mobility Warm-up", description: "Gentle mobility routine for shoulders, hips, and knees", duration: "15 min" },
                { id: "bjj-25p-w1-2", name: "Technical Shrimping", description: "Slow, precise hip escapes focusing on efficiency", duration: "15 min" },
                { id: "bjj-25p-w1-3", name: "Closed Guard Control", description: "Using grips and angles rather than strength", duration: "20 min" },
                { id: "bjj-25p-w1-4", name: "Low-Impact Drilling", description: "Repetitive technique drilling at controlled pace", duration: "20 min" },
            ]},
            { week: 2, title: "Efficient Submissions", focus: "High-percentage, low-energy techniques", exercises: [
                { id: "bjj-25p-w2-1", name: "Collar Chokes", description: "Cross choke variations that rely on technique, not strength", duration: "20 min" },
                { id: "bjj-25p-w2-2", name: "Straight Armbar", description: "Armbar from mount focusing on hip placement and leverage", duration: "20 min" },
                { id: "bjj-25p-w2-3", name: "Guillotine Defense", description: "Defending and escaping common headlock positions", duration: "15 min" },
                { id: "bjj-25p-w2-4", name: "Flow Drilling", description: "Slow-speed technique chains with a partner", duration: "20 min" },
            ]},
            { week: 3, title: "Pressure Game", focus: "Using body weight and positioning", exercises: [
                { id: "bjj-25p-w3-1", name: "Side Control Mastery", description: "Heavy top pressure using crossface and hip position", duration: "20 min" },
                { id: "bjj-25p-w3-2", name: "Knee on Belly", description: "Transitioning to and maintaining knee on belly", duration: "15 min" },
                { id: "bjj-25p-w3-3", name: "Back Control", description: "Taking the back and maintaining seatbelt control", duration: "20 min" },
                { id: "bjj-25p-w3-4", name: "Controlled Sparring", description: "70% intensity rolling with focus on positions", duration: "20 min" },
            ]},
            { week: 4, title: "Game Development", focus: "Building your personal game plan", exercises: [
                { id: "bjj-25p-w4-1", name: "A-Game Drilling", description: "Identify and drill your 3 best techniques repeatedly", duration: "25 min" },
                { id: "bjj-25p-w4-2", name: "Weakness Work", description: "Drill specifically from your worst positions", duration: "20 min" },
                { id: "bjj-25p-w4-3", name: "Situational Rolling", description: "Start from disadvantageous positions", duration: "25 min" },
                { id: "bjj-25p-w4-4", name: "Recovery & Stretching", description: "Yoga-based cooldown and injury prevention", duration: "20 min" },
            ]},
        ],
    },
    Wrestling: {
        "under-15": [
            { week: 1, title: "Wrestling Basics", focus: "Stance, motion, and safety", exercises: [
                { id: "wr-u15-w1-1", name: "Wrestling Stance", description: "Learn the proper wrestling stance and level changes", duration: "10 min" },
                { id: "wr-u15-w1-2", name: "Penetration Step", description: "The key footwork for all takedowns", duration: "15 min" },
                { id: "wr-u15-w1-3", name: "Sprawl Drill", description: "Defending takedowns by sprawling your hips back", duration: "10 min" },
                { id: "wr-u15-w1-4", name: "Tag Wrestling Game", description: "Fun movement game using wrestling stance", duration: "15 min" },
            ]},
            { week: 2, title: "Takedown Time", focus: "Basic takedown techniques", exercises: [
                { id: "wr-u15-w2-1", name: "Double Leg Takedown", description: "Basic double leg - change levels, drive through", duration: "15 min" },
                { id: "wr-u15-w2-2", name: "Single Leg Pickup", description: "Grab one leg and finish with a trip", duration: "15 min" },
                { id: "wr-u15-w2-3", name: "Snap Down", description: "Pull your opponent's head down to front headlock", duration: "10 min" },
                { id: "wr-u15-w2-4", name: "Takedown Games", description: "First to 3 takedowns wins!", duration: "15 min" },
            ]},
            { week: 3, title: "Control & Pins", focus: "Ground control positions", exercises: [
                { id: "wr-u15-w3-1", name: "Cross-face Cradle", description: "Basic pinning combination", duration: "15 min" },
                { id: "wr-u15-w3-2", name: "Half Nelson", description: "Classic pin technique from referee position", duration: "15 min" },
                { id: "wr-u15-w3-3", name: "Stand-up Escape", description: "Getting back to your feet from bottom", duration: "10 min" },
                { id: "wr-u15-w3-4", name: "Situational Wrestling", description: "Start from referee position, practice escapes and rides", duration: "15 min" },
            ]},
            { week: 4, title: "Match Day", focus: "Putting it all together", exercises: [
                { id: "wr-u15-w4-1", name: "Chain Wrestling", description: "Double leg > if blocked > single leg > snap down", duration: "15 min" },
                { id: "wr-u15-w4-2", name: "Match Simulation", description: "3 x 2-minute periods like a real match", duration: "20 min" },
                { id: "wr-u15-w4-3", name: "Conditioning Games", description: "Fun games that build wrestling-specific fitness", duration: "15 min" },
                { id: "wr-u15-w4-4", name: "Awards Ceremony", description: "Celebrate completed tasks and set new goals", duration: "10 min" },
            ]},
        ],
        "15-25": [
            { week: 1, title: "Stance & Motion", focus: "Offensive and defensive positioning", exercises: [
                { id: "wr-1525-w1-1", name: "Stance Drill", description: "Square vs staggered stance, level changes, hand fighting", duration: "15 min" },
                { id: "wr-1525-w1-2", name: "Penetration Steps", description: "High-crotch and low-single entries", duration: "15 min" },
                { id: "wr-1525-w1-3", name: "Sprawl & Recover", description: "Defensive sprawling with quick recovery to stance", duration: "15 min" },
                { id: "wr-1525-w1-4", name: "Hand Fighting Rounds", description: "Tie-up exchanges focusing on inside control", duration: "20 min" },
            ]},
            { week: 2, title: "Attack System", focus: "Takedown combinations", exercises: [
                { id: "wr-1525-w2-1", name: "Blast Double", description: "Explosive double leg with proper finish", duration: "20 min" },
                { id: "wr-1525-w2-2", name: "High-Crotch Series", description: "High-crotch to dump, to lift, to trip", duration: "20 min" },
                { id: "wr-1525-w2-3", name: "Ankle Pick Setup", description: "Snap to ankle pick from collar tie", duration: "15 min" },
                { id: "wr-1525-w2-4", name: "Live Takedowns", description: "Takedown-only sparring rounds", duration: "25 min" },
            ]},
            { week: 3, title: "Ground Control", focus: "Riding, turning, and escaping", exercises: [
                { id: "wr-1525-w3-1", name: "Tight Waist Series", description: "Gut wrench, mat return, and tilt from tight waist", duration: "20 min" },
                { id: "wr-1525-w3-2", name: "Leg Riding", description: "Using legs to control opponent on the mat", duration: "20 min" },
                { id: "wr-1525-w3-3", name: "Stand-up & Sit-out", description: "Bottom escapes with hip switches", duration: "15 min" },
                { id: "wr-1525-w3-4", name: "Situation Wrestling", description: "Start from various positions, work escapes and pins", duration: "25 min" },
            ]},
            { week: 4, title: "Competition Ready", focus: "High-intensity match preparation", exercises: [
                { id: "wr-1525-w4-1", name: "Chain Attacks", description: "3-4 technique chains from various setups", duration: "20 min" },
                { id: "wr-1525-w4-2", name: "Match Simulation", description: "Full 3-period matches at competition pace", duration: "25 min" },
                { id: "wr-1525-w4-3", name: "Conditioning Circuit", description: "Wrestling-specific conditioning drills", duration: "20 min" },
                { id: "wr-1525-w4-4", name: "Video Analysis", description: "Review your matches and identify patterns", duration: "15 min" },
            ]},
        ],
        "25+": [
            { week: 1, title: "Wrestling Fundamentals", focus: "Safe technique for adult beginners", exercises: [
                { id: "wr-25p-w1-1", name: "Warm-up Routine", description: "Joint-friendly warm-up focusing on shoulders and knees", duration: "15 min" },
                { id: "wr-25p-w1-2", name: "Level Change Drill", description: "Low-impact stance and level change practice", duration: "15 min" },
                { id: "wr-25p-w1-3", name: "Clinch Work", description: "Over-under, collar tie positions without takedowns", duration: "15 min" },
                { id: "wr-25p-w1-4", name: "Controlled Shooting", description: "Penetration step practice at 50% speed", duration: "15 min" },
            ]},
            { week: 2, title: "Smart Takedowns", focus: "Efficient takedowns that minimize injury risk", exercises: [
                { id: "wr-25p-w2-1", name: "Body Lock Takedown", description: "Safe, controlled takedown using body lock", duration: "20 min" },
                { id: "wr-25p-w2-2", name: "Arm Drag to Back", description: "Arm drag to back take without shooting", duration: "15 min" },
                { id: "wr-25p-w2-3", name: "Snap Down to Front", description: "Low-impact snap down to front headlock", duration: "15 min" },
                { id: "wr-25p-w2-4", name: "Partner Drilling", description: "Cooperative drilling at 60% intensity", duration: "20 min" },
            ]},
            { week: 3, title: "Control Game", focus: "Top position control and escapes", exercises: [
                { id: "wr-25p-w3-1", name: "Crossface Control", description: "Using crossface from side to maintain control", duration: "15 min" },
                { id: "wr-25p-w3-2", name: "Hip Switches", description: "Switching hips to follow movement on the mat", duration: "15 min" },
                { id: "wr-25p-w3-3", name: "Technical Stand-up", description: "Getting to feet safely from bottom position", duration: "15 min" },
                { id: "wr-25p-w3-4", name: "Light Live Wrestling", description: "Controlled live rounds at reduced intensity", duration: "20 min" },
            ]},
            { week: 4, title: "Integration", focus: "Combining techniques smoothly", exercises: [
                { id: "wr-25p-w4-1", name: "Technique Chains", description: "Link 2-3 techniques in smooth combinations", duration: "20 min" },
                { id: "wr-25p-w4-2", name: "Reactive Drilling", description: "Partner gives different reactions, you adjust", duration: "20 min" },
                { id: "wr-25p-w4-3", name: "Controlled Sparring", description: "70% intensity rounds with specific goals", duration: "20 min" },
                { id: "wr-25p-w4-4", name: "Stretching & Recovery", description: "Wrestling-specific cooldown routine", duration: "15 min" },
            ]},
        ],
    },
    MMA: {
        "under-15": [
            { week: 1, title: "MMA Basics", focus: "Safe striking and movement", exercises: [
                { id: "mma-u15-w1-1", name: "Fight Stance", description: "Learn the basic MMA fighting stance for balance and defense", duration: "10 min" },
                { id: "mma-u15-w1-2", name: "Jab & Cross", description: "Throw straight punches at focus mitts -- power comes from rotation!", duration: "15 min" },
                { id: "mma-u15-w1-3", name: "Footwork Ladder", description: "In-out, side-to-side movement using agility ladder", duration: "10 min" },
                { id: "mma-u15-w1-4", name: "Shadow Boxing", description: "Practice punches and movement alone in front of a mirror", duration: "10 min" },
            ]},
            { week: 2, title: "Kick Game", focus: "Basic kicks and combinations", exercises: [
                { id: "mma-u15-w2-1", name: "Front Kick", description: "Push kick to the body for keeping distance", duration: "15 min" },
                { id: "mma-u15-w2-2", name: "Roundhouse Kick", description: "The bread-and-butter kick of MMA - shin to pad!", duration: "15 min" },
                { id: "mma-u15-w2-3", name: "Jab-Cross-Kick", description: "Your first 3-strike combination", duration: "10 min" },
                { id: "mma-u15-w2-4", name: "Pad Work with Partner", description: "Practice combos on pads held by your partner", duration: "15 min" },
            ]},
            { week: 3, title: "Defense Skills", focus: "Blocking, slipping, and checking kicks", exercises: [
                { id: "mma-u15-w3-1", name: "Blocking Punches", description: "High guard block for hooks, parry for straights", duration: "15 min" },
                { id: "mma-u15-w3-2", name: "Checking Kicks", description: "Lift your shin to block incoming kicks", duration: "10 min" },
                { id: "mma-u15-w3-3", name: "Slip and Counter", description: "Slip a jab, come back with a cross", duration: "15 min" },
                { id: "mma-u15-w3-4", name: "Defense Sparring", description: "One attacks, one defends only - then switch", duration: "15 min" },
            ]},
            { week: 4, title: "MMA Challenge", focus: "Putting striking together", exercises: [
                { id: "mma-u15-w4-1", name: "Combination Drills", description: "Jab-cross-hook-kick combinations on pads", duration: "15 min" },
                { id: "mma-u15-w4-2", name: "Light Sparring", description: "Touch sparring at 30% power with full gear", duration: "15 min" },
                { id: "mma-u15-w4-3", name: "Fitness Challenge", description: "Push-ups, sit-ups, burpees circuit", duration: "15 min" },
                { id: "mma-u15-w4-4", name: "Belt Ceremony", description: "Celebrate your progress!", duration: "10 min" },
            ]},
        ],
        "15-25": [
            { week: 1, title: "Striking Fundamentals", focus: "Boxing and kickboxing basics", exercises: [
                { id: "mma-1525-w1-1", name: "Boxing Combinations", description: "1-2, 1-2-3, 1-2-3-2 on heavy bag", duration: "20 min" },
                { id: "mma-1525-w1-2", name: "Roundhouse Kick Technique", description: "Lead and rear roundhouse kicks with proper form", duration: "20 min" },
                { id: "mma-1525-w1-3", name: "Footwork Patterns", description: "Diamond, L-step, and pivot drills", duration: "15 min" },
                { id: "mma-1525-w1-4", name: "Pad Work Rounds", description: "3-minute rounds on pads with combos and movement", duration: "25 min" },
            ]},
            { week: 2, title: "Clinch & Takedowns", focus: "Closing distance and grappling", exercises: [
                { id: "mma-1525-w2-1", name: "Clinch Entry", description: "Jab to collar tie, underhook entries", duration: "15 min" },
                { id: "mma-1525-w2-2", name: "Dirty Boxing", description: "Short punches, elbows, and knees in the clinch", duration: "20 min" },
                { id: "mma-1525-w2-3", name: "MMA Takedowns", description: "Double leg, body lock, and trip from clinch", duration: "20 min" },
                { id: "mma-1525-w2-4", name: "Clinch Sparring", description: "Clinch-only rounds with takedowns allowed", duration: "25 min" },
            ]},
            { week: 3, title: "Ground & Pound", focus: "Top control and striking on the ground", exercises: [
                { id: "mma-1525-w3-1", name: "Guard Passing", description: "Torreando, knee slice, and stack pass", duration: "20 min" },
                { id: "mma-1525-w3-2", name: "Ground & Pound", description: "Striking from top position with proper posture", duration: "20 min" },
                { id: "mma-1525-w3-3", name: "Submission Defense", description: "Defending armbar, triangle, and guillotine", duration: "15 min" },
                { id: "mma-1525-w3-4", name: "MMA Grappling Rounds", description: "Ground rounds with strikes and submissions", duration: "25 min" },
            ]},
            { week: 4, title: "Full MMA", focus: "Complete MMA training", exercises: [
                { id: "mma-1525-w4-1", name: "Fight Simulation", description: "3 x 5-minute rounds mixing all ranges", duration: "25 min" },
                { id: "mma-1525-w4-2", name: "Transition Drills", description: "Standing to clinch to ground and back up", duration: "20 min" },
                { id: "mma-1525-w4-3", name: "Conditioning", description: "MMA-specific cardio: burpees, sprawls, shots", duration: "20 min" },
                { id: "mma-1525-w4-4", name: "Game Plan Work", description: "Develop your fight strategy and preferences", duration: "15 min" },
            ]},
        ],
        "25+": [
            { week: 1, title: "Safe Striking", focus: "Technique-focused striking for adults", exercises: [
                { id: "mma-25p-w1-1", name: "Warm-up Flow", description: "Mobility-focused warm-up for joints and muscles", duration: "15 min" },
                { id: "mma-25p-w1-2", name: "Basic Combinations", description: "Jab-cross, jab-cross-hook at controlled pace", duration: "15 min" },
                { id: "mma-25p-w1-3", name: "Kick Technique", description: "Roundhouse and teep kicks focusing on balance", duration: "15 min" },
                { id: "mma-25p-w1-4", name: "Bag Work", description: "Light bag rounds focusing on technique over power", duration: "20 min" },
            ]},
            { week: 2, title: "Practical Defense", focus: "Real-world applicable defense", exercises: [
                { id: "mma-25p-w2-1", name: "Blocking & Parrying", description: "Defend common attacks with proper technique", duration: "15 min" },
                { id: "mma-25p-w2-2", name: "Takedown Defense", description: "Sprawl and frame to stay on feet", duration: "15 min" },
                { id: "mma-25p-w2-3", name: "Distance Management", description: "Using footwork to control range", duration: "15 min" },
                { id: "mma-25p-w2-4", name: "Light Technical Sparring", description: "Slow-speed sparring focusing on defense", duration: "20 min" },
            ]},
            { week: 3, title: "Ground Awareness", focus: "Basic ground skills", exercises: [
                { id: "mma-25p-w3-1", name: "Getting Up Safely", description: "Technical stand-up from ground to feet", duration: "15 min" },
                { id: "mma-25p-w3-2", name: "Basic Guard", description: "Closed guard fundamentals and simple sweeps", duration: "15 min" },
                { id: "mma-25p-w3-3", name: "Side Control Escape", description: "Frame and hip escape to recover guard", duration: "15 min" },
                { id: "mma-25p-w3-4", name: "Positional Drilling", description: "Gentle positional practice with a partner", duration: "20 min" },
            ]},
            { week: 4, title: "Putting It All Together", focus: "Integration and fitness", exercises: [
                { id: "mma-25p-w4-1", name: "Combination Flow", description: "Flow through strikes, clinch, and ground smoothly", duration: "20 min" },
                { id: "mma-25p-w4-2", name: "Self-Defense Scenarios", description: "Practice realistic self-defense situations", duration: "15 min" },
                { id: "mma-25p-w4-3", name: "Fitness Assessment", description: "Test your progress with a fitness benchmark", duration: "15 min" },
                { id: "mma-25p-w4-4", name: "Cool Down & Stretch", description: "Comprehensive cool-down and flexibility work", duration: "20 min" },
            ]},
        ],
    },
};

const ageGroupInfo: Record<AgeGroup, { label: string; icon: any; description: string; color: string }> = {
    "under-15": { label: "Under 15", icon: Star, description: "Fun, safe, and playful training for young athletes", color: "green" },
    "15-25": { label: "15 - 25", icon: Zap, description: "Competitive training for peak performance years", color: "red" },
    "25+": { label: "25+", icon: Shield, description: "Smart training with injury prevention focus", color: "blue" },
};

const disciplineInfo: Record<Discipline, { icon: any; color: string }> = {
    BJJ: { icon: Users, color: "purple" },
    Wrestling: { icon: Dumbbell, color: "yellow" },
    MMA: { icon: Target, color: "red" },
};

export default function TrainingPage() {
    const { user, token, isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null);
    const [discipline, setDiscipline] = useState<Discipline | null>(null);
    const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
    const [expandedWeek, setExpandedWeek] = useState<number | null>(1);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [authLoading, isAuthenticated, router]);

    // Load saved progress
    useEffect(() => {
        if (token && ageGroup && discipline) {
            const roadmapId = `${discipline.toLowerCase()}-${ageGroup}`;
            roadmapApi.getProgress(token).then(res => {
                if (res.success && res.data) {
                    const saved = res.data.find((p: RoadmapProgressData) => p.roadmapId === roadmapId);
                    if (saved) {
                        setCompletedTasks(new Set(saved.completedTasks));
                    }
                }
            }).catch(() => {});
        }
    }, [token, ageGroup, discipline]);

    const toggleTask = useCallback(async (taskId: string) => {
        const newCompleted = new Set(completedTasks);
        if (newCompleted.has(taskId)) {
            newCompleted.delete(taskId);
        } else {
            newCompleted.add(taskId);
        }
        setCompletedTasks(newCompleted);

        // Save to backend
        if (token && ageGroup && discipline) {
            setSaving(true);
            const roadmapId = `${discipline.toLowerCase()}-${ageGroup}`;
            try {
                await roadmapApi.saveProgress({
                    roadmapId,
                    discipline,
                    ageGroup,
                    completedTasks: Array.from(newCompleted),
                    currentWeek: expandedWeek || 1,
                }, token);
            } catch (e) {
                console.error("Failed to save progress:", e);
            } finally {
                setSaving(false);
            }
        }
    }, [completedTasks, token, ageGroup, discipline, expandedWeek]);

    const weeks = ageGroup && discipline ? roadmapData[discipline][ageGroup] : [];
    const totalExercises = weeks.reduce((sum, w) => sum + w.exercises.length, 0);
    const completedCount = weeks.reduce((sum, w) => sum + w.exercises.filter(e => completedTasks.has(e.id)).length, 0);
    const progressPercent = totalExercises > 0 ? Math.round((completedCount / totalExercises) * 100) : 0;

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-red-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-black via-neutral-950 to-black pt-24 pb-16">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                        Training <span className="text-red-500">Roadmaps</span>
                    </h1>
                    <p className="text-neutral-400 max-w-xl mx-auto text-lg">
                        Age-appropriate training programs tailored to your level and goals
                    </p>
                </motion.div>

                {/* Age Group Selection */}
                {!ageGroup && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <h2 className="text-xl font-bold text-white mb-6 text-center">Select Your Age Group</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {(Object.entries(ageGroupInfo) as [AgeGroup, typeof ageGroupInfo[AgeGroup]][]).map(([key, info]) => (
                                <button key={key} onClick={() => setAgeGroup(key)}
                                    className={`p-6 rounded-2xl border bg-neutral-900/50 backdrop-blur-sm hover:bg-white/5 transition-all text-left border-white/10 hover:border-${info.color}-500/30`}
                                >
                                    <info.icon className={`w-10 h-10 mb-4 text-${info.color}-500`} />
                                    <h3 className="text-white text-2xl font-bold mb-2">{info.label}</h3>
                                    <p className="text-neutral-400 text-sm">{info.description}</p>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Discipline Selection */}
                {ageGroup && !discipline && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <button onClick={() => setAgeGroup(null)} className="text-neutral-400 hover:text-white mb-6 flex items-center gap-1 transition-colors">
                            <ChevronRight className="w-4 h-4 rotate-180" /> Back to age group
                        </button>
                        <h2 className="text-xl font-bold text-white mb-6 text-center">Choose Your Discipline</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {(Object.entries(disciplineInfo) as [Discipline, typeof disciplineInfo[Discipline]][]).map(([key, info]) => (
                                <button key={key} onClick={() => setDiscipline(key)}
                                    className="p-6 rounded-2xl border bg-neutral-900/50 backdrop-blur-sm hover:bg-white/5 transition-all text-left border-white/10"
                                >
                                    <info.icon className={`w-10 h-10 mb-4 text-${info.color}-500`} />
                                    <h3 className="text-white text-2xl font-bold mb-2">{key}</h3>
                                    <p className="text-neutral-400 text-sm">4-week program for {ageGroupInfo[ageGroup].label} age group</p>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Roadmap Display */}
                {ageGroup && discipline && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="flex items-center justify-between mb-8">
                            <button onClick={() => setDiscipline(null)} className="text-neutral-400 hover:text-white flex items-center gap-1 transition-colors">
                                <ChevronRight className="w-4 h-4 rotate-180" /> Back
                            </button>
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-neutral-400">{ageGroupInfo[ageGroup].label}</span>
                                <span className="text-white">|</span>
                                <span className="text-sm text-white font-bold">{discipline}</span>
                            </div>
                            {saving && <Loader2 className="w-4 h-4 animate-spin text-neutral-500" />}
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-8 bg-neutral-900/50 backdrop-blur-sm rounded-2xl border border-white/5 p-6">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-yellow-500" />
                                    <span className="text-white font-bold">Overall Progress</span>
                                </div>
                                <span className="text-white font-bold">{progressPercent}%</span>
                            </div>
                            <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} transition={{ duration: 0.8, ease: "easeOut" }}
                                    className="h-full rounded-full bg-gradient-to-r from-red-600 to-yellow-500"
                                />
                            </div>
                            <p className="text-neutral-500 text-sm mt-2">{completedCount} of {totalExercises} exercises completed</p>
                        </div>

                        {/* Weeks */}
                        <div className="space-y-4">
                            {weeks.map((week) => {
                                const weekCompleted = week.exercises.filter(e => completedTasks.has(e.id)).length;
                                const weekTotal = week.exercises.length;
                                const isExpanded = expandedWeek === week.week;

                                return (
                                    <div key={week.week} className="bg-neutral-900/50 backdrop-blur-sm rounded-2xl border border-white/5 overflow-hidden">
                                        <button onClick={() => setExpandedWeek(isExpanded ? null : week.week)}
                                            className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${weekCompleted === weekTotal ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-white'}`}>
                                                    {weekCompleted === weekTotal ? <CheckCircle2 className="w-5 h-5" /> : <span className="font-bold">{week.week}</span>}
                                                </div>
                                                <div className="text-left">
                                                    <h3 className="text-white font-bold">Week {week.week}: {week.title}</h3>
                                                    <p className="text-neutral-500 text-sm">{week.focus} | {weekCompleted}/{weekTotal} done</p>
                                                </div>
                                            </div>
                                            <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                        </button>

                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                                    className="border-t border-white/5"
                                                >
                                                    <div className="p-6 space-y-3">
                                                        {week.exercises.map((exercise) => {
                                                            const isDone = completedTasks.has(exercise.id);
                                                            return (
                                                                <button key={exercise.id} onClick={() => toggleTask(exercise.id)}
                                                                    className={`w-full text-left p-4 rounded-xl border transition-all ${isDone ? 'bg-green-500/5 border-green-500/20' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                                                >
                                                                    <div className="flex items-start gap-3">
                                                                        {isDone ? (
                                                                            <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                                                                        ) : (
                                                                            <Circle className="w-5 h-5 text-neutral-500 mt-0.5 flex-shrink-0" />
                                                                        )}
                                                                        <div className="flex-1">
                                                                            <div className="flex items-center justify-between">
                                                                                <h4 className={`font-semibold ${isDone ? 'text-green-400' : 'text-white'}`}>{exercise.name}</h4>
                                                                                <span className="text-neutral-500 text-xs flex items-center gap-1">
                                                                                    <Clock className="w-3 h-3" /> {exercise.duration}
                                                                                </span>
                                                                            </div>
                                                                            <p className={`text-sm mt-1 ${isDone ? 'text-green-400/60' : 'text-neutral-400'}`}>{exercise.description}</p>
                                                                        </div>
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
