import { Router } from 'express';
import { protect } from '../middleware/auth';
import { logWeight, getWeightHistory, setTarget, deleteEntry } from '../controllers/weightCutController';

const router = Router();

router.use(protect);

router.post('/log', logWeight);
router.get('/history', getWeightHistory);
router.put('/target', setTarget);
router.delete('/entry/:entryId', deleteEntry);

export default router;
