export async function availableManuals(manuals, hasPartsLabor) {
  const checks = await Promise.all(manuals.map(async (manual) => (
    (await hasPartsLabor(manual)) ? manual : null
  )));
  return checks.filter(Boolean);
}

export function sourceConfigurationLabel(manual) {
  const pathSegments = new URL(manual.manual_url).pathname.split('/').filter(Boolean);
  return decodeURIComponent(pathSegments.at(-1));
}

export function manualAvailabilityStatus(candidates, manuals) {
  if (!manuals.length) {
    return candidates.length
      ? 'No source Parts and Labor page is available for this source configuration. This is not a job result.'
      : 'No source configuration is available for this selection.';
  }
  return `LEMON labor data available for source configuration: ${sourceConfigurationLabel(manuals[0])}.`;
}
