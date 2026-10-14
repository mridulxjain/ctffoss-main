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

export const createChallengeSchema = z
  .object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(100).trim(),
    slug: z.string().min(3).max(100).trim().optional(),
    description: z.string().min(5, 'Description must be at least 5 characters'),
    categoryId: z.string().min(1, 'Category is required'),
    difficulty: z.enum(['EASY', 'MEDIUM', 'HARD', 'INSANE']),
    points: z.number().int('Points must be an integer').positive('Points must be greater than 0'),
    flag: z.string().min(1, 'Flag is required'),
    isPublished: z.boolean().optional().default(false),
    isArchived: z.boolean().optional().default(false),
    isTimed: z.boolean().optional().default(false),
    durationMinutes: z
      .number()
      .int('Duration must be an integer')
      .positive('Duration must be greater than 0')
      .nullable()
      .optional(),
    author: z.string().max(100).nullable().optional(),
    sortOrder: z.number().int().optional().default(0),
  })
  .refine(
    (data) => {
      if (data.isTimed) {
        return typeof data.durationMinutes === 'number' && data.durationMinutes > 0;
      }
      return true;
    },
    {
      message: 'Timed challenges must specify a positive duration in minutes',
      path: ['durationMinutes'],
    }
  );

export const updateChallengeSchema = z
  .object({
    title: z.string().min(3).max(100).trim().optional(),
    slug: z.string().min(3).max(100).trim().optional(),
    description: z.string().min(5).optional(),
    categoryId: z.string().min(1).optional(),
    difficulty: z.enum(['EASY', 'MEDIUM', 'HARD', 'INSANE']).optional(),
    points: z.number().int('Points must be an integer').positive('Points must be greater than 0').optional(),
    isPublished: z.boolean().optional(),
    isArchived: z.boolean().optional(),
    isTimed: z.boolean().optional(),
    durationMinutes: z
      .number()
      .int('Duration must be an integer')
      .positive('Duration must be greater than 0')
      .nullable()
      .optional(),
    author: z.string().max(100).nullable().optional(),
    sortOrder: z.number().int().optional(),
  })
  .refine(
    (data) => {
      if (data.isTimed === true && data.durationMinutes !== undefined) {
        return typeof data.durationMinutes === 'number' && data.durationMinutes > 0;
      }
      return true;
    },
    {
      message: 'Timed challenges must specify a positive duration in minutes',
      path: ['durationMinutes'],
    }
  );

export const updateFlagSchema = z.object({
  flag: z.string().min(1, 'Flag cannot be empty').max(256, 'Flag is too long').trim(),
  isCaseSensitive: z.boolean().optional().default(true),
});

export const updateCompetitionConfigSchema = z
  .object({
    title: z.string().min(2, 'Title must be at least 2 characters').max(100).trim().optional(),
    description: z.string().max(500).optional(),
    startTime: z
      .union([
        z.string().refine((v) => !isNaN(Date.parse(v)), { message: 'Invalid ISO date string' }),
        z.null(),
      ])
      .optional(),
    endTime: z
      .union([
        z.string().refine((v) => !isNaN(Date.parse(v)), { message: 'Invalid ISO date string' }),
        z.null(),
      ])
      .optional(),
    isPaused: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return new Date(data.endTime).getTime() > new Date(data.startTime).getTime();
      }
      return true;
    },
    {
      message: 'End time must be after start time',
      path: ['endTime'],
    }
  );

