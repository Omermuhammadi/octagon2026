import fs from 'fs';
import path from 'path';
import { predict } from '../services/predictionEngine';

type StyleLabel = 'Striker' | 'Grappler' | 'Well-Rounded';

interface FighterRecord {
  name: string;
  wins: number;
  losses: number;
  draws: number;
  weight: string;
  reach: number | null;
  slpm: number;
  strikingAccuracy: number;
  sapm: number;
  strikingDefense: number;
  takedownAvg: number;
  takedownAccuracy: number;
  takedownDefense: number;
  submissionAvg: number;
  weightClass: string | null;
  style: StyleLabel;
}

interface WeightClassAccuracyItem {
  weightClass: string;
  accuracy: number;
  sampleSize: number;
}

const WEIGHT_CLASS_MAP: Record<number, string> = {
  115: 'Strawweight',
  125: 'Flyweight',
  135: 'Bantamweight',
  145: 'Featherweight',
  155: 'Lightweight',
  170: 'Welterweight',
  185: 'Middleweight',
  205: 'Light Heavyweight',
  265: 'Heavyweight',
};

const WEIGHT_CLASS_ORDER: string[] = [
  'Heavyweight',
  'Light Heavyweight',
  'Middleweight',
  'Welterweight',
  'Lightweight',
  'Featherweight',
  'Bantamweight',
  'Flyweight',
  'Strawweight',
];

class RNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed % 2147483647;
    if (this.state <= 0) {
      this.state += 2147483646;
    }
  }

  next(): number {
    this.state = (this.state * 16807) % 2147483647;
    return (this.state - 1) / 2147483646;
  }

  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }

  pickOne<T>(items: T[]): T {
    return items[this.nextInt(items.length)];
  }
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
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split('\n').filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return [];
  }

  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });
    return row;
  });
}

