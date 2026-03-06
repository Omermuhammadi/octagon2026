import { Router } from 'express';
import { getGyms, getNearbyGyms, seedGyms } from '../controllers/gymController';
import { protect } from '../middleware';

const router = Router();

// GET /api/gyms - Get gyms with filters
router.get('/', getGyms);

// GET /api/gyms/nearby - Get nearby gyms
router.get('/nearby', getNearbyGyms);

// POST /api/gyms/seed - Seed gym data (requires auth)
router.post('/seed', protect, seedGyms);

export default router;
