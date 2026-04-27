import { Response } from 'express';
import { AuthRequest } from '../middleware';
import {
  Conversation,
  Message,
  CoachRelationship,
  User,
  buildParticipantKey,
} from '../models';
import { logActivity } from '../utils/activityLogger';

/**
 * Helper: ensure two users have an active coach-trainee relationship before they can message.
 * Coaches can only message active trainees; trainees only their active coach.
 */
async function canMessage(meId: string, otherId: string, meRole: string): Promise<boolean> {
  if (meRole === 'fan') return false;
  // Allow if there's an ACTIVE relationship
  const rel = await CoachRelationship.findOne({
    status: 'active',
    $or: [
      { coachId: meId, traineeId: otherId },
      { coachId: otherId, traineeId: meId },
    ],
  }).lean();
  return !!rel;
}

/**
 * GET /api/messages/conversations
 * List my conversations with last message + unread count.
 */
export const listConversations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const me = req.user!;
    const meIdStr = (me._id as any).toString();

    const conversations = await Conversation.find({ participants: me._id })
      .populate('participants', 'name email role avatar discipline')
      .sort({ updatedAt: -1 })
      .lean();

    const result = conversations.map((c: any) => {
      const other = c.participants.find((p: any) => p._id.toString() !== meIdStr);
      const unread = c.unreadCounts?.[meIdStr] || 0;
      return {
        _id: c._id,
        otherUser: other,
        lastMessage: c.lastMessage,
        unread,
        updatedAt: c.updatedAt,
      };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('List conversations error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * GET /api/messages/thread/:userId
 * Get full thread with another user. Auto-creates conversation if missing.
 */
export const getThread = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const me = req.user!;
    const otherId = req.params.userId;
    const meIdStr = (me._id as any).toString();

    if (otherId === meIdStr) {
      res.status(400).json({ success: false, message: 'Cannot message yourself' });
      return;
    }
    const other = await User.findById(otherId).lean();
    if (!other) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const allowed = await canMessage(meIdStr, otherId, me.role);
    if (!allowed) {
      res.status(403).json({
        success: false,
        message: 'You can only message users you have an active coaching relationship with',
      });
      return;
    }

    const key = buildParticipantKey(me._id as any, otherId);
    let convo = await Conversation.findOne({ participantKey: key });
    if (!convo) {
      convo = await Conversation.create({
        participants: [me._id, other._id],
        participantKey: key,
        unreadCounts: new Map(),
      });
    }

    const messages = await Message.find({ conversationId: convo._id })
      .sort({ createdAt: 1 })
      .lean();

    // Mark all as read for me
    if (messages.some(m => m.recipientId.toString() === meIdStr && !m.read)) {
      await Message.updateMany(
        { conversationId: convo._id, recipientId: me._id, read: false },
        { $set: { read: true, readAt: new Date() } }
      );
      convo.unreadCounts.set(meIdStr, 0);
      await convo.save();
    }

    res.json({
      success: true,
      data: {
        conversationId: convo._id,
        otherUser: {
          _id: other._id,
          name: other.name,
          email: other.email,
          role: other.role,
          avatar: other.avatar,
          discipline: other.discipline,
        },
        messages,
      },
    });
  } catch (error) {
    console.error('Get thread error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/messages/thread/:userId
 * Send a message. Body: { text }
 */
export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const me = req.user!;
    const otherId = req.params.userId;
    const { text } = req.body;
    const meIdStr = (me._id as any).toString();

    if (!text || !text.trim()) {
      res.status(400).json({ success: false, message: 'Message text required' });
      return;
    }
    if (otherId === meIdStr) {
      res.status(400).json({ success: false, message: 'Cannot message yourself' });
      return;
    }

    const other = await User.findById(otherId).lean();
    if (!other) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const allowed = await canMessage(meIdStr, otherId, me.role);
    if (!allowed) {
      res.status(403).json({
        success: false,
        message: 'No active coaching relationship with this user',
      });
      return;
    }

    const key = buildParticipantKey(me._id as any, otherId);
    let convo = await Conversation.findOne({ participantKey: key });
    if (!convo) {
      convo = await Conversation.create({
        participants: [me._id, other._id],
        participantKey: key,
        unreadCounts: new Map(),
      });
    }

    const trimmed = text.trim().slice(0, 2000);
    const msg = await Message.create({
      conversationId: convo._id,
      senderId: me._id,
      recipientId: otherId,
      text: trimmed,
      read: false,
    });

    convo.lastMessage = {
      text: trimmed,
      senderId: me._id as any,
      sentAt: msg.createdAt,
    };
    const otherIdStr = otherId.toString();
    const currentUnread = convo.unreadCounts.get(otherIdStr) || 0;
    convo.unreadCounts.set(otherIdStr, currentUnread + 1);
    await convo.save();

    await logActivity({
      userId: otherId,
      actorId: me._id as any,
      actorName: me.name,
      action: 'message_received',
      entityType: 'message',
      entityId: msg._id as any,
      metadata: { snippet: trimmed.slice(0, 80), conversationId: convo._id },
    });

    res.status(201).json({ success: true, data: msg });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * GET /api/messages/unread-count
 * Total unread messages across all conversations for nav badge.
 */
export const getUnreadCount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const me = req.user!;
    const count = await Message.countDocuments({ recipientId: me._id, read: false });
    res.json({ success: true, data: { count } });
  } catch (error) {
    console.error('Unread count error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
