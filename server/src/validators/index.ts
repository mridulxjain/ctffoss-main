import { z } from 'zod';

export const devLoginSchema = z.object({
  role: z.enum(['USER', 'ADMIN']).optional(),
  username: z.string().min(2).max(30).optional(),
  email: z.string().email().optional(),
});

export const createTeamSchema = z.object({
  name: z
    .string()
    .min(3, 'Team name must be at least 3 characters')
    .max(30, 'Team name cannot exceed 30 characters')
    .trim(),
});

export const joinTeamSchema = z.object({
  inviteCode: z
    .string()
    .min(6, 'Invite code must be at least 6 characters')
    .max(32, 'Invite code too long')
    .trim(),
});

export const flagSubmissionSchema = z.object({
  flag: z.string().min(1, 'Flag cannot be empty').max(256, 'Flag is too long').trim(),
});

export const createCategorySchema = z.object({
  name: z.string().min(2).max(50).trim(),
  description: z.string().max(200).optional(),
  sortOrder: z.number().int().optional(),
});

export const createChallengeSchema = z.object({
  title: z.string().min(3).max(100).trim(),
  slug: z.string().min(3).max(100).trim(),
  description: z.string().min(10),
  categoryId: z.string().uuid(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD', 'INSANE']),
  points: z.number().int().positive(),
  flag: z.string().min(3),
  isPublished: z.boolean().optional(),
  author: z.string().optional(),
});
