import { Router } from 'express';
import { getRoadmaps, getRoadmapProgress, saveRoadmapProgress } from '../controllers/roadmapController';
import { protect } from '../middleware';

const router = Router();

// GET /api/roadmaps - List available roadmaps
router.get('/', getRoadmaps);

// GET /api/roadmaps/progress - Get user's roadmap progress
router.get('/progress', protect, getRoadmapProgress);

// POST /api/roadmaps/progress - Save roadmap progress
router.post('/progress', protect, saveRoadmapProgress);

export default router;
