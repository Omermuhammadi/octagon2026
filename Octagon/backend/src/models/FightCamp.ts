import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IMilestone {
  _id: Types.ObjectId;
  title: string;
  targetDate?: Date;
  completed: boolean;
  completedAt?: Date;
  notes?: string;
}

export interface IFightCamp extends Document {
  userId: Types.ObjectId;
  coachId?: Types.ObjectId;
  opponentName: string;
  opponentRecord?: string;
  fightDate: Date;
  weightClass: string;
  venue?: string;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  milestones: IMilestone[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const milestoneSchema = new Schema<IMilestone>({
  title: { type: String, required: true },
  targetDate: { type: Date },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date },
  notes: { type: String },
});

const fightCampSchema = new Schema<IFightCamp>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    coachId: { type: Schema.Types.ObjectId, ref: 'User' },
    opponentName: { type: String, required: true, trim: true },
    opponentRecord: { type: String, default: '' },
    fightDate: { type: Date, required: true },
    weightClass: { type: String, required: true },
    venue: { type: String, default: '' },
    status: {
      type: String,
      enum: ['upcoming', 'active', 'completed', 'cancelled'],
      default: 'upcoming',
    },
    milestones: { type: [milestoneSchema], default: [] },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export const FightCamp = mongoose.model<IFightCamp>('FightCamp', fightCampSchema);
