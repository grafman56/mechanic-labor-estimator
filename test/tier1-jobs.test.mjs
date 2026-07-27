import test from 'node:test';
import assert from 'node:assert/strict';

import { findTier1Job, tier1Jobs } from '../src/tier1-jobs.js';

test('exposes the normalized jobs available for live source lookup', () => {
  assert.ok(tier1Jobs.length >= 10);
  assert.deepEqual(findTier1Job('alternator'), {
    id: 'alternator', label: 'Alternator', aliases: ['Alternator'], scopes: ['standard'],
  });
  assert.deepEqual(findTier1Job('engine-air-filter'), {
    id: 'engine-air-filter', label: 'Engine air filter', aliases: ['Air Filter Element'], scopes: ['standard'],
  });
  assert.deepEqual(findTier1Job('cabin-air-filter'), {
    id: 'cabin-air-filter', label: 'Cabin air filter', aliases: ['Cabin Air Filter / Purifier'], scopes: ['standard'],
  });
  assert.equal(findTier1Job('not-a-job'), null);
});
