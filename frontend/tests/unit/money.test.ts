import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addCents,
  assertCents,
  centsToCopDecimal,
  copDecimalToCents,
  formatCopCents,
  isZeroCents,
  isValidCents,
  MoneyError,
  parseCopInput,
  subtractCents,
  sumCents,
} from '../../src/utils/money';

test('copDecimalToCents convierte decimales exactos sin punto flotante', () => {
  assert.equal(copDecimalToCents('1234.56'), 123456);
  assert.equal(copDecimalToCents('1234'), 123400);
  assert.equal(copDecimalToCents('10.5'), 1050);
  assert.equal(copDecimalToCents('0.01'), 1);
  assert.equal(copDecimalToCents('0010.05'), 1005);
  assert.equal(copDecimalToCents('-5'), -500);
  assert.equal(copDecimalToCents(1234.56), 123456);
});

test('copDecimalToCents rechaza montos con más de dos decimales', () => {
  assert.throws(() => copDecimalToCents('10.555'), MoneyError);
  assert.throws(() => copDecimalToCents('5.999'), MoneyError);
});

test('copDecimalToCents no acepta artefactos de coma flotante', () => {
  // 0.1 + 0.2 === 0.30000000000000004: se rechaza en lugar de redondear en silencio.
  assert.throws(() => copDecimalToCents(0.1 + 0.2), MoneyError);
  assert.throws(() => copDecimalToCents(Number.NaN), MoneyError);
  assert.throws(() => copDecimalToCents(Number.POSITIVE_INFINITY), MoneyError);
  assert.throws(() => copDecimalToCents(1e21), MoneyError);
});

test('centsToCopDecimal produce el decimal que espera el backend', () => {
  assert.equal(centsToCopDecimal(123456), '1234.56');
  assert.equal(centsToCopDecimal(5), '0.05');
  assert.equal(centsToCopDecimal(0), '0.00');
  assert.equal(centsToCopDecimal(-5), '-0.05');
});

test('round trip decimal → centavos → decimal', () => {
  const samples = ['0.01', '0.99', '1.00', '999999.99', '2000000.00'];
  for (const sample of samples) {
    assert.equal(centsToCopDecimal(copDecimalToCents(sample)), sample);
  }
});

test('parseCopInput interpreta entradas de usuario en formato es-CO y en-US', () => {
  assert.equal(parseCopInput('$ 1.234,56'), 123456);
  assert.equal(parseCopInput('1.234,56'), 123456);
  assert.equal(parseCopInput('1,234.56'), 123456);
  assert.equal(parseCopInput('COP 50.000'), 5000000);
  assert.equal(parseCopInput('1234'), 123400);
  assert.equal(parseCopInput('1.234'), 123400);
  assert.equal(parseCopInput('1.234.567'), 123456700);
  assert.equal(parseCopInput('1.23'), 123);
  assert.equal(parseCopInput('1234,5'), 123450);
  assert.equal(parseCopInput('  2000000  '), 200000000);
  // Tres dígitos tras el punto se interpretan como separador de miles (es-CO).
  assert.equal(parseCopInput('10.555'), 1055500);
});

test('parseCopInput devuelve null para entradas inválidas', () => {
  assert.equal(parseCopInput(''), null);
  assert.equal(parseCopInput('   '), null);
  assert.equal(parseCopInput('abc'), null);
  assert.equal(parseCopInput('12a3'), null);
  assert.equal(parseCopInput('12,34,56'), null);
  assert.equal(parseCopInput(null), null);
  assert.equal(parseCopInput(undefined), null);
  assert.equal(parseCopInput('-5'), null);
});

test('parseCopInput admite negativos de forma explícita y respeta el tope', () => {
  assert.equal(parseCopInput('-5', { allowNegative: true }), -500);
  assert.equal(parseCopInput('2.000.000', { maxCents: 200_000_000 }), 200_000_000);
  assert.equal(parseCopInput('2.000.001', { maxCents: 200_000_000 }), null);
  assert.equal(parseCopInput('999', { maxCents: 99_900 }), 99900);
});

test('formatCopCents respeta el formato de los diseños', () => {
  assert.equal(formatCopCents(123456), '$ 1.234,56');
  assert.equal(formatCopCents(123400), '$ 1.234');
  assert.equal(formatCopCents(0), '$ 0');
  assert.equal(formatCopCents(100000000), '$ 1.000.000');
  assert.equal(formatCopCents(-123456), '-$ 1.234,56');
  assert.equal(formatCopCents(5), '$ 0,05');
});

test('formatCopCents admite opciones de presentación', () => {
  assert.equal(formatCopCents(123400, { showCents: 'always' }), '$ 1.234,00');
  assert.equal(formatCopCents(123456, { showCents: 'never' }), '$ 1.234');
  assert.equal(formatCopCents(123456, { withSymbol: false }), '1.234,56');
  assert.equal(formatCopCents(123456, { groupThousands: false }), '$ 1234,56');
});

test('aritmética de centavos valida enteros y desbordamiento', () => {
  assert.equal(addCents(0, 1, 2, 3), 6);
  assert.equal(sumCents([100, 200]), 300);
  assert.equal(sumCents([]), 0);
  assert.equal(subtractCents(500, 200), 300);
  assert.equal(isZeroCents(0), true);
  assert.equal(isZeroCents(1), false);
  assert.throws(() => assertCents(1.5), MoneyError);
  assert.throws(() => addCents(Number.MAX_SAFE_INTEGER, 1), MoneyError);
  assert.throws(() => addCents(1, 0.5), MoneyError);
  assert.equal(isValidCents(10), true);
  assert.equal(isValidCents(Number.NaN), false);
  assert.equal(isValidCents('10'), false);
});
