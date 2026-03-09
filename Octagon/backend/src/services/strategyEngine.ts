import { IFighter } from '../models/Fighter';
import { IFightStats, IStrikeStat } from '../models/FightStats';
import { predict, PredictionResult } from './predictionEngine';

// ============================================================
// Types
// ============================================================

interface StrategyRating {
  category: string;
  rating: 'HIGH' | 'MEDIUM' | 'LOW';
  detail: string;
}

interface RoundStrategy {
  round: number;
  approach: 'aggressive' | 'patient' | 'defensive';
  tactics: string[];
  riskLevel: 'high' | 'medium' | 'low';
  notes: string;
}

interface RangeData {
  fighter1Score: number;
  fighter2Score: number;
  recommendation: string;
}

interface StrikeZone {
  opponentDefense: number;
  recommendation: string;
  priority: 'primary' | 'secondary' | 'low';
}

interface DangerZone {
  threat: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  detail: string;
}

interface CornerRound {
  round: number;
  advice: string[];
}

export interface FullStrategy {
  prediction: PredictionResult & { confidence: number };
  strengthsWeaknesses: {
    fighter1: StrategyRating[];
    fighter2: StrategyRating[];
  };
  roundStrategy: RoundStrategy[];
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
    yourTdAccuracy: number;
    opponentTdDefense: number;
    opponentTdAccuracy: number;
    yourTdDefense: number;
    verdict: 'shoot' | 'stuff' | 'neutral';
    details: string;
  };
  dangerZones: DangerZone[];
  cornerAdvice: CornerRound[];
}

// ============================================================
// Groq LLM Configuration (reusing chat module pattern)
// ============================================================

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

function isLLMEnabled(): boolean {
  return GROQ_API_KEY.length > 0 && GROQ_API_KEY !== 'your-groq-api-key';
}

// ============================================================
// Helper: Aggregate FightStats for a fighter
// ============================================================

interface AggregatedStats {
  totalFights: number;
  avgSigStrikesLanded: number;
  avgSigStrikesAttempted: number;
  avgKnockdowns: number;
  avgTakedownsLanded: number;
  avgTakedownsAttempted: number;
  avgSubAttempts: number;
  // Range effectiveness (% of sig strikes at each range)
  distanceRate: number;
  clinchRate: number;
  groundRate: number;
  // Zone breakdown (% of sig strikes at each zone)
  headRate: number;
  bodyRate: number;
  legRate: number;
  // Zone defense (% of strikes absorbed at each zone)
  headAbsorbedRate: number;
  bodyAbsorbedRate: number;
  legAbsorbedRate: number;
  // Raw totals for range
  distanceLanded: number;
  clinchLanded: number;
  groundLanded: number;
}

function aggregateFightStats(stats: IFightStats[]): AggregatedStats {
  if (stats.length === 0) {
    return {
      totalFights: 0,
      avgSigStrikesLanded: 0, avgSigStrikesAttempted: 0,
      avgKnockdowns: 0, avgTakedownsLanded: 0, avgTakedownsAttempted: 0,
      avgSubAttempts: 0,
      distanceRate: 0.5, clinchRate: 0.25, groundRate: 0.25,
      headRate: 0.4, bodyRate: 0.3, legRate: 0.3,
      headAbsorbedRate: 0.4, bodyAbsorbedRate: 0.3, legAbsorbedRate: 0.3,
      distanceLanded: 0, clinchLanded: 0, groundLanded: 0,
    };
  }

  const n = stats.length;
  const sum = (fn: (s: IFightStats) => number) => stats.reduce((acc, s) => acc + fn(s), 0);
  const strikeLanded = (s: IStrikeStat) => s.landed || 0;

  const totalSigLanded = sum(s => strikeLanded(s.sigStrikes));
  const totalDistLanded = sum(s => strikeLanded(s.sigStrikesDistance));
  const totalClinchLanded = sum(s => strikeLanded(s.sigStrikesClinch));
  const totalGroundLanded = sum(s => strikeLanded(s.sigStrikesGround));
  const totalHeadLanded = sum(s => strikeLanded(s.sigStrikesHead));
  const totalBodyLanded = sum(s => strikeLanded(s.sigStrikesBody));
  const totalLegLanded = sum(s => strikeLanded(s.sigStrikesLeg));

  const totalRangeLanded = totalDistLanded + totalClinchLanded + totalGroundLanded;
  const totalZoneLanded = totalHeadLanded + totalBodyLanded + totalLegLanded;

  return {
    totalFights: n,
    avgSigStrikesLanded: totalSigLanded / n,
    avgSigStrikesAttempted: sum(s => (s.sigStrikes?.attempted || 0)) / n,
    avgKnockdowns: sum(s => s.knockdowns) / n,
    avgTakedownsLanded: sum(s => strikeLanded(s.takedowns)) / n,
    avgTakedownsAttempted: sum(s => (s.takedowns?.attempted || 0)) / n,
    avgSubAttempts: sum(s => s.submissionAttempts) / n,
    distanceRate: totalRangeLanded > 0 ? totalDistLanded / totalRangeLanded : 0.5,
    clinchRate: totalRangeLanded > 0 ? totalClinchLanded / totalRangeLanded : 0.25,
    groundRate: totalRangeLanded > 0 ? totalGroundLanded / totalRangeLanded : 0.25,
    headRate: totalZoneLanded > 0 ? totalHeadLanded / totalZoneLanded : 0.4,
    bodyRate: totalZoneLanded > 0 ? totalBodyLanded / totalZoneLanded : 0.3,
    legRate: totalZoneLanded > 0 ? totalLegLanded / totalZoneLanded : 0.3,
    headAbsorbedRate: 0.4, // defaults; will be computed from opponent data
    bodyAbsorbedRate: 0.3,
    legAbsorbedRate: 0.3,
    distanceLanded: totalDistLanded,
    clinchLanded: totalClinchLanded,
    groundLanded: totalGroundLanded,
  };
}

