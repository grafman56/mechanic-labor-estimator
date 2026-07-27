import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateEstimate, getEstimateState, getJobById, getJobs, searchJobs } from '../src/estimator.js';

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

test('searches jobs by case-insensitive name or category', () => {
  assert.deepEqual(searchJobs('brakes').map((job) => job.id), ['brake-pads-rotors', 'brake-caliper']);
  assert.deepEqual(searchJobs('ALTERNATOR').map((job) => job.id), ['alternator']);
  assert.equal(searchJobs('').length, getJobs().length);
});

test('uses only valid shared estimate state', () => {
  assert.deepEqual(getEstimateState(new URLSearchParams('job=alternator&rate=150')), {
    jobId: 'alternator',
    laborRate: 150,
  });
  assert.deepEqual(getEstimateState(new URLSearchParams('job=unknown&rate=-10')), {
    jobId: getJobs()[0].id,
    laborRate: 125,
  });
});

test('covers at least fifteen common planning jobs', () => {
  assert.ok(getJobs().length >= 15);
  assert.equal(new Set(getJobs().map((job) => job.id)).size, getJobs().length);
});
