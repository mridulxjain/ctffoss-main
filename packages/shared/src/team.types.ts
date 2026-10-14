export interface TeamMemberDTO {
  id: string;
  username: string;
  email: string;
  role: string;
}

export interface TeamDTO {
  id: string;
  name: string;
  inviteCode: string;
  totalScore: number;
  members: TeamMemberDTO[];
  solvesCount: number;
  rank?: number;
  createdAt: string;
}

export interface CreateTeamRequest {
  name: string;
}

export interface JoinTeamRequest {
  inviteCode: string;
}
