# Octagon Oracle — Phase 4 Handoff Document
## Data Science Intelligence Layer

---

## PROJECT CONTEXT (READ THIS FIRST)

**Octagon Oracle** is a full-stack MMA analytics FYP (Final Year Project).

### Stack
- **Frontend**: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4 (`@theme` in globals.css — NEVER create tailwind.config.ts), Framer Motion 12, Recharts, lucide-react
- **Backend**: Express.js + TypeScript, MongoDB (Mongoose 8), JWT auth, Groq LLM (llama-3.3-70b-versatile), port 5001
- **Frontend port**: 3000
- **DB**: `mongodb://localhost:27017/octagon-oracle`

### Critical File Locations
| Purpose | Path |
|---------|------|
| Backend controllers | `backend/src/controllers/` |
| Backend routes index | `backend/src/routes/index.ts` |
| Backend models index | `backend/src/models/index.ts` |
| Frontend pages | `frontend/app/` |
| Frontend API lib | `frontend/lib/api.ts` |
| Frontend globals CSS | `frontend/app/globals.css` |
| ML model weights | `backend/data/model-weights.json` |
| Raw fight data | `backend/data/fightstats.csv` |
| Raw fighter data | `backend/data/fighters.csv` |
| Raw events data | `backend/data/events.csv` |

### Non-Negotiable Patterns
1. **Tailwind v4**: Custom colors (`octagon-red`, `octagon-gold`) are in `globals.css @theme {}`. Never create `tailwind.config.ts`.
2. **All backend routes must be imported+mounted in** `backend/src/routes/index.ts`
3. **All new Mongoose models must be exported from** `backend/src/models/index.ts`
4. **Frontend API calls**: use `apiRequest<T>()` from `frontend/lib/api.ts`. Response shape: `{ success, data?, message? }`
5. **Auth token**: get via `getAuthToken()` from `@/contexts/AuthContext` — inside useEffect/handlers only
6. **'use client'**: all Next.js App Router pages using hooks need this at top
7. **TypeScript**: backend targets ES2022 — avoid `.findLast()`, use `.filter().pop()` instead
8. **New route pattern**: create `backend/src/routes/analytics.ts` → import in `backend/src/routes/index.ts` as `router.use('/analytics', analyticsRoutes)`

---

## COMPLETED PHASES (Do NOT re-implement)

- **Phase 1**: Coach-Fighter relationship system, assignments, messaging, activity logs
- **Phase 2**: Fight camp (milestones), weight-cut tracker, sparring journal, opponent dossier (Groq AI)
- **Phase 3.1**: Prediction page — explainable AI with animated feature importance bars
- **Phase 3.2**: Coach Analytics Dashboard — trainee weight/assignment/sparring/fight-camp grid
- **Phase 3.5**: Profile page — real prediction history with total count badge + method/round display

---

## MODEL-WEIGHTS.JSON STRUCTURE (CRITICAL FOR PHASE 4)

File: `backend/data/model-weights.json`

```
Top-level keys: version, featureNames, logisticRegression, gbt, ensembleWeights,
                featureImportance, methodProbs, roundProbs, trainingStats
```

**featureImportance** (27 entries, already computed, use directly for 4.1):
```json
[
  { "name": "win_rate_diff",    "importance": 0.0811, "lrWeight": 0.3394 },
  { "name": "expected_td_diff", "importance": 0.0649, "lrWeight": 0.3445 },
  { "name": "net_striking_diff","importance": 0.0550, "lrWeight": 0.1516 },
  ...27 total
]
```
`importance` = GBT Gini importance (use for ranking). `lrWeight` = LR coefficient.

**trainingStats**:
```json
{
  "samples": 8424,
  "cvAccuracy": 0.7172,
  "cvPrecision": 0.7393,
  "cvRecall": 0.8189,
  "cvF1": 0.7770,
  "trainAccuracy": 0.7594,
  "lrCvAccuracy": 0.7127,
  "gbtCvAccuracy": 0.7150,
  "trainedAt": "2026-03-06T06:31:28.938Z"
}
```

**ensembleWeights**: `{ "lr": 0.45, "gbt": 0.55 }`

