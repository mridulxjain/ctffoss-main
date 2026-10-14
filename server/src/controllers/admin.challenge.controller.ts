import { Request, Response } from 'express';
import { dbService } from '../services/db.service';

export const adminChallengeController = {
  /**
   * Lists all challenges across all lifecycle statuses (draft, published, archived).
   * Flag secrets, hashes, and peppers are never exposed.
   */
  async list(_req: Request, res: Response): Promise<void> {
    try {
      const challenges = await dbService.listAdminChallenges();
      res.json({
        success: true,
        data: challenges,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { message: err.message || 'Failed to list challenges', code: 'INTERNAL_ERROR' },
      });
    }
  },

  /**
   * Retrieves full challenge configuration for administrative review.
   * Never exposes raw flag strings, hashes, or crypto peppers.
   */
  async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const challenge = await dbService.getAdminChallenge(id);
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
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { message: err.message || 'Failed to get challenge', code: 'INTERNAL_ERROR' },
      });
    }
  },

  /**
   * Creates a new challenge with an authoritative hashed flag.
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const challenge = await dbService.createChallenge(req.body);
      res.status(201).json({
        success: true,
        data: challenge,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { message: err.message || 'Failed to create challenge', code: 'VALIDATION_ERROR' },
      });
    }
  },

  /**
   * Updates challenge metadata.
   */
  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const updated = await dbService.updateChallenge(id, req.body);
      res.json({
        success: true,
        data: updated,
      });
    } catch (err: any) {
      const status = err.message === 'Challenge not found' ? 404 : 400;
      res.status(status).json({
        success: false,
        error: { message: err.message || 'Failed to update challenge', code: 'UPDATE_FAILED' },
      });
    }
  },

  /**
   * Publishes a draft challenge, making it available to eligible participants.
   */
  async publish(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const challenge = await dbService.publishChallenge(id);
      res.json({
        success: true,
        data: challenge,
        message: 'Challenge published successfully',
      });
    } catch (err: any) {
      const status = err.message === 'Challenge not found' ? 404 : 400;
      res.status(status).json({
        success: false,
        error: { message: err.message || 'Failed to publish challenge', code: 'PUBLISH_FAILED' },
      });
    }
  },

  /**
   * Unpublishes a challenge back to draft status.
   */
  async unpublish(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const challenge = await dbService.unpublishChallenge(id);
      res.json({
        success: true,
        data: challenge,
        message: 'Challenge unpublished successfully',
      });
    } catch (err: any) {
      const status = err.message === 'Challenge not found' ? 404 : 400;
      res.status(status).json({
        success: false,
        error: { message: err.message || 'Failed to unpublish challenge', code: 'UNPUBLISH_FAILED' },
      });
    }
  },

  /**
   * Archives a challenge, preventing any new submissions while preserving historical solves.
   */
  async archive(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const challenge = await dbService.archiveChallenge(id);
      res.json({
        success: true,
        data: challenge,
        message: 'Challenge archived successfully',
      });
    } catch (err: any) {
      const status = err.message === 'Challenge not found' ? 404 : 400;
      res.status(status).json({
        success: false,
        error: { message: err.message || 'Failed to archive challenge', code: 'ARCHIVE_FAILED' },
      });
    }
  },

  /**
   * Updates or rotates challenge flag.
   * Existing historical solves are preserved; does not award duplicate points.
   */
  async updateFlag(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { flag, isCaseSensitive = true } = req.body;
    try {
      const result = await dbService.updateChallengeFlag(id, flag, isCaseSensitive);
      res.json({
        success: true,
        message: result.message,
      });
    } catch (err: any) {
      const status = err.message === 'Challenge not found' ? 404 : 400;
      res.status(status).json({
        success: false,
        error: { message: err.message || 'Failed to update flag', code: 'FLAG_UPDATE_FAILED' },
      });
    }
  },

  /**
   * Deletes a challenge only if it has zero solves, submissions, or active sessions.
   * If solves or submissions exist, deletion is rejected and archiving is advised.
   */
  async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const result = await dbService.deleteChallenge(id);
      res.json({
        success: true,
        message: result.message,
      });
    } catch (err: any) {
      const status = err.message === 'Challenge not found' ? 404 : 400;
      res.status(status).json({
        success: false,
        error: { message: err.message || 'Failed to delete challenge', code: 'DELETE_REJECTED' },
      });
    }
  },
};
