import mongoose, { Document, Schema } from 'mongoose';

export interface IStrategyRating {
  category: string;
  rating: 'HIGH' | 'MEDIUM' | 'LOW';
  detail: string;
}

export interface IRoundStrategy {
  round: number;
  approach: 'aggressive' | 'patient' | 'defensive';
  tactics: string[];
  riskLevel: 'high' | 'medium' | 'low';
  notes: string;
}

export interface IRangeData {
  fighter1Score: number;
  fighter2Score: number;
  recommendation: string;
}

export interface IStrikeZone {
  opponentDefense: number;
  recommendation: string;
  priority: 'primary' | 'secondary' | 'low';
}

export interface IDangerZone {
  threat: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  detail: string;
}

export interface ICornerRound {
  round: number;
  advice: string[];
}

export interface IStrategy extends Document {
  coachId: mongoose.Types.ObjectId;
  fighter1Name: string;
  fighter2Name: string;
  fighter1Id: mongoose.Types.ObjectId;
  fighter2Id: mongoose.Types.ObjectId;

  prediction: {
    winner: string;
    winProbability: number;
    method: string;
    round: number;
    confidence: number;
    topFactors: { factor: string; description: string; impact: string }[];
  };

  strengthsWeaknesses: {
    fighter1: IStrategyRating[];
    fighter2: IStrategyRating[];
  };

  roundStrategy: IRoundStrategy[];

  rangeAnalysis: {
    distance: IRangeData;
    clinch: IRangeData;
    ground: IRangeData;
    bestRange: string;
  };

  strikeTargeting: {
    head: IStrikeZone;
    body: IStrikeZone;
    legs: IStrikeZone;
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

  dangerZones: IDangerZone[];

  cornerAdvice: ICornerRound[];

  createdAt: Date;
  updatedAt: Date;
}

const strategyRatingSchema = new Schema(
  { category: String, rating: String, detail: String },
  { _id: false }
);

const roundStrategySchema = new Schema(
  {
    round: Number,
    approach: String,
    tactics: [String],
    riskLevel: String,
    notes: String,
  },
  { _id: false }
);

const rangeDataSchema = new Schema(
  { fighter1Score: Number, fighter2Score: Number, recommendation: String },
  { _id: false }
);

const strikeZoneSchema = new Schema(
  { opponentDefense: Number, recommendation: String, priority: String },
  { _id: false }
);

const dangerZoneSchema = new Schema(
  { threat: String, severity: String, detail: String },
  { _id: false }
);

const cornerRoundSchema = new Schema(
  { round: Number, advice: [String] },
  { _id: false }
);

const strategySchema = new Schema<IStrategy>(
  {
    coachId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fighter1Name: { type: String, required: true },
    fighter2Name: { type: String, required: true },
    fighter1Id: { type: Schema.Types.ObjectId, ref: 'Fighter', required: true },
    fighter2Id: { type: Schema.Types.ObjectId, ref: 'Fighter', required: true },

    prediction: {
      winner: String,
      winProbability: Number,
      method: String,
      round: Number,
      confidence: Number,
      topFactors: [{ factor: String, description: String, impact: String }],
    },

    strengthsWeaknesses: {
      fighter1: [strategyRatingSchema],
      fighter2: [strategyRatingSchema],
    },

    roundStrategy: [roundStrategySchema],

    rangeAnalysis: {
      distance: rangeDataSchema,
      clinch: rangeDataSchema,
      ground: rangeDataSchema,
      bestRange: String,
    },

    strikeTargeting: {
      head: strikeZoneSchema,
      body: strikeZoneSchema,
      legs: strikeZoneSchema,
      primaryTarget: String,
    },

    takedownPlan: {
      yourTdAccuracy: Number,
      opponentTdDefense: Number,
      opponentTdAccuracy: Number,
      yourTdDefense: Number,
      verdict: String,
      details: String,
    },

    dangerZones: [dangerZoneSchema],

    cornerAdvice: [cornerRoundSchema],
  },
  { timestamps: true }
);

strategySchema.index({ coachId: 1, createdAt: -1 });

export const Strategy = mongoose.model<IStrategy>('Strategy', strategySchema);
