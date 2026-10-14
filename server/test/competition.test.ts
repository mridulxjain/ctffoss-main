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

  await t.test('Concurrent start requests preserve a single session', async () => {
    const [res1, res2] = await Promise.all([
      makeRequest('POST', `/api/v1/challenges/${timedChallengeId}/start`, {
        Authorization: `Bearer ${aliceToken}`,
      }),
      makeRequest('POST', `/api/v1/challenges/${timedChallengeId}/start`, {
        Authorization: `Bearer ${bobToken}`,
      }),
    ]);
    assert.equal(res1.status, 200);
    assert.equal(res2.status, 200);
    assert.equal(res1.body.data.startedAt, res2.body.data.startedAt);
    assert.equal(res1.body.data.expiresAt, res2.body.data.expiresAt);
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

test('CHALLENGE ENGINE & ADMIN: Authoritative lifecycle, flag security, and access control', async (t) => {
  const adminToken = signToken({
    id: 'usr-admin-01',
    email: 'admin@fossclub.tech',
    username: 'foss_admin',
    role: 'ADMIN',
    teamId: null,
  });

  const aliceToken = signToken({
    id: 'usr-alice-02',
    email: 'alice@university.edu',
    username: 'alice_sec',
    role: 'USER',
    teamId: 'team-binary-beasts',
  });

  const bobToken = signToken({
    id: 'usr-bob-03',
    email: 'bob@university.edu',
    username: 'bob_0x',
    role: 'USER',
    teamId: 'team-binary-beasts',
  });

  const daveToken = signToken({
    id: 'usr-dave-05',
    email: 'dave@university.edu',
    username: 'dave_bravo',
    role: 'USER',
    teamId: 'team-null-pointers',
  });

  let createdChallengeId: string;
  const initialFlag = 'FOSSCTF{synthetic_test_flag_alpha_2026}';

  await t.test('Admin can create a draft challenge', async () => {
    const res = await makeRequest(
      'POST',
      '/api/v1/admin/challenges',
      { Authorization: `Bearer ${adminToken}` },
      {
        title: 'Buffer Overflow Simulation',
        description: 'Analyze the binary and craft a payload to overwrite the instruction pointer.',
        categoryId: 'cat-rev-4',
        difficulty: 'HARD',
        points: 200,
        flag: initialFlag,
        isPublished: false, // Draft
        isTimed: true,
        durationMinutes: 20,
        author: 'Security Admin',
      }
    );
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
    assert.equal(res.body.data.isPublished, false);
    assert.equal(res.body.data.isArchived, false);
    assert.equal(res.body.data.points, 200);
    assert.equal(res.body.data.hasFlag, true);
    assert.equal(res.body.data.flag, undefined);
    assert.equal(res.body.data.flagHash, undefined);

    createdChallengeId = res.body.data.id;
  });

  await t.test('Participant cannot create a challenge (403 Forbidden)', async () => {
    const res = await makeRequest(
      'POST',
      '/api/v1/admin/challenges',
      { Authorization: `Bearer ${aliceToken}` },
      {
        title: 'Malicious Injected Challenge',
        description: 'Unauthorized participant challenge creation.',
        categoryId: 'cat-rev-4',
        difficulty: 'EASY',
        points: 500,
        flag: 'FOSSCTF{unauthorized}',
      }
    );
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  await t.test('Unauthenticated client cannot create a challenge (401 Unauthorized)', async () => {
    const res = await makeRequest(
      'POST',
      '/api/v1/admin/challenges',
      {},
      {
        title: 'Unauthenticated Challenge',
        description: 'Missing credentials test.',
        categoryId: 'cat-rev-4',
        difficulty: 'EASY',
        points: 100,
        flag: 'FOSSCTF{no_auth}',
      }
    );
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
  });

  await t.test('Participants cannot retrieve draft details', async () => {
    const res = await makeRequest(
      'GET',
      `/api/v1/challenges/${createdChallengeId}`,
      { Authorization: `Bearer ${aliceToken}` }
    );
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'CHALLENGE_NOT_FOUND');
  });

  await t.test('Draft challenges do not appear in participant challenge listing', async () => {
    const res = await makeRequest(
      'GET',
      '/api/v1/challenges',
      { Authorization: `Bearer ${aliceToken}` }
    );
    assert.equal(res.status, 200);
    const found = res.body.data.challenges.find((c: any) => c.id === createdChallengeId);
    assert.equal(found, undefined);
  });

  await t.test('Invalid point values and durations are rejected', async () => {
    // Negative points
    const resNeg = await makeRequest(
      'POST',
      '/api/v1/admin/challenges',
      { Authorization: `Bearer ${adminToken}` },
      {
        title: 'Invalid Negative Points',
        description: 'Negative points verification.',
        categoryId: 'cat-rev-4',
        difficulty: 'EASY',
        points: -100,
        flag: 'FOSSCTF{fake}',
      }
    );
    assert.equal(resNeg.status, 400);

    // Zero points
    const resZero = await makeRequest(
      'POST',
      '/api/v1/admin/challenges',
      { Authorization: `Bearer ${adminToken}` },
      {
        title: 'Zero Points Challenge',
        description: 'Zero points verification.',
        categoryId: 'cat-rev-4',
        difficulty: 'EASY',
        points: 0,
        flag: 'FOSSCTF{fake}',
      }
    );
    assert.equal(resZero.status, 400);

    // Timed challenge with missing/zero duration
    const resTimedZero = await makeRequest(
      'POST',
      '/api/v1/admin/challenges',
      { Authorization: `Bearer ${adminToken}` },
      {
        title: 'Timed Zero Duration',
        description: 'Zero duration verification.',
        categoryId: 'cat-rev-4',
        difficulty: 'EASY',
        points: 100,
        isTimed: true,
        durationMinutes: 0,
        flag: 'FOSSCTF{fake}',
      }
    );
    assert.equal(resTimedZero.status, 400);
  });

  await t.test('Admin can edit metadata; participant cannot edit', async () => {
    // Participant edit attempt
    const resPart = await makeRequest(
      'PATCH',
      `/api/v1/admin/challenges/${createdChallengeId}`,
      { Authorization: `Bearer ${aliceToken}` },
      { points: 250 }
    );
    assert.equal(resPart.status, 403);

    // Admin edit
    const resAdmin = await makeRequest(
      'PATCH',
      `/api/v1/admin/challenges/${createdChallengeId}`,
      { Authorization: `Bearer ${adminToken}` },
      { points: 250, description: 'Updated buffer overflow analysis specification.' }
    );
    assert.equal(resAdmin.status, 200);
    assert.equal(resAdmin.body.data.points, 250);
  });

  await t.test('Admin can publish challenge; participant cannot publish', async () => {
    // Participant publish attempt
    const resPart = await makeRequest(
      'POST',
      `/api/v1/admin/challenges/${createdChallengeId}/publish`,
      { Authorization: `Bearer ${aliceToken}` }
    );
    assert.equal(resPart.status, 403);

    // Admin publish
    const resAdmin = await makeRequest(
      'POST',
      `/api/v1/admin/challenges/${createdChallengeId}/publish`,
      { Authorization: `Bearer ${adminToken}` }
    );
    assert.equal(resAdmin.status, 200);
    assert.equal(resAdmin.body.data.isPublished, true);

    // Now available to participants
    const resPartView = await makeRequest(
      'GET',
      `/api/v1/challenges/${createdChallengeId}`,
      { Authorization: `Bearer ${aliceToken}` }
    );
    assert.equal(resPartView.status, 200);
    assert.equal(resPartView.body.data.points, 250);
  });

  await t.test('Flag secrets are not exposed in participant responses or admin reviews', async () => {
    const resPart = await makeRequest(
      'GET',
      `/api/v1/challenges/${createdChallengeId}`,
      { Authorization: `Bearer ${aliceToken}` }
    );
    assert.equal(resPart.body.data.flag, undefined);
    assert.equal(resPart.body.data.flagHash, undefined);
    assert.equal(resPart.body.data.pepper, undefined);

    const resAdmin = await makeRequest(
      'GET',
      `/api/v1/admin/challenges/${createdChallengeId}`,
      { Authorization: `Bearer ${adminToken}` }
    );
    assert.equal(resAdmin.body.data.flag, undefined);
    assert.equal(resAdmin.body.data.flagHash, undefined);
    assert.equal(resAdmin.body.data.pepper, undefined);
    assert.equal(resAdmin.body.data.hasFlag, true);
  });

  await t.test('Incorrect flags do not award points', async () => {
    // Start session first since it is a timed challenge
    await makeRequest(
      'POST',
      `/api/v1/challenges/${createdChallengeId}/start`,
      { Authorization: `Bearer ${aliceToken}` }
    );

    const res = await makeRequest(
      'POST',
      `/api/v1/challenges/${createdChallengeId}/submit`,
      { Authorization: `Bearer ${aliceToken}` },
      { flag: 'FOSSCTF{totally_wrong_flag_guess}' }
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.data.isCorrect, false);
  });

  await t.test('Correct flag awards points once per team and updates scoreboard', async () => {
    const res = await makeRequest(
      'POST',
      `/api/v1/challenges/${createdChallengeId}/submit`,
      { Authorization: `Bearer ${aliceToken}` },
      { flag: initialFlag }
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.data.isCorrect, true);
    assert.equal(res.body.data.pointsAwarded, 250);

    // Scoreboard should now reflect 100 (from previous test) + 250 = 350
    const sbRes = await makeRequest('GET', '/api/v1/scoreboard');
    const teamEntry = sbRes.body.data.leaderboard.find((e: any) => e.teamId === 'team-binary-beasts');
    assert.equal(teamEntry.totalScore, 350);
    assert.equal(teamEntry.solvesCount, 2);
  });

  await t.test('Duplicate solve by teammate does not award additional points', async () => {
    const res = await makeRequest(
      'POST',
      `/api/v1/challenges/${createdChallengeId}/submit`,
      { Authorization: `Bearer ${bobToken}` },
      { flag: initialFlag }
    );
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'ALREADY_SOLVED');

    // Scoreboard remains 350
    const sbRes = await makeRequest('GET', '/api/v1/scoreboard');
    const teamEntry = sbRes.body.data.leaderboard.find((e: any) => e.teamId === 'team-binary-beasts');
    assert.equal(teamEntry.totalScore, 350);
  });

  await t.test('Historical solves survive flag rotation intact', async () => {
    // Admin updates flag
    const resFlag = await makeRequest(
      'POST',
      `/api/v1/admin/challenges/${createdChallengeId}/flags`,
      { Authorization: `Bearer ${adminToken}` },
      { flag: 'FOSSCTF{rotated_secret_flag_beta_2026}' }
    );
    assert.equal(resFlag.status, 200);

    // Team's historical solve is still intact
    const sbRes = await makeRequest('GET', '/api/v1/scoreboard');
    const teamEntry = sbRes.body.data.leaderboard.find((e: any) => e.teamId === 'team-binary-beasts');
    assert.equal(teamEntry.totalScore, 350);
    assert.equal(teamEntry.solvesCount, 2);
  });

  await t.test('Historical solves survive archiving and archived challenges reject submissions', async () => {
    // Admin archives challenge
    const resArch = await makeRequest(
      'POST',
      `/api/v1/admin/challenges/${createdChallengeId}/archive`,
      { Authorization: `Bearer ${adminToken}` }
    );
    assert.equal(resArch.status, 200);
    assert.equal(resArch.body.data.isArchived, true);

    // Team 1 still retains its points
    const sbRes = await makeRequest('GET', '/api/v1/scoreboard');
    const team1Entry = sbRes.body.data.leaderboard.find((e: any) => e.teamId === 'team-binary-beasts');
    assert.equal(team1Entry.totalScore, 350);

    // Dave (Team 2) attempts to submit to the archived challenge
    const resDave = await makeRequest(
      'POST',
      `/api/v1/challenges/${createdChallengeId}/submit`,
      { Authorization: `Bearer ${daveToken}` },
      { flag: 'FOSSCTF{rotated_secret_flag_beta_2026}' }
    );
    assert.equal(resDave.status, 400);
    assert.equal(resDave.body.error.code, 'CHALLENGE_ARCHIVED');
  });

  await t.test('Deleting challenge with existing solves is rejected (archive preferred)', async () => {
    const res = await makeRequest(
      'DELETE',
      `/api/v1/admin/challenges/${createdChallengeId}`,
      { Authorization: `Bearer ${adminToken}` }
    );
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'DELETE_REJECTED');
  });
});

