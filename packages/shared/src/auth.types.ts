export type Role = 'admin' | 'lead' | 'core' | 'member' | 'ADMIN' | 'USER';
export type ClubRole = 'admin' | 'lead' | 'core' | 'member';

export interface UserDTO {
  id: string;
  email: string;
  username: string;
  role: Role | string;
  clubRole?: ClubRole | string | null;
  teamId: string | null;
  teamName?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
}

export interface AuthSessionResponse {
  user: UserDTO | null;
  team: {
    id: string;
    name: string;
    totalScore: number;
  } | null;
}

export interface DevLoginRequest {
  role?: Role;
  username?: string;
  email?: string;
}