// ============================================================
// Section B: Strengths & Weaknesses Matrix (Pure Algorithm)
// ============================================================

function analyzeStrengthsWeaknesses(fighter: IFighter): StrategyRating[] {
  const ratings: StrategyRating[] = [];

  // Striking Output
  if (fighter.slpm >= 5) {
    ratings.push({ category: 'Striking Output', rating: 'HIGH', detail: `${fighter.slpm} sig. strikes/min - heavy volume` });
  } else if (fighter.slpm >= 3) {
    ratings.push({ category: 'Striking Output', rating: 'MEDIUM', detail: `${fighter.slpm} sig. strikes/min - moderate output` });
  } else {
    ratings.push({ category: 'Striking Output', rating: 'LOW', detail: `${fighter.slpm} sig. strikes/min - low volume` });
  }

  // Striking Accuracy
  if (fighter.strikingAccuracy >= 50) {
    ratings.push({ category: 'Striking Accuracy', rating: 'HIGH', detail: `${fighter.strikingAccuracy}% accuracy - very precise` });
  } else if (fighter.strikingAccuracy >= 40) {
    ratings.push({ category: 'Striking Accuracy', rating: 'MEDIUM', detail: `${fighter.strikingAccuracy}% accuracy - average` });
  } else {
    ratings.push({ category: 'Striking Accuracy', rating: 'LOW', detail: `${fighter.strikingAccuracy}% accuracy - inaccurate` });
  }

  // Striking Defense
  if (fighter.strikingDefense >= 60) {
    ratings.push({ category: 'Striking Defense', rating: 'HIGH', detail: `${fighter.strikingDefense}% defense - hard to hit` });
  } else if (fighter.strikingDefense >= 50) {
    ratings.push({ category: 'Striking Defense', rating: 'MEDIUM', detail: `${fighter.strikingDefense}% defense - average` });
  } else {
    ratings.push({ category: 'Striking Defense', rating: 'LOW', detail: `${fighter.strikingDefense}% defense - hittable` });
  }

  // Takedown Offense
  if (fighter.takedownAccuracy >= 50 && fighter.takedownAvg >= 2) {
    ratings.push({ category: 'Takedown Offense', rating: 'HIGH', detail: `${fighter.takedownAvg} TD/15min at ${fighter.takedownAccuracy}% - elite wrestler` });
  } else if (fighter.takedownAccuracy >= 35 || fighter.takedownAvg >= 1.5) {
    ratings.push({ category: 'Takedown Offense', rating: 'MEDIUM', detail: `${fighter.takedownAvg} TD/15min at ${fighter.takedownAccuracy}% - can wrestle` });
  } else {
    ratings.push({ category: 'Takedown Offense', rating: 'LOW', detail: `${fighter.takedownAvg} TD/15min at ${fighter.takedownAccuracy}% - limited wrestling` });
  }

  // Takedown Defense
  if (fighter.takedownDefense >= 75) {
    ratings.push({ category: 'Takedown Defense', rating: 'HIGH', detail: `${fighter.takedownDefense}% TD defense - hard to take down` });
  } else if (fighter.takedownDefense >= 60) {
    ratings.push({ category: 'Takedown Defense', rating: 'MEDIUM', detail: `${fighter.takedownDefense}% TD defense - average` });
  } else {
    ratings.push({ category: 'Takedown Defense', rating: 'LOW', detail: `${fighter.takedownDefense}% TD defense - vulnerable to takedowns` });
  }

  // Submission Game
  if (fighter.submissionAvg >= 1.5) {
    ratings.push({ category: 'Submission Game', rating: 'HIGH', detail: `${fighter.submissionAvg} sub attempts/15min - dangerous on ground` });
  } else if (fighter.submissionAvg >= 0.5) {
    ratings.push({ category: 'Submission Game', rating: 'MEDIUM', detail: `${fighter.submissionAvg} sub attempts/15min - some ground threat` });
  } else {
    ratings.push({ category: 'Submission Game', rating: 'LOW', detail: `${fighter.submissionAvg} sub attempts/15min - minimal ground game` });
  }

  // Durability (inverse of strikes absorbed)
  if (fighter.sapm <= 2.5) {
    ratings.push({ category: 'Durability', rating: 'HIGH', detail: `Only absorbs ${fighter.sapm} strikes/min - durable` });
  } else if (fighter.sapm <= 4) {
    ratings.push({ category: 'Durability', rating: 'MEDIUM', detail: `Absorbs ${fighter.sapm} strikes/min - average durability` });
  } else {
    ratings.push({ category: 'Durability', rating: 'LOW', detail: `Absorbs ${fighter.sapm} strikes/min - takes heavy damage` });
  }

  // Experience
  const totalFights = fighter.wins + fighter.losses + fighter.draws;
  const winRate = totalFights > 0 ? (fighter.wins / totalFights) * 100 : 0;
  if (totalFights >= 20 && winRate >= 65) {
    ratings.push({ category: 'Experience', rating: 'HIGH', detail: `${fighter.wins}-${fighter.losses}-${fighter.draws} (${winRate.toFixed(0)}% win rate) - elite veteran` });
  } else if (totalFights >= 10) {
    ratings.push({ category: 'Experience', rating: 'MEDIUM', detail: `${fighter.wins}-${fighter.losses}-${fighter.draws} (${winRate.toFixed(0)}% win rate) - experienced` });
  } else {
    ratings.push({ category: 'Experience', rating: 'LOW', detail: `${fighter.wins}-${fighter.losses}-${fighter.draws} (${winRate.toFixed(0)}% win rate) - limited experience` });
  }

  return ratings;
}

