export function sourceScopeOptions(rows) {
  return rows.map((row) => ({
    label: `${row.operation} — ${row.standard_hours} hr`,
    value: row.operation,
  }));
}
