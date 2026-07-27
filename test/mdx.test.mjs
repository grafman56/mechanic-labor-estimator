import test from 'node:test';
import assert from 'node:assert/strict';

import { findVerifiedVehicle } from '../src/mdx.js';

test('recognizes only the reviewed MDX VIN and supplies its source manual identity', () => {
  const vehicle = findVerifiedVehicle('2HNYD18836H516598');
  assert.deepEqual(vehicle, {
    vin: '2HNYD18836H516598', year: 2006, make: 'Acura', model: 'MDX Touring', engine: 'J35A5 3.5L V6', manual_url: 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/',
  });
  assert.equal(findVerifiedVehicle(' 2hnyd18836h516598 ').make, 'Acura');
  assert.equal(findVerifiedVehicle('1HGCM82633A004352'), null);
});

test('does not attach legacy labor, package, or parts policy to a verified VIN', () => {
  const vehicle = findVerifiedVehicle('2HNYD18836H516598');
  assert.equal('jobs' in vehicle, false);
  assert.equal('policyIncluded' in vehicle, false);
});
