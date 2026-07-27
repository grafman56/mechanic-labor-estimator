import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('provides one deterministic verification entry point for both test suites', async () => {
  const script = await readFile(new URL('../verify.sh', import.meta.url), 'utf8');
  assert.match(script, /python3 -m unittest discover -s test -p 'test_\*\.py' -v/);
  assert.match(script, /npm test/);
  assert.match(script, /node --check app\.js/);
  assert.match(script, /python3 -m py_compile server\.py tools\/procedure_evidence\.py/);
  assert.match(script, /git diff --check/);
});
