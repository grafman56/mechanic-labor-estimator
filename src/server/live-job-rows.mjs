import { findExactOperationLinks, validateManualUrl } from './manual-lookup.mjs';

const REQUEST_TIMEOUT_MS = 30_000;

export const TIER1_JOB_ALIASES = {
  'front-struts': ['Suspension Strut / Shock Absorber'],
  'rear-struts-shocks': ['Suspension Strut / Shock Absorber'],
  alternator: ['Alternator'],
  starter: ['Starter Motor'],
  radiator: ['Radiator'],
  'wheel-bearing-hub': ['Wheel Bearing'],
  'serpentine-belt': ['Drive Belt'],
  'spark-plugs': ['Spark Plug'],
  'oil-and-filter': ['Lube & Filter Service'],
  'engine-air-filter': ['Air Filter Element'],
  'cabin-air-filter': ['Cabin Air Filter / Purifier'],
  'valve-cover-gasket': ['Valve Cover Gasket'],
  'timing-belt': ['Timing Belt'],
  'water-pump': ['Water Pump'],
};

async function defaultRequestText(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'MechanicLaborPlanner/0.1 personal-use lookup' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Source request failed with HTTP ${response.status}.`);
  return response.text();
}

function decodeHtml(value) {
  return value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
}

function parseLaborTable(html) {
  const table = String(html).match(/<table\b[^>]*\bclass\s*=\s*(["'])[^"']*\blabor-times-table\b[^"']*\1[^>]*>([\s\S]*?)<\/table>/i)?.[2] ?? '';
  const rows = [];
  let serviceOperation = null;
  let sourceGroup = null;
  for (const row of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)]
      .map((cell) => decodeHtml(cell[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()));
    if (cells.length === 1) {
      if (['Replace', 'Remove and Install', 'Overhaul/Rebuild'].includes(cells[0])) {
        serviceOperation = cells[0];
        sourceGroup = null;
      } else {
        sourceGroup = cells[0];
      }
      continue;
    }
    if (cells.length !== 5 || cells[1] === 'Standard Hours') continue;
    const standardHours = Number(cells[1]);
    const warrantyHours = Number(cells[2]);
    if (!Number.isFinite(standardHours) || !Number.isFinite(warrantyHours)) continue;
    rows.push({
      operation: [serviceOperation, sourceGroup, cells[0]].filter(Boolean).join(' — '),
      standard_hours: standardHours,
    });
  }
  return rows;
}

function sourceOperationPath(sourceUrl, partsLaborUrl) {
  const sourcePath = new URL(sourceUrl).pathname;
  const rootPath = new URL(partsLaborUrl).pathname;
  return sourcePath.slice(rootPath.length).split('/').filter(Boolean).map(decodeURIComponent).join(' / ');
}

export async function lookupJobOperationRows(manualUrlValue, jobId, { requestText = defaultRequestText } = {}) {
  const manualUrl = validateManualUrl(manualUrlValue);
  if (!manualUrl) throw new Error('Unsupported manual URL');
  const aliases = TIER1_JOB_ALIASES[jobId];
  if (!aliases) throw new Error('Unsupported repair job');

  const partsLaborUrl = new URL('Parts%20and%20Labor/', manualUrl).href;
  const matches = findExactOperationLinks(await requestText(partsLaborUrl), aliases, partsLaborUrl);
  const operations = [];
  const signatures = new Set();
  for (const match of matches) {
    const laborUrl = new URL('Labor%20Times/', match.source_url).href;
    const rows = parseLaborTable(await requestText(laborUrl))
      .filter((row) => row.operation.toLocaleLowerCase().startsWith('replace'));
    const signature = JSON.stringify(rows.map(({ operation, standard_hours }) => [operation, standard_hours]));
    if (!rows.length || signatures.has(signature)) continue;
    signatures.add(signature);
    operations.push({
      title: match.title,
      source_url: match.source_url,
      source_path: sourceOperationPath(match.source_url, partsLaborUrl),
      rows,
    });
  }
  return { job_id: jobId, operations };
}
