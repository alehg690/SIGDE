export function parseReportDate(value: string): Date {
  // SQLite CURRENT_TIMESTAMP stores UTC without an explicit timezone.
  const sqliteTimestamp = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/;
  return new Date(sqliteTimestamp.test(value) ? `${value.replace(' ', 'T')}Z` : value);
}
