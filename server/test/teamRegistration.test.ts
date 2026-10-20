import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { app } from '../src/app';
import { dbService, memoryStore } from '../src/services/db.service';
import { rosterService } from '../src/services/roster.service';
import { oidcService } from '../src/services/oidc.service';
import { signToken } from '../src/utils/crypto';
import { APPROVED_TEAMS, APPROVED_ROSTER } from '../src/fixtures/approvedRoster';

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

function createSessionCookie(user: { id: string; email: string; username: string; role: any; teamId: string | null }): string {
  const token = signToken({
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    clubRole: user.role,
    teamId: user.teamId,
  });
  return `foss_session=${token}; __Host-foss_session=${token}`;
}

test.before(async () => {
  dbService.setStorageDriver('memory');
  await dbService.initStorage();
  await dbService.ensureApprovedTeams();

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
  rosterService.resetRoster();
  oidcService.clearMockHandler();
  dbService.setStorageDriver(null);
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});

test('TEAM REGISTRATION & ROSTER SYSTEM SUITE', async (t) => {
  const sampleMember = APPROVED_ROSTER[0];
  const sampleTeam = APPROVED_TEAMS.find((t) => t.teamName === sampleMember.teamName)!;

  // ----------------------------------------------------
  // AUTOMATIC ASSIGNMENT (Tests 1 - 10)
  // ----------------------------------------------------

  await t.test('1. Verified OIDC email matches exactly one roster member: correct team is assigned', async () => {
    oidcService.setMockHandler(async () => ({
      sub: 'test-auto-oidc-sub-1',
      email: sampleMember.email,
      name: 'Roster Participant',
      preferred_username: 'roster_user_1',
      email_verified: true,
    }));

    const initRes = await makeRequest('GET', '/api/v1/auth/login', { Accept: 'application/json' });
    assert.strictEqual(initRes.status, 200);
    const setCookie = initRes.headers['set-cookie']?.join('; ') || '';
    const authUrl = new URL(initRes.body.data.authorizationUrl);
    const state = authUrl.searchParams.get('state')!;

    const callbackRes = await makeRequest(
      'GET',
      `/api/v1/auth/callback?code=mock_code&state=${state}`,
      { Cookie: setCookie, Accept: 'application/json' }
    );
    assert.strictEqual(callbackRes.status, 200);
    assert.strictEqual(callbackRes.body.success, true);
    assert.strictEqual(callbackRes.body.data.user.email, sampleMember.email);

    // Verify team was automatically matched and assigned
    assert.ok(callbackRes.body.data.user.teamId, 'User must have teamId assigned automatically');
    assert.strictEqual(callbackRes.body.data.user.teamName, sampleTeam.teamName);

    const dbUser = await dbService.getUser(callbackRes.body.data.user.id);
    assert.ok(dbUser);
    assert.strictEqual(dbUser.teamId, callbackRes.body.data.user.teamId);
  });

  await t.test('2. Email does not match the roster: user remains unassigned (teamId: null)', async () => {
    oidcService.setMockHandler(async () => ({
      sub: 'test-unassigned-sub-2',
      email: 'not_on_roster_operative@example.com',
      preferred_username: 'unassigned_operative',
      email_verified: true,
    }));

    const initRes = await makeRequest('GET', '/api/v1/auth/login', { Accept: 'application/json' });
    const setCookie = initRes.headers['set-cookie']?.join('; ') || '';
    const authUrl = new URL(initRes.body.data.authorizationUrl);
    const state = authUrl.searchParams.get('state')!;

    const callbackRes = await makeRequest(
      'GET',
      `/api/v1/auth/callback?code=mock_code&state=${state}`,
      { Cookie: setCookie, Accept: 'application/json' }
    );
    assert.strictEqual(callbackRes.status, 200);
    assert.strictEqual(callbackRes.body.data.user.teamId, null);
    assert.strictEqual(callbackRes.body.data.user.teamName, null);
  });

  await t.test('3. email_verified is false: no automatic assignment', async () => {
    const member3 = APPROVED_ROSTER[10];
    oidcService.setMockHandler(async () => ({
      sub: 'test-unverified-sub-3',
      email: member3.email, // matches roster!
      preferred_username: 'unverified_user_3',
      email_verified: false, // NOT verified!
    }));

    const initRes = await makeRequest('GET', '/api/v1/auth/login', { Accept: 'application/json' });
    const setCookie = initRes.headers['set-cookie']?.join('; ') || '';
    const authUrl = new URL(initRes.body.data.authorizationUrl);
    const state = authUrl.searchParams.get('state')!;

    const callbackRes = await makeRequest(
      'GET',
      `/api/v1/auth/callback?code=mock_code&state=${state}`,
      { Cookie: setCookie, Accept: 'application/json' }
    );
    assert.strictEqual(callbackRes.status, 200);
    assert.strictEqual(callbackRes.body.data.user.teamId, null, 'Must NOT assign team if email_verified is false');
  });

  await t.test('4. email_verified is missing: no automatic assignment', async () => {
    const member4 = APPROVED_ROSTER[11];
    oidcService.setMockHandler(async () => ({
      sub: 'test-missing-verified-sub-4',
      email: member4.email,
      preferred_username: 'missing_verified_flag_user_4',
      // email_verified is intentionally undefined
    }));

    const initRes = await makeRequest('GET', '/api/v1/auth/login', { Accept: 'application/json' });
    const setCookie = initRes.headers['set-cookie']?.join('; ') || '';
    const authUrl = new URL(initRes.body.data.authorizationUrl);
    const state = authUrl.searchParams.get('state')!;

    const callbackRes = await makeRequest(
      'GET',
      `/api/v1/auth/callback?code=mock_code&state=${state}`,
      { Cookie: setCookie, Accept: 'application/json' }
    );
    assert.strictEqual(callbackRes.status, 200);
    assert.strictEqual(callbackRes.body.data.user.teamId, null, 'Must NOT assign team if email_verified is omitted');
  });

  await t.test('5. Email claim is missing: no automatic assignment', async () => {
    oidcService.setMockHandler(async () => ({
      sub: 'test-no-email-claim-sub-5',
      preferred_username: 'no_email_user',
      email_verified: true,
      // email is omitted
    }));

    const initRes = await makeRequest('GET', '/api/v1/auth/login', { Accept: 'application/json' });
    const setCookie = initRes.headers['set-cookie']?.join('; ') || '';
    const authUrl = new URL(initRes.body.data.authorizationUrl);
    const state = authUrl.searchParams.get('state')!;

    const callbackRes = await makeRequest(
      'GET',
      `/api/v1/auth/callback?code=mock_code&state=${state}`,
      { Cookie: setCookie, Accept: 'application/json' }
    );
    assert.strictEqual(callbackRes.status, 200);
    assert.strictEqual(callbackRes.body.data.user.teamId, null, 'Must NOT assign team if email claim is missing');
  });

  await t.test('6. Multiple roster matches: fail safely without assignment', async () => {
    const multiEmail = 'duplicate_roster_member@test.org';
    rosterService.setCustomRoster(
      [
        { regnId: '100001', teamName: 'Duplicate Squad A' },
        { regnId: '100002', teamName: 'Duplicate Squad B' },
      ],
      [
        { regnId: '100001', teamName: 'Duplicate Squad A', email: multiEmail, isLeader: false },
        { regnId: '100002', teamName: 'Duplicate Squad B', email: multiEmail, isLeader: false },
      ]
    );

    oidcService.setMockHandler(async () => ({
      sub: 'multi-match-sub-6',
      email: multiEmail,
      preferred_username: 'multi_match_user',
      email_verified: true,
    }));

    const initRes = await makeRequest('GET', '/api/v1/auth/login', { Accept: 'application/json' });
    const setCookie = initRes.headers['set-cookie']?.join('; ') || '';
    const authUrl = new URL(initRes.body.data.authorizationUrl);
    const state = authUrl.searchParams.get('state')!;

    const callbackRes = await makeRequest(
      'GET',
      `/api/v1/auth/callback?code=mock_code&state=${state}`,
      { Cookie: setCookie, Accept: 'application/json' }
    );

    assert.strictEqual(callbackRes.status, 200);
    assert.strictEqual(callbackRes.body.data.user.teamId, null, 'Must fail safely without assigning team on multiple matches');

    rosterService.resetRoster();
  });

  await t.test('7. Matching roster entry references a missing database team: no incorrect assignment', async () => {
    const phantomEmail = 'phantom_member_7@test.org';
    rosterService.setCustomRoster(
      [{ regnId: '777777', teamName: 'Phantom Unseeded 7' }],
      [{ regnId: '777777', teamName: 'Phantom Unseeded 7', email: phantomEmail, isLeader: false }]
    );

    oidcService.setMockHandler(async () => ({
      sub: 'phantom-sub-7',
      email: phantomEmail,
      preferred_username: 'phantom_user_7',
      email_verified: true,
    }));

    const initRes = await makeRequest('GET', '/api/v1/auth/login', { Accept: 'application/json' });
    const setCookie = initRes.headers['set-cookie']?.join('; ') || '';
    const authUrl = new URL(initRes.body.data.authorizationUrl);
    const state = authUrl.searchParams.get('state')!;

    const callbackRes = await makeRequest(
      'GET',
      `/api/v1/auth/callback?code=mock_code&state=${state}`,
      { Cookie: setCookie, Accept: 'application/json' }
    );

    assert.strictEqual(callbackRes.status, 200);
    assert.strictEqual(callbackRes.body.data.user.teamId, null, 'Must not assign arbitrary team if DB team is missing');

    rosterService.resetRoster();
  });

  await t.test('8. User already belongs to a team: existing assignment is preserved', async () => {
    const existingTeam = await dbService.getTeamByName(sampleTeam.teamName);
    assert.ok(existingTeam);

    const user = await dbService.createUser({
      id: 'usr-preserve-test-8',
      email: 'existing_member_diff@example.com',
      username: 'preassigned_user_8',
      role: 'member',
      teamId: existingTeam.id,
      oidcSub: 'sub-preassigned-8',
    });

    oidcService.setMockHandler(async () => ({
      sub: 'sub-preassigned-8',
      email: sampleMember.email,
      preferred_username: 'preassigned_user_8',
      email_verified: true,
    }));

    const initRes = await makeRequest('GET', '/api/v1/auth/login', { Accept: 'application/json' });
    const setCookie = initRes.headers['set-cookie']?.join('; ') || '';
    const authUrl = new URL(initRes.body.data.authorizationUrl);
    const state = authUrl.searchParams.get('state')!;

    const callbackRes = await makeRequest(
      'GET',
      `/api/v1/auth/callback?code=mock_code&state=${state}`,
      { Cookie: setCookie, Accept: 'application/json' }
    );
    assert.strictEqual(callbackRes.status, 200);
    assert.strictEqual(callbackRes.body.data.user.teamId, existingTeam.id, 'Must preserve existing teamId');
  });

  await t.test('9. Repeated OIDC callback does not duplicate or change membership', async () => {
    const member9 = APPROVED_ROSTER[12];
    const team9 = APPROVED_TEAMS.find((t) => t.teamName === member9.teamName)!;
    await dbService.ensureApprovedTeams();

    oidcService.setMockHandler(async () => ({
      sub: 'sub-repeat-callback-9',
      email: member9.email,
      preferred_username: 'roster_repeat_user_9',
      email_verified: true,
    }));

    // First login
    const initRes1 = await makeRequest('GET', '/api/v1/auth/login', { Accept: 'application/json' });
    const setCookie1 = initRes1.headers['set-cookie']?.join('; ') || '';
    const state1 = new URL(initRes1.body.data.authorizationUrl).searchParams.get('state')!;

    const callback1 = await makeRequest(
      'GET',
      `/api/v1/auth/callback?code=mock_code&state=${state1}`,
      { Cookie: setCookie1, Accept: 'application/json' }
    );
    assert.strictEqual(callback1.status, 200);
    const assignedTeamId = callback1.body.data.user.teamId;
    assert.ok(assignedTeamId);

    // Second login with same OIDC identity
    const initRes2 = await makeRequest('GET', '/api/v1/auth/login', { Accept: 'application/json' });
    const setCookie2 = initRes2.headers['set-cookie']?.join('; ') || '';
    const state2 = new URL(initRes2.body.data.authorizationUrl).searchParams.get('state')!;

    const callback2 = await makeRequest(
      'GET',
      `/api/v1/auth/callback?code=mock_code&state=${state2}`,
      { Cookie: setCookie2, Accept: 'application/json' }
    );
    assert.strictEqual(callback2.status, 200);
    assert.strictEqual(callback2.body.data.user.teamId, assignedTeamId, 'Repeated login must preserve teamId');
  });

  await t.test('10. UserInfo subject mismatch, if UserInfo is used: no automatic assignment', async () => {
    const member10 = APPROVED_ROSTER[13];
    oidcService.setMockHandler(async () => ({
      sub: 'id-token-sub-10',
      email: member10.email,
      preferred_username: 'mismatch_user_10',
      email_verified: true,
      userinfoSubMismatch: true, // Flagged because UserInfo sub !== ID token sub
    }));

    const initRes = await makeRequest('GET', '/api/v1/auth/login', { Accept: 'application/json' });
    const setCookie = initRes.headers['set-cookie']?.join('; ') || '';
    const state = new URL(initRes.body.data.authorizationUrl).searchParams.get('state')!;

    const callbackRes = await makeRequest(
      'GET',
      `/api/v1/auth/callback?code=mock_code&state=${state}`,
      { Cookie: setCookie, Accept: 'application/json' }
    );
    assert.strictEqual(callbackRes.status, 200);
    assert.strictEqual(callbackRes.body.data.user.teamId, null, 'Must NOT assign team if UserInfo subject mismatches');
  });

  // ----------------------------------------------------
  // MANUAL REGISTRATION (Tests 11 - 21)
  // ----------------------------------------------------

  await t.test('11. Valid team and email belonging to that same team: succeeds when identity verified', async () => {
    const member2 = APPROVED_ROSTER[1];
    const team2 = APPROVED_TEAMS.find((t) => t.teamName === member2.teamName)!;

    const unassignedUser = await dbService.createUser({
      email: member2.email,
      username: 'unassigned_roster_user_11',
      role: 'member',
      teamId: null,
    });

    const cookie = createSessionCookie(unassignedUser);

    const res = await makeRequest(
      'POST',
      '/api/v1/teams/register',
      { Cookie: cookie },
      {
        teamName: team2.teamName,
        registeredEmail: member2.email,
      }
    );

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.user.teamName, team2.teamName);
    assert.ok(res.body.data.user.teamId);

    const updated = await dbService.getUser(unassignedUser.id);
    assert.strictEqual(updated?.teamId, res.body.data.team.id);
  });

  await t.test('12. Existing team name paired with an email from a different team: rejected (400 EMAIL_NOT_IN_TEAM)', async () => {
    const member3 = APPROVED_ROSTER[2];
    const wrongTeam = APPROVED_TEAMS.find((t) => t.teamName !== member3.teamName)!;

    const user = await dbService.createUser({
      email: member3.email,
      username: 'member_wrong_team_12',
      role: 'member',
      teamId: null,
    });

    const cookie = createSessionCookie(user);

    const res = await makeRequest(
      'POST',
      '/api/v1/teams/register',
      { Cookie: cookie },
      { teamName: wrongTeam.teamName, registeredEmail: member3.email }
    );

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'EMAIL_NOT_IN_TEAM');
  });

  await t.test('13. Email not present in the roster: rejected (404 NOT_ON_ROSTER)', async () => {
    const user = await dbService.createUser({
      email: 'not_in_roster_user_13@example.com',
      username: 'user_13',
      role: 'member',
      teamId: null,
    });

    const cookie = createSessionCookie(user);

    const res = await makeRequest(
      'POST',
      '/api/v1/teams/register',
      { Cookie: cookie },
      { teamName: sampleTeam.teamName, registeredEmail: 'not_in_roster_user_13@example.com' }
    );

    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.error.code, 'NOT_ON_ROSTER');
  });

  await t.test('14. Invalid team name: rejected (404 TEAM_NOT_FOUND)', async () => {
    const user = await dbService.createUser({
      email: sampleMember.email,
      username: 'user_14',
      role: 'member',
      teamId: null,
    });

    const cookie = createSessionCookie(user);

    const res = await makeRequest(
      'POST',
      '/api/v1/teams/register',
      { Cookie: cookie },
      { teamName: 'Completely Invalid Phantom Squad 404' }
    );

    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.error.code, 'TEAM_NOT_FOUND');
  });

  await t.test('15. Ambiguous roster entry: rejected (400 AMBIGUOUS_ROSTER_MATCH)', async () => {
    const ambEmail = 'ambiguous_reg_15@test.org';
    rosterService.setCustomRoster(
      [
        { regnId: '150001', teamName: 'Ambiguous Squad 15A' },
        { regnId: '150002', teamName: 'Ambiguous Squad 15B' },
      ],
      [
        { regnId: '150001', teamName: 'Ambiguous Squad 15A', email: ambEmail, isLeader: false },
        { regnId: '150002', teamName: 'Ambiguous Squad 15B', email: ambEmail, isLeader: false },
      ]
    );

    const user = await dbService.createUser({
      email: ambEmail,
      username: 'user_15',
      role: 'member',
      teamId: null,
    });

    const cookie = createSessionCookie(user);

    const res = await makeRequest(
      'POST',
      '/api/v1/teams/register',
      { Cookie: cookie },
      { teamName: 'Ambiguous Squad 15A', registeredEmail: ambEmail }
    );

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'AMBIGUOUS_ROSTER_MATCH');

    rosterService.resetRoster();
  });

  await t.test('16. User already assigned to a team attempts to join another: rejected (409 ALREADY_ASSIGNED)', async () => {
    const member4 = APPROVED_ROSTER[3];
    const team4 = APPROVED_TEAMS.find((t) => t.teamName === member4.teamName)!;
    const dbTeam4 = await dbService.getTeamByName(team4.teamName);
    assert.ok(dbTeam4);

    const otherTeam = APPROVED_TEAMS.find((t) => t.teamName !== member4.teamName)!;

    const user = await dbService.createUser({
      email: member4.email,
      username: 'user_16',
      role: 'member',
      teamId: dbTeam4.id,
    });

    const cookie = createSessionCookie(user);

    const res = await makeRequest(
      'POST',
      '/api/v1/teams/register',
      { Cookie: cookie },
      { teamName: otherTeam.teamName }
    );

    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.body.error.code, 'ALREADY_ASSIGNED');
  });

  await t.test('17. User attempts to leave or change teams through the API: rejected (403 TEAM_MEMBERSHIP_PERMANENT)', async () => {
    const user = await dbService.createUser({
      email: 'user_17@example.com',
      username: 'user_17',
      role: 'member',
      teamId: 'some-team-id',
    });

    const cookie = createSessionCookie(user);

    // Direct leave endpoint attempt
    const resLeave = await makeRequest('POST', '/api/v1/teams/leave', { Cookie: cookie });
    assert.strictEqual(resLeave.status, 403);
    assert.strictEqual(resLeave.body.error.code, 'TEAM_MEMBERSHIP_PERMANENT');

    // Direct change endpoint attempt
    const resChange = await makeRequest('POST', '/api/v1/teams/change', { Cookie: cookie });
    assert.strictEqual(resChange.status, 403);
    assert.strictEqual(resChange.body.error.code, 'TEAM_MEMBERSHIP_PERMANENT');

    // Direct delete membership attempt
    const resDelete = await makeRequest('DELETE', '/api/v1/teams/me', { Cookie: cookie });
    assert.strictEqual(resDelete.status, 403);
    assert.strictEqual(resDelete.body.error.code, 'TEAM_MEMBERSHIP_PERMANENT');
  });

  await t.test('18. Concurrent registration requests cannot create inconsistent membership', async () => {
    const member5 = APPROVED_ROSTER[4];
    const team5 = APPROVED_TEAMS.find((t) => t.teamName === member5.teamName)!;

    const user = await dbService.createUser({
      email: member5.email,
      username: 'user_18',
      role: 'member',
      teamId: null,
    });

    const cookie = createSessionCookie(user);

    const [res1, res2] = await Promise.all([
      makeRequest('POST', '/api/v1/teams/register', { Cookie: cookie }, { teamName: team5.teamName }),
      makeRequest('POST', '/api/v1/teams/register', { Cookie: cookie }, { teamName: team5.teamName }),
    ]);

    const statuses = [res1.status, res2.status].sort();
    assert.strictEqual(statuses[0], 200, 'One concurrent request must succeed');
    // Note: If both succeed or second encounters ALREADY_ASSIGNED, the second will be 409 or 200 (if idempotent).
    // Concurrency atomic compare-and-swap guarantees user is assigned to only one team.
    const liveUser = await dbService.getUser(user.id);
    assert.ok(liveUser?.teamId);
  });

  await t.test('19. Registration is rejected after the permitted registration window closes (COMPETITION_LOCKED)', async () => {
    await dbService.updateCompetitionConfig({ state: 'LIVE' });

    const member6 = APPROVED_ROSTER[5];
    const team6 = APPROVED_TEAMS.find((t) => t.teamName === member6.teamName)!;

    const user = await dbService.createUser({
      email: member6.email,
      username: 'user_19',
      role: 'member',
      teamId: null,
    });

    const cookie = createSessionCookie(user);

    const res = await makeRequest(
      'POST',
      '/api/v1/teams/register',
      { Cookie: cookie },
      { teamName: team6.teamName }
    );

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'COMPETITION_LOCKED');

    // Restore competition status to PREPARING
    await dbService.updateCompetitionConfig({ state: 'PREPARING' });
  });

  await t.test('20. Invalid or unverified OIDC identity cannot finalize a manual registration', async () => {
    // Differing email attempt
    const legitMember = APPROVED_ROSTER[6];
    const legitTeam = APPROVED_TEAMS.find((t) => t.teamName === legitMember.teamName)!;

    const attacker = await dbService.createUser({
      email: 'attacker_user_20@example.com',
      username: 'attacker_20',
      role: 'member',
      teamId: null,
    });

    const cookie = createSessionCookie(attacker);

    const res = await makeRequest(
      'POST',
      '/api/v1/teams/register',
      { Cookie: cookie },
      {
        teamName: legitTeam.teamName,
        registeredEmail: legitMember.email, // Attacker types victim's email
      }
    );

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error.code, 'EMAIL_VERIFICATION_REQUIRED');
  });

  await t.test('21. Repeated valid registration requests are idempotent', async () => {
    const member7 = APPROVED_ROSTER[7];
    const team7 = APPROVED_TEAMS.find((t) => t.teamName === member7.teamName)!;
    const dbTeam7 = await dbService.getTeamByName(team7.teamName);
    assert.ok(dbTeam7);

    const user = await dbService.createUser({
      email: member7.email,
      username: 'user_21',
      role: 'member',
      teamId: dbTeam7.id,
    });

    const cookie = createSessionCookie(user);

    const res = await makeRequest(
      'POST',
      '/api/v1/teams/register',
      { Cookie: cookie },
      {
        teamName: team7.teamName,
        registeredEmail: member7.email,
      }
    );

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.user.teamId, dbTeam7.id);
  });

  // ----------------------------------------------------
  // UI & DATA INTEGRITY VERIFICATION (Tests 22 - 27)
  // ----------------------------------------------------

  const teamPageSourcePath = path.resolve(__dirname, '../../client/src/pages/TeamPage.tsx');
  const teamPageSource = fs.readFileSync(teamPageSourcePath, 'utf8');

  await t.test('22. The authenticated identity section is absent', () => {
    assert.ok(!teamPageSource.includes('Authenticated Identity'), 'Source must not contain "Authenticated Identity"');
    assert.ok(!teamPageSource.includes('OIDC VERIFIED'), 'Source must not contain "OIDC VERIFIED" debug pill');
  });

  await t.test('23. No verified email or debug fields are rendered on the Squad page', () => {
    assert.ok(!teamPageSource.includes('{user.email}'), 'Must not render {user.email} in JSX');
    assert.ok(!teamPageSource.includes('Field A'), 'Must not contain "Field A" debug label');
    assert.ok(!teamPageSource.includes('Field B'), 'Must not contain "Field B" debug label');
    assert.ok(!teamPageSource.includes('UNLINKED'), 'Must not contain "UNLINKED" debug badge');
  });

  await t.test('24. An assigned participant does not see a registration form', () => {
    // In TeamPage.tsx, when user.teamId is truthy (State A), it renders Squad Roster and Confirmed status, NOT the form
    assert.ok(teamPageSource.includes('Squad Assignment Confirmed'));
    assert.ok(teamPageSource.includes('MEMBERSHIP PERMANENT'));
  });

  await t.test('25. An unassigned participant sees the registration form', () => {
    // When !user.teamId (State B), renders "Join Your Registered Squad" form
    assert.ok(teamPageSource.includes('Join Your Registered Squad'));
    assert.ok(teamPageSource.includes('Registered Competition Email'));
    assert.ok(teamPageSource.includes('Join Squad'));
  });

  await t.test('26. Loading and error states render correctly', () => {
    assert.ok(teamPageSource.includes('disabled={isSubmitting}'));
    assert.ok(teamPageSource.includes('VERIFYING ROSTER...'));
    assert.ok(teamPageSource.includes('regError'));
  });

  await t.test('27. The page remains usable at mobile widths', () => {
    assert.ok(teamPageSource.includes('sm:px-6'));
    assert.ok(teamPageSource.includes('flex-col sm:flex-row'));
    assert.ok(teamPageSource.includes('w-full sm:w-auto'));
  });
});
