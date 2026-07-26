import test from 'node:test';
import assert from 'node:assert/strict';

import { loadManualCatalog } from '../src/manual-catalog.js';

test('combines the supported make catalogs for manual selection', async () => {
  const requests = [];
  const catalog = await loadManualCatalog(async (path) => {
    requests.push(path);
    return [{ make: path.match(/lemon-([a-z]+)-catalog/)[1] }];
  });
  assert.deepEqual(requests, [
    './data/lemon-acura-catalog.json',
    './data/lemon-bmw-catalog.json',
    './data/lemon-honda-catalog.json',
    './data/lemon-toyota-catalog.json',
    './data/lemon-ford-catalog.json',
    './data/lemon-chevrolet-catalog.json',
    './data/lemon-hyundai-catalog.json',
  ]);
  assert.deepEqual(catalog, [
    { make: 'acura' }, { make: 'bmw' }, { make: 'honda' },
    { make: 'toyota' }, { make: 'ford' }, { make: 'chevrolet' }, { make: 'hyundai' },
  ]);
});
