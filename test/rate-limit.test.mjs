import assert from 'node:assert/strict';
import test from 'node:test';
import { FixedWindowRateLimiter, rateLimitConfig } from '../src/server/rate-limit.mjs';

test('uses safe rate-limit defaults and rejects invalid deployment overrides', () => {
  assert.deepEqual(rateLimitConfig({}), { limit: 20, windowSeconds: 60 });
  assert.deepEqual(rateLimitConfig({ PLANNER_RATE_LIMIT_REQUESTS: '4', PLANNER_RATE_LIMIT_WINDOW_SECONDS: '30' }), {
    limit: 4,
    windowSeconds: 30,
  });
  assert.throws(() => rateLimitConfig({ PLANNER_RATE_LIMIT_REQUESTS: '0' }), /PLANNER_RATE_LIMIT_REQUESTS/);
  assert.throws(() => rateLimitConfig({ PLANNER_RATE_LIMIT_WINDOW_SECONDS: '1.5' }), /PLANNER_RATE_LIMIT_WINDOW_SECONDS/);
});

test('allows requests until the configured fixed-window budget is exhausted', () => {
  const now = [1_000];
  const limiter = new FixedWindowRateLimiter({ limit: 2, windowSeconds: 60, now: () => now[0] });

  assert.deepEqual(limiter.check('127.0.0.1'), { allowed: true });
  assert.deepEqual(limiter.check('127.0.0.1'), { allowed: true });
  assert.deepEqual(limiter.check('127.0.0.1'), { allowed: false, retryAfterSeconds: 60 });
});

test('resets the request budget after the configured window', () => {
  const now = [1_000];
  const limiter = new FixedWindowRateLimiter({ limit: 1, windowSeconds: 60, now: () => now[0] });

  assert.equal(limiter.check('127.0.0.1').allowed, true);
  now[0] += 60;
  assert.equal(limiter.check('127.0.0.1').allowed, true);
});
