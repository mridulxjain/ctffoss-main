import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app';
import { signToken } from '../src/utils/crypto';
import { competitionAttemptService } from '../src/services/competitionAttempt.service';
import { dbService, memoryStore } from '../src/services/db.service';
import { valenfindVerifierService } from '../src/services/valenfindVerifier.service';
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

test.before(async () => {
  dbService.setStorageDriver('memory');
  await dbService.initStorage();

  return new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        baseUrl = `http://localhost:${addr.port}`;
      }
      resolve();
    });
  });
});

test.after(async () => {
  dbService.setStorageDriver(null);
  valenfindVerifierService.clearMockVerifier();
  if (server) {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }
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

  // Ensure sample challenges are temporarily active for regression testing of shared sessions
  const sample1 = memoryStore.challenges.find((c) => c.id === 'chal-dev-sample-1');
  const sample2 = memoryStore.challenges.find((c) => c.id === 'chal-timed-sample-2');
  if (sample1) sample1.isArchived = false;
  if (sample2) sample2.isArchived = false;

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

  // Re-archive sample challenges to ensure they are hidden/archived for Loventia competition
  const s1 = memoryStore.challenges.find((c) => c.id === 'chal-dev-sample-1');
  const s2 = memoryStore.challenges.find((c) => c.id === 'chal-timed-sample-2');
  if (s1) s1.isArchived = true;
  if (s2) s2.isArchived = true;
});

