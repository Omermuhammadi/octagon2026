import fs from 'fs';
import path from 'path';

interface ModelData {
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
  topFactors: { factor: string; description: string; impact: string }[];
}

let model: ModelData | null = null;

function loadModel(): ModelData {
  if (model) return model;
  const modelPath = path.join(__dirname, '..', '..', 'data', 'model-weights.json');
  if (!fs.existsSync(modelPath)) {
    throw new Error('Model not trained yet. Run: npm run train-model');
  }
  model = JSON.parse(fs.readFileSync(modelPath, 'utf-8'));
  return model!;
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
}

export function predict(fighter1: FighterStats, fighter2: FighterStats): PredictionResult {
  const m = loadModel();

  // Build raw features (same order as training)
  const rawFeatures = [
    fighter1.slpm - fighter2.slpm,
    fighter1.strikingAccuracy - fighter2.strikingAccuracy,
    fighter1.sapm - fighter2.sapm,
    fighter1.strikingDefense - fighter2.strikingDefense,
    fighter1.takedownAvg - fighter2.takedownAvg,
    fighter1.takedownAccuracy - fighter2.takedownAccuracy,
    fighter1.takedownDefense - fighter2.takedownDefense,
    fighter1.submissionAvg - fighter2.submissionAvg,
    fighter1.wins - fighter2.wins,
    fighter1.losses - fighter2.losses,
    (fighter1.reach || 0) - (fighter2.reach || 0),
  ];

  // Normalize
  const normalized = rawFeatures.map((val, i) =>
    (val - m.featureMeans[i]) / m.featureStds[i]
  );

  // Predict
  let z = m.bias;
  for (let i = 0; i < normalized.length; i++) {
    z += m.weights[i] * normalized[i];
  }
  const prob1 = sigmoid(z);
  const prob2 = 1 - prob1;

  const winner = prob1 >= 0.5 ? fighter1 : fighter2;
  const loser = prob1 >= 0.5 ? fighter2 : fighter1;
  const winProb = Math.max(prob1, prob2);
  const loseProb = Math.min(prob1, prob2);

  // Determine method based on fighter stats + base rates
  const strikerAdvantage = Math.abs(fighter1.slpm - fighter2.slpm) + Math.abs(fighter1.strikingAccuracy - fighter2.strikingAccuracy) / 10;
  const grappleAdvantage = Math.abs(fighter1.takedownAvg - fighter2.takedownAvg) + Math.abs(fighter1.submissionAvg - fighter2.submissionAvg);

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

  // If close fight, decision is more likely
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
  } else if (winProb > 0.7) {
    predictedRound = Math.random() > 0.5 ? 1 : 2;
  } else {
    predictedRound = Math.random() > 0.5 ? 2 : 3;
  }

  // Confidence is based on how far from 50% the prediction is
  const confidence = Math.round((winProb - 0.5) * 200);

  // Top factors - use feature importance + actual matchup values
  const factorDetails: { factor: string; description: string; impact: string; absContrib: number }[] = [];

  const factorLabels: Record<string, string> = {
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

  for (let i = 0; i < m.featureNames.length; i++) {
    const contribution = Math.abs(m.weights[i] * normalized[i]);
    const diff = rawFeatures[i];
    const adv = diff > 0 ? fighter1.name : fighter2.name;
    const featureName = m.featureNames[i];
    const label = factorLabels[featureName] || featureName;

    if (Math.abs(diff) > 0.01) {
      factorDetails.push({
        factor: label,
        description: `${adv} has the edge in ${label.toLowerCase()} (difference: ${Math.abs(diff).toFixed(1)})`,
        impact: contribution > 0.3 ? 'high' : contribution > 0.15 ? 'medium' : 'low',
        absContrib: contribution,
      });
    }
  }

  factorDetails.sort((a, b) => b.absContrib - a.absContrib);
  const topFactors = factorDetails.slice(0, 3).map(({ factor, description, impact }) => ({
    factor, description, impact,
  }));

  if (topFactors.length === 0) {
    topFactors.push({
      factor: 'Even Matchup',
      description: 'Very closely matched fighters with similar statistical profiles',
      impact: 'medium',
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
