import assert from 'node:assert/strict';
import test from 'node:test';
import { ManualAvailabilityCache } from '../src/server/manual-availability-cache.mjs';

const manualUrl = 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/';

test('reuses a recent successful availability probe', async () => {
  const now = [1_000];
  const cache = new ManualAvailabilityCache({ now: () => now[0] });
  let probes = 0;

  const first = await cache.lookup(manualUrl, async () => { probes += 1; return true; });
  now[0] += 60;
  const second = await cache.lookup(manualUrl, async () => { probes += 1; return false; });

  assert.equal(probes, 1);
  assert.deepEqual(first, { available: true, checked_at: 1_000, cached: false });
  assert.deepEqual(second, { available: true, checked_at: 1_000, cached: true });
});

test('does not cache unsuccessful availability probes and rechecks expired entries', async () => {
  const now = [1_000];
  const cache = new ManualAvailabilityCache({ ttlSeconds: 60, now: () => now[0] });
  let probes = 0;

  assert.deepEqual(await cache.lookup(manualUrl, async () => { probes += 1; return false; }), { available: false, checked_at: 1_000, cached: false });
  now[0] += 1;
  assert.deepEqual(await cache.lookup(manualUrl, async () => { probes += 1; return true; }), { available: true, checked_at: 1_001, cached: false });
  now[0] += 60;
  assert.deepEqual(await cache.lookup(manualUrl, async () => { probes += 1; return true; }), { available: true, checked_at: 1_061, cached: false });
  assert.equal(probes, 3);
});

test('evicts the least-recently-used successful entry at its maximum size', async () => {
  const now = [1_000];
  const cache = new ManualAvailabilityCache({ maxEntries: 2, now: () => now[0] });
  const manualUrl2 = 'https://lemon-manuals.la/Acura/2006/RL%20V6-3.5L/';
  const manualUrl3 = 'https://lemon-manuals.la/Acura/2006/TL%20V6-3.2L/';

  await cache.lookup(manualUrl, async () => true);
  now[0] += 1;
  await cache.lookup(manualUrl2, async () => true);
  now[0] += 1;
  await cache.lookup(manualUrl, async () => { throw new Error('recent entry should not probe'); });
  now[0] += 1;
  await cache.lookup(manualUrl3, async () => true);
  now[0] += 1;

  let reprobes = 0;
  await cache.lookup(manualUrl2, async () => { reprobes += 1; return true; });
  assert.equal(reprobes, 1);
});
