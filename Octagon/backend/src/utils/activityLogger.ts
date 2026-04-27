import mongoose from 'mongoose';
import { ActivityLog, ActivityAction, EntityType } from '../models';

interface LogActivityOptions {
  userId: mongoose.Types.ObjectId | string;
  actorId: mongoose.Types.ObjectId | string;
  actorName: string;
  action: ActivityAction;
  entityType: EntityType;
  entityId?: mongoose.Types.ObjectId | string;
  metadata?: Record<string, any>;
}

export async function logActivity(opts: LogActivityOptions): Promise<void> {
  try {
    await ActivityLog.create({
      userId: opts.userId,
      actorId: opts.actorId,
      actorName: opts.actorName,
      action: opts.action,
      entityType: opts.entityType,
      entityId: opts.entityId,
      metadata: opts.metadata || {},
    });
  } catch (err) {
    // Activity logging is non-critical — never throw
    console.error('Activity log failed:', err);
  }
}
