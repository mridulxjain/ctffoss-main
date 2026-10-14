import { Router } from 'express';
import { scoreboardController } from '../controllers/scoreboard.controller';

const router = Router();

router.get('/', scoreboardController.getScoreboard);

export default router;
