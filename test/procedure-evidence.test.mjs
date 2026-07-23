import assert from 'node:assert/strict';
import test from 'node:test';
import { procedureEvidenceGroups } from '../src/procedure-evidence.js';

test('groups only source-backed procedure evidence by its source classification', () => {
  assert.deepEqual(procedureEvidenceGroups({ status: 'available', items: [
    { kind: 'replace-if-removed', label: 'Spark plug seals', reason: 'Replace if necessary.', source_url: 'https://example.test/a' },
    { kind: 'inspect', label: 'Cover washer', reason: 'Inspect it.', source_url: 'https://example.test/a' },
  ] }), [
    { heading: 'Replace if removed / disturbed', items: ['Spark plug seals'] },
    { heading: 'Inspection or measurement called out', items: ['Cover washer'] },
  ]);
});
