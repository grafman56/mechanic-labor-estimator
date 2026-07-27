export function manualOperationOptions(operations) {
  const showPath = operations.length > 1;
  return operations.map((operation) => ({
    label: showPath ? `${operation.title} — ${operation.source_path}` : operation.title,
    value: operation.source_url,
  }));
}
