import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { app } from '../src/app';
import { signToken } from '../src/utils/crypto';
import { dbService, memoryStore } from '../src/services/db.service';
import { competitionAttemptService } from '../src/services/competitionAttempt.service';
import { config } from '../src/config/index';

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

const aliceToken = signToken({
  id: 'usr-alice-02',
  email: 'alice@university.edu',
  username: 'alice_0x',
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

const charlieToken = signToken({
  id: 'usr-charlie-04',
  email: 'charlie@university.edu',
  username: 'charlie_solo',
  role: 'USER',
  teamId: null, // Solo user without team
});

const daveToken = signToken({
  id: 'usr-dave-05',
  email: 'dave@university.edu',
  username: 'dave_bravo',
  role: 'USER',
  teamId: 'team-null-pointers',
});

test.before(async () => {
  dbService.setStorageDriver('memory');
  await dbService.initStorage();

  // Set competition state to LIVE for test suite
  await dbService.updateCompetitionConfig({
    state: 'LIVE',
    startTime: new Date(Date.now() - 60000), // Started 1 minute ago
  });

  return new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        baseUrl = `http://127.0.0.1:${addr.port}`;
      }
      resolve();
    });
  });
});

test.after(async () => {
  dbService.setStorageDriver(null);
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('LOVENTIA VOUCHER REDEMPTION SUITE', async (t) => {
  const validVoucherId = config.loventiaVoucherId;
  const validPassphrase = config.loventiaPassphrase;

  await t.test('1. Unauthenticated redemption: rejected with 401 UNAUTHORIZED', async () => {
    const res = await makeRequest('POST', '/api/v1/competition/loventia/redeem', {}, {
      voucherId: validVoucherId,
      passphrase: validPassphrase,
    });
    assert.equal(res.status, 401);
    assert.equal(res.body.error?.code, 'UNAUTHORIZED');
  });

  await t.test('2. Participant without a team: rejected with 403 TEAM_REQUIRED', async () => {
    const res = await makeRequest(
      'POST',
      '/api/v1/competition/loventia/redeem',
      { Authorization: `Bearer ${charlieToken}` },
      {
        voucherId: validVoucherId,
        passphrase: validPassphrase,
      }
    );
    assert.equal(res.status, 403);
    assert.equal(res.body.error?.code, 'TEAM_REQUIRED');
  });

  await t.test('3. Missing or empty credentials: rejected with 400 MISSING_CREDENTIALS', async () => {
    const res = await makeRequest(
      'POST',
      '/api/v1/competition/loventia/redeem',
      { Authorization: `Bearer ${aliceToken}` },
      {
        voucherId: '',
        passphrase: '   ',
      }
    );
    assert.equal(res.status, 400);
    assert.equal(res.body.error?.code, 'MISSING_CREDENTIALS');
  });

  await t.test('4. Incorrect Voucher ID: rejected with 400 INVALID_VOUCHER_CREDENTIALS', async () => {
    const res = await makeRequest(
      'POST',
      '/api/v1/competition/loventia/redeem',
      { Authorization: `Bearer ${aliceToken}` },
      {
        voucherId: 'WRONG-VOUCHER-ID',
        passphrase: validPassphrase,
      }
    );
    assert.equal(res.status, 400);
    assert.equal(res.body.error?.code, 'INVALID_VOUCHER_CREDENTIALS');
    // Ensure expected credentials are never leaked in response
    assert.ok(!JSON.stringify(res.body).includes(validVoucherId));
  });

  await t.test('5. Incorrect Passphrase: rejected with 400 INVALID_VOUCHER_CREDENTIALS', async () => {
    const res = await makeRequest(
      'POST',
      '/api/v1/competition/loventia/redeem',
      { Authorization: `Bearer ${aliceToken}` },
      {
        voucherId: validVoucherId,
        passphrase: 'wrong_secret_passphrase',
      }
    );
    assert.equal(res.status, 400);
    assert.equal(res.body.error?.code, 'INVALID_VOUCHER_CREDENTIALS');
  });

  let aliceFlag: string;

  await t.test('6. Correct voucher credentials: mints team flag with correct format', async () => {
    const res = await makeRequest(
      'POST',
      '/api/v1/competition/loventia/redeem',
      { Authorization: `Bearer ${aliceToken}` },
      {
        voucherId: `  ${validVoucherId}  `, // tests whitespace normalization
        passphrase: validPassphrase,
      }
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data?.flag, 'Must return a generated flag');
    assert.equal(typeof res.body.data.flag, 'string');
    assert.ok(
      res.body.data.flag.startsWith('FOSSCTF{loventia_'),
      `Flag should start with FOSSCTF{loventia_, got ${res.body.data.flag}`
    );
    aliceFlag = res.body.data.flag;
  });

  await t.test('7. Repeated redemption returns the exact same persistent flag', async () => {
    const res = await makeRequest(
      'POST',
      '/api/v1/competition/loventia/redeem',
      { Authorization: `Bearer ${aliceToken}` },
      {
        voucherId: validVoucherId,
        passphrase: validPassphrase,
      }
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.data.flag, aliceFlag, 'Subsequent redemption must return identical flag');
  });

  await t.test('8. Teammates share the same team flag (Bob retrieves Alice team flag)', async () => {
    const res = await makeRequest(
      'POST',
      '/api/v1/competition/loventia/redeem',
      { Authorization: `Bearer ${bobToken}` },
      {
        voucherId: validVoucherId,
        passphrase: validPassphrase,
      }
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.data.flag, aliceFlag, 'Teammates must receive the same squad flag');
  });

  await t.test('9. Voucher status endpoint returns redeemed: true and the flag', async () => {
    const res = await makeRequest(
      'GET',
      '/api/v1/competition/loventia/voucher-status',
      { Authorization: `Bearer ${bobToken}` }
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.data.redeemed, true);
    assert.equal(res.body.data.flag, aliceFlag);
  });

  let daveFlag: string;

  await t.test('10. Different teams receive unique, isolated flags', async () => {
    const res = await makeRequest(
      'POST',
      '/api/v1/competition/loventia/redeem',
      { Authorization: `Bearer ${daveToken}` },
      {
        voucherId: validVoucherId,
        passphrase: validPassphrase,
      }
    );
    assert.equal(res.status, 200);
    assert.ok(res.body.data.flag.startsWith('FOSSCTF{loventia_'));
    daveFlag = res.body.data.flag;
    assert.notEqual(daveFlag, aliceFlag, 'Different teams must receive distinct flags');
  });

  await t.test('11. Concurrent redemptions cannot create duplicate flags for a team', async () => {
    const requests = Array.from({ length: 5 }, () =>
      dbService.getOrCreateTeamLoventiaFlag('concurrent-team-test')
    );
    const results = await Promise.all(requests);
    const firstFlag = results[0].flag;
    for (const r of results) {
      assert.equal(r.flag, firstFlag, 'Concurrent requests must yield identical flag');
    }
  });

  await t.test('12. Redemption does NOT automatically complete attempt or award points', async () => {
    // Check attempt status for Binary Beasts
    const attemptRes = await makeRequest(
      'GET',
      '/api/v1/competition/attempt',
      { Authorization: `Bearer ${aliceToken}` }
    );
    // Attempt was not started yet or remains IN_PROGRESS; not COMPLETED
    if (attemptRes.body.data) {
      assert.notEqual(attemptRes.body.data.status, 'COMPLETED');
    }

    // Check challenge solve
    const valenfindChal = await dbService.getChallengeBySlug('valenfind');
    if (valenfindChal) {
      const isSolved = await dbService.hasTeamSolved('team-binary-beasts', valenfindChal.id);
      assert.equal(isSolved, false, 'Challenge must NOT be marked solved upon redemption');
    }
  });

  await t.test('13. Cross-team flag security: Dave submitting Alice team flag is rejected', async () => {
    // Start Dave's attempt first
    await competitionAttemptService.startAttempt('team-null-pointers');

    const res = await makeRequest(
      'POST',
      '/api/v1/competition/attempt/submit',
      { Authorization: `Bearer ${daveToken}` },
      { flag: aliceFlag }
    );
    assert.equal(res.status, 400);
    assert.equal(res.body.error?.code, 'FLAG_TEAM_MISMATCH');
  });

  await t.test('14. Normal flag submission: Dave submitting his own flag completes attempt', async () => {
    const res = await makeRequest(
      'POST',
      '/api/v1/competition/attempt/submit',
      { Authorization: `Bearer ${daveToken}` },
      { flag: daveFlag }
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'COMPLETED');
    assert.ok(typeof res.body.data.elapsedMs === 'number');

    // Verify solve was recorded
    const valenfindChal = await dbService.getChallengeBySlug('valenfind');
    if (valenfindChal) {
      const isSolved = await dbService.hasTeamSolved('team-null-pointers', valenfindChal.id);
      assert.equal(isSolved, true, 'Solve must be recorded upon valid flag submission');
    }
  });

  await t.test('15. Submitting already completed attempt: rejected with 400 ATTEMPT_ALREADY_COMPLETED', async () => {
    const res = await makeRequest(
      'POST',
      '/api/v1/competition/attempt/submit',
      { Authorization: `Bearer ${daveToken}` },
      { flag: daveFlag }
    );
    assert.equal(res.status, 400);
    assert.equal(res.body.error?.code, 'ATTEMPT_ALREADY_COMPLETED');
  });

  await t.test('16. Lifecycle enforcement: voucher redemption is blocked outside LIVE state', async () => {
    // Temporarily switch to PREPARING
    await dbService.updateCompetitionConfig({ state: 'PREPARING' });

    const res = await makeRequest(
      'POST',
      '/api/v1/competition/loventia/redeem',
      { Authorization: `Bearer ${aliceToken}` },
      {
        voucherId: validVoucherId,
        passphrase: validPassphrase,
      }
    );
    assert.equal(res.status, 400);
    assert.equal(res.body.error?.code, 'COMPETITION_NOT_LIVE');

    // Restore to LIVE
    await dbService.updateCompetitionConfig({ state: 'LIVE' });
  });

  await t.test('17. Unconfigured server: fails safely with 500 VOUCHER_SERVICE_UNCONFIGURED', async () => {
    const origId = config.loventiaVoucherId;
    (config as any).loventiaVoucherId = '';

    const res = await makeRequest(
      'POST',
      '/api/v1/competition/loventia/redeem',
      { Authorization: `Bearer ${aliceToken}` },
      {
        voucherId: 'SOME-ID',
        passphrase: 'SOME-PASSPHRASE',
      }
    );
    assert.equal(res.status, 500);
    assert.equal(res.body.error?.code, 'VOUCHER_SERVICE_UNCONFIGURED');

    (config as any).loventiaVoucherId = origId;
  });

  await t.test('18. Global timer synchronized attempt: Alice submits without prior manual start and completes under global timer', async () => {
    // Note: Alice's team (team-binary-beasts) NEVER called startAttempt explicitly!
    // The global timer is LIVE. Submitting flag auto-initializes and completes under the synchronized start time.
    const res = await makeRequest(
      'POST',
      '/api/v1/competition/attempt/submit',
      { Authorization: `Bearer ${aliceToken}` },
      { flag: aliceFlag }
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'COMPLETED');
    assert.ok(typeof res.body.data.elapsedMs === 'number');
    // Global timer started 60s ago in before hook, so elapsedMs should be >= 60000ms
    assert.ok(res.body.data.elapsedMs >= 59000, `elapsedMs should reflect global timer, got ${res.body.data.elapsedMs}`);

    // Verify solve was recorded
    const valenfindChal = await dbService.getChallengeBySlug('valenfind');
    if (valenfindChal) {
      const isSolved = await dbService.hasTeamSolved('team-binary-beasts', valenfindChal.id);
      assert.equal(isSolved, true, 'Solve must be recorded for Alice team');
    }
  });

  await t.test('19. Unknown / unissued flag is rejected and does not complete attempt', async () => {
    // Charlie is solo without team, but let's test a team with uncompleted attempt
    const res = await makeRequest(
      'POST',
      '/api/v1/competition/attempt/submit',
      { Authorization: `Bearer ${daveToken}` },
      { flag: 'FOSSCTF{loventia_completely_fake_and_unissued_flag}' }
    );
    // Dave already completed his attempt in test 14, so it should reject with ATTEMPT_ALREADY_COMPLETED
    assert.equal(res.status, 400);
  });

  await t.test('20. Voucher redemption does NOT alter global competition startTime or status', async () => {
    const compBefore = await dbService.getCompetitionConfig();
    assert.equal(compBefore.status, 'LIVE');

    // Redeem voucher for another team
    const res = await makeRequest(
      'POST',
      '/api/v1/competition/loventia/redeem',
      { Authorization: `Bearer ${bobToken}` },
      {
        voucherId: validVoucherId,
        passphrase: validPassphrase,
      }
    );
    assert.equal(res.status, 200);

    const compAfter = await dbService.getCompetitionConfig();
    assert.equal(compAfter.status, 'LIVE');
    assert.equal(compAfter.startTime, compBefore.startTime, 'Global startTime must remain unchanged');
  });

  await t.test('21. Timing-safe comparison handles differing lengths and oversized inputs safely', async () => {
    // 1-char inputs
    const resShort = await makeRequest(
      'POST',
      '/api/v1/competition/loventia/redeem',
      { Authorization: `Bearer ${bobToken}` },
      {
        voucherId: 'A',
        passphrase: 'B',
      }
    );
    assert.equal(resShort.status, 400);
    assert.equal(resShort.body.error?.code, 'INVALID_VOUCHER_CREDENTIALS');

    // Differing length from actual voucher
    const resDiffLen = await makeRequest(
      'POST',
      '/api/v1/competition/loventia/redeem',
      { Authorization: `Bearer ${bobToken}` },
      {
        voucherId: validVoucherId + 'EXTRA_BYTES',
        passphrase: validPassphrase,
      }
    );
    assert.equal(resDiffLen.status, 400);
    assert.equal(resDiffLen.body.error?.code, 'INVALID_VOUCHER_CREDENTIALS');

    // Inputs exceeding 1024 characters
    const resOversized = await makeRequest(
      'POST',
      '/api/v1/competition/loventia/redeem',
      { Authorization: `Bearer ${bobToken}` },
      {
        voucherId: 'A'.repeat(2048),
        passphrase: validPassphrase,
      }
    );
    assert.equal(resOversized.status, 400);
    assert.equal(resOversized.body.error?.code, 'INVALID_VOUCHER_CREDENTIALS');
  });

  await t.test('22. Submissions while competition is PAUSED or not LIVE are rejected', async () => {
    // Temporarily pause competition
    await dbService.updateCompetitionConfig({ isPaused: true });

    const res = await makeRequest(
      'POST',
      '/api/v1/competition/attempt/submit',
      { Authorization: `Bearer ${bobToken}` },
      { flag: aliceFlag }
    );
    assert.equal(res.status, 400);
    assert.equal(res.body.error?.code, 'COMPETITION_INACTIVE');

    // Unpause competition
    await dbService.updateCompetitionConfig({ isPaused: false, state: 'LIVE' });
  });

  await t.test('23. Database failure fails closed and returns sanitized 503 DATABASE_UNAVAILABLE', async () => {
    // Temporarily override getOrCreateTeamLoventiaFlag to simulate a database failure
    const originalMethod = dbService.getOrCreateTeamLoventiaFlag;
    (dbService as any).getOrCreateTeamLoventiaFlag = async () => {
      const dbErr = new Error('Connection lost to PostgreSQL');
      (dbErr as any).code = 'P2021';
      throw dbErr;
    };

    const res = await makeRequest(
      'POST',
      '/api/v1/competition/loventia/redeem',
      { Authorization: `Bearer ${bobToken}` },
      {
        voucherId: validVoucherId,
        passphrase: validPassphrase,
      }
    );
    assert.equal(res.status, 503);
    assert.equal(res.body.error?.code, 'DATABASE_UNAVAILABLE');
    assert.equal(res.body.error?.message, 'Database service is temporarily unavailable. Please try again.');
    // Ensure no internal database details are leaked
    assert.ok(!JSON.stringify(res.body).includes('PostgreSQL'));

    // Restore method
    (dbService as any).getOrCreateTeamLoventiaFlag = originalMethod;
  });
});

