import { Response } from 'express';
import { AuthRequest } from '../middleware';
import { Fighter, Prediction } from '../models';
import { predict } from '../services/predictionEngine';

/**
 * POST /api/predictions - Generate a prediction for a fighter matchup
 */
export const createPrediction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fighter1Name, fighter2Name } = req.body;

    if (!fighter1Name || !fighter2Name) {
      res.status(400).json({ success: false, message: 'Both fighter1Name and fighter2Name are required' });
      return;
    }

    // Look up fighters
    const [f1, f2] = await Promise.all([
      Fighter.findOne({ name: { $regex: fighter1Name, $options: 'i' } }).lean(),
      Fighter.findOne({ name: { $regex: fighter2Name, $options: 'i' } }).lean(),
    ]);

    if (!f1 || !f2) {
      res.status(404).json({
        success: false,
        message: `Fighter not found: ${!f1 ? fighter1Name : fighter2Name}`,
      });
      return;
    }

    // Run prediction engine
    const result = predict(
      {
        name: f1.name,
        wins: f1.wins,
        losses: f1.losses,
        draws: f1.draws,
        slpm: f1.slpm,
        strikingAccuracy: f1.strikingAccuracy,
        sapm: f1.sapm,
        strikingDefense: f1.strikingDefense,
        takedownAvg: f1.takedownAvg,
        takedownAccuracy: f1.takedownAccuracy,
        takedownDefense: f1.takedownDefense,
        submissionAvg: f1.submissionAvg,
        reach: f1.reach,
      },
      {
        name: f2.name,
        wins: f2.wins,
        losses: f2.losses,
        draws: f2.draws,
        slpm: f2.slpm,
        strikingAccuracy: f2.strikingAccuracy,
        sapm: f2.sapm,
        strikingDefense: f2.strikingDefense,
        takedownAvg: f2.takedownAvg,
        takedownAccuracy: f2.takedownAccuracy,
        takedownDefense: f2.takedownDefense,
        submissionAvg: f2.submissionAvg,
        reach: f2.reach,
      }
    );

    // Save prediction to DB if user is authenticated
    if (req.user) {
      await Prediction.create({
        userId: req.user._id,
        fighter1Id: f1._id,
        fighter2Id: f2._id,
        fighter1Name: f1.name,
        fighter2Name: f2.name,
        predictedWinner: result.winner,
        winProbability: result.winnerProbability,
        method: result.predictedMethod,
        predictedRound: result.predictedRound,
        confidence: result.confidence,
        factors: result.topFactors.map(f => f.factor),
      });

      // Increment user prediction count
      await (await import('../models')).User.findByIdAndUpdate(req.user._id, {
        $inc: { predictionsMade: 1 },
      });
    }

    res.json({
      success: true,
      data: {
        fighter1: {
          name: f1.name,
          record: `${f1.wins}-${f1.losses}-${f1.draws}`,
          probability: Math.round((result.winner === f1.name ? result.winnerProbability : result.loserProbability) * 100),
        },
        fighter2: {
          name: f2.name,
          record: `${f2.wins}-${f2.losses}-${f2.draws}`,
          probability: Math.round((result.winner === f2.name ? result.winnerProbability : result.loserProbability) * 100),
        },
        prediction: {
          winner: result.winner,
          loser: result.loser,
          method: result.predictedMethod,
          methodProbabilities: result.methodProbabilities,
          round: result.predictedRound,
          confidence: result.confidence,
          factors: result.topFactors.map(f => f.description),
          topFactors: result.topFactors,
        },
      },
    });
  } catch (error: any) {
    console.error('Prediction error:', error);
    if (error.message?.includes('Model not trained')) {
      res.status(503).json({ success: false, message: 'Prediction model not yet trained. Contact admin.' });
    } else {
      res.status(500).json({ success: false, message: 'Server error generating prediction' });
    }
  }
};

/**
 * GET /api/predictions/history - Get user's prediction history
 */
export const getPredictionHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query?.limit as string) || 20;
    const predictions = await Prediction.find({ userId: req.user?._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({ success: true, data: predictions });
  } catch (error) {
    console.error('Get prediction history error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
