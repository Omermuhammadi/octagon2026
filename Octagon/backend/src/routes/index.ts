import { Router } from 'express';
import authRoutes from './auth';
import fighterRoutes from './fighters';
import eventRoutes from './events';
import predictionRoutes from './predictions';
import roadmapRoutes from './roadmaps';
import gymRoutes from './gyms';
import formCheckRoutes from './formCheck';
import gearRoutes from './gear';
import chatRoutes from './chat';
import statsRoutes from './stats';
import strategyRoutes from './strategy';
import coachRosterRoutes from './coachRoster';
import fighterTrainingRoutes from './fighterTraining';
import relationshipRoutes from './relationships';
import assignmentRoutes from './assignments';
import messageRoutes from './messages';
import activityRoutes from './activity';
import fightCampRoutes from './fightCamp';
import weightCutRoutes from './weightCut';
import opponentDossierRoutes from './opponentDossier';
import coachAnalyticsRoutes from './coachAnalytics';
import analyticsRoutes from './analytics';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Octagon Oracle API is running',
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/fighters', fighterRoutes);
router.use('/events', eventRoutes);
router.use('/predictions', predictionRoutes);
router.use('/roadmaps', roadmapRoutes);
router.use('/gyms', gymRoutes);
router.use('/form-check', formCheckRoutes);
router.use('/gear', gearRoutes);
router.use('/chat', chatRoutes);
router.use('/stats', statsRoutes);
router.use('/strategy', strategyRoutes);
router.use('/coach/roster', coachRosterRoutes);
router.use('/coach/fighter-training', fighterTrainingRoutes);
router.use('/relationships', relationshipRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/messages', messageRoutes);
router.use('/activity', activityRoutes);
router.use('/fight-camp', fightCampRoutes);
router.use('/weight-cut', weightCutRoutes);
router.use('/opponent-dossier', opponentDossierRoutes);
router.use('/coach', coachAnalyticsRoutes);
router.use('/analytics', analyticsRoutes);

export default router;
