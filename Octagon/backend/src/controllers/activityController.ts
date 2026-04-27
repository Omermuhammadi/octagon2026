import { Response } from 'express';
import { AuthRequest } from '../middleware';
import { ActivityLog } from '../models';

/**
 * GET /api/activity
 * Recent activity feed for current user. Query: ?limit=30 (default), ?since=ISO_DATE
 */
export const listActivity = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const me = req.user!;
    const limit = Math.min(parseInt(String(req.query.limit || '30'), 10), 100);
    const filter: any = { userId: me._id };
    if (req.query.since && typeof req.query.since === 'string') {
      filter.createdAt = { $gt: new Date(req.query.since) };
    }
    const logs = await ActivityLog.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('List activity error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * PATCH /api/activity/read — mark all unread as read
 */
export const markAllRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const me = req.user!;
    const result = await ActivityLog.updateMany(
      { userId: me._id, read: false },
      { $set: { read: true } }
    );
    res.json({ success: true, data: { updated: result.modifiedCount } });
  } catch (error) {
    console.error('Mark activity read error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * GET /api/activity/unread-count — for nav badge
 */
export const getUnreadActivityCount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const me = req.user!;
    const count = await ActivityLog.countDocuments({ userId: me._id, read: false });
    res.json({ success: true, data: { count } });
  } catch (error) {
    console.error('Unread activity count error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
