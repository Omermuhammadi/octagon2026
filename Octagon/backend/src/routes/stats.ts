import { Router } from 'express';
import { getUserStats } from '../controllers/statsController';
import { protect } from '../middleware';

const router = Router();

// GET /api/stats - Get user dashboard stats (requires auth)
router.get('/', protect, getUserStats);

export default router;
