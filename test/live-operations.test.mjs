import assert from 'node:assert/strict';
import test from 'node:test';
import { manualOperationOptions } from '../src/live-operations.js';

test('labels same-named source operations with their exact manual paths', () => {
  assert.deepEqual(manualOperationOptions([
    {
      title: 'Water Pump',
      source_url: 'https://example.test/manual/Parts%20and%20Labor/Engine/Water%20Pump/',
      source_path: 'Engine / Water Pump',
      rows: [{ operation: 'Replace', standard_hours: 5.1 }],
    },
    {
      title: 'Water Pump',
      source_url: 'https://example.test/manual/Parts%20and%20Labor/Cooling/Water%20Pump/',
      source_path: 'Cooling / Water Pump',
      rows: [{ operation: 'Replace', standard_hours: 0.8 }],
    },
  ]), [
    {
      label: 'Water Pump — Engine / Water Pump',
      value: 'https://example.test/manual/Parts%20and%20Labor/Engine/Water%20Pump/',
    },
    {
      label: 'Water Pump — Cooling / Water Pump',
      value: 'https://example.test/manual/Parts%20and%20Labor/Cooling/Water%20Pump/',
    },
  ]);
});

test('keeps a single equivalent operation selectable without adding path noise', () => {
  assert.deepEqual(manualOperationOptions([{
    title: 'Alternator',
    source_url: 'https://example.test/manual/Parts%20and%20Labor/Starting/Alternator/',
    source_path: 'Starting / Alternator',
    rows: [{ operation: 'Replace', standard_hours: 1.5 }],
  }]), [{
    label: 'Alternator',
    value: 'https://example.test/manual/Parts%20and%20Labor/Starting/Alternator/',
  }]);
});
