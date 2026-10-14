import { Router } from 'express';
import { challengeController } from '../controllers/challenge.controller';
import { requireAuth, requireTeam } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { flagSubmissionSchema } from '../validators/index';

const router = Router();

router.get('/', challengeController.list);
router.get('/:id', challengeController.getById);
router.get('/:id/session', requireAuth, requireTeam, challengeController.getSession);
router.post('/:id/start', requireAuth, requireTeam, challengeController.startSession);
router.post(
  '/:id/submit',
  requireAuth,
  requireTeam,
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
