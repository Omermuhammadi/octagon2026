import mongoose, { Document, Schema } from 'mongoose';

export interface IPracticeLogEntry {
  taskId: string;
  minutes: number;
  notes: string;
  loggedAt: Date;
}

export interface IQuizResult {
  taskId: string;
  score: number;        // 0..total
  total: number;        // number of questions
  answers: number[];    // chosen answer index per question
  passedAt: Date;
}

export interface IRoadmapProgress extends Document {
  userId: mongoose.Types.ObjectId;
  roadmapId: string;
  ageGroup: 'under-15' | '15-25' | '25+';
  discipline: string;
  completedTasks: string[];
  currentWeek: number;
  totalWeeks: number;
  unlockedWeeks: number[];

  // New value-layer fields
  quizResults: IQuizResult[];
  practiceLog: IPracticeLogEntry[];
  totalMinutesTrained: number;

  startedAt: Date;
  updatedAt: Date;
}

const practiceLogSchema = new Schema<IPracticeLogEntry>({
  taskId: { type: String, required: true },
  minutes: { type: Number, default: 0, min: 0, max: 600 },
  notes: { type: String, default: '', maxlength: 500 },
  loggedAt: { type: Date, default: Date.now },
}, { _id: false });

const quizResultSchema = new Schema<IQuizResult>({
  taskId: { type: String, required: true },
  score: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 1 },
  answers: { type: [Number], default: [] },
  passedAt: { type: Date, default: Date.now },
}, { _id: false });

const roadmapProgressSchema = new Schema<IRoadmapProgress>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  roadmapId: { type: String, required: true },
  ageGroup: { type: String, enum: ['under-15', '15-25', '25+'], default: '15-25' },
  discipline: { type: String, required: true },
  completedTasks: [{ type: String }],
  currentWeek: { type: Number, default: 1 },
  totalWeeks: { type: Number, default: 4 },
  unlockedWeeks: { type: [Number], default: [1] },

  quizResults: { type: [quizResultSchema], default: [] },
  practiceLog: { type: [practiceLogSchema], default: [] },
  totalMinutesTrained: { type: Number, default: 0 },

  startedAt: { type: Date, default: Date.now },
}, { timestamps: true });

roadmapProgressSchema.index({ userId: 1, roadmapId: 1 }, { unique: true });

export const RoadmapProgress = mongoose.model<IRoadmapProgress>('RoadmapProgress', roadmapProgressSchema);
