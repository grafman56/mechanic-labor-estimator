import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeVinAndFindManuals, normalizeVin } from '../src/server/vin-lookup.mjs';

const validVin = '2HNYD18836H516598';

const decodedResponse = {
  Results: [{
    ErrorCode: '0', Make: 'ACURA', Model: 'MDX', ModelYear: '2006',
    Trim: 'Touring', EngineModel: 'J35A5', DisplacementL: '3.474057568',
  }],
};

const pages = new Map([
  ['https://lemon-manuals.la/', '<a href="Acura/">Acura</a>'],
  ['https://lemon-manuals.la/Acura/2006/', '<a href="MDX%20V6-3.5L/">MDX V6-3.5L</a><a href="TL%20V6-3.2L/">TL V6-3.2L</a>'],
]);

test('normalizes only ASCII VINs with 17 allowed characters', () => {
  assert.equal(normalizeVin(` ${validVin.toLowerCase()} `), validVin);
  for (const vin of ['', 'A'.repeat(16), 'A'.repeat(18), '1HGCM82633A00I352', '1HGCM82633A00O352', '1HGCM82633A00Q352', '1HGCM82633A00%352', '1HGCM82633A00?352', '1HGCM82633A00#352', '1HGCM82633A00\n352', '１HGCM82633A004352', 'A'.repeat(10_000)]) {
    assert.throws(() => normalizeVin(vin), /VIN must be 17 characters/);
  }
});

test('rejects invalid VINs before making an upstream request', async () => {
  let requests = 0;
  await assert.rejects(
    decodeVinAndFindManuals('not-a-vin', {
      requestJson: async () => { requests += 1; return decodedResponse; },
      requestText: async () => { requests += 1; return ''; },
    }),
    /VIN must be 17 characters/,
  );
  assert.equal(requests, 0);
});

test('returns decoded identity and exact source-manual candidates', async () => {
  const result = await decodeVinAndFindManuals(validVin, {
    requestJson: async (url) => {
      assert.equal(url, `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${validVin}?format=json`);
      return decodedResponse;
    },
    requestText: async (url) => pages.get(url),
  });

  assert.deepEqual(result, {
    vehicle: {
      vin: validVin, make: 'Acura', model: 'MDX', year: 2006,
      trim: 'Touring', engine_code: 'J35A5', displacement_l: 3.474057568,
    },
    manual_candidates: [{
      make: 'Acura', year: 2006, model: 'MDX', engine: 'V6-3.5L',
      manual_url: 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/',
    }],
  });
});
