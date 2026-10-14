import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app';
import { config, validateProductionConfig, DEV_DEFAULT_SECRETS } from '../src/config/index';
import { dbService } from '../src/services/db.service';
import { signToken } from '../src/utils/crypto';
import { validateSchemaIsolationUrls } from '../src/scripts/validateMigrationIsolation';
import type { Server } from 'http';

let server: Server;
let baseUrl: string;

describe('RELIABILITY & SECURITY: Database, CORS, Secrets, Rate Limiting, and Auth', () => {
  before(async () => {
    // Start test server on dynamic port
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        if (typeof address === 'object' && address) {
          baseUrl = `http://localhost:${address.port}`;
        }
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  beforeEach(() => {
    dbService.setStorageDriver('memory');
  });

  // -------------------------------------------------------------
  // PART 1: Database Storage Reliability
  // -------------------------------------------------------------
  describe('Database Reliability & Driver Isolation', () => {
    it('Refuses to permit in-memory driver when in production mode', async () => {
      const originalEnv = config.nodeEnv;
      (config as any).nodeEnv = 'production';
      dbService.setStorageDriver('memory');

      await assert.rejects(
        async () => {
          await dbService.initStorage();
        },
        /STORAGE_DRIVER=memory is strictly forbidden in production mode/
      );

      (config as any).nodeEnv = originalEnv;
      dbService.setStorageDriver('memory');
    });

    it('Fails startup in production mode if PostgreSQL cannot be reached', async () => {
      const originalEnv = config.nodeEnv;
      (config as any).nodeEnv = 'production';
      dbService.setStorageDriver(null); // allow auto-detection

      await assert.rejects(
        async () => {
          await dbService.initStorage();
        },
        /Failed to connect to PostgreSQL database/
      );

      (config as any).nodeEnv = originalEnv;
      dbService.setStorageDriver('memory');
    });

    it('Correctly reports storage driver and preserves driver consistency', () => {
      dbService.setStorageDriver('memory');
      assert.equal(dbService.getStorageDriver(), 'memory');

      dbService.setStorageDriver('postgres');
      assert.equal(dbService.getStorageDriver(), 'postgres');

      dbService.setStorageDriver('memory');
    });

    it('Pre-flight migration validator strictly rejects missing DIRECT_URL', () => {
      const res = validateSchemaIsolationUrls({
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/fossctf?schema=ctf',
      });
      assert.equal(res.valid, false);
      assert.ok(res.errors.some((e) => e.includes('DIRECT_URL is missing or empty')));
    });

    it('Pre-flight migration validator strictly rejects DIRECT_URL without ?schema=ctf', () => {
      const res = validateSchemaIsolationUrls({
        DIRECT_URL: 'postgresql://postgres:postgres@localhost:5432/fossctf',
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/fossctf?schema=ctf',
      });
      assert.equal(res.valid, false);
      assert.ok(res.errors.some((e) => e.includes('missing "?schema=ctf" parameter')));
    });

    it('Pre-flight migration validator strictly rejects DIRECT_URL targeting public schema', () => {
      const res = validateSchemaIsolationUrls({
        DIRECT_URL: 'postgresql://postgres:postgres@localhost:5432/fossctf?schema=public',
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/fossctf?schema=ctf',
      });
      assert.equal(res.valid, false);
      assert.ok(res.errors.some((e) => e.includes('must strictly target "?schema=ctf"')));
    });

    it('Pre-flight migration validator strictly rejects DATABASE_URL without ?schema=ctf', () => {
      const res = validateSchemaIsolationUrls({
        DIRECT_URL: 'postgresql://postgres:postgres@localhost:5432/fossctf?schema=ctf',
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/fossctf?schema=public',
      });
      assert.equal(res.valid, false);
      assert.ok(res.errors.some((e) => e.includes('must strictly target "?schema=ctf"')));
    });

    it('Pre-flight migration validator passes when both URLs target ?schema=ctf', () => {
      const res = validateSchemaIsolationUrls({
        DIRECT_URL: 'postgresql://postgres:postgres@localhost:5432/fossctf?schema=ctf',
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:6543/fossctf?pgbouncer=true&schema=ctf',
      });
      assert.equal(res.valid, true);
      assert.equal(res.errors.length, 0);
      assert.equal(res.details.directUrlSchema, 'ctf');
      assert.equal(res.details.databaseUrlSchema, 'ctf');
    });
  });

  // -------------------------------------------------------------
  // PART 2: Production Secrets Validation
  // -------------------------------------------------------------
  describe('Production Secrets & Config Validation', () => {
    it('Permits default secrets in development mode without throwing', () => {
      const originalEnv = config.nodeEnv;
      (config as any).nodeEnv = 'development';
      assert.doesNotThrow(() => {
        validateProductionConfig();
      });
      (config as any).nodeEnv = originalEnv;
    });

    it('Rejects production startup if JWT_SECRET is using the dev default', () => {
      const originalEnv = config.nodeEnv;
      const originalSecret = process.env.JWT_SECRET;
      (config as any).nodeEnv = 'production';
      process.env.JWT_SECRET = DEV_DEFAULT_SECRETS.jwtSecret;

      assert.throws(
        () => {
          validateProductionConfig();
        },
        /JWT_SECRET must be set to a secure, unique string in production/
      );

      (config as any).nodeEnv = originalEnv;
      process.env.JWT_SECRET = originalSecret;
    });

    it('Rejects production startup if FLAG_PEPPER is missing or dev default', () => {
      const originalEnv = config.nodeEnv;
      const originalPepper = process.env.FLAG_PEPPER;
      (config as any).nodeEnv = 'production';
      process.env.FLAG_PEPPER = DEV_DEFAULT_SECRETS.flagPepper;

      assert.throws(
        () => {
          validateProductionConfig();
        },
        /FLAG_PEPPER must be set to a secure, unique string in production/
      );

      (config as any).nodeEnv = originalEnv;
      process.env.FLAG_PEPPER = originalPepper;
    });

    it('Rejects production startup if ENABLE_DEV_AUTH is true', () => {
      const originalEnv = config.nodeEnv;
      const originalDevAuth = process.env.ENABLE_DEV_AUTH;
      (config as any).nodeEnv = 'production';
      process.env.ENABLE_DEV_AUTH = 'true';

      assert.throws(
        () => {
          validateProductionConfig();
        },
        /ENABLE_DEV_AUTH must not be enabled in production/
      );

      (config as any).nodeEnv = originalEnv;
      process.env.ENABLE_DEV_AUTH = originalDevAuth;
    });
  });

  // -------------------------------------------------------------
  // PART 3: CORS Enforcement in Production
  // -------------------------------------------------------------
  describe('CORS Production Origin Policy', () => {
    it('Permits requests from trusted production origin', async () => {
      const res = await fetch(`${baseUrl}/api/v1/health`, {
        method: 'GET',
        headers: {
          Origin: 'https://ctf.fossclub.tech',
        },
      });
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('access-control-allow-origin'), 'https://ctf.fossclub.tech');
    });

    it('Permits requests with no Origin header (curl / server-to-server)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/health`, {
        method: 'GET',
      });
      assert.equal(res.status, 200);
    });

    it('Rejects unauthorized origins when in production mode', async () => {
      const originalEnv = config.nodeEnv;
      const originalIsDev = config.isDev;
      (config as any).nodeEnv = 'production';
      (config as any).isDev = false;

      const res = await fetch(`${baseUrl}/api/v1/health`, {
        method: 'GET',
        headers: {
          Origin: 'https://malicious-attacker-site.com',
        },
      });

      // Should be rejected with 403 Forbidden
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.equal(data.error?.code, 'CORS_DISALLOWED');

      (config as any).nodeEnv = originalEnv;
      (config as any).isDev = originalIsDev;
    });
  });

  // -------------------------------------------------------------
  // PART 4: Submission Rate Limiting
  // -------------------------------------------------------------
  describe('Flag Submission Rate Limiting', () => {
    it('Throttles excessive flag submission attempts on challenge submit route (HTTP 429)', async () => {
      // Authenticate as Alice (Binary Beasts team)
      const token = signToken({
        id: 'usr-alice-02',
        email: 'alice@university.edu',
        username: 'alice_sec',
        role: 'USER',
        teamId: 'team-binary-beasts',
      });

      let hit429 = false;
      let lastStatus = 200;

      // Submit 15 attempts in rapid succession (limit is 10 per 30s)
      for (let i = 0; i < 15; i++) {
        const res = await fetch(`${baseUrl}/api/v1/challenges/chal-valenfind-competition/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: `foss_session=${token}`,
            'x-test-rate-limit': 'true',
          },
          body: JSON.stringify({ flag: `FOSSCTF{wrong_flag_guess_${i}}` }),
        });

        lastStatus = res.status;
        if (res.status === 429) {
          hit429 = true;
          const body = await res.json();
          assert.equal(body.error?.code, 'TOO_MANY_FLAG_SUBMISSIONS');
          assert.ok(res.headers.get('Retry-After'));
          break;
        }
      }

      assert.ok(hit429, `Expected rate limiter to trigger HTTP 429, last status was ${lastStatus}`);
    });
  });

  // -------------------------------------------------------------
  // PART 5: Stale Authorization & Real-Time Role/Team Refresh
  // -------------------------------------------------------------
  describe('Dynamic Auth Re-validation & Stale Token Prevention', () => {
    it('Refreshes teamId and role in real time from DB without requiring token re-issue', async () => {
      // Charlie initially has teamId: null
      const charlieUser = await dbService.getUser('usr-charlie-04');
      assert.ok(charlieUser);
      assert.equal(charlieUser.teamId, null);

      // Charlie signs a token with teamId: null
      const tokenWithNullTeam = signToken({
        id: 'usr-charlie-04',
        email: 'charlie@university.edu',
        username: 'charlie_solo',
        role: 'USER',
        teamId: null,
      });

      // Initially verify Charlie has no team
      const meResBefore = await fetch(`${baseUrl}/api/v1/auth/me`, {
        headers: { Cookie: `foss_session=${tokenWithNullTeam}` },
      });
      const meDataBefore = await meResBefore.json();
      assert.equal(meDataBefore.data.user.teamId, null);

      // Administrator assigns Charlie to team-binary-beasts
      await dbService.assignUserToTeam('usr-charlie-04', 'team-binary-beasts');

      // Next request using the EXACT SAME OLD TOKEN should now reflect updated teamId!
      const meResAfter = await fetch(`${baseUrl}/api/v1/auth/me`, {
        headers: { Cookie: `foss_session=${tokenWithNullTeam}` },
      });
      const meDataAfter = await meResAfter.json();
      assert.equal(meDataAfter.data.user.teamId, 'team-binary-beasts');

      // Clean up: reset Charlie back to null
      await dbService.assignUserToTeam('usr-charlie-04', null);
    });

    it('Admin can assign and remove a user from a team via admin routes', async () => {
      const adminToken = signToken({
        id: 'usr-admin-01',
        email: 'admin@fossclub.tech',
        username: 'foss_admin',
        role: 'ADMIN',
        teamId: null,
      });

      const participantToken = signToken({
        id: 'usr-alice-02',
        email: 'alice@university.edu',
        username: 'alice_sec',
        role: 'USER',
        teamId: 'team-binary-beasts',
      });

      // 1. Participant is rejected with 403
      const participantAssignRes = await fetch(`${baseUrl}/api/v1/admin/teams/team-null-pointers/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `foss_session=${participantToken}`,
        },
        body: JSON.stringify({ userId: 'usr-charlie-04' }),
      });
      assert.equal(participantAssignRes.status, 403);

      // 2. Nonexistent user returns 404 USER_NOT_FOUND
      const notFoundRes = await fetch(`${baseUrl}/api/v1/admin/teams/team-null-pointers/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `foss_session=${adminToken}`,
        },
        body: JSON.stringify({ userId: 'usr-nonexistent-99' }),
      });
      assert.equal(notFoundRes.status, 404);
      const notFoundBody = await notFoundRes.json();
      assert.equal(notFoundBody.error?.code, 'USER_NOT_FOUND');

      // 3. Assign charlie to team-null-pointers
      const assignRes = await fetch(`${baseUrl}/api/v1/admin/teams/team-null-pointers/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `foss_session=${adminToken}`,
        },
        body: JSON.stringify({ userId: 'usr-charlie-04' }),
      });
      assert.equal(assignRes.status, 200);
      const assignData = await assignRes.json();
      assert.equal(assignData.success, true);
      assert.equal(assignData.data.teamId, 'team-null-pointers');

      // Verify charlie's live team
      const updatedCharlie = await dbService.getUser('usr-charlie-04');
      assert.equal(updatedCharlie?.teamId, 'team-null-pointers');

      // 4. Reassigning charlie to team-binary-beasts atomically moves him (cannot be in two teams)
      const moveRes = await fetch(`${baseUrl}/api/v1/admin/teams/team-binary-beasts/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `foss_session=${adminToken}`,
        },
        body: JSON.stringify({ userId: 'usr-charlie-04' }),
      });
      assert.equal(moveRes.status, 200);
      const movedCharlie = await dbService.getUser('usr-charlie-04');
      assert.equal(movedCharlie?.teamId, 'team-binary-beasts');

      // 5. Remove charlie from team-binary-beasts
      const removeRes = await fetch(
        `${baseUrl}/api/v1/admin/teams/team-binary-beasts/members/usr-charlie-04`,
        {
          method: 'DELETE',
          headers: { Cookie: `foss_session=${adminToken}` },
        }
      );
      assert.equal(removeRes.status, 200);

      const resetCharlie = await dbService.getUser('usr-charlie-04');
      assert.equal(resetCharlie?.teamId, null);
    });
  });
});
