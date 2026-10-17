import { Role } from '@fossctf/shared';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        username: string;
        role: Role;
        clubRole?: string | null;
        teamId: string | null;
      };
    }
  }
}

export {};
