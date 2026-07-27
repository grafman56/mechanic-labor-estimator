import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('includes the verified factory-default BMW 325Ci manual in the selectable catalog', async () => {
  const catalog = JSON.parse(await readFile(new URL('../data/catalogs/bmw.json', import.meta.url)));
  assert.ok(catalog.some((entry) => (
    entry.make === 'BMW'
    && entry.year === 2006
    && entry.model === '325Ci Convertible (E46) L6-2.5L'
    && entry.engine === '(M54)'
    && entry.manual_url === 'https://lemon-manuals.la/BMW/2006/325Ci%20Convertible%20%28E46%29%20L6-2.5L%20%28M54%29/'
  )));
});
