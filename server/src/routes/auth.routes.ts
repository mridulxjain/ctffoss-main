import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validateBody } from '../middleware/validate';
import { devLoginSchema } from '../validators/index';
import { loginLimiter, callbackLimiter, authLimiter, sessionLimiter } from '../middleware/rateLimiter';

const router = Router();

// OIDC Authentication Endpoints
router.get('/login', loginLimiter, authController.oidcLogin);
router.get('/callback', callbackLimiter, authController.oidcCallback);

// Session State and Logout
router.get('/me', sessionLimiter, authController.getMe);
router.post('/logout', authController.logout);

// Development Only Persona Authentication
router.get('/dev-personas', authController.getDevPersonas);
router.post('/dev-login', authLimiter, validateBody(devLoginSchema), authController.devLogin);

export default router;

