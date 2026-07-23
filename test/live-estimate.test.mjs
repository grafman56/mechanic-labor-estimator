import test from 'node:test';
import assert from 'node:assert/strict';

import { liveEstimateModel, supportsManualEstimate } from '../src/live-estimate.js';

test('uses a selected manual as an alternative to VIN verification', () => {
  assert.equal(supportsManualEstimate(null), false);
  assert.equal(supportsManualEstimate({ year: 2006, make: 'Acura', model: 'MDX', engine: 'V6-3.5L', manual_url: 'https://lemon.example/mdx/' }), true);
});

test('creates an estimate from a selected manual without a VIN', () => {
  assert.deepEqual(liveEstimateModel(
    { status: 'available', source_operation: 'Alternator', source_url: 'https://lemon.example/labor', standard_hours: 1.5 },
    { year: 2006, make: 'Acura', model: 'MDX', engine: 'V6-3.5L' },
    125,
  ), {
    operation: 'Alternator',
    sourceUrl: 'https://lemon.example/labor',
    laborHours: 1.5,
    laborCost: 187.5,
    vehicle: '2006 Acura MDX · V6-3.5L',
  });
});
