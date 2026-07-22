export function catalogOptions(catalog, field, filters = {}) {
  return [...new Set(catalog
    .filter((entry) => Object.entries(filters).every(([key, value]) => entry[key] === value))
    .map((entry) => entry[field]))].sort();
}

export function findCatalogEntry(catalog, selection) {
  return catalog.find((entry) => Object.entries(selection).every(([key, value]) => entry[key] === value)) ?? null;
}
