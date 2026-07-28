import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, import.meta.url)));
}

test('ships an Acura fixture index and one explicit result for every bundled job', async () => {
  const index = await readJson('../pages/data/index.json');
  assert.deepEqual(index, [{ make: 'Acura', path: './data/acura.json' }]);

  const records = await readJson('../pages/data/acura.json');
  assert.equal(records.length, 14);
  assert.equal(new Set(records.map((record) => record.job_id)).size, 14);
  assert.ok(records.every((record) => (
    record.year === 2006
    && record.make === 'Acura'
    && record.model === 'MDX'
    && record.configuration === 'V6-3.5L'
    && record.manual_url === 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/'
    && typeof record.checked_at === 'string'
    && ['available', 'unavailable'].includes(record.status)
  )));
});

test('preserves the exact verified Acura MDX alternator labor record', async () => {
  const records = await readJson('../pages/data/acura.json');
  assert.deepEqual(records.find((record) => record.job_id === 'alternator'), {
    year: 2006,
    make: 'Acura',
    model: 'MDX',
    configuration: 'V6-3.5L',
    manual_url: 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/',
    job_id: 'alternator',
    status: 'available',
    hours: 1.5,
    source_operation: 'Alternator',
    source_row: 'Replace',
    source_url: 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/Parts%20and%20Labor/Starting%20and%20Charging/Charging%20System/Alternator/Labor%20Times/',
    checked_at: '2026-07-28T01:41:36Z',
  });
});
