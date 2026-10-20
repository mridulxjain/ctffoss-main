import { Router } from 'express';
import { teamController } from '../controllers/team.controller';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { teamRegistrationSchema } from '../validators/index';
import { createRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Rate limiter for team registration: max 5 requests per minute
const registrationLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Too many registration requests. Please wait a moment before trying again.',
  code: 'TOO_MANY_REGISTRATION_ATTEMPTS',
});

// Squad autocomplete suggestions (returns array of string squad names only)
router.get('/autocomplete', teamController.autocomplete);

// Authenticated squad registration
router.post(
  '/register',
  requireAuth,
  registrationLimiter,
  validateBody(teamRegistrationSchema),
  teamController.register
);

// Explicitly reject attempts to leave, change, or mutate team memberships
router.all(['/leave', '/change'], requireAuth, (_req, res) => {
  res.status(403).json({
    success: false,
    error: {
      message: 'Participant team membership is permanent. Leaving or changing squads is strictly forbidden.',
      code: 'TEAM_MEMBERSHIP_PERMANENT',
    },
  });
});

router.delete(['/me', '/:id/members', '/:id/members/:memberId'], requireAuth, (_req, res) => {
  res.status(403).json({
    success: false,
    error: {
      message: 'Participant team membership is permanent. Leaving or removing squad members is strictly forbidden.',
      code: 'TEAM_MEMBERSHIP_PERMANENT',
    },
  });
});

// Read-only team routes: FOSS CTF consumes existing teams from the central identity system
router.get('/me', requireAuth, teamController.getMyTeam);
router.get('/:id', teamController.getById);

export default router;
