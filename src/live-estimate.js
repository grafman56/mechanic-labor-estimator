export function supportsManualEstimate(manual) {
  return Boolean(manual?.year && manual?.make && manual?.model && manual?.engine && manual?.manual_url);
}

export function liveEstimateModel(result, vehicle, laborRate) {
  if (result.status !== 'available') return null;
  const rate = Number(laborRate);
  return {
    operation: result.source_operation,
    sourceUrl: result.source_url,
    laborHours: result.standard_hours,
    laborCost: Number.isFinite(rate) && rate > 0 ? result.standard_hours * rate : null,
    vehicle: `${vehicle.year} ${vehicle.make} ${vehicle.model} · ${vehicle.engine}`,
  };
}
