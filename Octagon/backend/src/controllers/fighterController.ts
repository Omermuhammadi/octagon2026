import { Request, Response } from 'express';
import { Fighter, FightStats } from '../models';

// Get all fighters with pagination
export const getFighters = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const [fighters, total] = await Promise.all([
      Fighter.find()
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Fighter.countDocuments(),
    ]);

    res.json({
      success: true,
      data: fighters,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get fighters error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get fighter by ID
export const getFighterById = async (req: Request, res: Response): Promise<void> => {
  try {
    const fighter = await Fighter.findById(req.params.id).lean();
    
    if (!fighter) {
      res.status(404).json({ success: false, message: 'Fighter not found' });
      return;
    }

    res.json({ success: true, data: fighter });
  } catch (error) {
    console.error('Get fighter by ID error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Search fighters by name
export const searchFighters = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = req.query.q as string;
    
    if (!query || query.length < 2) {
      res.status(400).json({ success: false, message: 'Search query must be at least 2 characters' });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 20;

    const fighters = await Fighter.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { nickname: { $regex: query, $options: 'i' } },
      ],
    })
      .sort({ name: 1 })
      .limit(limit)
      .lean();

    res.json({ success: true, data: fighters, count: fighters.length });
  } catch (error) {
    console.error('Search fighters error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get fighter by name (exact or closest match)
export const getFighterByName = async (req: Request, res: Response): Promise<void> => {
  try {
    const name = req.params.name;
    
    // Try exact match first (case insensitive)
    let fighter = await Fighter.findOne({
      name: { $regex: `^${name}$`, $options: 'i' },
    }).lean();

    // If not found, try partial match
    if (!fighter) {
      fighter = await Fighter.findOne({
        name: { $regex: name, $options: 'i' },
      }).lean();
    }

    if (!fighter) {
      res.status(404).json({ success: false, message: 'Fighter not found' });
      return;
    }

    res.json({ success: true, data: fighter });
  } catch (error) {
    console.error('Get fighter by name error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Compare two fighters
export const compareFighters = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fighter1, fighter2 } = req.query;

    if (!fighter1 || !fighter2) {
      res.status(400).json({ 
        success: false, 
        message: 'Please provide both fighter1 and fighter2 names' 
      });
      return;
    }

    const [fighterOne, fighterTwo] = await Promise.all([
      Fighter.findOne({ name: { $regex: fighter1 as string, $options: 'i' } }).lean(),
      Fighter.findOne({ name: { $regex: fighter2 as string, $options: 'i' } }).lean(),
    ]);

    if (!fighterOne || !fighterTwo) {
      res.status(404).json({ 
        success: false, 
        message: `Fighter not found: ${!fighterOne ? fighter1 : fighter2}` 
      });
      return;
    }

    // Get fight stats for both fighters
    const [fighter1Stats, fighter2Stats] = await Promise.all([
      FightStats.find({ fighterName: fighterOne.name }).sort({ fightId: -1 }).limit(10).lean(),
      FightStats.find({ fighterName: fighterTwo.name }).sort({ fightId: -1 }).limit(10).lean(),
    ]);

    res.json({
      success: true,
      data: {
        fighter1: {
          profile: fighterOne,
          recentStats: fighter1Stats,
        },
        fighter2: {
          profile: fighterTwo,
          recentStats: fighter2Stats,
        },
      },
    });
  } catch (error) {
    console.error('Compare fighters error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get fighter stats (fight history)
export const getFighterStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;

    const fighter = await Fighter.findById(id).lean();
    
    if (!fighter) {
      res.status(404).json({ success: false, message: 'Fighter not found' });
      return;
    }

    const stats = await FightStats.find({ fighterName: fighter.name })
      .sort({ fightId: -1 })
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: {
        fighter,
        stats,
        totalFights: stats.length,
      },
    });
  } catch (error) {
    console.error('Get fighter stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get top fighters by various stats
export const getTopFighters = async (req: Request, res: Response): Promise<void> => {
  try {
    const stat = (req.query.stat as string) || 'wins';
    const limit = parseInt(req.query.limit as string) || 10;

    const validStats = [
      'wins', 'slpm', 'strikingAccuracy', 'takedownAvg', 
      'takedownAccuracy', 'submissionAvg', 'strikingDefense', 'takedownDefense'
    ];

    if (!validStats.includes(stat)) {
      res.status(400).json({ 
        success: false, 
        message: `Invalid stat. Valid options: ${validStats.join(', ')}` 
      });
      return;
    }

    const fighters = await Fighter.find({ [stat]: { $gt: 0 } })
      .sort({ [stat]: -1 })
      .limit(limit)
      .lean();

    res.json({ success: true, data: fighters, stat });
  } catch (error) {
    console.error('Get top fighters error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