// ============================================================
// Section D: Range Analysis (Pure Algorithm)
// ============================================================

function analyzeRange(
  f1: IFighter, f2: IFighter,
  f1Stats: AggregatedStats, f2Stats: AggregatedStats
): { distance: RangeData; clinch: RangeData; ground: RangeData; bestRange: string } {
  // Distance scoring: striking volume * accuracy at distance
  const f1DistScore = f1.slpm * (f1.strikingAccuracy / 100) * f1Stats.distanceRate;
  const f2DistScore = f2.slpm * (f2.strikingAccuracy / 100) * f2Stats.distanceRate;

  // Clinch scoring: clinch striking + takedown threat at clinch
  const f1ClinchScore = f1Stats.clinchRate * f1.slpm + f1.takedownAvg * 0.3;
  const f2ClinchScore = f2Stats.clinchRate * f2.slpm + f2.takedownAvg * 0.3;

  // Ground scoring: takedown + submissions
  const f1GroundScore = f1.takedownAvg * (f1.takedownAccuracy / 100) + f1.submissionAvg;
  const f2GroundScore = f2.takedownAvg * (f2.takedownAccuracy / 100) + f2.submissionAvg;

  const makeRecommendation = (label: string, s1: number, s2: number): string => {
    const diff = s1 - s2;
    if (diff > 0.5) return `${f1.name} has a clear ${label} advantage`;
    if (diff < -0.5) return `${f2.name} has a clear ${label} advantage`;
    return `${label} is contested - fairly even`;
  };

  // Find best range for fighter1 (the coach's fighter)
  const ranges = [
    { name: 'distance', score: f1DistScore - f2DistScore },
    { name: 'clinch', score: f1ClinchScore - f2ClinchScore },
    { name: 'ground', score: f1GroundScore - f2GroundScore },
  ];
  const best = ranges.reduce((a, b) => a.score > b.score ? a : b);

  return {
    distance: {
      fighter1Score: Math.round(f1DistScore * 100) / 100,
      fighter2Score: Math.round(f2DistScore * 100) / 100,
      recommendation: makeRecommendation('Distance', f1DistScore, f2DistScore),
    },
    clinch: {
      fighter1Score: Math.round(f1ClinchScore * 100) / 100,
      fighter2Score: Math.round(f2ClinchScore * 100) / 100,
      recommendation: makeRecommendation('Clinch', f1ClinchScore, f2ClinchScore),
    },
    ground: {
      fighter1Score: Math.round(f1GroundScore * 100) / 100,
      fighter2Score: Math.round(f2GroundScore * 100) / 100,
      recommendation: makeRecommendation('Ground', f1GroundScore, f2GroundScore),
    },
    bestRange: best.name.toUpperCase(),
  };
}

