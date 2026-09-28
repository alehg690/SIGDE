import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../frontend/src/lib/report-dates.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext },
});
const { parseReportDate } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const originalTimezone = process.env.TZ;

try {
  for (const timezone of ['America/Bogota', 'UTC', 'Asia/Tokyo']) {
    process.env.TZ = timezone;
    for (const value of ['2026-09-28 04:32:00', '2026-09-28T04:32:00Z', '2026-09-27T23:32:00-05:00']) {
      const date = parseReportDate(value);
      assert.equal(date.toISOString(), '2026-09-28T04:32:00.000Z');
      assert.equal(new Intl.DateTimeFormat('en-GB', {
        timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
      }).format(date), '23:32');
    }
    assert.equal(parseReportDate('2026-09-28 04:32:00.123').toISOString(), '2026-09-28T04:32:00.123Z');
    assert.ok(Number.isNaN(parseReportDate('invalid').getTime()));
  }
  console.log('OK: fechas SQLite e ISO coherentes en tres zonas horarias y hora de Colombia.');
} finally {
  if (originalTimezone === undefined) delete process.env.TZ;
  else process.env.TZ = originalTimezone;
}
