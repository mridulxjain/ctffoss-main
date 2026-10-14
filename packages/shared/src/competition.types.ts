export type CompetitionState = 'DRAFT' | 'SCHEDULED' | 'LIVE' | 'ENDED' | 'PAUSED';

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

