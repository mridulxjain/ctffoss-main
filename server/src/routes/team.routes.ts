import { Router } from 'express';
import { teamController } from '../controllers/team.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Read-only team routes: FOSS CTF consumes existing teams from the central identity system
router.get('/me', requireAuth, teamController.getMyTeam);
router.get('/:id', teamController.getById);

export default router;
