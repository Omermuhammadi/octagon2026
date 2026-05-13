// ---------------------------------------------------------------------------
// Quiz Bank — concept-check quizzes per discipline & week.
// Each exercise's quiz is selected by `${discipline}-w${week}` so all four
// exercises in a given week share a 3-question concept-check.
// Age-group neutral: questions cover the discipline concept, not the specific
// drill. The quiz unlocks AFTER the trainee marks the exercise complete.
// ---------------------------------------------------------------------------

export interface QuizQuestion {
    question: string;
    choices: string[];
    correct: number; // index in choices
    rationale: string;
}

export interface Quiz {
    title: string;
    questions: QuizQuestion[];
}

// Format: "Discipline-w{week}"
const quizBank: Record<string, Quiz> = {
    // ---------------------- BJJ ----------------------
    "BJJ-w1": {
        title: "Foundations & Movement",
        questions: [
            {
                question: "What is the PRIMARY purpose of shrimping (hip escape) in BJJ?",
                choices: [
                    "To attack the legs",
                    "To create space and prevent your opponent from settling on top",
                    "To stand back up immediately",
                    "To execute a takedown",
                ],
                correct: 1,
                rationale: "Shrimping creates angle and space — the foundation of guard recovery and escapes.",
            },
            {
                question: "When falling backward in BJJ, you should:",
                choices: [
                    "Tuck your chin and slap the mat with your arm",
                    "Land on your tailbone with arms extended back",
                    "Roll forward instead",
                    "Hold your breath and stiffen up",
                ],
                correct: 0,
                rationale: "Tucking the chin protects your head; a flat-arm slap absorbs impact and prevents wrist injury.",
            },
            {
                question: "Why is closed guard considered a strong defensive position?",
                choices: [
                    "Your opponent can't move at all",
                    "It's the only legal guard in competition",
                    "Your legs control your opponent's hips, limiting their attacks",
                    "You can score points without effort",
                ],
                correct: 2,
                rationale: "Hip control = posture control. Without posture, the top player struggles to pass or strike.",
            },
        ],
    },
    "BJJ-w2": {
        title: "Submissions & Control",
        questions: [
            {
                question: "For an effective armbar from guard, the most important detail is:",
                choices: [
                    "Pulling as hard as possible",
                    "Controlling the wrist, hugging the arm, and lifting hips",
                    "Squeezing your knees together",
                    "Looking away from your opponent",
                ],
                correct: 1,
                rationale: "Hip elevation generates the torque; arm trapping prevents escape. Strength alone fails on bigger opponents.",
            },
            {
                question: "When caught in a tight submission, what should you do?",
                choices: [
                    "Hold your breath and try to power out",
                    "Tap firmly and clearly — drilling > ego",
                    "Wait until pain peaks, then escape",
                    "Bite or pinch your partner",
                ],
                correct: 1,
                rationale: "Tapping early protects joints and trust. Injuries kill training time; ego kills careers.",
            },
            {
                question: "What's the key principle behind the triangle choke?",
                choices: [
                    "Crushing the throat",
                    "Using one of their arms with their own neck to cut blood flow",
                    "Squeezing knees as tight as possible",
                    "Lifting the hips straight up",
                ],
                correct: 1,
                rationale: "Triangle is a blood choke — closing the carotid arteries via their own shoulder. Squeeze + angle, not strength.",
            },
        ],
    },
    "BJJ-w3": {
        title: "Guard & Sweeps",
        questions: [
            {
                question: "An open guard sweep typically requires:",
                choices: [
                    "Pure leg strength",
                    "Off-balancing the opponent + redirecting their weight",
                    "Trapping their head and arm",
                    "Standing up first",
                ],
                correct: 1,
                rationale: "Sweeps work by breaking base. Once they're on one foot or hand, redirecting their weight tips them.",
            },
            {
                question: "When passing the guard, you should generally:",
                choices: [
                    "Stand up tall and hop side to side",
                    "Keep elbows out wide for balance",
                    "Control the hips, kill the legs, then advance position",
                    "Attack a submission immediately",
                ],
                correct: 2,
                rationale: "Pass = hip control first. Without controlling their hips, every pass attempt gets reset.",
            },
            {
                question: "Guard retention starts with:",
                choices: [
                    "Framing and using your hips to create distance",
                    "Grabbing their belt with both hands",
                    "Closing your eyes and bridging",
                    "Going flat on your back",
                ],
                correct: 0,
                rationale: "Frames buy time; hip movement creates angle. Going flat surrenders the position.",
            },
        ],
    },
    "BJJ-w4": {
        title: "Live Application & Strategy",
        questions: [
            {
                question: "What's the smartest way to develop your 'A-game'?",
                choices: [
                    "Try a new technique every roll",
                    "Drill 2–3 high-percentage techniques to mastery",
                    "Copy your favorite competitor exactly",
                    "Avoid sparring until you feel ready",
                ],
                correct: 1,
                rationale: "Mastery beats variety. Top competitors win with a small, deeply-trained set of techniques.",
            },
            {
                question: "Before a live roll, your warm-up should:",
                choices: [
                    "Be skipped — save energy",
                    "Include sprints to maximum heart rate",
                    "Raise body temperature, mobilize joints, fire neural pathways",
                    "Be 30 minutes of static stretching",
                ],
                correct: 2,
                rationale: "A proper warm-up is dynamic — it primes the nervous system without exhausting it.",
            },
            {
                question: "After a hard session, the highest-leverage habit is:",
                choices: [
                    "Cold shower and protein within 60 minutes",
                    "Brief notes on what worked and what didn't",
                    "Watch instructionals for 2 hours",
                    "Sleep less to recover faster",
                ],
                correct: 1,
                rationale: "Reflective journaling compresses learning. The brain consolidates lessons during reflection + sleep.",
            },
        ],
    },

    // ---------------------- Wrestling ----------------------
    "Wrestling-w1": {
        title: "Stance & Motion",
        questions: [
            {
                question: "A correct wrestling stance includes:",
                choices: [
                    "Tall posture with locked knees",
                    "Knees bent, weight on balls of feet, hands active",
                    "Crouched flat-footed with arms wide",
                    "Standing perfectly square to opponent",
                ],
                correct: 1,
                rationale: "Athletic stance = explosiveness in any direction. Locked legs and flat feet kill reaction time.",
            },
            {
                question: "The penetration step is used to:",
                choices: [
                    "Score back points",
                    "Close distance and drive into a takedown",
                    "Defend against a shot",
                    "Reset position after a stalemate",
                ],
                correct: 1,
                rationale: "Penetration is the offensive footwork pattern that gets you under the opponent's hips.",
            },
            {
                question: "When sprawling against a shot, your hips should:",
                choices: [
                    "Stay back and drop heavy onto opponent's shoulders",
                    "Push forward into their attack",
                    "Stay neutral and loose",
                    "Twist sideways immediately",
                ],
                correct: 0,
                rationale: "Heavy hips back disconnect the attacker from your legs — the foundation of takedown defense.",
            },
        ],
    },
    "Wrestling-w2": {
        title: "Takedown System",
        questions: [
            {
                question: "On a double-leg takedown, you should finish by:",
                choices: [
                    "Standing tall and pushing",
                    "Driving your head through their hip and lifting",
                    "Letting go and reshooting",
                    "Squeezing both knees together",
                ],
                correct: 1,
                rationale: "Head position + hip drive controls direction. Standing up gives them an underhook to escape.",
            },
            {
                question: "The single leg is typically more effective than the double leg when:",
                choices: [
                    "The opponent has a lower stance",
                    "The opponent has a tall, square stance with one leg slightly forward",
                    "The opponent is much heavier",
                    "You are tired",
                ],
                correct: 1,
                rationale: "A staggered or tall stance exposes the lead leg, making the single leg the natural angle.",
            },
            {
                question: "A 'snap down' is used to:",
                choices: [
                    "Pin the opponent immediately",
                    "Break their posture and get to a front headlock or back",
                    "Stall the match",
                    "Escape from bottom",
                ],
                correct: 1,
                rationale: "Snap downs collapse the head and lead to dominant positions like front headlock or going to the back.",
            },
        ],
    },
    "Wrestling-w3": {
        title: "Top & Bottom Game",
        questions: [
            {
                question: "Riding (controlling the opponent on the mat) requires:",
                choices: [
                    "Lying on top with your full weight",
                    "Active hand fighting + hip pressure + breaking their base",
                    "Holding their belt with both hands",
                    "Sitting back and waiting",
                ],
                correct: 1,
                rationale: "Riding is dynamic — you continuously break their posture and hands to prevent stand-ups and reversals.",
            },
            {
                question: "From bottom referee position, the most efficient escape is usually:",
                choices: [
                    "Stand-up with proper hand fighting",
                    "Roll over your shoulder",
                    "Sit and pull guard",
                    "Wait for the whistle",
                ],
                correct: 0,
                rationale: "Stand-ups score 1 point and reset to neutral — high-percentage and consistent.",
            },
            {
                question: "A tight waist + ankle pick combo on top:",
                choices: [
                    "Is illegal in folkstyle",
                    "Breaks down the bottom wrestler's base for a turn",
                    "Counts as a pin",
                    "Only works in freestyle",
                ],
                correct: 1,
                rationale: "Tight waist controls hips while the ankle pick removes their base — the foundation of mat returns and tilts.",
            },
        ],
    },
    "Wrestling-w4": {
        title: "Match Strategy & Conditioning",
        questions: [
            {
                question: "Wrestling conditioning emphasizes:",
                choices: [
                    "Long, slow distance running",
                    "Repeated short, intense bursts (interval-based)",
                    "Heavy bench pressing",
                    "Yoga only",
                ],
                correct: 1,
                rationale: "Match scoring happens in scrambles — the conditioning that wins matches is anaerobic intervals.",
            },
            {
                question: "Chain wrestling means:",
                choices: [
                    "Holding onto the opponent's wrist",
                    "Linking technique-to-technique so when one fails the next attacks",
                    "Wrestling for points only",
                    "Using a chain choke",
                ],
                correct: 1,
                rationale: "When the first attack is defended, you flow into the next. Chains overwhelm static defense.",
            },
            {
                question: "After a tough practice, your priority should be:",
                choices: [
                    "Sauna for 30+ minutes",
                    "Hydration, protein, and quality sleep",
                    "Skip food to make weight",
                    "More cardio",
                ],
                correct: 1,
                rationale: "Recovery is when adaptation happens. Hydration, protein, and sleep are non-negotiable.",
            },
        ],
    },

    // ---------------------- MMA ----------------------
    "MMA-w1": {
        title: "Stance & Distance Management",
        questions: [
            {
                question: "An MMA stance differs from a boxing stance because:",
                choices: [
                    "It must defend strikes AND takedowns simultaneously",
                    "It is always wider",
                    "Hands stay at the waist",
                    "Feet must be perfectly square",
                ],
                correct: 0,
                rationale: "MMA = striking + grappling + clinch. The stance must allow defense in all three phases.",
            },
            {
                question: "Distance management means:",
                choices: [
                    "Always backing up",
                    "Knowing when you're in your range and forcing your opponent out of theirs",
                    "Standing exactly 6 feet apart",
                    "Avoiding the cage",
                ],
                correct: 1,
                rationale: "Each fighter has a sweet spot. Winning means controlling distance to favor your skills.",
            },
            {
                question: "The jab in MMA is essential for:",
                choices: [
                    "Knockouts only",
                    "Measuring distance, setting up combos, and disrupting takedowns",
                    "Replacing the cross",
                    "Showing dominance",
                ],
                correct: 1,
                rationale: "The jab is the most-used punch in MMA — it controls range and opens up everything else.",
            },
        ],
    },
    "MMA-w2": {
        title: "Combinations & Defense",
        questions: [
            {
                question: "A good striking combination:",
                choices: [
                    "Always ends with a head kick",
                    "Mixes levels (head/body) and angles",
                    "Should always be 5+ strikes",
                    "Must follow textbook patterns only",
                ],
                correct: 1,
                rationale: "Level + angle changes overwhelm defense. Predictable combos get countered.",
            },
            {
                question: "Defending a takedown attempt typically uses:",
                choices: [
                    "Sprawling, framing the head, underhooks, and circling out",
                    "Pulling guard immediately",
                    "Pulling on the back of the head",
                    "Throwing a Hail Mary punch",
                ],
                correct: 0,
                rationale: "Sprawl + frames + underhooks is the textbook defensive sequence. Pulling head is illegal.",
            },
            {
                question: "Counter-striking requires:",
                choices: [
                    "Reading the opponent's tells and timing the gap in their attacks",
                    "Always moving backward",
                    "Throwing strikes simultaneously",
                    "Closing your eyes and swinging",
                ],
                correct: 0,
                rationale: "Counter striking is reactive timing — pattern recognition + clean defensive footwork.",
            },
        ],
    },
    "MMA-w3": {
        title: "Clinch & Ground",
        questions: [
            {
                question: "Underhooks in the clinch help you:",
                choices: [
                    "Throw uppercut combinations safely",
                    "Control posture and set up takedowns or escape",
                    "Win on points automatically",
                    "Stall the round",
                ],
                correct: 1,
                rationale: "Underhooks = posture control. They let you steer, take down, or stand back up.",
            },
            {
                question: "Ground-and-pound is most effective when:",
                choices: [
                    "You're in full guard",
                    "You're in dominant position with posture (mount, side control, half guard top)",
                    "Both fighters are standing",
                    "You're tired",
                ],
                correct: 1,
                rationale: "Without posture and dominant position, ground strikes lack power and leave you vulnerable to submissions.",
            },
            {
                question: "When defending submissions, the FIRST priority is:",
                choices: [
                    "Posture and hand-fighting to break the grip",
                    "Tapping immediately to be safe",
                    "Reversing position before defending",
                    "Closing your eyes",
                ],
                correct: 0,
                rationale: "Most submissions need a grip + angle. Breaking the grip neutralizes the attack at its root.",
            },
        ],
    },
    "MMA-w4": {
        title: "Fight IQ & Game Planning",
        questions: [
            {
                question: "A fight IQ moment means:",
                choices: [
                    "Throwing flashy techniques",
                    "Recognizing patterns and adjusting strategy mid-fight",
                    "Always winning rounds 10-9",
                    "Showing off skills",
                ],
                correct: 1,
                rationale: "Adaptation under pressure — the difference between technically skilled fighters and elite ones.",
            },
            {
                question: "A solid game plan against a wrestler is to:",
                choices: [
                    "Engage in clinch early",
                    "Maintain distance, use kicks, and force them to strike to enter",
                    "Pull guard",
                    "Stand directly in front of them",
                ],
                correct: 1,
                rationale: "Wrestlers thrive in clinch and on takedown entries. Distance + kicks neutralize their best tools.",
            },
            {
                question: "The week before a fight, you should:",
                choices: [
                    "Spar at full intensity daily",
                    "Taper volume, sharpen technique, prioritize recovery and weight",
                    "Try new techniques",
                    "Run a marathon",
                ],
                correct: 1,
                rationale: "Fight week is for sharpness, not building. Recovery > intensity in the final 7 days.",
            },
        ],
    },

    // ---------------------- Muay Thai ----------------------
    "Muay Thai-w1": {
        title: "Stance & The Eight Limbs",
        questions: [
            {
                question: "In Muay Thai stance, your weight is typically:",
                choices: [
                    "Forward, leaning into opponent",
                    "More on the back leg, ready to teep or check kicks",
                    "Centered and flat-footed",
                    "Leaning backward",
                ],
                correct: 1,
                rationale: "Back-weighted stance frees the lead leg for the teep and lets you check incoming kicks.",
            },
            {
                question: "Muay Thai is known as 'the art of eight limbs' because it uses:",
                choices: [
                    "Punches and kicks only",
                    "Punches, kicks, elbows, and knees",
                    "Eight different types of kicks",
                    "Eight strike combinations",
                ],
                correct: 1,
                rationale: "Eight points of contact: 2 fists, 2 feet, 2 elbows, 2 knees — the defining feature of Muay Thai.",
            },
            {
                question: "The teep (push kick) is used for:",
                choices: [
                    "Knockouts only",
                    "Range management, interrupting attacks, and scoring",
                    "Showing respect",
                    "Defending submissions",
                ],
                correct: 1,
                rationale: "The teep is Muay Thai's jab — it manages distance, breaks rhythm, and scores points.",
            },
        ],
    },
    "Muay Thai-w2": {
        title: "Power Strikes",
        questions: [
            {
                question: "A proper roundhouse kick generates power from:",
                choices: [
                    "Pure leg strength",
                    "Hip rotation and full-body torque (shin as a baseball bat)",
                    "Snapping at the knee only",
                    "Bouncing on the ball of the foot",
                ],
                correct: 1,
                rationale: "Hip rotation is the engine. Treating the leg as one heavy whip maximizes impact.",
            },
            {
                question: "When throwing an elbow, you should:",
                choices: [
                    "Lock your arm out fully",
                    "Drive through the target with body rotation",
                    "Aim for the chest",
                    "Always throw it as a counter only",
                ],
                correct: 1,
                rationale: "Body rotation generates the cutting power. A locked arm has no whip.",
            },
            {
                question: "Knee strikes are most effective:",
                choices: [
                    "From long range",
                    "In the clinch with strong neck control",
                    "After a takedown",
                    "While walking backward",
                ],
                correct: 1,
                rationale: "Clinch + neck control = anchor for landing knees with full force on body and head.",
            },
        ],
    },
    "Muay Thai-w3": {
        title: "Clinch & Defense",
        questions: [
            {
                question: "The Muay Thai clinch (plum) involves:",
                choices: [
                    "Both hands on the back of the opponent's neck, elbows tight",
                    "Hugging the waist",
                    "Holding the wrists",
                    "One arm over, one under",
                ],
                correct: 0,
                rationale: "Double collar tie with elbows tight controls posture and frames their face for knees.",
            },
            {
                question: "To CHECK a low kick, you should:",
                choices: [
                    "Step back",
                    "Lift your knee and turn your shin into the incoming kick",
                    "Catch the kick with your hands",
                    "Drop your weight onto the kicking leg",
                ],
                correct: 1,
                rationale: "Shin-to-shin block redirects energy back into the kicker and protects your thigh.",
            },
            {
                question: "Catching a kick allows you to:",
                choices: [
                    "Score automatic points",
                    "Sweep, dump, or counter strike with the trapped leg",
                    "End the round early",
                    "Earn a warning",
                ],
                correct: 1,
                rationale: "A caught kick gives you the limb — sweep, dump, or punch them while they're on one leg.",
            },
        ],
    },
    "Muay Thai-w4": {
        title: "Fight Pace & Strategy",
        questions: [
            {
                question: "Traditional Muay Thai pacing builds intensity by:",
                choices: [
                    "Going 100% from round 1",
                    "Starting measured (round 1-2), peaking in rounds 3-4",
                    "Stalling all five rounds",
                    "Knocking out opponents in 30 seconds",
                ],
                correct: 1,
                rationale: "Traditional scoring weights later rounds. Pacing wins judges' decisions in 5-round bouts.",
            },
            {
                question: "Against a southpaw opponent, you should generally:",
                choices: [
                    "Avoid them entirely",
                    "Step your lead foot outside theirs to create the dominant angle",
                    "Match stance immediately",
                    "Throw only jabs",
                ],
                correct: 1,
                rationale: "Outside-foot positioning closes their power side and opens your cross/round kick.",
            },
            {
                question: "After clinch breaks, you should:",
                choices: [
                    "Reset your stance and check distance",
                    "Charge forward immediately",
                    "Turn your back",
                    "Drop your hands",
                ],
                correct: 0,
                rationale: "Clinch separations are vulnerable moments — reset your stance and re-establish guard.",
            },
        ],
    },

    // ---------------------- Boxing ----------------------
    "Boxing-w1": {
        title: "Stance & Footwork",
        questions: [
            {
                question: "Proper boxing footwork emphasizes:",
                choices: [
                    "Crossing your feet for speed",
                    "Step-and-drag — never crossing feet",
                    "Bouncing constantly",
                    "Standing perfectly still",
                ],
                correct: 1,
                rationale: "Crossing feet kills your base. Step-drag keeps you balanced and ready to punch or evade.",
            },
            {
                question: "Your lead hand in boxing is mainly used to:",
                choices: [
                    "Knock out opponents",
                    "Jab, range-find, and disrupt rhythm",
                    "Block kicks",
                    "Wave at the crowd",
                ],
                correct: 1,
                rationale: "The jab is boxing's most important punch — it sets up everything and dictates pace.",
            },
            {
                question: "Head movement in a boxing stance includes:",
                choices: [
                    "Rolling, slipping, and ducking — never staying static",
                    "Bobbing only when hit",
                    "Keeping your head perfectly still",
                    "Looking down at all times",
                ],
                correct: 0,
                rationale: "A still head is a target. Constant subtle motion makes you hard to time and counter.",
            },
        ],
    },
    "Boxing-w2": {
        title: "Punching Mechanics",
        questions: [
            {
                question: "A textbook cross (rear straight) generates power from:",
                choices: [
                    "Pure arm strength",
                    "Hip and shoulder rotation, transferring weight to the lead foot",
                    "Just stepping forward",
                    "The wrist snapping",
                ],
                correct: 1,
                rationale: "Power = ground up. Hips rotate, shoulder follows, fist arrives last with full body behind it.",
            },
            {
                question: "The lead hook is most effective when:",
                choices: [
                    "Thrown from long range",
                    "Thrown at mid-range with hip rotation and elbow at 90°",
                    "Used to defend takedowns",
                    "Thrown one-handed only",
                ],
                correct: 1,
                rationale: "The hook needs mid-range and 90° elbow geometry. Too far = no power; too close = jamming.",
            },
            {
                question: "After every combination, you should:",
                choices: [
                    "Drop your hands and watch",
                    "Reset your stance, hands up, and re-engage with footwork",
                    "Charge forward with another combo immediately",
                    "Turn your back",
                ],
                correct: 1,
                rationale: "The most dangerous moment is right after your combo. Reset hands + stance to defend the counter.",
            },
        ],
    },
    "Boxing-w3": {
        title: "Defense & Counters",
        questions: [
            {
                question: "A 'slip' is:",
                choices: [
                    "A type of fall",
                    "Moving the head off-line by rotating at the waist",
                    "A counter punch",
                    "A defensive grip",
                ],
                correct: 1,
                rationale: "Slipping makes the punch miss while keeping you in counter range — high-skill defense.",
            },
            {
                question: "Counter punching requires:",
                choices: [
                    "Reading patterns and exploiting the gap right after their punch",
                    "Punching at the same time as them",
                    "Always going first",
                    "Standing still and absorbing",
                ],
                correct: 0,
                rationale: "Counters land in the recovery window of their attack. Pattern reading > raw speed.",
            },
            {
                question: "Body shots are valuable because:",
                choices: [
                    "They score double points",
                    "They drain energy, weaken posture, and slow opponents in later rounds",
                    "They're easier to land",
                    "They can't be blocked",
                ],
                correct: 1,
                rationale: "Body damage is cumulative — round-after-round, the opponent's output drops.",
            },
        ],
    },
    "Boxing-w4": {
        title: "Ring Strategy & Conditioning",
        questions: [
            {
                question: "Cutting off the ring means:",
                choices: [
                    "Ending the round early",
                    "Using diagonal footwork to limit your opponent's escape angles",
                    "Standing in the center always",
                    "Hitting the ring rope",
                ],
                correct: 1,
                rationale: "Cutting the ring = controlling angles. You force the opponent into corners or onto the ropes.",
            },
            {
                question: "Conditioning for boxing should heavily feature:",
                choices: [
                    "Marathon running only",
                    "Interval work that mimics 3-min round / 1-min rest pacing",
                    "Pure bench press training",
                    "Yoga only",
                ],
                correct: 1,
                rationale: "Specificity wins. Conditioning that mirrors round structure is the highest-leverage cardio.",
            },
            {
                question: "Mental preparation before a fight is best done by:",
                choices: [
                    "Avoiding all thoughts of the fight",
                    "Visualizing scenarios + game-plan rehearsal in the days before",
                    "Watching the opponent's highlights repeatedly",
                    "Hyping up with adrenaline music for hours",
                ],
                correct: 1,
                rationale: "Visualization primes the nervous system. Highlight reels and prolonged adrenaline drain you.",
            },
        ],
    },
};

