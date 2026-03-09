import mongoose, { Document, Schema } from 'mongoose';

export interface ICoachRoster extends Document {
  coachId: mongoose.Types.ObjectId;
  fighterId: mongoose.Types.ObjectId;
  fighterName: string;
  addedAt: Date;
  notes: string;
}

const coachRosterSchema = new Schema<ICoachRoster>(
  {
    coachId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fighterId: { type: Schema.Types.ObjectId, ref: 'Fighter', required: true },
    fighterName: { type: String, required: true },
    addedAt: { type: Date, default: Date.now },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

coachRosterSchema.index({ coachId: 1, fighterId: 1 }, { unique: true });

export const CoachRoster = mongoose.model<ICoachRoster>('CoachRoster', coachRosterSchema);
