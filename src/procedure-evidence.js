const headings = {
  required: 'Required by procedure',
  'replace-if-removed': 'Replace if removed / disturbed',
  inspect: 'Inspection or measurement called out',
};

export function procedureContextGroup(result) {
  if (result?.status !== 'available' || !result.context_steps?.length) return null;
  return {
    heading: 'Procedure context',
    note: 'Informational procedure steps only. They do not add labor, parts, or a package recommendation.',
    items: result.context_steps.map(({ reason, source_url }) => ({ reason, source_url })),
  };
}

export function procedureEvidenceGroups(result) {
  if (result?.status !== 'available') return [];
  return Object.entries(headings)
    .map(([kind, heading]) => ({
      heading,
      items: result.items
        .filter((item) => item.kind === kind)
        .map(({ label, reason, source_url }) => ({ label, reason, source_url })),
    }))
    .filter((group) => group.items.length);
}
