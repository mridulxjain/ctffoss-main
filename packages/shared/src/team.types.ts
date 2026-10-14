export interface TeamMemberDTO {
  id: string;
  username: string;
  email: string;
  role: string;
}

export interface TeamDTO {
  id: string;
  name: string;
  externalId?: string | null;
  totalScore: number;
  members: TeamMemberDTO[];
  solvesCount: number;
  rank?: number;
  createdAt: string;
}
