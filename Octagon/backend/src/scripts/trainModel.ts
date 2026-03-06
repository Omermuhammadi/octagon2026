import fs from 'fs';
import path from 'path';

// ============================================================
// Seeded PRNG for reproducibility
// ============================================================
class RNG {
  private s: number;
  constructor(seed: number) {
    this.s = seed % 2147483647;
    if (this.s <= 0) this.s += 2147483646;
  }
  next(): number {
    this.s = (this.s * 16807) % 2147483647;
    return (this.s - 1) / 2147483646;
  }
  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }
  shuffle<T>(arr: T[]): T[] {
    const r = [...arr];
    for (let i = r.length - 1; i > 0; i--) {
      const j = this.nextInt(i + 1);
      [r[i], r[j]] = [r[j], r[i]];
    }
    return r;
  }
  sample<T>(arr: T[], n: number): T[] {
    return this.shuffle(arr).slice(0, Math.min(n, arr.length));
  }
}

// ============================================================
// CSV Parsing
// ============================================================
function parseCSV(filePath: string): Record<string, string>[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h.trim()] = (values[i] || '').trim(); });
    return row;
  });
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) { result.push(current); current = ''; }
    else current += char;
  }
  result.push(current);
  return result;
}

function parseStrikeStat(val: string): { landed: number; attempted: number } {
  const match = val.match(/(\d+)\s+of\s+(\d+)/);
  if (!match) return { landed: 0, attempted: 0 };
  return { landed: parseInt(match[1]), attempted: parseInt(match[2]) };
}

