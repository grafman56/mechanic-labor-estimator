import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchProcedureEvidence } from '../src/live-procedure-evidence.js';

test('bypasses a previously cached procedure-evidence response', async () => {
  let request;
  const result = await fetchProcedureEvidence(async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => ({ status: 'available', items: [] }) };
  }, {
    url: 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/',
    job: 'valve-cover-gasket',
    source_operation_url: 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/Parts%20and%20Labor/Engine/Valve%20Cover%20Gasket/',
  });

  assert.equal(request.options.cache, 'no-store');
  assert.match(request.url, /^\/api\/procedure-evidence\?/);
  assert.deepEqual(result, { status: 'available', items: [] });
});
