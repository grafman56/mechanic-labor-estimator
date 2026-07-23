const headings = {
  required: 'Required by procedure',
  'replace-if-removed': 'Replace if removed / disturbed',
  inspect: 'Inspection or measurement called out',
};

export function procedureEvidenceGroups(result) {
  if (result?.status !== 'available') return [];
  return Object.entries(headings)
    .map(([kind, heading]) => ({ heading, items: result.items.filter((item) => item.kind === kind).map((item) => item.label) }))
    .filter((group) => group.items.length);
}
