import mongoose, { Document, Schema } from 'mongoose';

export type ActivityAction =
  | 'relationship_requested'
  | 'relationship_accepted'
  | 'relationship_declined'
  | 'relationship_ended'
  | 'assignment_created'
  | 'assignment_submitted'
  | 'assignment_completed'
  | 'assignment_overdue'
  | 'message_received'
  | 'training_week_completed'
  | 'prediction_made'
  | 'fight_camp_created'
  | 'weight_alert';

export type EntityType = 'relationship' | 'assignment' | 'message' | 'training' | 'prediction' | 'fight_camp' | 'weight_log';

export interface IActivityLog extends Document {
  userId: mongoose.Types.ObjectId; // recipient — who sees this in their feed
  actorId: mongoose.Types.ObjectId; // who did the thing (may be same as userId for self-actions)
  actorName: string; // denormalized for fast feed rendering
  action: ActivityAction;
  entityType: EntityType;
  entityId?: mongoose.Types.ObjectId;
  metadata: Record<string, any>;
  read: boolean;
  createdAt: Date;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actorName: { type: String, required: true },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId },
    metadata: { type: Schema.Types.Mixed, default: {} },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ userId: 1, read: 1 });

export const ActivityLog = mongoose.model<IActivityLog>('ActivityLog', activityLogSchema);
