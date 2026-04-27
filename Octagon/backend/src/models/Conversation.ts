import mongoose, { Document, Schema } from 'mongoose';

export interface IConversationLastMessage {
  text: string;
  senderId: mongoose.Types.ObjectId;
  sentAt: Date;
}

export interface IConversation extends Document {
  // participants array is always sorted ascending by ObjectId string for deterministic dedup
  participants: mongoose.Types.ObjectId[];
  participantKey: string; // sorted "id1_id2" — unique key for fast lookup
  lastMessage?: IConversationLastMessage;
  // unread count per user — keyed by userId string
  unreadCounts: Map<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    participantKey: { type: String, required: true, unique: true, index: true },
    lastMessage: {
      text: { type: String },
      senderId: { type: Schema.Types.ObjectId, ref: 'User' },
      sentAt: { type: Date },
    },
    unreadCounts: {
      type: Map,
      of: Number,
      default: new Map(),
    },
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });

export const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema);

// Helper: build deterministic participantKey from two ObjectIds
export function buildParticipantKey(
  a: mongoose.Types.ObjectId | string,
  b: mongoose.Types.ObjectId | string
): string {
  const aStr = a.toString();
  const bStr = b.toString();
  return [aStr, bStr].sort().join('_');
}
