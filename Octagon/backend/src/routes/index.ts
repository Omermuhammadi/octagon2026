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

export default router;
