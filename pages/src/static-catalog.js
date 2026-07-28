const staticLaborIndexPath = './data/index.json';

export async function loadStaticLaborIndex(fetchJson) {
  return fetchJson(staticLaborIndexPath);
}

export async function loadStaticMakeLaborCatalog(fetchJson, index, make) {
  const entry = index.find((candidate) => candidate.make === make);
  return entry ? fetchJson(entry.path) : [];
}

export function findStaticLaborRecord(records, { manualUrl, jobId }) {
  const matches = records.filter((record) => (
    record.manual_url === manualUrl && record.job_id === jobId
  ));
  return matches.length === 1 ? matches[0] : null;
}
