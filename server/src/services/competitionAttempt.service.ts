import { dbService } from './db.service';
import type { CompetitionAttemptDTO } from '@fossctf/shared';

/**
 * Internal server-side service for managing timed competition attempts.
 * This service handles start timing, persistent state, and trusted completion
 * verification without trusting client-supplied timestamps.
 */
export const competitionAttemptService = {
  /**
   * Retrieves the current attempt for the given team ID.
   */
  async getAttempt(teamId: string): Promise<CompetitionAttemptDTO | null> {
    if (!teamId) {
      throw new Error('teamId is required to retrieve competition attempt');
    }
    return dbService.getCompetitionAttempt(teamId);
  },

  /**
   * Starts a competition attempt for the team using the authoritative server clock.
   * If an attempt already exists, returns the existing attempt without resetting timer.
   */
  async startAttempt(teamId: string): Promise<CompetitionAttemptDTO> {
    if (!teamId) {
      throw new Error('teamId is required to start competition attempt');
    }
    return dbService.startCompetitionAttempt(teamId);
  },

  /**
   * Completes an in-progress attempt after server-side flag/voucher verification.
   * - Sets completedAt using the authoritative server clock.
   * - Calculates elapsedMs on the server.
   * - Idempotent: duplicate calls preserve the first recorded completion timestamp and elapsedMs.
   */
  async completeAttempt(teamId: string): Promise<CompetitionAttemptDTO> {
    if (!teamId) {
      throw new Error('teamId is required to complete competition attempt');
    }
    return dbService.completeCompetitionAttempt(teamId);
  },
};
