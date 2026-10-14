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
          message: 'Your team has already solved this challenge!',
          code: 'ALREADY_SOLVED',
        },
      });
      return;
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

    // Atomically award points and register solve
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
          ? '🎉 First Blood! Flag correct!'
          : '🎉 Correct flag! Challenge solved!',
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