// ============================================================
// Section E: Strike Targeting (Pure Algorithm)
// ============================================================

function analyzeStrikeTargeting(
  opponent: IFighter,
  opponentStats: AggregatedStats
): { head: StrikeZone; body: StrikeZone; legs: StrikeZone; primaryTarget: string } {
  // Higher absorbed rate = weaker defense at that zone
  const headDef = 100 - (opponentStats.headAbsorbedRate * 100);
  const bodyDef = 100 - (opponentStats.bodyAbsorbedRate * 100);
  const legDef = 100 - (opponentStats.legAbsorbedRate * 100);

  // Also factor in striking defense %
  const overallDef = opponent.strikingDefense;
  const adjustedHeadDef = Math.round((headDef + overallDef) / 2);
  const adjustedBodyDef = Math.round((bodyDef + overallDef) / 2);
  const adjustedLegDef = Math.round((legDef + overallDef) / 2);

  // Lower defense = better target
  const zones = [
    { zone: 'head', def: adjustedHeadDef },
    { zone: 'body', def: adjustedBodyDef },
    { zone: 'legs', def: adjustedLegDef },
  ].sort((a, b) => a.def - b.def);

  const priorityMap: Record<number, 'primary' | 'secondary' | 'low'> = { 0: 'primary', 1: 'secondary', 2: 'low' };

  const makeZone = (zone: string, def: number, rank: number): StrikeZone => {
    const prio = priorityMap[rank];
    const label = zone.charAt(0).toUpperCase() + zone.slice(1);
    let rec = '';
    if (prio === 'primary') rec = `Target the ${label.toUpperCase()} - weakest defensive zone (${def}% adjusted defense)`;
    else if (prio === 'secondary') rec = `${label} is a secondary target (${def}% adjusted defense)`;
    else rec = `${label} is well-defended (${def}% adjusted defense) - use as setup only`;
    return { opponentDefense: def, recommendation: rec, priority: prio };
  };

  const result: Record<string, StrikeZone> = {};
  zones.forEach((z, i) => { result[z.zone] = makeZone(z.zone, z.def, i); });

  return {
    head: result['head'],
    body: result['body'],
    legs: result['legs'],
    primaryTarget: zones[0].zone.toUpperCase(),
  };
}

// ============================================================
// Section F: Takedown Plan (Pure Algorithm)
// ============================================================

