import test from 'node:test';
import assert from 'node:assert/strict';

import {
  findStaticLaborRecord,
  loadStaticLaborIndex,
  loadStaticMakeLaborCatalog,
} from '../pages/src/static-catalog.js';

const index = [
  { make: 'Acura', path: './data/acura.json' },
  { make: 'Honda', path: './data/honda.json' },
];

const acuraRecords = [
  {
    year: 2006,
    make: 'Acura',
    model: 'MDX',
    configuration: 'V6-3.5L',
    manual_url: 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L%20Eng/',
    job_id: 'alternator',
    status: 'available',
    hours: 1.5,
    source_operation: 'Alternator',
    source_row: 'Replace',
    source_url: 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L%20Eng/Parts%20and%20Labor/Engine/Alternator/Labor%20Times/',
    checked_at: '2026-07-28T00:00:00Z',
  },
];

test('loads only the static labor index on startup', async () => {
  const requests = [];
  const result = await loadStaticLaborIndex(async (path) => {
    requests.push(path);
    return index;
  });

  assert.deepEqual(requests, ['./data/index.json']);
  assert.deepEqual(result, index);
});

test('loads only the selected make labor catalog and finds its exact job', async () => {
  const requests = [];
  const records = await loadStaticMakeLaborCatalog(async (path) => {
    requests.push(path);
    return acuraRecords;
  }, index, 'Acura');

  assert.deepEqual(requests, ['./data/acura.json']);
  assert.deepEqual(findStaticLaborRecord(records, {
    manualUrl: acuraRecords[0].manual_url,
    jobId: 'alternator',
  }), acuraRecords[0]);
});

test('does not fetch an unknown static make catalog', async () => {
  const records = await loadStaticMakeLaborCatalog(async () => {
    throw new Error('should not fetch');
  }, index, 'Unknown');

  assert.deepEqual(records, []);
});

test('does not select a labor record when the same vehicle job has conflicting rows', () => {
  const records = [
    ...acuraRecords,
    { ...acuraRecords[0], hours: 1.8, source_row: 'Replace — With A/C' },
  ];

  assert.equal(findStaticLaborRecord(records, {
    manualUrl: acuraRecords[0].manual_url,
    jobId: 'alternator',
  }), null);
});
