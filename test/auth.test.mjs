import assert from 'node:assert/strict';
import test from 'node:test';
import { authorizeBasic, hostedAuthConfig } from '../src/server/auth.mjs';

test('rejects hosted startup when either test credential is absent', () => {
  assert.throws(() => hostedAuthConfig({}), /PLANNER_TEST_USER and PLANNER_TEST_PASSWORD/);
  assert.throws(() => hostedAuthConfig({ PLANNER_TEST_USER: 'friend' }), /PLANNER_TEST_USER and PLANNER_TEST_PASSWORD/);
});

test('permits unauthenticated local mode only with an explicit loopback opt-in', () => {
  assert.deepEqual(hostedAuthConfig({ PLANNER_ALLOW_UNAUTHENTICATED_LOCAL: '1' }, true), { localUnauthenticated: true });
  assert.throws(() => hostedAuthConfig({ PLANNER_ALLOW_UNAUTHENTICATED_LOCAL: '1' }, false), /PLANNER_TEST_USER and PLANNER_TEST_PASSWORD/);
});

test('authorizes only the configured Basic credential', () => {
  const config = hostedAuthConfig({ PLANNER_TEST_USER: 'friend', PLANNER_TEST_PASSWORD: 'secret' });
  assert.equal(authorizeBasic('Basic ZnJpZW5kOnNlY3JldA==', config), true);
  assert.equal(authorizeBasic('Basic ZnJpZW5kOndyb25n', config), false);
  assert.equal(authorizeBasic('Bearer token', config), false);
  assert.equal(authorizeBasic(undefined, config), false);
});
