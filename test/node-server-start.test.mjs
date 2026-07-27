import assert from 'node:assert/strict';
import { once } from 'node:events';
import { request } from 'node:http';
import { spawn } from 'node:child_process';
import test from 'node:test';

async function get(port, path) {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path }, (response) => {
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
    env: { ...process.env, PORT: String(port), PLANNER_ALLOW_UNAUTHENTICATED_LOCAL: '1' },
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
