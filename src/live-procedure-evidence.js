export async function fetchProcedureEvidence(fetchImpl, { url, job, source_operation_url }) {
  const response = await fetchImpl(`/api/procedure-evidence?${new URLSearchParams({
    url,
    job,
    source_operation_url,
  })}`, { cache: 'no-store' });
  return response.ok ? response.json() : { status: 'unavailable' };
}
