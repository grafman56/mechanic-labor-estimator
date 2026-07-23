export async function availableManuals(manuals, hasPartsLabor) {
  const checks = await Promise.all(manuals.map(async (manual) => (
    (await hasPartsLabor(manual)) ? manual : null
  )));
  return checks.filter(Boolean);
}
