import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { app } from '../src/app';
import { dbService, memoryStore } from '../src/services/db.service';
import { config } from '../src/config/index';
import { DEV_TEAMS, DEV_PARTICIPANTS, DEV_ADMIN } from '../src/fixtures/devRoster';

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
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

test.before(async () => {
  // Ensure development storage is primed
  dbService.setStorageDriver('memory');
  await dbService.initStorage();
  await dbService.seedDevFixtures();

  server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('LOCAL DEV TEST SQUAD: 4 Fake Teams and 16 Participants Suite', async (t) => {
  // -----------------------------------------------------------------
  // 1. Fixture Verification in Active Storage
  // -----------------------------------------------------------------
  await t.test('All 4 dev teams exist in server storage with expected IDs', async () => {
    for (const dt of DEV_TEAMS) {
      const team = await dbService.getTeam(dt.id);
      assert.ok(team, `Team ${dt.id} must exist in storage`);
      assert.equal(team.name, dt.name);
      assert.equal(team.externalId, dt.externalId);
    }
  });

  await t.test('All 16 fake participants exist with correct team assignments', async () => {
    for (const dp of DEV_PARTICIPANTS) {
      const user = await dbService.getUser(dp.id);
      assert.ok(user, `User ${dp.id} must exist`);
      assert.equal(user.email, dp.email);
      assert.equal(user.username, dp.username);
      assert.equal(user.role, 'USER');
      assert.equal(user.teamId, dp.teamId, `User ${dp.id} must belong to team ${dp.teamId}`);
    }
  });

  // -----------------------------------------------------------------
  // 2. Dev Personas Listing Endpoint
  // -----------------------------------------------------------------
  await t.test('GET /api/v1/auth/dev-personas returns full fixture roster', async () => {
    const res = await makeRequest('GET', '/api/v1/auth/dev-personas');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.teams.length, 4);
    assert.equal(res.body.data.participants.length, 16);
    assert.equal(res.body.data.admin.email, 'admin@fossclub.tech');
  });

  // -----------------------------------------------------------------
  // 3. Dev Login & Server-side Role/Team Enforcement
  // -----------------------------------------------------------------
  await t.test('Fake participant can log in and receives authoritative team session', async () => {
    const res = await makeRequest('POST', '/api/v1/auth/dev-login', {}, {
      username: 'byte_bandit_1',
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.username, 'byte_bandit_1');
    assert.equal(res.body.data.user.email, 'byte1@example.test');
    assert.equal(res.body.data.user.role, 'USER');
    assert.equal(res.body.data.user.teamId, 'dev-team-byte-bandits');
    assert.equal(res.body.data.team.name, 'Byte Bandits');

    // Verify session cookie was set
    const setCookie = res.headers['set-cookie'];
    assert.ok(setCookie, 'foss_session cookie must be set');
    assert.ok(setCookie[0].includes('foss_session='));
  });

  await t.test('Client CANNOT spoof role or teamId during dev login', async () => {
    // Malicious attempt to elevate byte_bandit_2 to ADMIN and spoof teamId
    const res = await makeRequest('POST', '/api/v1/auth/dev-login', {}, {
      username: 'byte_bandit_2',
      role: 'ADMIN',
      teamId: 'dev-team-ctrl-alt-elite',
    });
    assert.equal(res.status, 200);
    // Role MUST remain USER, teamId MUST remain dev-team-byte-bandits
    assert.equal(res.body.data.user.role, 'USER', 'Role elevation attempt must be ignored');
    assert.equal(res.body.data.user.teamId, 'dev-team-byte-bandits', 'Team spoofing must be ignored');
  });

  await t.test('Unknown development account IDs are strictly rejected with 404', async () => {
    const res = await makeRequest('POST', '/api/v1/auth/dev-login', {}, {
      email: 'unregistered_hacker@example.com',
    });
    assert.equal(res.status, 404);
    assert.equal(res.body.error?.code, 'DEV_ACCOUNT_NOT_FOUND');
  });

  // -----------------------------------------------------------------
  // 4. Production Mode Protection
  // -----------------------------------------------------------------
  await t.test('Production mode refuses dev login and dev personas', async () => {
    const originalIsDev = config.isDev;
    const originalEnable = config.enableDevAuth;
    (config as any).isDev = false;
    (config as any).enableDevAuth = false;

    const personasRes = await makeRequest('GET', '/api/v1/auth/dev-personas');
    assert.equal(personasRes.status, 403);
    assert.equal(personasRes.body.error?.code, 'DEV_AUTH_DISABLED');

    const loginRes = await makeRequest('POST', '/api/v1/auth/dev-login', {}, {
      username: 'byte_bandit_1',
    });
    assert.equal(loginRes.status, 403);
    assert.equal(loginRes.body.error?.code, 'DEV_AUTH_DISABLED');

    (config as any).isDev = originalIsDev;
    (config as any).enableDevAuth = originalEnable;
  });

  await t.test('dbService.seedDevFixtures() refuses execution when NODE_ENV=production', async () => {
    const originalEnv = config.nodeEnv;
    const originalProcessEnv = process.env.NODE_ENV;
    (config as any).nodeEnv = 'production';
    process.env.NODE_ENV = 'production';

    let threw = false;
    try {
      await dbService.seedDevFixtures();
    } catch (err: any) {
      threw = true;
      assert.match(err.message, /Refusing to seed development fixtures in production mode/);
    } finally {
      (config as any).nodeEnv = originalEnv;
      process.env.NODE_ENV = originalProcessEnv;
    }

    assert.equal(threw, true, 'seedDevFixtures must throw in production mode');
  });

  // -----------------------------------------------------------------
  // 5. Challenge Solving, Team Scoring, and Scoreboard Synchronization
  // -----------------------------------------------------------------
  await t.test('Participant solves challenge, awarding points to team', async () => {
    // 1. Log in as byte_bandit_1
    const login1 = await makeRequest('POST', '/api/v1/auth/dev-login', {}, {
      username: 'byte_bandit_1',
    });
    const cookie1 = login1.headers['set-cookie']![0].split(';')[0];

    // Verify challenge listings load
    const chalRes = await makeRequest('GET', '/api/v1/challenges', { Cookie: cookie1 });
    assert.equal(chalRes.status, 200);
    assert.ok(Array.isArray(chalRes.body.data.challenges));

    // Ensure competition state is LIVE and challenge is unarchived
    await dbService.updateCompetitionConfig({ state: 'LIVE' });
    const devChal = memoryStore.challenges.find((c) => c.id === 'chal-dev-sample-1');
    const wasArchived = devChal?.isArchived;
    if (devChal) devChal.isArchived = false;

    // Submit valid flag for dev practice challenge
    const submitRes = await makeRequest(
      'POST',
      '/api/v1/challenges/chal-dev-sample-1/submit',
      { Cookie: cookie1 },
      { flag: 'FOSSCTF{dev_verification_flag_2026}' }
    );
    if (submitRes.status !== 200) {
      console.log('DEBUG submitRes:', submitRes.status, JSON.stringify(submitRes.body));
    }
    assert.equal(submitRes.status, 200);
    assert.equal(submitRes.body.data.isCorrect, true);
    assert.equal(submitRes.body.data.pointsAwarded, 100);

    if (devChal) devChal.isArchived = wasArchived ?? true;

    // Verify team score on scoreboard
    const scoreRes = await makeRequest('GET', '/api/v1/scoreboard');
    assert.equal(scoreRes.status, 200);
    const byteEntry = scoreRes.body.data.leaderboard.find(
      (e: any) => e.teamId === 'dev-team-byte-bandits'
    );
    assert.ok(byteEntry, 'Byte Bandits must appear on scoreboard');
    assert.equal(byteEntry.totalScore, 100);
  });

  await t.test('Teammate byte_bandit_2 sees synchronized team score and solve', async () => {
    const login2 = await makeRequest('POST', '/api/v1/auth/dev-login', {}, {
      username: 'byte_bandit_2',
    });
    const cookie2 = login2.headers['set-cookie']![0].split(';')[0];

    const myTeamRes = await makeRequest('GET', '/api/v1/teams/me', { Cookie: cookie2 });
    assert.equal(myTeamRes.status, 200);
    assert.equal(myTeamRes.body.data.name, 'Byte Bandits');
    assert.equal(myTeamRes.body.data.totalScore, 100);
    assert.equal(myTeamRes.body.data.solves.length, 1);
  });

  // -----------------------------------------------------------------
  // 6. Cross-Team Privacy & Authorization Isolation
  // -----------------------------------------------------------------
  await t.test('Participant from Segfault Society has isolated score of 0', async () => {
    const loginSeg = await makeRequest('POST', '/api/v1/auth/dev-login', {}, {
      username: 'segfault_1',
    });
    const cookieSeg = loginSeg.headers['set-cookie']![0].split(';')[0];

    const myTeamRes = await makeRequest('GET', '/api/v1/teams/me', { Cookie: cookieSeg });
    assert.equal(myTeamRes.status, 200);
    assert.equal(myTeamRes.body.data.name, 'Segfault Society');
    assert.equal(myTeamRes.body.data.totalScore, 0, 'Segfault Society score must be isolated at 0');
  });

  await t.test('Ordinary fake participant cannot access admin-only routes (403)', async () => {
    const loginSeg = await makeRequest('POST', '/api/v1/auth/dev-login', {}, {
      username: 'segfault_1',
    });
    const cookieSeg = loginSeg.headers['set-cookie']![0].split(';')[0];

    const adminTeamsRes = await makeRequest('GET', '/api/v1/admin/teams', { Cookie: cookieSeg });
    assert.equal(adminTeamsRes.status, 403);
  });

  await t.test('Platform admin can access admin routes', async () => {
    const loginAdmin = await makeRequest('POST', '/api/v1/auth/dev-login', {}, {
      role: 'ADMIN',
    });
    const cookieAdmin = loginAdmin.headers['set-cookie']![0].split(';')[0];

    const adminTeamsRes = await makeRequest('GET', '/api/v1/admin/teams', { Cookie: cookieAdmin });
    assert.equal(adminTeamsRes.status, 200);
    assert.ok(Array.isArray(adminTeamsRes.body.data));
  });

  t.after(async () => {
    dbService.setStorageDriver(null);
  });
});
