import assert from 'node:assert/strict';
import test from 'node:test';
import { lookupJobOperationRows } from '../src/server/live-job-rows.mjs';

const manualUrl = 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/';
const partsLaborUrl = `${manualUrl}Parts%20and%20Labor/`;

test('uses only exact Tier 1 aliases and preserves exact published Replace rows', async () => {
  const requests = [];
  const result = await lookupJobOperationRows(manualUrl, 'alternator', {
    requestText: async (url) => {
      requests.push(url);
      if (url === partsLaborUrl) {
        return '<a href="Charging/Alternator/">Alternator</a><a href="Charging/Alternator%20Bearing/">Alternator Bearing</a>';
      }
      if (url === `${partsLaborUrl}Charging/Alternator/Labor%20Times/`) {
        return '<table class="labor-times-table"><tr><td>Replace</td></tr><tr><td>One Side</td></tr><tr><td>Standard</td><td>1.5</td><td>1.3</td><td>B</td><td></td></tr><tr><td>Overhaul/Rebuild</td></tr><tr><td>Standard</td><td>8.0</td><td>5.0</td><td>B</td><td></td></tr></table>';
      }
      throw new Error(`Unexpected source request: ${url}`);
    },
  });

  assert.deepEqual(result, {
    job_id: 'alternator',
    operations: [{
      title: 'Alternator',
      source_url: `${partsLaborUrl}Charging/Alternator/`,
      source_path: 'Charging / Alternator',
      rows: [{ operation: 'Replace — One Side — Standard', standard_hours: 1.5 }],
    }],
  });
  assert.deepEqual(requests, [partsLaborUrl, `${partsLaborUrl}Charging/Alternator/Labor%20Times/`]);
});

test('keeps conflicting operation paths and collapses only equivalent full row sets', async () => {
  const pages = {
    [partsLaborUrl]: '<a href="Engine/Water%20Pump/">Water Pump</a><a href="Cooling/Water%20Pump/">Water Pump</a><a href="Accessory/Water%20Pump/">Water Pump</a>',
    [`${partsLaborUrl}Engine/Water%20Pump/Labor%20Times/`]: '<table class="labor-times-table"><tr><td>Replace</td><td>5.1</td><td>3.3</td><td>B</td><td></td></tr></table>',
    [`${partsLaborUrl}Cooling/Water%20Pump/Labor%20Times/`]: '<table class="labor-times-table"><tr><td>Replace</td><td>0.8</td><td>0.5</td><td>B</td><td></td></tr></table>',
    [`${partsLaborUrl}Accessory/Water%20Pump/Labor%20Times/`]: '<table class="labor-times-table"><tr><td>Replace</td><td>5.1</td><td>3.3</td><td>B</td><td></td></tr></table>',
  };

  const result = await lookupJobOperationRows(manualUrl, 'water-pump', { requestText: async (url) => pages[url] });

  assert.deepEqual(result, {
    job_id: 'water-pump',
    operations: [
      {
        title: 'Water Pump',
        source_url: `${partsLaborUrl}Engine/Water%20Pump/`,
        source_path: 'Engine / Water Pump',
        rows: [{ operation: 'Replace', standard_hours: 5.1 }],
      },
      {
        title: 'Water Pump',
        source_url: `${partsLaborUrl}Cooling/Water%20Pump/`,
        source_path: 'Cooling / Water Pump',
        rows: [{ operation: 'Replace', standard_hours: 0.8 }],
      },
    ],
  });
});

test('rejects unsupported jobs and invalid manual URLs before source requests', async () => {
  let requests = 0;
  const options = { requestText: async () => { requests += 1; return ''; } };

  await assert.rejects(lookupJobOperationRows(manualUrl, 'brake-pads', options), /Unsupported repair job/);
  await assert.rejects(lookupJobOperationRows('https://example.com/', 'alternator', options), /Unsupported manual URL/);
  assert.equal(requests, 0);
});
