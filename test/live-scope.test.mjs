import assert from 'node:assert/strict';
import test from 'node:test';
import { sourceScopeOptions } from '../src/live-scopes.js';

test('preserves exact published source-row wording in live scope options', () => {
  assert.deepEqual(sourceScopeOptions([
    { operation: 'Replace — Left Side', standard_hours: 1.0 },
    { operation: 'Replace — Right Side', standard_hours: 1.4 },
  ]), [
    { label: 'Replace — Left Side — 1 hr', value: 'Replace — Left Side' },
    { label: 'Replace — Right Side — 1.4 hr', value: 'Replace — Right Side' },
  ]);
});

test('does not turn a generic one-bank source row into a front or rear claim', () => {
  const [option] = sourceScopeOptions([{ operation: 'Replace — One Bank', standard_hours: 1.3 }]);
  assert.match(option.label, /One Bank/);
  assert.doesNotMatch(option.label, /Front|Rear/);
});
