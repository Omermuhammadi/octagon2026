import { Request, Response } from 'express';
import { RoadmapProgress } from '../models';
import { AuthRequest } from '../middleware';

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

    const { roadmapId, discipline, ageGroup, completedTasks, currentWeek, totalWeeks } = req.body;

    if (!roadmapId || !discipline) {
      res.status(400).json({ success: false, message: 'roadmapId and discipline are required' });
      return;
    }

    const progress = await RoadmapProgress.findOneAndUpdate(
      { userId: req.user._id, roadmapId },
      {
        userId: req.user._id,
        roadmapId,
        discipline,
        ageGroup: ageGroup || '15-25',
        completedTasks: completedTasks || [],
        currentWeek: currentWeek || 1,
        totalWeeks: totalWeeks || 4,
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.json({ success: true, data: progress, message: 'Progress saved' });
  } catch (error) {
    console.error('Save roadmap progress error:', error);
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
