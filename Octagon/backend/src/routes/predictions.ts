import { Router } from 'express';
import { createPrediction, getPredictionHistory } from '../controllers/predictionController';
import { protect, optionalAuth } from '../middleware';

const router = Router();

// POST /api/predictions - Generate prediction (works with or without auth)
router.post('/', optionalAuth, createPrediction);

// GET /api/predictions/history - Get user's prediction history
router.get('/history', protect, getPredictionHistory);

export default router;
