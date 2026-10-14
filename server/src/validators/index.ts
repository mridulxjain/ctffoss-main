import { z } from 'zod';

export const devLoginSchema = z.object({
  role: z.enum(['USER', 'ADMIN']).optional(),
  username: z.string().min(2).max(30).optional(),
  email: z.string().email().optional(),
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
  isTimed: z.boolean().optional(),
  durationMinutes: z.number().int().positive().optional(),
  author: z.string().optional(),
});
