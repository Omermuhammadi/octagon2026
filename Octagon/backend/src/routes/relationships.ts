import { Router } from 'express';
import {
  listRelationships,
  createRelationship,
  respondToRelationship,
  endRelationship,
  listMyTrainees,
  getMyCoach,
  discoverAthletes,
} from '../controllers/coachRelationshipController';
import { protect } from '../middleware';

const router = Router();

router.use(protect);

router.get('/', listRelationships);
router.post('/', createRelationship);
router.get('/trainees', listMyTrainees);
router.get('/my-coach', getMyCoach);
router.get('/discover', discoverAthletes);
router.patch('/:id/respond', respondToRelationship);
router.patch('/:id/end', endRelationship);

export default router;