**27 Feature Names** (all are `_diff` = fighter1 minus fighter2):
`slpm_diff, str_acc_diff, sapm_diff, str_def_diff, td_avg_diff, td_acc_diff, td_def_diff,
sub_avg_diff, wins_diff, losses_diff, reach_diff, win_rate_diff, total_fights_diff,
log_exp_diff, draws_diff, eff_striking_diff, net_striking_diff, damage_ratio_diff,
eff_takedown_diff, ground_control_diff, defense_composite_diff, expected_strikes_diff,
expected_td_diff, striking_interaction, td_interaction, style_matchup, offensive_output_diff`

---

## RAW CSV STRUCTURE

### fighters.csv (8,424 rows)
Columns: `url, name, nickname, wins, losses, draws, height, weight, reach, stance, dob, slpm, striking_accuracy, sapm, striking_defense, takedown_avg, takedown_accuracy, takedown_defense, submission_avg, scraped_date`

`weight` examples: `"135 lbs."`, `"265 lbs."` → map to weight class:
- 115 → Strawweight, 125 → Flyweight, 135 → Bantamweight, 145 → Featherweight
- 155 → Lightweight, 170 → Welterweight, 185 → Middleweight, 205 → Light Heavyweight, 265 → Heavyweight

### fightstats.csv
Columns: `fight_id, fighter_name, fighter_position, knockdowns, sig_strikes, sig_strikes_pct, total_strikes, takedowns, takedown_pct, submission_attempts, reversals, control_time, sig_strikes_head, sig_strikes_body, sig_strikes_leg, sig_strikes_distance, sig_strikes_clinch, sig_strikes_ground`

Two rows per fight (position 1 and 2). Position does NOT indicate winner (verify: UFC 322, position 1 = Della Maddalena, position 2 = Makhachev — Makhachev won). **No explicit winner column.**

### events.csv
Columns: `url, event_name, date, location, event_id`
No fight outcomes.

---

## PHASE 4 IMPLEMENTATION PLAN

### Overview
Build a new `/analytics` page that showcases the ML model as a credible academic artifact.
All data is served from **one backend endpoint** (`GET /api/analytics/summary`) that reads
pre-computed data from `backend/data/analytics-cache.json` (generated once by a script).

---

## STEP 0 — Pre-computation Script (Run ONCE, commit the output)

**File**: `backend/scripts/computeAnalytics.ts`

Run with: `npx ts-node backend/scripts/computeAnalytics.ts`
Outputs: `backend/data/analytics-cache.json`

### What the script computes:

#### A) Per Weight Class Accuracy (for 4.2)
Strategy: For each weight class, take ALL fighters from `fighters.csv`. Build fighter pairs (sample up to 200 pairs per class to keep runtime fast). For each pair, determine "ground truth winner" using career win rate proxy: `wins / (wins + losses)`. Run the prediction engine on that pair. Record whether prediction agrees with proxy. Compute accuracy per class.

This is defensible academically: "We evaluated model agreement with career win-rate as a proxy oracle on held-out fighter pairs per weight class."

Weight classes to include (from fighters.csv weight field):
Strawweight (115), Flyweight (125), Bantamweight (135), Featherweight (145),
Lightweight (155), Welterweight (170), Middleweight (185),
Light Heavyweight (205), Heavyweight (265)

```typescript
// Pseudo-code for the script
import fs from 'fs';
import Papa from 'papaparse'; // npm install papaparse @types/papaparse
import path from 'path';

// Import the prediction engine's core prediction function
// (you'll need to extract predictFromStats() from predictionEngine.ts or replicate the maths)

const weightClassMap: Record<number, string> = {
  115: 'Strawweight', 125: 'Flyweight', 135: 'Bantamweight',
  145: 'Featherweight', 155: 'Lightweight', 170: 'Welterweight',
  185: 'Middleweight', 205: 'Light Heavyweight', 265: 'Heavyweight'
};

// 1. Read fighters.csv
// 2. Parse weight: parseInt('135 lbs.') → 135 → weightClass
// 3. Group fighters by weightClass
// 4. For each weight class: sample pairs, run model, compare to win_rate proxy
// 5. Compute accuracy per class
```

#### B) Calibration Curve (for 4.3)

