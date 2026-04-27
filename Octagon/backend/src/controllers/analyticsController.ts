import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

type JsonRecord = Record<string, unknown>;

interface FeatureImportanceRaw {
  name: string;
  importance: number;
  lrWeight: number;
}

interface FeatureImportanceItem extends FeatureImportanceRaw {
  displayName: string;
}

interface ModelWeightsData {
  featureImportance?: FeatureImportanceRaw[];
  trainingStats?: JsonRecord;
  ensembleWeights?: JsonRecord;
}

const FEATURE_DISPLAY_MAP: Record<string, string> = {
  win_rate_diff: 'Win Rate Difference',
  expected_td_diff: 'Expected Takedown Diff',
  net_striking_diff: 'Net Striking Difference',
  reach_diff: 'Reach Advantage',
  log_exp_diff: 'Experience (log)',
  defense_composite_diff: 'Defense Composite',
  wins_diff: 'Wins Difference',
  td_avg_diff: 'Takedown Average Diff',
  slpm_diff: 'Strikes Landed/Min Diff',
  str_acc_diff: 'Striking Accuracy Diff',
  sapm_diff: 'Strikes Absorbed/Min Diff',
  str_def_diff: 'Striking Defense Diff',
  td_acc_diff: 'Takedown Accuracy Diff',
  td_def_diff: 'Takedown Defense Diff',
  sub_avg_diff: 'Submission Avg Diff',
  losses_diff: 'Losses Difference',
  total_fights_diff: 'Total Fights Diff',
  draws_diff: 'Draws Difference',
  eff_striking_diff: 'Effective Striking Diff',
  damage_ratio_diff: 'Damage Ratio Diff',
  eff_takedown_diff: 'Effective Takedown Diff',
  ground_control_diff: 'Ground Control Diff',
  expected_strikes_diff: 'Expected Strikes Diff',
  striking_interaction: 'Striking Interaction',
  td_interaction: 'Takedown Interaction',
  style_matchup: 'Style Matchup',
  offensive_output_diff: 'Offensive Output Diff',
};

let analyticsSummaryCache: JsonRecord | null = null;

function toTitleCase(value: string): string {
  return value
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function fallbackDisplayName(featureName: string): string {
  const normalized = featureName
    .replace(/_diff$/, ' difference')
    .replace(/_/g, ' ');

  return toTitleCase(normalized);
}

function mapAndSortFeatureImportance(features: FeatureImportanceRaw[]): FeatureImportanceItem[] {
  return [...features]
    .sort((a, b) => b.importance - a.importance)
    .map((feature) => ({
      ...feature,
      displayName: FEATURE_DISPLAY_MAP[feature.name] ?? fallbackDisplayName(feature.name),
    }));
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

function loadAnalyticsSummary(): JsonRecord {
  if (analyticsSummaryCache) {
    return analyticsSummaryCache;
  }

  const dataDirectory = path.join(__dirname, '../../data');
  const modelWeightsPath = path.join(dataDirectory, 'model-weights.json');
  const analyticsCachePath = path.join(dataDirectory, 'analytics-cache.json');

  const modelWeights = readJsonFile<ModelWeightsData>(modelWeightsPath);
  const featureImportance = mapAndSortFeatureImportance(modelWeights.featureImportance ?? []);

  let analyticsCacheData: JsonRecord = {};
  try {
    analyticsCacheData = readJsonFile<JsonRecord>(analyticsCachePath);
  } catch {
    analyticsCacheData = {};
  }

  analyticsSummaryCache = {
    ...analyticsCacheData,
    featureImportance,
    trainingStats: modelWeights.trainingStats ?? null,
    ensembleWeights: modelWeights.ensembleWeights ?? null,
  };

  return analyticsSummaryCache;
}

export const getAnalyticsSummary = (req: Request, res: Response): void => {
  try {
    const data = loadAnalyticsSummary();
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Analytics summary error:', error);
    res.status(500).json({ success: false, message: 'Analytics unavailable' });
  }
};