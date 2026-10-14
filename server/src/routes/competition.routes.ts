import { Router } from 'express';
import { competitionController } from '../controllers/competition.controller';
import { requireAuth, requireTeam } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Rate limiter: Max 10 attempts per 30 seconds per team
const attemptSubmissionLimiter = createRateLimiter({
  windowMs: 30 * 1000,
  max: 10,
  message: 'Too many competition flag submissions. Please wait 30 seconds before submitting again.',
  code: 'TOO_MANY_FLAG_SUBMISSIONS',
});

// Public competition status, schedule, and timed leaderboard
router.get('/', competitionController.getStatus);
router.get('/leaderboard', competitionController.getLeaderboard);

// Authenticated team competition attempt endpoints
router.get('/readiness', competitionController.getReadiness);
router.post('/readiness', requireAuth, requireTeam, competitionController.setReadiness);
router.post('/attempt', requireAuth, requireTeam, competitionController.startAttempt);
router.post('/attempt/start', requireAuth, requireTeam, competitionController.startAttempt);
router.get('/attempt', requireAuth, requireTeam, competitionController.getAttempt);
router.post('/attempt/submit', requireAuth, requireTeam, attemptSubmissionLimiter, competitionController.submitAttemptFlag);
router.post('/submit', requireAuth, requireTeam, attemptSubmissionLimiter, competitionController.submitAttemptFlag);


export default router;