function analyzeTakedownPlan(
  myFighter: IFighter, opponent: IFighter
): { yourTdAccuracy: number; opponentTdDefense: number; opponentTdAccuracy: number; yourTdDefense: number; verdict: 'shoot' | 'stuff' | 'neutral'; details: string } {
  const myAdvantage = myFighter.takedownAccuracy - opponent.takedownDefense;
  const theirAdvantage = opponent.takedownAccuracy - myFighter.takedownDefense;

  let verdict: 'shoot' | 'stuff' | 'neutral';
  let details: string;

  if (myAdvantage > 10 && myFighter.takedownAvg >= 1.5) {
    verdict = 'shoot';
    details = `SHOOT - Your ${myFighter.takedownAccuracy}% TD accuracy exploits their ${opponent.takedownDefense}% TD defense. Look for takedowns early and often.`;
  } else if (theirAdvantage > 10 && opponent.takedownAvg >= 1.5) {
    verdict = 'stuff';
    details = `STUFF - Opponent has ${opponent.takedownAccuracy}% TD accuracy vs your ${myFighter.takedownDefense}% defense. Focus on sprawls and cage awareness.`;
  } else if (myAdvantage > 0 && myFighter.takedownAvg >= 1) {
    verdict = 'shoot';
    details = `Slight takedown advantage (${myFighter.takedownAccuracy}% vs ${opponent.takedownDefense}% defense). Mix in takedowns when opponent is against the cage.`;
  } else if (theirAdvantage > 0 && opponent.takedownAvg >= 1) {
    verdict = 'stuff';
    details = `Opponent has a slight wrestling edge (${opponent.takedownAccuracy}% accuracy). Stay off the cage and keep distance.`;
  } else {
    verdict = 'neutral';
    details = `Wrestling is fairly even. Use takedowns situationally - don't force the grappling.`;
  }

  return {
    yourTdAccuracy: myFighter.takedownAccuracy,
    opponentTdDefense: opponent.takedownDefense,
    opponentTdAccuracy: opponent.takedownAccuracy,
    yourTdDefense: myFighter.takedownDefense,
    verdict,
    details,
  };
}

// ============================================================
// Section G: Danger Zones (Pure Algorithm)
// ============================================================

function identifyDangerZones(opponent: IFighter): DangerZone[] {
  const dangers: DangerZone[] = [];

  if (opponent.slpm >= 6) {
    dangers.push({ threat: 'Heavy Hands', severity: 'HIGH', detail: `${opponent.slpm} sig. strikes/min - knockout threat on every exchange` });
  } else if (opponent.slpm >= 4.5) {
    dangers.push({ threat: 'Solid Striker', severity: 'MEDIUM', detail: `${opponent.slpm} sig. strikes/min - consistent volume` });
  }

  if (opponent.strikingAccuracy >= 55) {
    dangers.push({ threat: 'Sniper Accuracy', severity: 'HIGH', detail: `${opponent.strikingAccuracy}% striking accuracy - rarely misses` });
  }

  if (opponent.submissionAvg >= 2) {
    dangers.push({ threat: 'Submission Specialist', severity: 'HIGH', detail: `${opponent.submissionAvg} sub attempts/15min - extremely dangerous on the ground` });
  } else if (opponent.submissionAvg >= 1) {
    dangers.push({ threat: 'Ground Threat', severity: 'MEDIUM', detail: `${opponent.submissionAvg} sub attempts/15min - can finish on the ground` });
  }

  if (opponent.takedownAccuracy >= 55 && opponent.takedownAvg >= 3) {
    dangers.push({ threat: 'Elite Wrestler', severity: 'HIGH', detail: `${opponent.takedownAvg} TD/15min at ${opponent.takedownAccuracy}% - will take you down` });
  } else if (opponent.takedownAccuracy >= 40 && opponent.takedownAvg >= 2) {
    dangers.push({ threat: 'Wrestling Threat', severity: 'MEDIUM', detail: `${opponent.takedownAvg} TD/15min at ${opponent.takedownAccuracy}% - can chain wrestle` });
  }

  if (opponent.strikingDefense >= 65) {
    dangers.push({ threat: 'Hard to Hit', severity: 'MEDIUM', detail: `${opponent.strikingDefense}% striking defense - feints and setups required` });
  }

  if (opponent.takedownDefense >= 80) {
    dangers.push({ threat: 'Takedown Proof', severity: 'MEDIUM', detail: `${opponent.takedownDefense}% TD defense - very hard to take down` });
  }

  const totalFights = opponent.wins + opponent.losses + opponent.draws;
  const winRate = totalFights > 0 ? (opponent.wins / totalFights) * 100 : 0;
  if (winRate >= 80 && totalFights >= 15) {
    dangers.push({ threat: 'Elite Record', severity: 'HIGH', detail: `${opponent.wins}-${opponent.losses} record (${winRate.toFixed(0)}% win rate) - proven winner` });
  }

  // Sort by severity
  const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  dangers.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return dangers;
}

// ============================================================
// Section C + H: LLM-Powered Round Strategy & Corner Advice
// ============================================================

