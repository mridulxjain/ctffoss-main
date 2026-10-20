import { Request, Response } from 'express';
import { dbService } from '../services/db.service';
import { rosterService } from '../services/roster.service';
import { isUserActive } from '../middleware/auth';
import { signToken } from '../utils/crypto';
import { setSessionCookie } from './auth.controller';

export const teamController = {
  /**
   * Public: Returns matching squad names for autocomplete suggestions.
   * Only returns an array of team name strings with zero participant PII.
   */
  async autocomplete(req: Request, res: Response): Promise<void> {
    const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 50) : '';
    const limit = Math.min(28, Math.max(1, parseInt((req.query.limit as string) || '10', 10)));
    const names = rosterService.searchApprovedTeamNames(q, limit);
    res.json({
      success: true,
      data: names,
    });
  },

  /**
   * Authenticated participant squad registration.
   * Enforces verified identity against approved roster and assigns user atomically.
   */
  async register(req: Request, res: Response): Promise<void> {
    if (!req.user || !req.user.id || !req.user.email) {
      res.status(401).json({
        success: false,
        error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
      });
      return;
    }

    const { teamName, registeredEmail } = (req.body || {}) as {
      teamName?: string;
      registeredEmail?: string;
    };

    if (!teamName || typeof teamName !== 'string' || !teamName.trim()) {
      res.status(400).json({
        success: false,
        error: { message: 'A squad name is required', code: 'INVALID_TEAM_NAME' },
      });
      return;
    }

    try {
      const result = await dbService.registerUserToTeam({
        userId: req.user.id,
        teamName: teamName.trim(),
        verifiedEmail: req.user.email,
        registeredEmail: typeof registeredEmail === 'string' ? registeredEmail : undefined,
      });

      // Update session payload
      req.user.teamId = result.team.id;

      // Re-issue internal CTF session token with the newly associated teamId
      const sessionToken = signToken({
        id: result.user.id,
        email: result.user.email,
        username: result.user.username,
        role: result.user.role,
        clubRole: result.user.clubRole || result.user.role,
        teamId: result.team.id,
      });

      setSessionCookie(res, sessionToken);

      res.json({
        success: true,
        data: {
          token: sessionToken,
          user: {
            id: result.user.id,
            email: result.user.email,
            username: result.user.username,
            role: result.user.role,
            clubRole: result.user.clubRole,
            teamId: result.team.id,
            teamName: result.team.name,
            avatarUrl: result.user.avatarUrl || null,
            createdAt: result.user.createdAt.toISOString(),
          },
          team: {
            id: result.team.id,
            name: result.team.name,
            totalScore: result.team.totalScore,
            membersCount: result.team.members.length,
          },
        },
        message: `Successfully joined ${result.team.name}`,
      });
    } catch (err: any) {
      const code = err.code || 'REGISTRATION_FAILED';
      let status = 400;

      if (code === 'ALREADY_ASSIGNED' || code === 'ALREADY_IN_TEAM') {
        status = 409;
      } else if (code === 'EMAIL_VERIFICATION_REQUIRED') {
        status = 403;
      } else if (code === 'NOT_ON_ROSTER' || code === 'TEAM_NOT_FOUND' || code === 'USER_NOT_FOUND') {
        status = 404;
      } else if (code === 'COMPETITION_LOCKED' || code === 'EMAIL_NOT_IN_TEAM' || code === 'AMBIGUOUS_ROSTER_MATCH') {
        status = 400;
      } else {
        status = 500;
      }

      res.status(status).json({
        success: false,
        error: {
          message: err.message || 'Squad registration failed',
          code,
        },
      });
    }
  },

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
        members: team.members.map((m) => {
          const isCurrentUser = req.user?.id === m.id;
          const isMemberLoggedIn = isCurrentUser || isUserActive(m.id);
          return {
            id: m.id,
            username: m.username,
            email: m.email,
            role: m.role,
            isLoggedIn: isMemberLoggedIn,
          };
        }),
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
