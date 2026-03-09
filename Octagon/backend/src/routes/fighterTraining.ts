import { Router } from 'express';
import {
  getAssignments,
  assignTraining,
  updateProgress,
  deleteAssignment,
} from '../controllers/fighterTrainingController';
import { protect, authorize } from '../middleware';

const router = Router();

// All fighter training routes require coach role
router.get('/', protect, authorize('coach'), getAssignments);
router.post('/', protect, authorize('coach'), assignTraining);
router.put('/:id', protect, authorize('coach'), updateProgress);
router.delete('/:id', protect, authorize('coach'), deleteAssignment);

export default router;
