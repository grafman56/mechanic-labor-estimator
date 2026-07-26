import test from 'node:test';
import assert from 'node:assert/strict';

import { loadMakeCatalog, loadManualCatalogIndex } from '../src/manual-catalog.js';

const index = [
  { make: 'Acura', path: './data/catalogs/acura.json' },
  { make: 'Dodge and Ram', path: './data/catalogs/dodge-and-ram.json' },
];

test('loads only the compact generated catalog index on startup', async () => {
  const requests = [];
  const result = await loadManualCatalogIndex(async (path) => {
    requests.push(path);
    return index;
  });
  assert.deepEqual(requests, ['./data/lemon-catalog-index.json']);
  assert.deepEqual(result, index);
});

test('loads only the selected make catalog from the generated index', async () => {
  const requests = [];
  const catalog = await loadMakeCatalog(async (path) => {
    requests.push(path);
    return [{ make: 'Dodge and Ram', year: 2012, model: 'Charger', engine: 'V6-3.6L' }];
  }, index, 'Dodge and Ram');
  assert.deepEqual(requests, ['./data/catalogs/dodge-and-ram.json']);
  assert.deepEqual(catalog, [{ make: 'Dodge and Ram', year: 2012, model: 'Charger', engine: 'V6-3.6L' }]);
});

test('does not fetch a catalog for an unknown make', async () => {
  const catalog = await loadMakeCatalog(async () => {
    throw new Error('should not fetch');
  }, index, 'Unknown');
  assert.deepEqual(catalog, []);
});