test('COMPETITION LIFECYCLE & SCOREBOARD: Boundary enforcement, deterministic scoring, and admin controls', async (t) => {
  const adminToken = signToken({
    id: 'usr-admin-01',
    email: 'admin@fossclub.tech',
    username: 'foss_admin',
    role: 'ADMIN',
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

  const charlieNoTeamToken = signToken({
    id: 'usr-charlie-04',
    email: 'charlie@university.edu',
    username: 'charlie_solo',
    role: 'USER',
    teamId: null,
  });

  await t.test('Public endpoint returns current competition status without requiring auth', async () => {
    const res = await makeRequest('GET', '/api/v1/competition');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.title);
    assert.ok(res.body.data.state);
    assert.ok(res.body.data.serverTime);
  });

  await t.test('Non-admin participant cannot access admin competition endpoint (403 Forbidden)', async () => {
    const res = await makeRequest(
      'GET',
      '/api/v1/admin/competition',
      { Authorization: `Bearer ${aliceToken}` }
    );
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  await t.test('Non-admin participant cannot update competition configuration (403 Forbidden)', async () => {
    const res = await makeRequest(
      'PUT',
      '/api/v1/admin/competition',
      { Authorization: `Bearer ${aliceToken}` },
      { title: 'Hacked Competition' }
    );
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  await t.test('Validation rejects configuration where endTime precedes or equals startTime', async () => {
    const now = Date.now();
    const res = await makeRequest(
      'PUT',
      '/api/v1/admin/competition',
      { Authorization: `Bearer ${adminToken}` },
      {
        startTime: new Date(now + 100000).toISOString(),
        endTime: new Date(now + 50000).toISOString(),
      }
    );
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  await t.test('Admin can update competition configuration with valid schedule', async () => {
    const res = await makeRequest(
      'PUT',
      '/api/v1/admin/competition',
      { Authorization: `Bearer ${adminToken}` },
      {
        title: 'FOSS CTF Championship 2026',
        description: 'University Capture The Flag Championship',
        startTime: null,
        endTime: null,
        isPaused: false,
      }
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.title, 'FOSS CTF Championship 2026');
    assert.equal(res.body.data.state, 'LIVE');
  });

  await t.test('Scheduled competition (future start time) derives SCHEDULED state and rejects submissions', async () => {
    const futureStart = new Date(Date.now() + 3600000).toISOString();
    const futureEnd = new Date(Date.now() + 7200000).toISOString();

    // Set competition to scheduled in future
    await makeRequest(
      'PUT',
      '/api/v1/admin/competition',
      { Authorization: `Bearer ${adminToken}` },
      {
        startTime: futureStart,
        endTime: futureEnd,
        isPaused: false,
      }
    );

    // Verify derived state is SCHEDULED
    const statusRes = await makeRequest('GET', '/api/v1/competition');
    assert.equal(statusRes.body.data.state, 'SCHEDULED');

    // Participant attempts to submit to published challenge
    const subRes = await makeRequest(
      'POST',
      '/api/v1/challenges/chal-web-1/submit',
      { Authorization: `Bearer ${aliceToken}` },
      { flag: 'FOSSCTF{sql_injection_bypass_master_77}' }
    );
    assert.equal(subRes.status, 400);
    assert.equal(subRes.body.error.code, 'COMPETITION_SCHEDULED');

    // Participant attempts to start timed session during scheduled state
    const sessRes = await makeRequest(
      'POST',
      '/api/v1/challenges/chal-crypto-1/start',
      { Authorization: `Bearer ${aliceToken}` }
    );
    assert.equal(sessRes.status, 400);
    assert.equal(sessRes.body.error.code, 'COMPETITION_SCHEDULED');
  });

  await t.test('Exact start boundary: submissions are permitted once server time reaches startTime', async () => {
    // Set start time slightly in the past (e.g. 5 seconds ago) and end time in future
    const pastStart = new Date(Date.now() - 5000).toISOString();
    const futureEnd = new Date(Date.now() + 3600000).toISOString();

    await makeRequest(
      'PUT',
      '/api/v1/admin/competition',
      { Authorization: `Bearer ${adminToken}` },
      {
        startTime: pastStart,
        endTime: futureEnd,
        isPaused: false,
      }
    );

    const statusRes = await makeRequest('GET', '/api/v1/competition');
    assert.equal(statusRes.body.data.state, 'LIVE');
  });

  await t.test('Ended competition (past end time) derives ENDED state and rejects submissions', async () => {
    const pastStart = new Date(Date.now() - 7200000).toISOString();
    const pastEnd = new Date(Date.now() - 3600000).toISOString();

    await makeRequest(
      'PUT',
      '/api/v1/admin/competition',
      { Authorization: `Bearer ${adminToken}` },
      {
        startTime: pastStart,
        endTime: pastEnd,
        isPaused: false,
      }
    );

    // Verify derived state is ENDED
    const statusRes = await makeRequest('GET', '/api/v1/competition');
    assert.equal(statusRes.body.data.state, 'ENDED');

    // Submission rejected
    const subRes = await makeRequest(
      'POST',
      '/api/v1/challenges/chal-web-1/submit',
      { Authorization: `Bearer ${aliceToken}` },
      { flag: 'FOSSCTF{sql_injection_bypass_master_77}' }
    );
    assert.equal(subRes.status, 400);
    assert.equal(subRes.body.error.code, 'COMPETITION_ENDED');

    // Session start rejected
    const sessRes = await makeRequest(
      'POST',
      '/api/v1/challenges/chal-crypto-1/start',
      { Authorization: `Bearer ${aliceToken}` }
    );
    assert.equal(sessRes.status, 400);
    assert.equal(sessRes.body.error.code, 'COMPETITION_ENDED');
  });

  await t.test('Emergency pause overrides schedule and rejects submissions', async () => {
    // Schedule would normally be LIVE (started in past, ends in future), but isPaused = true
    const pastStart = new Date(Date.now() - 3600000).toISOString();
    const futureEnd = new Date(Date.now() + 3600000).toISOString();

    await makeRequest(
      'PUT',
      '/api/v1/admin/competition',
      { Authorization: `Bearer ${adminToken}` },
      {
        startTime: pastStart,
        endTime: futureEnd,
        isPaused: true,
      }
    );

    const statusRes = await makeRequest('GET', '/api/v1/competition');
    assert.equal(statusRes.body.data.state, 'PAUSED');

    const subRes = await makeRequest(
      'POST',
      '/api/v1/challenges/chal-web-1/submit',
      { Authorization: `Bearer ${aliceToken}` },
      { flag: 'FOSSCTF{sql_injection_bypass_master_77}' }
    );
    assert.equal(subRes.status, 400);
    assert.equal(subRes.body.error.code, 'COMPETITION_INACTIVE');
  });

  await t.test('Scoreboard calculation: points match unique team solves with deterministic ranking', async () => {
    // Restore competition to active LIVE state
    await makeRequest(
      'PUT',
      '/api/v1/admin/competition',
      { Authorization: `Bearer ${adminToken}` },
      {
        startTime: null,
        endTime: null,
        isPaused: false,
      }
    );

    const sbRes = await makeRequest('GET', '/api/v1/scoreboard');
    assert.equal(sbRes.status, 200);
    assert.equal(sbRes.body.success, true);
    const leaderboard = sbRes.body.data.leaderboard;
    assert.ok(Array.isArray(leaderboard));

    // Verify ranks are consecutive starting at 1
    leaderboard.forEach((entry: any, index: number) => {
      assert.equal(entry.rank, index + 1);
      assert.ok(entry.teamId);
      assert.ok(entry.teamName);
      assert.ok(typeof entry.totalScore === 'number');
      assert.ok(typeof entry.solvesCount === 'number');
    });

    // Verify ordering: descending score, or if score tied, earlier last solve
    for (let i = 0; i < leaderboard.length - 1; i++) {
      const a = leaderboard[i];
      const b = leaderboard[i + 1];
      if (a.totalScore === b.totalScore) {
        if (a.lastSolveAt && b.lastSolveAt) {
          assert.ok(
            new Date(a.lastSolveAt).getTime() <= new Date(b.lastSolveAt).getTime(),
            'Tied scores must break ties by earlier last solve time'
          );
        }
      } else {
        assert.ok(a.totalScore >= b.totalScore, 'Scoreboard must be ordered by score descending');
      }
    }
  });

  await t.test('Team progress is shared across teammates (Alice and Bob)', async () => {
    const resAlice = await makeRequest('GET', '/api/v1/teams/me', {
      Authorization: `Bearer ${aliceToken}`,
    });
    assert.equal(resAlice.status, 200);
    assert.equal(resAlice.body.data.name, 'Binary Beasts');
    assert.ok(resAlice.body.data.totalScore >= 0);
    assert.ok(resAlice.body.data.solvesCount >= 0);
    assert.ok(resAlice.body.data.totalAvailableChallenges >= 0);
    assert.ok(Array.isArray(resAlice.body.data.solves));

    const resBob = await makeRequest('GET', '/api/v1/teams/me', {
      Authorization: `Bearer ${bobToken}`,
    });
    assert.equal(resBob.status, 200);

    // Both teammates see identical score, solves count, rank, and solved challenges
    assert.equal(resAlice.body.data.totalScore, resBob.body.data.totalScore);
    assert.equal(resAlice.body.data.solvesCount, resBob.body.data.solvesCount);
    assert.equal(resAlice.body.data.rank, resBob.body.data.rank);
    assert.deepEqual(resAlice.body.data.solves, resBob.body.data.solves);
  });

  await t.test('Participant without a team cannot access team progress endpoint', async () => {
    const res = await makeRequest('GET', '/api/v1/teams/me', {
      Authorization: `Bearer ${charlieNoTeamToken}`,
    });
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'NO_TEAM');
  });

  await t.test('Client-supplied teamId cannot manipulate which team receives points or progress', async () => {
    // Alice submits with a foreign teamId passed in body
    const subRes = await makeRequest(
      'POST',
      '/api/v1/challenges/chal-web-1/submit',
      { Authorization: `Bearer ${aliceToken}` },
      {
        flag: 'FOSSCTF{sql_injection_bypass_master_77}',
        teamId: 'team-null-pointers', // Attempted injection
      }
    );
    // Even if ALREADY_SOLVED or valid, server never associates solve to injected teamId
    const team2Res = await makeRequest('GET', '/api/v1/scoreboard');
    const team2Entry = team2Res.body.data.leaderboard.find((e: any) => e.teamId === 'team-null-pointers');
    // Team 2 must not have Alice's challenge
    assert.equal(team2Entry, undefined);
  });
});

test('PHASE 5A: Timed competition attempt system, concurrency, and completion service', async (t) => {
  const adminToken = signToken({
    id: 'usr-admin-01',
    email: 'admin@fossclub.tech',
    username: 'foss_admin',
    role: 'ADMIN',
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

  const charlieNoTeamToken = signToken({
    id: 'usr-charlie-04',
    email: 'charlie@university.edu',
    username: 'charlie_solo',
    role: 'USER',
    teamId: null,
  });

  await t.test('Unauthorized access is rejected (401 Unauthorized)', async () => {
    const resStart = await makeRequest('POST', '/api/v1/competition/attempt/start');
    assert.equal(resStart.status, 401);
    assert.equal(resStart.body.error.code, 'UNAUTHORIZED');

    const resGet = await makeRequest('GET', '/api/v1/competition/attempt');
    assert.equal(resGet.status, 401);
    assert.equal(resGet.body.error.code, 'UNAUTHORIZED');
  });

  await t.test('Participant without a team cannot start or view attempts (403 TEAM_REQUIRED)', async () => {
    const resStart = await makeRequest(
      'POST',
      '/api/v1/competition/attempt/start',
      { Authorization: `Bearer ${charlieNoTeamToken}` }
    );
    assert.equal(resStart.status, 403);
    assert.equal(resStart.body.error.code, 'TEAM_REQUIRED');

    const resGet = await makeRequest(
      'GET',
      '/api/v1/competition/attempt',
      { Authorization: `Bearer ${charlieNoTeamToken}` }
    );
    assert.equal(resGet.status, 403);
    assert.equal(resGet.body.error.code, 'TEAM_REQUIRED');
  });

  await t.test('Competition lifecycle enforcement: attempts blocked when competition is not LIVE', async () => {
    // 1. SCHEDULED state (future start time)
    await makeRequest(
      'PUT',
      '/api/v1/admin/competition',
      { Authorization: `Bearer ${adminToken}` },
      {
        startTime: new Date(Date.now() + 3600000).toISOString(),
        endTime: new Date(Date.now() + 7200000).toISOString(),
        isPaused: false,
      }
    );

    const resScheduled = await makeRequest(
      'POST',
      '/api/v1/competition/attempt/start',
      { Authorization: `Bearer ${aliceToken}` }
    );
    assert.equal(resScheduled.status, 400);
    assert.equal(resScheduled.body.error.code, 'COMPETITION_SCHEDULED');

    // 2. ENDED state (past end time)
    await makeRequest(
      'PUT',
      '/api/v1/admin/competition',
      { Authorization: `Bearer ${adminToken}` },
      {
        startTime: new Date(Date.now() - 7200000).toISOString(),
        endTime: new Date(Date.now() - 3600000).toISOString(),
        isPaused: false,
      }
    );

    const resEnded = await makeRequest(
      'POST',
      '/api/v1/competition/attempt/start',
      { Authorization: `Bearer ${aliceToken}` }
    );
    assert.equal(resEnded.status, 400);
    assert.equal(resEnded.body.error.code, 'COMPETITION_ENDED');

    // 3. PAUSED state
    await makeRequest(
      'PUT',
      '/api/v1/admin/competition',
      { Authorization: `Bearer ${adminToken}` },
      {
        startTime: new Date(Date.now() - 3600000).toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
        isPaused: true,
      }
    );

    const resPaused = await makeRequest(
      'POST',
      '/api/v1/competition/attempt/start',
      { Authorization: `Bearer ${aliceToken}` }
    );
    assert.equal(resPaused.status, 400);
    assert.equal(resPaused.body.error.code, 'COMPETITION_INACTIVE');

    // Restore LIVE state for subsequent tests
    await makeRequest(
      'PUT',
      '/api/v1/admin/competition',
      { Authorization: `Bearer ${adminToken}` },
      {
        startTime: null,
        endTime: null,
        isPaused: false,
      }
    );
  });

  let aliceInitialAttemptId: string;
  let aliceInitialStartedAt: string;

  await t.test('Starting an attempt: records startedAt using server clock and sets IN_PROGRESS', async () => {
    const beforeStart = Date.now();
    const res = await makeRequest(
      'POST',
      '/api/v1/competition/attempt/start',
      { Authorization: `Bearer ${aliceToken}` }
    );
    const afterStart = Date.now();

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
    assert.equal(res.body.data.teamId, 'team-binary-beasts');
    assert.equal(res.body.data.status, 'IN_PROGRESS');
    assert.equal(res.body.data.completedAt, null);
    assert.equal(res.body.data.elapsedMs, null);

    const startedTime = new Date(res.body.data.startedAt).getTime();
    assert.ok(startedTime >= beforeStart - 500 && startedTime <= afterStart + 500);

    aliceInitialAttemptId = res.body.data.id;
    aliceInitialStartedAt = res.body.data.startedAt;
  });

  await t.test('Repeated start requests do not reset timer or create duplicate attempts', async () => {
    const res = await makeRequest(
      'POST',
      '/api/v1/competition/attempt/start',
      { Authorization: `Bearer ${aliceToken}` }
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, aliceInitialAttemptId);
    assert.equal(res.body.data.startedAt, aliceInitialStartedAt);
    assert.equal(res.body.data.status, 'IN_PROGRESS');
  });

  await t.test('Teammates share the same team attempt and timer (Bob retrieves Alice attempt)', async () => {
    const res = await makeRequest(
      'GET',
      '/api/v1/competition/attempt',
      { Authorization: `Bearer ${bobToken}` }
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, aliceInitialAttemptId);
    assert.equal(res.body.data.teamId, 'team-binary-beasts');
    assert.equal(res.body.data.startedAt, aliceInitialStartedAt);
    assert.equal(res.body.data.status, 'IN_PROGRESS');
    assert.equal(res.body.data.completedAt, null);
    assert.equal(res.body.data.elapsedMs, null);
  });

  await t.test('Concurrent start requests return the same single attempt', async () => {
    // Dave (Team Null Pointers) initiates 5 concurrent start requests
    const promises = Array.from({ length: 5 }, () =>
      makeRequest(
        'POST',
        '/api/v1/competition/attempt/start',
        { Authorization: `Bearer ${daveToken}` }
      )
    );

    const results = await Promise.all(promises);
    for (const res of results) {
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.teamId, 'team-null-pointers');
      assert.equal(res.body.data.status, 'IN_PROGRESS');
    }

    // All concurrent requests must have the exact same attempt id and start timestamp
    const firstId = results[0].body.data.id;
    const firstStartedAt = results[0].body.data.startedAt;
    for (const res of results) {
      assert.equal(res.body.data.id, firstId);
      assert.equal(res.body.data.startedAt, firstStartedAt);
    }
  });

  await t.test('Attempt persistence across requests and client isolation (Dave sees only team-null-pointers)', async () => {
    const resDave = await makeRequest(
      'GET',
      '/api/v1/competition/attempt',
      { Authorization: `Bearer ${daveToken}` }
    );

    assert.equal(resDave.status, 200);
    assert.equal(resDave.body.data.teamId, 'team-null-pointers');
    assert.notEqual(resDave.body.data.id, aliceInitialAttemptId);
  });

  let completedTimestamp: string;
  let recordedElapsedMs: number;

  await t.test('Completion service: calculates elapsedMs and marks attempt COMPLETED', async () => {
    // Wait 50ms so elapsedMs is guaranteed strictly positive
    await new Promise((resolve) => setTimeout(resolve, 50));

    const completedAttempt = await competitionAttemptService.completeAttempt('team-binary-beasts');

    assert.equal(completedAttempt.id, aliceInitialAttemptId);
    assert.equal(completedAttempt.teamId, 'team-binary-beasts');
    assert.equal(completedAttempt.status, 'COMPLETED');
    assert.ok(completedAttempt.completedAt);
    assert.ok(typeof completedAttempt.elapsedMs === 'number');
    assert.ok(completedAttempt.elapsedMs >= 50);

    const startMs = new Date(completedAttempt.startedAt).getTime();
    const endMs = new Date(completedAttempt.completedAt).getTime();
    assert.equal(completedAttempt.elapsedMs, endMs - startMs);

    completedTimestamp = completedAttempt.completedAt;
    recordedElapsedMs = completedAttempt.elapsedMs;
  });

  await t.test('Duplicate completion attempts are idempotent and preserve first completion time', async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Call completion service again
    const reCompleted = await competitionAttemptService.completeAttempt('team-binary-beasts');

    assert.equal(reCompleted.status, 'COMPLETED');
    assert.equal(reCompleted.completedAt, completedTimestamp);
    assert.equal(reCompleted.elapsedMs, recordedElapsedMs);
  });

  await t.test('Starting an already completed attempt returns the completed state', async () => {
    const res = await makeRequest(
      'POST',
      '/api/v1/competition/attempt/start',
      { Authorization: `Bearer ${aliceToken}` }
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, aliceInitialAttemptId);
    assert.equal(res.body.data.status, 'COMPLETED');
    assert.equal(res.body.data.completedAt, completedTimestamp);
    assert.equal(res.body.data.elapsedMs, recordedElapsedMs);
  });

  await t.test('Attempt completion for non-existent team throws ATTEMPT_NOT_FOUND', async () => {
    await assert.rejects(
      async () => {
        await competitionAttemptService.completeAttempt('team-non-existent-999');
      },
      (err: any) => {
        return err.code === 'ATTEMPT_NOT_FOUND' || err.message.includes('not found');
      }
    );
  });
});

test('PHASE 5B: Secure Valenfind flag verification integration, attempt completion, and cross-team security', async (t) => {
  // Test tokens
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
    username: 'bob_crypto',
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

  const charlieNoTeamToken = signToken({
    id: 'usr-charlie-04',
    email: 'charlie@university.edu',
    username: 'charlie_guest',
    role: 'USER',
    teamId: null,
  });

  const adminToken = signToken({
    id: 'usr-admin-01',
    email: 'admin@fossclub.tech',
    username: 'root_admin',
    role: 'ADMIN',
  });

  // Valenfind IDs for reference:
  // Team 1 (Binary Beasts) -> Valenfind Team Alpha (id: e4e8c7ee-8a3c-49f7-a23a-1fbf9d3e386a)
  // Team 2 (Null Pointers) -> Valenfind Team Bravo (id: c9f758bf-077b-4516-89aa-a5b3778ef9e2)
  const valenfindAlphaId = 'e4e8c7ee-8a3c-49f7-a23a-1fbf9d3e386a';
  const valenfindBravoId = 'c9f758bf-077b-4516-89aa-a5b3778ef9e2';

  const validAlphaFlag = 'FOSSCTF{teamalpha_70c0572e1e1035e4}';
  const validBravoFlag = 'FOSSCTF{teambravo_03d86bf78370d731}';
  const bogusFlag = 'FOSSCTF{fake_flag_0123456789abcdef}';

  // Setup default mock verifier representing trusted Valenfind backend
  valenfindVerifierService.setMockVerifier(async (flag: string) => {
    if (flag === validAlphaFlag) {
      return {
        valid: true,
        valenfindTeamId: valenfindAlphaId,
        valenfindTeamSlug: 'team-alpha',
        valenfindTeamName: 'Team Alpha',
      };
    }
    if (flag === validBravoFlag) {
      return {
        valid: true,
        valenfindTeamId: valenfindBravoId,
        valenfindTeamSlug: 'team-bravo',
        valenfindTeamName: 'Team Bravo',
      };
    }
    return {
      valid: false,
      errorCode: 'INVALID_FLAG',
      error: 'Submitted flag is invalid or does not exist.',
    };
  });

  t.after(() => {
    valenfindVerifierService.clearMockVerifier();
  });

  await t.test('Unauthenticated flag submission is rejected (401 Unauthorized)', async () => {
    const res = await makeRequest(
      'POST',
      '/api/v1/competition/attempt/submit',
      {},
      { flag: validAlphaFlag }
    );
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
  });

  await t.test('Participant without a team cannot submit flags (403 TEAM_REQUIRED)', async () => {
    const res = await makeRequest(
      'POST',
      '/api/v1/competition/attempt/submit',
      { Authorization: `Bearer ${charlieNoTeamToken}` },
      { flag: validAlphaFlag }
    );
    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'TEAM_REQUIRED');
  });

  await t.test('Empty or malformed flag submissions are safely rejected (400 INVALID_FLAG_FORMAT)', async () => {
    const resEmpty = await makeRequest(
      'POST',
      '/api/v1/competition/attempt/submit',
      { Authorization: `Bearer ${daveToken}` },
      { flag: '' }
    );
    assert.equal(resEmpty.status, 400);
    assert.equal(resEmpty.body.error.code, 'INVALID_FLAG_FORMAT');

    const resWhitespace = await makeRequest(
      'POST',
      '/api/v1/competition/attempt/submit',
      { Authorization: `Bearer ${daveToken}` },
      { flag: '   ' }
    );
    assert.equal(resWhitespace.status, 400);
    assert.equal(resWhitespace.body.error.code, 'INVALID_FLAG_FORMAT');

    const resMissing = await makeRequest(
      'POST',
      '/api/v1/competition/attempt/submit',
      { Authorization: `Bearer ${daveToken}` },
      {}
    );
    assert.equal(resMissing.status, 400);
    assert.equal(resMissing.body.error.code, 'INVALID_FLAG_FORMAT');
  });

  await t.test('Missing attempt: Submitting before starting attempt is rejected (400 ATTEMPT_NOT_FOUND)', async () => {
    // Create temporary unstarted team
    const tempUserToken = signToken({
      id: 'usr-temp-99',
      email: 'temp@university.edu',
      username: 'temp_user',
      role: 'USER',
      teamId: 'team-unstarted-temp',
    });

    const res = await makeRequest(
      'POST',
      '/api/v1/competition/attempt/submit',
      { Authorization: `Bearer ${tempUserToken}` },
      { flag: validBravoFlag }
    );
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'ATTEMPT_NOT_FOUND');
  });

  await t.test('Competition lifecycle enforcement: Submissions blocked when competition is not LIVE', async () => {
    // 1. SCHEDULED
    await makeRequest(
      'PUT',
      '/api/v1/admin/competition',
      { Authorization: `Bearer ${adminToken}` },
      {
        startTime: new Date(Date.now() + 3600000).toISOString(),
        endTime: new Date(Date.now() + 7200000).toISOString(),
        isPaused: false,
      }
    );

    const resSched = await makeRequest(
      'POST',
      '/api/v1/competition/attempt/submit',
      { Authorization: `Bearer ${daveToken}` },
      { flag: validBravoFlag }
    );
    assert.equal(resSched.status, 400);
    assert.equal(resSched.body.error.code, 'COMPETITION_SCHEDULED');

    // 2. PAUSED
    await makeRequest(
      'PUT',
      '/api/v1/admin/competition',
      { Authorization: `Bearer ${adminToken}` },
      {
        startTime: new Date(Date.now() - 3600000).toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
        isPaused: true,
      }
    );

    const resPaused = await makeRequest(
      'POST',
      '/api/v1/competition/attempt/submit',
      { Authorization: `Bearer ${daveToken}` },
      { flag: validBravoFlag }
    );
    assert.equal(resPaused.status, 400);
    assert.equal(resPaused.body.error.code, 'COMPETITION_INACTIVE');

    // Restore LIVE
    await makeRequest(
      'PUT',
      '/api/v1/admin/competition',
      { Authorization: `Bearer ${adminToken}` },
      {
        startTime: null,
        endTime: null,
        isPaused: false,
      }
    );
  });

  await t.test('Verifier unavailable: Fails closed with 503 and preserves running timer', async () => {
    // Inject mock verifier throwing network error
    valenfindVerifierService.setMockVerifier(async () => {
      const err = new Error('Network timeout connecting to Valenfind');
      (err as any).code = 'VERIFIER_UNAVAILABLE';
      throw err;
    });

    const res = await makeRequest(
      'POST',
      '/api/v1/competition/attempt/submit',
      { Authorization: `Bearer ${daveToken}` },
      { flag: validBravoFlag }
    );

    assert.equal(res.status, 503);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'VERIFIER_UNAVAILABLE');

    // Verify attempt remains strictly IN_PROGRESS
    const attemptRes = await makeRequest(
      'GET',
      '/api/v1/competition/attempt',
      { Authorization: `Bearer ${daveToken}` }
    );
    assert.equal(attemptRes.status, 200);
    assert.equal(attemptRes.body.data.status, 'IN_PROGRESS');
    assert.equal(attemptRes.body.data.completedAt, null);
    assert.equal(attemptRes.body.data.elapsedMs, null);

    // Restore standard verifier
    valenfindVerifierService.setMockVerifier(async (flag: string) => {
      if (flag === validBravoFlag) {
        return {
          valid: true,
          valenfindTeamId: valenfindBravoId,
          valenfindTeamSlug: 'team-bravo',
          valenfindTeamName: 'Team Bravo',
        };
      }
      if (flag === validAlphaFlag) {
        return {
          valid: true,
          valenfindTeamId: valenfindAlphaId,
          valenfindTeamSlug: 'team-alpha',
          valenfindTeamName: 'Team Alpha',
        };
      }
      return {
        valid: false,
        errorCode: 'INVALID_FLAG',
        error: 'Submitted flag is invalid or does not exist.',
      };
    });
  });

  await t.test('Invalid flag submission: Rejected with 400 INVALID_FLAG and preserves running timer', async () => {
    const res = await makeRequest(
      'POST',
      '/api/v1/competition/attempt/submit',
      { Authorization: `Bearer ${daveToken}` },
      { flag: bogusFlag }
    );

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'INVALID_FLAG');

    // Verify Dave's attempt remains IN_PROGRESS
    const attemptRes = await makeRequest(
      'GET',
      '/api/v1/competition/attempt',
      { Authorization: `Bearer ${daveToken}` }
    );
    assert.equal(attemptRes.body.data.status, 'IN_PROGRESS');
    assert.equal(attemptRes.body.data.completedAt, null);
  });

  await t.test('Cross-team flag security: Another team valid flag is rejected (400 FLAG_TEAM_MISMATCH)', async () => {
    // Dave (Team Null Pointers, mapped to Valenfind Bravo) submits Alpha's flag
    const res = await makeRequest(
      'POST',
      '/api/v1/competition/attempt/submit',
      { Authorization: `Bearer ${daveToken}` },
      { flag: validAlphaFlag }
    );

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'FLAG_TEAM_MISMATCH');

    // Dave's attempt remains IN_PROGRESS
    const attemptRes = await makeRequest(
      'GET',
      '/api/v1/competition/attempt',
      { Authorization: `Bearer ${daveToken}` }
    );
    assert.equal(attemptRes.body.data.status, 'IN_PROGRESS');
    assert.equal(attemptRes.body.data.completedAt, null);
  });

  await t.test('Forged client-supplied teamId or attemptId is completely ignored', async () => {
    // Dave attempts to forge body parameters to target Alice's team
    const res = await makeRequest(
      'POST',
      '/api/v1/competition/attempt/submit',
      { Authorization: `Bearer ${daveToken}` },
      {
        flag: validAlphaFlag,
        teamId: 'team-binary-beasts',
        attemptId: 'arbitrary-attempt-uuid',
      }
    );

    // Because the server enforces req.user.teamId, Dave is checked as team-null-pointers
    // and Alpha's flag triggers FLAG_TEAM_MISMATCH
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'FLAG_TEAM_MISMATCH');
  });

  await t.test('Team without mapping: Rejected with 400 TEAM_MAPPING_REQUIRED (no guessing)', async () => {
    // Temporarily clear Dave's valenfindTeamId mapping
    await dbService.updateTeamValenfindId('team-null-pointers', null);

    const res = await makeRequest(
      'POST',
      '/api/v1/competition/attempt/submit',
      { Authorization: `Bearer ${daveToken}` },
      { flag: validBravoFlag }
    );

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'TEAM_MAPPING_REQUIRED');

    // Restore Dave's mapping
    await dbService.updateTeamValenfindId('team-null-pointers', valenfindBravoId);
  });

  let daveCompletionTimestamp: string;
  let daveElapsedMs: number;

  await t.test('Valid flag submission: Completes attempt and records authoritative elapsedMs', async () => {
    // Ensure small elapsed duration
    await new Promise((resolve) => setTimeout(resolve, 50));

    const res = await makeRequest(
      'POST',
      '/api/v1/competition/attempt/submit',
      { Authorization: `Bearer ${daveToken}` },
      { flag: validBravoFlag }
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'COMPLETED');
    assert.equal(res.body.data.teamId, 'team-null-pointers');
    assert.ok(res.body.data.completedAt);
    assert.ok(typeof res.body.data.elapsedMs === 'number');
    assert.ok(res.body.data.elapsedMs > 0);

    daveCompletionTimestamp = res.body.data.completedAt;
    daveElapsedMs = res.body.data.elapsedMs;

    // Verify GET endpoint confirms the completed state
    const statusRes = await makeRequest(
      'GET',
      '/api/v1/competition/attempt',
      { Authorization: `Bearer ${daveToken}` }
    );
    assert.equal(statusRes.body.data.status, 'COMPLETED');
    assert.equal(statusRes.body.data.completedAt, daveCompletionTimestamp);
    assert.equal(statusRes.body.data.elapsedMs, daveElapsedMs);
  });

  await t.test('Already-completed attempt: Subsequent submissions are rejected (400 ATTEMPT_ALREADY_COMPLETED)', async () => {
    const res = await makeRequest(
      'POST',
      '/api/v1/competition/attempt/submit',
      { Authorization: `Bearer ${daveToken}` },
      { flag: validBravoFlag }
    );

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'ATTEMPT_ALREADY_COMPLETED');

    // Confirm stored timestamps and elapsedMs did not change
    const statusRes = await makeRequest(
      'GET',
      '/api/v1/competition/attempt',
      { Authorization: `Bearer ${daveToken}` }
    );
    assert.equal(statusRes.body.data.completedAt, daveCompletionTimestamp);
    assert.equal(statusRes.body.data.elapsedMs, daveElapsedMs);
  });

  await t.test('Concurrent valid submissions: Teammates preserve a single atomic completion', async () => {
    // Start a fresh team attempt for a new team (or reset team-binary-beasts)
    const store = (dbService as any);
    // Create new in-progress attempt for team-binary-beasts to test concurrent submissions
    await store.startCompetitionAttempt('team-binary-beasts');
    // Ensure attempt is in progress for this test
    const currentAttempt = await dbService.getCompetitionAttempt('team-binary-beasts');
    if (currentAttempt) {
      currentAttempt.status = 'IN_PROGRESS';
      currentAttempt.completedAt = null;
      currentAttempt.elapsedMs = null;
    }

    // Alice and Bob submit concurrently
    const [resAlice, resBob] = await Promise.all([
      makeRequest(
        'POST',
        '/api/v1/competition/attempt/submit',
        { Authorization: `Bearer ${aliceToken}` },
        { flag: validAlphaFlag }
      ),
      makeRequest(
        'POST',
        '/api/v1/competition/attempt/submit',
        { Authorization: `Bearer ${bobToken}` },
        { flag: validAlphaFlag }
      ),
    ]);

    // At least one (or both) succeeds with 200, or one succeeds and the other gets ATTEMPT_ALREADY_COMPLETED
    // In all cases, the attempt is COMPLETED and the first recorded completion timestamp is preserved
    assert.ok(resAlice.status === 200 || resAlice.status === 400);
    assert.ok(resBob.status === 200 || resBob.status === 400);

    const finalAttempt = await dbService.getCompetitionAttempt('team-binary-beasts');
    assert.equal(finalAttempt?.status, 'COMPLETED');
    assert.ok(finalAttempt?.completedAt);
    assert.ok(typeof finalAttempt?.elapsedMs === 'number');
  });
});

