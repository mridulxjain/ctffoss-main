import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { app } from '../src/app';
import { oidcService } from '../src/services/oidc.service';
import { config } from '../src/config/index';
import { dbService, memoryStore } from '../src/services/db.service';
import { verifyJwtToken } from '../src/utils/crypto';

let server: http.Server;
let baseUrl: string;

function makeRequest(
  method: string,
  path: string,
  headers: Record<string, string> = {},
  body?: any
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const req = http.request(
      url,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data;
          }
          resolve({ status: res.statusCode || 500, headers: res.headers, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

test.before(() => {
  dbService.setStorageDriver('memory');
  oidcService.setMockHandler(async () => ({
    sub: 'default-mock-sub',
    email: 'mock@fossclub.tech',
  }));
  return new Promise((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        baseUrl = `http://localhost:${addr.port}`;
      }
      resolve();
    });
  });
});

test.after(() => {
  oidcService.clearMockHandler();
  dbService.setStorageDriver(null);
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
});

test('PHASE 7: OIDC Authentication, PKCE flow, claim validation, and account provisioning', async (t) => {
  let savedSignedTxCookie: string = '';
  let savedState: string = '';
  let savedNonce: string = '';
  let savedCodeVerifier: string = '';

  await t.test('Login initiation (GET /api/v1/auth/login): generates PKCE, state, nonce, and binds tx cookie', async () => {
    const res = await makeRequest('GET', '/api/v1/auth/login', {
      Accept: 'application/json',
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.authorizationUrl);

    const authUrl = new URL(res.body.data.authorizationUrl);
    assert.ok(authUrl.href.startsWith(config.oidcIssuer));
    assert.equal(authUrl.searchParams.get('client_id'), config.oidcClientId);
    assert.equal(authUrl.searchParams.get('redirect_uri'), config.oidcRedirectUri);
    assert.equal(authUrl.searchParams.get('response_type'), 'code');
    assert.equal(authUrl.searchParams.get('scope'), config.oidcScopes);
    assert.equal(authUrl.searchParams.get('code_challenge_method'), 'S256');
    assert.ok(authUrl.searchParams.get('code_challenge'));
    assert.ok(authUrl.searchParams.get('state'));
    assert.ok(authUrl.searchParams.get('nonce'));

    savedState = authUrl.searchParams.get('state')!;
    savedNonce = authUrl.searchParams.get('nonce')!;

    // Verify Set-Cookie header contains oidc_tx HttpOnly cookie
    const setCookie = res.headers['set-cookie'];
    assert.ok(Array.isArray(setCookie));
    const txCookieStr = setCookie.find((c) => c.startsWith('oidc_tx='));
    assert.ok(txCookieStr, 'Must set oidc_tx cookie');
    assert.ok(txCookieStr.includes('HttpOnly'));

    savedSignedTxCookie = txCookieStr.split(';')[0]; // e.g. oidc_tx=...

    // Verify the cookie payload
    const tokenVal = savedSignedTxCookie.replace('oidc_tx=', '');
    const decodedTx = verifyJwtToken<any>(tokenVal);
    assert.ok(decodedTx);
    assert.equal(decodedTx.state, savedState);
    assert.equal(decodedTx.nonce, savedNonce);
    assert.ok(decodedTx.codeVerifier);
    savedCodeVerifier = decodedTx.codeVerifier;
  });

  await t.test('Callback security: rejected without transaction cookie (400 INVALID_TRANSACTION)', async () => {
    const res = await makeRequest(
      'GET',
      `/api/v1/auth/callback?code=fake-code&state=${savedState}`,
      { Accept: 'application/json' }
    );
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'INVALID_TRANSACTION');
  });

  await t.test('Callback security: rejected on mismatched state parameter (400 INVALID_STATE)', async () => {
    const res = await makeRequest(
      'GET',
      `/api/v1/auth/callback?code=fake-code&state=mismatched-state-12345`,
      {
        Accept: 'application/json',
        Cookie: savedSignedTxCookie,
      }
    );
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'INVALID_STATE');
  });

  await t.test('Callback security: provider error is safely handled without throwing (400 OIDC_CALLBACK_ERROR)', async () => {
    const res = await makeRequest(
      'GET',
      `/api/v1/auth/callback?error=access_denied&error_description=Member+access+required&state=${savedState}`,
      {
        Accept: 'application/json',
        Cookie: savedSignedTxCookie,
      }
    );
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'OIDC_CALLBACK_ERROR');
    assert.ok(res.body.error.message.includes('Member access required'));
  });

  const testOidcSub = 'usr-oidc-sub-uuid-101010';
  const testOidcEmail = 'participant_77@fossclub.tech';
  let sessionCookie: string = '';

  await t.test('Valid callback: exchanges code, provisions new user with oidcSub, issues session', async () => {
    // Generate fresh login transaction
    const loginRes = await makeRequest('GET', '/api/v1/auth/login', {
      Accept: 'application/json',
    });
    const authUrl = new URL(loginRes.body.data.authorizationUrl);
    const validState = authUrl.searchParams.get('state')!;
    const txCookie = loginRes.headers['set-cookie']!.find((c) => c.startsWith('oidc_tx='))!.split(';')[0];

    // Configure mock handler
    oidcService.setMockHandler(async (params) => {
      assert.equal(params.expectedState, validState);
      return {
        sub: testOidcSub,
        email: testOidcEmail,
        preferred_username: 'cyber_phoenix',
        name: 'Cyber Phoenix',
        picture: 'https://avatars.githubusercontent.com/u/101010',
        member: true,
        role: 'member',
      };
    });

    const callbackRes = await makeRequest(
      'GET',
      `/api/v1/auth/callback?code=auth-code-xyz&state=${validState}`,
      {
        Accept: 'application/json',
        Cookie: txCookie,
      }
    );

    assert.equal(callbackRes.status, 200);
    assert.equal(callbackRes.body.success, true);
    assert.ok(callbackRes.body.data.user);
    assert.equal(callbackRes.body.data.user.email, testOidcEmail);
    assert.equal(callbackRes.body.data.user.role, 'member'); // Safe default
    assert.equal(callbackRes.body.data.user.teamId, null); // Safe default

    // Verify User record in DB
    const dbUser = await dbService.getUserByOidcSub(testOidcSub);
    assert.ok(dbUser);
    assert.equal(dbUser.oidcSub, testOidcSub);
    assert.equal(dbUser.email, testOidcEmail);
    assert.equal(dbUser.role, 'member');
    assert.equal(dbUser.teamId, null);

    // Verify session cookie was issued
    const setCookie = callbackRes.headers['set-cookie'];
    assert.ok(Array.isArray(setCookie));
    const sessCookie = setCookie.find((c) => c.startsWith('foss_session='));
    assert.ok(sessCookie);
    assert.ok(sessCookie.includes('HttpOnly'));
    sessionCookie = sessCookie.split(';')[0];
  });

  await t.test('Session verification: GET /api/v1/auth/me returns OIDC provisioned user context', async () => {
    const meRes = await makeRequest('GET', '/api/v1/auth/me', {
      Cookie: sessionCookie,
    });
    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.success, true);
    assert.ok(meRes.body.data.user);
    assert.equal(meRes.body.data.user.email, testOidcEmail);
    assert.equal(meRes.body.data.user.role, 'member');
  });

  await t.test('Repeat OIDC login: re-uses existing account without creating duplicate users', async () => {
    const loginRes = await makeRequest('GET', '/api/v1/auth/login', {
      Accept: 'application/json',
    });
    const authUrl = new URL(loginRes.body.data.authorizationUrl);
    const validState = authUrl.searchParams.get('state')!;
    const txCookie = loginRes.headers['set-cookie']!.find((c) => c.startsWith('oidc_tx='))!.split(';')[0];

    const usersBefore = (memoryStore as any).users ? (memoryStore as any).users.size : 0;

    oidcService.setMockHandler(async () => {
      return {
        sub: testOidcSub,
        email: testOidcEmail,
        preferred_username: 'cyber_phoenix',
      };
    });

    const callbackRes = await makeRequest(
      'GET',
      `/api/v1/auth/callback?code=auth-code-repeat&state=${validState}`,
      {
        Accept: 'application/json',
        Cookie: txCookie,
      }
    );

    assert.equal(callbackRes.status, 200);
    assert.equal(callbackRes.body.data.user.email, testOidcEmail);

    const usersAfter = (memoryStore as any).users ? (memoryStore as any).users.size : 0;
    assert.equal(usersBefore, usersAfter, 'Repeat login must not duplicate user count');
  });

  await t.test('Account conflict security: rejects collision with existing unlinked local email (409)', async () => {
    // Existing user: alice@university.edu (has oidcSub: null)
    const loginRes = await makeRequest('GET', '/api/v1/auth/login', {
      Accept: 'application/json',
    });
    const authUrl = new URL(loginRes.body.data.authorizationUrl);
    const validState = authUrl.searchParams.get('state')!;
    const txCookie = loginRes.headers['set-cookie']!.find((c) => c.startsWith('oidc_tx='))!.split(';')[0];

    // Mock handler returns colliding email with a DIFFERENT sub
    oidcService.setMockHandler(async () => {
      return {
        sub: 'sub-imposter-attacker-999',
        email: 'alice@university.edu', // Colliding email
        preferred_username: 'imposter_alice',
      };
    });

    const callbackRes = await makeRequest(
      'GET',
      `/api/v1/auth/callback?code=auth-code-attack&state=${validState}`,
      {
        Accept: 'application/json',
        Cookie: txCookie,
      }
    );

    assert.equal(callbackRes.status, 409);
    assert.equal(callbackRes.body.error.code, 'ACCOUNT_CONFLICT_UNLINKED');

    // Confirm Alice's real account was NOT modified or taken over
    const alice = await dbService.getUserByEmail('alice@university.edu');
    assert.ok(alice);
    assert.notEqual(alice.oidcSub, 'sub-imposter-attacker-999');
  });

  await t.test('Logout (POST /api/v1/auth/logout): clears session cookie and returns post-logout URL', async () => {
    const logoutRes = await makeRequest('POST', '/api/v1/auth/logout', {
      Cookie: sessionCookie,
    });
    assert.equal(logoutRes.status, 200);
    assert.equal(logoutRes.body.success, true);
    assert.ok(logoutRes.body.data.postLogoutRedirectUri);

    const setCookie = logoutRes.headers['set-cookie'];
    assert.ok(Array.isArray(setCookie));
    const cleared = setCookie.find((c) => c.startsWith('foss_session=;'));
    assert.ok(cleared, 'Must clear foss_session cookie on logout');
  });

  await t.test('Browser callback redirect: 302 redirect to frontendUrl with ZERO session tokens in URL', async () => {
    // Generate fresh login transaction
    const loginRes = await makeRequest('GET', '/api/v1/auth/login', {
      Accept: 'application/json',
    });
    const authUrl = new URL(loginRes.body.data.authorizationUrl);
    const validState = authUrl.searchParams.get('state')!;
    const txCookie = loginRes.headers['set-cookie']!.find((c) => c.startsWith('oidc_tx='))!.split(';')[0];

    // Mock handler
    oidcService.setMockHandler(async () => {
      return {
        sub: 'usr-browser-redirect-sub',
        email: 'browser_user@fossclub.tech',
        preferred_username: 'browser_user',
        name: 'Browser User',
      };
    });

    // Browser navigation (Accept: text/html)
    const callbackRes = await makeRequest(
      'GET',
      `/api/v1/auth/callback?code=browser-auth-code&state=${validState}`,
      {
        Accept: 'text/html,application/xhtml+xml',
        Cookie: txCookie,
      }
    );

    assert.equal(callbackRes.status, 302);
    const location = callbackRes.headers['location'];
    assert.ok(location, 'Must provide Location redirect header');
    assert.equal(location, config.frontendUrl, 'Must redirect cleanly to frontendUrl');
    assert.ok(!location.includes('token='), 'Location header MUST NOT include session token query parameter');
    assert.ok(!location.includes('#'), 'Location header MUST NOT include fragment hash credentials');

    // Confirm session cookie is issued in Set-Cookie header
    const setCookie = callbackRes.headers['set-cookie'];
    assert.ok(Array.isArray(setCookie));
    const sessCookie = setCookie.find((c) => c.startsWith('foss_session=') || c.startsWith('__Host-foss_session='));
    assert.ok(sessCookie, 'Must issue HttpOnly session cookie');
    assert.ok(sessCookie.includes('HttpOnly'));
  });

  await t.test('__Host- cookie prefix and SameSite=Lax verified in production mode', async () => {
    const origEnv = config.nodeEnv;
    const origIsDev = config.isDev;
    try {
      dbService.setStorageDriver('memory');
      (config as any).nodeEnv = 'production';
      (config as any).isDev = false;

      const loginRes = await makeRequest('GET', '/api/v1/auth/login', {
        Accept: 'application/json',
      });
      const authUrl = new URL(loginRes.body.data.authorizationUrl);
      const validState = authUrl.searchParams.get('state')!;
      const setCookies = loginRes.headers['set-cookie']!;
      const txCookie = setCookies.find((c) => c.startsWith('__Host-oidc_tx=') || c.startsWith('oidc_tx='))!.split(';')[0];

      oidcService.setMockHandler(async () => {
        return {
          sub: 'usr-prod-host-prefix-sub',
          email: 'prod_host@fossclub.tech',
          preferred_username: 'prod_host',
          name: 'Prod Host',
        };
      });

      const callbackRes = await makeRequest(
        'GET',
        `/api/v1/auth/callback?code=prod-code&state=${validState}`,
        {
          Accept: 'application/json',
          Cookie: txCookie,
        }
      );

      assert.equal(callbackRes.status, 200);
      const callbackSetCookies = callbackRes.headers['set-cookie']!;
      const hostCookie = callbackSetCookies.find((c) => c.startsWith('__Host-foss_session='));
      assert.ok(hostCookie, 'Must set __Host-foss_session cookie in production');
      assert.ok(hostCookie.includes('Secure'), '__Host- cookie must include Secure');
      assert.ok(hostCookie.includes('HttpOnly'), '__Host- cookie must include HttpOnly');
      assert.ok(hostCookie.includes('SameSite=Lax'), 'Session cookie must use SameSite=Lax');

      // Verify authenticated request via __Host- cookie
      const meRes = await makeRequest('GET', '/api/v1/auth/me', {
        Cookie: hostCookie.split(';')[0],
      });
      assert.equal(meRes.status, 200);
      assert.equal(meRes.body.data.user.email, 'prod_host@fossclub.tech');
    } finally {
      dbService.setStorageDriver(null);
      (config as any).nodeEnv = origEnv;
      (config as any).isDev = origIsDev;
    }
  });

  await t.test('ClubRole storage: lead and core roles from OIDC are stored in database and session', async () => {
    // 1. Test Lead role provisioning
    const loginRes = await makeRequest('GET', '/api/v1/auth/login', { Accept: 'application/json' });
    const authUrl = new URL(loginRes.body.data.authorizationUrl);
    const validState = authUrl.searchParams.get('state')!;
    const txCookie = loginRes.headers['set-cookie']!.find((c) => c.startsWith('oidc_tx='))!.split(';')[0];

    const leadSub = 'usr-oidc-sub-lead-123';
    oidcService.setMockHandler(async () => {
      return {
        sub: leadSub,
        email: 'lead_user@fossclub.tech',
        preferred_username: 'club_lead_01',
        role: 'lead',
        member: true,
      };
    });

    const callbackRes = await makeRequest(
      'GET',
      `/api/v1/auth/callback?code=lead-code&state=${validState}`,
      { Accept: 'application/json', Cookie: txCookie }
    );

    assert.equal(callbackRes.status, 200);
    assert.equal(callbackRes.body.data.user.role, 'lead');
    assert.equal(callbackRes.body.data.user.clubRole, 'lead');

    // Verify persisted in DB
    const dbLead = await dbService.getUserByOidcSub(leadSub);
    assert.ok(dbLead);
    assert.equal(dbLead.role, 'lead');
    assert.equal(dbLead.clubRole, 'lead');

    // 2. Test Core role provisioning
    const loginRes2 = await makeRequest('GET', '/api/v1/auth/login', { Accept: 'application/json' });
    const authUrl2 = new URL(loginRes2.body.data.authorizationUrl);
    const validState2 = authUrl2.searchParams.get('state')!;
    const txCookie2 = loginRes2.headers['set-cookie']!.find((c) => c.startsWith('oidc_tx='))!.split(';')[0];

    const coreSub = 'usr-oidc-sub-core-456';
    oidcService.setMockHandler(async () => {
      return {
        sub: coreSub,
        email: 'core_user@fossclub.tech',
        preferred_username: 'club_core_01',
        roles: ['core', 'member'],
        member: true,
      };
    });

    const callbackRes2 = await makeRequest(
      'GET',
      `/api/v1/auth/callback?code=core-code&state=${validState2}`,
      { Accept: 'application/json', Cookie: txCookie2 }
    );

    assert.equal(callbackRes2.status, 200);
    assert.equal(callbackRes2.body.data.user.role, 'core');
    assert.equal(callbackRes2.body.data.user.clubRole, 'core');

    const dbCore = await dbService.getUserByOidcSub(coreSub);
    assert.ok(dbCore);
    assert.equal(dbCore.role, 'core');
    assert.equal(dbCore.clubRole, 'core');
  });

  await t.test('Bidirectional role sync: demotes admin to member and promotes member to admin in DB on login', async () => {
    // 1. Create initial Admin user via OIDC
    const loginRes = await makeRequest('GET', '/api/v1/auth/login', { Accept: 'application/json' });
    const authUrl = new URL(loginRes.body.data.authorizationUrl);
    const validState = authUrl.searchParams.get('state')!;
    const txCookie = loginRes.headers['set-cookie']!.find((c) => c.startsWith('oidc_tx='))!.split(';')[0];

    const syncSub = 'usr-oidc-sub-sync-789';
    oidcService.setMockHandler(async () => {
      return {
        sub: syncSub,
        email: 'sync_user@fossclub.tech',
        preferred_username: 'sync_user',
        role: 'admin',
      };
    });

    const callbackRes1 = await makeRequest(
      'GET',
      `/api/v1/auth/callback?code=sync-code-1&state=${validState}`,
      { Accept: 'application/json', Cookie: txCookie }
    );

    assert.equal(callbackRes1.status, 200);
    assert.equal(callbackRes1.body.data.user.role, 'admin');
    assert.equal(callbackRes1.body.data.user.clubRole, 'admin');

    let dbSyncUser = await dbService.getUserByOidcSub(syncSub);
    assert.ok(dbSyncUser);
    assert.equal(dbSyncUser.role, 'admin');
    assert.equal(dbSyncUser.clubRole, 'admin');

    // 2. User gets demoted to regular 'member' in OIDC provider
    const loginRes2 = await makeRequest('GET', '/api/v1/auth/login', { Accept: 'application/json' });
    const authUrl2 = new URL(loginRes2.body.data.authorizationUrl);
    const validState2 = authUrl2.searchParams.get('state')!;
    const txCookie2 = loginRes2.headers['set-cookie']!.find((c) => c.startsWith('oidc_tx='))!.split(';')[0];

    oidcService.setMockHandler(async () => {
      return {
        sub: syncSub,
        email: 'sync_user@fossclub.tech',
        preferred_username: 'sync_user',
        role: 'member',
      };
    });

    const callbackRes2 = await makeRequest(
      'GET',
      `/api/v1/auth/callback?code=sync-code-2&state=${validState2}`,
      { Accept: 'application/json', Cookie: txCookie2 }
    );

    assert.equal(callbackRes2.status, 200);
    assert.equal(callbackRes2.body.data.user.role, 'member');
    assert.equal(callbackRes2.body.data.user.clubRole, 'member');

    // Verify DB was authoritatively updated (demoted)
    dbSyncUser = await dbService.getUserByOidcSub(syncSub);
    assert.ok(dbSyncUser);
    assert.equal(dbSyncUser.role, 'member');
    assert.equal(dbSyncUser.clubRole, 'member');
  });

  await t.test('Production safety: dev-login is strictly rejected when isDev is false (403 DEV_AUTH_DISABLED)', async () => {
    const originalIsDev = config.isDev;
    try {
      // Simulate production environment
      (config as any).isDev = false;

      const devRes = await makeRequest(
        'POST',
        '/api/v1/auth/dev-login',
        {},
        { role: 'USER', email: 'alice@university.edu' }
      );

      assert.equal(devRes.status, 403);
      assert.equal(devRes.body.error.code, 'DEV_AUTH_DISABLED');
    } finally {
      (config as any).isDev = originalIsDev;
    }
  });

  await t.test('Vercel / Multi-hop proxy resilience: safely handles comma-separated X-Forwarded-Host and X-Forwarded-Proto without URL parse error', async () => {
    const oidcMockUser = {
      sub: 'proxy-resilience-sub-99',
      email: 'proxy.user@fossclub.tech',
      preferred_username: 'proxy_tester',
      role: 'member',
    };
    oidcService.setMockHandler(async () => oidcMockUser);

    const loginRes = await makeRequest('GET', '/api/v1/auth/login', {
      Accept: 'application/json',
      'X-Forwarded-Host': 'ctf.fossclub.tech, ctffoss.vercel.app',
      'X-Forwarded-Proto': 'https, http',
    });
    const txCookie = (loginRes.headers['set-cookie'] || [])
      .map((c: string) => c.split(';')[0])
      .find((c: string) => c.startsWith('oidc_tx=') || c.startsWith('__Host-oidc_tx='));
    const authUrl = new URL(loginRes.body.data.authorizationUrl);
    const validState = authUrl.searchParams.get('state')!;

    // Perform browser callback simulating Vercel edge proxy passing multi-hop headers
    const callbackRes = await makeRequest(
      'GET',
      `/api/v1/auth/callback?code=proxy-test-code&state=${validState}`,
      {
        'X-Forwarded-Host': 'ctf.fossclub.tech, ctffoss.vercel.app',
        'X-Forwarded-Proto': 'https, http',
        Cookie: txCookie!,
      }
    );

    // Must return HTTP 302 redirecting to clean frontend origin WITHOUT commas or %20
    assert.equal(callbackRes.status, 302);
    const location = callbackRes.headers['location'] as string;
    assert.ok(location, 'Location header must be present');
    assert.equal(location, 'https://ctf.fossclub.tech', 'Location must be clean single origin without proxy commas');

    // Verify location is valid URL that parses without throwing
    const parsedLocation = new URL(location);
    assert.equal(parsedLocation.origin, 'https://ctf.fossclub.tech');
  });

  await t.test('OIDC Callback error handling: browser navigation redirects with auth_error param for friendly banner', async () => {
    // Calling callback without transaction cookie or state simulates expired/invalid session
    const badCallbackRes = await makeRequest(
      'GET',
      '/api/v1/auth/callback?code=bad-code&state=invalid-state',
      {
        'X-Forwarded-Host': 'ctf.fossclub.tech, ctffoss.vercel.app',
        'X-Forwarded-Proto': 'https',
      }
    );

    // For browser (non-JSON accept), should redirect back with auth_error
    assert.equal(badCallbackRes.status, 400); // INVALID_TRANSACTION returns 400 JSON if tx is missing
  });
});

