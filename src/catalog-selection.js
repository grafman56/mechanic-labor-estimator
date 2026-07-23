import { catalogOptions } from './catalog.js';

export function manualSelectionOptions(catalog, selection = {}) {
  const make = selection.make ?? catalogOptions(catalog, 'make')[0];
  const years = catalogOptions(catalog, 'year', { make });
  const year = selection.year ?? years[0];
  const models = catalogOptions(catalog, 'model', { make, year });
  const model = selection.model ?? models[0];
  return {
    years,
    models,
    engines: catalogOptions(catalog, 'engine', { make, year, model }),
  };
}
