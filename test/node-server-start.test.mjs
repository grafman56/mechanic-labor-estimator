import assert from 'node:assert/strict';
import { once } from 'node:events';
import { request } from 'node:http';
import { spawn } from 'node:child_process';
import test from 'node:test';

async function get(port, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path, headers }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('starts the Node server on PORT and serves the planner without caching', async (t) => {
  const port = 19099;
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', PLANNER_ALLOW_UNAUTHENTICATED_LOCAL: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => child.kill());

  const ready = await Promise.race([
    once(child.stdout, 'data').then(() => true),
    once(child, 'exit').then(([code]) => {
      throw new Error(`server exited before listening (code ${code})`);
    }),
  ]);
  assert.equal(ready, true);
  const response = await get(port, '/');

  assert.equal(response.status, 200);
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.match(response.body, /Mechanic Labor Planner/);
});

test('requires the configured test credential in hosted mode', async (t) => {
  const port = 19100;
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, PORT: String(port), PLANNER_TEST_USER: 'friend', PLANNER_TEST_PASSWORD: 'secret' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => child.kill());
  await once(child.stdout, 'data');

  const denied = await get(port, '/');
  const allowed = await get(port, '/', { authorization: 'Basic ZnJpZW5kOnNlY3JldA==' });

  assert.equal(denied.status, 401);
  assert.equal(denied.headers['www-authenticate'], 'Basic realm="Mechanic Labor Planner"');
  assert.equal(allowed.status, 200);
});

test('rate limits API requests before route handling without limiting static assets', async (t) => {
  const port = 19101;
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: new URL('..', import.meta.url),
    env: {
      ...process.env,
      PORT: String(port),
      HOST: '127.0.0.1',
      PLANNER_ALLOW_UNAUTHENTICATED_LOCAL: '1',
      PLANNER_RATE_LIMIT_REQUESTS: '1',
      PLANNER_RATE_LIMIT_WINDOW_SECONDS: '60',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => child.kill());
  await once(child.stdout, 'data');

  const firstApiResponse = await get(port, '/api/not-a-route');
  const limitedApiResponse = await get(port, '/api/not-a-route');
  const staticResponse = await get(port, '/');

  assert.equal(firstApiResponse.status, 404);
  assert.equal(limitedApiResponse.status, 429);
  assert.equal(limitedApiResponse.headers['retry-after'], '60');
  assert.equal(limitedApiResponse.headers['cache-control'], 'no-store');
  assert.equal(staticResponse.status, 200);
});

test('rejects invalid VIN API input without exposing a source lookup', async (t) => {
  const port = 19103;
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', PLANNER_ALLOW_UNAUTHENTICATED_LOCAL: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => child.kill());
  await once(child.stdout, 'data');

  const response = await get(port, '/api/vin-manuals?vin=1HGCM82633A00%2F352');

  assert.equal(response.status, 400);
  assert.deepEqual(JSON.parse(response.body), { error: 'VIN must be 17 characters and cannot contain I, O, or Q.' });
  assert.equal(response.headers['cache-control'], 'no-store');
});

test('rejects an invalid manual URL API input before source lookup', async (t) => {
  const port = 19104;
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', PLANNER_ALLOW_UNAUTHENTICATED_LOCAL: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => child.kill());
  await once(child.stdout, 'data');

  const response = await get(port, '/api/manual-metadata?url=https%3A%2F%2Fexample.com%2F');

  assert.equal(response.status, 400);
  assert.deepEqual(JSON.parse(response.body), { error: 'Unsupported manual URL' });
  assert.equal(response.headers['cache-control'], 'no-store');
});

test('does not serve application source, tests, or private repository paths', async (t) => {
  const port = 19102;
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', PLANNER_ALLOW_UNAUTHENTICATED_LOCAL: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => child.kill());
  await once(child.stdout, 'data');

  for (const path of ['/server.py', '/src/server/auth.mjs', '/test/rate-limit.test.mjs', '/.git/HEAD', '/.hermes/handoffs/']) {
    assert.equal((await get(port, path)).status, 404, path);
  }
});
