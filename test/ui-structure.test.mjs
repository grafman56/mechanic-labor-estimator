import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('groups the estimator into a three-step source-backed workflow', () => {
  assert.match(html, /class="workflow"/);
  assert.match(html, /<fieldset class="control-group vehicle-group">/);
  assert.match(html, /<fieldset class="control-group repair-group">/);
  assert.match(html, /<legend>1\. Choose vehicle identity<\/legend>/);
  assert.match(html, /<legend>2\. Choose published labor operation<\/legend>/);
  assert.match(html, /id="estimate" class="estimate" aria-live="polite" aria-atomic="true"/);
});

test('provides an explicit source-manual selection after a VIN lookup', () => {
  assert.match(html, /id="vin-manual"/);
  assert.match(html, /Select exact source configuration/);
});

test('marks live source status as a polite status region', () => {
  assert.match(html, /id="catalog-status" class="job-note" role="status" aria-live="polite"/);
  assert.match(html, /Published wording is kept exactly as the selected manual provides it\./);
});