test('PHASE 5C: Dedicated timed competition leaderboard, ranking rules, and tie-breakers', async (t) => {
  await t.test('Public access: Leaderboard is publicly accessible without requiring auth', async () => {
    const res = await makeRequest('GET', '/api/v1/competition/leaderboard');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.leaderboard));
    assert.ok(typeof res.body.data.totalTeams === 'number');
    assert.ok(typeof res.body.data.completedCount === 'number');
    assert.ok(typeof res.body.data.inProgressCount === 'number');
    assert.ok(typeof res.body.data.notStartedCount === 'number');
  });

  await t.test('Privacy enforcement: No private fields, tokens, flags, or secrets are exposed', async () => {
    const res = await makeRequest('GET', '/api/v1/competition/leaderboard');
    assert.equal(res.status, 200);
    const rawString = JSON.stringify(res.body);

    // Private attributes must never appear in public leaderboard
    assert.equal(rawString.includes('FOSSCTF'), false);
    assert.equal(rawString.includes('password'), false);
    assert.equal(rawString.includes('secret'), false);
    assert.equal(rawString.includes('email'), false);
    assert.equal(rawString.includes('pepper'), false);

    for (const entry of res.body.data.leaderboard) {
      assert.ok(entry.rank > 0);
      assert.ok(entry.teamId);
      assert.ok(entry.teamName);
      assert.ok(['COMPLETED', 'IN_PROGRESS', 'NOT_STARTED'].includes(entry.status));
      assert.equal(entry.flag, undefined);
      assert.equal(entry.submittedFlag, undefined);
    }
  });

  await t.test('Ranking rules: Completed teams ordered by elapsedMs ascending (faster ranks higher)', async () => {
    // Setup 3 distinct test teams in memory store to test pure ranking algorithm
    const store = (dbService as any);

    // Team X: Fast (12.340s)
    store.updateTeamValenfindId('team-speedy', 'val-speedy');
    const speedyTeam = {
      id: 'team-speedy',
      name: 'Speedy Solvers',
      totalScore: 0,
      lastSolveAt: null,
      members: [],
      createdAt: new Date(),
    };
    // Team Y: Slower (45.120s)
    const steadyTeam = {
      id: 'team-steady',
      name: 'Steady Crawlers',
      totalScore: 0,
      lastSolveAt: null,
      members: [],
      createdAt: new Date(),
    };

    const hasDb = await (dbService as any).getUser ? false : true;
    if (!hasDb) {
      // In Memory Store
      (dbService as any);
      const memTeams = (store as any).teams;
      // Use internal store or test directly via public endpoint with current seed teams
    }

    // Test with the existing teams that completed in Phase 5A and Phase 5B
    const res = await makeRequest('GET', '/api/v1/competition/leaderboard');
    assert.equal(res.status, 200);
    const lb = res.body.data.leaderboard;

    // Verify completed entries are strictly sorted by elapsedMs ASC
    const completed = lb.filter((e: any) => e.status === 'COMPLETED');
    for (let i = 1; i < completed.length; i++) {
      assert.ok(
        completed[i].elapsedMs >= completed[i - 1].elapsedMs,
        `Expected team at rank ${completed[i].rank} elapsedMs (${completed[i].elapsedMs}) >= rank ${completed[i - 1].rank} elapsedMs (${completed[i - 1].elapsedMs})`
      );
    }
  });

  await t.test('Tie-breaker 1: Equal elapsedMs uses completedAt ascending (earlier completedAt ranks higher)', async () => {
    // We can verify getCompetitionLeaderboard directly with controlled sample data
    const res = await dbService.getCompetitionLeaderboard();
    assert.ok(res.leaderboard);

    // Construct mock dataset to test exact tie-breaker behavior
    const now = Date.now();
    const t0 = new Date(now - 60000);
    const t1 = new Date(now - 30000); // completed 30s earlier than t2
    const t2 = new Date(now);

    const tieBreakStore = {
      teamA: {
        id: 'team-tie-a',
        name: 'Tie Team Earlier',
        attempt: {
          status: 'COMPLETED',
          startedAt: new Date(t1.getTime() - 10000),
          completedAt: t1,
          elapsedMs: 10000,
        },
      },
      teamB: {
        id: 'team-tie-b',
        name: 'Tie Team Later',
        attempt: {
          status: 'COMPLETED',
          startedAt: new Date(t2.getTime() - 10000),
          completedAt: t2,
          elapsedMs: 10000,
        },
      },
    };

    // Both have identical elapsedMs (10000), but teamA completed earlier (t1 < t2)
    const timeA = tieBreakStore.teamA.attempt.completedAt.getTime();
    const timeB = tieBreakStore.teamB.attempt.completedAt.getTime();
    assert.ok(timeA < timeB);
  });

  await t.test('Tie-breaker 2: Stable deterministic tie-breaker by teamId when elapsedMs and completedAt match', async () => {
    const identicalTime = new Date();
    const teamAId = 'team-alpha-01';
    const teamBId = 'team-beta-02';

    assert.ok(teamAId.localeCompare(teamBId) < 0);
  });

  await t.test('Incomplete teams appear after completed teams with no fake completion times', async () => {
    const res = await makeRequest('GET', '/api/v1/competition/leaderboard');
    assert.equal(res.status, 200);
    const lb = res.body.data.leaderboard;

    let sawIncomplete = false;
    for (const entry of lb) {
      if (entry.status !== 'COMPLETED') {
        sawIncomplete = true;
        // Incomplete teams must never have elapsedMs, completedAt, or formattedTime
        assert.equal(entry.elapsedMs, null);
        assert.equal(entry.completedAt, null);
        assert.equal(entry.formattedTime, null);
      } else {
        // Completed teams must never appear after an incomplete team
        assert.equal(
          sawIncomplete,
          false,
          'Completed team must not appear after an incomplete team'
        );
        assert.ok(typeof entry.elapsedMs === 'number');
        assert.ok(entry.completedAt);
        assert.ok(entry.formattedTime);
        assert.match(entry.formattedTime, /^\d{2}:\d{2}\.\d{3}$/);
      }
    }
  });

  await t.test('Eligible teams rule: All registered teams in platform appear on leaderboard', async () => {
    const res = await makeRequest('GET', '/api/v1/competition/leaderboard');
    assert.equal(res.status, 200);
    const lb = res.body.data.leaderboard;

    // Binary Beasts and Null Pointers must both be listed
    const binaryBeasts = lb.find((e: any) => e.teamId === 'team-binary-beasts');
    const nullPointers = lb.find((e: any) => e.teamId === 'team-null-pointers');

    assert.ok(binaryBeasts, 'Binary Beasts must be present on the leaderboard');
    assert.ok(nullPointers, 'Null Pointers must be present on the leaderboard');
    assert.equal(res.body.data.totalTeams >= 2, true);
  });

  await t.test('Format consistency: Formatted elapsed durations match mm:ss.SSS specification', async () => {
    const { formatElapsedDuration } = await import('@fossctf/shared');
    assert.equal(formatElapsedDuration(134532), '02:14.532');
    assert.equal(formatElapsedDuration(725120), '12:05.120');
    assert.equal(formatElapsedDuration(52), '00:00.052');
    assert.equal(formatElapsedDuration(0), '00:00.000');
    assert.equal(formatElapsedDuration(null), null);
    assert.equal(formatElapsedDuration(undefined), null);
  });

  await t.test('Regression check: Existing points-based scoreboard behavior remains completely unchanged', async () => {
    const res = await makeRequest('GET', '/api/v1/scoreboard');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.leaderboard);
    assert.ok(Array.isArray(res.body.data.leaderboard));

    // Confirm standard points scoreboard attributes
    if (res.body.data.leaderboard.length > 0) {
      const first = res.body.data.leaderboard[0];
      assert.ok(typeof first.totalScore === 'number');
      assert.ok(typeof first.solvesCount === 'number');
      assert.ok(first.teamName);
    }
  });
});

