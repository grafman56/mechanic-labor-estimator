const headings = {
  required: 'Required by procedure',
  'replace-if-removed': 'Replace if removed / disturbed',
  inspect: 'Inspection or measurement called out',
};

const contextHeadings = {
  'removal-access': 'Source removal and access context',
  reinstallation: 'Source reinstallation context',
  'drain-handling': 'Source drain and handling context',
  other: 'Source procedure context',
};

export function procedureContextGroups(contextSteps) {
  return Object.entries(contextHeadings)
    .map(([kind, heading]) => ({
      heading,
      items: contextSteps.filter((item) => (item.kind ?? 'other') === kind),
    }))
    .filter((group) => group.items.length);
}

export function procedureContextGroup(result) {
  if (result?.status !== 'available' || !result.context_steps?.length) return null;
  return {
    heading: 'Source procedure context',
    summary: `${result.context_steps.length} source procedure step${result.context_steps.length === 1 ? '' : 's'}: ${result.context_steps[0].reason}`,
    note: 'Informational procedure steps only. A removal or reinstallation, including a named component or fastener, does not establish replacement parts, additional labor, or a package recommendation.',
    items: result.context_steps.map(({ reason, source_url }) => ({ reason, source_url })),
  };
}

export function jobAwarenessGroup(result) {
  if (result?.status === 'unavailable') {
    return {
      heading: 'Source-backed job awareness',
      summary: 'Procedure awareness unavailable for this exact operation.',
      unavailable: result.reason ?? 'No source-backed procedure awareness was found for this exact manual and operation.',
    };
  }
  const evidenceGroups = procedureEvidenceGroups(result);
  const context = procedureContextGroup(result);
  const evidenceCount = evidenceGroups.reduce((count, group) => count + group.items.length, 0);
  const contextCount = context?.items.length ?? 0;
  if (!evidenceCount && !contextCount) return null;
  const summaryParts = [
    evidenceCount ? `${evidenceCount} procedure note${evidenceCount === 1 ? '' : 's'}` : '',
    contextCount ? `${contextCount} source procedure step${contextCount === 1 ? '' : 's'}` : '',
  ].filter(Boolean);
  return {
    heading: 'Source-backed job awareness',
    summary: `${summaryParts.join(', ')}${context ? `: ${context.items[0].reason}` : ''}`,
    evidenceGroups,
    context,
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