function parseControlTime(val: string): number {
  const parts = val.split(':');
  if (parts.length !== 2) return 0;
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

// ============================================================
// Math Utilities
// ============================================================
function sigmoid(x: number): number {
  const cx = Math.max(-500, Math.min(500, x));
  return 1 / (1 + Math.exp(-cx));
}

// ============================================================
// Feature Engineering
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

const FEATURE_NAMES: string[] = [
  'slpm_diff', 'str_acc_diff', 'sapm_diff', 'str_def_diff',
  'td_avg_diff', 'td_acc_diff', 'td_def_diff', 'sub_avg_diff',
  'wins_diff', 'losses_diff', 'reach_diff',
  'win_rate_diff', 'total_fights_diff', 'log_exp_diff', 'draws_diff',
  'eff_striking_diff', 'net_striking_diff', 'damage_ratio_diff',
  'eff_takedown_diff', 'ground_control_diff', 'defense_composite_diff',
  'expected_strikes_diff', 'expected_td_diff',
  'striking_interaction', 'td_interaction',
  'style_matchup', 'offensive_output_diff',
];

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

// ============================================================
// Decision Tree for GBT
// ============================================================
type TreeNode = {
  f: number; // featureIndex
  t: number; // threshold
  l: TreeNode | number; // left child or leaf
  r: TreeNode | number; // right child or leaf
};

function predictTree(node: TreeNode | number, x: number[]): number {
  if (typeof node === 'number') return node;
  return x[node.f] <= node.t ? predictTree(node.l, x) : predictTree(node.r, x);
}

function buildTree(
  X: number[][],
  residuals: number[],
  probs: number[],
  indices: number[],
  depth: number,
  maxDepth: number,
  minLeaf: number,
  features: number[]
): TreeNode | number {
  if (depth >= maxDepth || indices.length < minLeaf * 2) {
    return computeLeaf(residuals, probs, indices);
  }

  // Parent variance for gain computation
  let pSum = 0, pSqSum = 0;
  for (const i of indices) { pSum += residuals[i]; pSqSum += residuals[i] * residuals[i]; }
  const parentVar = pSqSum / indices.length - (pSum / indices.length) ** 2;

  let bestGain = 0, bestF = -1, bestT = 0;

  for (const fi of features) {
    // Sort indices by feature value
    const sorted = [...indices].sort((a, b) => X[a][fi] - X[b][fi]);

    let lSum = 0, lSqSum = 0, lCnt = 0;
    let rSum = pSum, rSqSum = pSqSum, rCnt = sorted.length;

    for (let vi = 0; vi < sorted.length - 1; vi++) {
      const idx = sorted[vi];
      const r = residuals[idx];
      lSum += r; lSqSum += r * r; lCnt++;
      rSum -= r; rSqSum -= r * r; rCnt--;

      if (lCnt < minLeaf || rCnt < minLeaf) continue;
      if (X[sorted[vi]][fi] === X[sorted[vi + 1]][fi]) continue;

      const lVar = Math.max(0, lSqSum / lCnt - (lSum / lCnt) ** 2);
      const rVar = Math.max(0, rSqSum / rCnt - (rSum / rCnt) ** 2);
      const gain = parentVar - (lCnt * lVar + rCnt * rVar) / indices.length;

      if (gain > bestGain + 1e-12) {
        bestGain = gain;
        bestF = fi;
        bestT = (X[sorted[vi]][fi] + X[sorted[vi + 1]][fi]) / 2;
      }
    }
  }

  if (bestF === -1) return computeLeaf(residuals, probs, indices);

  const lIdx: number[] = [], rIdx: number[] = [];
  for (const i of indices) {
    if (X[i][bestF] <= bestT) lIdx.push(i); else rIdx.push(i);
  }

  return {
    f: bestF,
    t: bestT,
    l: buildTree(X, residuals, probs, lIdx, depth + 1, maxDepth, minLeaf, features),
    r: buildTree(X, residuals, probs, rIdx, depth + 1, maxDepth, minLeaf, features),
  };
}

function computeLeaf(residuals: number[], probs: number[], indices: number[]): number {
  let num = 0, den = 0;
  for (const i of indices) {
    num += residuals[i];
    den += Math.max(probs[i] * (1 - probs[i]), 1e-10);
  }
  return Math.max(-5, Math.min(5, den === 0 ? 0 : num / den));
}

// ============================================================
// Gradient Boosted Trees Training
// ============================================================
interface GBTModel {
  trees: (TreeNode | number)[];
  initPred: number;
  lr: number;
}

function trainGBT(
  X: number[][], y: number[],
  numTrees: number, maxDepth: number, lr: number,
  minLeaf: number, subsampleRate: number, featureSampleRate: number,
  rng: RNG, verbose: boolean = true
): GBTModel {
  const n = X.length;
  const nf = X[0].length;
  const pos = y.filter(v => v === 1).length;
  const initPred = Math.log(pos / Math.max(n - pos, 1));

  const F: number[] = new Array(n).fill(initPred);
  const residuals: number[] = new Array(n).fill(0);
  const probs: number[] = new Array(n).fill(0);
  const trees: (TreeNode | number)[] = [];

  const numFeatureSample = Math.max(1, Math.floor(nf * featureSampleRate));
  const numRowSample = Math.floor(n * subsampleRate);
  const allFeatures = Array.from({ length: nf }, (_, i) => i);
  const allIndices = Array.from({ length: n }, (_, i) => i);

  for (let t = 0; t < numTrees; t++) {
    for (let i = 0; i < n; i++) {
      probs[i] = sigmoid(F[i]);
      residuals[i] = y[i] - probs[i];
    }

    const featureSubset = rng.sample(allFeatures, numFeatureSample);
    const rowSubset = subsampleRate < 1 ? rng.sample(allIndices, numRowSample) : [...allIndices];

    const tree = buildTree(X, residuals, probs, rowSubset, 0, maxDepth, minLeaf, featureSubset);
    trees.push(tree);

    for (let i = 0; i < n; i++) {
      F[i] += lr * predictTree(tree, X[i]);
    }

    if (verbose && ((t + 1) % 50 === 0 || t === 0 || t === numTrees - 1)) {
      let loss = 0, correct = 0;
      for (let i = 0; i < n; i++) {
        const p = sigmoid(F[i]);
        loss -= y[i] * Math.log(p + 1e-10) + (1 - y[i]) * Math.log(1 - p + 1e-10);
        if ((p >= 0.5 ? 1 : 0) === y[i]) correct++;
      }
      console.log(`  GBT tree ${t + 1}/${numTrees}: loss=${(loss / n).toFixed(4)}, acc=${(correct / n * 100).toFixed(1)}%`);
    }
  }

  return { trees, initPred, lr };
}

function predictGBTProb(model: GBTModel, x: number[]): number {
  let score = model.initPred;
  for (const tree of model.trees) score += model.lr * predictTree(tree, x);
  return sigmoid(score);
}

// ============================================================
// L2-Regularized Logistic Regression
// ============================================================
interface LRModel {
  weights: number[];
  bias: number;
  means: number[];
  stds: number[];
}

function trainLR(
  X: number[][], y: number[],
  learningRate: number, epochs: number, lambda: number,
  verbose: boolean = true
): LRModel {
  const n = X.length, nf = X[0].length;

  // Normalize
  const means = new Array(nf).fill(0);
  const stds = new Array(nf).fill(0);
  for (const x of X) for (let i = 0; i < nf; i++) means[i] += x[i];
  for (let i = 0; i < nf; i++) means[i] /= n;
  for (const x of X) for (let i = 0; i < nf; i++) stds[i] += (x[i] - means[i]) ** 2;
  for (let i = 0; i < nf; i++) stds[i] = Math.sqrt(stds[i] / n) || 1;

  const Xn = X.map(x => x.map((v, i) => (v - means[i]) / stds[i]));
  const w = new Array(nf).fill(0);
  let b = 0;

  for (let epoch = 0; epoch < epochs; epoch++) {
    const gw = new Array(nf).fill(0);
    let gb = 0, loss = 0;

    for (let j = 0; j < n; j++) {
      let z = b;
      for (let i = 0; i < nf; i++) z += w[i] * Xn[j][i];
      const p = sigmoid(z);
      const err = p - y[j];
      loss -= y[j] * Math.log(p + 1e-10) + (1 - y[j]) * Math.log(1 - p + 1e-10);
      for (let i = 0; i < nf; i++) gw[i] += err * Xn[j][i];
      gb += err;
    }

    for (let i = 0; i < nf; i++) w[i] -= learningRate * (gw[i] / n + lambda * w[i]);
    b -= learningRate * gb / n;

    if (verbose && (epoch % 500 === 0 || epoch === epochs - 1)) {
      let correct = 0;
      for (let j = 0; j < n; j++) {
        let z = b;
        for (let i = 0; i < nf; i++) z += w[i] * Xn[j][i];
        if ((sigmoid(z) >= 0.5 ? 1 : 0) === y[j]) correct++;
      }
      console.log(`  LR epoch ${epoch}/${epochs}: loss=${(loss / n).toFixed(4)}, acc=${(correct / n * 100).toFixed(1)}%`);
    }
  }

  return { weights: w, bias: b, means, stds };
}

function predictLRProb(model: LRModel, x: number[]): number {
  let z = model.bias;
  for (let i = 0; i < x.length; i++) {
    z += model.weights[i] * ((x[i] - model.means[i]) / model.stds[i]);
  }
  return sigmoid(z);
}

// ============================================================
// Metrics
// ============================================================
function computeMetrics(preds: number[], actuals: number[]) {
  let tp = 0, fp = 0, fn = 0, tn = 0;
  for (let i = 0; i < preds.length; i++) {
    if (preds[i] === 1 && actuals[i] === 1) tp++;
    else if (preds[i] === 1 && actuals[i] === 0) fp++;
    else if (preds[i] === 0 && actuals[i] === 1) fn++;
    else tn++;
  }
  const accuracy = (tp + tn) / Math.max(tp + fp + fn + tn, 1);
  const precision = tp / Math.max(tp + fp, 1);
  const recall = tp / Math.max(tp + fn, 1);
  const f1 = 2 * precision * recall / Math.max(precision + recall, 1e-10);
  return { accuracy, precision, recall, f1, tp, fp, fn, tn };
}

// ============================================================
// Main Training
// ============================================================
function train() {
  const rng = new RNG(42);
  console.log('========================================');
  console.log('  Octagon Oracle - Advanced ML Training');
  console.log('========================================\n');

  // Load data
  console.log('Loading CSV data...');
  const dataDir = path.join(__dirname, '..', '..', 'data');
  const fighters = parseCSV(path.join(dataDir, 'fighters.csv'));
  const fightStats = parseCSV(path.join(dataDir, 'fightstats.csv'));
  console.log(`Loaded ${fighters.length} fighters, ${fightStats.length} fight stat records`);

  // Build fighter lookup
  const fighterMap = new Map<string, Record<string, string>>();
  for (const f of fighters) fighterMap.set(f.name.toLowerCase(), f);

  // Group fight stats by fight_id
  const fightGroups = new Map<string, Record<string, string>[]>();
  for (const stat of fightStats) {
    const fid = stat.fight_id;
    if (!fightGroups.has(fid)) fightGroups.set(fid, []);
    fightGroups.get(fid)!.push(stat);
  }
  console.log(`Found ${fightGroups.size} unique fights\n`);

  // Build training data
  console.log('Engineering features (27 features per sample)...');
  const X: number[][] = [];
  const y: number[] = [];
  const methodCounts = { ko: 0, submission: 0, decision: 0 };
  const roundCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let skipped = 0;

  for (const [, stats] of fightGroups) {
    if (stats.length !== 2) { skipped++; continue; }
    const f1Stat = stats.find(s => s.fighter_position === '1');
    const f2Stat = stats.find(s => s.fighter_position === '2');
    if (!f1Stat || !f2Stat) { skipped++; continue; }

    const f1Career = fighterMap.get(f1Stat.fighter_name.toLowerCase());
    const f2Career = fighterMap.get(f2Stat.fighter_name.toLowerCase());
    if (!f1Career || !f2Career) { skipped++; continue; }

    // Determine winner from fight stats
    const f1Sig = parseStrikeStat(f1Stat.sig_strikes);
    const f2Sig = parseStrikeStat(f2Stat.sig_strikes);
    const f1TD = parseStrikeStat(f1Stat.takedowns);
    const f2TD = parseStrikeStat(f2Stat.takedowns);
    const f1Kd = parseInt(f1Stat.knockdowns) || 0;
    const f2Kd = parseInt(f2Stat.knockdowns) || 0;
    const f1Ctrl = parseControlTime(f1Stat.control_time);
    const f2Ctrl = parseControlTime(f2Stat.control_time);
    const f1Sub = parseInt(f1Stat.submission_attempts) || 0;
    const f2Sub = parseInt(f2Stat.submission_attempts) || 0;

    let f1Score = 0, f2Score = 0;
    f1Score += f1Kd * 3; f2Score += f2Kd * 3;
    f1Score += f1Sig.landed * 0.1; f2Score += f2Sig.landed * 0.1;
    f1Score += f1TD.landed * 1.5; f2Score += f2TD.landed * 1.5;
    f1Score += f1Ctrl * 0.01; f2Score += f2Ctrl * 0.01;
    f1Score += f1Sub * 1; f2Score += f2Sub * 1;

    if (Math.abs(f1Score - f2Score) < 0.01) { skipped++; continue; }
    const f1Won = f1Score > f2Score ? 1 : 0;

    // Method classification
    if (f1Kd > 0 || f2Kd > 0) methodCounts.ko++;
    else if (f1Sub > 0 || f2Sub > 0) methodCounts.submission++;
    else methodCounts.decision++;

    // Round estimation
    const totalOutput = f1Sig.landed + f2Sig.landed + f1TD.landed + f2TD.landed;
    if (totalOutput < 30) roundCounts[1]++;
    else if (totalOutput < 60) roundCounts[2]++;
    else if (totalOutput < 100) roundCounts[3]++;
    else if (totalOutput < 150) roundCounts[4]++;
    else roundCounts[5] = (roundCounts[5] || 0) + 1;

    // Build feature objects from career stats
    const f1Features: FighterFeatures = {
      slpm: parseFloat(f1Career.slpm) || 0,
      strikingAccuracy: parseFloat(f1Career.striking_accuracy) || 0,
      sapm: parseFloat(f1Career.sapm) || 0,
      strikingDefense: parseFloat(f1Career.striking_defense) || 0,
      takedownAvg: parseFloat(f1Career.takedown_avg) || 0,
      takedownAccuracy: parseFloat(f1Career.takedown_accuracy) || 0,
      takedownDefense: parseFloat(f1Career.takedown_defense) || 0,
      submissionAvg: parseFloat(f1Career.submission_avg) || 0,
      wins: parseInt(f1Career.wins) || 0,
      losses: parseInt(f1Career.losses) || 0,
      draws: parseInt(f1Career.draws) || 0,
      reach: parseFloat(f1Career.reach) || 0,
    };

    const f2Features: FighterFeatures = {
      slpm: parseFloat(f2Career.slpm) || 0,
      strikingAccuracy: parseFloat(f2Career.striking_accuracy) || 0,
      sapm: parseFloat(f2Career.sapm) || 0,
      strikingDefense: parseFloat(f2Career.striking_defense) || 0,
      takedownAvg: parseFloat(f2Career.takedown_avg) || 0,
      takedownAccuracy: parseFloat(f2Career.takedown_accuracy) || 0,
      takedownDefense: parseFloat(f2Career.takedown_defense) || 0,
      submissionAvg: parseFloat(f2Career.submission_avg) || 0,
      wins: parseInt(f2Career.wins) || 0,
      losses: parseInt(f2Career.losses) || 0,
      draws: parseInt(f2Career.draws) || 0,
      reach: parseFloat(f2Career.reach) || 0,
    };

    const features = engineerFeatures(f1Features, f2Features);
    if (features.some(v => !isFinite(v))) { skipped++; continue; }

    X.push(features);
    y.push(f1Won);
  }

  const posCount = y.filter(v => v === 1).length;
  console.log(`Training data: ${X.length} samples (skipped ${skipped})`);
  console.log(`Label distribution: ${posCount} fighter1-wins (${(posCount / X.length * 100).toFixed(1)}%), ${X.length - posCount} fighter2-wins`);
  console.log(`Features per sample: ${FEATURE_NAMES.length}\n`);

  // ========== 5-Fold Cross Validation ==========
  console.log('Running 5-fold Cross-Validation...');
  console.log('='.repeat(50));

  const K = 5;
  const n = X.length;
  const shuffledIdx = rng.shuffle(Array.from({ length: n }, (_, i) => i));
  const foldSize = Math.floor(n / K);

  const cvLRProbs: number[] = new Array(n).fill(0);
  const cvGBTProbs: number[] = new Array(n).fill(0);
  const cvLabels: number[] = new Array(n).fill(0);

  for (let fold = 0; fold < K; fold++) {
    const testStart = fold * foldSize;
    const testEnd = fold === K - 1 ? n : (fold + 1) * foldSize;
    const testIdx = shuffledIdx.slice(testStart, testEnd);
    const trainIdx = [...shuffledIdx.slice(0, testStart), ...shuffledIdx.slice(testEnd)];

    const Xtrain = trainIdx.map(i => X[i]);
    const ytrain = trainIdx.map(i => y[i]);
    const Xtest = testIdx.map(i => X[i]);
    const ytest = testIdx.map(i => y[i]);

    console.log(`\nFold ${fold + 1}/${K}: train=${trainIdx.length}, test=${testIdx.length}`);

    console.log('  Training Logistic Regression...');
    const lrModel = trainLR(Xtrain, ytrain, 0.01, 2000, 0.01, false);

    console.log('  Training Gradient Boosted Trees...');
    const gbtModel = trainGBT(Xtrain, ytrain, 150, 3, 0.08, 20, 0.8, 0.7, new RNG(42 + fold), false);

    // Predict on test set
    for (let ti = 0; ti < testIdx.length; ti++) {
      const globalIdx = testIdx[ti];
      cvLRProbs[globalIdx] = predictLRProb(lrModel, Xtest[ti]);
      cvGBTProbs[globalIdx] = predictGBTProb(gbtModel, Xtest[ti]);
      cvLabels[globalIdx] = ytest[ti];
    }

    // Fold-level metrics
    const foldLRPreds = Xtest.map((x) => predictLRProb(lrModel, x) >= 0.5 ? 1 : 0);
    const foldGBTPreds = Xtest.map((x) => predictGBTProb(gbtModel, x) >= 0.5 ? 1 : 0);
    const lrAcc = foldLRPreds.filter((p, i) => p === ytest[i]).length / ytest.length;
    const gbtAcc = foldGBTPreds.filter((p, i) => p === ytest[i]).length / ytest.length;
    console.log(`  Fold ${fold + 1} results: LR=${(lrAcc * 100).toFixed(1)}%, GBT=${(gbtAcc * 100).toFixed(1)}%`);
  }

  // Find best ensemble weight
  console.log('\nOptimizing ensemble weights...');
  let bestEnsAcc = 0, bestW = 0;
  for (let w = 0; w <= 100; w += 5) {
    const wLR = w / 100;
    let correct = 0;
    for (let i = 0; i < n; i++) {
      const p = wLR * cvLRProbs[i] + (1 - wLR) * cvGBTProbs[i];
      if ((p >= 0.5 ? 1 : 0) === cvLabels[i]) correct++;
    }
    const acc = correct / n;
    if (acc > bestEnsAcc) { bestEnsAcc = acc; bestW = wLR; }
  }
  console.log(`Best ensemble: LR weight=${bestW.toFixed(2)}, GBT weight=${(1 - bestW).toFixed(2)}`);

  // Cross-validation metrics for each model
  const lrCVPreds = cvLRProbs.map(p => p >= 0.5 ? 1 : 0);
  const gbtCVPreds = cvGBTProbs.map(p => p >= 0.5 ? 1 : 0);
  const ensCVPreds = cvLRProbs.map((p, i) => (bestW * p + (1 - bestW) * cvGBTProbs[i]) >= 0.5 ? 1 : 0);

  const lrMetrics = computeMetrics(lrCVPreds, cvLabels);
  const gbtMetrics = computeMetrics(gbtCVPreds, cvLabels);
  const ensMetrics = computeMetrics(ensCVPreds, cvLabels);

  console.log('\n' + '='.repeat(50));
  console.log('CROSS-VALIDATION RESULTS (held-out predictions):');
  console.log('-'.repeat(50));
  console.log(`  LR:       Acc=${(lrMetrics.accuracy * 100).toFixed(1)}%  P=${(lrMetrics.precision * 100).toFixed(1)}%  R=${(lrMetrics.recall * 100).toFixed(1)}%  F1=${(lrMetrics.f1 * 100).toFixed(1)}%`);
  console.log(`  GBT:      Acc=${(gbtMetrics.accuracy * 100).toFixed(1)}%  P=${(gbtMetrics.precision * 100).toFixed(1)}%  R=${(gbtMetrics.recall * 100).toFixed(1)}%  F1=${(gbtMetrics.f1 * 100).toFixed(1)}%`);
  console.log(`  Ensemble: Acc=${(ensMetrics.accuracy * 100).toFixed(1)}%  P=${(ensMetrics.precision * 100).toFixed(1)}%  R=${(ensMetrics.recall * 100).toFixed(1)}%  F1=${(ensMetrics.f1 * 100).toFixed(1)}%`);
  console.log(`\n  Confusion Matrix (Ensemble):`);
  console.log(`    Predicted Positive | TP=${ensMetrics.tp}  FP=${ensMetrics.fp}`);
  console.log(`    Predicted Negative | FN=${ensMetrics.fn}  TN=${ensMetrics.tn}`);
  console.log('='.repeat(50));

  // ========== Train Final Models on ALL Data ==========
  console.log('\nTraining final models on ALL data...\n');

  console.log('Training Final Logistic Regression (2500 epochs)...');
  const finalLR = trainLR(X, y, 0.01, 2500, 0.01);

  console.log('\nTraining Final Gradient Boosted Trees (200 trees, depth 4)...');
  const finalGBT = trainGBT(X, y, 200, 4, 0.06, 20, 0.8, 0.7, new RNG(42));

  // Final training accuracy
  let lrCorr = 0, gbtCorr = 0, ensCorr = 0;
  for (let i = 0; i < n; i++) {
    const lrP = predictLRProb(finalLR, X[i]);
    const gbtP = predictGBTProb(finalGBT, X[i]);
    const ensP = bestW * lrP + (1 - bestW) * gbtP;
    if ((lrP >= 0.5 ? 1 : 0) === y[i]) lrCorr++;
    if ((gbtP >= 0.5 ? 1 : 0) === y[i]) gbtCorr++;
    if ((ensP >= 0.5 ? 1 : 0) === y[i]) ensCorr++;
  }
  console.log(`\nFinal Training Accuracy:`);
  console.log(`  LR:       ${(lrCorr / n * 100).toFixed(1)}%`);
  console.log(`  GBT:      ${(gbtCorr / n * 100).toFixed(1)}%`);
  console.log(`  Ensemble: ${(ensCorr / n * 100).toFixed(1)}%`);

  // ========== Feature Importance ==========
  const featureSplitCounts = new Array(FEATURE_NAMES.length).fill(0);
  function countSplits(node: TreeNode | number) {
    if (typeof node === 'number') return;
    featureSplitCounts[node.f]++;
    countSplits(node.l);
    countSplits(node.r);
  }
  for (const tree of finalGBT.trees) countSplits(tree);
  const totalSplits = featureSplitCounts.reduce((a: number, b: number) => a + b, 0);

  const featureImportance = FEATURE_NAMES.map((name, i) => ({
    name,
    importance: totalSplits > 0 ? featureSplitCounts[i] / totalSplits : 0,
    lrWeight: finalLR.weights[i],
    splitCount: featureSplitCounts[i],
  })).sort((a, b) => b.importance - a.importance);

  console.log('\nFeature Importance (GBT split frequency):');
  featureImportance.slice(0, 15).forEach(f => {
    const bar = '#'.repeat(Math.round(f.importance * 200));
    console.log(`  ${f.name.padEnd(26)} ${(f.importance * 100).toFixed(1)}% ${bar}`);
  });

  // ========== Method & Round Probabilities ==========
  const totalMethods = methodCounts.ko + methodCounts.submission + methodCounts.decision;
  const methodProbs = {
    ko_tko: methodCounts.ko / totalMethods,
    submission: methodCounts.submission / totalMethods,
    decision: methodCounts.decision / totalMethods,
  };

  const totalRounds = Object.values(roundCounts).reduce((a, b) => a + b, 0);
  const roundProbs: Record<string, number> = {};
  for (const [r, c] of Object.entries(roundCounts)) {
    roundProbs[r] = c / totalRounds;
  }

  // ========== Save Model ==========
  const modelData = {
    version: 2,
    featureNames: FEATURE_NAMES,
    logisticRegression: {
      weights: finalLR.weights,
      bias: finalLR.bias,
      means: finalLR.means,
      stds: finalLR.stds,
    },
    gbt: {
      trees: finalGBT.trees,
      initPred: finalGBT.initPred,
      lr: finalGBT.lr,
    },
    ensembleWeights: { lr: bestW, gbt: 1 - bestW },
    featureImportance: featureImportance.map(f => ({
      name: f.name,
      importance: f.importance,
      lrWeight: f.lrWeight,
    })),
    methodProbs,
    roundProbs,
    trainingStats: {
      samples: n,
      cvAccuracy: ensMetrics.accuracy,
      cvPrecision: ensMetrics.precision,
      cvRecall: ensMetrics.recall,
      cvF1: ensMetrics.f1,
      trainAccuracy: ensCorr / n,
      lrCvAccuracy: lrMetrics.accuracy,
      gbtCvAccuracy: gbtMetrics.accuracy,
      previousAccuracy: 0.707,
      trainedAt: new Date().toISOString(),
    },
  };

  const modelPath = path.join(dataDir, 'model-weights.json');
  fs.writeFileSync(modelPath, JSON.stringify(modelData, null, 2));
  const fileSize = fs.statSync(modelPath).size;
  console.log(`\nModel saved to ${modelPath}`);
  console.log(`File size: ${(fileSize / 1024).toFixed(1)} KB`);

  // ========== Summary ==========
  console.log('\n' + '='.repeat(50));
  console.log('TRAINING SUMMARY');
  console.log('='.repeat(50));
  console.log(`  Previous accuracy (baseline):  70.7%`);
  console.log(`  New CV accuracy (LR):          ${(lrMetrics.accuracy * 100).toFixed(1)}%`);
  console.log(`  New CV accuracy (GBT):         ${(gbtMetrics.accuracy * 100).toFixed(1)}%`);
  console.log(`  New CV accuracy (Ensemble):    ${(ensMetrics.accuracy * 100).toFixed(1)}%`);
  console.log(`  Improvement:                   +${((ensMetrics.accuracy - 0.707) * 100).toFixed(1)} pp`);
  console.log(`  Features:                      ${FEATURE_NAMES.length} (was 11)`);
  console.log(`  Models:                        LR + GBT ensemble`);
  console.log(`  Ensemble weights:              LR=${bestW.toFixed(2)}, GBT=${(1 - bestW).toFixed(2)}`);
  console.log('='.repeat(50));
}

train();