Strategy: Take 1000 random fighter pairs across the entire dataset. For each pair, get model's predicted probability (0–1). Bucket into 10 bins (0–0.1, 0.1–0.2, etc.). For each bin, compute fraction of cases where the model's predicted winner had a higher career win-rate than opponent. This gives "fraction correct per confidence bin" — i.e., the calibration curve.

Output shape:
```json
[
  { "bin": "50-60%", "midpoint": 0.55, "actual_win_rate": 0.52, "count": 87 },
  { "bin": "60-70%", "midpoint": 0.65, "actual_win_rate": 0.63, "count": 143 },
  ...
]
```

#### C) Fighter Stat Distributions (for 4.4)
Compute histograms directly from `fighters.csv` for these 5 stats:
`slpm, striking_accuracy, sapm, striking_defense, takedown_avg`

For each stat:
- Filter out nulls/zeros
- Use 20 equal-width bins between min and max
- Count fighters per bin
- Output: `{ stat, bins: [{min, max, count}], mean, median, p25, p75 }`

#### D) Style Matchup Matrix (for 4.5)
Classify each fighter as: `Striker | Grappler | Well-Rounded`

Classification rules (tune to get roughly 1/3 each):
- **Striker**: `slpm > 4.0 AND takedown_avg < 1.5`
- **Grappler**: `takedown_avg > 2.5 OR submission_avg > 0.5`
- **Well-Rounded**: everyone else

Then: for each style pairing (Striker-vs-Striker, Striker-vs-Grappler, etc.), compute
win rate by running model on sampled pairs (100 per matchup type) and using
the model's own prediction as "winner" (no ground truth needed — shows model's learned bias).

Output: 3×3 matrix with win rates:
```json
{
  "Striker": { "Striker": 0.50, "Grappler": 0.42, "Well-Rounded": 0.48 },
  "Grappler": { "Striker": 0.58, "Grappler": 0.50, "Well-Rounded": 0.53 },
  "Well-Rounded": { "Striker": 0.52, "Grappler": 0.47, "Well-Rounded": 0.50 }
}
```

---

## 4.1 — Global Feature Importance

**Backend**: `GET /api/analytics/summary` returns all analytics including feature importance.
- Read `model-weights.json.featureImportance` → sort by `importance` descending
- Clean up feature names for display (replace `_diff` → `Difference`, `_` → ` `, title case)

Feature name display map (important — evaluators will read these):
```
win_rate_diff         → Win Rate Difference
expected_td_diff      → Expected Takedown Diff
net_striking_diff     → Net Striking Difference
reach_diff            → Reach Advantage
log_exp_diff          → Experience (log)
defense_composite_diff → Defense Composite
wins_diff             → Wins Difference
td_avg_diff           → Takedown Average Diff
slpm_diff             → Strikes Landed/Min Diff
str_acc_diff          → Striking Accuracy Diff
sapm_diff             → Strikes Absorbed/Min Diff
str_def_diff          → Striking Defense Diff
td_acc_diff           → Takedown Accuracy Diff
td_def_diff           → Takedown Defense Diff
sub_avg_diff          → Submission Avg Diff
losses_diff           → Losses Difference
total_fights_diff     → Total Fights Diff
draws_diff            → Draws Difference
eff_striking_diff     → Effective Striking Diff
damage_ratio_diff     → Damage Ratio Diff
eff_takedown_diff     → Effective Takedown Diff
ground_control_diff   → Ground Control Diff
expected_strikes_diff → Expected Strikes Diff
striking_interaction  → Striking Interaction
td_interaction        → Takedown Interaction
style_matchup         → Style Matchup
offensive_output_diff → Offensive Output Diff
```

**Frontend**: Horizontal Recharts BarChart, sorted largest→smallest, amber fill, academic framing card header.

---

## 4.2 — Per Weight Class Accuracy

**Source**: `analytics-cache.json` → `weightClassAccuracy`

**Backend**: Part of `/api/analytics/summary` response.

