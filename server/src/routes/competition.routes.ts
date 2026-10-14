import { Router } from 'express';
import { competitionController } from '../controllers/competition.controller';
import { requireAuth, requireTeam } from '../middleware/auth';

const router = Router();

// Public competition status and timing window
router.get('/', competitionController.getStatus);

// Authenticated team competition attempt endpoints
router.post('/attempt', requireAuth, requireTeam, competitionController.startAttempt);
router.post('/attempt/start', requireAuth, requireTeam, competitionController.startAttempt);
router.get('/attempt', requireAuth, requireTeam, competitionController.getAttempt);

export default router;
