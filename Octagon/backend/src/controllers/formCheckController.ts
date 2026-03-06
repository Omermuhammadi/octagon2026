import { Response } from 'express';
import { FormSession } from '../models';
import { AuthRequest } from '../middleware';

// POST /api/form-check - Analyze form (simulated - returns structured feedback)
export const analyzeForm = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { technique } = req.body;

    if (!technique) {
      res.status(400).json({ success: false, message: 'Technique is required' });
      return;
    }

    // Generate analysis based on technique (in production, this would use a real ML model)
    const analyses: Record<string, any> = {
      'jab-cross': {
        overallScore: 78,
        feedback: [
          { category: 'Stance & Balance', score: 85, tips: ['Good base width maintained', 'Weight distribution is solid', 'Consider lowering center of gravity slightly'] },
          { category: 'Hip Rotation', score: 72, tips: ['Rotate hips more on the cross', 'Good initiation from the ground', 'Follow through needs improvement'] },
          { category: 'Guard Position', score: 68, tips: ['Keep non-punching hand higher', 'Chin tucked properly', 'Return to guard faster after punches'] },
          { category: 'Extension & Reach', score: 88, tips: ['Excellent full extension on jab', 'Good shoulder rotation', 'Maintain this range consistently'] },
        ],
        bodyParts: [
          { part: 'Head', status: 'correct', feedback: 'Chin tucked, eyes forward' },
          { part: 'Shoulders', status: 'correct', feedback: 'Good rotation on cross' },
          { part: 'Lead Arm', status: 'correct', feedback: 'Near full extension' },
          { part: 'Rear Arm', status: 'needs-work', feedback: 'Guard drops slightly when punching' },
          { part: 'Core', status: 'correct', feedback: 'Engaged and stable' },
          { part: 'Hips', status: 'needs-work', feedback: 'Increase rotation by 10-15 degrees' },
          { part: 'Lead Leg', status: 'correct', feedback: 'Proper weight distribution' },
          { part: 'Rear Leg', status: 'needs-work', feedback: 'Pivot more on ball of foot' },
        ],
      },
      'hook': {
        overallScore: 72,
        feedback: [
          { category: 'Stance & Balance', score: 80, tips: ['Good base but slightly narrow', 'Watch for overcommitting'] },
          { category: 'Hip Rotation', score: 65, tips: ['Need more hip engagement', 'Power comes from the ground up'] },
          { category: 'Arm Angle', score: 75, tips: ['Maintain 90 degree angle', 'Elbow stays up'] },
          { category: 'Follow Through', score: 68, tips: ['Complete the rotation', 'Return to guard quickly'] },
        ],
        bodyParts: [
          { part: 'Head', status: 'correct', feedback: 'Chin tucked properly' },
          { part: 'Shoulders', status: 'needs-work', feedback: 'More rotation needed' },
          { part: 'Elbow', status: 'needs-work', feedback: 'Keep at 90 degrees' },
          { part: 'Hips', status: 'needs-work', feedback: 'Under-rotated' },
          { part: 'Rear Hand', status: 'correct', feedback: 'Good guard position' },
          { part: 'Legs', status: 'correct', feedback: 'Stable base maintained' },
        ],
      },
    };

    const analysis = analyses[technique] || analyses['jab-cross'];
    const result = analysis.overallScore >= 70 ? 'Good' : 'Needs Improvement';

    // Save session if user is authenticated
    if (req.user) {
      await FormSession.create({
        userId: req.user._id,
        technique,
        overallScore: analysis.overallScore,
        feedback: analysis.feedback,
        bodyParts: analysis.bodyParts,
        result,
      });

      // Increment training sessions
      await (await import('../models')).User.findByIdAndUpdate(req.user._id, {
        $inc: { trainingSessions: 1 }
      });
    }

    res.json({
      success: true,
      data: {
        technique,
        overallScore: analysis.overallScore,
        result,
        feedback: analysis.feedback,
        bodyParts: analysis.bodyParts,
      },
    });
  } catch (error) {
    console.error('Form check error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/form-check/history - Get user's form check sessions
export const getFormHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const sessions = await FormSession.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json({ success: true, data: sessions });
  } catch (error) {
    console.error('Form history error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
