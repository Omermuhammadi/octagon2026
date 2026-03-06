import { Router } from 'express';
import { sendMessage, getChatHistory } from '../controllers/chatController';
import { protect, optionalAuth } from '../middleware';

const router = Router();

// POST /api/chat - Send message (works with or without auth)
router.post('/', optionalAuth, sendMessage);

// GET /api/chat/history - Get chat history (requires auth)
router.get('/history', protect, getChatHistory);

export default router;
