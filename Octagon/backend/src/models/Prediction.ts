import mongoose, { Document, Schema } from 'mongoose';

export interface IPrediction extends Document {
  userId: mongoose.Types.ObjectId;
  fighter1Id: mongoose.Types.ObjectId;
  fighter2Id: mongoose.Types.ObjectId;
  fighter1Name: string;
  fighter2Name: string;
  predictedWinner: string;
  winProbability: number;
  method: 'KO/TKO' | 'Submission' | 'Decision' | 'Draw';
  predictedRound: number;
  confidence: number;
  factors: string[];
  createdAt: Date;
}

const predictionSchema = new Schema<IPrediction>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  fighter1Id: { type: Schema.Types.ObjectId, ref: 'Fighter', required: true },
  fighter2Id: { type: Schema.Types.ObjectId, ref: 'Fighter', required: true },
  fighter1Name: { type: String, required: true },
  fighter2Name: { type: String, required: true },
  predictedWinner: { type: String, required: true },
  winProbability: { type: Number, required: true },
  method: { type: String, enum: ['KO/TKO', 'Submission', 'Decision', 'Draw'], required: true },
  predictedRound: { type: Number, default: 0 },
  confidence: { type: Number, required: true },
  factors: [{ type: String }],
}, { timestamps: true });

export const Prediction = mongoose.model<IPrediction>('Prediction', predictionSchema);
