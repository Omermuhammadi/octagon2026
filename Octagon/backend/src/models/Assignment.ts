import mongoose, { Document, Schema } from 'mongoose';

export type AssignmentType =
  | 'training'
  | 'video'
  | 'weight'
  | 'reading'
  | 'sparring'
  | 'custom';

export type AssignmentStatus = 'assigned' | 'submitted' | 'completed' | 'overdue';

export interface IAssignmentSubmission {
  text?: string;
  videoUrl?: string;
  weightKg?: number;
  submittedAt: Date;
}

export interface IAssignmentFeedback {
  text: string;
  rating?: number; // 1-5
  reviewedAt: Date;
}

export interface IAssignment extends Document {
  coachId: mongoose.Types.ObjectId;
  traineeId: mongoose.Types.ObjectId;
  traineeRole: 'fighter' | 'beginner';
  type: AssignmentType;
  title: string;
  description: string;
  dueDate: Date;
  status: AssignmentStatus;
  submission?: IAssignmentSubmission;
  feedback?: IAssignmentFeedback;
  createdAt: Date;
  updatedAt: Date;
}

const submissionSchema = new Schema<IAssignmentSubmission>(
  {
    text: { type: String, maxlength: 2000 },
    videoUrl: { type: String },
    weightKg: { type: Number, min: 30, max: 300 },
    submittedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false }
);

const feedbackSchema = new Schema<IAssignmentFeedback>(
  {
    text: { type: String, required: true, maxlength: 2000 },
    rating: { type: Number, min: 1, max: 5 },
    reviewedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false }
);

const assignmentSchema = new Schema<IAssignment>(
  {
    coachId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    traineeId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    traineeRole: { type: String, enum: ['fighter', 'beginner'], required: true },
    type: {
      type: String,
      enum: ['training', 'video', 'weight', 'reading', 'sparring', 'custom'],
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, maxlength: 2000 },
    dueDate: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['assigned', 'submitted', 'completed', 'overdue'],
      default: 'assigned',
      index: true,
    },
    submission: { type: submissionSchema },
    feedback: { type: feedbackSchema },
  },
  { timestamps: true }
);

assignmentSchema.index({ coachId: 1, status: 1, dueDate: 1 });
assignmentSchema.index({ traineeId: 1, status: 1, dueDate: 1 });

export const Assignment = mongoose.model<IAssignment>('Assignment', assignmentSchema);
