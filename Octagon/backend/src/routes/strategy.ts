import { Router } from 'express';
import {
  generateStrategyHandler,
  getStrategyHistory,
  getStrategy,
  deleteStrategy,
} from '../controllers/strategyController';
import { protect, authorize } from '../middleware';

const router = Router();

// All strategy routes require coach role
router.post('/generate', protect, authorize('coach'), generateStrategyHandler);
router.get('/history', protect, authorize('coach'), getStrategyHistory);
router.get('/:id', protect, authorize('coach'), getStrategy);
router.delete('/:id', protect, authorize('coach'), deleteStrategy);

export default router;
