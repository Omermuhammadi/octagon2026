import { Router } from 'express';
import {
  getRoster,
  addToRoster,
  removeFromRoster,
  getUpcomingFights,
  getCoachStats,
} from '../controllers/coachRosterController';
import { protect, authorize } from '../middleware';

const router = Router();

// All roster routes require coach role
router.get('/', protect, authorize('coach'), getRoster);
router.post('/', protect, authorize('coach'), addToRoster);
router.get('/upcoming', protect, authorize('coach'), getUpcomingFights);
router.get('/stats', protect, authorize('coach'), getCoachStats);
router.delete('/:fighterId', protect, authorize('coach'), removeFromRoster);

export default router;
