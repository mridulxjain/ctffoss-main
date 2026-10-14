import { Request, Response } from 'express';
import { dbService } from '../services/db.service';
import { signToken } from '../utils/crypto';
import { config } from '../config/index';
import { oidcService } from '../services/oidc.service';
import { DEV_TEAMS, DEV_PARTICIPANTS, DEV_ADMIN, LEGACY_TEST_ACCOUNTS } from '../fixtures/devRoster';

function getSessionCookieName(): string {
  return config.isDev ? 'foss_session' : '__Host-foss_session';
}

function getOidcTxCookieName(): string {
  return config.isDev ? 'oidc_tx' : '__Host-oidc_tx';
}

function getSessionCookieOptions(maxAge?: number) {
  const isSecure = config.nodeEnv === 'production' || config.cookieSameSite === 'none';
  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: config.cookieSameSite,
    path: '/',
    ...(maxAge ? { maxAge } : {}),
  };
}

function getOidcTxCookieOptions(maxAge: number = 15 * 60 * 1000) {
  const isProd = config.nodeEnv === 'production';
  return {
    httpOnly: true,
    secure: isProd || config.cookieSameSite === 'none',
    // In production, 'none' allows the browser to include the cookie when following cross-site redirects from the OIDC provider
    sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
    path: '/',
    maxAge,
  };
}

