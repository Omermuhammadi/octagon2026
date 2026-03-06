import { Router } from 'express';
import {
  getEvents,
  getEventById,
  getEventByEventId,
  getUpcomingEvents,
  getRecentEvents,
  searchEvents,
  getEventFights,
  getEventStats,
} from '../controllers/eventController';

const router = Router();

// GET /api/events - Get all events with pagination
router.get('/', getEvents);

// GET /api/events/upcoming - Get upcoming events
router.get('/upcoming', getUpcomingEvents);

// GET /api/events/recent - Get recent completed events
router.get('/recent', getRecentEvents);

// GET /api/events/search - Search events by name/location
router.get('/search', searchEvents);

// GET /api/events/stats - Get event statistics summary
router.get('/stats', getEventStats);

// GET /api/events/event/:eventId - Get event by eventId (from CSV)
router.get('/event/:eventId', getEventByEventId);

// GET /api/events/:id - Get event by MongoDB ID
router.get('/:id', getEventById);

// GET /api/events/:eventId/fights - Get fights for an event
router.get('/:eventId/fights', getEventFights);

export default router;
