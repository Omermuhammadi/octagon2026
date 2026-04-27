import fs from 'fs';
import path from 'path';

// ============================================================
// Types
// ============================================================
type TreeNode = {
  f: number;
  t: number;
  l: TreeNode | number;
  r: TreeNode | number;
};

interface ModelDataV2 {
  version: number;
  featureNames: string[];
  logisticRegression: {
    weights: number[];
    bias: number;
    means: number[];
    stds: number[];
  };
  gbt: {
    trees: (TreeNode | number)[];
    initPred: number;
    lr: number;
  };
  ensembleWeights: { lr: number; gbt: number };
  featureImportance: { name: string; importance: number; lrWeight: number }[];
  methodProbs: { ko_tko: number; submission: number; decision: number };
  roundProbs: Record<string, number>;
  trainingStats: {
    samples: number;
    cvAccuracy: number;
    trainAccuracy: number;
    trainedAt: string;
    [key: string]: any;
  };
}

// Legacy model format (version 1)
interface ModelDataV1 {
  weights: number[];
  bias: number;
  featureMeans: number[];
  featureStds: number[];
  featureNames: string[];
  featureImportance: { name: string; weight: number }[];
  methodProbs: { ko_tko: number; submission: number; decision: number };
  roundProbs: Record<string, number>;
  trainingStats: { samples: number; accuracy: number; trainedAt: string };
}

interface FighterStats {
  name: string;
  wins: number;
  losses: number;
  draws: number;
  slpm: number;
  strikingAccuracy: number;
  sapm: number;
  strikingDefense: number;
  takedownAvg: number;
  takedownAccuracy: number;
  takedownDefense: number;
  submissionAvg: number;
  reach: number | null;
}

export interface PredictionResult {
  winner: string;
  loser: string;
  winnerProbability: number;
  loserProbability: number;
  predictedMethod: string;
  methodProbabilities: { method: string; probability: number }[];
  predictedRound: number;
  confidence: number;
  topFactors: { factor: string; description: string; impact: string; absContrib: number; direction: 'positive' | 'negative' }[];
}

// ============================================================
// Globals
// ============================================================
let cachedModel: ModelDataV2 | null = null;

function loadModel(): ModelDataV2 {
  if (cachedModel) return cachedModel;
  const modelPath = path.join(__dirname, '..', '..', 'data', 'model-weights.json');
  if (!fs.existsSync(modelPath)) {
    throw new Error('Model not trained yet. Run: npm run train-model');
  }
  const raw = JSON.parse(fs.readFileSync(modelPath, 'utf-8'));

  // Handle legacy v1 model format
  if (!raw.version || raw.version < 2) {
    const v1 = raw as ModelDataV1;
    cachedModel = {
      version: 1,
      featureNames: v1.featureNames || [],
      logisticRegression: {
        weights: v1.weights,
        bias: v1.bias,
        means: v1.featureMeans,
        stds: v1.featureStds,
      },
      gbt: { trees: [], initPred: 0, lr: 0 },
      ensembleWeights: { lr: 1, gbt: 0 },
      featureImportance: (v1.featureImportance || []).map(f => ({
        name: f.name,
        importance: Math.abs(f.weight),
        lrWeight: f.weight,
      })),
      methodProbs: v1.methodProbs,
      roundProbs: v1.roundProbs,
      trainingStats: {
        samples: v1.trainingStats.samples,
        cvAccuracy: v1.trainingStats.accuracy,
        trainAccuracy: v1.trainingStats.accuracy,
        trainedAt: v1.trainingStats.trainedAt,
      },
    };
  } else {
    cachedModel = raw as ModelDataV2;
  }
  return cachedModel!;
}

// ============================================================
// Math
// ============================================================
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
}

// ============================================================
// Feature Engineering (must match trainModel.ts exactly)
// ============================================================
interface FighterFeatures {
  slpm: number;
  strikingAccuracy: number;
  sapm: number;
  strikingDefense: number;
  takedownAvg: number;
  takedownAccuracy: number;
  takedownDefense: number;
  submissionAvg: number;
  wins: number;
  losses: number;
  draws: number;
  reach: number;
}

