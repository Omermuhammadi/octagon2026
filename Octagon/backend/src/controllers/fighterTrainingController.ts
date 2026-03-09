import { Response } from 'express';
import { AuthRequest } from '../middleware';
import { FighterTraining, Fighter } from '../models';

/**
 * GET /api/coach/fighter-training - Get all training assignments for this coach
 */
export const getAssignments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const assignments = await FighterTraining.find({ coachId: req.user!._id })
      .sort({ assignedAt: -1 })
      .lean();

    res.json({ success: true, data: assignments });
  } catch (error) {
    console.error('Get fighter training assignments error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/coach/fighter-training - Assign a training program to a fighter
 */
export const assignTraining = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fighterName, roadmapId, discipline, ageGroup } = req.body;

    if (!fighterName || !roadmapId || !discipline || !ageGroup) {
      res.status(400).json({ success: false, message: 'fighterName, roadmapId, discipline, and ageGroup are required' });
      return;
    }

    // Find the fighter
    const fighter = await Fighter.findOne({
      name: { $regex: new RegExp(`^${fighterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    }).lean();

    if (!fighter) {
      res.status(404).json({ success: false, message: `Fighter not found: ${fighterName}` });
      return;
    }

    // Check for duplicate assignment
    const existing = await FighterTraining.findOne({
      coachId: req.user!._id,
      fighterId: fighter._id,
      roadmapId,
    });

    if (existing) {
      res.status(409).json({ success: false, message: `${fighter.name} already has this training program assigned` });
      return;
    }

    const assignment = await FighterTraining.create({
      coachId: req.user!._id,
      fighterId: fighter._id,
      fighterName: fighter.name,
      roadmapId,
      discipline,
      ageGroup,
      completedTasks: [],
      currentWeek: 1,
      totalWeeks: 4,
      unlockedWeeks: [1],
    });

    res.status(201).json({ success: true, data: assignment });
  } catch (error) {
    console.error('Assign training error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * PUT /api/coach/fighter-training/:id - Update progress on an assignment
 */
export const updateProgress = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { completedTasks, currentWeek, unlockedWeeks } = req.body;

    const assignment = await FighterTraining.findOne({
      _id: req.params.id,
      coachId: req.user!._id,
    });

    if (!assignment) {
      res.status(404).json({ success: false, message: 'Assignment not found' });
      return;
    }

    if (completedTasks !== undefined) assignment.completedTasks = completedTasks;
    if (currentWeek !== undefined) assignment.currentWeek = currentWeek;
    if (unlockedWeeks !== undefined) assignment.unlockedWeeks = unlockedWeeks;

    await assignment.save();

    res.json({ success: true, data: assignment });
  } catch (error) {
    console.error('Update fighter training error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * DELETE /api/coach/fighter-training/:id - Remove a training assignment
 */
export const deleteAssignment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await FighterTraining.findOneAndDelete({
      _id: req.params.id,
      coachId: req.user!._id,
    });

    if (!result) {
      res.status(404).json({ success: false, message: 'Assignment not found' });
      return;
    }

    res.json({ success: true, message: 'Training assignment removed' });
  } catch (error) {
    console.error('Delete fighter training error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
