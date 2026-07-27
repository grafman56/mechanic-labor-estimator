const catalogIndexPath = './data/lemon-catalog-index.json';

export async function loadManualCatalogIndex(fetchJson) {
  return fetchJson(catalogIndexPath);
}

export async function loadMakeCatalog(fetchJson, index, make) {
  const entry = index.find((candidate) => candidate.make === make);
  return entry ? fetchJson(entry.path) : [];
}
