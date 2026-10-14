import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app';
import { signToken } from '../src/utils/crypto';
import http from 'http';

let server: http.Server;
let baseUrl: string;

function makeRequest(
  method: string,
  path: string,
  headers: Record<string, string> = {},
  body?: any
): Promise<{ status: number; body: any }> {
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
          resolve({ status: res.statusCode || 500, body: parsed });
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
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
});

test('IDENTITY & TEAMS: Read-only team enforcement and trusted membership', async (t) => {
  // Test tokens
  const aliceToken = signToken({
    id: 'usr-alice-02',
    email: 'alice@university.edu',
    username: 'alice_sec',
    role: 'USER',
    teamId: 'team-binary-beasts',
  });

  const charlieNoTeamToken = signToken({
    id: 'usr-charlie-04',
    email: 'charlie@university.edu',
    username: 'charlie_solo',
    role: 'USER',
    teamId: null,
  });

  await t.test('Participant with a team receives trusted team context', async () => {
    const res = await makeRequest('GET', '/api/v1/auth/me', {
      Authorization: `Bearer ${aliceToken}`,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.username, 'alice_sec');
    assert.equal(res.body.data.team.name, 'Binary Beasts');
  });

  await t.test('Participant without a team receives clean null team context', async () => {
    const res = await makeRequest('GET', '/api/v1/auth/me', {
      Authorization: `Bearer ${charlieNoTeamToken}`,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.username, 'charlie_solo');
    assert.equal(res.body.data.team, null);
  });

  await t.test('Team information is read-only; no creation endpoint exists', async () => {
    const res = await makeRequest('POST', '/api/v1/teams', {
      Authorization: `Bearer ${aliceToken}`,
    }, { name: 'Attempted Fake Team' });
    // Should return 404 since route was removed
    assert.equal(res.status, 404);
  });

  await t.test('No team joining endpoint exists', async () => {
    const res = await makeRequest('POST', '/api/v1/teams/join', {
      Authorization: `Bearer ${charlieNoTeamToken}`,
    }, { inviteCode: 'SOMECODE' });
    assert.equal(res.status, 404);
  });

  await t.test('Participant without a team cannot access team-restricted endpoints', async () => {
    const res = await makeRequest('GET', '/api/v1/teams/me', {
      Authorization: `Bearer ${charlieNoTeamToken}`,
    });
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'NO_TEAM');
  });

  await t.test('Client cannot impersonate another team by passing client-side teamId', async () => {
    // Flag submission requires server-side trusted team from session token
    const res = await makeRequest('POST', '/api/v1/challenges/chal-dev-sample-1/submit', {
      Authorization: `Bearer ${charlieNoTeamToken}`,
    }, { flag: 'FOSSCTF{dev_verification_flag_2026}', teamId: 'team-binary-beasts' });
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'TEAM_REQUIRED');
  });
});

test('SHARED SESSIONS: Synchronized team timing across teammates', async (t) => {
  const aliceToken = signToken({
    id: 'usr-alice-02',
    email: 'alice@university.edu',
    username: 'alice_sec',
    role: 'USER',
    teamId: 'team-binary-beasts', // Team 1
  });

  const bobToken = signToken({
    id: 'usr-bob-03',
    email: 'bob@university.edu',
    username: 'bob_0x',
    role: 'USER',
    teamId: 'team-binary-beasts', // Also Team 1 (Alice's teammate!)
  });

  const daveToken = signToken({
    id: 'usr-dave-05',
    email: 'dave@university.edu',
    username: 'dave_bravo',
    role: 'USER',
    teamId: 'team-null-pointers', // Team 2 (Independent team!)
  });

  const timedChallengeId = 'chal-timed-sample-2';

  await t.test('Before starting, timed challenge session is NOT_STARTED', async () => {
    const res = await makeRequest('GET', `/api/v1/challenges/${timedChallengeId}/session`, {
      Authorization: `Bearer ${aliceToken}`,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'NOT_STARTED');
    assert.equal(res.body.data.remainingSeconds, null);
  });

  let initialStartedAt: string;
  let initialExpiresAt: string;

  await t.test('Alice starts the timed challenge; server records start and expiration', async () => {
    const res = await makeRequest('POST', `/api/v1/challenges/${timedChallengeId}/start`, {
      Authorization: `Bearer ${aliceToken}`,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'ACTIVE');
    assert.ok(res.body.data.startedAt);
    assert.ok(res.body.data.expiresAt);
    assert.ok(res.body.data.remainingSeconds > 0);

    initialStartedAt = res.body.data.startedAt;
    initialExpiresAt = res.body.data.expiresAt;
  });

  await t.test('Bob (Alice teammate) retrieves the exact same shared session', async () => {
    const res = await makeRequest('GET', `/api/v1/challenges/${timedChallengeId}/session`, {
      Authorization: `Bearer ${bobToken}`,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'ACTIVE');
    assert.equal(res.body.data.startedAt, initialStartedAt);
    assert.equal(res.body.data.expiresAt, initialExpiresAt);
  });

  await t.test('Bob attempting to start challenge again does NOT reset timer', async () => {
    const res = await makeRequest('POST', `/api/v1/challenges/${timedChallengeId}/start`, {
      Authorization: `Bearer ${bobToken}`,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.startedAt, initialStartedAt);
    assert.equal(res.body.data.expiresAt, initialExpiresAt);
  });

  await t.test('Dave (Team Bravo) receives an independent NOT_STARTED session', async () => {
    const res = await makeRequest('GET', `/api/v1/challenges/${timedChallengeId}/session`, {
      Authorization: `Bearer ${daveToken}`,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'NOT_STARTED');
    assert.equal(res.body.data.teamId, 'team-null-pointers');
  });

  await t.test('Untimed challenge allows normal solving without starting timer', async () => {
    const untimedId = 'chal-dev-sample-1';
    const res = await makeRequest('POST', `/api/v1/challenges/${untimedId}/submit`, {
      Authorization: `Bearer ${aliceToken}`,
    }, { flag: 'FOSSCTF{dev_verification_flag_2026}' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.isCorrect, true);
  });

  await t.test('Team solve is shared; Bob sees challenge as solved and duplicate solves are rejected', async () => {
    const untimedId = 'chal-dev-sample-1';
    // Bob attempts to solve the same challenge
    const res = await makeRequest('POST', `/api/v1/challenges/${untimedId}/submit`, {
      Authorization: `Bearer ${bobToken}`,
    }, { flag: 'FOSSCTF{dev_verification_flag_2026}' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'ALREADY_SOLVED');
  });

  await t.test('Scoreboard reflects single award of points to Team 1', async () => {
    const res = await makeRequest('GET', '/api/v1/scoreboard');
    assert.equal(res.status, 200);
    const entry = res.body.data.leaderboard.find((e: any) => e.teamId === 'team-binary-beasts');
    assert.ok(entry);
    assert.equal(entry.totalScore, 100);
    assert.equal(entry.solvesCount, 1);
  });
});
