import assert from 'node:assert/strict';
import test from 'node:test';
import { procedureContextGroup, procedureEvidenceGroups } from '../src/procedure-evidence.js';

test('groups only source-backed procedure evidence by its source classification', () => {
  assert.deepEqual(procedureEvidenceGroups({ status: 'available', items: [
    { kind: 'replace-if-removed', label: 'Spark plug seals', reason: 'Replace if necessary.', source_url: 'https://example.test/a' },
    { kind: 'inspect', label: 'Cover washer', reason: 'Inspect it.', source_url: 'https://example.test/a' },
  ] }), [
    {
      heading: 'Replace if removed / disturbed',
      items: [{ label: 'Spark plug seals', reason: 'Replace if necessary.', source_url: 'https://example.test/a' }],
    },
    {
      heading: 'Inspection or measurement called out',
      items: [{ label: 'Cover washer', reason: 'Inspect it.', source_url: 'https://example.test/a' }],
    },
  ]);
});

test('keeps procedure context separate from parts or labor evidence', () => {
  assert.deepEqual(procedureContextGroup({ status: 'available', context_steps: [
    { reason: 'Drain the engine coolant.', source_url: 'https://example.test/water-pump' },
    { reason: 'Remove the timing belt.', source_url: 'https://example.test/water-pump' },
  ] }), {
    heading: 'Source procedure context',
    summary: '2 source procedure steps',
    note: 'Informational procedure steps only. A removal or reinstallation, including a named component or fastener, does not establish replacement parts, additional labor, or a package recommendation.',
    items: [
      { reason: 'Drain the engine coolant.', source_url: 'https://example.test/water-pump' },
      { reason: 'Remove the timing belt.', source_url: 'https://example.test/water-pump' },
    ],
  });
  assert.equal(procedureContextGroup({ status: 'available', context_steps: [] }), null);
  assert.equal(procedureContextGroup({ status: 'unavailable' }), null);
});
