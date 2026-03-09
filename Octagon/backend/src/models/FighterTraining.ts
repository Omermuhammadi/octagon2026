import mongoose, { Document, Schema } from 'mongoose';

export interface IFighterTraining extends Document {
  coachId: mongoose.Types.ObjectId;
  fighterId: mongoose.Types.ObjectId;
  fighterName: string;
  roadmapId: string;
  discipline: string;
  ageGroup: string;
  completedTasks: string[];
  currentWeek: number;
  totalWeeks: number;
  unlockedWeeks: number[];
  assignedAt: Date;
  updatedAt: Date;
}

const fighterTrainingSchema = new Schema<IFighterTraining>({
  coachId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  fighterId: { type: Schema.Types.ObjectId, ref: 'Fighter', required: true },
  fighterName: { type: String, required: true },
  roadmapId: { type: String, required: true },
  discipline: { type: String, required: true },
  ageGroup: { type: String, required: true },
  completedTasks: [{ type: String }],
  currentWeek: { type: Number, default: 1 },
  totalWeeks: { type: Number, default: 4 },
  unlockedWeeks: { type: [Number], default: [1] },
  assignedAt: { type: Date, default: Date.now },
}, { timestamps: true });

fighterTrainingSchema.index({ coachId: 1, fighterId: 1, roadmapId: 1 }, { unique: true });

export const FighterTraining = mongoose.model<IFighterTraining>('FighterTraining', fighterTrainingSchema);
