import { Router } from 'express';
import { competitionController } from '../controllers/competition.controller';
import { requireAuth, requireTeam } from '../middleware/auth';

const router = Router();

// Public competition status, schedule, and timed leaderboard
router.get('/', competitionController.getStatus);
router.get('/leaderboard', competitionController.getLeaderboard);

// Authenticated team competition attempt endpoints
router.post('/attempt', requireAuth, requireTeam, competitionController.startAttempt);
router.post('/attempt/start', requireAuth, requireTeam, competitionController.startAttempt);
router.get('/attempt', requireAuth, requireTeam, competitionController.getAttempt);
router.post('/attempt/submit', requireAuth, requireTeam, competitionController.submitAttemptFlag);
router.post('/submit', requireAuth, requireTeam, competitionController.submitAttemptFlag);

export default router;
