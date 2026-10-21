import { Request, Response } from 'express';
import { Role } from '@fossctf/shared';
import { dbService } from '../services/db.service';
import { signToken } from '../utils/crypto';
import { config } from '../config/index';
import { oidcService } from '../services/oidc.service';
import { rosterService } from '../services/roster.service';
import { DEV_TEAMS, DEV_PARTICIPANTS, DEV_ADMIN, LEGACY_TEST_ACCOUNTS } from '../fixtures/devRoster';

function isProductionEnv(): boolean {
  return config.nodeEnv === 'production' || !!process.env.VERCEL;
}

function getSessionCookieName(): string {
  return !isProductionEnv() ? 'foss_session' : '__Host-foss_session';
}

function getOidcTxCookieName(): string {
  return !isProductionEnv() ? 'oidc_tx' : '__Host-oidc_tx';
}

function getSessionCookieOptions(maxAge?: number) {
  const isProd = isProductionEnv();
  const sameSite = config.cookieSameSite === 'none' ? 'none' : 'lax';
  const isSecure = isProd || sameSite === 'none';
  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: sameSite as 'none' | 'lax',
    path: '/',
    ...(maxAge ? { maxAge } : {}),
  };
}

export function setSessionCookie(res: Response, token: string, maxAge: number = 7 * 24 * 60 * 60 * 1000): void {
  const sessionCookieName = getSessionCookieName();
  res.cookie(sessionCookieName, token, getSessionCookieOptions(maxAge));
  if (sessionCookieName !== 'foss_session') {
    res.cookie('foss_session', token, getSessionCookieOptions(maxAge));
  }
}

function getOidcTxCookieOptions(maxAge: number = 15 * 60 * 1000) {
  const isProd = isProductionEnv();
  return {
    httpOnly: true,
    secure: isProd || config.cookieSameSite === 'none',
    // In production, 'none' allows the browser to include the cookie when following cross-site redirects from the OIDC provider
    sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
    path: '/',
    maxAge,
  };
}

function parseOidcRoles(claims: { role?: any; roles?: any; groups?: any }): string[] {
  const extracted: string[] = [];

  const add = (val: any) => {
    if (!val) return;
    if (Array.isArray(val)) {
      val.forEach(add);
    } else if (typeof val === 'string') {
      val.split(',').forEach((s) => {
        const trimmed = s.trim().toLowerCase();
        if (trimmed) extracted.push(trimmed);
      });
    }
  };

  add(claims.role);
  add(claims.roles);
  add(claims.groups);

  return extracted;
}

/**
 * Safely extracts a clean, single host name without trailing ports or comma-separated proxy entries.
 * Handles reverse proxy chains (Vercel Edge, Cloudflare, Campus NAT) where X-Forwarded-Host
 * contains comma-separated values like "ctf.fossclub.tech, ctffoss.vercel.app".
 */
export function getSafeHost(req: Request): string {
  // 1. Check req.hostname (populated by Express via trust proxy, strips port and comma-separated proxies)
  if (req.hostname && typeof req.hostname === 'string' && req.hostname.trim()) {
    const clean = req.hostname.trim();
    if (!clean.includes(',') && !clean.includes(' ')) {
      return clean;
    }
  }

  // 2. Check X-Forwarded-Host (split by comma to extract client-facing host)
  const forwardedHost = req.get('x-forwarded-host');
  if (forwardedHost && typeof forwardedHost === 'string' && forwardedHost.trim()) {
    const firstHost = forwardedHost.split(',')[0].trim().replace(/:\d+$/, '');
    if (firstHost && !firstHost.includes(' ')) return firstHost;
  }

  // 3. Fallback to Host header
  const host = req.get('host');
  if (host && typeof host === 'string' && host.trim()) {
    const firstHost = host.split(',')[0].trim().replace(/:\d+$/, '');
    if (firstHost && !firstHost.includes(' ')) return firstHost;
  }

  return 'localhost:4000';
}

/**
 * Safely extracts the client protocol (http or https).
 * Prioritizes X-Forwarded-Proto to respect reverse proxy SSL termination.
 */