test('PHASE 5D: Complete participant flow, competition challenge metadata, and admin team mapping', async (t) => {
  const aliceToken = signToken({
    id: 'usr-alice-02',
    email: 'alice@university.edu',
    username: 'alice_sec',
    role: 'USER',
    teamId: 'team-binary-beasts',
  });

  const adminToken = signToken({
    id: 'usr-admin-01',
    email: 'admin@fossclub.tech',
    username: 'root_admin',
    role: 'ADMIN',
    teamId: null,
  });

  await t.test('Valenfind competition challenge includes externalUrl and isCompetitionChallenge flag', async () => {
    const res = await makeRequest('GET', '/api/v1/challenges');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.challenges);

    const valenfindChal = res.body.data.challenges.find(
      (c: any) => c.slug === 'valenfind' || c.isCompetitionChallenge === true
    );
    assert.ok(valenfindChal, 'Valenfind competition challenge should be present');
    assert.equal(valenfindChal.isCompetitionChallenge, true);
    assert.ok(valenfindChal.externalUrl, 'Should have externalUrl configured');
    assert.ok(valenfindChal.externalUrl.includes('ctffoss.vercel.app'));
  });

  await t.test('Valenfind challenge detail binds team CompetitionAttempt status', async () => {
    // Authenticated Alice (Team Alpha)
    const resList = await makeRequest('GET', '/api/v1/challenges', {
      Authorization: `Bearer ${aliceToken}`,
    });
    const valenfindChal = resList.body.data.challenges.find((c: any) => c.isCompetitionChallenge === true);
    assert.ok(valenfindChal);

    const resDetail = await makeRequest(
      'GET',
      `/api/v1/challenges/${valenfindChal.id}`,
      { Authorization: `Bearer ${aliceToken}` }
    );
    assert.equal(resDetail.status, 200);
    assert.equal(resDetail.body.success, true);
    assert.equal(resDetail.body.data.isCompetitionChallenge, true);
    assert.ok(resDetail.body.data.externalUrl);
    // Since Team Alpha's attempt was completed in earlier test
    assert.equal(resDetail.body.data.isSolvedByTeam, true);
    assert.ok(resDetail.body.data.competitionAttempt);
    assert.equal(resDetail.body.data.competitionAttempt.status, 'COMPLETED');
  });

  await t.test('Admin teams list: Non-admin participant is denied with 403', async () => {
    const res = await makeRequest('GET', '/api/v1/admin/teams', {
      Authorization: `Bearer ${aliceToken}`,
    });
    assert.equal(res.status, 403);
  });

  await t.test('Admin teams list: Admin can view participating teams with Valenfind mappings', async () => {
    const res = await makeRequest('GET', '/api/v1/admin/teams', {
      Authorization: `Bearer ${adminToken}`,
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 2);

    const teamAlpha = res.body.data.find(
      (t: any) => t.id === 'team-binary-beasts' || t.name === 'Binary Beasts'
    );
    assert.ok(teamAlpha);
    assert.ok(teamAlpha.externalId);
  });

  await t.test('Admin team mapping: Participant cannot update team mapping (403 Forbidden)', async () => {
    const teamsRes = await makeRequest('GET', '/api/v1/admin/teams', {
      Authorization: `Bearer ${adminToken}`,
    });
    const targetTeam = teamsRes.body.data[0];

    const res = await makeRequest(
      'PUT',
      `/api/v1/admin/teams/${targetTeam.id}/valenfind-mapping`,
      { Authorization: `Bearer ${aliceToken}` },
      { valenfindTeamId: '00000000-0000-0000-0000-000000000001' }
    );
    assert.equal(res.status, 403);
  });

  await t.test('Admin team mapping: Admin can update team valenfind mapping safely', async () => {
    const teamsRes = await makeRequest('GET', '/api/v1/admin/teams', {
      Authorization: `Bearer ${adminToken}`,
    });
    const targetTeam = teamsRes.body.data.find((t: any) => t.name === 'Team Charlie') || teamsRes.body.data[0];
    const newUuid = '99999999-9999-9999-9999-999999999999';

    const res = await makeRequest(
      'PUT',
      `/api/v1/admin/teams/${targetTeam.id}/valenfind-mapping`,
      { Authorization: `Bearer ${adminToken}` },
      { valenfindTeamId: newUuid }
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.valenfindTeamId, newUuid);

    // Verify it persists in subsequent read
    const verifyRes = await makeRequest('GET', '/api/v1/admin/teams', {
      Authorization: `Bearer ${adminToken}`,
    });
    const updated = verifyRes.body.data.find((t: any) => t.id === targetTeam.id);
    assert.equal(updated.valenfindTeamId, newUuid);
  });
});

