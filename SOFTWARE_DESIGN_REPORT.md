# Octagon Oracle — Software Design System Report

**Project:** Octagon Oracle — AI-Powered MMA Analytics & Training Platform  
**Version:** 1.0  
**Date:** March 2026  
**Classification:** Technical Design Documentation  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Technology Stack](#3-technology-stack)
4. [Data Architecture](#4-data-architecture)
5. [Module 1 — Account Management & Authentication](#5-module-1--account-management--authentication)
6. [Module 2 — Win & Technique Prediction (ML Engine)](#6-module-2--win--technique-prediction-ml-engine)
7. [Module 3 — Fighter Comparison & Strategy Suggestion](#7-module-3--fighter-comparison--strategy-suggestion)
8. [Module 4 — Beginner Training Roadmaps](#8-module-4--beginner-training-roadmaps)
9. [Module 5 — Gym Finder & Self-Defense Guide](#9-module-5--gym-finder--self-defense-guide)
10. [Module 6 — Form Correction (Pose Detection)](#10-module-6--form-correction-pose-detection)
11. [Module 7 — Gear Store (E-Commerce)](#11-module-7--gear-store-e-commerce)
12. [Module 8 — Chatbot (LLM-Powered NLP Assistant)](#12-module-8--chatbot-llm-powered-nlp-assistant)
13. [Module 9 — Dashboard & Persistent Statistics](#13-module-9--dashboard--persistent-statistics)
14. [Module 10 — Strategy Engine (Advanced Fight Planning)](#14-module-10--strategy-engine-advanced-fight-planning)
15. [Frontend Design System](#15-frontend-design-system)
16. [API Reference](#16-api-reference)
17. [Deployment Architecture](#17-deployment-architecture)
18. [Security Implementation](#18-security-implementation)
19. [Data Pipeline & ML Training](#19-data-pipeline--ml-training)
20. [Appendix — File Inventory](#20-appendix--file-inventory)

---

## 1. Executive Summary

### What We Are Building

Octagon Oracle is a full-stack, AI-powered MMA (Mixed Martial Arts) analytics platform serving four user personas — **fighters**, **coaches**, **beginners**, and **fans**. The system moves beyond static content to deliver real, data-backed fight predictions, personalized training tools, live pose-detection form analysis, geolocation-based gym discovery, an e-commerce gear store, and an LLM-powered chatbot — all underpinned by a dataset of **4,447 UFC fighters**, **8,456 fights**, **16,908 per-fight stat records**, and **754 events**.

### What We Implemented

| Capability | Implementation |
|---|---|
| User System | JWT auth with 4 roles, extended profiles, persistent stats |
| Fight Predictions | Custom logistic regression + gradient-boosted trees ensemble, 70.7% accuracy |
| Fighter Comparison | Real-time stat comparison with 6-dimension strategy suggestions |
| Training Roadmaps | 9 structured programs (3 disciplines × 3 age groups), server-side progress with week-locking |
| Gym Finder | 12 Pakistan gyms in MongoDB, Haversine geospatial search, browser geolocation |
| Self-Defense Guide | Scenario-based guide with dedicated women's safety section + Pakistan emergency resources |
| Form Correction | Client-side MediaPipe Pose Landmarker (33 body landmarks, 4 technique templates, weighted scoring) |
| Gear Store | Full product catalog, cart, atomic checkout with stock management, order history |
| Chatbot | Groq/Llama 3.3 70B with real-time MongoDB retrieval, guardrails, session history, keyword fallback |
| Dashboards | Role-based views with real-time stats calculated from Prediction, Form, Order, Roadmap activity |
| Strategy Engine | 8-section fight plan: prediction + strengths/weaknesses + range/strike/takedown analysis + LLM-generated round-by-round corner advice |

---

## 2. System Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                       CLIENT (Browser)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │   Next.js 16  │  │  React 19    │  │  MediaPipe WASM    │ │
│  │   App Router  │  │  Components  │  │  (Pose Detection)  │ │
│  └──────┬───────┘  └──────┬───────┘  └────────────────────┘ │
│         │                  │                                  │
│  ┌──────┴──────────────────┴─────────┐                       │
│  │        API Client (api.ts)         │                       │
│  │  11 modules · 50+ operations       │                       │
│  └──────────────┬────────────────────┘                       │
└─────────────────┼────────────────────────────────────────────┘
                  │ HTTPS / JSON
┌─────────────────┼────────────────────────────────────────────┐
│                 ▼         BACKEND (Express.js)                │
│  ┌──────────────────────────────────────────────────────────┐│
│  │   Security Layer: Helmet · CORS · Rate Limiting · JWT    ││
│  └──────────────────────────────────────────────────────────┘│
│  ┌──────────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │  14 Route Files   │  │ 14 Controllers│ │  3 Services     │ │
│  │  (Express Router) │→ │ (Logic)       │→│ predictionEngine│ │
│  │                   │  │               │ │ strategyEngine  │ │
│  │                   │  │               │ │ sportsDbService │ │
│  └──────────────────┘  └───────┬───────┘ └─────────────────┘ │
│                                │                              │
│  ┌─────────────────────────────┴────────────────────────────┐│
│  │                14 Mongoose Models                         ││
│  │  User · Fighter · Event · FightStats · Prediction · Gym  ││
│  │  Product · Order · ChatLog · RoadmapProgress · FormSession││
│  │  CoachRoster · Strategy · FighterTraining                 ││
│  └──────────────────────────┬───────────────────────────────┘│
└─────────────────────────────┼────────────────────────────────┘
                              │
┌─────────────────────────────┼────────────────────────────────┐
│                     MongoDB 7 (Docker)                        │
│                  octagon-oracle database                       │
│           4,447 fighters · 8,456 fights · 754 events          │
└──────────────────────────────────────────────────────────────┘

External APIs:
  ├── Groq API (Llama 3.3 70B) — Chatbot & Strategy LLM
  ├── TheSportsDB — UFC event sync (24-hour refresh)
  └── Google Maps API — Gym finder map markers
```

---

## 3. Technology Stack

### Backend

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Runtime | Node.js | 20+ | Server runtime |
| Framework | Express.js | 4.x | HTTP API server |
| Language | TypeScript | 5.x | Type-safe development |
| Database | MongoDB | 7.x | Document storage |
| ODM | Mongoose | 8.x | Schema modeling, query builder |
| Auth | JWT (jsonwebtoken) | — | Token-based authentication |
| Password | bcryptjs | — | Salted hashing (12 rounds) |
| Security | helmet, express-rate-limit | — | HTTP headers, brute-force prevention |
| Logging | morgan | — | HTTP request logging |
| ML Inference | Custom TypeScript (no library) | — | Logistic regression + GBT ensemble |
| LLM | Groq API (native fetch) | — | Llama 3.3 70B Versatile |
| Event Sync | TheSportsDB API | — | UFC event data |

### Frontend

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Framework | Next.js | 16.0.3 | React meta-framework (App Router) |
| UI Library | React | 19.2.0 | Component-based UI |
| Language | TypeScript | 5.x | Type-safe development |
| Styling | Tailwind CSS | 4.x | Utility-first CSS |
| Animation | Framer Motion | 12.x | Declarative animations |
| Animation | GSAP | 3.13 | Advanced scroll/timeline animations |
| 3D Graphics | Three.js / React Three Fiber | 0.181 / 9.4 | Landing page 3D scene |
| Charts | Recharts | 3.4 | Data visualization (radar charts, bar charts) |
| Icons | Lucide React | 0.554 | SVG icon system |
| Pose Detection | @mediapipe/tasks-vision | 0.10.32 | Client-side body landmark detection |
| Maps | @react-google-maps/api | 2.20.7 | Google Maps rendering |

### Infrastructure

| Tool | Purpose |
|---|---|
| Docker + Docker Compose | Container orchestration (MongoDB + Backend + Frontend) |
| MongoDB Volume | Persistent data storage |
| Health Checks | Automated container readiness verification |

---

## 4. Data Architecture

### Source Datasets (Phase 1 & 2 CSVs)

| Dataset | Records | Schema |
|---|---|---|
| `octagon_oracle_fighters_phase1.csv` | **4,447** fighters | url, name, nickname, wins, losses, draws, height, weight, reach, stance, dob, slpm, striking_accuracy, sapm, striking_defense, takedown_avg, takedown_accuracy, takedown_defense, submission_avg |
| `octagon_oracle_phase2_final_events.csv` | **754** events | url, event_name, date, location, event_id |
| `octagon_oracle_phase2_final_fights.csv` | **8,456** fights | event_id, fight_number, fight_url, fighter1_name, fighter2_name, weight_class, method, round, time_seconds, time_format, fight_id |
| `octagon_oracle_phase2_final_fight_stats.csv` | **16,908** per-fight stat records | fight_id, fighter_name, fighter_position, knockdowns, sig_strikes (X of Y), sig_strikes_pct, total_strikes, takedowns, takedown_pct, submission_attempts, reversals, control_time, sig_strikes_head/body/leg, sig_strikes_distance/clinch/ground |

### MongoDB Collections (Runtime)

| Collection | Purpose | Key Indexes |
|---|---|---|
| `users` | User accounts, profiles, cached stats | email (unique) |
| `fighters` | 4,447 UFC fighter profiles with career stats | name (text index) |
| `events` | 754 UFC events with dates and locations | event_id, date |
| `fightstats` | 16,908 per-fight detailed statistics | fight_id, fighter_name |
| `predictions` | User prediction history | userId, createdAt |
| `roadmapprogresses` | Training roadmap progress per user | userId, roadmapId |
| `formsessions` | Pose analysis results | userId, createdAt |
| `gyms` | 12 MMA gyms (Pakistan) with geo coordinates | city, geo (lat/lng) |
| `products` | Gear store product catalog | category, featured |
| `orders` | Purchase order records | userId, createdAt |
| `chatlogs` | Chatbot conversation sessions | userId, sessionId |
| `coachrosters` | Coach-fighter relationships | coachId, fighterId |
| `strategies` | Generated fight strategy reports | userId, fighter1Id |
| `fightertrainings` | Training assignments for fighters | coachId, fighterId |

### Data Import Pipeline

```
CSV Files ──▶ trainModel.ts ──▶ Parse + Feature Engineering ──▶ model-weights.json
                                      │
CSV Files ──▶ importData.ts ──▶ MongoDB Collections (fighters, events, fightstats)
```

---

## 5. Module 1 — Account Management & Authentication

### Purpose
Secure multi-role user system with extended profiles, persistent preferences, and activity tracking.

### Implementation

**User Model (`User.ts`)**
- 4 roles: `fighter`, `beginner`, `coach`, `fan`
- Profile fields: `experienceLevel`, `trainingGoal`, `discipline`, `weight`, `height`, `ageGroup` (under-15, 15-25, 25+), `location`, `preferences`
- Tracked stats: `predictionsMade`, `trainingSessions`, `accuracyRate`, `daysActive`
- Password security: bcrypt with 12-round salt, auto-hash on save via Mongoose pre-save hook
- Password reset: crypto-generated token with expiry (stored hashed)
- Password field excluded from queries by default (`select: false`)

**Authentication Flow**
```
Register → bcrypt hash → MongoDB save → JWT sign (7d expiry) → return token + user
Login    → find by email → bcrypt compare → JWT sign → return token + user
Refresh  → verify JWT → lookup user → return updated profile
```

**JWT Middleware (`auth.ts`)**
- Extracts Bearer token from Authorization header
- Verifies with `jwt.verify()` and attaches `req.user`
- `optionalAuth` variant — doesn't fail if no token present (used for chatbot)

**API Endpoints**
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Create account with role selection |
| POST | `/api/auth/login` | No | Email + password login |
| GET | `/api/auth/me` | Yes | Get current user profile |
| PUT | `/api/auth/profile` | Yes | Update profile fields |
| PUT | `/api/auth/change-password` | Yes | Change password |
| POST | `/api/auth/forgot-password` | No | Request password reset |
| POST | `/api/auth/reset-password/:token` | No | Reset with token |

**Rate Limiting**
- General API: 300 requests / 15 minutes
- Auth endpoints: 20 requests / 15 minutes (brute-force protection)

**Frontend Auth Context (`AuthContext.tsx`)**
- React Context + Provider pattern with `useAuth()` hook
- Persists token and user in `localStorage` (`octagon_token`, `octagon_user`)
- On mount: validates stored token by calling `/auth/me`, clears if expired
- Exposes: `login()`, `register()`, `logout()`, `refreshUser()`, `isAuthenticated`, `isLoading`

---

## 6. Module 2 — Win & Technique Prediction (ML Engine)

### Purpose
Real-time machine learning fight outcome prediction using an ensemble of logistic regression and gradient-boosted decision trees.

### Model Architecture

**Training Pipeline (`trainModel.ts` — 730 lines)**

```
Phase 1: Data Loading
  └─ Parse fighters.csv (4,447 records) + fightstats.csv (16,908 records)
  └─ Group by fight_id (2 fighters per fight)

Phase 2: Winner Determination
  └─ Score = knockdowns × 3 + sig_strikes × 0.1 + takedowns × 1.5
           + control_time × 0.01 + submissions × 1
  └─ Higher score = winner (label 1 for fighter1, 0 for fighter2)

Phase 3: Feature Engineering (27 features per matchup)
  ├─ Basic differentials (11): slpm, str_accuracy, sapm, str_defense,
  │   td_avg, td_accuracy, td_defense, sub_avg, wins, losses, reach
  ├─ Derived rates (4): win_rate, total_fights, log_experience, draws
  ├─ Efficiency metrics (6): effective_striking, net_striking, damage_ratio,
  │   effective_takedown, ground_control, defense_composite
  ├─ Matchup-specific (2): expected_strikes_landed, expected_td_landed
  ├─ Interaction terms (2): striking × accuracy, takedown × accuracy
  └─ Style indicators (2): striker_vs_grappler, offensive_output

Phase 4: 5-Fold Cross-Validation
  └─ Evaluates LR and GBT independently
  └─ Optimizes ensemble weight (best LR/GBT blend)

Phase 5: Model Training
  ├─ Logistic Regression: L2-regularized, 2500 epochs, gradient descent,
  │   feature normalization (z-score)
  └─ Gradient Boosted Trees: 200 trees, max depth 4, lr=0.06,
      row/feature subsampling, Newton leaf computation

Phase 6: Output → model-weights.json
  └─ LR weights/bias/normalization stats
  └─ GBT tree structures (serialized)
  └─ Ensemble weights, feature importance, method/round probabilities
```

**Inference Engine (`predictionEngine.ts`)**

Key algorithms implemented from scratch in TypeScript (no external ML libraries):
- **Sigmoid function** with numerical clamping (`-500 to +500`)
- **Z-score normalization** using stored means/stds from training
- **Logistic regression prediction**: `sigmoid(bias + Σ(weight × normalized_feature))`
- **Decision tree traversal**: recursive left/right branching on feature thresholds
- **GBT prediction**: `sigmoid(initPred + lr × Σ tree_predictions)`
- **Ensemble blending**: `LR_weight × LR_prob + GBT_weight × GBT_prob`
- **Method prediction**: Base rates (KO/TKO, Submission, Decision) adjusted by fighter matchup — striker advantage boosts KO probability, grappler advantage boosts submission probability, close fights boost decision probability
- **Round prediction**: Based on winner's finish power (`slpm + submissionAvg × 2`) and win probability
- **Top factors**: Ranked by `feature_importance × |differential|`, labeled with human-readable descriptions

**Prediction Output Interface**
```typescript
interface PredictionResult {
  winner: string;
  loser: string;
  winnerProbability: number;     // 0.0 – 1.0
  loserProbability: number;
  predictedMethod: string;       // "KO/TKO" | "Submission" | "Decision"
  methodProbabilities: { method: string; probability: number }[];
  predictedRound: number;        // 1, 2, or 3
  confidence: number;            // 0 – 100
  topFactors: { factor: string; description: string; impact: string }[];
}
```

**Model Performance**
- Training samples: 8,424 fights
- Cross-validation accuracy: **70.7%**
- Top features by importance: takedown_avg, slpm, takedown_defense, wins

**Backward Compatibility**
- Engine supports both v1 (simple LR with 11 features) and v2 (ensemble with 27 features) model formats
- Auto-detects version from `model-weights.json` and uses appropriate feature builder

---

## 7. Module 3 — Fighter Comparison & Strategy Suggestion

### Purpose
Side-by-side fighter comparison with radar chart visualization and AI-generated counter-strategy suggestions.

### Implementation

**Comparison Engine (Frontend — `comparison/page.tsx`)**
- Fighter search via `/api/fighters/search` with debounced input
- Displays stat comparison: radar chart (Recharts) across 6 axes (Striking, Accuracy, Defense, Takedowns, Submissions, Experience)
- `generateStrategySuggestions()` analyzes 6 dimensions:

| Dimension | Logic |
|---|---|
| Striking Accuracy Edge | Compares `strikingAccuracy` — recommends precision striking or volume pressure |
| Takedown Threat | Compares `takedownAvg × takedownAccuracy` — recommends wrestling or sprawl defense |
| Defensive Edge | Compares `strikingDefense` — recommends feint setups or targeting openings |
| Volume (SLPM) | Compares output — recommends matching pace or counter-striking |
| Submission Danger | Compares `submissionAvg` — recommends ground defense or risk pressing |
| Takedown Defense | Compares `takedownDefense` — recommends cage wrestling or maintaining distance |

**Strategy Engine (Backend — `strategyEngine.ts` — Full Fight Plan)**

This is the advanced fight planning system with 8 detailed sections:

| Section | Method | Description |
|---|---|---|
| A. Prediction | ML Engine | Win probability, method, round, confidence |
| B. Strengths/Weaknesses | Algorithm | 8-category matrix (Striking Output/Accuracy/Defense, TD Offense/Defense, Submission, Durability, Experience) rated HIGH/MEDIUM/LOW |
| C. Round Strategy | **LLM (Groq)** | Per-round approach (aggressive/patient/defensive), specific tactics, risk level |
| D. Range Analysis | Algorithm | Distance/Clinch/Ground scoring based on strike distribution + takedown data |
| E. Strike Targeting | Algorithm | Head/Body/Legs prioritization based on opponent's zone-specific defense |
| F. Takedown Plan | Algorithm | Shoot/Stuff/Neutral verdict with specific tactical guidance |
| G. Danger Zones | Algorithm | Opponent threats ranked by severity (Heavy Hands, Sniper Accuracy, Elite Wrestler, etc.) |
| H. Corner Advice | **LLM (Groq)** | Round-by-round corner coaching instructions in the style of a real cornerman |

**LLM Integration for Strategy**
- System prompt positions the LLM as an "elite MMA corner coach"
- Provides all computed data (prediction, strengths, range, targeting, dangers) as context
- Requests JSON-structured output for round strategy + corner advice
- Falls back to algorithmic generation when Groq API is unavailable
- Temperature: 0.6; max_tokens: 1024

---

## 8. Module 4 — Beginner Training Roadmaps

### Purpose
Structured, age-appropriate martial arts training programs with server-side progress tracking and week-based progression locking.

### Implementation

**Roadmap Structure**
- **3 Disciplines**: BJJ, Wrestling, MMA
- **3 Age Groups**: under-15, 15-25, 25+
- **9 Total Roadmaps** (discipline × age group)
- Each roadmap has **4 weeks**, each week has **4 tasks**
- Tasks include: title, description, video links, safety routines

**Week-Locking System (`roadmapController.ts`)**
```
Week 1: Always unlocked
Week 2: Unlocks only when ALL 4 tasks in Week 1 are completed
Week 3: Unlocks only when ALL 4 tasks in Week 2 are completed
Week 4: Unlocks only when ALL 4 tasks in Week 3 are completed
```

- Task IDs follow pattern: `{discipline}-{ageGroup}-w{week}-{task}` (e.g., `bjj-u15-w1-1`)
- Server-side validation: `validateUnlockedWeeks()` recomputes valid unlocked weeks from scratch, ignoring client claims
- Progress includes: `completedTasks[]`, `currentWeek`, `unlockedWeeks[]`, per-week progress percentage

**Data Model (`RoadmapProgress.ts`)**
```typescript
{
  userId: ObjectId,
  roadmapId: string,        // e.g., "bjj-under-15"
  completedTasks: string[],  // e.g., ["bjj-u15-w1-1", "bjj-u15-w1-2"]
  currentWeek: number,
  unlockedWeeks: number[],
  updatedAt: Date
}
```

**API Endpoints**
| Method | Path | Description |
|---|---|---|
| GET | `/api/roadmaps` | List all 9 roadmaps (filterable by age group) |
| GET | `/api/roadmaps/progress` | Get user's progress across all roadmaps |
| POST | `/api/roadmaps/progress` | Save progress with server-side week-lock validation |
| GET | `/api/roadmaps/progress/:id/can-unlock/:week` | Check if a specific week is unlockable |
| POST | `/api/roadmaps/progress/validate` | Validate if a single task toggle is allowed |

---

## 9. Module 5 — Gym Finder & Self-Defense Guide

### Purpose
Geolocation-based MMA gym discovery with database-backed listings and a comprehensive self-defense guide including women's safety resources.

### Gym Finder Implementation

**Gym Model (`Gym.ts`)**
```typescript
{
  name: string,
  city: string,
  area: string,
  address: string,
  disciplines: string[],    // ["MMA", "BJJ", "Boxing", ...]
  priceRange: string,        // "Budget" | "Mid-Range" | "Premium"
  monthlyFee: { min: number, max: number },
  rating: number,            // 1-5
  reviews: number,
  features: string[],        // ["Showers", "Parking", "Women's Classes", ...]
  phone: string,
  geo: { lat: number, lng: number },
  description: string
}
```

**Geospatial Search — Haversine Formula**
1. User clicks "Use My Location" → browser `navigator.geolocation.getCurrentPosition()`
2. Frontend sends `GET /api/gyms/nearby?lat=X&lng=Y&radius=Z`
3. Backend performs bounding-box pre-filter:
   ```
   latMin = lat - (radius / 111.32)
   latMax = lat + (radius / 111.32)
   lngMin = lng - (radius / (111.32 × cos(lat)))
   lngMax = lng + (radius / (111.32 × cos(lat)))
   ```
4. Exact distance computed with Haversine: `2 × R × arcsin(√(sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlng/2)))`
5. Results filtered by radius, sorted by ascending distance

**Filtering**
- City, discipline, price range (query params)
- Full-text search across name, area, city, description (escaped regex — ReDoS-safe)
- Sort by: rating (default), reviews, name

**Seed Data**: 12 gyms across Karachi, Lahore, Islamabad, Rawalpindi, and Faisalabad with full coordinates.

### Self-Defense Guide Implementation

**Women's Safety Section**
- Situational Awareness tips
- 5 Key Techniques: palm strike, knee strike, wrist escape, elbow strikes, bear hug escape
- Prevention Strategies
- Emergency Resources for Pakistan:
  - Police: 15
  - Women's Helpline: 1099
  - Edhi Foundation: 115
  - Punjab Women Helpline: 1043
  - Madadgar: 0800-22444

---

## 10. Module 6 — Form Correction (Pose Detection)

### Purpose
Client-side real-time pose detection and form analysis for martial arts techniques using Google's MediaPipe, with video never leaving the user's browser.

### Architecture Decision
**Client-side processing (MediaPipe WASM+GPU)** was chosen over server-side for **privacy** — the user's video is never uploaded to any server.

### Pose Detection Pipeline (`poseAnalysis.ts` — 790 lines)

```
Step 1: Initialize MediaPipe Pose Landmarker
  └─ Load pose_landmarker_lite model from Google CDN
  └─ GPU delegate for hardware acceleration
  └─ VIDEO running mode, 33 body landmarks per frame

Step 2: Video Frame Sampling
  └─ Sample every 0.5 seconds (2 FPS) for efficiency
  └─ Seek to timestamp → capture frame → detect pose

Step 3: Joint Angle Calculation
  └─ Calculate 10 angles per frame:
     leftElbow, rightElbow, leftShoulder, rightShoulder,
     leftHip, rightHip, leftKnee, rightKnee,
     hipRotation (shoulder-to-hip alignment), headPosition
  └─ Formula: angle = atan2(C.y - B.y, C.x - B.x) - atan2(A.y - B.y, A.x - B.x)

Step 4: Technique Template Matching
  └─ 4 technique templates with ideal angle ranges:
     ┌─────────────┬──────────────────────────────────────────┐
     │ Technique    │ Key Angles & Ideal Ranges                │
     ├─────────────┼──────────────────────────────────────────┤
     │ Jab-Cross   │ Lead elbow: 150-180°, Rear shoulder:     │
     │             │ 80-120°, Hip rotation: 25-55°            │
     │ Hook        │ Lead elbow: 80-110°, Hip: 35-65°         │
     │ Kick        │ Lead knee: 140-180°, Hip: 40-70°         │
     │ Defense     │ Lead elbow: 70-100°, Shoulder: 60-90°    │
     └─────────────┴──────────────────────────────────────────┘

Step 5: Scoring (0–100 per angle)
  └─ 100 points if within ideal range
  └─ Linear penalty: ~2.5 points per degree of deviation
  └─ Weighted by body part importance per technique
  └─ Orthodox/Southpaw stance auto-detection

Step 6: Category Grouping
  └─ Stance & Balance (knees, hips, head position)
  └─ Hip Rotation (hip angles)
  └─ Guard Position (elbows, shoulders)
  └─ Extension & Reach (primary technique joints)

Step 7: Body Part Feedback
  └─ 8 body parts: Head, Shoulders, Lead/Rear Arm, Core,
     Hips, Lead/Rear Leg
  └─ Status: "correct" (≥80), "needs-work" (≥60), "incorrect" (<60)

Step 8: Key Moments Detection
  └─ Detects score swings >10 points between frames
  └─ Identifies angle breakthroughs (entering/leaving ideal range)
```

**Output**
```typescript
interface AnalysisResult {
  overallScore: number;        // 0-100
  verdict: string;             // "Excellent" | "Good" | "Needs Improvement" | "Poor"
  breakdown: {                 // Per-category scores with tips
    stance: { score, tips[] },
    hipRotation: { score, tips[] },
    guard: { score, tips[] },
    extension: { score, tips[] }
  };
  bodyParts: {                 // Per-body-part assessment
    part: string, status: string, detail: string
  }[];
  keyMoments: {                // Significant form changes
    timestamp: number, description: string, score: number
  }[];
}
```

**Canvas Overlay**: `drawPoseOnCanvas()` draws the detected skeleton on a canvas element for visual feedback during analysis.

**Python Calibration Script (`form_correction_calibrate.py`)**
- Uses OpenCV + MediaPipe to process reference technique videos
- Extracts 9 joint angles per frame across the video
- Generates JSON templates with `mean ± margin` ranges
- CLI: `python form_correction_calibrate.py --video ref.mp4 --technique jab-cross`

---

## 11. Module 7 — Gear Store (E-Commerce)

### Purpose
Full e-commerce gear store with product catalog, cart management, atomic checkout with stock management, and order history.

### Implementation

**Product Model (`Product.ts`)**
```typescript
{
  name: string,
  category: string,       // "Gloves" | "Pads" | "Protection" | "Apparel" | "Equipment" | "Accessories"
  price: number,
  originalPrice?: number, // For showing discounts
  images: string[],
  stock: number,
  description: string,
  rating: number,
  reviews: number,
  featured: boolean,
  brand: string
}
```

**Order Model (`Order.ts`)**
```typescript
{
  userId: ObjectId,
  items: [{ productId, name, price, quantity }],
  total: number,
  shippingAddress: string,
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled",
  createdAt: Date
}
```

**Atomic Checkout Flow**
```
1. Validate cart items (non-empty, valid products)
2. For each item:
   a. findOneAndUpdate with { stock: { $gte: quantity } }
   b. Decrement stock atomically: { $inc: { stock: -quantity } }
   c. If stock insufficient → rollback all previous decrements → 400 error
3. Calculate total from verified prices (server-side, not client)
4. Create Order document
5. Return order confirmation
```

**API Endpoints**
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/gear` | No | Catalog with category/search/featured filter, sort, pagination (max 50/page) |
| GET | `/api/gear/:id` | No | Single product detail |
| POST | `/api/gear/checkout` | Yes | Atomic checkout with stock management |
| GET | `/api/gear/orders` | Yes | User's order history |
| POST | `/api/gear/seed` | No | Seed 12 products |

**Frontend**
- Product listing page with category filter, search bar, grid layout
- Cart page with quantity management (localStorage)
- Checkout flow creating backend orders

---

## 12. Module 8 — Chatbot (LLM-Powered NLP Assistant)

### Purpose
Platform-wide AI assistant that uses a Large Language Model (Groq/Llama 3.3 70B) combined with real-time MongoDB data retrieval to answer MMA questions, guide users to features, and provide contextual recommendations.

### Architecture

```
User Message
    │
    ▼
┌─────────────────────┐
│   GUARDRAILS         │ ← Pre-LLM content filtering
│   (regex + keyword)  │    blockedPatterns: violence, weapons, hacking, drugs
│                     │    inappropriateTopics: gambling, steroids, doping
└──────────┬──────────┘
           │ (if safe)
           ▼
┌─────────────────────┐     ┌────────────────────────┐
│  RETRIEVAL SYSTEM    │────▶│  MongoDB Queries        │
│  gatherContext()     │     │  retrieveFighterInfo()  │
│  (runs in parallel)  │     │  retrieveGymInfo()      │
│                     │     │  retrieveProductInfo()  │
└──────────┬──────────┘     └────────────────────────┘
           │ context
           ▼
┌─────────────────────┐
│  GROQ API           │
│  Llama 3.3 70B      │
│  System prompt +    │
│  Retrieved context + │
│  Last 6 messages    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  RESPONSE + LINKS   │ → Navigational links to app pages
│  + MODEL INDICATOR  │ → "llama-3.3-70b-versatile" | "keyword" | "guardrail"
└─────────────────────┘
```

### Retrieval Functions

| Function | Trigger | Query Method |
|---|---|---|
| `retrieveFighterInfo()` | Name detected in message | Multi-word name search with stop-word filtering, word-boundary regex against Fighter collection |
| `retrieveGymInfo()` | City/gym keywords | City name matching against Gym collection, returns top 3 by rating |
| `retrieveProductInfo()` | Product/gear keywords | Category matching against Product collection, returns top 3 by rating |

All three retrieval functions run in parallel via `gatherRetrievalContext()`.

### Guardrails
- **Pre-LLM regex blocking**: Patterns for violence, weapons, hacking, illegal drugs, explicit content
- **Pre-LLM keyword filtering**: Gambling, steroids, doping, PEDs
- **System prompt rules**: LLM instructed to stay on-topic (MMA/fitness), not give medical advice, redirect inappropriate queries

### Fallback System
```
Primary: Groq LLM (Llama 3.3 70B Versatile)
    │ (if API key missing or API error)
    ▼
Fallback: 14-entry weighted knowledge base
  └─ Weighted intent detection: keywords scored by length × frequency × entry_weight
  └─ Bonus multipliers for strong matches
  └─ Template responses with page links
```

### Data Model (`ChatLog.ts`)
```typescript
{
  userId: ObjectId | null,  // null for anonymous users
  sessionId: string,
  messages: [{
    role: "user" | "assistant",
    content: string,
    timestamp: Date
  }],
  intent: string,
  model: string,    // "llama-3.3-70b-versatile" | "keyword" | "guardrail"
  resolved: boolean,
  createdAt: Date
}
```

**Frontend Component (`Chatbot.tsx`)**
- Floating red button (bottom-right) with pulse animation
- 396×600px chat window with minimize/close controls
- 8 quick action buttons (hidden after first message): "How do I improve my jab?", "Find gyms near me", "Predict a fight", etc.
- Navigational link rendering (routes to app pages)
- Markdown bold + HTML-safe rendering
- Works with or without authentication (optional auth)
- Typing indicator with animated bouncing dots
- Session persistence via `sessionId`

---

## 13. Module 9 — Dashboard & Persistent Statistics

### Purpose
Role-based dashboards displaying real-time user statistics calculated from actual platform activity, persisted in the backend.

### Stats Calculation (`statsController.ts`)

The `/api/stats` endpoint runs **8 parallel MongoDB queries**:

| Query | Source Collection | Metric |
|---|---|---|
| Prediction count | `Prediction` | `predictionsMade` |
| High-confidence count | `Prediction` (confidence > 70%) | `accuracyRate` = high / total × 100 |
| Roadmap completed tasks | `RoadmapProgress` | `trainingSessions` |
| Form session count + avg | `FormSession` | `formCheckSessions`, `formAvgScore` |
| Order count | `Order` | `ordersPlaced` |
| Chat session count | `ChatLog` | `chatSessions` |
| Recent activity feed | `Prediction` + `FormSession` | Last 10 interactions |
| Roadmap progress summary | `RoadmapProgress` | Per-discipline progress % |

**Caching**: Each call also updates the User model's stat fields (for quick profile display without recomputation).

**`daysActive`** = `ceil((now - joinDate) / 86400000)`

### Dashboard Views

| Role | Dashboard Features |
|---|---|
| **Fan** | Predictions made, accuracy rate, days active, recent activity feed |
| **Coach** | Roster management, fighter training assignments, team stats, strategy history |
| **Fighter** | Training progress, form check scores, prediction history |
| **Beginner** | Roadmap progress, training sessions, recommended next steps |

---

## 14. Module 10 — Strategy Engine (Advanced Fight Planning)

### Purpose
Comprehensive fight strategy generator combining ML predictions, algorithmic analysis, and LLM-powered tactical advice into an 8-section fight plan.

### See [Module 3 — Strategy Engine section](#7-module-3--fighter-comparison--strategy-suggestion) for full details.

### Output Interface
```typescript
interface FullStrategy {
  prediction: PredictionResult & { confidence: number };
  strengthsWeaknesses: {
    fighter1: StrategyRating[];  // 8 categories, each HIGH/MEDIUM/LOW
    fighter2: StrategyRating[];
  };
  roundStrategy: RoundStrategy[];     // 3 rounds, each with approach + tactics
  rangeAnalysis: {
    distance: RangeData;
    clinch: RangeData;
    ground: RangeData;
    bestRange: string;
  };
  strikeTargeting: {
    head: StrikeZone;
    body: StrikeZone;
    legs: StrikeZone;
    primaryTarget: string;
  };
  takedownPlan: {
    verdict: 'shoot' | 'stuff' | 'neutral';
    details: string;
  };
  dangerZones: DangerZone[];          // Opponent threats by severity
  cornerAdvice: CornerRound[];        // Between-rounds coaching
}
```

---

## 15. Frontend Design System

### Visual Language

| Element | Specification |
|---|---|
| Primary Font | Outfit (Google Fonts) |
| Secondary Font | Inter (Google Fonts) |
| Background | Black (`bg-black`) |
| Text | White (`text-white`) |
| Accent Colors | Red (primary action), Gold (coach role) |
| Card Style | Semi-transparent backgrounds with backdrop blur |
| Animation Library | Framer Motion (primary), GSAP (scroll-based) |
| Icon System | Lucide React (SVG) |

### Navigation System (`Navbar.tsx`)
- Floating pill-shaped navbar — fixed position, centered, 95% width, `rounded-full`, `backdrop-blur-md`
- Scroll behavior: background darkens after 50px; hides on scroll-down (>100px), reappears on scroll-up
- Role-based navigation links:
  - **Unauthenticated**: Features, How It Works (anchor links)
  - **Coach**: Dashboard, Strategy, Events, Comparison, Training, Gyms, Gear
  - **Fan/Fighter/Beginner**: Dashboard, Events, Predictions, Form Check, Comparison, Training, Gyms, Gear, Self-Defense

### Landing Page (`page.tsx` — 799 lines)
7-section marketing page with:
1. **Hero** — 3D scene (React Three Fiber), typewriter effect, animated counters, parallax scroll
2. **Features** — 6 cards with icons and descriptions
3. **How It Works** — 3-step flow
4. **Sample Analysis** — McGregor vs Khabib showcase with stat bars
5. **Top Contenders** — 4-fighter spotlight
6. **Testimonials** — 3 user reviews with star ratings
7. **CTA** — Gradient call-to-action

### Page Inventory (17 routes)

| Route | Module | Description |
|---|---|---|
| `/` | Landing | Marketing page with 3D hero |
| `/login` | Auth | Email/password login |
| `/register` | Auth | Registration with role selection |
| `/profile` | Auth | Edit profile fields |
| `/dashboard` | Dashboard | Role routing |
| `/dashboard/fan` | Dashboard | Fan stats dashboard |
| `/dashboard/coach` | Dashboard | Coach management dashboard |
| `/prediction` | ML Prediction | Select fighters, get AI prediction |
| `/comparison` | Comparison | Side-by-side fighter comparison + strategy |
| `/strategy` | Strategy | Full fight plan generator |
| `/training` | Roadmaps | Age-based training paths with progress |
| `/gyms` | Gym Finder | Search/locate gyms + map |
| `/self-defense` | Self-Defense | Guide with women's safety |
| `/form-check` | Form Correction | Video upload + pose analysis |
| `/gear` | Gear Store | Product catalog |
| `/gear/cart` | Gear Store | Shopping cart + checkout |
| `/events` | Events | UFC event listings |

### Responsive Design
- Mobile bottom padding (`pb-16 md:pb-0`) for mobile nav
- `MobileNav` component for small screens
- Hamburger menu in navbar

---

## 16. API Reference

### Complete Endpoint Map

| # | Method | Path | Auth | Module | Description |
|---|---|---|---|---|---|
| 1 | GET | `/api/health` | No | Core | Health check with timestamp |
| 2 | POST | `/api/auth/register` | No | Auth | Create account |
| 3 | POST | `/api/auth/login` | No | Auth | Login |
| 4 | GET | `/api/auth/me` | Yes | Auth | Current user profile |
| 5 | PUT | `/api/auth/profile` | Yes | Auth | Update profile |
| 6 | PUT | `/api/auth/change-password` | Yes | Auth | Change password |
| 7 | POST | `/api/auth/forgot-password` | No | Auth | Request reset |
| 8 | POST | `/api/auth/reset-password/:token` | No | Auth | Reset password |
| 9 | GET | `/api/fighters` | No | Fighters | List fighters |
| 10 | GET | `/api/fighters/search` | No | Fighters | Search by name |
| 11 | GET | `/api/fighters/compare` | No | Fighters | Compare two fighters |
| 12 | GET | `/api/fighters/:id/stats` | No | Fighters | Per-fight stats |
| 13 | GET | `/api/fighters/top` | No | Fighters | Top fighters |
| 14 | GET | `/api/events` | No | Events | List events |
| 15 | GET | `/api/events/upcoming` | No | Events | Upcoming events |
| 16 | GET | `/api/events/recent` | No | Events | Recent events |
| 17 | GET | `/api/events/search` | No | Events | Search events |
| 18 | GET | `/api/events/:id/stats` | No | Events | Event statistics |
| 19 | POST | `/api/events/sync` | No | Events | Sync from TheSportsDB |
| 20 | GET | `/api/events/:id/fight-card` | No | Events | Event fight card |
| 21 | POST | `/api/predictions` | Yes | Prediction | Run ML prediction |
| 22 | GET | `/api/predictions/history` | Yes | Prediction | User prediction history |
| 23 | GET | `/api/roadmaps` | No | Training | List roadmaps |
| 24 | GET | `/api/roadmaps/progress` | Yes | Training | Get progress |
| 25 | POST | `/api/roadmaps/progress` | Yes | Training | Save progress |
| 26 | GET | `/api/roadmaps/progress/:id/can-unlock/:week` | Yes | Training | Check week unlock |
| 27 | POST | `/api/roadmaps/progress/validate` | Yes | Training | Validate task toggle |
| 28 | GET | `/api/gyms` | No | Gyms | List/filter gyms |
| 29 | GET | `/api/gyms/nearby` | No | Gyms | Geospatial nearby search |
| 30 | POST | `/api/gyms/seed` | No | Gyms | Seed gym data |
| 31 | POST | `/api/form-check` | Yes | Form | Submit analysis |
| 32 | GET | `/api/form-check/history` | Yes | Form | Past sessions |
| 33 | GET | `/api/gear` | No | Gear | Product catalog |
| 34 | GET | `/api/gear/:id` | No | Gear | Product detail |
| 35 | POST | `/api/gear/checkout` | Yes | Gear | Place order |
| 36 | GET | `/api/gear/orders` | Yes | Gear | Order history |
| 37 | POST | `/api/gear/seed` | No | Gear | Seed products |
| 38 | POST | `/api/chat` | Optional | Chat | Send message |
| 39 | GET | `/api/chat/history` | Yes | Chat | Chat history |
| 40 | GET | `/api/stats` | Yes | Stats | Calculated user stats |
| 41 | POST | `/api/strategy` | Yes | Strategy | Generate fight plan |
| 42 | GET | `/api/strategy/history` | Yes | Strategy | Strategy history |
| 43 | GET | `/api/strategy/:id` | Yes | Strategy | Single strategy |
| 44 | DELETE | `/api/strategy/:id` | Yes | Strategy | Delete strategy |
| 45 | GET | `/api/coach/roster` | Yes | Coach | Get roster |
| 46 | POST | `/api/coach/roster` | Yes | Coach | Add fighter to roster |
| 47 | DELETE | `/api/coach/roster/:id` | Yes | Coach | Remove fighter |
| 48 | GET | `/api/coach/roster/upcoming-fights` | Yes | Coach | Upcoming fights for roster |
| 49 | GET | `/api/coach/roster/stats` | Yes | Coach | Coach team stats |
| 50 | GET | `/api/coach/fighter-training` | Yes | Coach | Training assignments |
| 51 | POST | `/api/coach/fighter-training` | Yes | Coach | Assign training |
| 52 | PUT | `/api/coach/fighter-training/:id` | Yes | Coach | Update progress |
| 53 | DELETE | `/api/coach/fighter-training/:id` | Yes | Coach | Delete assignment |

---

## 17. Deployment Architecture

### Docker Compose (3-Service Stack)

```yaml
services:
  mongodb:     # MongoDB 7 with health check (mongosh ping)
  backend:     # Express.js (port 5001) — depends on mongodb healthy
  frontend:    # Next.js (port 3001) — depends on backend healthy
```

| Service | Port | Image/Build | Health Check |
|---|---|---|---|
| MongoDB | 27017 | `mongo:7` | `mongosh --eval db.adminCommand('ping')` every 10s |
| Backend | 5001 | Custom Dockerfile | `wget http://localhost:5001/api/health` every 30s |
| Frontend | 3001 | Custom Dockerfile | — |

**Networking**: All services on `octagon-network` bridge.  
**Persistence**: `mongodb_data` Docker volume for database files.  
**Init Script**: `mongo-init.js` runs on first DB creation.

### Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `JWT_SECRET` | — | Token signing secret |
| `JWT_EXPIRES_IN` | 7d | Token expiry |
| `MONGODB_URI` | mongodb://localhost:27017/octagon-oracle | Database connection |
| `FRONTEND_URL` | http://localhost:3000 | CORS allowed origin |
| `GROQ_API_KEY` | — | Chatbot LLM API key |
| `GROQ_MODEL` | llama-3.3-70b-versatile | LLM model selection |
| `NEXT_PUBLIC_API_URL` | http://localhost:5001/api | Frontend API base URL |

---

## 18. Security Implementation

| Layer | Mechanism | Details |
|---|---|---|
| **Passwords** | bcrypt (12 rounds) | Salted hash, timing-safe comparison |
| **Sessions** | JWT | 7-day expiry, excluded from password field queries |
| **HTTP Headers** | Helmet.js | X-Frame-Options, Content-Security-Policy, HSTS, etc. |
| **Rate Limiting** | express-rate-limit | 300 req/15min general, 20 req/15min auth endpoints |
| **CORS** | Whitelist | Only allowed origins (localhost:3000, localhost:3001) |
| **Input Validation** | Mongoose schema | Required fields, min/max lengths, regex patterns |
| **Search Injection** | `escapeRegex()` | Sanitizes user input before MongoDB regex queries |
| **Password Reset** | Crypto tokens | SHA-256 hashed, time-limited (10min) |
| **Video Privacy** | Client-side only | MediaPipe runs in browser — video never uploaded |
| **Chat Safety** | Pre-LLM guardrails | Regex patterns block violent/illegal/explicit content before reaching LLM |
| **Content Moderation** | LLM system prompt | Instructs model to stay on-topic, no medical advice, redirect inappropriate |
| **Body Parsing** | 10KB limit | `express.json({ limit: '10kb' })` prevents large payload attacks |

---

## 19. Data Pipeline & ML Training

### Training Flow

```
┌──────────────────────┐     ┌──────────────────────┐
│ fighters.csv         │     │ fightstats.csv        │
│ 4,447 records        │     │ 16,908 records        │
└──────────┬───────────┘     └──────────┬───────────┘
           │                            │
           └──────────┬─────────────────┘
                      │
                      ▼
           ┌─────────────────────┐
           │  trainModel.ts       │
           │  Custom ML Pipeline  │
           │                     │
           │  1. Parse CSVs      │
           │  2. Group fights    │
           │  3. Determine winner │
           │  4. Engineer 27     │
           │     features        │
           │  5. 5-fold CV       │
           │  6. Train LR +     │
           │     200 GBT trees  │
           │  7. Find ensemble  │
           │     weights        │
           └──────────┬──────────┘
                      │
                      ▼
           ┌─────────────────────┐
           │  model-weights.json  │
           │                     │
           │  • LR weights/bias  │
           │  • GBT tree structs │
           │  • Feature stats    │
           │  • Method probs     │
           │  • Round probs      │
           │  • Feature importance│
           └─────────────────────┘
```

### Key ML Design Decisions

| Decision | Rationale |
|---|---|
| No external ML library | Full control, smaller footprint, no Python dependency at runtime |
| Feature engineering (27 features) | Differentials + efficiency + interaction terms capture matchup dynamics |
| L2 regularization (LR) | Prevents overfitting on 8,424 training samples |
| GBT subsampling | Row (80%) + feature (80%) subsampling for variance reduction |
| Ensemble (LR + GBT) | Combined linear + non-linear learners for better generalization |
| 5-fold cross-validation | Robust accuracy estimate, optimal ensemble weight selection |
| Custom seeded PRNG | Reproducible training with deterministic random splits |

---

## 20. Appendix — File Inventory

### Backend (`Octagon/backend/src/`)

| Directory | Files | Purpose |
|---|---|---|
| `config/` | `database.ts`, `index.ts` | MongoDB connection, environment config |
| `controllers/` | 14 files | Request handling + business logic |
| `middleware/` | `auth.ts`, `index.ts` | JWT verification, optional auth |
| `models/` | 15 files (14 models + barrel) | Mongoose schemas + TypeScript interfaces |
| `routes/` | 15 files (14 routes + barrel) | Express route definitions |
| `services/` | `predictionEngine.ts`, `strategyEngine.ts`, `sportsDbService.ts` | ML inference, strategy generation, external API sync |
| `scripts/` | `trainModel.ts`, `importData.ts` | Data pipeline + ML training |
| Root | `server.ts` | Express app entry point |
| `data/` | `model-weights.json` | Trained model weights (generated) |

### Frontend (`Octagon/frontend/`)

| Directory | Files | Purpose |
|---|---|---|
| `app/` | 17 page routes | Next.js App Router pages |
| `components/` | `Chatbot.tsx`, `Navbar.tsx`, `MobileNav.tsx`, `Footer.tsx`, `CountdownTimer.tsx`, + `3d/`, `auth/`, `charts/`, `ui/` | Shared UI components |
| `contexts/` | `AuthContext.tsx` | Global auth state management |
| `lib/` | `api.ts`, `poseAnalysis.ts`, `data.ts`, `utils.ts` | API client, pose detection engine, static data, utilities |
| `public/` | Static assets | Images, test videos |

### Root (`Octagon/`)

| File | Purpose |
|---|---|
| `docker-compose.yml` | 3-service container orchestration |
| `package.json` | Monorepo root package |
| `README.md` | Project documentation |
| `.env` / `.env.example` | Environment configuration |
| `scripts/mongo-init.js` | MongoDB initialization script |

### Data Files (Root)

| File | Records | Purpose |
|---|---|---|
| `octagon_oracle_fighters_phase1.csv` | 4,447 | UFC fighter profiles + career stats |
| `octagon_oracle_phase2_final_events.csv` | 754 | UFC event metadata |
| `octagon_oracle_phase2_final_fights.csv` | 8,456 | Fight records with outcomes |
| `octagon_oracle_phase2_final_fight_stats.csv` | 16,908 | Per-fight detailed statistics |

---

*End of Software Design System Report — Octagon Oracle v1.0*
