import test from 'node:test';
import assert from 'node:assert/strict';

import { getMdxJob, getMdxScope, findVerifiedVehicle } from '../src/mdx.js';

test('rejects unverified VINs instead of falling back to generic estimates', () => {
  assert.equal(findVerifiedVehicle('2HNYD18836H516598').model, 'MDX Touring');
  assert.equal(findVerifiedVehicle(' 2hnyd18836h516598 ' ).make, 'Acura');
  assert.equal(findVerifiedVehicle('1HGCM82633A004352'), null);
});
test('uses the published both-side front strut labor for the MDX pilot', () => {
  assert.equal(getMdxJob('front-struts').scopes.both.laborHours, 1.9);
});

test('uses the published both-bank valve cover labor instead of doubling one bank', () => {
  const job = getMdxJob('valve-cover-gasket');
  assert.equal(job.scopes.front.laborHours, 1.3);
  assert.equal(job.scopes.rear.laborHours, 1.3);
  assert.equal(job.scopes.both.laborHours, 2.5);
});

test('makes the timing service a water-pump-inclusive shop package', () => {
  const job = getMdxJob('timing-service');
  assert.equal(job.scopes.default.laborHours, 5.1);
  assert.ok(job.policyIncluded.includes('Water pump'));
});

test('defaults scoped jobs to the full shop scope', () => {
  assert.equal(getMdxScope('front-struts').key, 'both');
  assert.equal(getMdxScope('valve-cover-gasket').key, 'both');
  assert.equal(getMdxScope('timing-service').key, 'default');
});

test('does not hard-code access recommendations into a vehicle record', () => {
  const valveJob = getMdxJob('valve-cover-gasket');
  assert.equal(valveJob.accessRecommendations.length, 0);
  assert.equal(getMdxJob('front-struts').accessRecommendations.length, 0);
});
