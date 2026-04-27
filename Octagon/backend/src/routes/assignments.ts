import { Router } from 'express';
import {
  listAssignments,
  createAssignment,
  getAssignment,
  submitAssignment,
  reviewAssignment,
  deleteAssignment,
  getAssignmentStats,
} from '../controllers/assignmentController';
import { protect } from '../middleware';

const router = Router();

router.use(protect);

router.get('/', listAssignments);
router.post('/', createAssignment);
router.get('/stats', getAssignmentStats);
router.get('/:id', getAssignment);
router.post('/:id/submit', submitAssignment);
router.post('/:id/review', reviewAssignment);
router.delete('/:id', deleteAssignment);

export default router;
