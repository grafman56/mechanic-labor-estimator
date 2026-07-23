import test from 'node:test';
import assert from 'node:assert/strict';

import { loadManualCatalog } from '../src/manual-catalog.js';

test('combines the supported make catalogs for manual selection', async () => {
  const requests = [];
  const catalog = await loadManualCatalog(async (path) => {
    requests.push(path);
    return path.includes('acura') ? [{ make: 'Acura' }] : [{ make: 'BMW' }];
  });
  assert.deepEqual(requests, ['./data/lemon-acura-catalog.json', './data/lemon-bmw-catalog.json']);
  assert.deepEqual(catalog, [{ make: 'Acura' }, { make: 'BMW' }]);
});
