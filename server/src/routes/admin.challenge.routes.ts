import { Router } from 'express';
import { adminChallengeController } from '../controllers/admin.challenge.controller';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  createChallengeSchema,
  updateChallengeSchema,
  updateFlagSchema,
} from '../validators/index';

const router = Router();

// Enforce authentication and administrator privileges on all admin challenge endpoints
router.use(requireAuth, requireAdmin);

router.get('/', adminChallengeController.list);
router.get('/:id', adminChallengeController.getById);
router.post('/', validateBody(createChallengeSchema), adminChallengeController.create);
router.patch('/:id', validateBody(updateChallengeSchema), adminChallengeController.update);
router.put('/:id', validateBody(updateChallengeSchema), adminChallengeController.update);
router.post('/:id/publish', adminChallengeController.publish);
router.post('/:id/unpublish', adminChallengeController.unpublish);
router.post('/:id/archive', adminChallengeController.archive);
router.post('/:id/flags', validateBody(updateFlagSchema), adminChallengeController.updateFlag);
router.delete('/:id', adminChallengeController.delete);

export default router;
