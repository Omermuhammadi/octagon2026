import { Router } from 'express';
import {
  listActivity,
  markAllRead,
  getUnreadActivityCount,
} from '../controllers/activityController';
import { protect } from '../middleware';

const router = Router();

router.use(protect);

router.get('/', listActivity);
router.patch('/read', markAllRead);
router.get('/unread-count', getUnreadActivityCount);

export default router;
