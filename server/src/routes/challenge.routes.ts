import { Router } from 'express';
import { challengeController } from '../controllers/challenge.controller';
import { requireAuth, requireTeam } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { flagSubmissionSchema } from '../validators/index';
import { createRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Rate limiter: Max 10 flag submissions per 30 seconds per team
const flagSubmissionLimiter = createRateLimiter({
  windowMs: 30 * 1000,
  max: 10,
  message: 'Too many flag submissions. Please wait 30 seconds before submitting again.',
  code: 'TOO_MANY_FLAG_SUBMISSIONS',
});

router.get('/', challengeController.list);
router.get('/:id', challengeController.getById);
router.get('/:id/session', requireAuth, requireTeam, challengeController.getSession);
router.post('/:id/start', requireAuth, requireTeam, challengeController.startSession);
router.post(
  '/:id/submit',
  requireAuth,
  requireTeam,
  flagSubmissionLimiter,
  validateBody(flagSubmissionSchema),
  challengeController.submit
);
router.post(
  '/:id/hints/:hintId/unlock',
  requireAuth,
  requireTeam,
  challengeController.unlockHint
);

export default router;
