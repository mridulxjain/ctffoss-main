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
  sessionStatus?: SessionStatus;
  author?: string | null;
}

export interface ChallengeDetailDTO extends ChallengeListItemDTO {
  description: string;
  hints: HintDTO[];
  session?: TeamChallengeSessionDTO | null;
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
