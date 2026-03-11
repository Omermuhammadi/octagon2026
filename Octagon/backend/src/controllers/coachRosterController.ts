import { Response } from 'express';
import { AuthRequest } from '../middleware';
import mongoose from 'mongoose';
import { Fighter, CoachRoster, Event, Strategy } from '../models';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const MAX_ROSTER_SIZE = 20;

/**
 * GET /api/coach/roster - Get coach's fighter roster
 */
export const getRoster = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const roster = await CoachRoster.find({ coachId: req.user!._id })
      .sort({ addedAt: -1 })
      .lean();

    // Enrich with current fighter data
    const fighterIds = roster.map(r => r.fighterId);
    const fighters = await Fighter.find({ _id: { $in: fighterIds } }).lean();
    const fighterMap = new Map(fighters.map(f => [f._id.toString(), f]));

    const enriched = roster.map(r => {
      const fighter = fighterMap.get(r.fighterId.toString());
      return {
        _id: r._id,
        fighterId: r.fighterId,
        fighterName: r.fighterName,
        notes: r.notes,
        addedAt: r.addedAt,
        record: fighter ? `${fighter.wins}-${fighter.losses}-${fighter.draws}` : 'N/A',
        stance: fighter?.stance || '',
        height: fighter?.height || '',
      };
    });

    res.json({ success: true, data: enriched });
  } catch (error) {
    console.error('Get roster error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/coach/roster - Add fighter to roster
 */
export const addToRoster = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fighterName, notes } = req.body;

    if (!fighterName) {
      res.status(400).json({ success: false, message: 'fighterName is required' });
      return;
    }

    // Check roster size limit
    const currentSize = await CoachRoster.countDocuments({ coachId: req.user!._id });
    if (currentSize >= MAX_ROSTER_SIZE) {
      res.status(400).json({ success: false, message: `Roster limit reached (max ${MAX_ROSTER_SIZE} fighters)` });
      return;
    }

    // Find the fighter
    const fighter = await Fighter.findOne({
      name: { $regex: escapeRegex(fighterName), $options: 'i' },
    }).lean();

    if (!fighter) {
      res.status(404).json({ success: false, message: `Fighter not found: ${fighterName}` });
      return;
    }

    // Check for duplicate
    const existing = await CoachRoster.findOne({
      coachId: req.user!._id,
      fighterId: fighter._id,
    });

    if (existing) {
      res.status(409).json({ success: false, message: `${fighter.name} is already in your roster` });
      return;
    }

    const entry = await CoachRoster.create({
      coachId: req.user!._id,
      fighterId: fighter._id,
      fighterName: fighter.name,
      notes: notes || '',
    });

    res.status(201).json({
      success: true,
      data: {
        _id: entry._id,
        fighterId: fighter._id,
        fighterName: fighter.name,
        notes: entry.notes,
        addedAt: entry.addedAt,
        record: `${fighter.wins}-${fighter.losses}-${fighter.draws}`,
        stance: fighter.stance,
        height: fighter.height,
      },
    });
  } catch (error) {
    console.error('Add to roster error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * DELETE /api/coach/roster/:fighterId - Remove fighter from roster
 */
export const removeFromRoster = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await CoachRoster.findOneAndDelete({
      coachId: req.user!._id,
      fighterId: req.params.fighterId,
    });

    if (!result) {
      res.status(404).json({ success: false, message: 'Fighter not in roster' });
      return;
    }

    res.json({ success: true, message: 'Fighter removed from roster' });
  } catch (error) {
    console.error('Remove from roster error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * GET /api/coach/roster/upcoming - Get roster fighters with upcoming fights
 */
export const getUpcomingFights = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const roster = await CoachRoster.find({ coachId: req.user!._id }).lean();
    const rosterNames = roster.map(r => r.fighterName);

    if (rosterNames.length === 0) {
      res.json({ success: true, data: [] });
      return;
    }

    // Find upcoming events that have any of the roster fighters
    const upcomingEvents = await Event.find({
      status: 'upcoming',
      date: { $gte: new Date() },
    }).sort({ date: 1 }).lean();

    const matches: {
      fighterName: string;
      opponent: string;
      eventName: string;
      eventDate: Date;
      eventId: string;
    }[] = [];

    for (const event of upcomingEvents) {
      if (!event.fights) continue;
      for (const fight of event.fights) {
        const f1Match = rosterNames.find(n => fight.fighter1?.toLowerCase().includes(n.toLowerCase()));
        const f2Match = rosterNames.find(n => fight.fighter2?.toLowerCase().includes(n.toLowerCase()));

        if (f1Match) {
          matches.push({
            fighterName: f1Match,
            opponent: fight.fighter2 || 'TBD',
            eventName: event.name,
            eventDate: event.date,
            eventId: event._id.toString(),
          });
        }
        if (f2Match) {
          matches.push({
            fighterName: f2Match,
            opponent: fight.fighter1 || 'TBD',
            eventName: event.name,
            eventDate: event.date,
            eventId: event._id.toString(),
          });
        }
      }
    }

    res.json({ success: true, data: matches });
  } catch (error) {
    console.error('Get upcoming fights error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * GET /api/coach/roster/stats - Get coach-specific dashboard stats
 */
export const getCoachStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const coachId = req.user!._id;

    const [strategiesGenerated, avgResult] = await Promise.all([
      Strategy.countDocuments({ coachId }),
      Strategy.aggregate([
        { $match: { coachId: new mongoose.Types.ObjectId(coachId as unknown as string) } },
        { $group: { _id: null, avgConfidence: { $avg: '$prediction.confidence' } } },
      ]),
    ]);

    const avgConfidence = avgResult.length > 0
      ? Math.round(avgResult[0].avgConfidence || 0)
      : 0;

    res.json({
      success: true,
      data: { strategiesGenerated, avgConfidence },
    });
  } catch (error) {
    console.error('Get coach stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
