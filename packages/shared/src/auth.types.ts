export type Role = 'USER' | 'ADMIN';

export interface UserDTO {
  id: string;
  email: string;
  username: string;
  role: Role;
  teamId: string | null;
  teamName?: string | null;
  createdAt: string;
}

export interface AuthSessionResponse {
  user: UserDTO | null;
  team: {
    id: string;
    name: string;
    inviteCode: string;
    totalScore: number;
  } | null;
}

export interface DevLoginRequest {
  role?: Role;
  username?: string;
  email?: string;
}
