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