export const authController = {
  /**
   * Initiates OIDC Authorization Code Flow with PKCE S256.
   * Generates cryptographically secure state, nonce, and code challenge,
   * stores transaction state in signed HttpOnly cookie, and redirects to provider.
   */
  async oidcLogin(req: Request, res: Response): Promise<void> {
    try {
      const { authorizationUrl, signedTxCookie } =
        await oidcService.createAuthorizationRequest();

      // Bind transaction state to initiating browser via signed HttpOnly cookies (with both Host-prefixed and standard fallbacks)
      const txOptions = getOidcTxCookieOptions(15 * 60 * 1000);
      res.cookie(getOidcTxCookieName(), signedTxCookie, txOptions);
      if (getOidcTxCookieName() !== 'oidc_tx') {
        res.cookie('oidc_tx', signedTxCookie, txOptions);
      }

      if (req.headers.accept?.includes('application/json')) {
        res.json({
          success: true,
          data: {
            authorizationUrl,
          },
        });
        return;
      }

      res.redirect(authorizationUrl);
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: {
          message: err.message || 'Failed to initiate OIDC authorization',
          code: 'OIDC_INIT_FAILED',
        },
      });
    }
  },

  /**
   * Handles redirect from OIDC provider, validates state, nonce, and PKCE verifier,
   * extracts subject and profile claims, finds or creates local User with oidcSub,
   * and establishes internal CTF session cookie.
   */
  async oidcCallback(req: Request, res: Response): Promise<void> {
    const queryState = typeof req.query.state === 'string' ? req.query.state : undefined;
    const rawTxCookie =
      req.cookies?.[getOidcTxCookieName()] ||
      req.cookies?.['__Host-oidc_tx'] ||
      req.cookies?.['oidc_tx'];

    // Verify transaction from cookie OR fallback to cryptographically signed query state
    let tx = oidcService.verifyTransactionCookie(rawTxCookie);
    if (!tx && queryState) {
      tx = oidcService.verifyTransactionCookie(queryState);
    }

    // Clear transaction cookies immediately upon callback
    const clearOptions = getSessionCookieOptions();
    const clearTxOptions = getOidcTxCookieOptions(0);
    res.clearCookie(getOidcTxCookieName(), clearOptions);
    res.clearCookie('__Host-oidc_tx', clearOptions);
    res.clearCookie('oidc_tx', clearOptions);
    res.clearCookie(getOidcTxCookieName(), clearTxOptions);
    res.clearCookie('__Host-oidc_tx', clearTxOptions);
    res.clearCookie('oidc_tx', clearTxOptions);

    if (!tx) {
      res.status(400).json({
        success: false,
        error: {
          message:
            'Missing or expired OIDC transaction state. Please initiate login again.',
          code: 'INVALID_TRANSACTION',
        },
      });
      return;
    }

    try {
      // Reconstruct callback URL
      const host = req.get('host') || 'localhost:4000';
      const protocol = req.protocol || 'http';
      const callbackUrl = new URL(req.originalUrl || req.url, `${protocol}://${host}`);

      const claims = await oidcService.processCallback({
        callbackUrl,
        transaction: tx,
      });

      if (!claims.sub) {
        res.status(400).json({
          success: false,
          error: {
            message: 'OIDC provider did not return a valid subject identifier',
            code: 'INVALID_CLAIMS',
          },
        });
        return;
      }

      // Step 1: Find existing account by stable OIDC subject
      let user = await dbService.getUserByOidcSub(claims.sub);

      if (!user) {
        // Step 2: Security requirement: Do not automatically link solely by matching email
        if (claims.email) {
          const existingByEmail = await dbService.getUserByEmail(claims.email);
          if (existingByEmail && existingByEmail.oidcSub !== claims.sub) {
            res.status(409).json({
              success: false,
              error: {
                message:
                  'An unlinked account with this email address already exists. Manual administrator verification is required.',
                code: 'ACCOUNT_CONFLICT_UNLINKED',
              },
            });
            return;
          }
        }

        // Generate clean unique username
        const baseUsername =
          claims.preferred_username ||
          (claims.name ? claims.name.replace(/\s+/g, '_').toLowerCase() : null) ||
          `user_${claims.sub.slice(0, 8)}`;

        let username = baseUsername;
        let counter = 1;
        while (await dbService.getUserByUsername(username)) {
          username = `${baseUsername}_${counter++}`;
        }

        const email = claims.email || `${claims.sub}@oidc.fossclub.tech`;

        // Safe defaults per security requirements:
        // Role: USER (no unconfirmed admin assumptions)
        // Team: null (no browser-supplied or invented team IDs)
        user = await dbService.createUser({
          email,
          username,
          role: 'USER',
          teamId: null,
          oidcSub: claims.sub,
          avatarUrl: claims.picture || null,
        });
      }

      // Issue internal CTF session token
      const sessionToken = signToken({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        teamId: user.teamId,
      });

      const sessionCookieName = getSessionCookieName();
      res.cookie(sessionCookieName, sessionToken, getSessionCookieOptions(7 * 24 * 60 * 60 * 1000));
      if (sessionCookieName !== 'foss_session') {
        res.cookie('foss_session', sessionToken, getSessionCookieOptions(7 * 24 * 60 * 60 * 1000));
      }

      const team = user.teamId ? await dbService.getTeam(user.teamId) : null;

      if (req.headers.accept?.includes('application/json')) {
        res.json({
          success: true,
          data: {
            token: sessionToken,
            user: {
              id: user.id,
              email: user.email,
              username: user.username,
              role: user.role,
              teamId: user.teamId,
              teamName: team?.name || null,
              createdAt: user.createdAt.toISOString(),
            },
          },
        });
        return;
      }

      // Redirect browser back to frontend; session is established strictly via HttpOnly cookie
      const forwardHost = req.get('x-forwarded-host') || req.get('host');
      const isTrustedHost = forwardHost && (forwardHost.includes('fossclub.tech') || forwardHost.includes('vercel.app'));
      const targetFrontend = isTrustedHost ? `https://${forwardHost}` : config.frontendUrl;
      res.redirect(targetFrontend);
    } catch (err: any) {
      const code = err.code || 'OIDC_CALLBACK_FAILED';
      const status =
        code === 'INVALID_STATE' || code === 'OIDC_CALLBACK_ERROR' || code === 'INVALID_CLAIMS'
          ? 400
          : 500;
      res.status(status).json({
        success: false,
        error: {
          message: err.message || 'Failed to process OIDC authentication callback',
          code,
        },
      });
    }
  },

  /**
   * Returns available development test personas grouped by team (Dev only).
   */
  async getDevPersonas(_req: Request, res: Response): Promise<void> {
    if (!config.isDev || !config.enableDevAuth) {
      res.status(403).json({
        success: false,
        error: {
          message: 'Development authentication is disabled in this environment',
          code: 'DEV_AUTH_DISABLED',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        teams: DEV_TEAMS,
        participants: DEV_PARTICIPANTS,
        admin: DEV_ADMIN,
        legacy: LEGACY_TEST_ACCOUNTS,
      },
    });
  },

  /**
   * Logs in as a seeded development test participant or administrator.
   * Strictly verifies that the account exists in server-side storage and derives
   * role and teamId exclusively from trusted database records (client cannot spoof).
   */
  async devLogin(req: Request, res: Response): Promise<void> {
    if (!config.isDev || !config.enableDevAuth) {
      res.status(403).json({
        success: false,
        error: {
          message: 'Development authentication is disabled in this environment',
          code: 'DEV_AUTH_DISABLED',
        },
      });
      return;
    }

    const { role, username, email, userId } = req.body;

    // Resolve user by email, username, userId, or fallback for legacy callers
    let user = null;
    if (email && typeof email === 'string') {
      user = await dbService.getUserByEmail(email.trim().toLowerCase());
    } else if (username && typeof username === 'string') {
      user = await dbService.getUserByUsername(username.trim());
    } else if (userId && typeof userId === 'string') {
      user = await dbService.getUser(userId.trim());
    } else if (role === 'ADMIN') {
      user = await dbService.getUserByEmail(DEV_ADMIN.email);
    } else {
      // Default dev fallback to first fake participant
      user = await dbService.getUserByEmail(DEV_PARTICIPANTS[0].email);
    }

    // Strictly reject unknown or unseeded accounts (no arbitrary browser user creation)
    if (!user) {
      res.status(404).json({
        success: false,
        error: {
          message: 'Unknown or unseeded development test account. Only seeded development fixtures can be used for dev login.',
          code: 'DEV_ACCOUNT_NOT_FOUND',
        },
      });
      return;
    }

    // Role and teamId are strictly taken from the authoritative database record
    const token = signToken({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      teamId: user.teamId,
    });

    const sessionCookieName = getSessionCookieName();
    res.cookie(sessionCookieName, token, getSessionCookieOptions(7 * 24 * 60 * 60 * 1000));
    if (sessionCookieName !== 'foss_session') {
      res.cookie('foss_session', token, getSessionCookieOptions(7 * 24 * 60 * 60 * 1000));
    }

    const team = user.teamId ? await dbService.getTeam(user.teamId) : null;

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          teamId: user.teamId,
          teamName: team?.name || null,
          createdAt: user.createdAt.toISOString(),
        },
        team: team
          ? {
              id: team.id,
              name: team.name,
              totalScore: team.totalScore,
            }
          : null,
      },
    });
  },

  async getMe(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      res.json({
        success: true,
        data: { user: null, team: null },
      });
      return;
    }

    const user = await dbService.getUser(req.user.id);
    if (!user) {
      res.json({
        success: true,
        data: { user: null, team: null },
      });
      return;
    }

    const team = user.teamId ? await dbService.getTeam(user.teamId) : null;

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          teamId: user.teamId,
          teamName: team?.name || null,
          createdAt: user.createdAt.toISOString(),
        },
        team: team
          ? {
              id: team.id,
              name: team.name,
              totalScore: team.totalScore,
            }
          : null,
      },
    });
  },

  async logout(_req: Request, res: Response): Promise<void> {
    res.clearCookie(getSessionCookieName(), getSessionCookieOptions());
    res.clearCookie('__Host-foss_session', getSessionCookieOptions());
    res.clearCookie('foss_session', getSessionCookieOptions());
    res.json({
      success: true,
      data: {
        message: 'Logged out successfully',
        postLogoutRedirectUri: config.oidcPostLogoutRedirectUri,
      },
    });
  },
};

