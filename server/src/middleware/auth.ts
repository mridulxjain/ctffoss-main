import { Request, Response, NextFunction } from 'express';
import { verifyJwtToken } from '../utils/crypto';
import { Role } from '@fossctf/shared';

interface JWTPayload {
  id: string;
  email: string;
  username: string;
  role: Role;
  teamId: string | null;
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const token =
    req.cookies?.foss_session ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null);

  if (token) {
    const payload = verifyJwtToken<JWTPayload>(token);
    if (payload) {
      req.user = payload;
    }
  }

  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
    });
    return;
  }
  next();
}

export function requireTeam(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
    });
    return;
  }

  if (!req.user.teamId) {
    res.status(403).json({
      success: false,
      error: {
        message: 'You must create or join a team to perform this action',
        code: 'TEAM_REQUIRED',
      },
    });
    return;
  }

  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      error: { message: 'Administrator privileges required', code: 'FORBIDDEN' },
    });
    return;
  }

  next();
}
