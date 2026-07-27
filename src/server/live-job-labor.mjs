import { findExactOperationLinks, validateManualUrl } from './manual-lookup.mjs';
import { parseLaborTable, TIER1_JOB_ALIASES } from './live-job-rows.mjs';

const REQUEST_TIMEOUT_MS = 30_000;
const LABOR_SCOPE_TERMS = {
  'front-struts': {
    left: [['Front Suspension', 'One Side']],
    right: [['Front Suspension', 'One Side']],
    both: [['Front Suspension', 'Both Sides']],
  },
  'rear-struts-shocks': {
    left: [['Rear Suspension', 'One Side']],
    right: [['Rear Suspension', 'One Side']],
    both: [['Rear Suspension', 'Both Sides']],
  },
  'wheel-bearing-hub': {
    'front-one': [['Front Suspension', 'One Side']],
    'front-both': [['Front Suspension', 'Both Sides']],
    'hub-one': [['Hub & Bearing Assembly', 'One Side']],
    'hub-both': [['Hub & Bearing Assembly', 'Both Sides']],
  },
  'valve-cover-gasket': {
    front: [['Front Bank'], ['One Bank']],
    rear: [['Rear Bank'], ['One Bank']],
    both: [['Both Banks']],
  },
};

async function defaultRequestText(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'MechanicLaborPlanner/0.1 personal-use lookup' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Source request failed with HTTP ${response.status}.`);
  return response.text();
}

function unavailable(jobId, reason) {
  return { status: 'unavailable', job_id: jobId, reason };
}

function selectLaborRow(rows, jobId, scope, sourceRow) {
  if (sourceRow) {
    const matches = rows.filter((row) => row.operation === sourceRow);
    return matches.length === 1 ? [matches[0], 'published-operation'] : [null, null];
  }
  const replaceRows = rows.filter((row) => row.operation.toLocaleLowerCase().startsWith('replace'));
  const termGroups = scope ? LABOR_SCOPE_TERMS[jobId]?.[scope] : null;
  if (termGroups) {
    for (const terms of termGroups) {
      const matches = replaceRows.filter((row) => terms.every((term) => row.operation.toLocaleLowerCase().includes(term.toLocaleLowerCase())));
      if (matches.length === 1) return [matches[0], 'replace'];
    }
    return [null, null];
  }
  if (replaceRows.length === 1) return [replaceRows[0], 'replace'];
  if (!replaceRows.length && rows.length === 1) return [rows[0], 'published-operation'];
  return [null, null];
}

export async function lookupJobLabor(manualUrlValue, jobId, { scope, source_row: sourceRow, source_operation_url: sourceOperationUrl } = {}, { requestText = defaultRequestText } = {}) {
  const manualUrl = validateManualUrl(manualUrlValue);
  if (!manualUrl) throw new Error('Unsupported manual URL');
  const aliases = TIER1_JOB_ALIASES[jobId];
  if (!aliases) throw new Error('Unsupported repair job');
  const partsLaborUrl = new URL('Parts%20and%20Labor/', manualUrl).href;
  let matches;
  try {
    matches = findExactOperationLinks(await requestText(partsLaborUrl), aliases, partsLaborUrl);
  } catch {
    return unavailable(jobId, 'Source Parts and Labor page is unavailable.');
  }
  if (!matches.length) return unavailable(jobId, 'No exact source operation found.');
  if (sourceOperationUrl) {
    matches = matches.filter((match) => match.source_url === sourceOperationUrl);
    if (!matches.length) return unavailable(jobId, 'Selected source operation is unavailable for this manual.');
  }
  const selections = [];
  for (const match of matches) {
    const laborUrl = new URL('Labor%20Times/', match.source_url).href;
    try {
      const [row, timeBasis] = selectLaborRow(parseLaborTable(await requestText(laborUrl)), jobId, scope, sourceRow);
      if (row) selections.push({ match, laborUrl, row, timeBasis });
    } catch {
      return unavailable(jobId, 'Source labor page is unavailable.');
    }
  }
  if (!selections.length) return unavailable(jobId, 'No unambiguous source replace time found.');
  const signatures = new Set(selections.map(({ row, timeBasis }) => JSON.stringify([row.operation, row.standard_hours, timeBasis])));
  if (signatures.size !== 1) return unavailable(jobId, 'Multiple exact source operations require review.');
  const { match, laborUrl, row, timeBasis } = selections[0];
  return {
    status: 'available',
    job_id: jobId,
    source_operation: match.title,
    source_url: laborUrl,
    standard_hours: row.standard_hours,
    time_basis: timeBasis,
  };
}