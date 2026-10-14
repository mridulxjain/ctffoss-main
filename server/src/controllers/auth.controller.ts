import { Request, Response } from 'express';
import { dbService } from '../services/db.service';
import { signToken } from '../utils/crypto';
import { config } from '../config/index';

const COOKIE_NAME = 'foss_session';

export const authController = {
  async devLogin(req: Request, res: Response): Promise<void> {
    if (!config.isDev || !config.enableDevAuth) {
      res.status(403).json({
        success: false,
        error: {
          message: 'Development authentication is disabled in this environment',
          code: 'DEV_AUTH_DISABLED',
        },
      });
      return;
    }

    const { role = 'USER', username, email } = req.body;

    // Pick or create the dev user
    const targetEmail =
      email || (role === 'ADMIN' ? 'admin@fossclub.tech' : 'alice@university.edu');
    const targetUsername =
      username || (role === 'ADMIN' ? 'foss_admin' : 'alice_sec');

    let user = await dbService.getUserByEmail(targetEmail);
    if (!user) {
      user = await dbService.createUser({
        email: targetEmail,
        username: targetUsername,
        role: role === 'ADMIN' ? 'ADMIN' : 'USER',
      });
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      teamId: user.teamId,
    });

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    const team = user.teamId ? await dbService.getTeam(user.teamId) : null;

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          teamId: user.teamId,
          teamName: team?.name || null,
          createdAt: user.createdAt.toISOString(),
        },
        team: team
          ? {
              id: team.id,
              name: team.name,
              totalScore: team.totalScore,
            }
          : null,
      },
    });
  },

  async getMe(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      res.json({
        success: true,
        data: { user: null, team: null },
      });
      return;
    }

    const user = await dbService.getUser(req.user.id);
    if (!user) {
      res.json({
        success: true,
        data: { user: null, team: null },
      });
      return;
    }

    const team = user.teamId ? await dbService.getTeam(user.teamId) : null;

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          teamId: user.teamId,
          teamName: team?.name || null,
          createdAt: user.createdAt.toISOString(),
        },
        team: team
          ? {
              id: team.id,
              name: team.name,
              totalScore: team.totalScore,
            }
          : null,
      },
    });
  },

  async logout(_req: Request, res: Response): Promise<void> {
    res.clearCookie(COOKIE_NAME);
    res.json({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  },
};
