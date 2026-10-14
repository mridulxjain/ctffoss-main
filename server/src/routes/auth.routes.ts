import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validateBody } from '../middleware/validate';
import { devLoginSchema } from '../validators/index';

const router = Router();

router.post('/dev-login', validateBody(devLoginSchema), authController.devLogin);
router.get('/me', authController.getMe);
router.post('/logout', authController.logout);

export default router;