interface ComputedContext {
  fighter1Name: string;
  fighter2Name: string;
  prediction: PredictionResult;
  strengthsWeaknesses: { fighter1: StrategyRating[]; fighter2: StrategyRating[] };
  rangeAnalysis: { bestRange: string; distance: RangeData; clinch: RangeData; ground: RangeData };
  strikeTargeting: { primaryTarget: string; head: StrikeZone; body: StrikeZone; legs: StrikeZone };
  takedownPlan: { verdict: string; details: string };
  dangerZones: DangerZone[];
  fighter1: IFighter;
  fighter2: IFighter;
}

function buildStrategyPrompt(ctx: ComputedContext): string {
  const f1Strengths = ctx.strengthsWeaknesses.fighter1
    .filter(r => r.rating === 'HIGH')
    .map(r => `${r.category}: ${r.detail}`).join(', ');
  const f2Strengths = ctx.strengthsWeaknesses.fighter2
    .filter(r => r.rating === 'HIGH')
    .map(r => `${r.category}: ${r.detail}`).join(', ');
  const f2Weaknesses = ctx.strengthsWeaknesses.fighter2
    .filter(r => r.rating === 'LOW')
    .map(r => `${r.category}: ${r.detail}`).join(', ');
  const dangers = ctx.dangerZones.map(d => `${d.severity}: ${d.threat} - ${d.detail}`).join('\n');

  return `You are an elite MMA corner coach preparing a game plan. Analyze this matchup and provide strategy.

MATCHUP: ${ctx.fighter1Name} vs ${ctx.fighter2Name}

PREDICTION: ${ctx.prediction.winner} wins (${Math.round(ctx.prediction.winnerProbability * 100)}%) via ${ctx.prediction.predictedMethod} in Round ${ctx.prediction.predictedRound}

YOUR FIGHTER (${ctx.fighter1Name}):
- Record: ${ctx.fighter1.wins}-${ctx.fighter1.losses}-${ctx.fighter1.draws}
- SLPM: ${ctx.fighter1.slpm}, Accuracy: ${ctx.fighter1.strikingAccuracy}%, Defense: ${ctx.fighter1.strikingDefense}%
- TD: ${ctx.fighter1.takedownAvg}/15min at ${ctx.fighter1.takedownAccuracy}%, TD Def: ${ctx.fighter1.takedownDefense}%
- Subs: ${ctx.fighter1.submissionAvg}/15min
- Strengths: ${f1Strengths || 'None outstanding'}

OPPONENT (${ctx.fighter2Name}):
- Record: ${ctx.fighter2.wins}-${ctx.fighter2.losses}-${ctx.fighter2.draws}
- SLPM: ${ctx.fighter2.slpm}, Accuracy: ${ctx.fighter2.strikingAccuracy}%, Defense: ${ctx.fighter2.strikingDefense}%
- TD: ${ctx.fighter2.takedownAvg}/15min at ${ctx.fighter2.takedownAccuracy}%, TD Def: ${ctx.fighter2.takedownDefense}%
- Subs: ${ctx.fighter2.submissionAvg}/15min
- Strengths: ${f2Strengths || 'None outstanding'}
- Weaknesses: ${f2Weaknesses || 'None major'}

ANALYSIS:
- Best range: ${ctx.rangeAnalysis.bestRange}
- Primary strike target: ${ctx.strikeTargeting.primaryTarget}
- Takedown plan: ${ctx.takedownPlan.verdict.toUpperCase()} - ${ctx.takedownPlan.details}
- Danger zones:
${dangers || 'No major threats identified'}

Respond in EXACTLY this JSON format (no other text):
{
  "roundStrategy": [
    {
      "round": 1,
      "approach": "aggressive|patient|defensive",
      "tactics": ["tactic 1", "tactic 2", "tactic 3"],
      "riskLevel": "high|medium|low",
      "notes": "Brief explanation of R1 approach"
    },
    {
      "round": 2,
      "approach": "aggressive|patient|defensive",
      "tactics": ["tactic 1", "tactic 2", "tactic 3"],
      "riskLevel": "high|medium|low",
      "notes": "Brief explanation of R2 approach"
    },
    {
      "round": 3,
      "approach": "aggressive|patient|defensive",
      "tactics": ["tactic 1", "tactic 2", "tactic 3"],
      "riskLevel": "high|medium|low",
      "notes": "Brief explanation of R3 approach"
    }
  ],
  "cornerAdvice": [
    {
      "round": 1,
      "advice": ["specific actionable advice 1", "specific actionable advice 2", "specific actionable advice 3"]
    },
    {
      "round": 2,
      "advice": ["specific actionable advice 1", "specific actionable advice 2", "specific actionable advice 3"]
    },
    {
      "round": 3,
      "advice": ["specific actionable advice 1", "specific actionable advice 2", "specific actionable advice 3"]
    }
  ]
}

Rules:
- Tactics must reference SPECIFIC techniques (jab, low kick, double leg, etc.)
- Corner advice must sound like a real cornerman coaching between rounds
- Base everything on the actual stats provided - do NOT invent facts
- If one fighter is much better, reflect that in approach (e.g., patient vs danger fighter, aggressive vs weak fighter)
- Keep each advice point under 15 words`;
}

