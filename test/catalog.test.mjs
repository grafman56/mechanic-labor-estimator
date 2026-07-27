import test from 'node:test';
import assert from 'node:assert/strict';

import { catalogOptions, findCatalogEntry } from '../src/catalog.js';

const catalog = [
  { make: 'Acura', year: 2006, model: 'MDX', engine: 'V6-3.5L', manual_url: 'mdx' },
  { make: 'Acura', year: 2006, model: 'TL', engine: 'V6-3.2L', manual_url: 'tl' },
];

test('derives manual-selection values from catalog records', () => {
  assert.deepEqual(catalogOptions(catalog, 'year'), [2006]);
  assert.deepEqual(catalogOptions(catalog, 'model', { year: 2006 }), ['MDX', 'TL']);
  assert.equal(findCatalogEntry(catalog, { year: 2006, model: 'MDX', engine: 'V6-3.5L' }).manual_url, 'mdx');
});
