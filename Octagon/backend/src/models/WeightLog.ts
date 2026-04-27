import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IWeightEntry {
  _id: Types.ObjectId;
  date: Date;
  weightKg: number;
  notes?: string;
}

export interface IWeightLog extends Document {
  userId: Types.ObjectId;
  fightCampId?: Types.ObjectId;
  targetWeightKg: number;
  alertThresholdKg: number;
  entries: IWeightEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const weightEntrySchema = new Schema<IWeightEntry>({
  date: { type: Date, required: true },
  weightKg: { type: Number, required: true },
  notes: { type: String, default: '' },
});

const weightLogSchema = new Schema<IWeightLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    fightCampId: { type: Schema.Types.ObjectId, ref: 'FightCamp' },
    targetWeightKg: { type: Number, default: 70 },
    alertThresholdKg: { type: Number, default: 3 },
    entries: { type: [weightEntrySchema], default: [] },
  },
  { timestamps: true }
);

export const WeightLog = mongoose.model<IWeightLog>('WeightLog', weightLogSchema);