async function callGroqForStrategy(ctx: ComputedContext): Promise<{ roundStrategy: RoundStrategy[]; cornerAdvice: CornerRound[] }> {
  const prompt = buildStrategyPrompt(ctx);

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: 'You are an elite MMA strategy analyst. Respond ONLY with valid JSON. No markdown, no explanation.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 1024,
      top_p: 0.9,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status}`);
  }

  const data: any = await response.json();
  const text = data.choices?.[0]?.message?.content || '';

  // Extract JSON from response (handle possible markdown wrapping)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in LLM response');

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    roundStrategy: parsed.roundStrategy || [],
    cornerAdvice: parsed.cornerAdvice || [],
  };
}

// ============================================================
// Fallbacks (when LLM is unavailable)
// ============================================================

function generateFallbackRoundStrategy(ctx: ComputedContext): RoundStrategy[] {
  const isStrikerAdvantage = ctx.fighter1.slpm > ctx.fighter2.slpm && ctx.fighter1.strikingAccuracy > ctx.fighter2.strikingAccuracy;
  const isGrapplerAdvantage = ctx.fighter1.takedownAvg > ctx.fighter2.takedownAvg && ctx.fighter1.submissionAvg > ctx.fighter2.submissionAvg;
  const opponentDangerous = ctx.dangerZones.some(d => d.severity === 'HIGH');
  const bestRange = ctx.rangeAnalysis.bestRange.toLowerCase();
  const target = ctx.strikeTargeting.primaryTarget.toLowerCase();

  return [
    {
      round: 1,
      approach: opponentDangerous ? 'patient' : 'aggressive',
      tactics: [
        opponentDangerous ? 'Feel out range, don\'t overcommit early' : 'Push pace from the start',
        isStrikerAdvantage ? `Work the jab and target the ${target}` : `Look for early takedown to establish control`,
        `Stay at ${bestRange} range`,
      ],
      riskLevel: opponentDangerous ? 'low' : 'medium',
      notes: opponentDangerous ? 'Survive the early storm, build data on opponent timing' : 'Establish dominance early and set the tone',
    },
    {
      round: 2,
      approach: 'aggressive',
      tactics: [
        `Increase output at ${bestRange}`,
        isGrapplerAdvantage ? 'Chain wrestling - if first takedown fails, re-shoot immediately' : `Double up on ${target} strikes`,
        'Push opponent against the cage when possible',
      ],
      riskLevel: 'medium',
      notes: 'Middle round - time to push the pace and accumulate damage',
    },
    {
      round: 3,
      approach: ctx.prediction.winnerProbability > 0.6 ? 'aggressive' : 'patient',
      tactics: [
        ctx.prediction.winnerProbability > 0.6 ? 'Go for the finish if opportunity presents' : 'Smart defense, manage distance if ahead on points',
        `Continue working the ${target}`,
        ctx.takedownPlan.verdict === 'shoot' ? 'Look for takedown to control final round' : 'Keep it standing, use footwork',
      ],
      riskLevel: ctx.prediction.winnerProbability > 0.6 ? 'high' : 'low',
      notes: ctx.prediction.winnerProbability > 0.6 ? 'Championship rounds - time to let it all go' : 'Close it out smart if ahead, or push hard if behind',
    },
  ];
}

function generateFallbackCornerAdvice(ctx: ComputedContext): CornerRound[] {
  const bestRange = ctx.rangeAnalysis.bestRange.toLowerCase();
  const target = ctx.strikeTargeting.primaryTarget.toLowerCase();
  const dangerNotes = ctx.dangerZones.slice(0, 2).map(d => `Watch out - ${d.detail}`);

  return [
    {
      round: 1,
      advice: [
        `Control the ${bestRange}, establish your range`,
        `Target the ${target} early and often`,
        ...(dangerNotes.length > 0 ? [dangerNotes[0]] : ['Stay disciplined, stick to the game plan']),
      ],
    },
    {
      round: 2,
      advice: [
        'Increase your output, you\'ve got the read now',
        ctx.takedownPlan.verdict === 'shoot' ? 'Mix in takedowns to keep them guessing' : 'Keep it standing, punish their entries',
        `Keep targeting the ${target}`,
      ],
    },
    {
      round: 3,
      advice: [
        ctx.prediction.winnerProbability > 0.6 ? 'You have the advantage - go get it' : 'Stay smart, protect the lead',
        'Don\'t let them off the cage',
        'Leave it all in there - last round',
      ],
    },
  ];
}

// ============================================================
// Main: Generate Full Strategy
// ============================================================

export async function generateStrategy(
  fighter1: IFighter,
  fighter2: IFighter,
  fighter1Stats: IFightStats[],
  fighter2Stats: IFightStats[]
): Promise<FullStrategy> {
  // 1. Run prediction engine
  const prediction = predict(
    {
      name: fighter1.name, wins: fighter1.wins, losses: fighter1.losses, draws: fighter1.draws,
      slpm: fighter1.slpm, strikingAccuracy: fighter1.strikingAccuracy, sapm: fighter1.sapm,
      strikingDefense: fighter1.strikingDefense, takedownAvg: fighter1.takedownAvg,
      takedownAccuracy: fighter1.takedownAccuracy, takedownDefense: fighter1.takedownDefense,
      submissionAvg: fighter1.submissionAvg, reach: fighter1.reach,
    },
    {
      name: fighter2.name, wins: fighter2.wins, losses: fighter2.losses, draws: fighter2.draws,
      slpm: fighter2.slpm, strikingAccuracy: fighter2.strikingAccuracy, sapm: fighter2.sapm,
      strikingDefense: fighter2.strikingDefense, takedownAvg: fighter2.takedownAvg,
      takedownAccuracy: fighter2.takedownAccuracy, takedownDefense: fighter2.takedownDefense,
      submissionAvg: fighter2.submissionAvg, reach: fighter2.reach,
    }
  );

  // 2. Aggregate fight stats
  const f1Agg = aggregateFightStats(fighter1Stats);
  const f2Agg = aggregateFightStats(fighter2Stats);

  // 3. Pure algorithm sections
  const strengthsWeaknesses = {
    fighter1: analyzeStrengthsWeaknesses(fighter1),
    fighter2: analyzeStrengthsWeaknesses(fighter2),
  };

  const rangeAnalysis = analyzeRange(fighter1, fighter2, f1Agg, f2Agg);
  const strikeTargeting = analyzeStrikeTargeting(fighter2, f2Agg);
  const takedownPlan = analyzeTakedownPlan(fighter1, fighter2);
  const dangerZones = identifyDangerZones(fighter2);

  // 4. Build context for LLM
  const ctx: ComputedContext = {
    fighter1Name: fighter1.name,
    fighter2Name: fighter2.name,
    prediction,
    strengthsWeaknesses,
    rangeAnalysis,
    strikeTargeting,
    takedownPlan,
    dangerZones,
    fighter1,
    fighter2,
  };

  // 5. LLM sections (with fallback)
  let roundStrategy: RoundStrategy[];
  let cornerAdvice: CornerRound[];

  if (isLLMEnabled()) {
    try {
      const llmResult = await callGroqForStrategy(ctx);
      roundStrategy = llmResult.roundStrategy;
      cornerAdvice = llmResult.cornerAdvice;
    } catch (err) {
      console.error('Strategy LLM fallback triggered:', err);
      roundStrategy = generateFallbackRoundStrategy(ctx);
      cornerAdvice = generateFallbackCornerAdvice(ctx);
    }
  } else {
    roundStrategy = generateFallbackRoundStrategy(ctx);
    cornerAdvice = generateFallbackCornerAdvice(ctx);
  }

  return {
    prediction: { ...prediction, confidence: prediction.confidence },
    strengthsWeaknesses,
    roundStrategy,
    rangeAnalysis,
    strikeTargeting,
    takedownPlan,
    dangerZones,
    cornerAdvice,
  };
}
