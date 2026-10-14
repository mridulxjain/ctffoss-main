import { Router } from 'express';
import { adminTeamController } from '../controllers/admin.team.controller';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// Strictly enforce authentication and admin privileges
router.use(requireAuth, requireAdmin);

router.get('/', adminTeamController.list);
router.put('/:id/valenfind-mapping', adminTeamController.updateValenfindMapping);
router.patch('/:id/valenfind-mapping', adminTeamController.updateValenfindMapping);
router.post('/:id/members', adminTeamController.assignMember);
router.delete('/:id/members/:userId', adminTeamController.removeMember);

export default router;
