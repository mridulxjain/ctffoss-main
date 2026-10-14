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

  /**
   * Participant endpoint to start or retrieve their team's competition attempt.
   * Requires authenticated participant with trusted server-side team identity.
   */
  async startAttempt(req: Request, res: Response): Promise<void> {
    const teamId = req.user?.teamId;
    if (!teamId) {
      res.status(403).json({
        success: false,
        error: { message: 'A verified team identity is required to participate.', code: 'TEAM_REQUIRED' },
      });
      return;
    }

    try {
      const attempt = await dbService.startCompetitionAttempt(teamId);
      res.json({
        success: true,
        data: attempt,
      });
    } catch (err: any) {
      const code = err.code || 'ATTEMPT_START_FAILED';
      const status = code.startsWith('COMPETITION_') ? 400 : 500;
      res.status(status).json({
        success: false,
        error: { message: err.message || 'Failed to start competition attempt', code },
      });
    }
  },

  /**
   * Participant endpoint to retrieve their team's current attempt status.
   */
  async getAttempt(req: Request, res: Response): Promise<void> {
    const teamId = req.user?.teamId;
    if (!teamId) {
      res.status(403).json({
        success: false,
        error: { message: 'A verified team identity is required to participate.', code: 'TEAM_REQUIRED' },
      });
      return;
    }

    try {
      const attempt = await dbService.getCompetitionAttempt(teamId);
      res.json({
        success: true,
        data: attempt,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { message: err.message || 'Failed to retrieve competition attempt', code: 'INTERNAL_ERROR' },
      });
    }
  },
};