function engineerFeatures(f1: FighterFeatures, f2: FighterFeatures): number[] {
  const f1Total = f1.wins + f1.losses + f1.draws;
  const f2Total = f2.wins + f2.losses + f2.draws;
  const f1WinRate = f1Total > 0 ? f1.wins / f1Total : 0.5;
  const f2WinRate = f2Total > 0 ? f2.wins / f2Total : 0.5;
  const f1EffStr = f1.slpm * f1.strikingAccuracy / 100;
  const f2EffStr = f2.slpm * f2.strikingAccuracy / 100;
  const f1EffTd = f1.takedownAvg * f1.takedownAccuracy / 100;
  const f2EffTd = f2.takedownAvg * f2.takedownAccuracy / 100;
  const f1Ground = f1EffTd + f1.submissionAvg;
  const f2Ground = f2EffTd + f2.submissionAvg;

  return [
    // Basic differentials (11)
    f1.slpm - f2.slpm,
    f1.strikingAccuracy - f2.strikingAccuracy,
    f1.sapm - f2.sapm,
    f1.strikingDefense - f2.strikingDefense,
    f1.takedownAvg - f2.takedownAvg,
    f1.takedownAccuracy - f2.takedownAccuracy,
    f1.takedownDefense - f2.takedownDefense,
    f1.submissionAvg - f2.submissionAvg,
    f1.wins - f2.wins,
    f1.losses - f2.losses,
    f1.reach - f2.reach,
    // Derived rates (4)
    f1WinRate - f2WinRate,
    f1Total - f2Total,
    Math.log(1 + f1Total) - Math.log(1 + f2Total),
    f1.draws - f2.draws,
    // Efficiency metrics (6)
    f1EffStr - f2EffStr,
    (f1.slpm - f1.sapm) - (f2.slpm - f2.sapm),
    f1.slpm / Math.max(f1.sapm, 0.5) - f2.slpm / Math.max(f2.sapm, 0.5),
    f1EffTd - f2EffTd,
    f1Ground - f2Ground,
    (f1.strikingDefense * f1.takedownDefense / 100) - (f2.strikingDefense * f2.takedownDefense / 100),
    // Matchup-specific (2)
    f1.slpm * (1 - f2.strikingDefense / 100) - f2.slpm * (1 - f1.strikingDefense / 100),
    f1.takedownAvg * (1 - f2.takedownDefense / 100) - f2.takedownAvg * (1 - f1.takedownDefense / 100),
    // Interaction terms (2)
    (f1.slpm - f2.slpm) * (f1.strikingAccuracy - f2.strikingAccuracy) / 100,
    (f1.takedownAvg - f2.takedownAvg) * (f1.takedownAccuracy - f2.takedownAccuracy) / 100,
    // Style indicators (2)
    (f1EffStr - f1Ground) - (f2EffStr - f2Ground),
    (f1.slpm / 4 + f1.takedownAvg + f1.submissionAvg) - (f2.slpm / 4 + f2.takedownAvg + f2.submissionAvg),
  ];
}

// Legacy feature builder for v1 models
function buildLegacyFeatures(f1: FighterStats, f2: FighterStats): number[] {
  return [
    f1.slpm - f2.slpm,
    f1.strikingAccuracy - f2.strikingAccuracy,
    f1.sapm - f2.sapm,
    f1.strikingDefense - f2.strikingDefense,
    f1.takedownAvg - f2.takedownAvg,
    f1.takedownAccuracy - f2.takedownAccuracy,
    f1.takedownDefense - f2.takedownDefense,
    f1.submissionAvg - f2.submissionAvg,
    f1.wins - f2.wins,
    f1.losses - f2.losses,
    (f1.reach || 0) - (f2.reach || 0),
  ];
}

// ============================================================
// Tree Prediction
// ============================================================
function predictTree(node: TreeNode | number, x: number[]): number {
  if (typeof node === 'number') return node;
  return x[node.f] <= node.t ? predictTree(node.l, x) : predictTree(node.r, x);
}

// ============================================================
// Model Predictions
// ============================================================
function predictLR(m: ModelDataV2, features: number[]): number {
  const lr = m.logisticRegression;
  let z = lr.bias;
  for (let i = 0; i < features.length; i++) {
    z += lr.weights[i] * ((features[i] - lr.means[i]) / lr.stds[i]);
  }
  return sigmoid(z);
}

function predictGBT(m: ModelDataV2, features: number[]): number {
  if (m.gbt.trees.length === 0) return 0.5;
  let score = m.gbt.initPred;
  for (const tree of m.gbt.trees) {
    score += m.gbt.lr * predictTree(tree, features);
  }
  return sigmoid(score);
}

function predictEnsemble(m: ModelDataV2, features: number[]): number {
  const lrProb = predictLR(m, features);
  const gbtProb = predictGBT(m, features);
  return m.ensembleWeights.lr * lrProb + m.ensembleWeights.gbt * gbtProb;
}

