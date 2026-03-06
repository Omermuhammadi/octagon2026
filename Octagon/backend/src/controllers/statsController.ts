import { Response } from 'express';
import { AuthRequest } from '../middleware';
import { User, Prediction, RoadmapProgress, FormSession, Order, ChatLog } from '../models';

// GET /api/stats - Get real user dashboard stats calculated from DB
export const getUserStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const userId = req.user._id;

    // Run all queries in parallel for performance
    const [
      predictionCount,
      highConfidencePredictions,
      roadmapProgress,
      formSessions,
      orderCount,
      chatSessionCount,
      recentPredictions,
      recentFormSessions,
    ] = await Promise.all([
      // Total predictions made
      Prediction.countDocuments({ userId }),
      // Predictions with high confidence (>70%) - used as accuracy proxy
      Prediction.countDocuments({ userId, confidence: { $gte: 70 } }),
      // All roadmap progress records
      RoadmapProgress.find({ userId }).lean(),
      // All form check sessions
      FormSession.find({ userId }).sort({ createdAt: -1 }).limit(10).lean(),
      // Total orders
      Order.countDocuments({ userId }),
      // Chat sessions
      ChatLog.countDocuments({ userId }),
      // Recent predictions for activity feed
      Prediction.find({ userId }).sort({ createdAt: -1 }).limit(5).lean(),
      // Recent form sessions for activity feed
      FormSession.find({ userId }).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    // Calculate accuracy rate
    const accuracyRate = predictionCount > 0
      ? Math.round((highConfidencePredictions / predictionCount) * 100)
      : 0;

    // Calculate training sessions from completed roadmap tasks
    const totalCompletedTasks = roadmapProgress.reduce(
      (sum, rp) => sum + (rp.completedTasks?.length || 0), 0
    );

    // Calculate days active since join
    const joinDate = req.user.joinDate || (req.user as any).createdAt;
    const daysActive = Math.max(1, Math.ceil(
      (Date.now() - new Date(joinDate).getTime()) / (1000 * 60 * 60 * 24)
    ));

    // Form check average score
    const formAvgScore = formSessions.length > 0
      ? Math.round(formSessions.reduce((sum, fs) => sum + fs.overallScore, 0) / formSessions.length)
      : 0;

    // Build recent activity feed
    const recentActivity: { type: string; description: string; date: string }[] = [];

    for (const p of recentPredictions) {
      recentActivity.push({
        type: 'prediction',
        description: `Predicted ${p.predictedWinner} wins ${p.fighter1Name} vs ${p.fighter2Name}`,
        date: (p.createdAt || new Date()).toISOString(),
      });
    }

    for (const fs of recentFormSessions) {
      recentActivity.push({
        type: 'form-check',
        description: `Form check: ${fs.technique} - ${fs.result} (${fs.overallScore}/100)`,
        date: (fs.createdAt || new Date()).toISOString(),
      });
    }

    // Sort by date descending
    recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Roadmap summary
    const roadmapSummary = roadmapProgress.map(rp => ({
      discipline: rp.discipline,
      ageGroup: rp.ageGroup,
      completedTasks: rp.completedTasks?.length || 0,
      currentWeek: rp.currentWeek,
      totalWeeks: rp.totalWeeks,
      progress: rp.totalWeeks > 0
        ? Math.round((rp.currentWeek / rp.totalWeeks) * 100) : 0,
    }));

    // Update user stats in DB for persistence
    try {
      await User.findByIdAndUpdate(userId, {
        $set: {
          predictionsMade: predictionCount,
          accuracyRate,
          trainingSessions: totalCompletedTasks,
          daysActive,
        },
      });
    } catch {
      // Non-critical
    }

    res.json({
      success: true,
      data: {
        // Core stats
        predictionsMade: predictionCount,
        accuracyRate,
        trainingSessions: totalCompletedTasks,
        daysActive,
        // Extended stats
        formCheckSessions: formSessions.length,
        formAvgScore,
        ordersPlaced: orderCount,
        chatSessions: chatSessionCount,
        // Activity feed
        recentActivity: recentActivity.slice(0, 10),
        // Roadmap progress
        roadmapProgress: roadmapSummary,
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
