import { Router } from 'express';
import { getRoadmaps, getRoadmapProgress, saveRoadmapProgress, canUnlockWeek, validateTaskToggle } from '../controllers/roadmapController';
import { protect } from '../middleware';

const router = Router();

// GET /api/roadmaps - List available roadmaps
router.get('/', getRoadmaps);

// GET /api/roadmaps/progress - Get user's roadmap progress
router.get('/progress', protect, getRoadmapProgress);

// GET /api/roadmaps/progress/:roadmapId/can-unlock/:weekNumber - Check if a week is unlocked
router.get('/progress/:roadmapId/can-unlock/:weekNumber', protect, canUnlockWeek);

// POST /api/roadmaps/progress/validate - Validate if a task can be toggled
router.post('/progress/validate', protect, validateTaskToggle);

// POST /api/roadmaps/progress - Save roadmap progress
router.post('/progress', protect, saveRoadmapProgress);

export default router;
