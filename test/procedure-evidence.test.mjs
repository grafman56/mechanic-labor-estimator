import assert from 'node:assert/strict';
import test from 'node:test';
import { jobAwarenessGroup, procedureContextGroup, procedureEvidenceGroups } from '../src/procedure-evidence.js';

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
    summary: '2 source procedure steps: Drain the engine coolant.',
    note: 'Informational procedure steps only. A removal or reinstallation, including a named component or fastener, does not establish replacement parts, additional labor, or a package recommendation.',
    items: [
      { reason: 'Drain the engine coolant.', source_url: 'https://example.test/water-pump' },
      { reason: 'Remove the timing belt.', source_url: 'https://example.test/water-pump' },
    ],
  });
  assert.equal(procedureContextGroup({ status: 'available', context_steps: [] }), null);
  assert.equal(procedureContextGroup({ status: 'unavailable' }), null);
});

test('combines job awareness into one expandable result section with its first source step visible', () => {
  assert.deepEqual(jobAwarenessGroup({ status: 'available', items: [
    { kind: 'required', label: 'O-ring (B)', reason: 'Install with a new O-ring (B).', source_url: 'https://example.test/pump' },
  ], context_steps: [
    { reason: 'Remove the intake manifold.', source_url: 'https://example.test/cover-removal' },
  ] }), {
    heading: 'Source-backed job awareness',
    summary: '1 procedure note, 1 source procedure step: Remove the intake manifold.',
    evidenceGroups: [{
      heading: 'Required by procedure',
      items: [{ label: 'O-ring (B)', reason: 'Install with a new O-ring (B).', source_url: 'https://example.test/pump' }],
    }],
    context: {
      heading: 'Source procedure context',
      summary: '1 source procedure step: Remove the intake manifold.',
      note: 'Informational procedure steps only. A removal or reinstallation, including a named component or fastener, does not establish replacement parts, additional labor, or a package recommendation.',
      items: [{ reason: 'Remove the intake manifold.', source_url: 'https://example.test/cover-removal' }],
    },
  });
  assert.equal(jobAwarenessGroup({ status: 'available', items: [] }), null);
});
