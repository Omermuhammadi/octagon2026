import mongoose, { Document, Schema } from 'mongoose';

export interface IRoadmapProgress extends Document {
  userId: mongoose.Types.ObjectId;
  roadmapId: string;
  ageGroup: 'under-15' | '15-25' | '25+';
  discipline: string;
  completedTasks: string[];
  currentWeek: number;
  totalWeeks: number;
  startedAt: Date;
  updatedAt: Date;
}

const roadmapProgressSchema = new Schema<IRoadmapProgress>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  roadmapId: { type: String, required: true },
  ageGroup: { type: String, enum: ['under-15', '15-25', '25+'], default: '15-25' },
  discipline: { type: String, required: true },
  completedTasks: [{ type: String }],
  currentWeek: { type: Number, default: 1 },
  totalWeeks: { type: Number, default: 4 },
  startedAt: { type: Date, default: Date.now },
}, { timestamps: true });

roadmapProgressSchema.index({ userId: 1, roadmapId: 1 }, { unique: true });

export const RoadmapProgress = mongoose.model<IRoadmapProgress>('RoadmapProgress', roadmapProgressSchema);
