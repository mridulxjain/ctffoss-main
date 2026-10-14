import { Request, Response } from 'express';
import { dbService } from '../services/db.service';

export const scoreboardController = {
  async getScoreboard(_req: Request, res: Response): Promise<void> {
    const leaderboard = await dbService.getScoreboard();
    const timeline = await dbService.getScoreboardTimeline();

    res.json({
      success: true,
      data: {
        leaderboard,
        timeline,
        isFrozen: false,
      },
    });
  },
};
