import { Router } from 'express';
import { competitionController } from '../controllers/competition.controller';

const router = Router();

// Public competition status and timing window
router.get('/', competitionController.getStatus);

export default router;
