import { Response } from 'express';
import { AuthRequest } from '../middleware';
import { CoachRelationship, WeightLog, Assignment, SparringEntry, FightCamp } from '../models';

export const getTraineeAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const me = req.user!;
    if (me.role !== 'coach') {
      res.status(403).json({ success: false, message: 'Coach only' });
      return;
    }

    const rels = await CoachRelationship.find({ coachId: me._id, status: 'active' })
      .populate('traineeId', 'name role weight')
      .lean();

    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - daysFromMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const trainees = await Promise.all(
      rels.map(async (rel) => {
        const trainee = rel.traineeId as any;
        if (!trainee || typeof trainee !== 'object') return null;

        const traineeId = trainee._id;

        // Weight log — latest entry + target
        const weightLog = await WeightLog.findOne({ userId: traineeId }).lean();
        let weightData = null;
        if (weightLog) {
          const entries: any[] = (weightLog as any).entries ?? [];
          const latestEntry = entries.length > 0 ? entries[entries.length - 1] : null;
          const current: number | null = latestEntry ? latestEntry.weightKg : null;
          const target: number | null = (weightLog as any).targetWeightKg ?? null;
          const overTarget = current != null && target != null ? +((current - target).toFixed(1)) : null;
          weightData = { current, target, overTarget };
        }

        // Assignment completion %
        const allAssignments = await Assignment.find({ coachId: me._id, traineeId }).lean();
        const total = allAssignments.length;
        const completed = allAssignments.filter((a: any) => a.status === 'completed').length;
        const assignmentCompletionPct = total > 0 ? Math.round((completed / total) * 100) : 0;

        // Sparring sessions this week
        const sparringThisWeek = await SparringEntry.countDocuments({
          userId: traineeId,
          date: { $gte: startOfWeek },
        });

        // Active or upcoming fight camp
        const camp = await FightCamp.findOne({
          userId: traineeId,
          status: { $in: ['active', 'upcoming'] },
        }).lean();

        let fightCampData = null;
        if (camp) {
          const fightDate = new Date((camp as any).fightDate);
          const msRemaining = fightDate.getTime() - now.getTime();
          const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
          const milestones: any[] = (camp as any).milestones ?? [];
          fightCampData = {
            opponentName: (camp as any).opponentName,
            fightDate: (camp as any).fightDate,
            daysRemaining,
            milestonesCompleted: milestones.filter((m: any) => m.completed).length,
            milestonesTotal: milestones.length,
          };
        }

        return {
          traineeId: traineeId.toString(),
          name: trainee.name,
          role: trainee.role,
          weight: weightData,
          assignmentCompletionPct,
          sparringThisWeek,
          fightCamp: fightCampData,
        };
      })
    );

    res.json({
      success: true,
      data: { trainees: trainees.filter(Boolean) },
    });
  } catch (error) {
    console.error('Coach analytics error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
