import mongoose, { Document, Schema } from 'mongoose';

export interface IFormSession extends Document {
  userId: mongoose.Types.ObjectId;
  technique: string;
  overallScore: number;
  feedback: {
    category: string;
    score: number;
    tips: string[];
  }[];
  bodyParts: {
    part: string;
    status: 'correct' | 'needs-work' | 'incorrect';
    feedback: string;
  }[];
  result: 'Good' | 'Needs Improvement';
  createdAt: Date;
}

const formSessionSchema = new Schema<IFormSession>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  technique: { type: String, required: true },
  overallScore: { type: Number, required: true },
  feedback: [{
    category: String,
    score: Number,
    tips: [String],
  }],
  bodyParts: [{
    part: String,
    status: { type: String, enum: ['correct', 'needs-work', 'incorrect'] },
    feedback: String,
  }],
  result: { type: String, enum: ['Good', 'Needs Improvement'], required: true },
}, { timestamps: true });

export const FormSession = mongoose.model<IFormSession>('FormSession', formSessionSchema);
