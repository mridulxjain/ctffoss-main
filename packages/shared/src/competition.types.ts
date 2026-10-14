export type CompetitionState = 'DRAFT' | 'PREPARING' | 'SCHEDULED' | 'LIVE' | 'ENDED' | 'PAUSED';

export interface CompetitionConfigDTO {
  id: string;
  title: string;
  description: string;
  startTime: string | null;
  endTime: string | null;
  isPaused: boolean;
  state: CompetitionState;
  status: CompetitionState;
  serverTime: string;
}

export interface UpdateCompetitionConfigRequest {
  title?: string;
  description?: string;
  startTime?: string | null;
  endTime?: string | null;
  isPaused?: boolean;
  state?: CompetitionState;
}

export interface TeamReadinessDTO {
  teamId: string;
  teamName: string;
  isReady: boolean;
  readyAt: string | null;
}

export interface CompetitionReadinessSummaryDTO {
  competitionStatus: CompetitionState;
  totalEligibleTeams: number;
  readyTeamsCount: number;
  notReadyTeamsCount: number;
  allReady: boolean;
  teams: TeamReadinessDTO[];
  myTeamReadiness?: {
    teamId: string;
    isReady: boolean;
    readyAt: string | null;
  } | null;
  officialStartTime?: string | null;
}

export interface SetTeamReadinessRequest {
  isReady: boolean;
}

export interface StartCompetitionResponse {
  success: boolean;
  message: string;
  startTime: string;
  state: CompetitionState;
}

export type AttemptStatus = 'IN_PROGRESS' | 'COMPLETED';

export interface CompetitionAttemptDTO {
  id: string;
  teamId: string;
  status: AttemptStatus;
  startedAt: string;
  completedAt: string | null;
  elapsedMs: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitAttemptFlagRequest {
  flag: string;
}

export interface SubmitAttemptFlagResponse {
  attempt: CompetitionAttemptDTO;
  message: string;
}

export type TimedAttemptStatus = 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED';

export interface CompetitionLeaderboardEntryDTO {
  rank: number;
  teamId: string;
  teamName: string;
  status: TimedAttemptStatus;
  elapsedMs: number | null;
  formattedTime: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface CompetitionLeaderboardResponse {
  leaderboard: CompetitionLeaderboardEntryDTO[];
  totalTeams: number;
  completedCount: number;
  inProgressCount: number;
  notStartedCount: number;
  updatedAt: string;
}

/**
 * Formats an elapsed duration in milliseconds into mm:ss.SSS with consistent precision.
 * e.g., 134532 -> "02:14.532"
 */
export function formatElapsedDuration(ms: number | null | undefined): string | null {
  if (ms === null || ms === undefined || ms < 0 || isNaN(ms)) return null;
  const totalSeconds = Math.floor(ms / 1000);
  const milliseconds = ms % 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const sss = String(milliseconds).padStart(3, '0');
  return `${mm}:${ss}.${sss}`;
}