// ============================================================
// Main Predict Function (same interface as before)
// ============================================================
export function predict(fighter1: FighterStats, fighter2: FighterStats): PredictionResult {
  const m = loadModel();

  // Build features based on model version
  let rawFeatures: number[];
  let prob1: number;

  if (m.version >= 2) {
    // V2: Full feature engineering + ensemble
    const f1: FighterFeatures = {
      slpm: fighter1.slpm,
      strikingAccuracy: fighter1.strikingAccuracy,
      sapm: fighter1.sapm,
      strikingDefense: fighter1.strikingDefense,
      takedownAvg: fighter1.takedownAvg,
      takedownAccuracy: fighter1.takedownAccuracy,
      takedownDefense: fighter1.takedownDefense,
      submissionAvg: fighter1.submissionAvg,
      wins: fighter1.wins,
      losses: fighter1.losses,
      draws: fighter1.draws,
      reach: fighter1.reach || 0,
    };
    const f2: FighterFeatures = {
      slpm: fighter2.slpm,
      strikingAccuracy: fighter2.strikingAccuracy,
      sapm: fighter2.sapm,
      strikingDefense: fighter2.strikingDefense,
      takedownAvg: fighter2.takedownAvg,
      takedownAccuracy: fighter2.takedownAccuracy,
      takedownDefense: fighter2.takedownDefense,
      submissionAvg: fighter2.submissionAvg,
      wins: fighter2.wins,
      losses: fighter2.losses,
      draws: fighter2.draws,
      reach: fighter2.reach || 0,
    };
    rawFeatures = engineerFeatures(f1, f2);
    prob1 = predictEnsemble(m, rawFeatures);
  } else {
    // Legacy v1: simple LR with basic features
    rawFeatures = buildLegacyFeatures(fighter1, fighter2);
    const normalized = rawFeatures.map((val, i) =>
      (val - m.logisticRegression.means[i]) / m.logisticRegression.stds[i]
    );
    let z = m.logisticRegression.bias;
    for (let i = 0; i < normalized.length; i++) {
      z += m.logisticRegression.weights[i] * normalized[i];
    }
    prob1 = sigmoid(z);
  }

  const prob2 = 1 - prob1;
  const winner = prob1 >= 0.5 ? fighter1 : fighter2;
  const loser = prob1 >= 0.5 ? fighter2 : fighter1;
  const winProb = Math.max(prob1, prob2);
  const loseProb = Math.min(prob1, prob2);

  // Determine method based on fighter stats + base rates
  const strikerAdvantage = Math.abs(fighter1.slpm - fighter2.slpm) +
    Math.abs(fighter1.strikingAccuracy - fighter2.strikingAccuracy) / 10;
  const grappleAdvantage = Math.abs(fighter1.takedownAvg - fighter2.takedownAvg) +
    Math.abs(fighter1.submissionAvg - fighter2.submissionAvg);

  let koProb = m.methodProbs.ko_tko;
  let subProb = m.methodProbs.submission;
  let decProb = m.methodProbs.decision;

  // Adjust based on fighter matchup
  if (strikerAdvantage > grappleAdvantage) {
    koProb *= 1.3;
    subProb *= 0.7;
  } else if (grappleAdvantage > strikerAdvantage) {
    subProb *= 1.3;
    koProb *= 0.7;
  }

  // If close fight, decision more likely
  if (winProb < 0.6) {
    decProb *= 1.4;
    koProb *= 0.8;
    subProb *= 0.8;
  }

  const totalMethodProb = koProb + subProb + decProb;
  koProb /= totalMethodProb;
  subProb /= totalMethodProb;
  decProb /= totalMethodProb;

  const methods = [
    { method: 'KO/TKO', probability: Math.round(koProb * 100) / 100 },
    { method: 'Submission', probability: Math.round(subProb * 100) / 100 },
    { method: 'Decision', probability: Math.round(decProb * 100) / 100 },
  ].sort((a, b) => b.probability - a.probability);

  const predictedMethod = methods[0].method;

  // Predict round
  let predictedRound = 3;
  if (predictedMethod === 'Decision') {
    predictedRound = 3;
  } else {
    const winnerStats = prob1 >= 0.5 ? fighter1 : fighter2;
    const finishPower = winnerStats.slpm + winnerStats.submissionAvg * 2;
    if (winProb > 0.75 && finishPower > 6) {
      predictedRound = 1;
    } else if (winProb > 0.65 || finishPower > 5) {
      predictedRound = 2;
    } else {
      predictedRound = 3;
    }
  }

  // Confidence — direct mapping of win probability to percentage
  const confidence = Math.round(winProb * 100);

  // Top factors
  const factorLabels: Record<string, string> = {
    slpm_diff: 'Striking Volume',
    str_acc_diff: 'Striking Accuracy',
    sapm_diff: 'Strikes Absorbed',
    str_def_diff: 'Striking Defense',
    td_avg_diff: 'Takedown Frequency',
    td_acc_diff: 'Takedown Accuracy',
    td_def_diff: 'Takedown Defense',
    sub_avg_diff: 'Submission Game',
    wins_diff: 'Win Record',
    losses_diff: 'Loss Record',
    reach_diff: 'Reach Advantage',
    win_rate_diff: 'Win Rate',
    total_fights_diff: 'Experience',
    log_exp_diff: 'Experience Level',
    draws_diff: 'Draw Record',
    eff_striking_diff: 'Effective Striking',
    net_striking_diff: 'Net Striking Output',
    damage_ratio_diff: 'Damage Efficiency',
    eff_takedown_diff: 'Effective Takedowns',
    ground_control_diff: 'Ground Control',
    defense_composite_diff: 'Overall Defense',
    expected_strikes_diff: 'Matchup Striking Edge',
    expected_td_diff: 'Matchup Grappling Edge',
    striking_interaction: 'Striking Dominance',
    td_interaction: 'Takedown Dominance',
    style_matchup: 'Style Matchup',
    offensive_output_diff: 'Total Offensive Output',
    // Legacy feature names
    slpm: 'Striking Volume',
    striking_accuracy: 'Striking Accuracy',
    sapm: 'Strikes Absorbed',
    striking_defense: 'Striking Defense',
    takedown_avg: 'Takedown Frequency',
    takedown_accuracy: 'Takedown Accuracy',
    takedown_defense: 'Takedown Defense',
    submission_avg: 'Submission Game',
    wins: 'Win Record',
    losses: 'Loss Record',
    reach: 'Reach Advantage',
  };

  const factorDetails: { factor: string; description: string; impact: string; absContrib: number; direction: 'positive' | 'negative' }[] = [];

  // For v2 models, use feature importance from the model
  if (m.version >= 2) {
    for (let i = 0; i < m.featureNames.length; i++) {
      const featureName = m.featureNames[i];
      const label = factorLabels[featureName] || featureName;
      const diff = rawFeatures[i];
      if (Math.abs(diff) < 0.01) continue;

      // Use importance from model as weight for contribution
      const importance = m.featureImportance.find(f => f.name === featureName)?.importance || 0;
      const contribution = importance * Math.abs(diff);
      const adv = diff > 0 ? fighter1.name : fighter2.name;

      factorDetails.push({
        factor: label,
        description: `${adv} has the edge in ${label.toLowerCase()} (diff: ${Math.abs(diff).toFixed(2)})`,
        impact: contribution > 0.05 ? 'high' : contribution > 0.02 ? 'medium' : 'low',
        absContrib: contribution,
        direction: adv === winner.name ? 'positive' : 'negative',
      });
    }
  } else {
    // Legacy: use LR weights
    for (let i = 0; i < m.featureNames.length; i++) {
      const featureName = m.featureNames[i];
      const label = factorLabels[featureName] || featureName;
      const diff = rawFeatures[i];
      if (Math.abs(diff) < 0.01) continue;

      const normalized = (diff - m.logisticRegression.means[i]) / m.logisticRegression.stds[i];
      const contribution = Math.abs(m.logisticRegression.weights[i] * normalized);
      const adv = diff > 0 ? fighter1.name : fighter2.name;

      factorDetails.push({
        factor: label,
        description: `${adv} has the edge in ${label.toLowerCase()} (difference: ${Math.abs(diff).toFixed(1)})`,
        impact: contribution > 0.3 ? 'high' : contribution > 0.15 ? 'medium' : 'low',
        absContrib: contribution,
        direction: adv === winner.name ? 'positive' : 'negative',
      });
    }
  }

  factorDetails.sort((a, b) => b.absContrib - a.absContrib);
  const topFactors = factorDetails.slice(0, 5).map(({ factor, description, impact, absContrib, direction }) => ({
    factor, description, impact, absContrib, direction,
  }));

  if (topFactors.length === 0) {
    topFactors.push({
      factor: 'Even Matchup',
      description: 'Very closely matched fighters with similar statistical profiles',
      impact: 'medium',
      absContrib: 0,
      direction: 'positive' as const,
    });
  }

  return {
    winner: winner.name,
    loser: loser.name,
    winnerProbability: Math.round(winProb * 1000) / 1000,
    loserProbability: Math.round(loseProb * 1000) / 1000,
    predictedMethod,
    methodProbabilities: methods,
    predictedRound,
    confidence,
    topFactors,
  };
}
