import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const requiredRecords = [
  { make: 'Acura', year: 2006, model: 'MDX', engine: 'V6-3.5L', manual_url: 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/' },
  { make: 'Ford', year: 2012, model: 'Focus', engine: 'L4-2.0L', manual_url: 'https://lemon-manuals.la/Ford/2012/Focus%20L4-2.0L/' },
  { make: 'Chrysler', year: 2012, model: '200', engine: 'L4-2.4L', manual_url: 'https://lemon-manuals.la/Chrysler/2012/200%20L4-2.4L/' },
  { make: 'Kia', year: 2012, model: 'Optima', engine: 'L4-2.4L', manual_url: 'https://lemon-manuals.la/Kia/2012/Optima%20L4-2.4L/' },
];

test('indexes every discovered LEMON make in a separate generated catalog file', async () => {
  const index = JSON.parse(await readFile(new URL('../data/lemon-catalog-index.json', import.meta.url)));
  assert.equal(index.length, 69);
  assert.equal(new Set(index.map((entry) => entry.make)).size, 69);
  assert.ok(index.every((entry) => entry.path.startsWith('./data/catalogs/')));
});

test('keeps selected exact factory manual records in their generated make catalogs', async () => {
  const index = JSON.parse(await readFile(new URL('../data/lemon-catalog-index.json', import.meta.url)));
  for (const record of requiredRecords) {
    const entry = index.find((candidate) => candidate.make === record.make);
    assert.ok(entry, `missing ${record.make} catalog`);
    const catalog = JSON.parse(await readFile(new URL(`../${entry.path.slice(2)}`, import.meta.url)));
    assert.ok(catalog.some((candidate) => JSON.stringify(candidate) === JSON.stringify(record)), `missing ${record.make} record`);
  }
});
