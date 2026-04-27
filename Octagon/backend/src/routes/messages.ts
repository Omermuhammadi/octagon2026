import { Router } from 'express';
import {
  listConversations,
  getThread,
  sendMessage,
  getUnreadCount,
} from '../controllers/messageController';
import { protect } from '../middleware';

const router = Router();

router.use(protect);

router.get('/conversations', listConversations);
router.get('/unread-count', getUnreadCount);
router.get('/thread/:userId', getThread);
router.post('/thread/:userId', sendMessage);

export default router;
