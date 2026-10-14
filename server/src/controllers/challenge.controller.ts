import { Request, Response } from 'express';
import { dbService } from '../services/db.service';
import { verifyFlag } from '../utils/crypto';

export const challengeController = {
  async list(req: Request, res: Response): Promise<void> {
    const teamId = req.user?.teamId || null;
    const categories = await dbService.listCategories();
    const challenges = await dbService.listChallenges(teamId);

    res.json({
      success: true,
      data: {
        categories,
        challenges,
      },
    });
  },

  async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const teamId = req.user?.teamId || null;

    const challenge = await dbService.getChallengeDetail(id, teamId);
    if (!challenge) {
      res.status(404).json({
        success: false,
        error: { message: 'Challenge not found', code: 'CHALLENGE_NOT_FOUND' },
      });
      return;
    }

    res.json({
      success: true,
      data: challenge,
    });
  },

  /**
   * Retrieves the current team's authoritative shared session for a timed challenge.
   */
  async getSession(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const teamId = req.user!.teamId!;

    const session = await dbService.getTeamChallengeSession(teamId, id);
    if (!session) {
      res.status(404).json({
        success: false,
        error: { message: 'Challenge not found', code: 'CHALLENGE_NOT_FOUND' },
      });
      return;
    }

    res.json({
      success: true,
      data: session,
    });
  },

  /**
   * Starts a shared team challenge session if not already started.
   * If already started by any teammate, returns the existing authoritative session.
   */
  async startSession(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const teamId = req.user!.teamId!;

    try {
      const session = await dbService.startTeamChallengeSession(teamId, id);
      res.json({
        success: true,
        data: session,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { message: err.message || 'Failed to start challenge session', code: 'SESSION_START_FAILED' },
      });
    }
  },

  async submit(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { flag } = req.body;
    const userId = req.user!.id;
    const teamId = req.user!.teamId!;

    const challenge = await dbService.getChallengeDetail(id, teamId);
    if (!challenge) {
      res.status(404).json({
        success: false,
        error: { message: 'Challenge not found', code: 'CHALLENGE_NOT_FOUND' },
      });
      return;
    }

    // Check if team has already solved this challenge
    const alreadySolved = await dbService.hasTeamSolved(teamId, id);
    if (alreadySolved) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Your team has already solved this challenge.',
          code: 'ALREADY_SOLVED',
        },
      });
      return;
    }

    // For timed challenges, enforce active shared team session
    if (challenge.isTimed) {
      const session = await dbService.getTeamChallengeSession(teamId, id);
      if (!session || session.status === 'NOT_STARTED') {
        res.status(400).json({
          success: false,
          error: {
            message: 'You must start the challenge session before submitting flags.',
            code: 'SESSION_NOT_STARTED',
          },
        });
        return;
      }

      if (session.status === 'EXPIRED' || (session.remainingSeconds !== null && session.remainingSeconds <= 0)) {
        res.status(400).json({
          success: false,
          error: {
            message: 'The time limit for this challenge has expired.',
            code: 'SESSION_EXPIRED',
          },
        });
        return;
      }
    }

    // Retrieve flag hashes for this challenge
    const flagHashes = await dbService.getChallengeFlags(id);
    let isMatch = false;

    for (const storedHash of flagHashes) {
      if (verifyFlag(flag, storedHash, true)) {
        isMatch = true;
        break;
      }
    }

    if (!isMatch) {
      res.status(200).json({
        success: true,
        data: {
          isCorrect: false,
          message: 'Incorrect flag. Double check your input and try again.',
        },
      });
      return;
    }

    // Atomically award points, register solve, and complete session
    const { isFirstBlood, pointsAwarded } = await dbService.recordSolve({
      challengeId: id,
      teamId,
      userId,
      points: challenge.points,
    });

    res.json({
      success: true,
      data: {
        isCorrect: true,
        message: isFirstBlood
          ? 'First Blood! Flag correct.'
          : 'Correct flag! Challenge solved.',
        pointsAwarded,
        isFirstBlood,
      },
    });
  },

  async unlockHint(req: Request, res: Response): Promise<void> {
    const { id, hintId } = req.params;
    const teamId = req.user!.teamId!;

    const result = await dbService.unlockHint(teamId, hintId);
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: { message: 'Failed to unlock hint', code: 'HINT_UNLOCK_FAILED' },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        hintId,
        content: result.content,
      },
    });
  },
};
