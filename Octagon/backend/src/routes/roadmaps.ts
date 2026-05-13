import { Router } from 'express';
import {
  getRoadmaps,
  getRoadmapProgress,
  saveRoadmapProgress,
  canUnlockWeek,
  validateTaskToggle,
  submitQuiz,
  logPractice,
  getTraineeRoadmapProgress,
} from '../controllers/roadmapController';
import { protect } from '../middleware';

const router = Router();

// GET /api/roadmaps - List available roadmaps
router.get('/', getRoadmaps);

// GET /api/roadmaps/progress - Get user's roadmap progress
router.get('/progress', protect, getRoadmapProgress);

// GET /api/roadmaps/progress/trainees - Coach view (must come before /:roadmapId/...)
router.get('/progress/trainees', protect, getTraineeRoadmapProgress);

// GET /api/roadmaps/progress/:roadmapId/can-unlock/:weekNumber
router.get('/progress/:roadmapId/can-unlock/:weekNumber', protect, canUnlockWeek);

// POST /api/roadmaps/progress/validate
router.post('/progress/validate', protect, validateTaskToggle);

// POST /api/roadmaps/progress - Save roadmap progress
router.post('/progress', protect, saveRoadmapProgress);

// POST /api/roadmaps/progress/quiz - Save a quiz attempt for a step
router.post('/progress/quiz', protect, submitQuiz);

// POST /api/roadmaps/progress/practice - Log a practice session for a step
router.post('/progress/practice', protect, logPractice);

export default router;
