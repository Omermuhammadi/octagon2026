import { Response } from 'express';
import { AuthRequest } from '../middleware';
import { CoachRelationship, User } from '../models';
import { logActivity } from '../utils/activityLogger';

/**
 * GET /api/relationships
 * List all relationships involving the current user.
 * Query params: status=pending|active|declined|ended (optional), role=mine|trainee|coach (optional)
 */
export const listRelationships = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const me = req.user!;
    const { status } = req.query;

    const filter: any = {
      $or: [{ coachId: me._id }, { traineeId: me._id }],
    };
    if (status && typeof status === 'string') {
      filter.status = status;
    }

    const relationships = await CoachRelationship.find(filter)
      .populate('coachId', 'name email role avatar discipline experienceLevel')
      .populate('traineeId', 'name email role avatar discipline experienceLevel')
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ success: true, data: relationships });
  } catch (error) {
    console.error('List relationships error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/relationships
 * Initiate a relationship.
 * - Coach inviting: body { traineeEmail }
 * - Trainee requesting: body { coachEmail }
 */
export const createRelationship = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const me = req.user!;
    const { traineeEmail, coachEmail, notes } = req.body;

    let coachId: any;
    let traineeId: any;
    let traineeRole: 'fighter' | 'beginner';
    let requestedBy: 'coach' | 'trainee';
    let recipientName: string;

    if (me.role === 'coach') {
      if (!traineeEmail) {
        res.status(400).json({ success: false, message: 'traineeEmail is required' });
        return;
      }
      const trainee = await User.findOne({ email: traineeEmail.toLowerCase().trim() });
      if (!trainee) {
        res.status(404).json({ success: false, message: 'No user found with that email' });
        return;
      }
      if (trainee.role !== 'fighter' && trainee.role !== 'beginner') {
        res.status(400).json({
          success: false,
          message: 'You can only invite fighters or beginners',
        });
        return;
      }
      coachId = me._id;
      traineeId = trainee._id;
      traineeRole = trainee.role as 'fighter' | 'beginner';
      requestedBy = 'coach';
      recipientName = trainee.name;
    } else if (me.role === 'fighter' || me.role === 'beginner') {
      if (!coachEmail) {
        res.status(400).json({ success: false, message: 'coachEmail is required' });
        return;
      }
      const coach = await User.findOne({ email: coachEmail.toLowerCase().trim() });
      if (!coach) {
        res.status(404).json({ success: false, message: 'No user found with that email' });
        return;
      }
      if (coach.role !== 'coach') {
        res.status(400).json({ success: false, message: 'That user is not a coach' });
        return;
      }
      coachId = coach._id;
      traineeId = me._id;
      traineeRole = me.role;
      requestedBy = 'trainee';
      recipientName = coach.name;
    } else {
      res.status(403).json({ success: false, message: 'Fans cannot create coach relationships' });
      return;
    }

    // Already exists?
    const existing = await CoachRelationship.findOne({ coachId, traineeId });
    if (existing) {
      res.status(409).json({
        success: false,
        message: `Relationship already exists with status: ${existing.status}`,
      });
      return;
    }

    const rel = await CoachRelationship.create({
      coachId,
      traineeId,
      traineeRole,
      status: 'pending',
      requestedBy,
      notes: notes || '',
    });

    // Notify the recipient
    const recipientId = requestedBy === 'coach' ? traineeId : coachId;
    await logActivity({
      userId: recipientId,
      actorId: me._id as any,
      actorName: me.name,
      action: 'relationship_requested',
      entityType: 'relationship',
      entityId: rel._id as any,
      metadata: {
        requestedBy,
        senderRole: me.role,
        recipientName,
      },
    });

    res.status(201).json({ success: true, data: rel });
  } catch (error) {
    console.error('Create relationship error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * PATCH /api/relationships/:id/respond
 * Accept or decline a pending request. Body: { action: 'accept' | 'decline' }
 */
export const respondToRelationship = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const me = req.user!;
    const { id } = req.params;
    const { action } = req.body;

    if (action !== 'accept' && action !== 'decline') {
      res.status(400).json({ success: false, message: 'action must be accept or decline' });
      return;
    }

    const rel = await CoachRelationship.findById(id);
    if (!rel) {
      res.status(404).json({ success: false, message: 'Relationship not found' });
      return;
    }
    if (rel.status !== 'pending') {
      res.status(400).json({ success: false, message: `Cannot respond — current status: ${rel.status}` });
      return;
    }

    // Only the recipient can respond.
    const isRecipient =
      (rel.requestedBy === 'coach' && rel.traineeId.toString() === (me._id as any).toString()) ||
      (rel.requestedBy === 'trainee' && rel.coachId.toString() === (me._id as any).toString());
    if (!isRecipient) {
      res.status(403).json({ success: false, message: 'Only the recipient can respond' });
      return;
    }

    if (action === 'accept') {
      rel.status = 'active';
      rel.acceptedAt = new Date();
    } else {
      rel.status = 'declined';
    }
    await rel.save();

    // Notify the original sender
    const senderId = rel.requestedBy === 'coach' ? rel.coachId : rel.traineeId;
    await logActivity({
      userId: senderId,
      actorId: me._id as any,
      actorName: me.name,
      action: action === 'accept' ? 'relationship_accepted' : 'relationship_declined',
      entityType: 'relationship',
      entityId: rel._id as any,
      metadata: { responderName: me.name, responderRole: me.role },
    });

    res.json({ success: true, data: rel });
  } catch (error) {
    console.error('Respond to relationship error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * PATCH /api/relationships/:id/end
 * End an active relationship (either party can do it).
 */
export const endRelationship = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const me = req.user!;
    const { id } = req.params;

    const rel = await CoachRelationship.findById(id);
    if (!rel) {
      res.status(404).json({ success: false, message: 'Relationship not found' });
      return;
    }
    const isParty =
      rel.coachId.toString() === (me._id as any).toString() ||
      rel.traineeId.toString() === (me._id as any).toString();
    if (!isParty) {
      res.status(403).json({ success: false, message: 'Not authorized' });
      return;
    }
    if (rel.status !== 'active' && rel.status !== 'pending') {
      res.status(400).json({ success: false, message: `Already ${rel.status}` });
      return;
    }

    rel.status = 'ended';
    rel.endedAt = new Date();
    await rel.save();

    const otherPartyId =
      rel.coachId.toString() === (me._id as any).toString() ? rel.traineeId : rel.coachId;
    await logActivity({
      userId: otherPartyId,
      actorId: me._id as any,
      actorName: me.name,
      action: 'relationship_ended',
      entityType: 'relationship',
      entityId: rel._id as any,
      metadata: { endedBy: me.name },
    });

    res.json({ success: true, data: rel });
  } catch (error) {
    console.error('End relationship error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * GET /api/relationships/trainees
 * Coach only — list of active trainees (for dropdowns).
 */
export const listMyTrainees = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const me = req.user!;
    if (me.role !== 'coach') {
      res.status(403).json({ success: false, message: 'Coach only' });
      return;
    }
    const rels = await CoachRelationship.find({ coachId: me._id, status: 'active' })
      .populate('traineeId', 'name email role avatar discipline experienceLevel weight')
      .sort({ acceptedAt: -1 })
      .lean();

    const trainees = rels
      .map(r => {
        const t: any = r.traineeId;
        if (!t || typeof t !== 'object') return null;
        return {
          relationshipId: r._id,
          _id: t._id,
          name: t.name,
          email: t.email,
          role: t.role,
          avatar: t.avatar,
          discipline: t.discipline,
          experienceLevel: t.experienceLevel,
          weight: t.weight,
          since: r.acceptedAt,
        };
      })
      .filter(Boolean);

    res.json({ success: true, data: trainees });
  } catch (error) {
    console.error('List trainees error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * GET /api/relationships/my-coach
 * Trainee only — get my active coach.
 */
export const getMyCoach = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const me = req.user!;
    if (me.role !== 'fighter' && me.role !== 'beginner') {
      res.status(403).json({ success: false, message: 'Trainee only' });
      return;
    }
    const rel = await CoachRelationship.findOne({ traineeId: me._id, status: 'active' })
      .populate('coachId', 'name email role avatar discipline experienceLevel')
      .lean();

    if (!rel) {
      res.json({ success: true, data: null });
      return;
    }
    const c: any = rel.coachId;
    res.json({
      success: true,
      data: {
        relationshipId: rel._id,
        _id: c._id,
        name: c.name,
        email: c.email,
        avatar: c.avatar,
        discipline: c.discipline,
        experienceLevel: c.experienceLevel,
        since: rel.acceptedAt,
      },
    });
  } catch (error) {
    console.error('Get my coach error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
