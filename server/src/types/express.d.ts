import { Role } from '@fossctf/shared';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        username: string;
        role: Role;
        teamId: string | null;
      };
    }
  }
}

export {};