// Generic fallback if a key isn't found
const fallbackQuiz: Quiz = {
    title: "Concept Check",
    questions: [
        {
            question: "Which is the most important habit for long-term progress in martial arts?",
            choices: [
                "Going 100% intensity every session",
                "Consistent attendance + deliberate practice on weak areas",
                "Watching highlight videos",
                "Buying premium gear",
            ],
            correct: 1,
            rationale: "Consistency + deliberate weak-area work compounds. Intensity without recovery causes injury.",
        },
        {
            question: "When learning a new technique, you should:",
            choices: [
                "Drill at full speed immediately",
                "Drill slowly with perfect form, then add speed and resistance",
                "Use it in sparring on day one",
                "Skip the warm-up",
            ],
            correct: 1,
            rationale: "Slow + perfect builds neural patterns. Speed and resistance are added later, in that order.",
        },
        {
            question: "If you get injured, the smartest response is:",
            choices: [
                "Push through the pain",
                "Rest, see a professional if needed, and modify training around it",
                "Take steroids",
                "Keep sparring at full intensity",
            ],
            correct: 1,
            rationale: "Injuries compound when ignored. Smart modification gets you back faster than denial.",
        },
    ],
};

export function getQuizFor(discipline: string, week: number): Quiz {
    const key = `${discipline}-w${week}`;
    return quizBank[key] || fallbackQuiz;
}
