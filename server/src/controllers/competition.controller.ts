import { Request, Response } from 'express';
import { dbService } from '../services/db.service';
import { competitionAttemptService } from '../services/competitionAttempt.service';
import { valenfindVerifierService } from '../services/valenfindVerifier.service';
import { setTeamReadinessSchema } from '../validators';

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

  /**
   * Participant endpoint to submit their team's challenge flag.
   *
   * Security & Integrity:
   * - Derives team identity solely from trusted server session.
   * - Enforces competition lifecycle state.
   * - Requires an active IN_PROGRESS attempt.
   * - Independently verifies the flag via the trusted Valenfind verifier.
   * - Verifies that the flag strictly belongs to the authenticated team.
   * - Idempotently completes the attempt using server clock.
   */
  async submitAttemptFlag(req: Request, res: Response): Promise<void> {
    const teamId = req.user?.teamId;
    if (!teamId) {
      res.status(403).json({
        success: false,
        error: { message: 'A verified team identity is required to participate.', code: 'TEAM_REQUIRED' },
      });
      return;
    }

    const { flag } = (req.body ?? {}) as { flag?: string };
    if (!flag || typeof flag !== 'string' || !flag.trim()) {
      res.status(400).json({
        success: false,
        error: { message: 'A non-empty flag string is required.', code: 'INVALID_FLAG_FORMAT' },
      });
      return;
    }

    const cleanFlag = flag.trim();

    // 1. Enforce competition lifecycle rules
    const compConfig = await dbService.getCompetitionConfig();
    if (compConfig.status === 'PREPARING') {
      res.status(400).json({
        success: false,
        error: {
          message: 'The competition has not started yet. Loventia flag submissions are disabled until official start.',
          code: 'COMPETITION_PREPARING',
        },
      });
      return;
    }
    if (compConfig.status === 'PAUSED' || compConfig.status === 'DRAFT') {
      res.status(400).json({
        success: false,
        error: {
          message: 'The competition is currently inactive.',
          code: 'COMPETITION_INACTIVE',
        },
      });
      return;
    }
    if (compConfig.status === 'SCHEDULED') {
      res.status(400).json({
        success: false,
        error: {
          message: 'The competition has not started yet. Submissions are not currently accepted.',
          code: 'COMPETITION_SCHEDULED',
        },
      });
      return;
    }
    if (compConfig.status === 'ENDED') {
      res.status(400).json({
        success: false,
        error: {
          message: 'The competition has ended. Submissions are no longer accepted.',
          code: 'COMPETITION_ENDED',
        },
      });
      return;
    }

    // 2. Retrieve team's attempt and verify IN_PROGRESS status
    const attempt = await dbService.getCompetitionAttempt(teamId);
    if (!attempt) {
      res.status(400).json({
        success: false,
        error: {
          message: 'You must start the competition attempt before submitting flags.',
          code: 'ATTEMPT_NOT_FOUND',
        },
      });
      return;
    }

    if (attempt.status === 'COMPLETED') {
      res.status(400).json({
        success: false,
        error: {
          message: 'Your team has already completed this competition attempt.',
          code: 'ATTEMPT_ALREADY_COMPLETED',
        },
      });
      return;
    }

    // 3. Resolve team mapping to Valenfind
    const team = await dbService.getTeam(teamId);
    if (!team?.valenfindTeamId) {
      res.status(400).json({
        success: false,
        error: {
          message: 'No verified Valenfind team mapping is configured for your team. Please contact administrators.',
          code: 'TEAM_MAPPING_REQUIRED',
        },
      });
      return;
    }

    // 4. Verify the submitted flag through the trusted verifier
    let verification;
    try {
      verification = await valenfindVerifierService.verifyFlag(cleanFlag);
    } catch (err: any) {
      if (err.code === 'VERIFIER_UNAVAILABLE') {
        res.status(503).json({
          success: false,
          error: {
            message: 'The flag verification service is temporarily unavailable. Please try again.',
            code: 'VERIFIER_UNAVAILABLE',
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          message: err.message || 'An error occurred during flag verification.',
          code: err.code || 'VERIFICATION_ERROR',
        },
      });
      return;
    }

    if (!verification.valid) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Submitted flag is incorrect or was not issued.',
          code: 'INVALID_FLAG',
        },
      });
      return;
    }

    // 5. Verify the flag strictly belongs to the authenticated team
    if (verification.valenfindTeamId !== team.valenfindTeamId) {
      res.status(400).json({
        success: false,
        error: {
          message: 'The submitted flag belongs to another team and cannot be used to complete your attempt.',
          code: 'FLAG_TEAM_MISMATCH',
        },
      });
      return;
    }

    // 6. Complete attempt using authoritative server timestamps
    try {
      const completedAttempt = await competitionAttemptService.completeAttempt(teamId);

      // Register challenge solve on the challenge board and award points
      try {
        const valenfindChal = await dbService.getChallengeBySlug('valenfind');
        if (valenfindChal) {
          const alreadySolved = await dbService.hasTeamSolved(teamId, valenfindChal.id);
          if (!alreadySolved) {
            await dbService.recordSolve({
              challengeId: valenfindChal.id,
              teamId,
              userId: req.user!.id,
              points: valenfindChal.points,
            });
          }
        }
      } catch {
        // Non-fatal, do not interrupt attempt completion
      }

      res.json({
        success: true,
        data: completedAttempt,
        message: 'Challenge flag verified successfully! Competition attempt completed.',
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: {
          message: err.message || 'Failed to complete competition attempt.',
          code: err.code || 'COMPLETION_FAILED',
        },
      });
    }
  },

  /**
   * Public endpoint to retrieve the dedicated timed competition leaderboard.
   * Ranks all competition teams by verified elapsed time (elapsedMs ascending)
   * with deterministic tie-breaking.
   */
  async getLeaderboard(_req: Request, res: Response): Promise<void> {
    try {
      const data = await dbService.getCompetitionLeaderboard();
      res.json({
        success: true,
        data,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: {
          message: err.message || 'Failed to retrieve competition leaderboard.',
          code: 'INTERNAL_ERROR',
        },
      });
    }
  },

  /**
   * Participant endpoint to get competition readiness summary.
   */
  async getReadiness(req: Request, res: Response): Promise<void> {
    try {
      const summary = await dbService.getCompetitionReadinessSummary(req.user?.teamId ?? undefined);
      res.json({
        success: true,
        data: {
          ...summary,
          myTeam: summary.myTeamReadiness,
          unreadyTeamsCount: summary.notReadyTeamsCount,
        },
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: {
          message: err.message || 'Failed to retrieve competition readiness',
          code: 'INTERNAL_ERROR',
        },
      });
    }
  },

  /**
   * Participant endpoint to toggle their team's readiness state.
   * Derived strictly from authenticated team session.
   */
  async setReadiness(req: Request, res: Response): Promise<void> {
    const teamId = req.user?.teamId;
    if (!teamId) {
      res.status(403).json({
        success: false,
        error: {
          message: 'A verified team identity is required to set team readiness.',
          code: 'TEAM_REQUIRED',
        },
      });
      return;
    }

    const parseResult = setTeamReadinessSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: {
          message: parseResult.error.errors[0]?.message || 'Invalid readiness payload',
          code: 'VALIDATION_ERROR',
        },
      });
      return;
    }

    try {
      const updated = await dbService.setTeamReadiness(teamId, parseResult.data.isReady);
      const summary = await dbService.getCompetitionReadinessSummary(teamId);
      res.json({
        success: true,
        data: {
          ...updated,
          ...summary,
          myTeam: summary.myTeamReadiness,
          unreadyTeamsCount: summary.notReadyTeamsCount,
        },
        message: parseResult.data.isReady ? 'Team marked as Ready!' : 'Team marked as Not Ready.',
      });
    } catch (err: any) {
      const code = err.code || 'READINESS_UPDATE_FAILED';
      const status = code === 'READINESS_LOCKED' ? 400 : 500;
      res.status(status).json({
        success: false,
        error: {
          message: err.message || 'Failed to update team readiness',
          code,
        },
      });
    }
  },

  /**
   * Admin-only endpoint: "Unlock Loventia & Start Competition"
   * Rechecks that all eligible teams are ready, records official start timestamp,
   * transitions atomically to LIVE, and is idempotent.
   */
  async adminStartCompetition(req: Request, res: Response): Promise<void> {
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: {
          message: 'Administrative privileges are required to start the competition.',
          code: 'FORBIDDEN',
        },
      });
      return;
    }

    try {
      const force = req.body?.force === true;
      const result = await dbService.startCompetitionOfficial(force);
      res.json({
        success: true,
        data: result,
        message: result.message,
      });
    } catch (err: any) {
      const code = err.code || 'COMPETITION_START_FAILED';
      const status = code === 'TEAMS_NOT_READY' || code === 'NO_ELIGIBLE_TEAMS' ? 400 : 500;
      res.status(status).json({
        success: false,
        error: {
          message: err.message || 'Failed to start competition',
          code,
          details: err.unreadyTeams ? { unreadyTeams: err.unreadyTeams } : undefined,
        },
      });
    }
  },
};

