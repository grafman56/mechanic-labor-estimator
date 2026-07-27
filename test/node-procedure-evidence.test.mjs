import assert from 'node:assert/strict';
import test from 'node:test';
import { lookupJobProcedureEvidence } from '../src/server/procedure-evidence.mjs';

const manualUrl = 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/';
const partsLaborUrl = `${manualUrl}Parts%20and%20Labor/`;
const waterPumpUrl = `${partsLaborUrl}Engine%2C%20Cooling%20and%20Exhaust/Engine/Water%20Pump/`;
const waterPumpProcedureUrl = `${manualUrl}Repair%20and%20Diagnosis/Engine%2C%20Cooling%20and%20Exhaust/Engine/Water%20Pump/Service%20and%20Repair/Water%20Pump%20Replacement/`;

test('requires an operation rediscovered from the selected manual before procedure lookup', async () => {
  let requests = 0;
  const requestText = async () => { requests += 1; return ''; };

  assert.deepEqual(await lookupJobProcedureEvidence(manualUrl, 'water-pump', {}, { requestText }), {
    status: 'unavailable',
    reason: 'An exact selected source operation is required for procedure evidence.',
  });
  assert.equal(requests, 0);

  assert.deepEqual(await lookupJobProcedureEvidence(manualUrl, 'water-pump', {
    source_operation_url: 'https://lemon-manuals.la/other/Water%20Pump/',
  }, { requestText: async (url) => {
    assert.equal(url, partsLaborUrl);
    return '<a href="Engine%2C%20Cooling%20and%20Exhaust/Engine/Water%20Pump/">Water Pump</a>';
  } }), {
    status: 'unavailable',
    reason: 'Selected source operation is unavailable for this manual.',
  });
});

test('returns only explicit source-backed evidence and context for the selected MDX water-pump operation', async () => {
  const pages = {
    [partsLaborUrl]: '<a href="Engine%2C%20Cooling%20and%20Exhaust/Engine/Water%20Pump/">Water Pump</a>',
    [waterPumpProcedureUrl]: '<p>Install the water pump with a new O-ring (B) in the reverse order of removal.</p><p>Drain the engine coolant.</p><p>Remove the timing belt.</p>',
  };

  assert.deepEqual(await lookupJobProcedureEvidence(manualUrl, 'water-pump', {
    source_operation_url: waterPumpUrl,
  }, { requestText: async (url) => pages[url] }), {
    status: 'available',
    items: [{
      kind: 'required',
      label: 'O-ring (B)',
      reason: 'Install the water pump with a new O-ring (B) in the reverse order of removal.',
      source_url: waterPumpProcedureUrl,
    }],
    context_steps: [
      { kind: 'drain-handling', reason: 'Drain the engine coolant.', source_url: waterPumpProcedureUrl },
      { kind: 'removal-access', reason: 'Remove the timing belt.', source_url: waterPumpProcedureUrl },
    ],
  });
});

test('caps generic selected-operation context at 24 source statements and excludes unrelated procedure paths', async () => {
  const alternatorUrl = `${partsLaborUrl}Charging/Alternator/`;
  const repairUrl = `${manualUrl}Repair%20and%20Diagnosis/Charging/Alternator/`;
  const goodProcedureUrl = `${repairUrl}Service%20and%20Repair/Alternator%20Replacement/`;
  const pages = {
    [partsLaborUrl]: '<a href="Charging/Alternator/">Alternator</a>',
    [repairUrl]: '<a href="Service%20and%20Repair/Alternator%20Replacement/">Replacement</a><a href="Service%20and%20Repair/Alternator%20Overhaul/">Overhaul</a><a href="https://elsewhere.example/Replacement/">Replacement</a>',
    [goodProcedureUrl]: Array.from({ length: 25 }, (_, index) => `<p>Remove item ${index}.</p>`).join(''),
  };

  const result = await lookupJobProcedureEvidence(manualUrl, 'alternator', {
    source_operation_url: alternatorUrl,
  }, { requestText: async (url) => pages[url] });

  assert.equal(result.status, 'available');
  assert.deepEqual(result.items, []);
  assert.equal(result.context_steps.length, 24);
  assert.deepEqual(result.context_steps[0], { kind: 'removal-access', reason: 'Remove item 0.', source_url: goodProcedureUrl });
});
