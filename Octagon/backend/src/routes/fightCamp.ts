import { Router } from 'express';
import { protect } from '../middleware/auth';
import {
  createFightCamp,
  getActiveFightCamp,
  listFightCamps,
  updateMilestone,
  updateFightCampStatus,
  addSparringEntry,
  listSparringEntries,
  deleteSparringEntry,
} from '../controllers/fightCampController';

const router = Router();

router.use(protect);

router.post('/', createFightCamp);
router.get('/', getActiveFightCamp);
router.get('/all', listFightCamps);
router.patch('/:id/status', updateFightCampStatus);
router.patch('/:id/milestone/:milestoneId', updateMilestone);

router.post('/sparring', addSparringEntry);
router.get('/sparring', listSparringEntries);
router.delete('/sparring/:id', deleteSparringEntry);

export default router;
