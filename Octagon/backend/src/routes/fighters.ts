import { Router } from 'express';
import {
  getFighters,
  getFighterById,
  searchFighters,
  getFighterByName,
  compareFighters,
  getFighterStats,
  getTopFighters,
} from '../controllers/fighterController';

const router = Router();

// GET /api/fighters - Get all fighters with pagination
router.get('/', getFighters);

// GET /api/fighters/search - Search fighters by name
router.get('/search', searchFighters);

// GET /api/fighters/compare - Compare two fighters
router.get('/compare', compareFighters);

// GET /api/fighters/top - Get top fighters by stat
router.get('/top', getTopFighters);

// GET /api/fighters/name/:name - Get fighter by name
router.get('/name/:name', getFighterByName);

// GET /api/fighters/:id - Get fighter by ID
router.get('/:id', getFighterById);

// GET /api/fighters/:id/stats - Get fighter's fight history stats
router.get('/:id/stats', getFighterStats);

export default router;
