import mongoose, { Document, Schema } from 'mongoose';

export type RelationshipStatus = 'pending' | 'active' | 'declined' | 'ended';
export type TraineeRole = 'fighter' | 'beginner' | 'fan';

export interface ICoachRelationship extends Document {
  coachId: mongoose.Types.ObjectId;
  traineeId: mongoose.Types.ObjectId;
  traineeRole: TraineeRole;
  status: RelationshipStatus;
  requestedBy: 'coach' | 'trainee';
  notes: string;
  acceptedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const coachRelationshipSchema = new Schema<ICoachRelationship>(
  {
    coachId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    traineeId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    traineeRole: { type: String, enum: ['fighter', 'beginner', 'fan'], required: true },
    status: {
      type: String,
      enum: ['pending', 'active', 'declined', 'ended'],
      default: 'pending',
      index: true,
    },
    requestedBy: { type: String, enum: ['coach', 'trainee'], required: true },
    notes: { type: String, default: '' },
    acceptedAt: { type: Date },
    endedAt: { type: Date },
  },
  { timestamps: true }
);

// One pair = one relationship row.
coachRelationshipSchema.index({ coachId: 1, traineeId: 1 }, { unique: true });

export const CoachRelationship = mongoose.model<ICoachRelationship>(
  'CoachRelationship',
  coachRelationshipSchema
);