**Frontend**: Vertical Recharts BarChart.
- Bar color: green if > overall cvAccuracy (0.717), amber if 0.65–0.717, red if < 0.65
- Add a horizontal ReferenceLine at 0.717 labeled "Overall CV Accuracy"
- X-axis: weight class names (abbreviated: "HW", "LHW", "MW", "WW", "LW", "FW", "BW", "FLW", "SW")

---

## 4.3 — Prediction Calibration Curve

**Source**: `analytics-cache.json` → `calibration`

**Frontend**: Recharts LineChart with TWO lines:
- Line 1: Actual win rate per bin (the model's calibration)
- Line 2: Perfect calibration diagonal (x=y line) — use a `ReferenceLine` or second data series
- X-axis: predicted probability bins (50%, 60%, 70%, 80%, 90%)
- Y-axis: actual fraction correct (0–1)
- Include `count` in tooltip: "N=143 predictions in this bin"
- Add academic note: "A perfectly calibrated model would follow the diagonal"

---

## 4.4 — Fighter Stat Distribution Explorer

**Source**: `analytics-cache.json` → `distributions`

**Frontend**: Interactive component.
- Stat selector: dropdown or tab chips (SLPM, Striking Acc, Absorption/Min, Defense, Takedown Avg)
- Recharts BarChart histogram (bins on X, count on Y)
- Optional: fighter search input → `fighterApi.search(query)` → show vertical ReferenceLine at fighter's stat value
- Show mean/median/percentiles as sub-header stats

---

## 4.5 — Style Matchup Matrix

**Source**: `analytics-cache.json` → `styleMatrix`

**Frontend**: 3×3 CSS grid (not a chart library — render as styled divs).
- Row = attacker style, Column = defender style
- Cell value = win rate percentage (e.g., "58%")
- Color: green (>55%), amber (45–55%), red (<45%)
- Diagonal cells always "50%" (same vs same)
- Add legend explaining Striker/Grappler/Well-Rounded classification rules

---

## BACKEND IMPLEMENTATION DETAILS

### New files to create:
1. `backend/scripts/computeAnalytics.ts` — one-time script
2. `backend/src/controllers/analyticsController.ts` — serves cached data
3. `backend/src/routes/analytics.ts` — mounts GET /summary

### analyticsController.ts pattern:
```typescript
import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

let analyticsCache: any = null;

function loadCache() {
  if (analyticsCache) return analyticsCache;
  const cachePath = path.join(__dirname, '../../data/analytics-cache.json');
  const modelPath = path.join(__dirname, '../../data/model-weights.json');
  const model = JSON.parse(fs.readFileSync(modelPath, 'utf-8'));
  let cache = {};
  try { cache = JSON.parse(fs.readFileSync(cachePath, 'utf-8')); } catch {}
  analyticsCache = { ...cache, featureImportance: model.featureImportance, trainingStats: model.trainingStats, ensembleWeights: model.ensembleWeights };
  return analyticsCache;
}

export const getAnalyticsSummary = (req: Request, res: Response): void => {
  try {
    res.json({ success: true, data: loadCache() });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Analytics unavailable' });
  }
};
```

### routes/analytics.ts:
```typescript
import { Router } from 'express';
import { getAnalyticsSummary } from '../controllers/analyticsController';
const router = Router();
router.get('/summary', getAnalyticsSummary);
export default router;
```

### Mount in routes/index.ts:
```typescript
import analyticsRoutes from './analytics';
// ...
router.use('/analytics', analyticsRoutes);
```

### lib/api.ts additions:
```typescript
export interface AnalyticsSummary {
  featureImportance: { name: string; importance: number; lrWeight: number }[];
  trainingStats: { samples: number; cvAccuracy: number; cvPrecision: number; cvRecall: number; cvF1: number; lrCvAccuracy: number; gbtCvAccuracy: number; trainedAt: string };
  ensembleWeights: { lr: number; gbt: number };
  weightClassAccuracy: { weightClass: string; accuracy: number; sampleSize: number }[];
  calibration: { bin: string; midpoint: number; actualWinRate: number; count: number }[];
  distributions: {
    stat: string; displayName: string;
    bins: { min: number; max: number; count: number }[];
    mean: number; median: number; p25: number; p75: number;
  }[];
  styleMatrix: Record<string, Record<string, number>>;
  styleClassificationRules: { Striker: string; Grappler: string; WellRounded: string };
}

export const analyticsApi = {
  getSummary: () => apiRequest<AnalyticsSummary>('/analytics/summary'),
};
```

---

## FRONTEND PAGE STRUCTURE

**File**: `frontend/app/analytics/page.tsx`
**Route**: `/analytics`

```
"use client"
imports: Recharts (BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell), lucide-react (BarChart2, Activity, Target, Layers, Grid, Brain, TrendingUp), framer-motion, Link

Page structure:
  - Dark hero banner (same pattern as coach dashboard — bg-gradient-to-r from-gray-900 via-gray-900 to-amber-900)
  - Model Summary strip (4 stat cards: Training Samples, CV Accuracy, Precision, F1 Score)
  - Section 4.1: Feature Importance (horizontal bar chart)
  - Section 4.2: Weight Class Accuracy (vertical bar chart + reference line)
  - Section 4.3: Calibration Curve (line chart + diagonal reference)
  - Section 4.4: Distribution Explorer (stat selector + histogram + fighter search)
  - Section 4.5: Style Matchup Matrix (3×3 grid)

Animations: Framer Motion staggered card entrance (same pattern as other dashboards)
containerVariants = { hidden: opacity 0, visible: staggerChildren 0.08 }
itemVariants = { hidden: opacity 0, y: 16, visible: opacity 1, y: 0 }
```

Add to Navbar for all roles (it's a public/fan-facing page): link to `/analytics` with label `ANALYTICS`.

---

## NAVBAR UPDATE

File: `frontend/components/Navbar.tsx`

Add `/analytics` link for **all roles** (or at minimum for Fan and Coach). Place it near the Prediction/Comparison links.

---

## IMPLEMENTATION ORDER (follow exactly)

### Phase 4.1 first — fastest win, no script needed:
1. Create `analyticsController.ts` reading feature importance from model-weights.json
2. Create `routes/analytics.ts`
3. Mount in `routes/index.ts`
4. Add `analyticsApi` to `lib/api.ts`
5. Create `app/analytics/page.tsx` with just section 4.1 and model summary strip
6. Add Navbar link
7. TypeScript check: `npx tsc --noEmit` in both backend/ and frontend/
8. Test: `GET /api/analytics/summary` returns featureImportance array

### Phase 4.2 — write compute script, then render:
1. Write `computeAnalytics.ts` script (sections A only first)
2. Run script → verify `analytics-cache.json` has `weightClassAccuracy`
3. Update analytics page with 4.2 section

### Phase 4.3 — extend script:
1. Add calibration computation to script
2. Re-run → verify calibration data
3. Add 4.3 section to page

### Phase 4.4 — add to script then page:
1. Add distribution histograms computation to script
2. Add interactive 4.4 section with fighter search

### Phase 4.5 — final:
1. Add style classification + matrix to script
2. Add 4.5 heatmap grid to page

---

## PREDICTIONENGINE — EXTRACTING THE CORE FUNCTION

For the compute script to run predictions, you need to call the model without the full Express server. The prediction engine is in `backend/src/services/predictionEngine.ts`.

Two options:
1. **Import PredictionEngine directly** in the script: `import PredictionEngine from '../src/services/predictionEngine'` and call `engine.predictFromStats(fighter1Stats, fighter2Stats)` (check if this method exists — it may be called `predict()`)
2. **Replicate the math** — simpler for a script:
   - Extract features as diffs: `slpm_diff = f1.slpm - f2.slpm` etc.
   - Load LR weights from model-weights.json
   - Compute LR score: sigmoid(dot(normalizedFeatures, weights) + bias)
   - Traverse GBT trees and accumulate leaf values
   - Blend: `prob = 0.45 * lrProb + 0.55 * gbtProb` (from ensembleWeights)

Read `predictionEngine.ts` fully before writing the script — the feature engineering (eff_striking_diff, composite features, etc.) needs to be replicated exactly.

---

## KNOWN GOTCHAS FOR PHASE 4

1. **analytics-cache.json must be committed** — it's a generated file but should be in the repo so the server doesn't need the script to run at startup
2. **null-safe fighters.csv parsing** — many fighters have null reach, null stance. Filter these out for distribution computation
3. **Weight class "weight" field** — stored as "135 lbs." string. Parse with `parseInt(f.weight)` and map to class name
4. **fightstats.csv not needed for 4.4 or 4.5** — only fighters.csv is needed
5. **fightstats.csv fight outcomes** — there is NO explicit winner column. Use career win-rate as proxy for 4.2 and 4.3 calibration
6. **Recharts on Next.js** — import must be inside the component or wrapped in dynamic(). Use `'use client'` at page level (already required for hooks)
7. **No auth required** for `/api/analytics/summary` — this is a public showcase endpoint, no `protect` middleware
8. **Feature importance display** — sort by `importance` (GBT Gini), not `lrWeight`. GBT is the stronger submodel (weight 0.55)
9. **Calibration only shows 50–100% bins** — below 50% the model predicts the other fighter, so bins 0–50% mirror 50–100% (symmetric). Only show 5 bins: 50-60, 60-70, 70-80, 80-90, 90-100
10. **Style matchup diagonal** — Striker vs Striker should be 50% by definition (symmetric). Hard-code diagonal as 0.50 for intellectual honesty

---

## COMPLETE API RESPONSE SHAPE

`GET /api/analytics/summary` response:
```json
{
  "success": true,
  "data": {
    "featureImportance": [
      { "name": "win_rate_diff", "displayName": "Win Rate Difference", "importance": 0.0811, "lrWeight": 0.3394 }
    ],
    "trainingStats": {
      "samples": 8424, "cvAccuracy": 0.7172, "cvPrecision": 0.7393,
      "cvRecall": 0.8189, "cvF1": 0.7770, "lrCvAccuracy": 0.7127,
      "gbtCvAccuracy": 0.7150, "trainedAt": "2026-03-06T06:31:28.938Z"
    },
    "ensembleWeights": { "lr": 0.45, "gbt": 0.55 },
    "weightClassAccuracy": [
      { "weightClass": "Heavyweight", "accuracy": 0.68, "sampleSize": 150 },
      { "weightClass": "Lightweight", "accuracy": 0.73, "sampleSize": 280 }
    ],
    "calibration": [
      { "bin": "50-60%", "midpoint": 0.55, "actualWinRate": 0.53, "count": 312 },
      { "bin": "60-70%", "midpoint": 0.65, "actualWinRate": 0.63, "count": 284 }
    ],
    "distributions": [
      {
        "stat": "slpm", "displayName": "Strikes Landed Per Min",
        "bins": [{ "min": 0, "max": 1.5, "count": 234 }, ...],
        "mean": 3.42, "median": 3.18, "p25": 2.1, "p75": 4.5
      }
    ],
    "styleMatrix": {
      "Striker":       { "Striker": 0.50, "Grappler": 0.42, "Well-Rounded": 0.48 },
      "Grappler":      { "Striker": 0.58, "Grappler": 0.50, "Well-Rounded": 0.53 },
      "Well-Rounded":  { "Striker": 0.52, "Grappler": 0.47, "Well-Rounded": 0.50 }
    },
    "styleClassificationRules": {
      "Striker": "slpm > 4.0 AND takedown_avg < 1.5",
      "Grappler": "takedown_avg > 2.5 OR submission_avg > 0.5",
      "Well-Rounded": "all others"
    }
  }
}
```

---

## STARTUP SEQUENCE REMINDER

MongoDB must be started manually (not a Windows service):
```powershell
Start-Process -FilePath 'D:\mongodb\bin\mongod.exe' -ArgumentList '--dbpath','D:\mongodb\data\db','--logpath','D:\mongodb\mongod.log','--logappend' -WindowStyle Hidden
```
Then: `cd backend && npm run dev` (port 5001), `cd frontend && npm run dev` (port 3000).
Frontend env: `frontend/.env.local` → `NEXT_PUBLIC_API_URL=http://localhost:5001/api`
Backend env: `backend/.env` → `MONGODB_URI`, `JWT_SECRET`, `GROQ_API_KEY`

---
*Generated 2026-04-27. Context snapshot: OCTAGON_CONTEXT_SNAPSHOT.json (read that too for full schema/API reference)*
