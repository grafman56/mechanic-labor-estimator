const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;
const LEMON_BASE_URL = 'https://lemon-manuals.la';
const VPIC_BASE_URL = 'https://vpic.nhtsa.dot.gov';
const REQUEST_TIMEOUT_MS = 30_000;

export function normalizeVin(value) {
  const vin = String(value ?? '').trim().toUpperCase();
  if (!VIN_PATTERN.test(vin)) throw new Error('VIN must be 17 characters and cannot contain I, O, or Q.');
  return vin;
}

function clean(value) {
  return String(value ?? '').trim();
}

function decodedVehicle(vin, response) {
  const result = response?.Results?.[0];
  if (!result) throw new Error('VIN decoder returned no result.');
  if (clean(result.ErrorCode) !== '0') throw new Error(clean(result.ErrorText) || 'VIN did not decode cleanly.');
  const make = clean(result.Make);
  const model = clean(result.Model);
  const year = clean(result.ModelYear);
  if (!make || !model || !/^\d{4}$/.test(year)) throw new Error('VIN decoder did not identify make, model, and year.');
  const displacement = clean(result.DisplacementL);
  return {
    vin,
    make,
    model,
    year: Number(year),
    trim: clean(result.Trim),
    engine_code: clean(result.EngineModel),
    displacement_l: displacement ? Number(displacement) : null,
  };
}

function childLinks(html) {
  return [...String(html).matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1/gi)]
    .map((match) => match[2])
    .filter((href) => href.endsWith('/') && !/^[a-z][a-z\d+.-]*:/i.test(href));
}

function parseVehicleEntry(url) {
  const parts = new URL(url).pathname.split('/').filter(Boolean).map(decodeURIComponent);
  if (parts.length !== 3 || !/^\d+$/.test(parts[1])) return null;
  const [model, engine] = parts[2].split(/ (?=[^ ]+$)/);
  if (!model || !engine) return null;
  return {
    make: parts[0],
    year: Number(parts[1]),
    model,
    engine,
    manual_url: new URL(url).href,
  };
}

async function fetchResponse(url) {
  const signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const response = await fetch(url, {
    headers: { 'User-Agent': 'MechanicLaborPlanner/0.1 personal-use lookup' },
    signal,
  });
  if (!response.ok) throw new Error(`Source request failed with HTTP ${response.status}.`);
  return response;
}

async function defaultRequestJson(url) {
  return (await fetchResponse(url)).json();
}

async function defaultRequestText(url) {
  return (await fetchResponse(url)).text();
}

async function findManuals(vehicle, requestText) {
  const rootUrl = `${LEMON_BASE_URL}/`;
  const rootLinks = childLinks(await requestText(rootUrl));
  const sourceMake = rootLinks
    .map((href) => decodeURIComponent(href.replace(/^\/+|\/+$/g, '')))
    .find((make) => make && !make.includes('/') && make.toLocaleLowerCase() === vehicle.make.toLocaleLowerCase());
  if (!sourceMake) return { vehicle, manual_candidates: [] };

  const sourceVehicle = { ...vehicle, make: sourceMake };
  const yearUrl = new URL(`${encodeURIComponent(sourceMake)}/${sourceVehicle.year}/`, rootUrl).href;
  const manualCandidates = childLinks(await requestText(yearUrl))
    .map((href) => parseVehicleEntry(new URL(href, yearUrl).href))
    .filter((entry) => entry && entry.make.toLocaleLowerCase() === sourceMake.toLocaleLowerCase() && entry.model.toLocaleLowerCase() === sourceVehicle.model.toLocaleLowerCase());
  return { vehicle: sourceVehicle, manual_candidates: manualCandidates };
}

export async function decodeVinAndFindManuals(value, { requestJson = defaultRequestJson, requestText = defaultRequestText } = {}) {
  const vin = normalizeVin(value);
  const vehicle = decodedVehicle(vin, await requestJson(`${VPIC_BASE_URL}/api/vehicles/DecodeVinValuesExtended/${vin}?format=json`));
  return findManuals(vehicle, requestText);
}