function parseNumber(value: string): number {
  if (!value || value === '--') {
    return 0;
  }
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function parseReach(value: string): number | null {
  if (!value || value === '--') {
    return null;
  }
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseWeightClass(weightValue: string): string | null {
  const weight = parseInt(weightValue, 10);
  if (Number.isNaN(weight)) {
    return null;
  }
  return WEIGHT_CLASS_MAP[weight] ?? null;
}

function computeWinRate(fighter: FighterRecord): number {
  const total = fighter.wins + fighter.losses;
  if (total <= 0) {
    return 0.5;
  }
  return fighter.wins / total;
}

function classifyStyle(fighter: FighterRecord): StyleLabel {
  if (fighter.slpm > 4.0 && fighter.takedownAvg < 1.5) {
    return 'Striker';
  }
  if (fighter.takedownAvg > 2.5 || fighter.submissionAvg > 0.5) {
    return 'Grappler';
  }
  return 'Well-Rounded';
}

function isModelReadyFighter(fighter: FighterRecord): boolean {
  const totalFights = fighter.wins + fighter.losses + fighter.draws;
  const hasMeaningfulStats = fighter.slpm > 0 || fighter.takedownAvg > 0 || fighter.submissionAvg > 0;
  return totalFights >= 3 && hasMeaningfulStats;
}

function mapFighterRow(row: Record<string, string>): FighterRecord {
  const fighter: FighterRecord = {
    name: row.name,
    wins: parseNumber(row.wins),
    losses: parseNumber(row.losses),
    draws: parseNumber(row.draws),
    weight: row.weight,
    reach: parseReach(row.reach),
    slpm: parseNumber(row.slpm),
    strikingAccuracy: parseNumber(row.striking_accuracy),
    sapm: parseNumber(row.sapm),
    strikingDefense: parseNumber(row.striking_defense),
    takedownAvg: parseNumber(row.takedown_avg),
    takedownAccuracy: parseNumber(row.takedown_accuracy),
    takedownDefense: parseNumber(row.takedown_defense),
    submissionAvg: parseNumber(row.submission_avg),
    weightClass: parseWeightClass(row.weight),
    style: 'Well-Rounded',
  };

  fighter.style = classifyStyle(fighter);
  return fighter;
}

function sampleDistinctPair<T>(items: T[], rng: RNG): [T, T] {
  const firstIndex = rng.nextInt(items.length);
  let secondIndex = rng.nextInt(items.length);
  while (secondIndex === firstIndex) {
    secondIndex = rng.nextInt(items.length);
  }
  return [items[firstIndex], items[secondIndex]];
}

function computeWeightClassAccuracy(fighters: FighterRecord[], rng: RNG): WeightClassAccuracyItem[] {
  const byWeightClass = new Map<string, FighterRecord[]>();
  fighters.forEach((fighter) => {
    if (!fighter.weightClass) {
      return;
    }
    const list = byWeightClass.get(fighter.weightClass) ?? [];
    list.push(fighter);
    byWeightClass.set(fighter.weightClass, list);
  });

  const results: WeightClassAccuracyItem[] = [];
  WEIGHT_CLASS_ORDER.forEach((weightClass) => {
    const classFighters = byWeightClass.get(weightClass) ?? [];
    if (classFighters.length < 2) {
      results.push({ weightClass, accuracy: 0, sampleSize: 0 });
      return;
    }

    const targetSamples = Math.min(200, classFighters.length * 4);
    let correct = 0;
    let used = 0;
    let attempts = 0;
    const maxAttempts = targetSamples * 8;

    while (used < targetSamples && attempts < maxAttempts) {
      attempts++;
      const [fighterA, fighterB] = sampleDistinctPair(classFighters, rng);
      const winRateA = computeWinRate(fighterA);
      const winRateB = computeWinRate(fighterB);

      if (Math.abs(winRateA - winRateB) < 0.001) {
        continue;
      }

      const proxyWinnerName = winRateA > winRateB ? fighterA.name : fighterB.name;
      const prediction = predict(fighterA, fighterB);

      if (prediction.winner === proxyWinnerName) {
        correct++;
      }

      used++;
    }

    results.push({
      weightClass,
      accuracy: used > 0 ? Number((correct / used).toFixed(4)) : 0,
      sampleSize: used,
    });
  });

  return results;
}

function computeStyleMatrix(fighters: FighterRecord[], rng: RNG): Record<string, Record<string, number>> {
  const styles: StyleLabel[] = ['Striker', 'Grappler', 'Well-Rounded'];
  const grouped: Record<StyleLabel, FighterRecord[]> = {
    Striker: [],
    Grappler: [],
    'Well-Rounded': [],
  };

  fighters.forEach((fighter) => {
    grouped[fighter.style].push(fighter);
  });

  const matrix: Record<string, Record<string, number>> = {
    Striker: {},
    Grappler: {},
    'Well-Rounded': {},
  };

  styles.forEach((attackerStyle) => {
    styles.forEach((defenderStyle) => {
      if (attackerStyle === defenderStyle) {
        matrix[attackerStyle][defenderStyle] = 0.5;
        return;
      }

      const attackers = grouped[attackerStyle];
      const defenders = grouped[defenderStyle];

      if (attackers.length === 0 || defenders.length === 0) {
        matrix[attackerStyle][defenderStyle] = 0.5;
        return;
      }

      const targetSamples = Math.min(100, attackers.length * defenders.length);
      let attackerWins = 0;

      for (let i = 0; i < targetSamples; i++) {
        const attacker = rng.pickOne(attackers);
        const defender = rng.pickOne(defenders);
        if (attacker.name === defender.name) {
          continue;
        }

        const prediction = predict(attacker, defender);
        if (prediction.winner === attacker.name) {
          attackerWins++;
        }
      }

      const rate = targetSamples > 0 ? attackerWins / targetSamples : 0.5;
      matrix[attackerStyle][defenderStyle] = Number(rate.toFixed(4));
    });
  });

  return matrix;
}

function main(): void {
  const rootDataDir = path.join(process.cwd(), 'data');
  const fallbackDataDir = path.join(__dirname, '../../data');
  const dataDir = fs.existsSync(rootDataDir) ? rootDataDir : fallbackDataDir;

  const fightersCsvPath = path.join(dataDir, 'fighters.csv');
  if (!fs.existsSync(fightersCsvPath)) {
    throw new Error(`fighters.csv not found at ${fightersCsvPath}`);
  }

  const csvContent = fs.readFileSync(fightersCsvPath, 'utf-8');
  const rows = parseCSV(csvContent);
  const fighters = rows.map(mapFighterRow).filter((fighter) => fighter.weightClass && isModelReadyFighter(fighter));

  const rng = new RNG(20260427);

  const weightClassAccuracy = computeWeightClassAccuracy(fighters, rng);
  const styleMatrix = computeStyleMatrix(fighters, rng);

  const analyticsCache = {
    generatedAt: new Date().toISOString(),
    methodology: {
      weightClassAccuracy: 'Model-vs-proxy agreement over sampled in-class fighter pairs using career win-rate as oracle proxy.',
      styleMatrix: 'Model-implied stylistic bias matrix over sampled cross-style pairings. Diagonal fixed at 0.50 for symmetry.',
      samplePolicy: {
        weightClassPairsPerClassMax: 200,
        stylePairsPerMatchupMax: 100,
        rngSeed: 20260427,
      },
    },
    weightClassAccuracy,
    styleMatrix,
    styleClassificationRules: {
      Striker: 'slpm > 4.0 AND takedown_avg < 1.5',
      Grappler: 'takedown_avg > 2.5 OR submission_avg > 0.5',
      WellRounded: 'all others',
    },
  };

  const outputPath = path.join(dataDir, 'analytics-cache.json');
  fs.writeFileSync(outputPath, JSON.stringify(analyticsCache, null, 2));

  console.log('Analytics cache generated successfully.');
  console.log(`Output: ${outputPath}`);
  console.log(`Weight class rows: ${weightClassAccuracy.length}`);
  console.log('Style matrix:', styleMatrix);
}

main();