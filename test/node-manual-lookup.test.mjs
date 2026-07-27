import assert from 'node:assert/strict';
import test from 'node:test';
import { manualAvailability, manualMetadata, validateManualUrl } from '../src/server/manual-lookup.mjs';

const manualUrl = 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/';

test('accepts only canonical LEMON manual roots', () => {
  assert.equal(validateManualUrl(manualUrl), manualUrl);
  for (const value of [
    'http://lemon-manuals.la/Acura/2006/MDX/',
    'https://user@lemon-manuals.la/Acura/2006/MDX/',
    'https://lemon-manuals.la:443/Acura/2006/MDX/',
    'https://sub.lemon-manuals.la/Acura/2006/MDX/',
    'https://127.0.0.1/Acura/2006/MDX/',
    'https://lemon-manuals.la/Acura/2006/MDX/#fragment',
    'https://lemon-manuals.la/Acura/2006/MDX/Parts%20and%20Labor/',
    'https://lemon-manuals.la%2F@evil.example/Acura/2006/MDX/',
  ]) {
    assert.equal(validateManualUrl(value), null, value);
  }
});

test('returns only source URL and title for a validated manual root', async () => {
  const result = await manualMetadata(manualUrl, {
    requestText: async (url) => {
      assert.equal(url, manualUrl);
      return '<title>MDX Manual</title><p>Manual body is not returned.</p>';
    },
  });

  assert.deepEqual(result, { source_url: manualUrl, title: 'MDX Manual' });
});

test('rejects an invalid manual URL before a source request', async () => {
  let requests = 0;
  await assert.rejects(
    manualMetadata('https://example.com/', { requestText: async () => { requests += 1; return ''; } }),
    /Unsupported manual URL/,
  );
  assert.equal(requests, 0);
});

test('checks only the selected manual Parts and Labor page for availability', async () => {
  const available = await manualAvailability(manualUrl, {
    requestText: async (url) => {
      assert.equal(url, `${manualUrl}Parts%20and%20Labor/`);
      return '<title>Parts and Labor</title>';
    },
  });
  assert.equal(available, true);

  const unavailable = await manualAvailability(manualUrl, { requestText: async () => { throw new Error('not found'); } });
  assert.equal(unavailable, false);
});
