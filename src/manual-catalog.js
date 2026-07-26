const catalogPaths = [
  './data/lemon-acura-catalog.json',
  './data/lemon-bmw-catalog.json',
  './data/lemon-honda-catalog.json',
  './data/lemon-toyota-catalog.json',
  './data/lemon-ford-catalog.json',
  './data/lemon-chevrolet-catalog.json',
  './data/lemon-hyundai-catalog.json',
];

export async function loadManualCatalog(fetchJson) {
  return (await Promise.all(catalogPaths.map(fetchJson))).flat();
}
