import test from 'node:test';
import assert from 'node:assert/strict';

import { manualSelectionOptions } from '../src/catalog-selection.js';

const catalog = [
  { make: 'Acura', year: 2006, model: 'MDX', engine: 'V6-3.5L' },
  { make: 'BMW', year: 2006, model: 'BMW 325Ci Convertible (E46)', engine: 'L6-2.5L (M54)' },
];

test('filters year, model, and engine options by the selected make', () => {
  assert.deepEqual(manualSelectionOptions(catalog, { make: 'BMW' }), {
    years: [2006], models: ['BMW 325Ci Convertible (E46)'], engines: ['L6-2.5L (M54)'],
  });
});
