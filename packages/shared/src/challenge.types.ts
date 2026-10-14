export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'INSANE';

export type SessionStatus = 'NOT_STARTED' | 'ACTIVE' | 'COMPLETED' | 'EXPIRED';

export interface CategoryDTO {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
}

export interface HintDTO {
  id: string;
  cost: number;
  sortOrder: number;
  isUnlocked: boolean;
  content?: string; // Only populated if unlocked
}

export interface TeamChallengeSessionDTO {
  challengeId: string;
  teamId: string;
  isTimed: boolean;
  status: SessionStatus;
  startedAt: string | null;
  expiresAt: string | null;
  completedAt: string | null;
  remainingSeconds: number | null;
}

export interface ChallengeListItemDTO {
  id: string;
  slug: string;
  title: string;
  categoryId: string;
  categoryName: string;
  difficulty: Difficulty;
  points: number;
  solveCount: number;
  isSolvedByTeam: boolean;
  isTimed: boolean;
  durationMinutes?: number | null;
  isPublished?: boolean;
  isArchived?: boolean;
  sessionStatus?: SessionStatus;
  author?: string | null;
}

export interface ChallengeDetailDTO extends ChallengeListItemDTO {
  description: string;
  hints: HintDTO[];
  session?: TeamChallengeSessionDTO | null;
}

export interface AdminChallengeDTO {
  id: string;
  slug: string;
  title: string;
  description: string;
  categoryId: string;
  categoryName?: string;
  difficulty: Difficulty;
  points: number;
  isPublished: boolean;
  isArchived: boolean;
  isTimed: boolean;
  durationMinutes: number | null;
  author: string | null;
  sortOrder: number;
  hasFlag: boolean;
  flagCount: number;
  solveCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChallengeRequest {
  title: string;
  slug?: string;
  description: string;
  categoryId: string;
  difficulty: Difficulty;
  points: number;
  flag: string;
  isPublished?: boolean;
  isArchived?: boolean;
  isTimed?: boolean;
  durationMinutes?: number | null;
  author?: string | null;
}

export interface UpdateChallengeRequest {
  title?: string;
  slug?: string;
  description?: string;
  categoryId?: string;
  difficulty?: Difficulty;
  points?: number;
  isPublished?: boolean;
  isArchived?: boolean;
  isTimed?: boolean;
  durationMinutes?: number | null;
  author?: string | null;
  sortOrder?: number;
}

export interface UpdateFlagRequest {
  flag: string;
  isCaseSensitive?: boolean;
}

export interface FlagSubmissionRequest {
  flag: string;
}

export interface FlagSubmissionResponse {
  isCorrect: boolean;
  message: string;
  pointsAwarded?: number;
  isFirstBlood?: boolean;
}
