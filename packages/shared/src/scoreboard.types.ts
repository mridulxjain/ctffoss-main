export interface ScoreboardEntryDTO {
  rank: number;
  teamId: string;
  teamName: string;
  totalScore: number;
  solvesCount: number;
  lastSolveAt: string | null;
}

export interface ScoreboardTimelinePoint {
  teamId: string;
  teamName: string;
  timestamp: string;
  score: number;
  challengeTitle: string;
}

export interface ScoreboardResponse {
  leaderboard: ScoreboardEntryDTO[];
  timeline: ScoreboardTimelinePoint[];
  isFrozen: boolean;
}
