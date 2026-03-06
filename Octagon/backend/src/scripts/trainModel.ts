import fs from 'fs';
import path from 'path';

// ======= CSV Parsing =======
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
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// ======= Parse strike stat like "18 of 61" =======
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

// ======= Sigmoid =======
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
}

// ======= Main Training =======
function train() {
  console.log('Loading CSV data...');
  const dataDir = path.join(__dirname, '..', '..', 'data');

  const fighters = parseCSV(path.join(dataDir, 'fighters.csv'));
  const fightStats = parseCSV(path.join(dataDir, 'fightstats.csv'));
  const events = parseCSV(path.join(dataDir, 'events.csv'));

  console.log(`Loaded ${fighters.length} fighters, ${fightStats.length} fight stat records, ${events.length} events`);

  // Build fighter lookup by name
  const fighterMap = new Map<string, Record<string, string>>();
  for (const f of fighters) {
    fighterMap.set(f.name.toLowerCase(), f);
  }

  // Group fight stats by fight_id
  const fightGroups = new Map<string, Record<string, string>[]>();
  for (const stat of fightStats) {
    const fid = stat.fight_id;
    if (!fightGroups.has(fid)) fightGroups.set(fid, []);
    fightGroups.get(fid)!.push(stat);
  }

  console.log(`Found ${fightGroups.size} fights`);

  // Determine fight outcomes and build training data
  // Winner determination: based on knockdowns, sig strikes landed, control time, takedowns
  const trainingData: { features: number[]; label: number }[] = [];
  let methodCounts = { ko: 0, submission: 0, decision: 0 };
  let roundCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  let processed = 0;
  let skipped = 0;

  for (const [fightId, stats] of fightGroups) {
    if (stats.length !== 2) { skipped++; continue; }

    const f1Stat = stats.find(s => s.fighter_position === '1')!;
    const f2Stat = stats.find(s => s.fighter_position === '2')!;
    if (!f1Stat || !f2Stat) { skipped++; continue; }

    const f1Career = fighterMap.get(f1Stat.fighter_name.toLowerCase());
    const f2Career = fighterMap.get(f2Stat.fighter_name.toLowerCase());
    if (!f1Career || !f2Career) { skipped++; continue; }

    // Determine winner based on fight performance
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

    // Score to determine winner
    let f1Score = 0;
    let f2Score = 0;
    f1Score += f1Kd * 3; f2Score += f2Kd * 3;
    f1Score += f1Sig.landed * 0.1; f2Score += f2Sig.landed * 0.1;
    f1Score += f1TD.landed * 1.5; f2Score += f2TD.landed * 1.5;
    f1Score += f1Ctrl * 0.01; f2Score += f2Ctrl * 0.01;
    f1Score += f1Sub * 1; f2Score += f2Sub * 1;

    if (Math.abs(f1Score - f2Score) < 0.01) { skipped++; continue; }

    const f1Won = f1Score > f2Score ? 1 : 0;

    // Determine method
    if (f1Kd > 0 || f2Kd > 0) {
      methodCounts.ko++;
    } else if (f1Sub > 0 || f2Sub > 0) {
      methodCounts.submission++;
    } else {
      methodCounts.decision++;
    }

    // Estimate round (based on total output)
    const totalOutput = f1Sig.landed + f2Sig.landed + f1TD.landed + f2TD.landed;
    if (totalOutput < 30) roundCounts[1] = (roundCounts[1] || 0) + 1;
    else if (totalOutput < 60) roundCounts[2] = (roundCounts[2] || 0) + 1;
    else if (totalOutput < 100) roundCounts[3] = (roundCounts[3] || 0) + 1;
    else roundCounts[4] = (roundCounts[4] || 0) + 1;

    // Build features: career stat differentials (f1 - f2)
    const features = [
      (parseFloat(f1Career.slpm) || 0) - (parseFloat(f2Career.slpm) || 0),
      (parseFloat(f1Career.striking_accuracy) || 0) - (parseFloat(f2Career.striking_accuracy) || 0),
      (parseFloat(f1Career.sapm) || 0) - (parseFloat(f2Career.sapm) || 0),
      (parseFloat(f1Career.striking_defense) || 0) - (parseFloat(f2Career.striking_defense) || 0),
      (parseFloat(f1Career.takedown_avg) || 0) - (parseFloat(f2Career.takedown_avg) || 0),
      (parseFloat(f1Career.takedown_accuracy) || 0) - (parseFloat(f2Career.takedown_accuracy) || 0),
      (parseFloat(f1Career.takedown_defense) || 0) - (parseFloat(f2Career.takedown_defense) || 0),
      (parseFloat(f1Career.submission_avg) || 0) - (parseFloat(f2Career.submission_avg) || 0),
      (parseInt(f1Career.wins) || 0) - (parseInt(f2Career.wins) || 0),
      (parseInt(f1Career.losses) || 0) - (parseInt(f2Career.losses) || 0),
      (parseFloat(f1Career.reach) || 0) - (parseFloat(f2Career.reach) || 0),
    ];

    trainingData.push({ features, label: f1Won });
    processed++;
  }

  console.log(`Training data: ${processed} samples, skipped: ${skipped}`);

  // Normalize features
  const numFeatures = trainingData[0].features.length;
  const featureMeans: number[] = new Array(numFeatures).fill(0);
  const featureStds: number[] = new Array(numFeatures).fill(0);

  for (const d of trainingData) {
    for (let i = 0; i < numFeatures; i++) {
      featureMeans[i] += d.features[i];
    }
  }
  for (let i = 0; i < numFeatures; i++) featureMeans[i] /= trainingData.length;

  for (const d of trainingData) {
    for (let i = 0; i < numFeatures; i++) {
      featureStds[i] += (d.features[i] - featureMeans[i]) ** 2;
    }
  }
  for (let i = 0; i < numFeatures; i++) {
    featureStds[i] = Math.sqrt(featureStds[i] / trainingData.length) || 1;
  }

  // Normalize
  for (const d of trainingData) {
    for (let i = 0; i < numFeatures; i++) {
      d.features[i] = (d.features[i] - featureMeans[i]) / featureStds[i];
    }
  }

  // Train logistic regression with gradient descent
  const weights: number[] = new Array(numFeatures).fill(0);
  let bias = 0;
  const learningRate = 0.01;
  const epochs = 1000;

  console.log('Training logistic regression...');

  for (let epoch = 0; epoch < epochs; epoch++) {
    let totalLoss = 0;
    const gradW: number[] = new Array(numFeatures).fill(0);
    let gradB = 0;

    for (const d of trainingData) {
      let z = bias;
      for (let i = 0; i < numFeatures; i++) z += weights[i] * d.features[i];
      const pred = sigmoid(z);
      const error = pred - d.label;
      totalLoss += -(d.label * Math.log(pred + 1e-10) + (1 - d.label) * Math.log(1 - pred + 1e-10));

      for (let i = 0; i < numFeatures; i++) gradW[i] += error * d.features[i];
      gradB += error;
    }

    for (let i = 0; i < numFeatures; i++) {
      weights[i] -= learningRate * (gradW[i] / trainingData.length);
    }
    bias -= learningRate * (gradB / trainingData.length);

    if (epoch % 100 === 0) {
      console.log(`  Epoch ${epoch}: loss = ${(totalLoss / trainingData.length).toFixed(4)}`);
    }
  }

  // Calculate accuracy
  let correct = 0;
  for (const d of trainingData) {
    let z = bias;
    for (let i = 0; i < numFeatures; i++) z += weights[i] * d.features[i];
    const pred = sigmoid(z) >= 0.5 ? 1 : 0;
    if (pred === d.label) correct++;
  }
  const accuracy = correct / trainingData.length;
  console.log(`Training accuracy: ${(accuracy * 100).toFixed(1)}%`);

  // Feature importance (absolute weight values)
  const featureNames = [
    'slpm', 'striking_accuracy', 'sapm', 'striking_defense',
    'takedown_avg', 'takedown_accuracy', 'takedown_defense',
    'submission_avg', 'wins', 'losses', 'reach'
  ];
  const featureImportance = featureNames.map((name, i) => ({
    name,
    weight: weights[i],
    absWeight: Math.abs(weights[i])
  })).sort((a, b) => b.absWeight - a.absWeight);

  console.log('\nFeature importance:');
  featureImportance.forEach(f => {
    console.log(`  ${f.name}: ${f.weight.toFixed(4)}`);
  });

  // Compute method probabilities
  const totalMethods = methodCounts.ko + methodCounts.submission + methodCounts.decision;
  const methodProbs = {
    ko_tko: methodCounts.ko / totalMethods,
    submission: methodCounts.submission / totalMethods,
    decision: methodCounts.decision / totalMethods,
  };

  // Compute round probabilities
  const totalRounds = Object.values(roundCounts).reduce((a, b) => a + b, 0);
  const roundProbs: Record<string, number> = {};
  for (const [r, c] of Object.entries(roundCounts)) {
    roundProbs[r] = c / totalRounds;
  }

  // Save model
  const modelData = {
    weights,
    bias,
    featureMeans,
    featureStds,
    featureNames,
    featureImportance: featureImportance.map(f => ({ name: f.name, weight: f.weight })),
    methodProbs,
    roundProbs,
    trainingStats: {
      samples: trainingData.length,
      accuracy,
      trainedAt: new Date().toISOString(),
    },
  };

  const modelPath = path.join(dataDir, 'model-weights.json');
  fs.writeFileSync(modelPath, JSON.stringify(modelData, null, 2));
  console.log(`\nModel saved to ${modelPath}`);
}

train();
