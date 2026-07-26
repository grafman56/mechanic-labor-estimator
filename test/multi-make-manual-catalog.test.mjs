import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const verifiedCatalogs = {
  honda: [
    { make: 'Honda', year: 2006, model: 'Accord', engine: 'L4-2.4L', manual_url: 'https://lemon-manuals.la/Honda/2006/Accord%20L4-2.4L/' },
    { make: 'Honda', year: 2008, model: 'Civic', engine: 'L4-1.8L', manual_url: 'https://lemon-manuals.la/Honda/2008/Civic%20L4-1.8L/' },
  ],
  toyota: [{ make: 'Toyota', year: 2010, model: 'Camry L4-2.5L', engine: '(2AR-FE)', manual_url: 'https://lemon-manuals.la/Toyota/2010/Camry%20L4-2.5L%20%282AR-FE%29/' }],
  ford: [
    { make: 'Ford', year: 2012, model: 'Fusion FWD', engine: 'L4-2.5L', manual_url: 'https://lemon-manuals.la/Ford/2012/Fusion%20FWD%20L4-2.5L/' },
    { make: 'Ford', year: 2012, model: 'Focus', engine: 'L4-2.0L', manual_url: 'https://lemon-manuals.la/Ford/2012/Focus%20L4-2.0L/' },
  ],
  chevrolet: [{ make: 'Chevrolet', year: 2012, model: 'Malibu', engine: 'L4-2.4L', manual_url: 'https://lemon-manuals.la/Chevrolet/2012/Malibu%20L4-2.4L/' }],
  hyundai: [{ make: 'Hyundai', year: 2012, model: 'Sonata', engine: 'L4-2.4L', manual_url: 'https://lemon-manuals.la/Hyundai/2012/Sonata%20L4-2.4L/' }],
  kia: [{ make: 'Kia', year: 2012, model: 'Optima', engine: 'L4-2.4L', manual_url: 'https://lemon-manuals.la/Kia/2012/Optima%20L4-2.4L/' }],
  chrysler: [{ make: 'Chrysler', year: 2012, model: '200', engine: 'L4-2.4L', manual_url: 'https://lemon-manuals.la/Chrysler/2012/200%20L4-2.4L/' }],
};

for (const [fileMake, expectedCatalog] of Object.entries(verifiedCatalogs)) {
  test(`includes only verified ${fileMake} factory-default manuals in its catalog`, async () => {
    const catalog = JSON.parse(await readFile(new URL(`../data/lemon-${fileMake}-catalog.json`, import.meta.url)));
    assert.deepEqual(catalog, expectedCatalog);
  });
}
