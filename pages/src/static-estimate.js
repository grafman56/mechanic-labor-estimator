function vehicleLabel(record) {
  return `${record.year} ${record.make} ${record.model} · ${record.configuration}`;
}

function validIdentity(record) {
  return record && Number.isInteger(record.year)
    && typeof record.make === 'string'
    && typeof record.model === 'string'
    && typeof record.configuration === 'string'
    && typeof record.checked_at === 'string';
}

export function staticEstimateModel(record) {
  if (!validIdentity(record)) return null;
  const vehicle = vehicleLabel(record);
  if (record.status === 'available'
    && typeof record.hours === 'number'
    && record.hours >= 0
    && typeof record.source_operation === 'string'
    && typeof record.source_row === 'string'
    && typeof record.source_url === 'string') {
    return {
      status: 'available',
      heading: record.source_operation,
      vehicle,
      hours: record.hours,
      sourceRow: record.source_row,
      sourceUrl: record.source_url,
      checkedAt: record.checked_at,
    };
  }
  if (record.status === 'unavailable' && typeof record.reason === 'string') {
    return {
      status: 'unavailable',
      heading: 'No bundled labor result',
      vehicle,
      reason: record.reason,
      checkedAt: record.checked_at,
    };
  }
  return null;
}
