import test from 'node:test';
import assert from 'node:assert/strict';

import {
  bogotaDayKey,
  formatBogotaDateTime,
  formatBogotaTime,
  parseApiDate,
} from '../../src/utils/datetime';

test('formatBogotaDateTime usa la hora de Colombia (UTC-5)', () => {
  assert.equal(
    formatBogotaDateTime('2026-10-08T14:02:00Z'),
    '8 oct 2026 · 9:02 a. m.',
  );
  assert.equal(
    formatBogotaDateTime('2026-12-31T23:30:00Z'),
    '31 dic 2026 · 6:30 p. m.',
  );
});

test('formatBogotaTime maneja medianoche y mediodía en 12 horas', () => {
  assert.equal(formatBogotaTime('2026-10-09T05:00:00Z'), '12:00 a. m.');
  assert.equal(formatBogotaTime('2026-10-08T17:00:00Z'), '12:00 p. m.');
  assert.equal(formatBogotaTime('2026-10-08T04:05:00Z'), '11:05 p. m.');
});

test('fechas inválidas no se inventan', () => {
  assert.equal(formatBogotaDateTime('no-es-fecha'), 'no-es-fecha');
  assert.equal(formatBogotaDateTime(null), '—');
  assert.equal(formatBogotaDateTime(undefined), '—');
  assert.equal(formatBogotaTime('no-es-fecha'), 'no-es-fecha');
  assert.equal(parseApiDate('no-es-fecha'), null);
  assert.equal(parseApiDate(null), null);
});

test('bogotaDayKey agrupa según el día colombiano, no el UTC', () => {
  assert.equal(bogotaDayKey('2026-10-09T03:00:00Z'), '2026-10-08');
  assert.equal(bogotaDayKey('2026-10-09T05:00:00Z'), '2026-10-09');
  assert.equal(bogotaDayKey('no-es-fecha'), null);
});

test('parseApiDate expone las partes desplazadas a Colombia', () => {
  const parsed = parseApiDate('2026-10-08T14:02:00Z');
  assert.ok(parsed);
  assert.equal(parsed.parts.year, 2026);
  assert.equal(parsed.parts.month, 9);
  assert.equal(parsed.parts.day, 8);
  assert.equal(parsed.parts.hours, 9);
  assert.equal(parsed.parts.minutes, 2);
});