export function getSafeProtocol(req: Request): string {
  // 1. Check X-Forwarded-Proto (populated by reverse proxy/load balancer)
  const forwardedProto = req.get('x-forwarded-proto');
  if (forwardedProto && typeof forwardedProto === 'string' && forwardedProto.trim()) {
    const firstProto = forwardedProto.split(',')[0].trim().toLowerCase();
    if (firstProto === 'http' || firstProto === 'https') return firstProto;
  }

  // 2. Check req.protocol (populated by Express via trust proxy)
  if (req.protocol && typeof req.protocol === 'string' && req.protocol.trim()) {
    const proto = req.protocol.split(',')[0].trim().toLowerCase();
    if (proto === 'http' || proto === 'https') return proto;
  }

  return isProductionEnv() ? 'https' : 'http';
}

export const authController = {
  /**
   * Initiates OIDC Authorization Code Flow with PKCE S256.
   * Generates cryptographically secure state, nonce, and code challenge,
   * stores transaction state in signed HttpOnly cookie, and redirects to provider.
   */
  async oidcLogin(req: Request, res: Response): Promise<void> {
    const loginStart = Date.now();
    try {
      const { authorizationUrl, signedTxCookie } =
        await oidcService.createAuthorizationRequest();

      const authGenMs = Date.now() - loginStart;

      // Bind transaction state to initiating browser via signed HttpOnly cookies (with both Host-prefixed and standard fallbacks)
      const txOptions = getOidcTxCookieOptions(15 * 60 * 1000);
      res.cookie(getOidcTxCookieName(), signedTxCookie, txOptions);
      if (getOidcTxCookieName() !== 'oidc_tx') {
        res.cookie('oidc_tx', signedTxCookie, txOptions);
      }

      console.log(`⏱️  [OIDC_LOGIN] duration=${authGenMs}ms status=307 cookieSet=${getOidcTxCookieName()}`);

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
      console.error(`❌ [OIDC_LOGIN:ERROR] duration=${Date.now() - loginStart}ms message=${err.message}`);
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
    const callbackStart = Date.now();
    const queryState = typeof req.query.state === 'string' ? req.query.state : undefined;
    const rawTxCookie =
      req.cookies?.[getOidcTxCookieName()] ||
      req.cookies?.['__Host-oidc_tx'] ||
      req.cookies?.['oidc_tx'];

    // Verify transaction from cookie OR fallback to cryptographically signed query state
    let tx = oidcService.verifyTransactionCookie(rawTxCookie);
    let usedFallback = false;
    if (!tx && queryState) {
      tx = oidcService.verifyTransactionCookie(queryState);
      if (tx) usedFallback = true;
    }

    const txCheckMs = Date.now() - callbackStart;
    const cookieNames = Object.keys(req.cookies || {}).join(',') || 'none';
    console.log(`⏱️  [OIDC_CALLBACK:TX] duration=${txCheckMs}ms found=${!!tx} fallback=${usedFallback} cookies=${cookieNames}`);

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
      console.warn(`⚠️  [OIDC_CALLBACK:TX_MISSING] duration=${Date.now() - callbackStart}ms code=INVALID_TRANSACTION`);
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
      // Strictly use config.oidcRedirectUri as the base origin and path to guarantee that the redirect_uri
      // sent during token exchange matches the exact registered redirect_uri required by the OIDC provider,
      // preventing host mismatch issues when running behind Vercel serverless reverse proxy rewrites.
      let callbackUrl: URL;
      const safeHost = getSafeHost(req);
      const safeProto = getSafeProtocol(req);
      const safeOrigin = `${safeProto}://${safeHost}`;

      try {
        const rawOidcRedirect = (config.oidcRedirectUri || '').trim().replace(/^['"]|['"]$/g, '');
        const baseRedirect = rawOidcRedirect.startsWith('http')
          ? new URL(rawOidcRedirect)
          : new URL(rawOidcRedirect || '/api/v1/auth/callback', safeOrigin);

        const rawReqUrl = req.originalUrl || req.url || '';
        const incomingUrl = new URL(rawReqUrl.startsWith('/') ? rawReqUrl : `/${rawReqUrl}`, 'http://localhost');

        callbackUrl = new URL(baseRedirect.pathname, baseRedirect.origin);
        callbackUrl.search = incomingUrl.search;
      } catch (urlErr: any) {
        console.warn('⚠️  [OIDC_CALLBACK:URL_PARSE_FALLBACK]', urlErr?.message || urlErr);
        const rawReqUrl = req.originalUrl || req.url || '/api/v1/auth/callback';
        callbackUrl = new URL(rawReqUrl.startsWith('/') ? rawReqUrl : `/${rawReqUrl}`, safeOrigin);
      }

      const tokenExchangeStart = Date.now();
      const claims = await oidcService.processCallback({
        callbackUrl,
        transaction: tx,
      });
      const tokenExchangeMs = Date.now() - tokenExchangeStart;
      console.log(`⏱️  [OIDC_CALLBACK:TOKEN_EXCHANGE] duration=${tokenExchangeMs}ms status=success`);

      if (!claims.sub) {
        console.warn(`⚠️  [OIDC_CALLBACK:INVALID_CLAIMS] duration=${Date.now() - callbackStart}ms missing=sub`);
        res.status(400).json({
          success: false,
          error: {
            message: 'OIDC provider did not return a valid subject identifier',
            code: 'INVALID_CLAIMS',
          },
        });
        return;
      }

      // Extract role and attributes from OIDC claims
      const rawRoles = parseOidcRoles(claims);
      const isOidcAdmin =
        rawRoles.includes('admin') ||
        claims.preferred_username?.toLowerCase() === 'mridulxjain' ||
        claims.email?.toLowerCase() === 'krishnajain2604@gmail.com' ||
        claims.email?.toLowerCase() === 'admin@fossclub.tech';

      // Sole authoritative role in DB: directly fetched from OIDC club role
      const targetRole: Role =
        isOidcAdmin
          ? 'admin'
          : rawRoles.includes('lead')
            ? 'lead'
            : rawRoles.includes('core')
              ? 'core'
              : 'member';

      // Step 1: Find existing account by stable OIDC subject
      const dbLookupStart = Date.now();
      let user = await dbService.getUserByOidcSub(claims.sub);

      // Fallback check if account was registered by username or email before linking oidcSub
      if (!user && claims.preferred_username) {
        const existingByName = await dbService.getUserByUsername(claims.preferred_username);
        if (existingByName && existingByName.oidcSub === claims.sub) {
          user = existingByName;
        }
      }

      if (!user && claims.email) {
        const existingByEmail = await dbService.getUserByEmail(claims.email);
        if (existingByEmail) {
          if (existingByEmail.oidcSub === claims.sub) {
            user = existingByEmail;
          } else {
            // Security requirement: Do not automatically link solely by matching email if unlinked or conflicting oidcSub
            console.warn(`⚠️  [OIDC_CALLBACK:CONFLICT] duration=${Date.now() - callbackStart}ms code=ACCOUNT_CONFLICT_UNLINKED`);
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
      }

      if (user) {
        // Authoritative role & profile synchronization on every login (supports promotions, demotions, etc.)
        const shouldUpdateRole = user.role !== targetRole;
        const shouldUpdateAvatar = Boolean(claims.picture && user.avatarUrl !== claims.picture);

        if (shouldUpdateRole || shouldUpdateAvatar) {
          user = await dbService.updateUser(user.id, {
            role: targetRole,
            avatarUrl: claims.picture || user.avatarUrl,
          });
        }
      } else {
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

        user = await dbService.createUser({
          email,
          username,
          role: targetRole,
          teamId: null,
          oidcSub: claims.sub,
          avatarUrl: claims.picture || null,
        });
      }

      // Step 2: Automatic Team Matching via Approved Roster
      // Security Requirement: Require trusted email_verified === true and ensure no UserInfo sub mismatch.
      // Do not treat missing or false email_verified claim as verified.
      if (!user.teamId && claims.email && claims.email_verified === true && !claims.userinfoSubMismatch) {
        try {
          const rosterMatch = await rosterService.findTeamForEmail(claims.email);
          if (rosterMatch.status === 'MATCH' && rosterMatch.team) {
            const dbTeam = await dbService.getTeamByName(rosterMatch.team.teamName);
            if (dbTeam) {
              user = await dbService.assignUserToTeam(user.id, dbTeam.id);
              console.log(
                `✅ [OIDC_CALLBACK:AUTO_TEAM_ASSIGN] Assigned user ${user.id} to team "${dbTeam.name}" (${dbTeam.id})`
              );
            } else {
              console.warn(
                `⚠️  [OIDC_CALLBACK:MISSING_TEAM_IN_DB] Approved roster matched team "${rosterMatch.team.teamName}" for user ${user.id}, but team is not initialized in database.`
              );
            }
          } else if (rosterMatch.status === 'AMBIGUOUS') {
            console.warn(
              `⚠️  [OIDC_CALLBACK:AMBIGUOUS_ROSTER] Ambiguous roster match for user ${user.id}: ${rosterMatch.message}`
            );
          }
        } catch (autoErr: any) {
          console.error(`❌ [OIDC_CALLBACK:AUTO_TEAM_ERROR] Failed during automatic team matching: ${autoErr.message}`);
        }
      }

      const dbLookupMs = Date.now() - dbLookupStart;
      console.log(`⏱️  [OIDC_CALLBACK:DB] duration=${dbLookupMs}ms userResolved=true role=${user.role} hasTeam=${!!user.teamId}`);

      const finalClubRole = user.role;

      // Issue internal CTF session token
      const sessionToken = signToken({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        clubRole: finalClubRole,
        teamId: user.teamId,
      });

      const sessionCookieName = getSessionCookieName();
      res.cookie(sessionCookieName, sessionToken, getSessionCookieOptions(7 * 24 * 60 * 60 * 1000));
      if (sessionCookieName !== 'foss_session') {
        res.cookie('foss_session', sessionToken, getSessionCookieOptions(7 * 24 * 60 * 60 * 1000));
      }

      const team = user.teamId ? await dbService.getTeam(user.teamId) : null;

      if (req.headers.accept?.includes('application/json')) {
        console.log(`⏱️  [OIDC_CALLBACK:COMPLETE] totalDuration=${Date.now() - callbackStart}ms format=json`);
        res.json({
          success: true,
          data: {
            token: sessionToken,
            user: {
              id: user.id,
              email: user.email,
              username: user.username,
              role: user.role,
              clubRole: finalClubRole,
              teamId: user.teamId,
              teamName: team?.name || null,
              avatarUrl: user.avatarUrl || null,
              createdAt: user.createdAt.toISOString(),
            },
          },
        });
        return;
      }

      // Redirect browser back to frontend; session is established strictly via HttpOnly cookie
      // In local dev/test, strictly preserve config.frontendUrl with port (e.g. http://localhost:5173)
      // In production, dynamically preserve whether the user authenticated via ctf.fossclub.tech or ctffoss.vercel.app
      let targetFrontend = config.frontendUrl;

      const rawForwardedHost = req.get('x-forwarded-host');
      const firstForwardedHost = rawForwardedHost
        ? rawForwardedHost.split(',')[0].trim().replace(/:\d+$/, '')
        : null;

      const hostToCheck = firstForwardedHost || req.hostname || '';
      const isBackendHost =
        hostToCheck.includes('backend') ||
        hostToCheck.includes('-api') ||
        hostToCheck.startsWith('api.');

      const isCustomProdDomain =
        !isBackendHost &&
        (hostToCheck.includes('fossclub.tech') || hostToCheck.includes('vercel.app'));

      if (isCustomProdDomain) {
        const safeProto = getSafeProtocol(req);
        targetFrontend = `${safeProto}://${hostToCheck}`;
      }

      // Final URL safety validation
      let finalRedirectUrl: string;
      try {
        const parsedTarget = new URL(targetFrontend);
        finalRedirectUrl = parsedTarget.origin;
      } catch {
        finalRedirectUrl = config.frontendUrl || '/';
      }

      console.log(`⏱️  [OIDC_CALLBACK:COMPLETE] totalDuration=${Date.now() - callbackStart}ms redirect=${finalRedirectUrl}`);
      res.redirect(finalRedirectUrl);
    } catch (err: any) {
      const code = err.code || 'OIDC_CALLBACK_FAILED';
      const status =
        code === 'INVALID_STATE' || code === 'OIDC_CALLBACK_ERROR' || code === 'INVALID_CLAIMS'
          ? 400
          : 500;
      console.error(`❌ [OIDC_CALLBACK:FAILED] totalDuration=${Date.now() - callbackStart}ms code=${code} status=${status} message=${err.message}`);

      if (req.headers.accept?.includes('application/json')) {
        res.status(status).json({
          success: false,
          error: {
            message: err.message || 'Failed to process OIDC authentication callback',
            code,
          },
        });
        return;
      }

      // For standard browser navigation, redirect with auth_error query parameter so Navbar displays friendly banner
      const rawForwardedHost = req.get('x-forwarded-host');
      const firstForwardedHost = rawForwardedHost
        ? rawForwardedHost.split(',')[0].trim().replace(/:\d+$/, '')
        : null;
      const hostToCheck = firstForwardedHost || req.hostname || '';
      const isBackendHost =
        hostToCheck.includes('backend') ||
        hostToCheck.includes('-api') ||
        hostToCheck.startsWith('api.');

      let errFrontend = config.frontendUrl;
      if (!isBackendHost && (hostToCheck.includes('fossclub.tech') || hostToCheck.includes('vercel.app'))) {
        errFrontend = `${getSafeProtocol(req)}://${hostToCheck}`;
      }
      try {
        const errRedirect = new URL(errFrontend);
        errRedirect.searchParams.set('auth_error', code);
        res.redirect(errRedirect.toString());
      } catch {
        res.redirect(`${config.frontendUrl}/?auth_error=${encodeURIComponent(code)}`);
      }
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
    const devClubRole = user.role?.toLowerCase() === 'admin' ? 'admin' : user.role;
    const token = signToken({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      clubRole: devClubRole,
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
          clubRole: devClubRole,
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
    const meStart = Date.now();
    if (!req.user) {
      console.log(`⏱️  [AUTH_ME] duration=${Date.now() - meStart}ms authenticated=false`);
      res.json({
        success: true,
        data: { user: null, team: null },
      });
      return;
    }

    try {
      let user = await dbService.getUser(req.user.id);
      if (!user && req.user.username) {
        user = await dbService.getUserByUsername(req.user.username);
      }
      if (!user) {
        console.log(`⏱️  [AUTH_ME] duration=${Date.now() - meStart}ms authenticated=false reason=user_not_found`);
        res.json({
          success: true,
          data: { user: null, team: null },
        });
        return;
      }

      // Check admin status for mridulxjain
      if (
        (user.username.toLowerCase() === 'mridulxjain' || user.email.toLowerCase() === 'krishnajain2604@gmail.com') &&
        user.role?.toLowerCase() !== 'admin'
      ) {
        user = await dbService.updateUser(user.id, { role: 'admin' });
      }

      const effectiveRole: Role =
        (user.username.toLowerCase() === 'mridulxjain' || user.email.toLowerCase() === 'krishnajain2604@gmail.com')
          ? 'admin'
          : user.role;

      const effectiveClubRole = effectiveRole;

      const team = user.teamId ? await dbService.getTeam(user.teamId) : null;
      console.log(`⏱️  [AUTH_ME] duration=${Date.now() - meStart}ms authenticated=true hasTeam=${!!team} role=${effectiveRole} clubRole=${effectiveClubRole}`);

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            role: effectiveRole,
            clubRole: effectiveClubRole,
            teamId: user.teamId,
            teamName: team?.name || null,
            avatarUrl: user.avatarUrl || null,
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
    } catch (err: any) {
      console.error(`❌ [AUTH_ME:ERROR] duration=${Date.now() - meStart}ms message=${err.message}`);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to retrieve user session', code: 'SESSION_RETRIEVAL_FAILED' },
      });
    }
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

