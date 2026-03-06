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
      recentOrders,
    ] = await Promise.all([
      Prediction.countDocuments({ userId }),
      Prediction.countDocuments({ userId, confidence: { $gte: 70 } }),
      RoadmapProgress.find({ userId }).lean(),
      FormSession.find({ userId }).sort({ createdAt: -1 }).limit(10).lean(),
      Order.countDocuments({ userId }),
      ChatLog.countDocuments({ userId }),
      Prediction.find({ userId }).sort({ createdAt: -1 }).limit(5).lean(),
      FormSession.find({ userId }).sort({ createdAt: -1 }).limit(5).lean(),
      Order.find({ userId }).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    // Average confidence of predictions (% of predictions with >70% model confidence)
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

    // Build recent activity feed (includes predictions, form checks, and orders)
    const recentActivity: { type: string; description: string; date: string; icon?: string }[] = [];

    for (const p of recentPredictions) {
      recentActivity.push({
        type: 'prediction',
        description: `Predicted ${p.predictedWinner} wins ${p.fighter1Name} vs ${p.fighter2Name}`,
        date: (p.createdAt || new Date()).toISOString(),
        icon: 'target',
      });
    }

    for (const fs of recentFormSessions) {
      recentActivity.push({
        type: 'form-check',
        description: `Form check: ${fs.technique} - ${fs.result} (${fs.overallScore}/100)`,
        date: (fs.createdAt || new Date()).toISOString(),
        icon: 'activity',
      });
    }

    for (const order of recentOrders) {
      recentActivity.push({
        type: 'order',
        description: `Ordered ${order.items?.length || 0} item(s) — Rs. ${order.total?.toLocaleString() || 0}`,
        date: (order.createdAt || new Date()).toISOString(),
        icon: 'shopping-bag',
      });
    }

    // Sort by date descending
    recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Roadmap summary
    const roadmapSummary = roadmapProgress.map(rp => ({
      roadmapId: rp.roadmapId,
      discipline: rp.discipline,
      ageGroup: rp.ageGroup,
      completedTasks: rp.completedTasks?.length || 0,
      currentWeek: rp.currentWeek,
      totalWeeks: rp.totalWeeks || 4,
      progress: (rp.totalWeeks || 4) > 0
        ? Math.round((rp.currentWeek / (rp.totalWeeks || 4)) * 100) : 0,
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
