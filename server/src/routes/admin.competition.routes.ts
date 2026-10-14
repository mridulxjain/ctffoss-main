import { Router } from 'express';
import { competitionController } from '../controllers/competition.controller';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { updateCompetitionConfigSchema } from '../validators/index';

const router = Router();

// Strictly enforce authentication and admin privileges
router.use(requireAuth, requireAdmin);

router.get('/', competitionController.getConfig);
router.put('/', validateBody(updateCompetitionConfigSchema), competitionController.updateConfig);
router.patch('/', validateBody(updateCompetitionConfigSchema), competitionController.updateConfig);
router.post('/start', competitionController.adminStartCompetition);

export default router;
