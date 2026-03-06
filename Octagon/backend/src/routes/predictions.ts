import { Router } from 'express';
import { createPrediction, getPredictionHistory } from '../controllers/predictionController';
import { protect } from '../middleware';

const router = Router();

// POST /api/predictions - Generate prediction (optionally authenticated)
router.post('/', protect, createPrediction);

// GET /api/predictions/history - Get user's prediction history
router.get('/history', protect, getPredictionHistory);

export default router;
