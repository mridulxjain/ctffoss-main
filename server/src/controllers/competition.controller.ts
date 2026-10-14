import { Request, Response } from 'express';
import { dbService } from '../services/db.service';

export const competitionController = {
  /**
   * Public competition status endpoint.
   * Exposes authoritative current status, schedule window, and server time.
   */
  async getStatus(_req: Request, res: Response): Promise<void> {
    try {
      const config = await dbService.getCompetitionConfig();
      res.json({
        success: true,
        data: config,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { message: err.message || 'Failed to retrieve competition status', code: 'INTERNAL_ERROR' },
      });
    }
  },

  /**
   * Admin-only competition configuration review.
   */
  async getConfig(_req: Request, res: Response): Promise<void> {
    try {
      const config = await dbService.getCompetitionConfig();
      res.json({
        success: true,
        data: config,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { message: err.message || 'Failed to retrieve competition configuration', code: 'INTERNAL_ERROR' },
      });
    }
  },

  /**
   * Admin-only competition configuration update.
   */
  async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      const updated = await dbService.updateCompetitionConfig(req.body);
      res.json({
        success: true,
        data: updated,
        message: 'Competition configuration updated successfully',
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { message: err.message || 'Failed to update competition configuration', code: 'CONFIG_UPDATE_FAILED' },
      });
    }
  },
};
