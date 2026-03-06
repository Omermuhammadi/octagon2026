import mongoose, { Document, Schema } from 'mongoose';

export interface IChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface IChatLog extends Document {
  userId?: mongoose.Types.ObjectId;
  sessionId: string;
  messages: IChatMessage[];
  intent?: string;
  resolved: boolean;
  createdAt: Date;
}

const chatMessageSchema = new Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const chatLogSchema = new Schema<IChatLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  sessionId: { type: String, required: true, index: true },
  messages: [chatMessageSchema],
  intent: { type: String },
  resolved: { type: Boolean, default: false },
}, { timestamps: true });

export const ChatLog = mongoose.model<IChatLog>('ChatLog', chatLogSchema);
