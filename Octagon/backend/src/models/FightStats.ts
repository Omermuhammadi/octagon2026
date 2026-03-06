import mongoose, { Document, Schema } from 'mongoose';

export interface IStrikeStat {
  landed: number;
  attempted: number;
}

export interface IFightStats extends Document {
  fightId: string;
  fighterName: string;
  fighterPosition: number;
  knockdowns: number;
  sigStrikes: IStrikeStat;
  sigStrikesPct: number;
  totalStrikes: IStrikeStat;
  takedowns: IStrikeStat;
  takedownPct: number;
  submissionAttempts: number;
  reversals: number;
  controlTime: string;
  sigStrikesHead: IStrikeStat;
  sigStrikesBody: IStrikeStat;
  sigStrikesLeg: IStrikeStat;
  sigStrikesDistance: IStrikeStat;
  sigStrikesClinch: IStrikeStat;
  sigStrikesGround: IStrikeStat;
}

const strikeStatSchema = new Schema(
  {
    landed: { type: Number, default: 0 },
    attempted: { type: Number, default: 0 },
  },
  { _id: false }
);

const fightStatsSchema = new Schema<IFightStats>(
  {
    fightId: { type: String, required: true, index: true },
    fighterName: { type: String, required: true, index: true },
    fighterPosition: { type: Number, required: true },
    knockdowns: { type: Number, default: 0 },
    sigStrikes: { type: strikeStatSchema, default: () => ({ landed: 0, attempted: 0 }) },
    sigStrikesPct: { type: Number, default: 0 },
    totalStrikes: { type: strikeStatSchema, default: () => ({ landed: 0, attempted: 0 }) },
    takedowns: { type: strikeStatSchema, default: () => ({ landed: 0, attempted: 0 }) },
    takedownPct: { type: Number, default: 0 },
    submissionAttempts: { type: Number, default: 0 },
    reversals: { type: Number, default: 0 },
    controlTime: { type: String, default: '0:00' },
    sigStrikesHead: { type: strikeStatSchema, default: () => ({ landed: 0, attempted: 0 }) },
    sigStrikesBody: { type: strikeStatSchema, default: () => ({ landed: 0, attempted: 0 }) },
    sigStrikesLeg: { type: strikeStatSchema, default: () => ({ landed: 0, attempted: 0 }) },
    sigStrikesDistance: { type: strikeStatSchema, default: () => ({ landed: 0, attempted: 0 }) },
    sigStrikesClinch: { type: strikeStatSchema, default: () => ({ landed: 0, attempted: 0 }) },
    sigStrikesGround: { type: strikeStatSchema, default: () => ({ landed: 0, attempted: 0 }) },
  },
  { timestamps: true }
);

fightStatsSchema.index({ fightId: 1, fighterName: 1 });

export const FightStats = mongoose.model<IFightStats>('FightStats', fightStatsSchema);
