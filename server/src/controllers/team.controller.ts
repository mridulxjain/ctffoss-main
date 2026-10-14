import { Request, Response } from 'express';
import { dbService } from '../services/db.service';
import { signToken } from '../utils/crypto';

const COOKIE_NAME = 'foss_session';

export const teamController = {
  async create(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { name } = req.body;

    const existingUser = await dbService.getUser(userId);
    if (existingUser?.teamId) {
      res.status(400).json({
        success: false,
        error: { message: 'You already belong to a team', code: 'ALREADY_IN_TEAM' },
      });
      return;
    }

    const existingTeam = await dbService.getTeamByName(name);
    if (existingTeam) {
      res.status(400).json({
        success: false,
        error: { message: 'A team with this name already exists', code: 'TEAM_EXISTS' },
      });
      return;
    }

    const team = await dbService.createTeam(name, userId);

    // Refresh user session token with updated teamId
    const updatedToken = signToken({
      ...req.user!,
      teamId: team.id,
    });
    res.cookie(COOKIE_NAME, updatedToken, { httpOnly: true, sameSite: 'lax' });

    res.status(201).json({
      success: true,
      data: {
        id: team.id,
        name: team.name,
        inviteCode: team.inviteCode,
        totalScore: team.totalScore,
        members: team.members.map((m) => ({
          id: m.id,
          username: m.username,
          email: m.email,
          role: m.role,
        })),
        solvesCount: 0,
        createdAt: team.createdAt.toISOString(),
      },
    });
  },

  async join(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { inviteCode } = req.body;

    const existingUser = await dbService.getUser(userId);
    if (existingUser?.teamId) {
      res.status(400).json({
        success: false,
        error: { message: 'You already belong to a team', code: 'ALREADY_IN_TEAM' },
      });
      return;
    }

    const team = await dbService.getTeamByInviteCode(inviteCode);
    if (!team) {
      res.status(404).json({
        success: false,
        error: { message: 'Invalid team invite code', code: 'INVALID_INVITE_CODE' },
      });
      return;
    }

    // Check team size (e.g., max 4 members)
    if (team.members.length >= 4) {
      res.status(400).json({
        success: false,
        error: { message: 'Team has reached maximum member limit (4)', code: 'TEAM_FULL' },
      });
      return;
    }

    await dbService.updateUserTeam(userId, team.id);
    const updatedTeam = await dbService.getTeam(team.id);

    // Refresh user session token with updated teamId
    const updatedToken = signToken({
      ...req.user!,
      teamId: team.id,
    });
    res.cookie(COOKIE_NAME, updatedToken, { httpOnly: true, sameSite: 'lax' });

    res.json({
      success: true,
      data: {
        id: updatedTeam!.id,
        name: updatedTeam!.name,
        inviteCode: updatedTeam!.inviteCode,
        totalScore: updatedTeam!.totalScore,
        members: updatedTeam!.members.map((m) => ({
          id: m.id,
          username: m.username,
          email: m.email,
          role: m.role,
        })),
        solvesCount: 0,
        createdAt: updatedTeam!.createdAt.toISOString(),
      },
    });
  },

  async getMyTeam(req: Request, res: Response): Promise<void> {
    if (!req.user?.teamId) {
      res.status(404).json({
        success: false,
        error: { message: 'You are not in a team', code: 'NO_TEAM' },
      });
      return;
    }

    const team = await dbService.getTeam(req.user.teamId);
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
        inviteCode: team.inviteCode,
        totalScore: team.totalScore,
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

    // Public view hides the inviteCode
    res.json({
      success: true,
      data: {
        id: team.id,
        name: team.name,
        totalScore: team.totalScore,
        members: team.members.map((m) => ({
          id: m.id,
          username: m.username,
        })),
        createdAt: team.createdAt.toISOString(),
      },
    });
  },
};
