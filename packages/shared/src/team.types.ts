export interface TeamMemberDTO {
  id: string;
  username: string;
  email: string;
  role: string;
}

export interface TeamSolveDTO {
  challengeId: string;
  challengeTitle: string;
  categoryName?: string;
  pointsAwarded: number;
  solvedAt: string;
  isFirstBlood?: boolean;
}

export interface TeamDTO {
  id: string;
  name: string;
  externalId?: string | null;
  valenfindTeamId?: string | null;
  totalScore: number;
  members: TeamMemberDTO[];
  solvesCount: number;
  totalAvailableChallenges?: number;
  solves?: TeamSolveDTO[];
  rank?: number;
  createdAt: string;
}
