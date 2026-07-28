import test from 'node:test';
import assert from 'node:assert/strict';

import { staticEstimateModel } from '../pages/src/static-estimate.js';

const baseRecord = {
  year: 2006,
  make: 'Acura',
  model: 'MDX',
  configuration: 'V6-3.5L',
  manual_url: 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L%20Eng/',
  job_id: 'alternator',
  checked_at: '2026-07-28T00:00:00Z',
};

test('renders a bundled exact labor record with its source provenance', () => {
  assert.deepEqual(staticEstimateModel({
    ...baseRecord,
    status: 'available',
    hours: 1.5,
    source_operation: 'Alternator',
    source_row: 'Replace',
    source_url: 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L%20Eng/Parts%20and%20Labor/Engine/Alternator/Labor%20Times/',
  }), {
    status: 'available',
    heading: 'Alternator',
    vehicle: '2006 Acura MDX · V6-3.5L',
    hours: 1.5,
    sourceRow: 'Replace',
    sourceUrl: 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L%20Eng/Parts%20and%20Labor/Engine/Alternator/Labor%20Times/',
    checkedAt: '2026-07-28T00:00:00Z',
  });
});

test('renders an unavailable bundled record without an invented labor value', () => {
  assert.deepEqual(staticEstimateModel({
    ...baseRecord,
    status: 'unavailable',
    reason: 'No exact source operation found.',
  }), {
    status: 'unavailable',
    heading: 'No bundled labor result',
    vehicle: '2006 Acura MDX · V6-3.5L',
    reason: 'No exact source operation found.',
    checkedAt: '2026-07-28T00:00:00Z',
  });
});

test('does not create an estimate from a missing or malformed record', () => {
  assert.equal(staticEstimateModel(null), null);
  assert.equal(staticEstimateModel({ ...baseRecord, status: 'available' }), null);
});
