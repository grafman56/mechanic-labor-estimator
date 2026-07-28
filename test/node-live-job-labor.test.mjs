import assert from 'node:assert/strict';
import test from 'node:test';
import { lookupJobLabor } from '../src/server/live-job-labor.mjs';

const manualUrl = 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/';
const partsLaborUrl = `${manualUrl}Parts%20and%20Labor/`;
const engineUrl = `${partsLaborUrl}Engine/Water%20Pump/`;
const coolingUrl = `${partsLaborUrl}Cooling/Water%20Pump/`;

function pagesForWaterPump() {
  return {
    [partsLaborUrl]: '<a href="Engine/Water%20Pump/">Water Pump</a><a href="Cooling/Water%20Pump/">Water Pump</a>',
    [`${engineUrl}Labor%20Times/`]: '<table class="labor-times-table"><tr><td>Replace</td><td>5.1</td><td>3.3</td><td>B</td><td></td></tr></table>',
    [`${coolingUrl}Labor%20Times/`]: '<table class="labor-times-table"><tr><td>Replace</td><td>0.8</td><td>0.5</td><td>B</td><td></td></tr></table>',
  };
}

test('rediscovers the selected operation and returns only its exact published row', async () => {
  const pages = pagesForWaterPump();
  const result = await lookupJobLabor(manualUrl, 'water-pump', {
    source_row: 'Replace',
    source_operation_url: coolingUrl,
  }, { requestText: async (url) => pages[url] });

  assert.deepEqual(result, {
    status: 'available',
    job_id: 'water-pump',
    source_operation: 'Water Pump',
    source_url: `${coolingUrl}Labor%20Times/`,
    standard_hours: 0.8,
    time_basis: 'published-operation',
  });
});

test('does not use an operation URL that was not rediscovered from the selected manual', async () => {
  const pages = pagesForWaterPump();
  const result = await lookupJobLabor(manualUrl, 'water-pump', {
    source_row: 'Replace',
    source_operation_url: 'https://lemon-manuals.la/other/Water%20Pump/',
  }, { requestText: async (url) => pages[url] });

  assert.deepEqual(result, {
    status: 'unavailable',
    job_id: 'water-pump',
    reason: 'Selected source operation is unavailable for this manual.',
  });
});

test('leaves conflicting exact operation paths unavailable without a selected operation', async () => {
  const pages = pagesForWaterPump();
  const result = await lookupJobLabor(manualUrl, 'water-pump', { source_row: 'Replace' }, {
    requestText: async (url) => pages[url],
  });

  assert.deepEqual(result, {
    status: 'unavailable',
    job_id: 'water-pump',
    reason: 'Multiple exact source operations require review.',
  });
});
