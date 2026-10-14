export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'INSANE';

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
  author?: string | null;
}

export interface ChallengeDetailDTO extends ChallengeListItemDTO {
  description: string;
  hints: HintDTO[];
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
