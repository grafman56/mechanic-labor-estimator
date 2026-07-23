import test from 'node:test';
import assert from 'node:assert/strict';

import { availableManuals } from '../src/manual-availability.js';

test('keeps only source manuals with a Parts and Labor page', async () => {
  const manuals = [
    { engine: 'Base', manual_url: 'base' },
    { engine: 'V6-3.5L', manual_url: 'v6' },
    { engine: 'Touring', manual_url: 'touring' },
  ];
  const result = await availableManuals(manuals, async (manual) => manual.manual_url === 'v6');
  assert.deepEqual(result, [{ engine: 'V6-3.5L', manual_url: 'v6' }]);
});
