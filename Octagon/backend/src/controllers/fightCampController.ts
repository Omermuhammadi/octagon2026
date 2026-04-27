import { Request, Response } from 'express';
import { FightCamp } from '../models/FightCamp';
import { SparringEntry } from '../models/SparringEntry';
import { CoachRelationship } from '../models/CoachRelationship';
import { logActivity } from '../utils/activityLogger';
import mongoose from 'mongoose';

const DEFAULT_MILESTONES = [
  'Medical clearance complete',
  'Weight cut plan finalized with coach',
  'Opponent study: striking patterns analysed',
  'Opponent study: grappling tendencies mapped',
  'Game plan reviewed & approved by coach',
  'Full sparring sessions complete (8+ rounds)',
  'Cardio peak week complete',
  'Weight on target (fight week)',
  'Final open workout / media day',
  'Fight-day weigh-in',
];

export const createFightCamp = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const { opponentName, opponentRecord, fightDate, weightClass, venue, notes } = req.body;

    if (!opponentName || !fightDate || !weightClass) {
      res.status(400).json({ success: false, message: 'opponentName, fightDate, weightClass are required' });
      return;
    }

    // Find active coach relationship
    const rel = await CoachRelationship.findOne({
      $or: [{ coachId: userId }, { traineeId: userId }],
      status: 'active',
    });
    const coachId = rel
      ? (rel.coachId.toString() === userId.toString() ? undefined : rel.coachId)
      : undefined;

    const milestones = DEFAULT_MILESTONES.map((title, i) => ({
      title,
      targetDate: fightDate
        ? new Date(new Date(fightDate).getTime() - (DEFAULT_MILESTONES.length - i) * 3 * 24 * 60 * 60 * 1000)
        : undefined,
      completed: false,
    }));

    const camp = await FightCamp.create({
      userId,
      coachId,
      opponentName,
      opponentRecord: opponentRecord || '',
      fightDate: new Date(fightDate),
      weightClass,
      venue: venue || '',
      notes: notes || '',
      milestones,
    });

    await logActivity({
      userId: coachId ? coachId.toString() : userId.toString(),
      actorId: userId.toString(),
      actorName: (req as any).user.name,
      action: 'fight_camp_created',
      entityType: 'fight_camp',
      entityId: camp._id.toString(),
      metadata: { opponentName, fightDate },
    });

    res.status(201).json({ success: true, data: camp });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getActiveFightCamp = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const camp = await FightCamp.findOne({
      userId,
      status: { $in: ['upcoming', 'active'] },
    }).sort({ fightDate: 1 });

    res.json({ success: true, data: camp ?? null });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const listFightCamps = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const camps = await FightCamp.find({ userId }).sort({ fightDate: -1 }).limit(10);
    res.json({ success: true, data: camps });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateMilestone = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const { id, milestoneId } = req.params;
    const { completed, notes } = req.body;

    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(milestoneId)) {
      res.status(400).json({ success: false, message: 'Invalid IDs' });
      return;
    }

    const camp = await FightCamp.findOne({ _id: id, userId });
    if (!camp) { res.status(404).json({ success: false, message: 'Fight camp not found' }); return; }

    const ms = camp.milestones.find(m => m._id.toString() === milestoneId);
    if (!ms) { res.status(404).json({ success: false, message: 'Milestone not found' }); return; }

    ms.completed = !!completed;
    ms.completedAt = completed ? new Date() : undefined;
    if (notes !== undefined) ms.notes = notes;

    await camp.save();
    res.json({ success: true, data: camp });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateFightCampStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const { id } = req.params;
    const { status } = req.body;

    if (!['upcoming', 'active', 'completed', 'cancelled'].includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid status' });
      return;
    }

    const camp = await FightCamp.findOneAndUpdate(
      { _id: id, userId },
      { status },
      { new: true }
    );
    if (!camp) { res.status(404).json({ success: false, message: 'Fight camp not found' }); return; }
    res.json({ success: true, data: camp });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Sparring entries

export const addSparringEntry = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const { fightCampId, date, partnerName, rounds, notes, performanceRating, tags } = req.body;

    if (!date || !partnerName || !rounds) {
      res.status(400).json({ success: false, message: 'date, partnerName, rounds are required' });
      return;
    }

    const entry = await SparringEntry.create({
      userId,
      fightCampId: fightCampId || undefined,
      date: new Date(date),
      partnerName,
      rounds: Number(rounds),
      notes: notes || '',
      performanceRating: performanceRating || 3,
      tags: tags || [],
    });

    res.status(201).json({ success: true, data: entry });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const listSparringEntries = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const { fightCampId, limit = 20 } = req.query;

    const filter: any = { userId };
    if (fightCampId) filter.fightCampId = fightCampId;

    const entries = await SparringEntry.find(filter).sort({ date: -1 }).limit(Number(limit));
    res.json({ success: true, data: entries });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteSparringEntry = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const { id } = req.params;
    const entry = await SparringEntry.findOneAndDelete({ _id: id, userId });
    if (!entry) { res.status(404).json({ success: false, message: 'Entry not found' }); return; }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
