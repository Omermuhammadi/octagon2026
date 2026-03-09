import { Response } from 'express';
import { AuthRequest } from '../middleware';
import { Fighter, FightStats, Strategy } from '../models';
import { generateStrategy } from '../services/strategyEngine';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * POST /api/strategy/generate - Generate a new strategy for a matchup
 */
export const generateStrategyHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fighter1Name, fighter2Name } = req.body;

    if (!fighter1Name || !fighter2Name) {
      res.status(400).json({ success: false, message: 'Both fighter1Name and fighter2Name are required' });
      return;
    }

    if (fighter1Name.toLowerCase() === fighter2Name.toLowerCase()) {
      res.status(400).json({ success: false, message: 'Cannot generate strategy for a fighter against themselves' });
      return;
    }

    // Look up fighters
    const [f1, f2] = await Promise.all([
      Fighter.findOne({ name: { $regex: escapeRegex(fighter1Name), $options: 'i' } }),
      Fighter.findOne({ name: { $regex: escapeRegex(fighter2Name), $options: 'i' } }),
    ]);

    if (!f1 || !f2) {
      res.status(404).json({
        success: false,
        message: `Fighter not found: ${!f1 ? fighter1Name : fighter2Name}`,
      });
      return;
    }

    // Get fight stats for both fighters (last 10 fights each)
    const [f1Stats, f2Stats] = await Promise.all([
      FightStats.find({ fighterName: { $regex: escapeRegex(f1.name), $options: 'i' } })
        .sort({ createdAt: -1 }).limit(10).lean(),
      FightStats.find({ fighterName: { $regex: escapeRegex(f2.name), $options: 'i' } })
        .sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    // Generate strategy
    const strategy = await generateStrategy(f1, f2, f1Stats, f2Stats);

    // Save to DB
    const saved = await Strategy.create({
      coachId: req.user!._id,
      fighter1Name: f1.name,
      fighter2Name: f2.name,
      fighter1Id: f1._id,
      fighter2Id: f2._id,
      prediction: {
        winner: strategy.prediction.winner,
        winProbability: strategy.prediction.winnerProbability,
        method: strategy.prediction.predictedMethod,
        round: strategy.prediction.predictedRound,
        confidence: strategy.prediction.confidence,
        topFactors: strategy.prediction.topFactors,
      },
      strengthsWeaknesses: strategy.strengthsWeaknesses,
      roundStrategy: strategy.roundStrategy,
      rangeAnalysis: strategy.rangeAnalysis,
      strikeTargeting: strategy.strikeTargeting,
      takedownPlan: strategy.takedownPlan,
      dangerZones: strategy.dangerZones,
      cornerAdvice: strategy.cornerAdvice,
    });

    res.json({
      success: true,
      data: {
        strategyId: saved._id,
        fighter1: {
          name: f1.name,
          record: `${f1.wins}-${f1.losses}-${f1.draws}`,
          height: f1.height,
          reach: f1.reach,
          stance: f1.stance,
        },
        fighter2: {
          name: f2.name,
          record: `${f2.wins}-${f2.losses}-${f2.draws}`,
          height: f2.height,
          reach: f2.reach,
          stance: f2.stance,
        },
        ...strategy,
        fightStatsAvailable: {
          fighter1: f1Stats.length,
          fighter2: f2Stats.length,
        },
      },
    });
  } catch (error: any) {
    console.error('Strategy generation error:', error);
    if (error.message?.includes('Model not trained')) {
      res.status(503).json({ success: false, message: 'Prediction model not yet trained. Contact admin.' });
    } else {
      res.status(500).json({ success: false, message: 'Server error generating strategy' });
    }
  }
};

/**
 * GET /api/strategy/history - Get coach's strategy history
 */
export const getStrategyHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query?.limit as string) || 20;
    const strategies = await Strategy.find({ coachId: req.user!._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('fighter1Name fighter2Name prediction.winner prediction.winProbability prediction.method createdAt')
      .lean();

    res.json({ success: true, data: strategies });
  } catch (error) {
    console.error('Get strategy history error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * GET /api/strategy/:id - Get a single strategy by ID
 */
export const getStrategy = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const strategy = await Strategy.findOne({
      _id: req.params.id,
      coachId: req.user!._id,
    }).lean();

    if (!strategy) {
      res.status(404).json({ success: false, message: 'Strategy not found' });
      return;
    }

    res.json({ success: true, data: strategy });
  } catch (error) {
    console.error('Get strategy error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * DELETE /api/strategy/:id - Delete a strategy
 */
export const deleteStrategy = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await Strategy.findOneAndDelete({
      _id: req.params.id,
      coachId: req.user!._id,
    });

    if (!result) {
      res.status(404).json({ success: false, message: 'Strategy not found' });
      return;
    }

    res.json({ success: true, message: 'Strategy deleted' });
  } catch (error) {
    console.error('Delete strategy error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
