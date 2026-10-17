import { Request, Response, NextFunction } from 'express';
import { verifyJwtToken } from '../utils/crypto';
import { Role } from '@fossctf/shared';
import { dbService } from '../services/db.service';

interface JWTPayload {
  id: string;
  email: string;
  username: string;
  role: Role;
  clubRole?: string | null;
  teamId: string | null;
}

// Tracks active user presence in CTF (timestamp of last activity)
export const activeUserSessions = new Map<string, number>();

export function markUserActive(userId: string) {
  if (userId) {
    activeUserSessions.set(userId, Date.now());
  }
}

export function isUserActive(userId: string): boolean {
  if (!userId) return false;
  const lastActive = activeUserSessions.get(userId);
  if (!lastActive) return false;
  // Consider active if user was active in the last 30 minutes
  return Date.now() - lastActive < 30 * 60 * 1000;
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
      markUserActive(payload.id);

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
          if (liveUser.role === 'ADMIN') {
            req.user.clubRole = 'admin';
          }
        }
      } catch {
        // Retain verified JWT payload if database lookup encounters transient error
      }

      // Safety check for verified mridulxjain admin account from Supabase
      if (
        req.user.username?.toLowerCase() === 'mridulxjain' ||
        req.user.email?.toLowerCase() === 'krishnajain2604@gmail.com'
      ) {
        req.user.role = 'ADMIN';
        req.user.clubRole = 'admin';
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
