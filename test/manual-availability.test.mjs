import test from 'node:test';
import assert from 'node:assert/strict';

import { manualAvailabilityStatus, sourceConfigurationLabel } from '../src/manual-availability.js';

const bmw535iSedan = {
  make: 'BMW',
  year: 2012,
  model: '535i Sedan (F10) L6-3.0L Turbo',
  engine: '(N55)',
  manual_url: 'https://lemon-manuals.la/BMW/2012/535i%20Sedan%20%28F10%29%20L6-3.0L%20Turbo%20%28N55%29/',
};

test('uses the exact manual path leaf as the source configuration label', () => {
  assert.equal(sourceConfigurationLabel(bmw535iSedan), '535i Sedan (F10) L6-3.0L Turbo (N55)');
});

test('distinguishes a missing Parts and Labor page from a missing job result', () => {
  assert.equal(
    manualAvailabilityStatus([bmw535iSedan], []),
    'No source Parts and Labor page is available for this source configuration. This is not a job result.',
  );
});

test('reports the exact available source configuration', () => {
  assert.equal(
    manualAvailabilityStatus([bmw535iSedan], [bmw535iSedan]),
    'LEMON labor data available for source configuration: 535i Sedan (F10) L6-3.0L Turbo (N55).',
  );
});
