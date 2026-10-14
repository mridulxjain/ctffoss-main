import { Router } from 'express';
import authRoutes from './auth.routes';
import teamRoutes from './team.routes';
import challengeRoutes from './challenge.routes';
import scoreboardRoutes from './scoreboard.routes';
import adminChallengeRoutes from './admin.challenge.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/teams', teamRoutes);
router.use('/challenges', challengeRoutes);
router.use('/scoreboard', scoreboardRoutes);
router.use('/admin/challenges', adminChallengeRoutes);

// Health check endpoint
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'foss-ctf-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

export default router;
