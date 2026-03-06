import mongoose, { Document, Schema } from 'mongoose';

export interface IFighter extends Document {
  url: string;
  name: string;
  nickname: string;
  wins: number;
  losses: number;
  draws: number;
  height: string;
  weight: string;
  reach: number | null;
  stance: string;
  dob: Date | null;
  slpm: number;              // Sig. Strikes Landed Per Min
  strikingAccuracy: number;  // %
  sapm: number;              // Sig. Strikes Absorbed Per Min
  strikingDefense: number;   // %
  takedownAvg: number;       // Takedowns per 15 min
  takedownAccuracy: number;  // %
  takedownDefense: number;   // %
  submissionAvg: number;     // Submissions per 15 min
  scrapedDate: Date;
}

const fighterSchema = new Schema<IFighter>(
  {
    url: { type: String, required: true, unique: true },
    name: { type: String, required: true, index: true },
    nickname: { type: String, default: '' },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    draws: { type: Number, default: 0 },
    height: { type: String, default: '' },
    weight: { type: String, default: '' },
    reach: { type: Number, default: null },
    stance: { type: String, default: '' },
    dob: { type: Date, default: null },
    slpm: { type: Number, default: 0 },
    strikingAccuracy: { type: Number, default: 0 },
    sapm: { type: Number, default: 0 },
    strikingDefense: { type: Number, default: 0 },
    takedownAvg: { type: Number, default: 0 },
    takedownAccuracy: { type: Number, default: 0 },
    takedownDefense: { type: Number, default: 0 },
    submissionAvg: { type: Number, default: 0 },
    scrapedDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Text index for search
fighterSchema.index({ name: 'text', nickname: 'text' });

export const Fighter = mongoose.model<IFighter>('Fighter', fighterSchema);
