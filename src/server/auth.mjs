import { timingSafeEqual } from 'node:crypto';

const requiredMessage = 'PLANNER_TEST_USER and PLANNER_TEST_PASSWORD are required for hosted mode.';

export function hostedAuthConfig(environment, isLoopback = false) {
  if (environment.PLANNER_ALLOW_UNAUTHENTICATED_LOCAL === '1' && isLoopback) {
    return { localUnauthenticated: true };
  }
  const username = environment.PLANNER_TEST_USER;
  const password = environment.PLANNER_TEST_PASSWORD;
  if (!username || !password) throw new Error(requiredMessage);
  return { username, password, localUnauthenticated: false };
}

export function authorizeBasic(header, config) {
  if (config.localUnauthenticated) return true;
  if (typeof header !== 'string' || !header.startsWith('Basic ')) return false;
  const encoded = header.slice('Basic '.length);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return false;
  const supplied = Buffer.from(encoded, 'base64');
  const expected = Buffer.from(`${config.username}:${config.password}`);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
