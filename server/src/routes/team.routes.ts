import { Router } from 'express';
import { teamController } from '../controllers/team.controller';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { createTeamSchema, joinTeamSchema } from '../validators/index';

const router = Router();

router.post('/', requireAuth, validateBody(createTeamSchema), teamController.create);
router.post('/join', requireAuth, validateBody(joinTeamSchema), teamController.join);
router.get('/me', requireAuth, teamController.getMyTeam);
router.get('/:id', teamController.getById);

export default router;
