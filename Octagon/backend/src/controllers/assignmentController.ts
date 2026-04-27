import { Response } from 'express';
import { AuthRequest } from '../middleware';
import { Assignment, CoachRelationship, User } from '../models';
import { logActivity } from '../utils/activityLogger';

/**
 * GET /api/assignments
 * Lists assignments. For coaches: ones they sent. For trainees: ones they received.
 * Query: ?status=assigned|submitted|completed|overdue (optional), ?traineeId=xxx (coaches only)
 */
export const listAssignments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const me = req.user!;
    const { status, traineeId } = req.query;

    const filter: any = {};
    if (me.role === 'coach') {
      filter.coachId = me._id;
      if (traineeId && typeof traineeId === 'string') filter.traineeId = traineeId;
    } else if (me.role === 'fighter' || me.role === 'beginner') {
      filter.traineeId = me._id;
    } else {
      res.status(403).json({ success: false, message: 'Not authorized' });
      return;
    }
    if (status && typeof status === 'string') filter.status = status;

    // Auto-mark overdue
    await Assignment.updateMany(
      { ...filter, status: 'assigned', dueDate: { $lt: new Date() } },
      { $set: { status: 'overdue' } }
    );

    const assignments = await Assignment.find(filter)
      .populate('coachId', 'name email avatar')
      .populate('traineeId', 'name email avatar role discipline experienceLevel')
      .sort({ dueDate: 1, createdAt: -1 })
      .lean();

    res.json({ success: true, data: assignments });
  } catch (error) {
    console.error('List assignments error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/assignments
 * Coach creates an assignment. Body: { traineeId, type, title, description, dueDate }
 */
export const createAssignment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const me = req.user!;
    if (me.role !== 'coach') {
      res.status(403).json({ success: false, message: 'Only coaches can create assignments' });
      return;
    }

    const { traineeId, type, title, description, dueDate } = req.body;
    if (!traineeId || !type || !title || !description || !dueDate) {
      res.status(400).json({
        success: false,
        message: 'traineeId, type, title, description, dueDate are required',
      });
      return;
    }

    // Verify active relationship exists
    const rel = await CoachRelationship.findOne({
      coachId: me._id,
      traineeId,
      status: 'active',
    });
    if (!rel) {
      res.status(403).json({
        success: false,
        message: 'No active relationship with this trainee',
      });
      return;
    }

    const trainee = await User.findById(traineeId).lean();
    if (!trainee) {
      res.status(404).json({ success: false, message: 'Trainee not found' });
      return;
    }

    const assignment = await Assignment.create({
      coachId: me._id,
      traineeId,
      traineeRole: rel.traineeRole,
      type,
      title: title.trim(),
      description: description.trim(),
      dueDate: new Date(dueDate),
      status: 'assigned',
    });

    await logActivity({
      userId: traineeId,
      actorId: me._id as any,
      actorName: me.name,
      action: 'assignment_created',
      entityType: 'assignment',
      entityId: assignment._id as any,
      metadata: {
        title: assignment.title,
        type: assignment.type,
        dueDate: assignment.dueDate,
      },
    });

    res.status(201).json({ success: true, data: assignment });
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * GET /api/assignments/:id
 */
export const getAssignment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const me = req.user!;
    const a = await Assignment.findById(req.params.id)
      .populate('coachId', 'name email avatar')
      .populate('traineeId', 'name email avatar role discipline experienceLevel')
      .lean();

    if (!a) {
      res.status(404).json({ success: false, message: 'Not found' });
      return;
    }

    const myId = (me._id as any).toString();
    const coachIdAny: any = a.coachId;
    const traineeIdAny: any = a.traineeId;
    const involves =
      (coachIdAny?._id || coachIdAny).toString() === myId ||
      (traineeIdAny?._id || traineeIdAny).toString() === myId;
    if (!involves) {
      res.status(403).json({ success: false, message: 'Not authorized' });
      return;
    }

    res.json({ success: true, data: a });
  } catch (error) {
    console.error('Get assignment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/assignments/:id/submit
 * Trainee submits. Body: { text?, videoUrl?, weightKg? }
 */
export const submitAssignment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const me = req.user!;
    const a = await Assignment.findById(req.params.id);
    if (!a) {
      res.status(404).json({ success: false, message: 'Not found' });
      return;
    }
    if (a.traineeId.toString() !== (me._id as any).toString()) {
      res.status(403).json({ success: false, message: 'Only the trainee can submit' });
      return;
    }
    if (a.status === 'completed') {
      res.status(400).json({ success: false, message: 'Already completed' });
      return;
    }

    const { text, videoUrl, weightKg } = req.body;
    if (!text && !videoUrl && weightKg === undefined) {
      res.status(400).json({
        success: false,
        message: 'Provide at least one of: text, videoUrl, weightKg',
      });
      return;
    }

    a.submission = {
      text,
      videoUrl,
      weightKg: weightKg !== undefined ? Number(weightKg) : undefined,
      submittedAt: new Date(),
    };
    a.status = 'submitted';
    await a.save();

    await logActivity({
      userId: a.coachId,
      actorId: me._id as any,
      actorName: me.name,
      action: 'assignment_submitted',
      entityType: 'assignment',
      entityId: a._id as any,
      metadata: { title: a.title, type: a.type },
    });

    res.json({ success: true, data: a });
  } catch (error) {
    console.error('Submit assignment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/assignments/:id/review
 * Coach reviews. Body: { text, rating?, markComplete? }
 */
export const reviewAssignment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const me = req.user!;
    if (me.role !== 'coach') {
      res.status(403).json({ success: false, message: 'Coaches only' });
      return;
    }
    const a = await Assignment.findById(req.params.id);
    if (!a) {
      res.status(404).json({ success: false, message: 'Not found' });
      return;
    }
    if (a.coachId.toString() !== (me._id as any).toString()) {
      res.status(403).json({ success: false, message: 'Not your assignment' });
      return;
    }

    const { text, rating, markComplete } = req.body;
    if (!text) {
      res.status(400).json({ success: false, message: 'Feedback text is required' });
      return;
    }

    a.feedback = {
      text: text.trim(),
      rating: rating !== undefined ? Number(rating) : undefined,
      reviewedAt: new Date(),
    };
    if (markComplete) a.status = 'completed';
    await a.save();

    await logActivity({
      userId: a.traineeId,
      actorId: me._id as any,
      actorName: me.name,
      action: 'assignment_completed',
      entityType: 'assignment',
      entityId: a._id as any,
      metadata: {
        title: a.title,
        rating: a.feedback.rating,
        completed: markComplete,
      },
    });

    res.json({ success: true, data: a });
  } catch (error) {
    console.error('Review assignment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * DELETE /api/assignments/:id (coach only, only if not completed)
 */
export const deleteAssignment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const me = req.user!;
    const a = await Assignment.findById(req.params.id);
    if (!a) {
      res.status(404).json({ success: false, message: 'Not found' });
      return;
    }
    if (a.coachId.toString() !== (me._id as any).toString()) {
      res.status(403).json({ success: false, message: 'Not your assignment' });
      return;
    }
    if (a.status === 'completed') {
      res.status(400).json({ success: false, message: 'Cannot delete a completed assignment' });
      return;
    }
    await a.deleteOne();
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * GET /api/assignments/stats — counts by status for current user
 */
export const getAssignmentStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const me = req.user!;
    const filter: any = {};
    if (me.role === 'coach') filter.coachId = me._id;
    else filter.traineeId = me._id;

    // Auto-mark overdue first
    await Assignment.updateMany(
      { ...filter, status: 'assigned', dueDate: { $lt: new Date() } },
      { $set: { status: 'overdue' } }
    );

    const counts = await Assignment.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const stats = {
      assigned: 0,
      submitted: 0,
      completed: 0,
      overdue: 0,
      total: 0,
    };
    for (const c of counts) {
      stats[c._id as keyof typeof stats] = c.count;
      stats.total += c.count;
    }

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Assignment stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
