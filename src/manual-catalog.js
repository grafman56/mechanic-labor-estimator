const catalogPaths = [
  './data/lemon-acura-catalog.json',
  './data/lemon-bmw-catalog.json',
];

export async function loadManualCatalog(fetchJson) {
  return (await Promise.all(catalogPaths.map(fetchJson))).flat();
}
