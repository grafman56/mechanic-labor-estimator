import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const verifiedManuals = [
  ['honda', 'Honda', 2006, 'Accord', 'L4-2.4L', 'https://lemon-manuals.la/Honda/2006/Accord%20L4-2.4L/'],
  ['toyota', 'Toyota', 2010, 'Camry L4-2.5L', '(2AR-FE)', 'https://lemon-manuals.la/Toyota/2010/Camry%20L4-2.5L%20%282AR-FE%29/'],
  ['ford', 'Ford', 2012, 'Fusion FWD', 'L4-2.5L', 'https://lemon-manuals.la/Ford/2012/Fusion%20FWD%20L4-2.5L/'],
  ['chevrolet', 'Chevrolet', 2012, 'Malibu', 'L4-2.4L', 'https://lemon-manuals.la/Chevrolet/2012/Malibu%20L4-2.4L/'],
];

for (const [fileMake, make, year, model, engine, manualUrl] of verifiedManuals) {
  test(`includes the verified ${make} factory-default manual in its own catalog`, async () => {
    const catalog = JSON.parse(await readFile(new URL(`../data/lemon-${fileMake}-catalog.json`, import.meta.url)));
    assert.deepEqual(catalog, [{ make, year, model, engine, manual_url: manualUrl }]);
  });
}