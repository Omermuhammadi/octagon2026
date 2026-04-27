import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISparringEntry extends Document {
  userId: Types.ObjectId;
  fightCampId?: Types.ObjectId;
  date: Date;
  partnerName: string;
  rounds: number;
  notes?: string;
  performanceRating: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const sparringEntrySchema = new Schema<ISparringEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fightCampId: { type: Schema.Types.ObjectId, ref: 'FightCamp' },
    date: { type: Date, required: true },
    partnerName: { type: String, required: true, trim: true },
    rounds: { type: Number, required: true, min: 1 },
    notes: { type: String, default: '' },
    performanceRating: { type: Number, min: 1, max: 5, default: 3 },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

export const SparringEntry = mongoose.model<ISparringEntry>('SparringEntry', sparringEntrySchema);
