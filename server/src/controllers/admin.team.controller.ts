import { Request, Response } from 'express';
import { dbService } from '../services/db.service';

export const adminTeamController = {
  /**
   * Admin-only: list all teams with external IDs and Valenfind team mappings.
   */
  async list(_req: Request, res: Response): Promise<void> {
    try {
      const teams = await dbService.listAdminTeams();
      res.json({
        success: true,
        data: teams,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { message: err.message || 'Failed to list teams', code: 'INTERNAL_ERROR' },
      });
    }
  },

  /**
   * Admin-only: sets or clears the Valenfind team ID mapping for a team.
   */
  async updateValenfindMapping(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { valenfindTeamId } = req.body ?? {};

    try {
      const team = await dbService.getTeam(id);
      if (!team) {
        res.status(404).json({
          success: false,
          error: { message: 'Team not found', code: 'TEAM_NOT_FOUND' },
        });
        return;
      }

      const cleanId =
        typeof valenfindTeamId === 'string' && valenfindTeamId.trim()
          ? valenfindTeamId.trim()
          : null;

      await dbService.updateTeamValenfindId(id, cleanId);

      res.json({
        success: true,
        data: {
          teamId: id,
          valenfindTeamId: cleanId,
        },
        message: 'Team Valenfind mapping updated successfully',
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: {
          message: err.message || 'Failed to update team mapping',
          code: 'MAPPING_UPDATE_FAILED',
        },
      });
    }
  },

  /**
   * Admin-only: Assigns a user to a team.
   */
  async assignMember(req: Request, res: Response): Promise<void> {
    const { id: teamId } = req.params;
    const { userId } = req.body ?? {};

    if (!userId || typeof userId !== 'string') {
      res.status(400).json({
        success: false,
        error: { message: 'userId string is required in request body', code: 'INVALID_USER_ID' },
      });
      return;
    }

    try {
      const team = await dbService.getTeam(teamId);
      if (!team) {
        res.status(404).json({
          success: false,
          error: { message: 'Team not found', code: 'TEAM_NOT_FOUND' },
        });
        return;
      }

      const cleanUserId = userId.trim();
      const user = await dbService.getUser(cleanUserId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: { message: 'User not found', code: 'USER_NOT_FOUND' },
        });
        return;
      }

      const updatedUser = await dbService.assignUserToTeam(cleanUserId, teamId);
      res.json({
        success: true,
        data: {
          user: updatedUser,
          teamId,
        },
        message: 'User assigned to team successfully',
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { message: err.message || 'Failed to assign user to team', code: 'ASSIGN_FAILED' },
      });
    }
  },

  /**
   * Admin-only: Removes a user from a team.
   */
  async removeMember(req: Request, res: Response): Promise<void> {
    const { id: teamId, userId } = req.params;

    try {
      const user = await dbService.getUser(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: { message: 'User not found', code: 'USER_NOT_FOUND' },
        });
        return;
      }

      if (user.teamId !== teamId) {
        res.status(400).json({
          success: false,
          error: { message: 'User is not a member of this team', code: 'NOT_TEAM_MEMBER' },
        });
        return;
      }

      const updatedUser = await dbService.assignUserToTeam(userId, null);
      res.json({
        success: true,
        data: {
          user: updatedUser,
          teamId: null,
        },
        message: 'User removed from team successfully',
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { message: err.message || 'Failed to remove user from team', code: 'REMOVE_FAILED' },
      });
    }
  },
};

