import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CASE_STATUS_LABEL,
  OPERATION_TYPE_LABEL,
  PRIORITY_LABEL,
  formatCents,
  formatDateTime,
  toneForStatus,
} from '../../src/utils/format';

test('formatCents da pesos con miles y centavos solo si existen', () => {
  assert.equal(formatCents(85000000), '$850.000');
  assert.equal(formatCents(2500000), '$25.000');
  assert.equal(formatCents(0), '$0');
  assert.equal(formatCents(123456), '$1.234,56');
  assert.equal(formatCents(-100000), '-$1.000');
  assert.equal(formatCents(null), '—');
  assert.equal(formatCents(undefined), '—');
});

test('formatDateTime muestra la hora de Colombia y los segundos cuando se piden', () => {
  assert.equal(formatDateTime('2026-10-08T14:02:00Z'), '8 oct 2026 · 9:02 a. m.');
  assert.equal(formatDateTime('2026-10-08T18:22:38.8968823Z'), '8 oct 2026 · 1:22 p. m.');
  assert.equal(formatDateTime('2026-10-08T18:22:38.8968823Z', true), '8 oct 2026 · 1:22:38 p. m.');
  assert.equal(formatDateTime('2026-10-09T05:00:05Z', true), '9 oct 2026 · 12:00:05 a. m.');
});

test('formatDateTime tolera valores ausentes o inválidos sin lanzar', () => {
  assert.equal(formatDateTime(null), '—');
  assert.equal(formatDateTime(undefined, true), '—');
  assert.equal(formatDateTime('no-es-fecha'), 'no-es-fecha');
  assert.equal(formatDateTime('no-es-fecha', true), 'no-es-fecha');
});

test('las etiquetas cubren los valores reales del backend', () => {
  for (const status of ['OPEN', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED']) {
    assert.ok(CASE_STATUS_LABEL[status], `falta etiqueta de caso ${status}`);
  }
  for (const priority of ['LOW', 'MEDIUM', 'HIGH', 'URGENT']) {
    assert.ok(PRIORITY_LABEL[priority], `falta etiqueta de prioridad ${priority}`);
  }
  for (const type of ['INTERNAL_TRANSFER', 'SIMULATED_RECHARGE', 'REVERSAL', 'ADMIN_ADJUSTMENT']) {
    assert.ok(OPERATION_TYPE_LABEL[type], `falta etiqueta de operación ${type}`);
  }
});

test('toneForStatus asigna un tono estable por estado', () => {
  assert.equal(toneForStatus('COMPLETED'), 'ok');
  assert.equal(toneForStatus('completed'), 'ok');
  assert.equal(toneForStatus('PENDING'), 'warn');
  assert.equal(toneForStatus('REVERSED'), 'info');
  assert.equal(toneForStatus('CLOSED'), 'danger');
  assert.equal(toneForStatus('OPEN'), 'brand');
  assert.equal(toneForStatus('ALGO_NUEVO'), 'neutral');
});
