import { Router } from 'express';
import { analyzeForm, getFormHistory } from '../controllers/formCheckController';
import { protect } from '../middleware';

const router = Router();

// POST /api/form-check - Analyze form
router.post('/', protect, analyzeForm);

// GET /api/form-check/history - Get form check history
router.get('/history', protect, getFormHistory);

export default router;
