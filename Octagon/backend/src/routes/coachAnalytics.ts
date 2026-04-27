import { Router } from 'express';
import { protect } from '../middleware/auth';
import { getTraineeAnalytics } from '../controllers/coachAnalyticsController';

const router = Router();

router.get('/trainee-analytics', protect, getTraineeAnalytics);

export default router;
