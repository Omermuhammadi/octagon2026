import { Request, Response } from 'express';
import { WeightLog } from '../models/WeightLog';
import { CoachRelationship } from '../models/CoachRelationship';
import { logActivity } from '../utils/activityLogger';

export const logWeight = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const { weightKg, date, notes, fightCampId } = req.body;

    if (!weightKg) {
      res.status(400).json({ success: false, message: 'weightKg is required' });
      return;
    }

    const entryDate = date ? new Date(date) : new Date();

    let log = await WeightLog.findOne({ userId });
    if (!log) {
      log = await WeightLog.create({ userId, fightCampId, targetWeightKg: 70, alertThresholdKg: 3, entries: [] });
    }

    // Replace entry for same date if exists
    const dateStr = entryDate.toDateString();
    const existingIdx = log.entries.findIndex(e => new Date(e.date).toDateString() === dateStr);
    if (existingIdx !== -1) {
      log.entries[existingIdx].weightKg = Number(weightKg);
      log.entries[existingIdx].notes = notes || '';
    } else {
      log.entries.push({ date: entryDate, weightKg: Number(weightKg), notes: notes || '' } as any);
    }

    await log.save();

    // Alert coach if weight is above threshold
    const overBy = Number(weightKg) - log.targetWeightKg;
    if (overBy > log.alertThresholdKg) {
      const rel = await CoachRelationship.findOne({ traineeId: userId, status: 'active' });
      if (rel) {
        await logActivity({
          userId: rel.coachId.toString(),
          actorId: userId.toString(),
          actorName: (req as any).user.name,
          action: 'weight_alert',
          entityType: 'weight_log',
          entityId: log._id.toString(),
          metadata: { weightKg: Number(weightKg), targetWeightKg: log.targetWeightKg, overBy: overBy.toFixed(1) },
        });
      }
    }

    res.json({ success: true, data: log });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getWeightHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    let log = await WeightLog.findOne({ userId });
    if (!log) {
      log = await WeightLog.create({ userId, targetWeightKg: 70, alertThresholdKg: 3, entries: [] });
    }
    // Return entries sorted ascending for chart
    const sorted = [...log.entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    res.json({ success: true, data: { ...log.toObject(), entries: sorted } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const setTarget = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const { targetWeightKg, alertThresholdKg, fightCampId } = req.body;

    if (!targetWeightKg) {
      res.status(400).json({ success: false, message: 'targetWeightKg is required' });
      return;
    }

    const log = await WeightLog.findOneAndUpdate(
      { userId },
      {
        $set: {
          targetWeightKg: Number(targetWeightKg),
          ...(alertThresholdKg !== undefined && { alertThresholdKg: Number(alertThresholdKg) }),
          ...(fightCampId && { fightCampId }),
        },
      },
      { new: true, upsert: true }
    );

    res.json({ success: true, data: log });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteEntry = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const { entryId } = req.params;

    const log = await WeightLog.findOne({ userId });
    if (!log) { res.status(404).json({ success: false, message: 'Log not found' }); return; }

    log.entries = log.entries.filter(e => e._id.toString() !== entryId) as any;
    await log.save();
    res.json({ success: true, data: log });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
