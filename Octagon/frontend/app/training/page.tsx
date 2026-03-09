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
type AgeGroup = "under-15" | "15-25" | "25+";
type Discipline = "BJJ" | "Wrestling" | "MMA";

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
        "under-15": [
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
        "15-25": [
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
        "25+": [
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
        "under-15": [
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
        "15-25": [
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
        "25+": [
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
        "under-15": [
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
        "15-25": [
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
        "25+": [
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
    "under-15": {
        label: "Under 15",
        icon: Star,
        description: "Fun, safe, and playful training for young athletes",
        classes: { text: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20", hoverBorder: "hover:border-green-400/50" },
    },
    "15-25": {
        label: "15 - 25",
        icon: Zap,
        description: "Competitive training for peak performance years",
        classes: { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", hoverBorder: "hover:border-red-400/50" },
    },
    "25+": {
        label: "25+",
        icon: Shield,
        description: "Smart training with injury prevention focus",
        classes: { text: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", hoverBorder: "hover:border-blue-400/50" },
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
        classes: { text: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20", hoverBorder: "hover:border-purple-400/50" },
    },
    Wrestling: {
        icon: Dumbbell,
        description: "Takedowns, control, and explosive athleticism",
        classes: { text: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", hoverBorder: "hover:border-yellow-400/50" },
    },
    MMA: {
        icon: Target,
        description: "The complete combat sport -- striking, grappling, and everything between",
        classes: { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", hoverBorder: "hover:border-red-400/50" },
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
                    className="text-white/10"
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
                    <Lock className="w-3 h-3 text-neutral-600" />
                ) : isComplete ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                ) : (
                    <span className="text-[10px] font-bold text-neutral-400 tabular-nums">
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
                    <span className="text-white font-bold text-sm">Overall Progress</span>
                </div>
                <span className={`font-bold tabular-nums text-sm ${isComplete ? "text-yellow-400" : "text-white"}`}>
                    {percent}%
                </span>
            </div>

            <div className="relative">
                <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
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
                                    ? "bg-white border-white shadow-sm shadow-white/50"
                                    : "bg-neutral-800 border-neutral-600"
                            }`} />
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex items-center justify-between">
                <p className="text-neutral-500 text-xs tabular-nums">{completed} of {total} exercises completed</p>
                {isComplete && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-1 text-yellow-400 text-xs font-bold"
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
            <div className="min-h-screen bg-black flex items-center justify-center">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                    <p className="text-neutral-500 text-sm">Loading training module...</p>
                </motion.div>
            </div>
        );
    }

    // --- RENDER ---
    return (
        <div className="min-h-screen bg-gradient-to-b from-black via-neutral-950 to-black pt-24 pb-16 relative overflow-hidden">
            {/* Faint octagon background decorations */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-[0.02] pointer-events-none">
                <div className="w-full h-full octagon-clip border-2 border-white" />
            </div>
            <div className="absolute bottom-1/4 right-0 translate-x-1/4 w-[400px] h-[400px] opacity-[0.015] pointer-events-none">
                <div className="w-full h-full octagon-clip border-2 border-red-500" />
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

                {/* ===== PAGE HEADER ===== */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-12"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 mb-6">
                        <Flame className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-red-400 text-xs font-bold uppercase tracking-wider">Training Module</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-display italic text-white mb-4">
                        TRAINING <span className="text-octagon-red">ROADMAPS</span>
                    </h1>
                    <p className="text-neutral-400 max-w-xl mx-auto text-base">
                        Age-appropriate training programs tailored to your level. Complete each week to unlock the next.
                    </p>
                </motion.div>

                {/* ===== COACH TABS ===== */}
                {user?.role === 'coach' && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4 mb-12 justify-center">
                        <button
                            onClick={() => setCoachTab('personal')}
                            className={`px-6 py-3 rounded-lg font-semibold text-sm transition-all ${coachTab === 'personal'
                                ? 'bg-octagon-gold text-black'
                                : 'bg-white/5 text-white hover:bg-white/10'
                            }`}
                        >
                            <Dumbbell className="w-4 h-4 inline mr-2" /> Personal Training
                        </button>
                        <button
                            onClick={() => setCoachTab('manage')}
                            className={`px-6 py-3 rounded-lg font-semibold text-sm transition-all ${coachTab === 'manage'
                                ? 'bg-octagon-gold text-black'
                                : 'bg-white/5 text-white hover:bg-white/10'
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
                    {/* --- Age Group Selection --- */}
                    {!ageGroup && (
                        <motion.div
                            key="age-select"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <h2 className="text-lg font-bold text-white mb-6 text-center uppercase tracking-wider font-heading">
                                Select Your Age Group
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
                                            className={`group relative p-6 rounded-2xl border bg-neutral-900/50 backdrop-blur-sm text-left transition-all duration-300 ${info.classes.border} ${info.classes.hoverBorder} hover:shadow-xl`}
                                        >
                                            <div className={`absolute inset-0 rounded-2xl ${info.classes.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                                            <div className="relative z-10">
                                                <div className={`w-12 h-12 rounded-xl ${info.classes.bg} flex items-center justify-center mb-4`}>
                                                    <Icon className={`w-6 h-6 ${info.classes.text}`} />
                                                </div>
                                                <h3 className="text-white text-2xl font-bold mb-2 font-heading">{info.label}</h3>
                                                <p className="text-neutral-400 text-sm leading-relaxed">{info.description}</p>
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
                                className="text-neutral-400 hover:text-white mb-6 flex items-center gap-1.5 transition-colors text-sm group"
                            >
                                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                Back to age group
                            </button>
                            <h2 className="text-lg font-bold text-white mb-6 text-center uppercase tracking-wider font-heading">
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
                                            className={`group relative p-6 rounded-2xl border bg-neutral-900/50 backdrop-blur-sm text-left transition-all duration-300 ${info.classes.border} ${info.classes.hoverBorder} hover:shadow-xl`}
                                        >
                                            <div className={`absolute inset-0 rounded-2xl ${info.classes.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                                            <div className="relative z-10">
                                                <div className={`w-12 h-12 rounded-xl ${info.classes.bg} flex items-center justify-center mb-4`}>
                                                    <Icon className={`w-6 h-6 ${info.classes.text}`} />
                                                </div>
                                                <h3 className="text-white text-2xl font-bold mb-1 font-heading">{key}</h3>
                                                <p className="text-neutral-500 text-xs mb-2">
                                                    4-week program for {ageGroupInfo[ageGroup].label} age group
                                                </p>
                                                <p className="text-neutral-400 text-sm leading-relaxed">{info.description}</p>
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
                                    className="text-neutral-400 hover:text-white flex items-center gap-1.5 transition-colors text-sm group"
                                >
                                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                    Back
                                </button>
                                <div className="flex items-center gap-3 text-sm">
                                    <span className="text-neutral-500">{ageGroupInfo[ageGroup].label}</span>
                                    <span className="text-neutral-700">|</span>
                                    <span className="text-white font-bold">{discipline}</span>
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
                                        ? "bg-yellow-500/5 border-yellow-500/20 shadow-lg shadow-yellow-500/10"
                                        : "bg-neutral-900/50 backdrop-blur-sm border-white/5"
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
                                                        ? "bg-green-500/20 text-green-400 ring-1 ring-green-500/30"
                                                        : wUnlocked
                                                            ? "bg-red-500/20 text-red-400 ring-1 ring-red-500/30"
                                                            : "bg-white/5 text-neutral-600"
                                                }`}>
                                                    {wDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : wUnlocked ? w.week : <Lock className="w-3 h-3" />}
                                                </div>
                                                {i < weeks.length - 1 && (
                                                    <div className={`w-6 sm:w-10 h-px transition-colors ${wDone ? "bg-green-500/40" : "bg-white/10"}`} />
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
                                                    ? "bg-neutral-950/50 border-white/[0.03] opacity-60"
                                                    : wasJustUnlocked
                                                        ? "bg-neutral-900/50 backdrop-blur-sm border-yellow-500/50"
                                                        : isWeekComplete
                                                            ? "bg-green-500/[0.03] border-green-500/20 shadow-md shadow-green-500/5"
                                                            : "bg-neutral-900/50 backdrop-blur-sm border-white/5 hover:border-red-500/20"
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
                                                    isLocked ? "cursor-not-allowed" : "hover:bg-white/[0.03] cursor-pointer"
                                                }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <CircularProgress
                                                        completed={weekCompletedCount}
                                                        total={weekTotal}
                                                        locked={isLocked}
                                                    />
                                                    <div className="text-left">
                                                        <h3 className={`font-bold font-heading ${isLocked ? "text-neutral-600" : "text-white"}`}>
                                                            Week {week.week}: {week.title}
                                                        </h3>
                                                        <p className={`text-sm mt-0.5 ${isLocked ? "text-neutral-700" : "text-neutral-500"}`}>
                                                            {isLocked
                                                                ? `Complete Week ${week.week - 1} to unlock`
                                                                : `${week.focus} \u00B7 ${weekCompletedCount}/${weekTotal} done`
                                                            }
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {isWeekComplete && !isLocked && (
                                                        <span className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full">
                                                            <CheckCircle2 className="w-3 h-3" /> Complete
                                                        </span>
                                                    )}
                                                    {isLocked ? (
                                                        <Lock className="w-4 h-4 text-neutral-600" />
                                                    ) : (
                                                        <ChevronDown className={`w-5 h-5 text-neutral-500 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
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
                                                            className="border-t border-white/5 px-4 sm:px-6 py-4 space-y-2"
                                                        >
                                                            {week.exercises.map((exercise) => {
                                                                const isDone = completedTasks.has(exercise.id);
                                                                return (
                                                                    <motion.div
                                                                        key={exercise.id}
                                                                        variants={exerciseItem}
                                                                        className={`group relative flex items-start gap-3 p-3 sm:p-4 rounded-xl border transition-all duration-200 ${
                                                                            isDone
                                                                                ? "bg-green-500/5 border-green-500/10"
                                                                                : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10"
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
                                                                                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                                                                                </motion.div>
                                                                            ) : (
                                                                                <Circle className="w-5 h-5 text-neutral-600 hover:text-neutral-400 transition-colors" />
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
                                                                                        isDone ? "text-green-400/80 line-through" : "text-white"
                                                                                    }`}>
                                                                                        {exercise.name}
                                                                                    </h4>
                                                                                </button>
                                                                                <span className={`flex-shrink-0 inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md tabular-nums ${
                                                                                    isDone
                                                                                        ? "bg-green-500/10 text-green-400/70"
                                                                                        : "bg-white/5 text-neutral-500"
                                                                                }`}>
                                                                                    <Clock className="w-2.5 h-2.5" />
                                                                                    {exercise.duration}
                                                                                </span>
                                                                            </div>
                                                                            <p className={`text-xs mt-1 leading-relaxed ${
                                                                                isDone ? "text-green-400/40" : "text-neutral-500"
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
                                                                            className="flex-shrink-0 mt-0.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 hover:border-red-500/40 text-red-400 hover:text-red-300 text-[11px] font-bold uppercase tracking-wider transition-all opacity-40 group-hover:opacity-100 sm:opacity-100 cursor-pointer"
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
                            <motion.div className="bg-neutral-900/50 backdrop-blur border border-white/10 rounded-2xl p-6 mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                <h2 className="text-xl font-display text-white mb-4 flex items-center gap-2">
                                    <ClipboardList className="w-5 h-5 text-octagon-gold" /> Assign Training Program
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
                                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-octagon-gold/50"
                                        />
                                        {rosterDropdown && roster.length > 0 && (
                                            <div className="absolute z-50 w-full mt-1 bg-neutral-900 border border-white/10 rounded-lg max-h-40 overflow-y-auto">
                                                {roster.map(f => (
                                                    <button
                                                        key={f._id}
                                                        onClick={() => {
                                                            setAssignForm(prev => ({ ...prev, fighterName: f.fighterName }));
                                                            setRosterSearch(f.fighterName);
                                                            setRosterDropdown(false);
                                                        }}
                                                        className="w-full text-left px-3 py-2 hover:bg-white/5 text-white text-sm border-b border-white/5 last:border-0"
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
                                        className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-octagon-gold/50"
                                    >
                                        <option value="">Select Discipline</option>
                                        {Object.keys(disciplineInfo).map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>

                                    {/* Age Group Select */}
                                    <select
                                        value={assignForm.ageGroupSelection}
                                        onChange={(e) => setAssignForm(prev => ({ ...prev, ageGroupSelection: e.target.value }))}
                                        className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-octagon-gold/50"
                                    >
                                        <option value="">Select Age Group</option>
                                        {Object.keys(ageGroupInfo).map(a => (
                                            <option key={a} value={a}>{ageGroupInfo[a as AgeGroup].label}</option>
                                        ))}
                                    </select>

                                    {/* Assign Button */}
                                    <button
                                        onClick={handleAssignTraining}
                                        disabled={assigningTraining}
                                        className="px-4 py-2 rounded-lg bg-octagon-gold/20 hover:bg-octagon-gold/30 text-octagon-gold disabled:opacity-50 font-semibold transition-colors flex items-center justify-center gap-2"
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
                                    <Loader2 className="w-6 h-6 animate-spin text-octagon-gold" />
                                </div>
                            ) : assignments.length === 0 ? (
                                <div className="text-center py-12">
                                    <Users className="w-12 h-12 text-neutral-700 mx-auto mb-3" />
                                    <p className="text-neutral-400">No training assignments yet. Assign a training program to one of your fighters.</p>
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
                                                className="bg-neutral-900/50 border border-white/10 rounded-xl p-4 cursor-pointer hover:border-octagon-gold/30 transition-colors group"
                                            >
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <p className="text-white font-semibold">{a.fighterName}</p>
                                                        <p className="text-neutral-400 text-xs">{a.discipline} • {ageGroupInfo[a.ageGroup as AgeGroup]?.label}</p>
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteAssignment(a._id);
                                                        }}
                                                        className="p-1.5 rounded-lg text-neutral-600 hover:text-red-400 hover:bg-white/5 transition-colors opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="mb-3">
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="text-neutral-400">Progress</span>
                                                        <span className="text-octagon-gold font-semibold">{completedCount}/{totalCount}</span>
                                                    </div>
                                                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-octagon-gold to-orange-500 transition-all"
                                                            style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-neutral-400">
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
                                className="flex items-center gap-2 text-octagon-gold hover:text-white transition-colors mb-4"
                            >
                                <ArrowLeft className="w-4 h-4" /> Back to Assignments
                            </button>

                            <div className="bg-neutral-900/50 border border-white/10 rounded-2xl p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-2xl font-display text-white">{selectedAssignment.fighterName}</h3>
                                        <p className="text-neutral-400">{selectedAssignment.discipline} • {ageGroupInfo[selectedAssignment.ageGroup as AgeGroup]?.label}</p>
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
                                            <motion.div key={week.week} className="border border-white/10 rounded-xl overflow-hidden">
                                                <button
                                                    onClick={() => {
                                                        if (!isUnlocked && selectedAssignment.unlockedWeeks.length > 0) {
                                                            handleUnlockFighterWeek(selectedAssignment._id, week.week, selectedAssignment);
                                                        }
                                                    }}
                                                    className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-between text-left"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {isUnlocked ? (
                                                            <CheckCircle2 className="w-5 h-5 text-octagon-gold" />
                                                        ) : (
                                                            <Lock className="w-5 h-5 text-neutral-600" />
                                                        )}
                                                        <span className="font-semibold text-white">Week {week.week}</span>
                                                    </div>
                                                    <ChevronDown className="w-4 h-4 text-neutral-500" />
                                                </button>
                                                {isUnlocked && (
                                                    <div className="p-4 bg-black/30 space-y-2 border-t border-white/5">
                                                        {week.exercises.map(ex => (
                                                            <button
                                                                key={ex.id}
                                                                onClick={() => handleToggleFighterTask(selectedAssignment._id, ex.id, selectedAssignment)}
                                                                className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex items-start gap-3 group"
                                                            >
                                                                {selectedAssignment.completedTasks.includes(ex.id) ? (
                                                                    <CheckCircle2 className="w-4 h-4 text-octagon-gold flex-shrink-0 mt-1" />
                                                                ) : (
                                                                    <Circle className="w-4 h-4 text-neutral-600 flex-shrink-0 mt-1 group-hover:text-octagon-gold" />
                                                                )}
                                                                <div className="flex-1 min-w-0">
                                                                    <p className={selectedAssignment.completedTasks.includes(ex.id) ? "text-neutral-500 line-through" : "text-white"}>{ex.name}</p>
                                                                    <p className="text-neutral-500 text-xs">{ex.duration}</p>
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
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-xl bg-neutral-900 border border-red-500/30 shadow-lg shadow-black/50"
                    >
                        <Lock className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <span className="text-sm text-neutral-200">{toastMessage}</span>
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
