import { Router } from 'express';
import { protect } from '../middleware/auth';
import { generateDossier, searchOpponent } from '../controllers/opponentDossierController';

const router = Router();

router.use(protect);
router.get('/search', searchOpponent);
router.post('/generate', generateDossier);

export default router;
