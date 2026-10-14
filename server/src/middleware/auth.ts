import { Request, Response, NextFunction } from 'express';
import { verifyJwtToken } from '../utils/crypto';
import { Role } from '@fossctf/shared';
import { dbService } from '../services/db.service';

interface JWTPayload {
  id: string;
  email: string;
  username: string;
  role: Role;
  teamId: string | null;
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token =
    req.cookies?.['__Host-foss_session'] ||
    req.cookies?.['foss_session'] ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null);

  if (token) {
    const payload = verifyJwtToken<JWTPayload>(token);
    if (payload) {
      req.user = { ...payload };

      // Re-validate against authoritative database state if user exists to prevent stale teamId / role
      try {
        const liveUser = await Promise.race([
          dbService.getUser(payload.id),
          new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('User refresh timeout')), 2500)
          ),
        ]);
        if (liveUser) {
          req.user.teamId = liveUser.teamId;
          req.user.role = liveUser.role;
        }
      } catch {
        // Retain verified JWT payload if database lookup encounters transient error
      }
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
