import { Request, Response } from 'express';
import { dbService } from '../services/db.service';

export const teamController = {
  /**
   * Returns the authenticated user's existing team context.
   * This is a strictly read-only view. Team creation and membership
   * are managed by the central FOSS Club identity system.
   */
  async getMyTeam(req: Request, res: Response): Promise<void> {
    if (!req.user?.teamId) {
      res.status(404).json({
        success: false,
        error: {
          message: 'No team associated with your account in the identity system',
          code: 'NO_TEAM',
        },
      });
      return;
    }

    const team = await dbService.getTeam(req.user.teamId);
    if (!team) {
      res.status(404).json({
        success: false,
        error: {
          message: 'Team record not found for your account',
          code: 'TEAM_NOT_FOUND',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: team.id,
        name: team.name,
        externalId: team.externalId,
        totalScore: team.totalScore,
        solvesCount: team.solvesCount ?? 0,
        totalAvailableChallenges: team.totalAvailableChallenges ?? 0,
        rank: team.rank,
        solves: team.solves ?? [],
        members: team.members.map((m) => ({
          id: m.id,
          username: m.username,
          email: m.email,
          role: m.role,
        })),
        createdAt: team.createdAt.toISOString(),
      },
    });
  },

  /**
   * Public team profile view.
   */
  async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const team = await dbService.getTeam(id);
    if (!team) {
      res.status(404).json({
        success: false,
        error: { message: 'Team not found', code: 'TEAM_NOT_FOUND' },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: team.id,
        name: team.name,
        externalId: team.externalId,
        totalScore: team.totalScore,
        solvesCount: team.solvesCount ?? 0,
        totalAvailableChallenges: team.totalAvailableChallenges ?? 0,
        rank: team.rank,
        solves: team.solves ?? [],
        members: team.members.map((m) => ({
          id: m.id,
          username: m.username,
        })),
        createdAt: team.createdAt.toISOString(),
      },
    });
  },
};
