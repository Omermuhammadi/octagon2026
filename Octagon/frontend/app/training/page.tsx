"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { roadmapApi, RoadmapProgressData, fighterTrainingApi, FighterTrainingAssignment, coachRosterApi, RosterFighter } from "@/lib/api";
import {
    ChevronDown, CheckCircle2, Circle,
    Trophy, Dumbbell, Shield, Target, Clock, Users,
    Loader2, Zap, Star, Lock, Play, X,
    Flame, Award, ArrowLeft, Trash2, ClipboardList, Plus, ChevronRight, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type AgeGroup = "Beginner" | "Intermediate" | "Advanced";
type Discipline = "BJJ" | "Wrestling" | "MMA" | "Muay Thai" | "Boxing";

interface Exercise {
    id: string;
    name: string;
    description: string;
    duration: string;
    videoUrl: string;
}

interface Week {
    week: number;
    title: string;
    focus: string;
    exercises: Exercise[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getYoutubeEmbedUrl(url: string): string {
    const match = url.match(/[?&]v=([^&]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : url;
}

function computeUnlockedWeeks(weeks: Week[], completedTasks: Set<string>): number[] {
    const unlocked = [1];
    for (let i = 0; i < weeks.length - 1; i++) {
        const weekComplete = weeks[i].exercises.every(e => completedTasks.has(e.id));
        if (weekComplete) {
            unlocked.push(weeks[i + 1].week);
        } else {
            break;
        }
    }
    return unlocked;
}

// ---------------------------------------------------------------------------
// Roadmap data (with YouTube video URLs for each exercise)
// ---------------------------------------------------------------------------
const roadmapData: Record<Discipline, Record<AgeGroup, Week[]>> = {
    BJJ: {
        "Beginner": [
            { week: 1, title: "Fun Fundamentals", focus: "Body awareness and basic movements", exercises: [
                { id: "bjj-u15-w1-1", name: "Animal Walks", description: "Bear crawls, crab walks, and frog jumps to build coordination", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=14BjRxE7f1o" },
                { id: "bjj-u15-w1-2", name: "Safe Falling (Breakfalls)", description: "Learn to fall safely from different positions - this protects you!", duration: "10 min", videoUrl: "https://www.youtube.com/watch?v=YvY3VwbxxDw" },
                { id: "bjj-u15-w1-3", name: "Partner Balance Games", description: "Fun push-pull games with a partner to learn balance", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=14BjRxE7f1o" },
                { id: "bjj-u15-w1-4", name: "Base Position Drill", description: "Practice maintaining a strong base on your knees", duration: "10 min", videoUrl: "https://www.youtube.com/watch?v=Z_FBT8ZDSmo" },
            ]},
            { week: 2, title: "Ground Adventures", focus: "Basic ground positions and escapes", exercises: [
                { id: "bjj-u15-w2-1", name: "Mount Position", description: "Learn the mount position and how to stay balanced on top", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=gUf0UsJEZG8" },
                { id: "bjj-u15-w2-2", name: "Escape the Mount", description: "Learn the bridge and roll escape - your first escape technique!", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=Z-H0Z0AqVfk" },
                { id: "bjj-u15-w2-3", name: "Guard Position", description: "Understanding closed guard and keeping someone in your guard", duration: "10 min", videoUrl: "https://www.youtube.com/watch?v=Z_FBT8ZDSmo" },
                { id: "bjj-u15-w2-4", name: "Positional Sparring Game", description: "Light positional games starting from mount", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=5IZz2GHQfQA" },
            ]},
            { week: 3, title: "Gentle Submissions", focus: "Safe submission techniques", exercises: [
                { id: "bjj-u15-w3-1", name: "Cross Collar Choke", description: "Basic choke from mount position - always tap when caught!", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=sYeKzpazoek" },
                { id: "bjj-u15-w3-2", name: "Americana from Mount", description: "A safe shoulder lock that teaches you control", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=6W9yVDLSZIk" },
                { id: "bjj-u15-w3-3", name: "Tapping & Safety", description: "Practice tapping early and often - it keeps everyone safe", duration: "10 min", videoUrl: "https://www.youtube.com/watch?v=YvY3VwbxxDw" },
                { id: "bjj-u15-w3-4", name: "Flow Rolling", description: "Very light, playful rolling focusing on positions", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=XjPXAWummOM" },
            ]},
            { week: 4, title: "Putting It Together", focus: "Combining techniques in live situations", exercises: [
                { id: "bjj-u15-w4-1", name: "Technique Chain", description: "Mount > Americana > if they escape > take back", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=Lqz1KgTLdqM" },
                { id: "bjj-u15-w4-2", name: "Escape Drills", description: "Partner gives you mount, side control - you escape!", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=Z-H0Z0AqVfk" },
                { id: "bjj-u15-w4-3", name: "Mini Tournament", description: "Fun mini-tournament with friends using what you learned", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=5IZz2GHQfQA" },
                { id: "bjj-u15-w4-4", name: "Goal Setting", description: "Set your next training goals with your coach", duration: "10 min", videoUrl: "https://www.youtube.com/watch?v=5IZz2GHQfQA" },
            ]},
        ],
        "Intermediate": [
            { week: 1, title: "Foundation Building", focus: "Core positions and movements", exercises: [
                { id: "bjj-1525-w1-1", name: "Breakfalls & Rolls", description: "Forward rolls, backward rolls, and side breakfalls", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=YvY3VwbxxDw" },
                { id: "bjj-1525-w1-2", name: "Shrimping & Bridging", description: "Essential hip escape and bridging movements", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=D0rTw8IfJDE" },
                { id: "bjj-1525-w1-3", name: "Closed Guard Basics", description: "Maintaining closed guard, breaking posture, basic sweeps", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=Z_FBT8ZDSmo" },
                { id: "bjj-1525-w1-4", name: "Mount Escapes", description: "Bridge and roll, elbow-knee escape from mount", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=Z-H0Z0AqVfk" },
            ]},
            { week: 2, title: "Submission Hunting", focus: "Fundamental submissions", exercises: [
                { id: "bjj-1525-w2-1", name: "Armbar from Guard", description: "Classic armbar setup from closed guard", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=ug5Knk1HlsY" },
                { id: "bjj-1525-w2-2", name: "Triangle Choke", description: "Triangle setup, angle adjustment, and finishing", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=20j7LcZ5xRY" },
                { id: "bjj-1525-w2-3", name: "Kimura/Americana", description: "Kimura from guard, Americana from mount and side control", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=fqQ4mVxJaoE" },
                { id: "bjj-1525-w2-4", name: "Positional Sparring", description: "5-minute rounds from specific positions", duration: "25 min", videoUrl: "https://www.youtube.com/watch?v=5IZz2GHQfQA" },
            ]},
            { week: 3, title: "Guard Game", focus: "Developing your guard", exercises: [
                { id: "bjj-1525-w3-1", name: "Open Guard Fundamentals", description: "De La Riva, spider guard, and lasso guard basics", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=npuOznVZoXA" },
                { id: "bjj-1525-w3-2", name: "Sweep Combinations", description: "Scissor sweep, hip bump, flower sweep chains", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=nVRzhBr4tj8" },
                { id: "bjj-1525-w3-3", name: "Guard Retention", description: "Framing, hip movement, and recovering guard", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=kpdwZV9_FZw" },
                { id: "bjj-1525-w3-4", name: "Live Rolling", description: "Full rolling rounds with focus on guard work", duration: "30 min", videoUrl: "https://www.youtube.com/watch?v=XjPXAWummOM" },
            ]},
            { week: 4, title: "Competition Prep", focus: "Live training and strategy", exercises: [
                { id: "bjj-1525-w4-1", name: "Takedown to Pass", description: "Single leg > guard pass > submission chain", duration: "25 min", videoUrl: "https://www.youtube.com/watch?v=dl_SvwPfpDc" },
                { id: "bjj-1525-w4-2", name: "Scramble Drills", description: "Reaction drills from bad positions", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=D0rTw8IfJDE" },
                { id: "bjj-1525-w4-3", name: "Timed Rounds", description: "Competition-pace 6-minute rounds", duration: "30 min", videoUrl: "https://www.youtube.com/watch?v=5IZz2GHQfQA" },
                { id: "bjj-1525-w4-4", name: "Strategy Review", description: "Game plan development based on your strengths", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=5IZz2GHQfQA" },
            ]},
        ],
        "Advanced": [
            { week: 1, title: "Smart Foundations", focus: "Technique-first approach with joint care", exercises: [
                { id: "bjj-25p-w1-1", name: "Joint Mobility Warm-up", description: "Gentle mobility routine for shoulders, hips, and knees", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=UiO3WBOxUsc" },
                { id: "bjj-25p-w1-2", name: "Technical Shrimping", description: "Slow, precise hip escapes focusing on efficiency", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=D0rTw8IfJDE" },
                { id: "bjj-25p-w1-3", name: "Closed Guard Control", description: "Using grips and angles rather than strength", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=Z_FBT8ZDSmo" },
                { id: "bjj-25p-w1-4", name: "Low-Impact Drilling", description: "Repetitive technique drilling at controlled pace", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=5IZz2GHQfQA" },
            ]},
            { week: 2, title: "Efficient Submissions", focus: "High-percentage, low-energy techniques", exercises: [
                { id: "bjj-25p-w2-1", name: "Collar Chokes", description: "Cross choke variations that rely on technique, not strength", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=sYeKzpazoek" },
                { id: "bjj-25p-w2-2", name: "Straight Armbar", description: "Armbar from mount focusing on hip placement and leverage", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=ug5Knk1HlsY" },
                { id: "bjj-25p-w2-3", name: "Guillotine Defense", description: "Defending and escaping common headlock positions", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=fqQ4mVxJaoE" },
                { id: "bjj-25p-w2-4", name: "Flow Drilling", description: "Slow-speed technique chains with a partner", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=XjPXAWummOM" },
            ]},
            { week: 3, title: "Pressure Game", focus: "Using body weight and positioning", exercises: [
                { id: "bjj-25p-w3-1", name: "Side Control Mastery", description: "Heavy top pressure using crossface and hip position", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=HuWBCy6GUJw" },
                { id: "bjj-25p-w3-2", name: "Knee on Belly", description: "Transitioning to and maintaining knee on belly", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=BHUYEm0ve9A" },
                { id: "bjj-25p-w3-3", name: "Back Control", description: "Taking the back and maintaining seatbelt control", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=Lqz1KgTLdqM" },
                { id: "bjj-25p-w3-4", name: "Controlled Sparring", description: "70% intensity rolling with focus on positions", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=5IZz2GHQfQA" },
            ]},
            { week: 4, title: "Game Development", focus: "Building your personal game plan", exercises: [
                { id: "bjj-25p-w4-1", name: "A-Game Drilling", description: "Identify and drill your 3 best techniques repeatedly", duration: "25 min", videoUrl: "https://www.youtube.com/watch?v=5IZz2GHQfQA" },
                { id: "bjj-25p-w4-2", name: "Weakness Work", description: "Drill specifically from your worst positions", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=D0rTw8IfJDE" },
                { id: "bjj-25p-w4-3", name: "Situational Rolling", description: "Start from disadvantageous positions", duration: "25 min", videoUrl: "https://www.youtube.com/watch?v=5IZz2GHQfQA" },
                { id: "bjj-25p-w4-4", name: "Recovery & Stretching", description: "Yoga-based cooldown and injury prevention", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=UiO3WBOxUsc" },
            ]},
        ],
    },
    Wrestling: {
        "Beginner": [
            { week: 1, title: "Wrestling Basics", focus: "Stance, motion, and safety", exercises: [
                { id: "wr-u15-w1-1", name: "Wrestling Stance", description: "Learn the proper wrestling stance and level changes", duration: "10 min", videoUrl: "https://www.youtube.com/watch?v=eOUeMEr0VyA" },
                { id: "wr-u15-w1-2", name: "Penetration Step", description: "The key footwork for all takedowns", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=ttfSa74InTo" },
                { id: "wr-u15-w1-3", name: "Sprawl Drill", description: "Defending takedowns by sprawling your hips back", duration: "10 min", videoUrl: "https://www.youtube.com/watch?v=_9j0hdWoSVs" },
                { id: "wr-u15-w1-4", name: "Tag Wrestling Game", description: "Fun movement game using wrestling stance", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=eOUeMEr0VyA" },
            ]},
            { week: 2, title: "Takedown Time", focus: "Basic takedown techniques", exercises: [
                { id: "wr-u15-w2-1", name: "Double Leg Takedown", description: "Basic double leg - change levels, drive through", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=hML9vjR6wX0" },
                { id: "wr-u15-w2-2", name: "Single Leg Pickup", description: "Grab one leg and finish with a trip", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=dl_SvwPfpDc" },
                { id: "wr-u15-w2-3", name: "Snap Down", description: "Pull your opponent's head down to front headlock", duration: "10 min", videoUrl: "https://www.youtube.com/watch?v=ajBnXdjbeSc" },
                { id: "wr-u15-w2-4", name: "Takedown Games", description: "First to 3 takedowns wins!", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=hML9vjR6wX0" },
            ]},
            { week: 3, title: "Control & Pins", focus: "Ground control positions", exercises: [
                { id: "wr-u15-w3-1", name: "Cross-face Cradle", description: "Basic pinning combination", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=uxVGCgTG5mc" },
                { id: "wr-u15-w3-2", name: "Half Nelson", description: "Classic pin technique from referee position", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=affZTEQ0O58" },
                { id: "wr-u15-w3-3", name: "Stand-up Escape", description: "Getting back to your feet from bottom", duration: "10 min", videoUrl: "https://www.youtube.com/watch?v=mt1HB1x3lDk" },
                { id: "wr-u15-w3-4", name: "Situational Wrestling", description: "Start from referee position, practice escapes and rides", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=mt1HB1x3lDk" },
            ]},
            { week: 4, title: "Match Day", focus: "Putting it all together", exercises: [
                { id: "wr-u15-w4-1", name: "Chain Wrestling", description: "Double leg > if blocked > single leg > snap down", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=NZGARl6TymM" },
                { id: "wr-u15-w4-2", name: "Match Simulation", description: "3 x 2-minute periods like a real match", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=eOUeMEr0VyA" },
                { id: "wr-u15-w4-3", name: "Conditioning Games", description: "Fun games that build wrestling-specific fitness", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=z5fe7xVJQfY" },
                { id: "wr-u15-w4-4", name: "Awards Ceremony", description: "Celebrate completed tasks and set new goals", duration: "10 min", videoUrl: "https://www.youtube.com/watch?v=eOUeMEr0VyA" },
            ]},
        ],
        "Intermediate": [
            { week: 1, title: "Stance & Motion", focus: "Offensive and defensive positioning", exercises: [
                { id: "wr-1525-w1-1", name: "Stance Drill", description: "Square vs staggered stance, level changes, hand fighting", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=eOUeMEr0VyA" },
                { id: "wr-1525-w1-2", name: "Penetration Steps", description: "High-crotch and low-single entries", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=ttfSa74InTo" },
                { id: "wr-1525-w1-3", name: "Sprawl & Recover", description: "Defensive sprawling with quick recovery to stance", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=_9j0hdWoSVs" },
                { id: "wr-1525-w1-4", name: "Hand Fighting Rounds", description: "Tie-up exchanges focusing on inside control", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=Y2urYTUaVm8" },
            ]},
            { week: 2, title: "Attack System", focus: "Takedown combinations", exercises: [
                { id: "wr-1525-w2-1", name: "Blast Double", description: "Explosive double leg with proper finish", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=hML9vjR6wX0" },
                { id: "wr-1525-w2-2", name: "High-Crotch Series", description: "High-crotch to dump, to lift, to trip", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=L2Xz1fdB6sk" },
                { id: "wr-1525-w2-3", name: "Ankle Pick Setup", description: "Snap to ankle pick from collar tie", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=MmMshhfbUKI" },
                { id: "wr-1525-w2-4", name: "Live Takedowns", description: "Takedown-only sparring rounds", duration: "25 min", videoUrl: "https://www.youtube.com/watch?v=hML9vjR6wX0" },
            ]},
            { week: 3, title: "Ground Control", focus: "Riding, turning, and escaping", exercises: [
                { id: "wr-1525-w3-1", name: "Tight Waist Series", description: "Gut wrench, mat return, and tilt from tight waist", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=JD22xflFCTo" },
                { id: "wr-1525-w3-2", name: "Leg Riding", description: "Using legs to control opponent on the mat", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=AIjeYNETuaw" },
                { id: "wr-1525-w3-3", name: "Stand-up & Sit-out", description: "Bottom escapes with hip switches", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=_kbBhyxV0RY" },
                { id: "wr-1525-w3-4", name: "Situation Wrestling", description: "Start from various positions, work escapes and pins", duration: "25 min", videoUrl: "https://www.youtube.com/watch?v=mt1HB1x3lDk" },
            ]},
            { week: 4, title: "Competition Ready", focus: "High-intensity match preparation", exercises: [
                { id: "wr-1525-w4-1", name: "Chain Attacks", description: "3-4 technique chains from various setups", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=NZGARl6TymM" },
                { id: "wr-1525-w4-2", name: "Match Simulation", description: "Full 3-period matches at competition pace", duration: "25 min", videoUrl: "https://www.youtube.com/watch?v=eOUeMEr0VyA" },
                { id: "wr-1525-w4-3", name: "Conditioning Circuit", description: "Wrestling-specific conditioning drills", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=z5fe7xVJQfY" },
                { id: "wr-1525-w4-4", name: "Video Analysis", description: "Review your matches and identify patterns", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=eOUeMEr0VyA" },
            ]},
        ],
        "Advanced": [
            { week: 1, title: "Wrestling Fundamentals", focus: "Safe technique for adult beginners", exercises: [
                { id: "wr-25p-w1-1", name: "Warm-up Routine", description: "Joint-friendly warm-up focusing on shoulders and knees", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=eOUeMEr0VyA" },
                { id: "wr-25p-w1-2", name: "Level Change Drill", description: "Low-impact stance and level change practice", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=ttfSa74InTo" },
                { id: "wr-25p-w1-3", name: "Clinch Work", description: "Over-under, collar tie positions without takedowns", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=vXQrjRpA3So" },
                { id: "wr-25p-w1-4", name: "Controlled Shooting", description: "Penetration step practice at 50% speed", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=ttfSa74InTo" },
            ]},
            { week: 2, title: "Smart Takedowns", focus: "Efficient takedowns that minimize injury risk", exercises: [
                { id: "wr-25p-w2-1", name: "Body Lock Takedown", description: "Safe, controlled takedown using body lock", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=58bjvhxSkwM" },
                { id: "wr-25p-w2-2", name: "Arm Drag to Back", description: "Arm drag to back take without shooting", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=MIT6QXzTPGA" },
                { id: "wr-25p-w2-3", name: "Snap Down to Front", description: "Low-impact snap down to front headlock", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=ajBnXdjbeSc" },
                { id: "wr-25p-w2-4", name: "Partner Drilling", description: "Cooperative drilling at 60% intensity", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=58bjvhxSkwM" },
            ]},
            { week: 3, title: "Control Game", focus: "Top position control and escapes", exercises: [
                { id: "wr-25p-w3-1", name: "Crossface Control", description: "Using crossface from side to maintain control", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=uxVGCgTG5mc" },
                { id: "wr-25p-w3-2", name: "Hip Switches", description: "Switching hips to follow movement on the mat", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=_kbBhyxV0RY" },
                { id: "wr-25p-w3-3", name: "Technical Stand-up", description: "Getting to feet safely from bottom position", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=mt1HB1x3lDk" },
                { id: "wr-25p-w3-4", name: "Light Live Wrestling", description: "Controlled live rounds at reduced intensity", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=eOUeMEr0VyA" },
            ]},
            { week: 4, title: "Integration", focus: "Combining techniques smoothly", exercises: [
                { id: "wr-25p-w4-1", name: "Technique Chains", description: "Link 2-3 techniques in smooth combinations", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=NZGARl6TymM" },
                { id: "wr-25p-w4-2", name: "Reactive Drilling", description: "Partner gives different reactions, you adjust", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=MIT6QXzTPGA" },
                { id: "wr-25p-w4-3", name: "Controlled Sparring", description: "70% intensity rounds with specific goals", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=eOUeMEr0VyA" },
                { id: "wr-25p-w4-4", name: "Stretching & Recovery", description: "Wrestling-specific cooldown routine", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=UiO3WBOxUsc" },
            ]},
        ],
    },
    MMA: {
        "Beginner": [
            { week: 1, title: "MMA Basics", focus: "Safe striking and movement", exercises: [
                { id: "mma-u15-w1-1", name: "Fight Stance", description: "Learn the basic MMA fighting stance for balance and defense", duration: "10 min", videoUrl: "https://www.youtube.com/watch?v=hbsHcIjvsno" },
                { id: "mma-u15-w1-2", name: "Jab & Cross", description: "Throw straight punches at focus mitts -- power comes from rotation!", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=YsFK1MMDQgk" },
                { id: "mma-u15-w1-3", name: "Footwork Ladder", description: "In-out, side-to-side movement using agility ladder", duration: "10 min", videoUrl: "https://www.youtube.com/watch?v=i-64TBk_boM" },
                { id: "mma-u15-w1-4", name: "Shadow Boxing", description: "Practice punches and movement alone in front of a mirror", duration: "10 min", videoUrl: "https://www.youtube.com/watch?v=J4j3AOVWuHE" },
            ]},
            { week: 2, title: "Kick Game", focus: "Basic kicks and combinations", exercises: [
                { id: "mma-u15-w2-1", name: "Front Kick", description: "Push kick to the body for keeping distance", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=LkW0Kcyc0Yg" },
                { id: "mma-u15-w2-2", name: "Roundhouse Kick", description: "The bread-and-butter kick of MMA - shin to pad!", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=GHKJeN0mFcU" },
                { id: "mma-u15-w2-3", name: "Jab-Cross-Kick", description: "Your first 3-strike combination", duration: "10 min", videoUrl: "https://www.youtube.com/watch?v=Ll688YigdSo" },
                { id: "mma-u15-w2-4", name: "Pad Work with Partner", description: "Practice combos on pads held by your partner", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=Sc4A9RTj6kc" },
            ]},
            { week: 3, title: "Defense Skills", focus: "Blocking, slipping, and checking kicks", exercises: [
                { id: "mma-u15-w3-1", name: "Blocking Punches", description: "High guard block for hooks, parry for straights", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=ObbEi9uPZn0" },
                { id: "mma-u15-w3-2", name: "Checking Kicks", description: "Lift your shin to block incoming kicks", duration: "10 min", videoUrl: "https://www.youtube.com/watch?v=Msxt-LzrOow" },
                { id: "mma-u15-w3-3", name: "Slip and Counter", description: "Slip a jab, come back with a cross", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=WI56oWJatA8" },
                { id: "mma-u15-w3-4", name: "Defense Sparring", description: "One attacks, one defends only - then switch", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=ObbEi9uPZn0" },
            ]},
            { week: 4, title: "MMA Challenge", focus: "Putting striking together", exercises: [
                { id: "mma-u15-w4-1", name: "Combination Drills", description: "Jab-cross-hook-kick combinations on pads", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=Ll688YigdSo" },
                { id: "mma-u15-w4-2", name: "Light Sparring", description: "Touch sparring at 30% power with full gear", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=Cqx1I7StbY8" },
                { id: "mma-u15-w4-3", name: "Fitness Challenge", description: "Push-ups, sit-ups, burpees circuit", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=9quMGiVvopk" },
                { id: "mma-u15-w4-4", name: "Belt Ceremony", description: "Celebrate your progress!", duration: "10 min", videoUrl: "https://www.youtube.com/watch?v=hbsHcIjvsno" },
            ]},
        ],
        "Intermediate": [
            { week: 1, title: "Striking Fundamentals", focus: "Boxing and kickboxing basics", exercises: [
                { id: "mma-1525-w1-1", name: "Boxing Combinations", description: "1-2, 1-2-3, 1-2-3-2 on heavy bag", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=Ll688YigdSo" },
                { id: "mma-1525-w1-2", name: "Roundhouse Kick Technique", description: "Lead and rear roundhouse kicks with proper form", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=GHKJeN0mFcU" },
                { id: "mma-1525-w1-3", name: "Footwork Patterns", description: "Diamond, L-step, and pivot drills", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=URfr2V-mVDw" },
                { id: "mma-1525-w1-4", name: "Pad Work Rounds", description: "3-minute rounds on pads with combos and movement", duration: "25 min", videoUrl: "https://www.youtube.com/watch?v=Sc4A9RTj6kc" },
            ]},
            { week: 2, title: "Clinch & Takedowns", focus: "Closing distance and grappling", exercises: [
                { id: "mma-1525-w2-1", name: "Clinch Entry", description: "Jab to collar tie, underhook entries", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=fGZwajnDskk" },
                { id: "mma-1525-w2-2", name: "Dirty Boxing", description: "Short punches, elbows, and knees in the clinch", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=OeCT3dQbsLM" },
                { id: "mma-1525-w2-3", name: "MMA Takedowns", description: "Double leg, body lock, and trip from clinch", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=dhZgpDHCARw" },
                { id: "mma-1525-w2-4", name: "Clinch Sparring", description: "Clinch-only rounds with takedowns allowed", duration: "25 min", videoUrl: "https://www.youtube.com/watch?v=fGZwajnDskk" },
            ]},
            { week: 3, title: "Ground & Pound", focus: "Top control and striking on the ground", exercises: [
                { id: "mma-1525-w3-1", name: "Guard Passing", description: "Torreando, knee slice, and stack pass", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=dXloySAvoh0" },
                { id: "mma-1525-w3-2", name: "Ground & Pound", description: "Striking from top position with proper posture", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=Y4uFk8kS7Lw" },
                { id: "mma-1525-w3-3", name: "Submission Defense", description: "Defending armbar, triangle, and guillotine", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=7U1Q5yHBofI" },
                { id: "mma-1525-w3-4", name: "MMA Grappling Rounds", description: "Ground rounds with strikes and submissions", duration: "25 min", videoUrl: "https://www.youtube.com/watch?v=Y4uFk8kS7Lw" },
            ]},
            { week: 4, title: "Full MMA", focus: "Complete MMA training", exercises: [
                { id: "mma-1525-w4-1", name: "Fight Simulation", description: "3 x 5-minute rounds mixing all ranges", duration: "25 min", videoUrl: "https://www.youtube.com/watch?v=Ll688YigdSo" },
                { id: "mma-1525-w4-2", name: "Transition Drills", description: "Standing to clinch to ground and back up", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=dhZgpDHCARw" },
                { id: "mma-1525-w4-3", name: "Conditioning", description: "MMA-specific cardio: burpees, sprawls, shots", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=9quMGiVvopk" },
                { id: "mma-1525-w4-4", name: "Game Plan Work", description: "Develop your fight strategy and preferences", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=hbsHcIjvsno" },
            ]},
        ],
        "Advanced": [
            { week: 1, title: "Safe Striking", focus: "Technique-focused striking for adults", exercises: [
                { id: "mma-25p-w1-1", name: "Warm-up Flow", description: "Mobility-focused warm-up for joints and muscles", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=i-64TBk_boM" },
                { id: "mma-25p-w1-2", name: "Basic Combinations", description: "Jab-cross, jab-cross-hook at controlled pace", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=YsFK1MMDQgk" },
                { id: "mma-25p-w1-3", name: "Kick Technique", description: "Roundhouse and teep kicks focusing on balance", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=GHKJeN0mFcU" },
                { id: "mma-25p-w1-4", name: "Bag Work", description: "Light bag rounds focusing on technique over power", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=Sc4A9RTj6kc" },
            ]},
            { week: 2, title: "Practical Defense", focus: "Real-world applicable defense", exercises: [
                { id: "mma-25p-w2-1", name: "Blocking & Parrying", description: "Defend common attacks with proper technique", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=ObbEi9uPZn0" },
                { id: "mma-25p-w2-2", name: "Takedown Defense", description: "Sprawl and frame to stay on feet", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=Ys5Uv3UDOjc" },
                { id: "mma-25p-w2-3", name: "Distance Management", description: "Using footwork to control range", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=nv_mqC4et4M" },
                { id: "mma-25p-w2-4", name: "Light Technical Sparring", description: "Slow-speed sparring focusing on defense", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=Cqx1I7StbY8" },
            ]},
            { week: 3, title: "Ground Awareness", focus: "Basic ground skills", exercises: [
                { id: "mma-25p-w3-1", name: "Getting Up Safely", description: "Technical stand-up from ground to feet", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=yC_sSqO4Vx0" },
                { id: "mma-25p-w3-2", name: "Basic Guard", description: "Closed guard fundamentals and simple sweeps", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=Z_FBT8ZDSmo" },
                { id: "mma-25p-w3-3", name: "Side Control Escape", description: "Frame and hip escape to recover guard", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=HuWBCy6GUJw" },
                { id: "mma-25p-w3-4", name: "Positional Drilling", description: "Gentle positional practice with a partner", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=5IZz2GHQfQA" },
            ]},
            { week: 4, title: "Putting It All Together", focus: "Integration and fitness", exercises: [
                { id: "mma-25p-w4-1", name: "Combination Flow", description: "Flow through strikes, clinch, and ground smoothly", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=Ll688YigdSo" },
                { id: "mma-25p-w4-2", name: "Self-Defense Scenarios", description: "Practice realistic self-defense situations", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=Ys5Uv3UDOjc" },
                { id: "mma-25p-w4-3", name: "Fitness Assessment", description: "Test your progress with a fitness benchmark", duration: "15 min", videoUrl: "https://www.youtube.com/watch?v=9quMGiVvopk" },
                { id: "mma-25p-w4-4", name: "Cool Down & Stretch", description: "Comprehensive cool-down and flexibility work", duration: "20 min", videoUrl: "https://www.youtube.com/watch?v=UiO3WBOxUsc" },
            ]},
        ],
    },
    "Muay Thai": {
        "Beginner": [
            { week: 1, title: "The 8 Limbs", focus: "Stance, guard, basic strikes", exercises: [
                { id: "mt-beg-w1-1", name: "Muay Thai Stance & Guard", description: "Orthodox stance, guard position, footwork basics — 3×5min shadow boxing", duration: "15 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+stance+beginner" },
                { id: "mt-beg-w1-2", name: "Jab & Cross", description: "Straight punches with proper rotation — 5×2min on pads or shadow", duration: "15 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+jab+cross+beginner" },
                { id: "mt-beg-w1-3", name: "Teep (Push Kick)", description: "Front teep kick for range control — 3 sets × 20 reps each leg", duration: "15 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+teep+kick+tutorial" },
                { id: "mt-beg-w1-4", name: "Skip Rope", description: "Jump rope for footwork and conditioning — 3×3min rounds", duration: "10 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+jump+rope+conditioning" },
            ]},
            { week: 2, title: "Kicks & Knees", focus: "Roundhouse and basic knee strikes", exercises: [
                { id: "mt-beg-w2-1", name: "Low Roundhouse Kick", description: "Thai kick targeting the thigh — 3 sets × 15 reps each side", duration: "20 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+low+kick+tutorial" },
                { id: "mt-beg-w2-2", name: "High Roundhouse Kick", description: "Body and head-level roundhouse — 3 sets × 10 reps per side", duration: "20 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+roundhouse+kick+high" },
                { id: "mt-beg-w2-3", name: "Straight Knee", description: "Basic straight knee in clinch position — 3×30 reps alternating", duration: "15 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+knee+strike+beginner" },
                { id: "mt-beg-w2-4", name: "Combo Drill: Jab-Cross-Kick", description: "Jab-cross into low kick — 5×2min shadow boxing", duration: "15 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+jab+cross+kick+combo" },
            ]},
            { week: 3, title: "Elbows & Clinch", focus: "Short-range weapons", exercises: [
                { id: "mt-beg-w3-1", name: "Horizontal Elbow", description: "Basic horizontal elbow — 3 sets × 20 reps each arm on bag", duration: "15 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+elbow+technique" },
                { id: "mt-beg-w3-2", name: "Clinch Entry", description: "How to enter and control the clinch safely — 4×3min drills", duration: "20 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+clinch+technique+beginner" },
                { id: "mt-beg-w3-3", name: "Clinch Knee", description: "Double collar tie with knee strikes — 3×2min rounds", duration: "15 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+clinch+knee" },
                { id: "mt-beg-w3-4", name: "Bag Work Circuit", description: "3-round bag work: round 1 kicks, round 2 combos, round 3 all weapons", duration: "15 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+bag+work+circuit" },
            ]},
            { week: 4, title: "Putting It Together", focus: "Full combinations and sparring readiness", exercises: [
                { id: "mt-beg-w4-1", name: "4-Weapon Combo", description: "Jab-cross-kick-elbow-knee combo — 5×2min shadow boxing", duration: "20 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+combination+training" },
                { id: "mt-beg-w4-2", name: "Defense Drill", description: "Catching kicks, checking low kicks, parrying punches — 4×2min", duration: "15 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+defense+drills" },
                { id: "mt-beg-w4-3", name: "Partner Pad Work", description: "Light pad work with a partner using all combinations — 5×2min", duration: "20 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+pad+work+beginner" },
                { id: "mt-beg-w4-4", name: "Conditioning Circuit", description: "5 rounds: burpees, skips, squats, push-ups, core — 2min rest", duration: "20 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+conditioning+workout" },
            ]},
        ],
        "Intermediate": [
            { week: 1, title: "Combination Mastery", focus: "Multi-strike combos with power", exercises: [
                { id: "mt-int-w1-1", name: "6-Hit Combo", description: "Jab-cross-hook-low kick-elbow-knee sequence — 6×2min rounds", duration: "20 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+6+hit+combination" },
                { id: "mt-int-w1-2", name: "Switch Kick", description: "Switching stance for rear-leg low kick power — 3×15 each side", duration: "15 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+switch+kick" },
                { id: "mt-int-w1-3", name: "Spinning Back Elbow", description: "Spinning elbow setup and execution — 3 sets × 10 reps", duration: "15 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+spinning+elbow" },
                { id: "mt-int-w1-4", name: "Heavy Bag Power Rounds", description: "5×3min heavy bag — focus on power generation and footwork", duration: "20 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+heavy+bag+workout" },
            ]},
            { week: 2, title: "Counter-Striking", focus: "Read and counter your opponent", exercises: [
                { id: "mt-int-w2-1", name: "Catch-and-Counter Kick", description: "Catch opponent's kick and immediately counter — 4×3min drills", duration: "20 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+catch+counter+kick" },
                { id: "mt-int-w2-2", name: "Slip and Return", description: "Slip punches and fire a counter cross or body hook — 5×2min", duration: "15 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+slip+counter" },
                { id: "mt-int-w2-3", name: "Teep Counter to Kick", description: "Use teep to stop incoming kick then counter — 4×2min", duration: "15 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+teep+counter" },
                { id: "mt-int-w2-4", name: "Sparring Warm-Up Drill", description: "Flow sparring at 50% — focus on rhythm and range management", duration: "20 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+sparring+drill" },
            ]},
            { week: 3, title: "Advanced Clinch Game", focus: "Dominant clinch control and sweeps", exercises: [
                { id: "mt-int-w3-1", name: "Clinch Sweep", description: "Off-balance opponent and execute a hip sweep — 3×10 reps", duration: "20 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+clinch+sweep" },
                { id: "mt-int-w3-2", name: "Double Knee in Clinch", description: "Sequential knee strikes from double collar tie — 4×2min", duration: "15 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+double+knee+clinch" },
                { id: "mt-int-w3-3", name: "Clinch Break and Strike", description: "Break clinch into immediate elbow or knee — 5×2min rounds", duration: "15 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+clinch+break" },
                { id: "mt-int-w3-4", name: "Neck Wrestling Drill", description: "Clinch control — competing for dominant position", duration: "20 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+neck+wrestling" },
            ]},
            { week: 4, title: "Fight Simulation", focus: "Full-round intensity training", exercises: [
                { id: "mt-int-w4-1", name: "Thai Pad Rounds", description: "10×3min Thai pad rounds — full combos at competition pace", duration: "35 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+pad+rounds+training" },
                { id: "mt-int-w4-2", name: "Sparring Analysis", description: "Light technical sparring — film and review for feedback", duration: "20 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+sparring+tips" },
                { id: "mt-int-w4-3", name: "Conditioning Finisher", description: "5 rounds: 1min sprint + 1min Muay Thai shadow boxing", duration: "15 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+conditioning+finisher" },
                { id: "mt-int-w4-4", name: "Flexibility & Recovery", description: "Full stretch routine targeting hips, shoulders, and calves", duration: "15 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+stretching+flexibility" },
            ]},
        ],
        "Advanced": [
            { week: 1, title: "Elite Striking", focus: "Precision and power optimization", exercises: [
                { id: "mt-adv-w1-1", name: "Saenchai-Style Tricks", description: "Jumping teep, cartwheel kick setups, and fakes — 4×3min", duration: "20 min", videoUrl: "https://www.youtube.com/results?search_query=saenchai+techniques+muay+thai" },
                { id: "mt-adv-w1-2", name: "Pressure Fighting", description: "Walk forward with constant pressure and volume — 5×3min bag", duration: "20 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+pressure+fighting" },
                { id: "mt-adv-w1-3", name: "Angle Cutting Combos", description: "Step off the line and attack — 6×3min shadow boxing", duration: "25 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+angle+cutting" },
                { id: "mt-adv-w1-4", name: "Heavy Bag HIIT", description: "10×2min max intensity rounds on heavy bag — 30s rest", duration: "25 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+heavy+bag+hiit" },
            ]},
            { week: 2, title: "Fight IQ", focus: "Strategic fighting and ring generalship", exercises: [
                { id: "mt-adv-w2-1", name: "Ring Generalship Drill", description: "Control the center, cut off the ring, dictate distance — 5×3min", duration: "20 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+ring+generalship" },
                { id: "mt-adv-w2-2", name: "Feint System", description: "Feint to open guard — shoulder, teep, kick feints into real strikes", duration: "20 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+feints+advanced" },
                { id: "mt-adv-w2-3", name: "Southpaw vs Orthodox", description: "Adjust stance matchup — target open side with kick and hook", duration: "20 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+southpaw+orthodox" },
                { id: "mt-adv-w2-4", name: "Live Sparring (Full Round)", description: "Competition-pace sparring 5×3min — assessed by coach", duration: "20 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+full+sparring" },
            ]},
            { week: 3, title: "Power & Conditioning", focus: "Knockout power and elite fitness", exercises: [
                { id: "mt-adv-w3-1", name: "Power Kick Drills", description: "Full hip rotation power kicks on bag — 5×20 per side", duration: "25 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+power+kick+training" },
                { id: "mt-adv-w3-2", name: "Sprint-Pad Circuit", description: "40m sprint → pad combo → repeat 8 times", duration: "20 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+sprint+circuit" },
                { id: "mt-adv-w3-3", name: "Clinch Strength Work", description: "Clinch partner drills with resistance band around waist", duration: "20 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+clinch+strength" },
                { id: "mt-adv-w3-4", name: "Recovery Protocol", description: "Ice bath, foam roll, nutrition timing — 20min active recovery", duration: "20 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+fighter+recovery" },
            ]},
            { week: 4, title: "Competition Ready", focus: "Simulate fight conditions", exercises: [
                { id: "mt-adv-w4-1", name: "Full Fight Simulation", description: "3×5min rounds simulating real fight — judge scoring mindset", duration: "25 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+fight+simulation" },
                { id: "mt-adv-w4-2", name: "Mental Prep Visualization", description: "15min visualization of your game plan and counters", duration: "15 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+mental+training" },
                { id: "mt-adv-w4-3", name: "Taper Session", description: "Lighter 3×3min sparring — maintain sharpness without fatigue", duration: "20 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+taper+week" },
                { id: "mt-adv-w4-4", name: "Weight & Nutrition Review", description: "Review weight cut protocol, hydration, and fight-week nutrition", duration: "15 min", videoUrl: "https://www.youtube.com/results?search_query=muay+thai+weight+cut+guide" },
            ]},
        ],
    },
    Boxing: {
        "Beginner": [
            { week: 1, title: "Sweet Science Basics", focus: "Stance, guard, jab, and cross", exercises: [
                { id: "box-beg-w1-1", name: "Boxing Stance & Footwork", description: "Orthodox/southpaw stance, weight distribution, shuffle steps — 15min shadow", duration: "15 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+stance+footwork+beginner" },
                { id: "box-beg-w1-2", name: "The Jab", description: "Jab mechanics — snap, retract, cover — 3×3min shadow boxing", duration: "15 min", videoUrl: "https://www.youtube.com/results?search_query=how+to+jab+boxing+beginner" },
                { id: "box-beg-w1-3", name: "The Cross", description: "Rear hand straight punch with hip rotation — 3×3min bag work", duration: "15 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+cross+technique+beginner" },
                { id: "box-beg-w1-4", name: "Jab-Cross Combo", description: "The 1-2 combo — 5×2min on mitts or bag", duration: "15 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+jab+cross+combination" },
            ]},
            { week: 2, title: "Hooks & Uppercuts", focus: "Full punch arsenal", exercises: [
                { id: "box-beg-w2-1", name: "Lead Hook", description: "Left hook to head and body — pivot, level change, 3×3min", duration: "20 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+lead+hook+technique" },
                { id: "box-beg-w2-2", name: "Rear Hook", description: "Right hook mechanics and positioning — 3×3min bag work", duration: "15 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+rear+hook" },
                { id: "box-beg-w2-3", name: "Uppercut", description: "Lead and rear uppercut in close range — 3 sets × 20 reps", duration: "15 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+uppercut+technique" },
                { id: "box-beg-w2-4", name: "4-Punch Combo", description: "Jab-cross-hook-uppercut — the classic 1-2-3-4", duration: "15 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+4+punch+combination" },
            ]},
            { week: 3, title: "Defense System", focus: "Slips, rolls, and parries", exercises: [
                { id: "box-beg-w3-1", name: "Head Movement: Slips", description: "Slip inside and outside the jab — 4×2min with partner", duration: "15 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+slip+technique" },
                { id: "box-beg-w3-2", name: "Shoulder Roll", description: "Philly shell guard and shoulder roll for defense — 3×2min", duration: "15 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+shoulder+roll+defense" },
                { id: "box-beg-w3-3", name: "Parry & Counter", description: "Parry jab + counter cross, parry cross + counter hook", duration: "20 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+parry+counter" },
                { id: "box-beg-w3-4", name: "Defense Drill on Bag", description: "Bob and weave around swinging bag — 4×2min", duration: "15 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+bob+weave+bag+drill" },
            ]},
            { week: 4, title: "Putting It Together", focus: "Combinations with defense", exercises: [
                { id: "box-beg-w4-1", name: "Counter Combos", description: "Slip-jab-cross, roll-hook-uppercut — 5×2min shadow boxing", duration: "20 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+counter+punching+combos" },
                { id: "box-beg-w4-2", name: "Mitt Work", description: "10×2min mitt rounds with all techniques — focus on timing", duration: "25 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+mitt+work+training" },
                { id: "box-beg-w4-3", name: "Sparring Introduction", description: "Very light technical sparring — 3×2min, 30% power", duration: "15 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+first+sparring+session" },
                { id: "box-beg-w4-4", name: "Jump Rope Finisher", description: "10min jump rope: alternating footwork patterns", duration: "10 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+jump+rope+routine" },
            ]},
        ],
        "Intermediate": [
            { week: 1, title: "Pressure & Volume", focus: "High-output boxing", exercises: [
                { id: "box-int-w1-1", name: "Double Jab Combos", description: "Double jab setup for power shots — 6×3min bag/shadow", duration: "20 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+double+jab+combination" },
                { id: "box-int-w1-2", name: "Body Attack System", description: "Body jab, body hook, uppercut to body — 5×3min rounds", duration: "20 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+body+shots+technique" },
                { id: "box-int-w1-3", name: "Pivot & Counter", description: "Pivot off centerline and fire counter combos — 4×3min", duration: "20 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+pivot+counter+punching" },
                { id: "box-int-w1-4", name: "Sparring Rounds", description: "6×3min technical sparring — focus on volume and accuracy", duration: "25 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+technical+sparring" },
            ]},
            { week: 2, title: "Ring Generalship", focus: "Control position and distance", exercises: [
                { id: "box-int-w2-1", name: "Cut the Ring Drill", description: "Cut off the ring using diagonal footwork — 4×3min", duration: "20 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+cut+the+ring+footwork" },
                { id: "box-int-w2-2", name: "Clinch Work", description: "Tie up, rough work, dirty boxing inside — 4×2min", duration: "20 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+clinch+dirty+boxing" },
                { id: "box-int-w2-3", name: "Feints & Level Changes", description: "Feint high-low, low-high — 5×2min on mitts", duration: "20 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+feints+level+change" },
                { id: "box-int-w2-4", name: "Movement Sparring", description: "Footwork-only sparring — no standing still for 4×3min", duration: "15 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+movement+drill+sparring" },
            ]},
            { week: 3, title: "KO Power Development", focus: "Knockout power mechanics", exercises: [
                { id: "box-int-w3-1", name: "Hip Power Shots", description: "Full body rotation on power punches — 3×20 per hand on heavy bag", duration: "25 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+power+punching+hip+rotation" },
                { id: "box-int-w3-2", name: "Overhand Right", description: "The overhand right over jab — 3×15 reps bag work", duration: "15 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+overhand+right" },
                { id: "box-int-w3-3", name: "Left Hook KO Setup", description: "Jab-cross to set up the left hook — 5×3min combo rounds", duration: "20 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+left+hook+knockout" },
                { id: "box-int-w3-4", name: "Strength Circuit", description: "Medicine ball slams, cable rotations, plyo push-ups — 4 sets", duration: "20 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+strength+training+workout" },
            ]},
            { week: 4, title: "Competition Prep", focus: "Fight simulation and recovery", exercises: [
                { id: "box-int-w4-1", name: "Full Sparring Rounds", description: "10×3min sparring with different opponents — varied styles", duration: "35 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+sparring+rounds" },
                { id: "box-int-w4-2", name: "Video Analysis", description: "Film review — identify patterns, telegraphs, opportunities", duration: "15 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+film+study+analysis" },
                { id: "box-int-w4-3", name: "Taper & Sharpen", description: "Light 3×2min mitt work — fast and sharp, not heavy", duration: "15 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+taper+session" },
                { id: "box-int-w4-4", name: "Mental Training", description: "Visualization: entering the ring, executing your game plan", duration: "10 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+mental+training+visualization" },
            ]},
        ],
        "Advanced": [
            { week: 1, title: "Elite Combination Boxing", focus: "Elite-level combinations", exercises: [
                { id: "box-adv-w1-1", name: "8-Punch Combos", description: "Long fluid 8-punch combinations at speed — 6×3min shadow", duration: "25 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+8+punch+combination+advanced" },
                { id: "box-adv-w1-2", name: "Philly Shell Mastery", description: "Full shoulder roll defense system with counters — 5×3min", duration: "20 min", videoUrl: "https://www.youtube.com/results?search_query=philly+shell+boxing+advanced" },
                { id: "box-adv-w1-3", name: "Inside Fighting", description: "Close-range hooks, uppercuts, and rough work — 5×3min", duration: "20 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+inside+fighting+close+range" },
                { id: "box-adv-w1-4", name: "Interval Bag Work", description: "15×2min at max intensity: alternating targets (head/body)", duration: "35 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+interval+training+bag" },
            ]},
            { week: 2, title: "Match-Specific Tactics", focus: "Adapt to opponent styles", exercises: [
                { id: "box-adv-w2-1", name: "vs. Southpaw Sparring", description: "Orthodox vs Southpaw specific techniques — 6×3min", duration: "25 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+orthodox+vs+southpaw+strategy" },
                { id: "box-adv-w2-2", name: "Counter Punching System", description: "5 counters for 5 common attacks — drill each 50 reps", duration: "20 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+counter+punching+advanced" },
                { id: "box-adv-w2-3", name: "Pressure vs. Boxer Drill", description: "Work against a boxer who runs — cut off, back to corner", duration: "20 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+pressure+vs+boxer+footwork" },
                { id: "box-adv-w2-4", name: "Full Competitive Sparring", description: "8×3min competition-pace sparring — assessor watches", duration: "30 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+competitive+sparring+advanced" },
            ]},
            { week: 3, title: "Peak Physical Condition", focus: "Elite conditioning", exercises: [
                { id: "box-adv-w3-1", name: "Road Work", description: "6-mile run with fartlek sprints every 400m", duration: "45 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+road+work+training" },
                { id: "box-adv-w3-2", name: "Strength & Power Circuit", description: "Explosive: pull-ups, plyometric push-ups, med ball throws", duration: "30 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+strength+power+circuit" },
                { id: "box-adv-w3-3", name: "Speed Bag & Double End", description: "15min speed bag + 15min double-end bag work", duration: "30 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+speed+bag+double+end+workout" },
                { id: "box-adv-w3-4", name: "Active Recovery", description: "Swim or cycle + yoga — critical for peak performance", duration: "30 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+active+recovery+day" },
            ]},
            { week: 4, title: "Fight Week Protocol", focus: "Final preparation", exercises: [
                { id: "box-adv-w4-1", name: "Championship Rounds", description: "12×3min simulation — pacing for full fight — with judges scoring", duration: "40 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+championship+rounds+training" },
                { id: "box-adv-w4-2", name: "Last Sparring", description: "Light 3×2min technical sparring — stay sharp and uninjured", duration: "15 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+last+sparring+fight+week" },
                { id: "box-adv-w4-3", name: "Weight Management", description: "Final weight check, hydration protocol, nutrition timing", duration: "15 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+weight+cut+fight+week" },
                { id: "box-adv-w4-4", name: "Mindset & Visualization", description: "Boxing-specific visualization with deep breathing — 20min session", duration: "20 min", videoUrl: "https://www.youtube.com/results?search_query=boxing+fight+night+visualization" },
            ]},
        ],
    },
};

// ---------------------------------------------------------------------------
// Design constants — static Tailwind classes (no dynamic interpolation)
// ---------------------------------------------------------------------------
const ageGroupInfo: Record<AgeGroup, {
    label: string;
    icon: typeof Star;
    description: string;
    classes: { text: string; bg: string; border: string; hoverBorder: string };
}> = {
    "Beginner": {
        label: "Beginner",
        icon: Star,
        description: "New to martial arts — foundational techniques, safe progressions, building habits",
        classes: { text: "text-green-600", bg: "bg-green-50", border: "border-green-200", hoverBorder: "hover:border-green-400" },
    },
    "Intermediate": {
        label: "Intermediate",
        icon: Zap,
        description: "6+ months of training — refining technique, building combinations, competitive prep",
        classes: { text: "text-red-600", bg: "bg-red-50", border: "border-red-200", hoverBorder: "hover:border-red-400" },
    },
    "Advanced": {
        label: "Advanced",
        icon: Shield,
        description: "2+ years experience — advanced strategy, fight-camp conditioning, professional-level drills",
        classes: { text: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", hoverBorder: "hover:border-blue-400" },
    },
};

const disciplineInfo: Record<Discipline, {
    icon: typeof Users;
    description: string;
    classes: { text: string; bg: string; border: string; hoverBorder: string };
}> = {
    BJJ: {
        icon: Users,
        description: "The gentle art of ground fighting and submissions",
        classes: { text: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200", hoverBorder: "hover:border-purple-400" },
    },
    Wrestling: {
        icon: Dumbbell,
        description: "Takedowns, control, and explosive athleticism",
        classes: { text: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", hoverBorder: "hover:border-amber-400" },
    },
    MMA: {
        icon: Target,
        description: "The complete combat sport — striking, grappling, and everything between",
        classes: { text: "text-red-600", bg: "bg-red-50", border: "border-red-200", hoverBorder: "hover:border-red-400" },
    },
    "Muay Thai": {
        icon: Flame,
        description: "The art of 8 limbs — punches, kicks, elbows, and knees",
        classes: { text: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", hoverBorder: "hover:border-orange-400" },
    },
    Boxing: {
        icon: Shield,
        description: "The sweet science — footwork, head movement, and combination punching",
        classes: { text: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", hoverBorder: "hover:border-blue-400" },
    },
};

// ---------------------------------------------------------------------------
// Framer Motion variants
// ---------------------------------------------------------------------------
const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};
const exerciseStagger = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const exerciseItem = {
    hidden: { opacity: 0, x: -12 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

// ---------------------------------------------------------------------------
// Circular progress ring SVG
// ---------------------------------------------------------------------------
function CircularProgress({ completed, total, size = 36, strokeWidth = 3, locked = false }: {
    completed: number; total: number; size?: number; strokeWidth?: number; locked?: boolean;
}) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const percent = total > 0 ? completed / total : 0;
    const offset = circumference - percent * circumference;
    const isComplete = completed === total && total > 0;

    return (
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    stroke="currentColor" strokeWidth={strokeWidth} fill="none"
                    className="text-gray-200"
                />
                {!locked && (
                    <motion.circle
                        cx={size / 2} cy={size / 2} r={radius}
                        stroke="currentColor" strokeWidth={strokeWidth} fill="none"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: offset }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        strokeLinecap="round"
                        className={isComplete ? "text-green-400" : "text-red-500"}
                    />
                )}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                {locked ? (
                    <Lock className="w-3 h-3 text-gray-400" />
                ) : isComplete ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                ) : (
                    <span className="text-[10px] font-bold text-gray-500 tabular-nums">
                        {completed}/{total}
                    </span>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Milestone progress bar
// ---------------------------------------------------------------------------
function MilestoneProgressBar({ percent, completed, total }: {
    percent: number; completed: number; total: number;
}) {
    const milestones = [25, 50, 75, 100];
    const isComplete = percent >= 100;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <motion.div
                        animate={isComplete ? { rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1] } : {}}
                        transition={{ duration: 0.6 }}
                    >
                        <Trophy className={`w-5 h-5 ${isComplete ? "text-yellow-400" : "text-yellow-500/60"}`} />
                    </motion.div>
                    <span className="text-gray-900 font-bold text-sm">Overall Progress</span>
                </div>
                <span className={`font-bold tabular-nums text-sm ${isComplete ? "text-amber-600" : "text-gray-900"}`}>
                    {percent}%
                </span>
            </div>

            <div className="relative">
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={`h-full rounded-full relative overflow-hidden ${
                            isComplete
                                ? "bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-300"
                                : "bg-gradient-to-r from-red-700 via-red-500 to-orange-400"
                        }`}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-pulse" />
                    </motion.div>
                </div>

                {/* Milestone dots */}
                <div className="absolute inset-0 flex items-center pointer-events-none">
                    {milestones.map((ms) => (
                        <div
                            key={ms}
                            className="absolute top-1/2"
                            style={{ left: `${ms}%`, transform: "translate(-50%, -50%)" }}
                        >
                            <div className={`w-2 h-2 rounded-full border transition-all duration-500 ${
                                percent >= ms
                                    ? "bg-white border-gray-400 shadow-sm"
                                    : "bg-gray-300 border-gray-400"
                            }`} />
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex items-center justify-between">
                <p className="text-gray-500 text-xs tabular-nums">{completed} of {total} exercises completed</p>
                {isComplete && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-1 text-amber-600 text-xs font-bold"
                    >
                        <Award className="w-3.5 h-3.5" /> Program Complete
                    </motion.div>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// MAIN PAGE COMPONENT
// ---------------------------------------------------------------------------
export default function TrainingPage() {
    const { user, token, isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null);
    const [discipline, setDiscipline] = useState<Discipline | null>(null);
    const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
    const [expandedWeek, setExpandedWeek] = useState<number | null>(1);
    const [saving, setSaving] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [justUnlockedWeek, setJustUnlockedWeek] = useState<number | null>(null);
    const [videoModal, setVideoModal] = useState<{ url: string; name: string } | null>(null);
    const prevUnlockedRef = useRef<number[]>([1]);

    // Coach state
    const [coachTab, setCoachTab] = useState<'personal' | 'manage'>('personal');
    const [roster, setRoster] = useState<RosterFighter[]>([]);
    const [assignments, setAssignments] = useState<FighterTrainingAssignment[]>([]);
    const [selectedAssignment, setSelectedAssignment] = useState<FighterTrainingAssignment | null>(null);
    const [loadingRoster, setLoadingRoster] = useState(false);
    const [loadingAssignments, setLoadingAssignments] = useState(false);
    const [assigningTraining, setAssigningTraining] = useState(false);
    const [assignError, setAssignError] = useState("");
    const [assignForm, setAssignForm] = useState({ fighterName: "", disciplineSelection: "", ageGroupSelection: "" });
    const [rosterSearch, setRosterSearch] = useState("");
    const [rosterDropdown, setRosterDropdown] = useState(false);

    // Auto-dismiss toast
    useEffect(() => {
        if (toastMessage) {
            const timer = setTimeout(() => setToastMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toastMessage]);

    // Auth redirect
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [authLoading, isAuthenticated, router]);

    // Coach: Fetch roster
    useEffect(() => {
        if (token && user?.role === 'coach') {
            setLoadingRoster(true);
            coachRosterApi.getRoster(token).then(res => {
                if (res.success && res.data) setRoster(res.data);
            }).catch(() => {}).finally(() => setLoadingRoster(false));
        }
    }, [token, user]);

    // Coach: Fetch assignments
    useEffect(() => {
        if (token && user?.role === 'coach') {
            setLoadingAssignments(true);
            fighterTrainingApi.getAssignments(token).then(res => {
                if (res.success && res.data) setAssignments(res.data);
            }).catch(() => {}).finally(() => setLoadingAssignments(false));
        }
    }, [token, user]);

    // Auto-select experience level and discipline from user profile
    useEffect(() => {
        if (!user) return;
        const expMap: Record<string, AgeGroup> = {
            'Beginner': 'Beginner',
            'Intermediate': 'Intermediate',
            'Advanced': 'Advanced',
            'Professional': 'Advanced',
        };
        if (user.experienceLevel && !ageGroup) {
            setAgeGroup(expMap[user.experienceLevel] ?? null);
        }
        const validDisciplines: Discipline[] = ['BJJ', 'Wrestling', 'MMA', 'Muay Thai', 'Boxing'];
        if (user.discipline && validDisciplines.includes(user.discipline as Discipline) && !discipline) {
            setDiscipline(user.discipline as Discipline);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // Coach: Close roster dropdown on outside click
    useEffect(() => {
        const handle = () => setRosterDropdown(false);
        document.addEventListener("click", handle);
        return () => document.removeEventListener("click", handle);
    }, []);

    // Weeks data
    const weeks = useMemo(() => {
        return ageGroup && discipline ? roadmapData[discipline][ageGroup] : [];
    }, [ageGroup, discipline]);

    // Unlocked weeks (from refiner logic)
    const unlockedWeeks = useMemo(() => {
        return computeUnlockedWeeks(weeks, completedTasks);
    }, [weeks, completedTasks]);

    // Detect newly unlocked weeks for animation
    useEffect(() => {
        const prev = prevUnlockedRef.current;
        const newlyUnlocked = unlockedWeeks.find(w => !prev.includes(w));
        if (newlyUnlocked) {
            setJustUnlockedWeek(newlyUnlocked);
            const timer = setTimeout(() => setExpandedWeek(newlyUnlocked), 600);
            const clearTimer = setTimeout(() => setJustUnlockedWeek(null), 2000);
            return () => { clearTimeout(timer); clearTimeout(clearTimer); };
        }
        prevUnlockedRef.current = unlockedWeeks;
    }, [unlockedWeeks]);

    // Load saved progress
    useEffect(() => {
        if (token && ageGroup && discipline) {
            const roadmapId = `${discipline.toLowerCase()}-${ageGroup}`;
            roadmapApi.getProgress(token).then(res => {
                if (res.success && res.data) {
                    const saved = res.data.find((p: RoadmapProgressData) => p.roadmapId === roadmapId);
                    if (saved) {
                        setCompletedTasks(new Set(saved.completedTasks));
                        if (saved.currentWeek) setExpandedWeek(saved.currentWeek);
                    } else {
                        setCompletedTasks(new Set());
                        setExpandedWeek(1);
                    }
                }
            }).catch(() => {});
        }
    }, [token, ageGroup, discipline]);

    // Toggle task
    const toggleTask = useCallback(async (taskId: string) => {
        const newCompleted = new Set(completedTasks);
        if (newCompleted.has(taskId)) {
            newCompleted.delete(taskId);
        } else {
            newCompleted.add(taskId);
        }
        setCompletedTasks(newCompleted);

        const newUnlockedWeeks = computeUnlockedWeeks(weeks, newCompleted);

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
                    unlockedWeeks: newUnlockedWeeks,
                }, token);
            } catch (e) {
                console.error("Failed to save progress:", e);
            } finally {
                setSaving(false);
            }
        }
    }, [completedTasks, token, ageGroup, discipline, expandedWeek, weeks]);

    // Coach: Assign training to fighter
    const handleAssignTraining = useCallback(async () => {
        if (!token || !assignForm.fighterName || !assignForm.disciplineSelection || !assignForm.ageGroupSelection) {
            setAssignError("Please fill all fields");
            return;
        }
        setAssigningTraining(true);
        setAssignError("");
        try {
            const res = await fighterTrainingApi.assign({
                fighterName: assignForm.fighterName,
                roadmapId: `${assignForm.disciplineSelection.toLowerCase()}-${assignForm.ageGroupSelection}`,
                discipline: assignForm.disciplineSelection,
                ageGroup: assignForm.ageGroupSelection,
            }, token);
            if (res.success && res.data) {
                setAssignments(prev => [...prev, res.data!]);
                setAssignForm({ fighterName: "", disciplineSelection: "", ageGroupSelection: "" });
                setRosterDropdown(false);
                setRosterSearch("");
                setToastMessage(`Training assigned to ${assignForm.fighterName}`);
            }
        } catch (e: any) {
            setAssignError(e.message || "Failed to assign training");
        } finally {
            setAssigningTraining(false);
        }
    }, [token, assignForm, setToastMessage]);

    // Coach: Delete assignment
    const handleDeleteAssignment = useCallback(async (assignmentId: string) => {
        if (!token) return;
        try {
            await fighterTrainingApi.delete(assignmentId, token);
            setAssignments(prev => prev.filter(a => a._id !== assignmentId));
            if (selectedAssignment?._id === assignmentId) setSelectedAssignment(null);
            setToastMessage("Assignment removed");
        } catch (e) {
            console.error("Failed to delete assignment:", e);
        }
    }, [token, selectedAssignment, setToastMessage]);

    // Coach: Toggle task for fighter
    const handleToggleFighterTask = useCallback(async (assignmentId: string, taskId: string, assignment: FighterTrainingAssignment) => {
        if (!token) return;
        const newCompleted = new Set(assignment.completedTasks);
        newCompleted.has(taskId) ? newCompleted.delete(taskId) : newCompleted.add(taskId);
        try {
            const newUnlockedWeeks = computeUnlockedWeeks(
                roadmapData[assignment.discipline as Discipline][assignment.ageGroup as AgeGroup] || [],
                newCompleted
            );
            await fighterTrainingApi.updateProgress(assignmentId, {
                completedTasks: Array.from(newCompleted),
                currentWeek: assignment.currentWeek,
                unlockedWeeks: newUnlockedWeeks,
            }, token);
            setAssignments(prev => prev.map(a =>
                a._id === assignmentId ? { ...a, completedTasks: Array.from(newCompleted), unlockedWeeks: newUnlockedWeeks } : a
            ));
            setSelectedAssignment(prev =>
                prev && prev._id === assignmentId ? { ...prev, completedTasks: Array.from(newCompleted), unlockedWeeks: newUnlockedWeeks } : prev
            );
        } catch (e) {
            console.error("Failed to toggle task:", e);
        }
    }, [token]);

    // Coach: Unlock week for fighter
    const handleUnlockFighterWeek = useCallback(async (assignmentId: string, weekNumber: number, assignment: FighterTrainingAssignment) => {
        if (!token) return;
        if (!assignment.unlockedWeeks.includes(weekNumber)) {
            const newUnlocked = [...assignment.unlockedWeeks, weekNumber].sort((a, b) => a - b);
            try {
                await fighterTrainingApi.updateProgress(assignmentId, {
                    completedTasks: assignment.completedTasks,
                    currentWeek: assignment.currentWeek,
                    unlockedWeeks: newUnlocked,
                }, token);
                setAssignments(prev => prev.map(a =>
                    a._id === assignmentId ? { ...a, unlockedWeeks: newUnlocked } : a
                ));
                setSelectedAssignment(prev =>
                    prev && prev._id === assignmentId ? { ...prev, unlockedWeeks: newUnlocked } : prev
                );
            } catch (e) {
                console.error("Failed to unlock week:", e);
            }
        }
    }, [token]);

    // Progress calculations
    const totalExercises = weeks.reduce((s, w) => s + w.exercises.length, 0);
    const completedCount = weeks.reduce(
        (s, w) => s + w.exercises.filter(e => completedTasks.has(e.id)).length, 0,
    );
    const progressPercent = totalExercises > 0 ? Math.round((completedCount / totalExercises) * 100) : 0;

    // --- LOADING ---
    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-red-600" />
                    <p className="text-gray-500 text-sm">Loading training module...</p>
                </motion.div>
            </div>
        );
    }

    // --- RENDER ---
    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-16 relative overflow-hidden">

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

                {/* ===== PAGE HEADER ===== */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-12"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 border border-red-100 mb-6">
                        <Flame className="w-3.5 h-3.5 text-red-600" />
                        <span className="text-red-600 text-xs font-bold uppercase tracking-wider">Training Module</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-display italic text-gray-900 mb-4">
                        TRAINING <span className="text-red-600">ROADMAPS</span>
                    </h1>
                    <p className="text-gray-500 max-w-xl mx-auto text-base">
                        Age-appropriate training programs tailored to your level. Complete each week to unlock the next.
                    </p>
                </motion.div>

                {/* ===== COACH TABS ===== */}
                {user?.role === 'coach' && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4 mb-12 justify-center">
                        <button
                            onClick={() => setCoachTab('personal')}
                            className={`px-6 py-3 rounded-lg font-semibold text-sm transition-all ${coachTab === 'personal'
                                ? 'bg-amber-500 text-white shadow-sm'
                                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            <Dumbbell className="w-4 h-4 inline mr-2" /> Personal Training
                        </button>
                        <button
                            onClick={() => setCoachTab('manage')}
                            className={`px-6 py-3 rounded-lg font-semibold text-sm transition-all ${coachTab === 'manage'
                                ? 'bg-amber-500 text-white shadow-sm'
                                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            <Users className="w-4 h-4 inline mr-2" /> Manage Fighters
                        </button>
                    </motion.div>
                )}

                {/* ===== PERSONAL TAB CONTENT ===== */}
                {(user?.role !== 'coach' || coachTab === 'personal') && (
                <div>
                <AnimatePresence mode="wait">
                    {/* --- Experience Level Selection --- */}
                    {!ageGroup && (
                        <motion.div
                            key="age-select"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <h2 className="text-lg font-bold text-gray-900 mb-6 text-center uppercase tracking-wider font-heading">
                                Select Your Experience Level
                            </h2>
                            <motion.div
                                variants={containerVariants} initial="hidden" animate="visible"
                                className="grid grid-cols-1 md:grid-cols-3 gap-5"
                            >
                                {(Object.entries(ageGroupInfo) as [AgeGroup, typeof ageGroupInfo[AgeGroup]][]).map(([key, info]) => {
                                    const Icon = info.icon;
                                    return (
                                        <motion.button
                                            key={key}
                                            variants={itemVariants}
                                            whileHover={{ scale: 1.03, y: -4 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => setAgeGroup(key)}
                                            className={`group relative p-6 rounded-2xl border bg-white shadow-sm text-left transition-all duration-300 ${info.classes.border} ${info.classes.hoverBorder} hover:shadow-md`}
                                        >
                                            <div className={`absolute inset-0 rounded-2xl ${info.classes.bg} opacity-0 group-hover:opacity-30 transition-opacity duration-300`} />
                                            <div className="relative z-10">
                                                <div className={`w-12 h-12 rounded-xl ${info.classes.bg} flex items-center justify-center mb-4`}>
                                                    <Icon className={`w-6 h-6 ${info.classes.text}`} />
                                                </div>
                                                <h3 className="text-gray-900 text-2xl font-bold mb-2 font-heading">{info.label}</h3>
                                                <p className="text-gray-500 text-sm leading-relaxed">{info.description}</p>
                                            </div>
                                        </motion.button>
                                    );
                                })}
                            </motion.div>
                        </motion.div>
                    )}

                    {/* --- Discipline Selection --- */}
                    {ageGroup && !discipline && (
                        <motion.div
                            key="discipline-select"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <button
                                onClick={() => setAgeGroup(null)}
                                className="text-gray-500 hover:text-gray-900 mb-6 flex items-center gap-1.5 transition-colors text-sm group"
                            >
                                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                Back to experience level
                            </button>
                            <h2 className="text-lg font-bold text-gray-900 mb-6 text-center uppercase tracking-wider font-heading">
                                Choose Your Discipline
                            </h2>
                            <motion.div
                                variants={containerVariants} initial="hidden" animate="visible"
                                className="grid grid-cols-1 md:grid-cols-3 gap-5"
                            >
                                {(Object.entries(disciplineInfo) as [Discipline, typeof disciplineInfo[Discipline]][]).map(([key, info]) => {
                                    const Icon = info.icon;
                                    return (
                                        <motion.button
                                            key={key}
                                            variants={itemVariants}
                                            whileHover={{ scale: 1.03, y: -4 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => setDiscipline(key)}
                                            className={`group relative p-6 rounded-2xl border bg-white shadow-sm text-left transition-all duration-300 ${info.classes.border} ${info.classes.hoverBorder} hover:shadow-md`}
                                        >
                                            <div className={`absolute inset-0 rounded-2xl ${info.classes.bg} opacity-0 group-hover:opacity-30 transition-opacity duration-300`} />
                                            <div className="relative z-10">
                                                <div className={`w-12 h-12 rounded-xl ${info.classes.bg} flex items-center justify-center mb-4`}>
                                                    <Icon className={`w-6 h-6 ${info.classes.text}`} />
                                                </div>
                                                <h3 className="text-gray-900 text-2xl font-bold mb-1 font-heading">{key}</h3>
                                                <p className="text-gray-400 text-xs mb-2">
                                                    4-week program for {ageGroupInfo[ageGroup].label} level
                                                </p>
                                                <p className="text-gray-500 text-sm leading-relaxed">{info.description}</p>
                                            </div>
                                        </motion.button>
                                    );
                                })}
                            </motion.div>
                        </motion.div>
                    )}

                    {/* ===== ROADMAP VIEW ===== */}
                    {ageGroup && discipline && (
                        <motion.div
                            key="roadmap"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {/* Context bar */}
                            <div className="flex items-center justify-between mb-8">
                                <button
                                    onClick={() => { setDiscipline(null); setCompletedTasks(new Set()); setExpandedWeek(1); }}
                                    className="text-gray-500 hover:text-gray-900 flex items-center gap-1.5 transition-colors text-sm group"
                                >
                                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                    Back
                                </button>
                                <div className="flex items-center gap-3 text-sm">
                                    <span className="text-gray-400">{ageGroupInfo[ageGroup].label}</span>
                                    <span className="text-gray-300">|</span>
                                    <span className="text-gray-900 font-bold">{discipline}</span>
                                    {saving && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-500" />
                                        </motion.div>
                                    )}
                                </div>
                            </div>

                            {/* --- Progress Section --- */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className={`mb-8 rounded-2xl border p-6 transition-all duration-500 ${
                                    progressPercent >= 100
                                        ? "bg-amber-50 border-amber-200 shadow-md"
                                        : "bg-white border-gray-200 shadow-sm"
                                }`}
                            >
                                {/* Week step indicator */}
                                <div className="flex items-center gap-2 sm:gap-3 mb-5">
                                    {weeks.map((w, i) => {
                                        const wDone = w.exercises.every(e => completedTasks.has(e.id));
                                        const wUnlocked = unlockedWeeks.includes(w.week);
                                        return (
                                            <div key={w.week} className="flex items-center gap-2 sm:gap-3">
                                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                                    wDone
                                                        ? "bg-green-100 text-green-600 ring-1 ring-green-300"
                                                        : wUnlocked
                                                            ? "bg-red-100 text-red-600 ring-1 ring-red-300"
                                                            : "bg-gray-100 text-gray-400"
                                                }`}>
                                                    {wDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : wUnlocked ? w.week : <Lock className="w-3 h-3" />}
                                                </div>
                                                {i < weeks.length - 1 && (
                                                    <div className={`w-6 sm:w-10 h-px transition-colors ${wDone ? "bg-green-300" : "bg-gray-200"}`} />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <MilestoneProgressBar percent={progressPercent} completed={completedCount} total={totalExercises} />
                            </motion.div>

                            {/* --- Week Cards --- */}
                            <motion.div
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                className="space-y-4"
                            >
                                {weeks.map((week) => {
                                    const weekCompletedCount = week.exercises.filter(e => completedTasks.has(e.id)).length;
                                    const weekTotal = week.exercises.length;
                                    const isWeekComplete = weekCompletedCount === weekTotal;
                                    const isUnlocked = unlockedWeeks.includes(week.week);
                                    const isLocked = !isUnlocked;
                                    const isExpanded = expandedWeek === week.week;
                                    const wasJustUnlocked = justUnlockedWeek === week.week;

                                    return (
                                        <motion.div
                                            key={week.week}
                                            variants={itemVariants}
                                            layout
                                            className={`rounded-2xl border overflow-hidden transition-all duration-500 ${
                                                isLocked
                                                    ? "bg-gray-50 border-gray-100 opacity-60"
                                                    : wasJustUnlocked
                                                        ? "bg-white border-amber-300 shadow-md"
                                                        : isWeekComplete
                                                            ? "bg-green-50 border-green-200 shadow-sm"
                                                            : "bg-white border-gray-200 shadow-sm hover:border-red-200"
                                            }`}
                                            animate={wasJustUnlocked ? {
                                                borderColor: ["rgba(234,179,8,0.5)", "rgba(234,179,8,0)", "rgba(234,179,8,0.5)", "rgba(234,179,8,0)"],
                                            } : {}}
                                            transition={wasJustUnlocked ? { duration: 2, ease: "easeInOut" } : {}}
                                        >
                                            {/* Week header button */}
                                            <button
                                                onClick={() => {
                                                    if (isLocked) {
                                                        setToastMessage(`Complete Week ${week.week - 1} to unlock this week`);
                                                    } else {
                                                        setExpandedWeek(isExpanded ? null : week.week);
                                                    }
                                                }}
                                                className={`w-full p-5 sm:p-6 flex items-center justify-between transition-colors ${
                                                    isLocked ? "cursor-not-allowed" : "hover:bg-gray-50 cursor-pointer"
                                                }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <CircularProgress
                                                        completed={weekCompletedCount}
                                                        total={weekTotal}
                                                        locked={isLocked}
                                                    />
                                                    <div className="text-left">
                                                        <h3 className={`font-bold font-heading ${isLocked ? "text-gray-400" : "text-gray-900"}`}>
                                                            Week {week.week}: {week.title}
                                                        </h3>
                                                        <p className={`text-sm mt-0.5 ${isLocked ? "text-gray-300" : "text-gray-500"}`}>
                                                            {isLocked
                                                                ? `Complete Week ${week.week - 1} to unlock`
                                                                : `${week.focus} \u00B7 ${weekCompletedCount}/${weekTotal} done`
                                                            }
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {isWeekComplete && !isLocked && (
                                                        <span className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                                                            <CheckCircle2 className="w-3 h-3" /> Complete
                                                        </span>
                                                    )}
                                                    {isLocked ? (
                                                        <Lock className="w-4 h-4 text-gray-400" />
                                                    ) : (
                                                        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                                                    )}
                                                </div>
                                            </button>

                                            {/* Expanded exercise list */}
                                            <AnimatePresence>
                                                {isExpanded && isUnlocked && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                                    >
                                                        <motion.div
                                                            variants={exerciseStagger}
                                                            initial="hidden"
                                                            animate="visible"
                                                            className="border-t border-gray-100 px-4 sm:px-6 py-4 space-y-2"
                                                        >
                                                            {week.exercises.map((exercise) => {
                                                                const isDone = completedTasks.has(exercise.id);
                                                                return (
                                                                    <motion.div
                                                                        key={exercise.id}
                                                                        variants={exerciseItem}
                                                                        className={`group relative flex items-start gap-3 p-3 sm:p-4 rounded-xl border transition-all duration-200 ${
                                                                            isDone
                                                                                ? "bg-green-50 border-green-200"
                                                                                : "bg-gray-50 border-gray-100 hover:bg-white hover:border-gray-200 hover:shadow-sm"
                                                                        }`}
                                                                    >
                                                                        {/* Checkbox */}
                                                                        <button
                                                                            onClick={() => toggleTask(exercise.id)}
                                                                            className="mt-0.5 flex-shrink-0 focus:outline-none"
                                                                            aria-label={isDone ? `Mark ${exercise.name} as incomplete` : `Mark ${exercise.name} as complete`}
                                                                        >
                                                                            {isDone ? (
                                                                                <motion.div
                                                                                    initial={{ scale: 0 }}
                                                                                    animate={{ scale: 1 }}
                                                                                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                                                                                >
                                                                                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                                                                                </motion.div>
                                                                            ) : (
                                                                                <Circle className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors" />
                                                                            )}
                                                                        </button>

                                                                        {/* Content */}
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex items-start justify-between gap-2">
                                                                                <button
                                                                                    onClick={() => toggleTask(exercise.id)}
                                                                                    className="text-left"
                                                                                >
                                                                                    <h4 className={`font-semibold text-sm leading-tight ${
                                                                                        isDone ? "text-green-600 line-through" : "text-gray-900"
                                                                                    }`}>
                                                                                        {exercise.name}
                                                                                    </h4>
                                                                                </button>
                                                                                <span className={`flex-shrink-0 inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md tabular-nums ${
                                                                                    isDone
                                                                                        ? "bg-green-100 text-green-600"
                                                                                        : "bg-gray-100 text-gray-500"
                                                                                }`}>
                                                                                    <Clock className="w-2.5 h-2.5" />
                                                                                    {exercise.duration}
                                                                                </span>
                                                                            </div>
                                                                            <p className={`text-xs mt-1 leading-relaxed ${
                                                                                isDone ? "text-green-500" : "text-gray-500"
                                                                            }`}>
                                                                                {exercise.description}
                                                                            </p>
                                                                        </div>

                                                                        {/* Watch Video button */}
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setVideoModal({ url: exercise.videoUrl, name: exercise.name });
                                                                            }}
                                                                            className="flex-shrink-0 mt-0.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 text-red-600 hover:text-red-700 text-[11px] font-bold uppercase tracking-wider transition-all opacity-40 group-hover:opacity-100 sm:opacity-100 cursor-pointer"
                                                                            aria-label={`Watch video for ${exercise.name}`}
                                                                        >
                                                                            <Play className="w-3 h-3" />
                                                                            <span className="hidden sm:inline">Watch</span>
                                                                        </button>
                                                                    </motion.div>
                                                                );
                                                            })}
                                                        </motion.div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    );
                                })}
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
                </div>
                )}

                {/* ===== MANAGE FIGHTERS TAB CONTENT ===== */}
                {user?.role === 'coach' && coachTab === 'manage' && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                    {!selectedAssignment ? (
                        <div>
                            {/* Assign New Training Form */}
                            <motion.div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                <h2 className="text-xl font-display text-gray-900 mb-4 flex items-center gap-2">
                                    <ClipboardList className="w-5 h-5 text-amber-500" /> Assign Training Program
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                    {/* Fighter Dropdown */}
                                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="text"
                                            placeholder="Select fighter..."
                                            value={rosterSearch}
                                            onChange={(e) => { setRosterSearch(e.target.value); if (!rosterDropdown) setRosterDropdown(true); }}
                                            onFocus={() => setRosterDropdown(true)}
                                            className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-amber-400"
                                        />
                                        {rosterDropdown && roster.length > 0 && (
                                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                                {roster.map(f => (
                                                    <button
                                                        key={f._id}
                                                        onClick={() => {
                                                            setAssignForm(prev => ({ ...prev, fighterName: f.fighterName }));
                                                            setRosterSearch(f.fighterName);
                                                            setRosterDropdown(false);
                                                        }}
                                                        className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-900 text-sm border-b border-gray-100 last:border-0"
                                                    >
                                                        {f.fighterName}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Discipline Select */}
                                    <select
                                        value={assignForm.disciplineSelection}
                                        onChange={(e) => setAssignForm(prev => ({ ...prev, disciplineSelection: e.target.value }))}
                                        className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 text-sm focus:outline-none focus:border-amber-400"
                                    >
                                        <option value="">Select Discipline</option>
                                        {Object.keys(disciplineInfo).map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>

                                    {/* Experience Level Select */}
                                    <select
                                        value={assignForm.ageGroupSelection}
                                        onChange={(e) => setAssignForm(prev => ({ ...prev, ageGroupSelection: e.target.value }))}
                                        className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 text-sm focus:outline-none focus:border-amber-400"
                                    >
                                        <option value="">Select Experience Level</option>
                                        {Object.keys(ageGroupInfo).map(a => (
                                            <option key={a} value={a}>{ageGroupInfo[a as AgeGroup].label}</option>
                                        ))}
                                    </select>

                                    {/* Assign Button */}
                                    <button
                                        onClick={handleAssignTraining}
                                        disabled={assigningTraining}
                                        className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 font-semibold transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" /> {assigningTraining ? "Assigning..." : "Assign"}
                                    </button>
                                </div>
                                {assignError && (
                                    <div className="text-red-400 text-sm flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" /> {assignError}
                                    </div>
                                )}
                            </motion.div>

                            {/* Assignments List */}
                            {loadingAssignments ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
                                </div>
                            ) : assignments.length === 0 ? (
                                <div className="text-center py-12">
                                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500">No training assignments yet. Assign a training program to one of your fighters.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {assignments.map(a => {
                                        const weeks = roadmapData[a.discipline as Discipline][a.ageGroup as AgeGroup] || [];
                                        const completedCount = weeks.reduce((s, w) => s + w.exercises.filter(e => a.completedTasks.includes(e.id)).length, 0);
                                        const totalCount = weeks.reduce((s, w) => s + w.exercises.length, 0);
                                        return (
                                            <motion.div
                                                key={a._id}
                                                whileHover={{ y: -4 }}
                                                onClick={() => setSelectedAssignment(a)}
                                                className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm cursor-pointer hover:border-amber-300 transition-colors group"
                                            >
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <p className="text-gray-900 font-semibold">{a.fighterName}</p>
                                                        <p className="text-gray-500 text-xs">{a.discipline} • {ageGroupInfo[a.ageGroup as AgeGroup]?.label}</p>
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteAssignment(a._id);
                                                        }}
                                                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="mb-3">
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="text-gray-500">Progress</span>
                                                        <span className="text-amber-600 font-semibold">{completedCount}/{totalCount}</span>
                                                    </div>
                                                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all"
                                                            style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    <Clock className="w-3 h-3" /> Week {a.currentWeek} of {a.totalWeeks}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Assignment Detail View */
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                            <button
                                onClick={() => setSelectedAssignment(null)}
                                className="flex items-center gap-2 text-amber-600 hover:text-amber-700 transition-colors mb-4"
                            >
                                <ArrowLeft className="w-4 h-4" /> Back to Assignments
                            </button>

                            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-2xl font-display text-gray-900">{selectedAssignment.fighterName}</h3>
                                        <p className="text-gray-500">{selectedAssignment.discipline} • {ageGroupInfo[selectedAssignment.ageGroup as AgeGroup]?.label}</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            handleDeleteAssignment(selectedAssignment._id);
                                            setSelectedAssignment(null);
                                        }}
                                        className="p-2.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Roadmap Display */}
                                <div className="space-y-4">
                                    {(roadmapData[selectedAssignment.discipline as Discipline]?.[selectedAssignment.ageGroup as AgeGroup] || []).map((week) => {
                                        const isUnlocked = selectedAssignment.unlockedWeeks.includes(week.week);
                                        const weekTasks = week.exercises.filter(e => undefined);
                                        const completed = weekTasks.filter(e => selectedAssignment.completedTasks.includes(e.id)).length;
                                        return (
                                            <motion.div key={week.week} className="border border-gray-200 rounded-xl overflow-hidden">
                                                <button
                                                    onClick={() => {
                                                        if (!isUnlocked && selectedAssignment.unlockedWeeks.length > 0) {
                                                            handleUnlockFighterWeek(selectedAssignment._id, week.week, selectedAssignment);
                                                        }
                                                    }}
                                                    className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between text-left"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {isUnlocked ? (
                                                            <CheckCircle2 className="w-5 h-5 text-amber-600" />
                                                        ) : (
                                                            <Lock className="w-5 h-5 text-gray-400" />
                                                        )}
                                                        <span className="font-semibold text-gray-900">Week {week.week}</span>
                                                    </div>
                                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                                </button>
                                                {isUnlocked && (
                                                    <div className="p-4 bg-white space-y-2 border-t border-gray-100">
                                                        {week.exercises.map(ex => (
                                                            <button
                                                                key={ex.id}
                                                                onClick={() => handleToggleFighterTask(selectedAssignment._id, ex.id, selectedAssignment)}
                                                                className="w-full text-left p-3 rounded-lg bg-gray-50 hover:bg-white hover:shadow-sm border border-gray-100 hover:border-gray-200 transition-colors flex items-start gap-3 group"
                                                            >
                                                                {selectedAssignment.completedTasks.includes(ex.id) ? (
                                                                    <CheckCircle2 className="w-4 h-4 text-amber-600 flex-shrink-0 mt-1" />
                                                                ) : (
                                                                    <Circle className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1 group-hover:text-amber-500" />
                                                                )}
                                                                <div className="flex-1 min-w-0">
                                                                    <p className={selectedAssignment.completedTasks.includes(ex.id) ? "text-gray-400 line-through" : "text-gray-900"}>{ex.name}</p>
                                                                    <p className="text-gray-500 text-xs">{ex.duration}</p>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </motion.div>
                )}
            </div>
            <AnimatePresence>
                {toastMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.3 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-gray-200 shadow-lg"
                    >
                        <Lock className="w-4 h-4 text-red-600 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{toastMessage}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ===== VIDEO MODAL ===== */}
            <AnimatePresence>
                {videoModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                        onClick={() => setVideoModal(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="relative w-full max-w-4xl rounded-2xl overflow-hidden border border-white/10 bg-neutral-950 shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                                <h3 className="text-white font-bold text-sm truncate pr-4">{videoModal.name}</h3>
                                <button
                                    onClick={() => setVideoModal(null)}
                                    className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            {/* Embed */}
                            <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
                                <iframe
                                    className="absolute inset-0 w-full h-full"
                                    src={getYoutubeEmbedUrl(videoModal.url)}
                                    title={videoModal.name}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}
