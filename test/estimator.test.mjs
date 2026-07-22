import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateEstimate, getJobById } from '../src/estimator.js';

test('calculates a labor-only range from a selected job and shop rate', () => {
  const job = getJobById('brake-pads-rotors');

  assert.deepEqual(calculateEstimate(job, 125), {
    low: 187.5,
    high: 312.5,
  });
});

test('rejects an invalid shop rate', () => {
  const job = getJobById('brake-pads-rotors');

  assert.throws(() => calculateEstimate(job, 0), /positive number/);
});

test('includes required, recommended, and inspection items for a job', () => {
  const job = getJobById('brake-pads-rotors');

  assert.deepEqual(job.parts.required, ['Brake pads', 'Brake rotors', 'Brake hardware kit']);
  assert.ok(job.parts.recommended.includes('Brake fluid condition check'));
  assert.ok(job.parts.inspect.includes('Calipers and slide pins'));
});