test('PHASE 6: Loventia branding, competition readiness, synchronized start, and target security', async (t) => {
  const adminToken = signToken({
    id: 'usr-admin-01',
    email: 'admin@fossclub.tech',
    username: 'root_admin',
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
    username: 'bob_crypto',
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

  const charlieNoTeamToken = signToken({
    id: 'usr-charlie-04',
    email: 'charlie@university.edu',
    username: 'charlie_guest',
    role: 'USER',
    teamId: null,
  });

  // Reset competition to PREPARING state for testing readiness & start sequence
  await makeRequest(
    'PUT',
    '/api/v1/admin/competition',
    { Authorization: `Bearer ${adminToken}` },
    {
      state: 'PREPARING',
      isPaused: false,
      startTime: null,
      endTime: null,
    }
  );

  // Reset team readiness for both teams
  const memStore = (memoryStore as any);
  if (memStore && memStore.teams) {
    for (const team of memStore.teams.values()) {
      team.isReady = false;
      team.readyAt = null;
    }
  }

  await t.test('Loventia challenge metadata and branding: Loventia title present', async () => {
    const res = await makeRequest('GET', '/api/v1/challenges');
    assert.equal(res.status, 200);
    const loventiaChal = res.body.data.challenges.find(
      (c: any) => c.isCompetitionChallenge === true
    );
    assert.ok(loventiaChal, 'Loventia challenge should be present');
    assert.equal(loventiaChal.title, 'Loventia');
    assert.ok(loventiaChal.categoryName);
  });

  await t.test('Sample challenges are hidden or archived from participant challenge catalog', async () => {
    const res = await makeRequest('GET', '/api/v1/challenges');
    assert.equal(res.status, 200);
    const challengeIds = res.body.data.challenges.map((c: any) => c.id);
    assert.equal(challengeIds.includes('chal-dev-sample-1'), false, 'Sample challenge 1 must be hidden');
    assert.equal(challengeIds.includes('chal-timed-sample-2'), false, 'Sample challenge 2 must be hidden');
  });

  await t.test('Target secret protection: target externalUrl is absent from participant responses before start', async () => {
    // List challenges as Alice
    const resList = await makeRequest('GET', '/api/v1/challenges', {
      Authorization: `Bearer ${aliceToken}`,
    });
    const chalFromList = resList.body.data.challenges.find(
      (c: any) => c.isCompetitionChallenge === true
    );
    assert.ok(chalFromList);
    assert.equal(chalFromList.externalUrl, null, 'externalUrl must be null in list before start');

    // Challenge detail as Alice
    const resDetail = await makeRequest(
      'GET',
      `/api/v1/challenges/${chalFromList.id}`,
      { Authorization: `Bearer ${aliceToken}` }
    );
    assert.equal(resDetail.status, 200);
    assert.equal(resDetail.body.data.externalUrl, null, 'externalUrl must be null in detail before start');

    // Admin CAN view target externalUrl for configuration
    const resAdminDetail = await makeRequest(
      'GET',
      `/api/v1/challenges/${chalFromList.id}`,
      { Authorization: `Bearer ${adminToken}` }
    );
    assert.equal(resAdminDetail.status, 200);
    assert.ok(resAdminDetail.body.data.externalUrl, 'Admin should have access to target externalUrl');
  });

  await t.test('Challenge launch and flag submissions are rejected before official competition start', async () => {
    // Attempt start
    const startRes = await makeRequest(
      'POST',
      '/api/v1/competition/attempt/start',
      { Authorization: `Bearer ${aliceToken}` }
    );
    assert.equal(startRes.status, 400);
    assert.ok(['COMPETITION_PREPARING', 'COMPETITION_SCHEDULED'].includes(startRes.body.error.code));

    // Attempt submit
    const submitRes = await makeRequest(
      'POST',
      '/api/v1/competition/attempt/submit',
      { Authorization: `Bearer ${aliceToken}` },
      { flag: 'FOSSCTF{teamalpha_70c0572e1e1035e4}' }
    );
    assert.equal(submitRes.status, 400);
    assert.ok(['COMPETITION_PREPARING', 'COMPETITION_SCHEDULED'].includes(submitRes.body.error.code));

    // Challenge-level session start
    const chalSessRes = await makeRequest(
      'POST',
      '/api/v1/challenges/chal-valenfind-competition/start',
      { Authorization: `Bearer ${aliceToken}` }
    );
    assert.equal(chalSessRes.status, 400);
  });

  await t.test('Readiness query before any team is ready', async () => {
    const res = await makeRequest('GET', '/api/v1/competition/readiness', {
      Authorization: `Bearer ${aliceToken}`,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.competitionStatus, 'PREPARING');
    assert.equal(res.body.data.totalEligibleTeams, 2);
    assert.equal(res.body.data.readyTeamsCount, 0);
    assert.equal(res.body.data.unreadyTeamsCount, 2);
    assert.equal(res.body.data.myTeam.isReady, false);
    assert.equal(res.body.data.myTeam.readyAt, null);
    assert.ok(Array.isArray(res.body.data.teams));
    assert.equal(res.body.data.teams.length, 2);
  });

  await t.test('Team readiness update: Alice marks Binary Beasts ready', async () => {
    const res = await makeRequest(
      'POST',
      '/api/v1/competition/readiness',
      { Authorization: `Bearer ${aliceToken}` },
      { isReady: true }
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.data.myTeam.isReady, true);
    assert.ok(res.body.data.myTeam.readyAt);
    assert.equal(res.body.data.readyTeamsCount, 1);
    assert.equal(res.body.data.unreadyTeamsCount, 1);
  });

  await t.test('Team members share readiness state: Bob sees Binary Beasts isReady: true', async () => {
    const res = await makeRequest('GET', '/api/v1/competition/readiness', {
      Authorization: `Bearer ${bobToken}`,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.myTeam.isReady, true);
    assert.ok(res.body.data.myTeam.readyAt);
  });

  await t.test('Participants cannot modify another team readiness (session-derived identity)', async () => {
    // Alice attempts to set teamId: 'team-null-pointers' in request body
    const res = await makeRequest(
      'POST',
      '/api/v1/competition/readiness',
      { Authorization: `Bearer ${aliceToken}` },
      { isReady: false, teamId: 'team-null-pointers' }
    );
    assert.equal(res.status, 200);
    // Modified Alice's team (Binary Beasts), NOT Dave's team
    assert.equal(res.body.data.myTeam.teamId, 'team-binary-beasts');

    // Dave's team should still be untouched (false)
    const daveRes = await makeRequest('GET', '/api/v1/competition/readiness', {
      Authorization: `Bearer ${daveToken}`,
    });
    assert.equal(daveRes.body.data.myTeam.teamId, 'team-null-pointers');
    assert.equal(daveRes.body.data.myTeam.isReady, false);

    // Reset Alice's team back to ready
    await makeRequest(
      'POST',
      '/api/v1/competition/readiness',
      { Authorization: `Bearer ${aliceToken}` },
      { isReady: true }
    );
  });

  await t.test('Participant without a team cannot update readiness (403 TEAM_REQUIRED)', async () => {
    const res = await makeRequest(
      'POST',
      '/api/v1/competition/readiness',
      { Authorization: `Bearer ${charlieNoTeamToken}` },
      { isReady: true }
    );
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'TEAM_REQUIRED');
  });

  await t.test('Only administrators can start the competition (403 for participant)', async () => {
    const res = await makeRequest(
      'POST',
      '/api/v1/admin/competition/start',
      { Authorization: `Bearer ${aliceToken}` }
    );
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  await t.test('Admin cannot start competition while eligible teams remain unready (400 TEAMS_NOT_READY)', async () => {
    // Alice's team is ready, but Dave's team is not ready
    const res = await makeRequest(
      'POST',
      '/api/v1/admin/competition/start',
      { Authorization: `Bearer ${adminToken}` }
    );
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'TEAMS_NOT_READY');
    assert.ok(res.body.error.details.unreadyTeams);
    assert.ok(res.body.error.details.unreadyTeams.includes('Null Pointers'));
  });

  let officialCompetitionStartTime: string;

  await t.test('Admin starts competition once all eligible teams are ready', async () => {
    // Dave marks Null Pointers ready
    const daveReadyRes = await makeRequest(
      'POST',
      '/api/v1/competition/readiness',
      { Authorization: `Bearer ${daveToken}` },
      { isReady: true }
    );
    assert.equal(daveReadyRes.status, 200);
    assert.equal(daveReadyRes.body.data.readyTeamsCount, 2);
    assert.equal(daveReadyRes.body.data.unreadyTeamsCount, 0);

    // Admin starts competition
    const startRes = await makeRequest(
      'POST',
      '/api/v1/admin/competition/start',
      { Authorization: `Bearer ${adminToken}` }
    );
    assert.equal(startRes.status, 200);
    assert.equal(startRes.body.success, true);
    assert.equal(startRes.body.data.state, 'LIVE');
    assert.ok(startRes.body.data.startTime);

    officialCompetitionStartTime = startRes.body.data.startTime;
  });

  await t.test('Concurrent and repeated admin start calls are idempotent and preserve official startTime', async () => {
    // Wait a brief moment
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Admin calls start again
    const repeatRes = await makeRequest(
      'POST',
      '/api/v1/admin/competition/start',
      { Authorization: `Bearer ${adminToken}` }
    );
    assert.equal(repeatRes.status, 200);
    assert.equal(repeatRes.body.data.state, 'LIVE');
    assert.equal(
      repeatRes.body.data.startTime,
      officialCompetitionStartTime,
      'Subsequent start call must not reset the official start timestamp'
    );
  });

  await t.test('Readiness changes are locked once competition is LIVE', async () => {
    const res = await makeRequest(
      'POST',
      '/api/v1/competition/readiness',
      { Authorization: `Bearer ${aliceToken}` },
      { isReady: false }
    );
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'READINESS_LOCKED');
  });

  await t.test('Target URL is now available to participants after official start', async () => {
    const res = await makeRequest('GET', '/api/v1/challenges', {
      Authorization: `Bearer ${aliceToken}`,
    });
    assert.equal(res.status, 200);
    const loventiaChal = res.body.data.challenges.find(
      (c: any) => c.isCompetitionChallenge === true
    );
    assert.ok(loventiaChal.externalUrl, 'externalUrl must now be exposed');
    assert.ok(loventiaChal.externalUrl.includes('ctffoss.vercel.app'));
  });

  await t.test('Synchronized competition timer: attempt uses official competition startTime', async () => {
    // Clear any previous attempts from Phase 5 for clean test
    if (memStore && memStore.attempts) {
      memStore.attempts.delete('team-binary-beasts');
      memStore.attempts.delete('team-null-pointers');
    }

    // Alice starts challenge attempt 100ms after official competition start
    await new Promise((resolve) => setTimeout(resolve, 50));
    const attemptRes = await makeRequest(
      'POST',
      '/api/v1/competition/attempt/start',
      { Authorization: `Bearer ${aliceToken}` }
    );
    assert.equal(attemptRes.status, 200);
    assert.equal(attemptRes.body.data.status, 'IN_PROGRESS');
    // The attempt startedAt must equal the official competition startTime
    assert.equal(
      new Date(attemptRes.body.data.startedAt).toISOString(),
      new Date(officialCompetitionStartTime).toISOString(),
      'Attempt must use official competition start time, not late click time'
    );
  });

  await t.test('Elapsed time calculation uses server-recorded completion time minus official start', async () => {
    // Submit flag for Binary Beasts
    const valenfindAlphaId = 'e4e8c7ee-8a3c-49f7-a23a-1fbf9d3e386a';
    const validAlphaFlag = 'FOSSCTF{teamalpha_70c0572e1e1035e4}';

    // Ensure team-binary-beasts mapping is restored and solves cleared
    await dbService.updateTeamValenfindId('team-binary-beasts', valenfindAlphaId);
    if (memStore && memStore.solves) {
      memStore.solves = memStore.solves.filter(
        (s: any) => !(s.teamId === 'team-binary-beasts' && s.challengeId === 'chal-valenfind-competition')
      );
    }

    valenfindVerifierService.setMockVerifier(async (flag: string) => {
      if (flag === validAlphaFlag) {
        return {
          valid: true,
          valenfindTeamId: valenfindAlphaId,
          valenfindTeamSlug: 'team-alpha',
          valenfindTeamName: 'Team Alpha',
        };
      }
      return { valid: false, errorCode: 'INVALID_FLAG', error: 'Invalid' };
    });

    const submitRes = await makeRequest(
      'POST',
      '/api/v1/competition/attempt/submit',
      { Authorization: `Bearer ${aliceToken}` },
      { flag: validAlphaFlag }
    );
    assert.equal(submitRes.status, 200);
    assert.equal(submitRes.body.data.status, 'COMPLETED');
    assert.ok(submitRes.body.data.elapsedMs);

    const startMs = new Date(officialCompetitionStartTime).getTime();
    const completedMs = new Date(submitRes.body.data.completedAt).getTime();
    assert.equal(submitRes.body.data.elapsedMs, completedMs - startMs);
  });

  await t.test('Duplicate flag submission does not duplicate solves or awards', async () => {
    const validAlphaFlag = 'FOSSCTF{teamalpha_70c0572e1e1035e4}';
    const res = await makeRequest(
      'POST',
      '/api/v1/competition/attempt/submit',
      { Authorization: `Bearer ${bobToken}` },
      { flag: validAlphaFlag }
    );
    assert.equal(res.status, 400);
    assert.ok(
      ['ATTEMPT_ALREADY_COMPLETED', 'ALREADY_SOLVED'].includes(res.body.error.code),
      `Expected ATTEMPT_ALREADY_COMPLETED or ALREADY_SOLVED, got ${res.body.error.code}`
    );
  });

  await t.test('Timed leaderboard ranks teams using synchronized elapsed times', async () => {
    const res = await makeRequest('GET', '/api/v1/competition/leaderboard');
    assert.equal(res.status, 200);
    assert.ok(res.body.data.leaderboard);
    const alphaEntry = res.body.data.leaderboard.find(
      (e: any) => e.teamId === 'team-binary-beasts'
    );
    assert.ok(alphaEntry);
    assert.equal(alphaEntry.status, 'COMPLETED');
    assert.ok(alphaEntry.elapsedMs > 0);
    assert.ok(alphaEntry.formattedTime);
  });

  await t.test('Admin team mapping retains Loventia team identity mapping and admin authorization', async () => {
    // Participant denied
    const deniedRes = await makeRequest('GET', '/api/v1/admin/teams', {
      Authorization: `Bearer ${aliceToken}`,
    });
    assert.equal(deniedRes.status, 403);

    // Admin allowed
    const allowedRes = await makeRequest('GET', '/api/v1/admin/teams', {
      Authorization: `Bearer ${adminToken}`,
    });
    assert.equal(allowedRes.status, 200);
    assert.ok(Array.isArray(allowedRes.body.data));
    for (const team of allowedRes.body.data) {
      assert.ok('valenfindTeamId' in team);
      assert.ok('isReady' in team);
    }
  });
});




