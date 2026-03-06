import { Request, Response } from 'express';
import { Event, FightStats } from '../models';

// Get all events with pagination
export const getEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status as string; // 'upcoming' or 'completed'

    const filter: Record<string, unknown> = {};
    if (status) {
      filter.status = status;
    }

    const [events, total] = await Promise.all([
      Event.find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Event.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get event by ID
export const getEventById = async (req: Request, res: Response): Promise<void> => {
  try {
    const event = await Event.findById(req.params.id).lean();
    
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    res.json({ success: true, data: event });
  } catch (error) {
    console.error('Get event by ID error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get event by eventId (from CSV)
export const getEventByEventId = async (req: Request, res: Response): Promise<void> => {
  try {
    const event = await Event.findOne({ eventId: req.params.eventId }).lean();
    
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    res.json({ success: true, data: event });
  } catch (error) {
    console.error('Get event by eventId error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get upcoming events
export const getUpcomingEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const events = await Event.find({ 
      status: 'upcoming',
      date: { $gte: new Date() } 
    })
      .sort({ date: 1 })
      .limit(limit)
      .lean();

    res.json({ success: true, data: events, count: events.length });
  } catch (error) {
    console.error('Get upcoming events error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get recent events (completed)
export const getRecentEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const events = await Event.find({ status: 'completed' })
      .sort({ date: -1 })
      .limit(limit)
      .lean();

    res.json({ success: true, data: events, count: events.length });
  } catch (error) {
    console.error('Get recent events error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Search events by name
export const searchEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = req.query.q as string;
    
    if (!query || query.length < 2) {
      res.status(400).json({ success: false, message: 'Search query must be at least 2 characters' });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 20;

    const events = await Event.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { location: { $regex: query, $options: 'i' } },
      ],
    })
      .sort({ date: -1 })
      .limit(limit)
      .lean();

    res.json({ success: true, data: events, count: events.length });
  } catch (error) {
    console.error('Search events error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get fights for an event (using fight stats)
export const getEventFights = async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;

    // Fight IDs follow pattern: eventId_fightNumber
    // So we search for all fight stats where fightId starts with eventId
    const fightStats = await FightStats.find({
      fightId: { $regex: `^${eventId}_`, $options: 'i' },
    })
      .sort({ fightId: 1, fighterPosition: 1 })
      .lean();

    // Group by fightId to get matchups
    const fightsMap = new Map<string, typeof fightStats>();
    fightStats.forEach((stat) => {
      const existing = fightsMap.get(stat.fightId) || [];
      existing.push(stat);
      fightsMap.set(stat.fightId, existing);
    });

    const fights = Array.from(fightsMap.entries()).map(([fightId, stats]) => ({
      fightId,
      fighters: stats,
    }));

    res.json({
      success: true,
      data: fights,
      count: fights.length,
    });
  } catch (error) {
    console.error('Get event fights error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get event statistics summary
export const getEventStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const [totalEvents, upcomingCount, completedCount] = await Promise.all([
      Event.countDocuments(),
      Event.countDocuments({ status: 'upcoming' }),
      Event.countDocuments({ status: 'completed' }),
    ]);

    const latestEvent = await Event.findOne({ status: 'completed' })
      .sort({ date: -1 })
      .lean();

    const nextEvent = await Event.findOne({ 
      status: 'upcoming',
      date: { $gte: new Date() }
    })
      .sort({ date: 1 })
      .lean();

    res.json({
      success: true,
      data: {
        totalEvents,
        upcomingCount,
        completedCount,
        latestEvent,
        nextEvent,
      },
    });
  } catch (error) {
    console.error('Get event stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
