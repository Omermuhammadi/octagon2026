import { Request, Response } from 'express';
import { RoadmapProgress } from '../models';
import { AuthRequest } from '../middleware';

const EXERCISES_PER_WEEK = 4;

/**
 * Extract the week number from a task ID.
 * Task IDs follow the pattern: {prefix}-w{weekNum}-{exerciseNum}
 * Examples: bjj-u15-w1-1, wr-1525-w3-2, mma-25p-w2-4
 */
function getWeekFromTaskId(taskId: string): number | null {
  const match = taskId.match(/-w(\d+)-/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Check if all tasks for a given week are completed.
 */
function isWeekFullyCompleted(completedTasks: string[], weekNumber: number, tasksPerWeek: number = EXERCISES_PER_WEEK): boolean {
  const weekTasks = completedTasks.filter(t => getWeekFromTaskId(t) === weekNumber);
  return weekTasks.length >= tasksPerWeek;
}

/**
 * Compute per-week progress summary.
 * Returns an object like { week1: { completed: 3, total: 4 }, week2: { completed: 0, total: 4 }, ... }
 */
function computeWeekProgress(completedTasks: string[], totalWeeks: number = 4, tasksPerWeek: number = EXERCISES_PER_WEEK): Record<string, { completed: number; total: number }> {
  const progress: Record<string, { completed: number; total: number }> = {};
  for (let w = 1; w <= totalWeeks; w++) {
    const weekTasks = completedTasks.filter(t => getWeekFromTaskId(t) === w);
    progress[`week${w}`] = { completed: weekTasks.length, total: tasksPerWeek };
  }
  return progress;
}

/**
 * Validate that unlockedWeeks is consistent with completedTasks.
 * A week N (N > 1) can only be unlocked if all exercises from weeks 1..N-1 are completed.
 * Each week has exactly EXERCISES_PER_WEEK exercises.
 */
function validateUnlockedWeeks(
  completedTasks: string[],
  unlockedWeeks: number[],
  totalWeeks: number
): { valid: boolean; correctedUnlockedWeeks: number[] } {
  // Count completed tasks per week
  const completedPerWeek: Record<number, number> = {};
  for (const taskId of completedTasks) {
    const week = getWeekFromTaskId(taskId);
    if (week !== null) {
      completedPerWeek[week] = (completedPerWeek[week] || 0) + 1;
    }
  }

  // Build the correct unlocked weeks from scratch
  const corrected: number[] = [1];
  for (let w = 1; w < totalWeeks; w++) {
    const count = completedPerWeek[w] || 0;
    if (count >= EXERCISES_PER_WEEK) {
      corrected.push(w + 1);
    } else {
      break;
    }
  }

  // Check if the client-provided unlockedWeeks matches the corrected set
  const sortedProvided = [...unlockedWeeks].sort((a, b) => a - b);
  const sortedCorrected = [...corrected].sort((a, b) => a - b);
  const valid =
    sortedProvided.length === sortedCorrected.length &&
    sortedProvided.every((v, i) => v === sortedCorrected[i]);

  return { valid, correctedUnlockedWeeks: corrected };
}

// GET /api/roadmaps/progress - Get user's roadmap progress
export const getRoadmapProgress = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const progress = await RoadmapProgress.find({ userId: req.user._id }).lean();
    res.json({ success: true, data: progress });
  } catch (error) {
    console.error('Get roadmap progress error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/roadmaps/progress - Save/update roadmap progress
export const saveRoadmapProgress = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { roadmapId, discipline, ageGroup, completedTasks, currentWeek, totalWeeks, unlockedWeeks, tasksPerWeek } = req.body;

    if (!roadmapId || !discipline) {
      res.status(400).json({ success: false, message: 'roadmapId and discipline are required' });
      return;
    }

    if (!Array.isArray(completedTasks)) {
      res.status(400).json({ success: false, message: 'completedTasks must be an array' });
      return;
    }

    const resolvedTotalWeeks = totalWeeks || 4;
    const resolvedUnlockedWeeks = Array.isArray(unlockedWeeks) ? unlockedWeeks : [1];
    const perWeek = tasksPerWeek || EXERCISES_PER_WEEK;

    // Server-side week-locking validation:
    // Get current progress to determine newly added tasks
    const existingProgress = await RoadmapProgress.findOne({ userId: req.user._id, roadmapId }).lean();
    const previousTasks: string[] = existingProgress?.completedTasks || [];
    const newlyAdded = completedTasks.filter((t: string) => !previousTasks.includes(t));

    // Validate: newly added tasks must belong to unlocked weeks
    for (const taskId of newlyAdded) {
      const taskWeek = getWeekFromTaskId(taskId);
      if (taskWeek !== null && taskWeek > 1) {
        // Check that all tasks from the previous week are completed in the new state
        if (!isWeekFullyCompleted(completedTasks, taskWeek - 1, perWeek)) {
          res.status(400).json({
            success: false,
            message: `Cannot complete tasks in Week ${taskWeek} until all Week ${taskWeek - 1} tasks are done`,
          });
          return;
        }
      }
    }

    // Also validate and correct the unlockedWeeks array
    const { correctedUnlockedWeeks } = validateUnlockedWeeks(
      completedTasks,
      resolvedUnlockedWeeks,
      resolvedTotalWeeks
    );

    // Validate currentWeek is within unlocked range
    const validCurrentWeek = correctedUnlockedWeeks.includes(currentWeek || 1)
      ? (currentWeek || 1)
      : Math.max(...correctedUnlockedWeeks);

    const progress = await RoadmapProgress.findOneAndUpdate(
      { userId: req.user._id, roadmapId },
      {
        userId: req.user._id,
        roadmapId,
        discipline,
        ageGroup: ageGroup || '15-25',
        completedTasks: completedTasks || [],
        currentWeek: validCurrentWeek,
        totalWeeks: resolvedTotalWeeks,
        unlockedWeeks: correctedUnlockedWeeks,
      },
      { upsert: true, new: true, runValidators: true }
    );

    // Compute per-week progress for the response
    const weekProgress = computeWeekProgress(completedTasks, resolvedTotalWeeks, perWeek);

    res.json({ success: true, data: progress, weekProgress, message: 'Progress saved' });
  } catch (error) {
    console.error('Save roadmap progress error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/roadmaps/progress/:roadmapId/can-unlock/:weekNumber - Check if a week can be unlocked
export const canUnlockWeek = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { roadmapId, weekNumber } = req.params;
    const week = parseInt(weekNumber, 10);

    if (isNaN(week) || week < 1) {
      res.status(400).json({ success: false, message: 'Invalid week number' });
      return;
    }

    // Week 1 is always unlocked
    if (week <= 1) {
      res.json({ success: true, data: { unlocked: true, completedPrevious: 0, requiredPrevious: 0 } });
      return;
    }

    const progress = await RoadmapProgress.findOne({ userId: req.user._id, roadmapId }).lean();
    const completedTasks: string[] = progress?.completedTasks || [];

    const previousWeekTasks = completedTasks.filter(t => getWeekFromTaskId(t) === week - 1);
    const completedPrevious = previousWeekTasks.length;
    const requiredPrevious = EXERCISES_PER_WEEK;
    const unlocked = completedPrevious >= requiredPrevious;

    res.json({ success: true, data: { unlocked, completedPrevious, requiredPrevious } });
  } catch (error) {
    console.error('Can unlock week error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/roadmaps/progress/validate - Validate if a task can be toggled based on week-locking rules
export const validateTaskToggle = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { roadmapId, taskId, tasksPerWeek } = req.body;

    if (!roadmapId || !taskId) {
      res.status(400).json({ success: false, message: 'roadmapId and taskId are required' });
      return;
    }

    const perWeek = tasksPerWeek || EXERCISES_PER_WEEK;
    const taskWeek = getWeekFromTaskId(taskId);

    // Week 1 tasks can always be toggled
    if (taskWeek === null || taskWeek <= 1) {
      res.json({ success: true, data: { allowed: true } });
      return;
    }

    // Check if previous week is fully completed
    const progress = await RoadmapProgress.findOne({ userId: req.user._id, roadmapId }).lean();
    const completedTasks: string[] = progress?.completedTasks || [];

    const previousWeekComplete = isWeekFullyCompleted(completedTasks, taskWeek - 1, perWeek);

    res.json({
      success: true,
      data: {
        allowed: previousWeekComplete,
        reason: previousWeekComplete ? undefined : `Complete all Week ${taskWeek - 1} tasks first`,
      },
    });
  } catch (error) {
    console.error('Validate task toggle error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/roadmaps - List available roadmaps (static metadata)
export const getRoadmaps = async (req: Request, res: Response): Promise<void> => {
  try {
    const roadmaps = [
      { id: 'bjj-under15', discipline: 'BJJ', ageGroup: 'under-15', title: 'BJJ for Young Athletes', weeks: 4, description: 'Safe BJJ fundamentals for young athletes with focus on body awareness and fun drills' },
      { id: 'bjj-15-25', discipline: 'BJJ', ageGroup: '15-25', title: 'BJJ Fundamentals', weeks: 4, description: 'Master the gentle art from white belt basics to advanced submissions' },
      { id: 'bjj-25plus', discipline: 'BJJ', ageGroup: '25+', title: 'BJJ for Adults', weeks: 4, description: 'Smart BJJ training with emphasis on technique over athleticism and injury prevention' },
      { id: 'wrestling-under15', discipline: 'Wrestling', ageGroup: 'under-15', title: 'Youth Wrestling', weeks: 4, description: 'Fun wrestling basics with safety-first approach' },
      { id: 'wrestling-15-25', discipline: 'Wrestling', ageGroup: '15-25', title: 'Wrestling Fundamentals', weeks: 4, description: 'Build a solid wrestling foundation for MMA and competition' },
      { id: 'wrestling-25plus', discipline: 'Wrestling', ageGroup: '25+', title: 'Wrestling for Adults', weeks: 4, description: 'Practical wrestling with joint-friendly techniques' },
      { id: 'mma-under15', discipline: 'MMA', ageGroup: 'under-15', title: 'Youth MMA', weeks: 4, description: 'Safe introduction to mixed martial arts for young athletes' },
      { id: 'mma-15-25', discipline: 'MMA', ageGroup: '15-25', title: 'MMA Striking Fundamentals', weeks: 4, description: 'Complete striking program for mixed martial arts' },
      { id: 'mma-25plus', discipline: 'MMA', ageGroup: '25+', title: 'MMA for Adults', weeks: 4, description: 'Practical MMA training with focus on fitness and self-defense' },
    ];

    res.json({ success: true, data: roadmaps });
  } catch (error) {
    console.error('Get roadmaps error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
