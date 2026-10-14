import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import app from '../../api/index';
import { prisma } from '../src/lib/prisma';
import { dbService } from '../src/services/db.service';

// Helper to simulate Vercel serverless request dispatch
function invokeServerless(
  method: string,
  url: string,
  headers: Record<string, string> = {},
  body?: any
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }> {
  return new Promise((resolve, reject) => {
    // Create an ephemeral server with our exported handler to test exact HTTP semantics
    const server = http.createServer((req, res) => {
      app(req, res);
    });

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as { port: number };
      const reqHeaders: Record<string, string> = { ...headers };
      let payload: string | undefined;

      if (body) {
        payload = typeof body === 'string' ? body : JSON.stringify(body);
        reqHeaders['Content-Type'] = 'application/json';
        reqHeaders['Content-Length'] = Buffer.byteLength(payload).toString();
      }

      const clientReq = http.request(
        {
          hostname: '127.0.0.1',
          port: addr.port,
          path: url,
          method,
          headers: reqHeaders,
        },
        (res) => {
          let rawData = '';
          res.on('data', (chunk) => {
            rawData += chunk;
          });
          res.on('end', () => {
            server.close(() => {
              let parsed = rawData;
              try {
                parsed = JSON.parse(rawData);
              } catch {
                // Return string if not JSON
              }
              resolve({
                status: res.statusCode || 500,
                headers: res.headers,
                body: parsed,
              });
            });
          });
        }
      );

      clientReq.on('error', (err) => {
        server.close(() => reject(err));
      });

      if (payload) {
        clientReq.write(payload);
      }
      clientReq.end();
    });
  });
}

describe('VERCEL SERVERLESS FUNCTION: Entry Point & Routing Compatibility', () => {
  before(async () => {
    await dbService.initStorage();
    await dbService.seedDevFixtures();
  });

  it('api/index.ts exports a valid Express application function', () => {
    assert.equal(typeof app, 'function');
  });

  it('PrismaClient is cached on global for warm serverless execution', () => {
    assert.ok(global.__prismaClient);
    assert.equal(global.__prismaClient, prisma);
  });

  it('Root API status (/api) responds with HTTP 200', async () => {
    const res = await invokeServerless('GET', '/api');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.service, 'foss-ctf-api');
  });

  it('Direct health endpoint (/health) responds with HTTP 200', async () => {
    const res = await invokeServerless('GET', '/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
  });

  it('Standard API v1 health endpoint (/api/v1/health) responds with HTTP 200', async () => {
    const res = await invokeServerless('GET', '/api/v1/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
  });

  it('Stripped rewrite path (/v1/health) responds with HTTP 200', async () => {
    const res = await invokeServerless('GET', '/v1/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
  });

  it('Challenge catalog is accessible via serverless entry (/api/v1/challenges)', async () => {
    const res = await invokeServerless('GET', '/api/v1/challenges');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.challenges));
  });

  it('Competition readiness is accessible via serverless entry (/api/v1/competition/readiness)', async () => {
    const res = await invokeServerless('GET', '/api/v1/competition/readiness');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  it('Session verification (/api/v1/auth/me) returns null user for unauthenticated serverless requests', async () => {
    const res = await invokeServerless('GET', '/api/v1/auth/me');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.deepEqual(res.body.data, { user: null, team: null });
  });

  it('Unmapped routes return structured 404 error through serverless entry', async () => {
    const res = await invokeServerless('GET', '/api/v1/non-existent-route-xyz');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });

  it('Cross-origin requests from https://ctf.fossclub.tech receive credentialed CORS headers', async () => {
    const res = await invokeServerless('GET', '/api/v1/health', {
      Origin: 'https://ctf.fossclub.tech',
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers['access-control-allow-origin'], 'https://ctf.fossclub.tech');
    assert.equal(res.headers['access-control-allow-credentials'], 'true');
  });

  it('Cross-origin preflight OPTIONS requests return permitted methods and headers', async () => {
    const res = await invokeServerless('OPTIONS', '/api/v1/challenges', {
      Origin: 'https://ctf.fossclub.tech',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type, Authorization',
    });
    assert.equal(res.status, 204);
    assert.equal(res.headers['access-control-allow-origin'], 'https://ctf.fossclub.tech');
    assert.equal(res.headers['access-control-allow-credentials'], 'true');
    assert.ok(res.headers['access-control-allow-methods']?.includes('POST'));
    assert.ok(res.headers['access-control-allow-headers']?.includes('Authorization'));
  });

  it('Authenticates serverless requests using Authorization: Bearer token (3rd-party cookie fallback)', async () => {
    const { signToken } = await import('../src/utils/crypto');
    const { DEV_PARTICIPANTS } = await import('../src/fixtures/devRoster');
    const devUser = DEV_PARTICIPANTS[0];

    const token = signToken({
      id: devUser.id,
      email: devUser.email,
      username: devUser.username,
      role: devUser.role,
      teamId: devUser.teamId,
    });

    const res = await invokeServerless('GET', '/api/v1/auth/me', {
      Authorization: `Bearer ${token}`,
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.email, devUser.email);
    assert.equal(res.body.data.user.username, devUser.username);
    assert.equal(res.body.data.user.teamId, devUser.teamId);
  });
});
