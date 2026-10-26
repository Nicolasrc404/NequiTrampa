import test from 'node:test';
import assert from 'node:assert/strict';

import {
  asRecord,
  centsToCopAmount,
  optionalSafeInteger,
  optionalString,
  requireArray,
  requireOneOf,
  requireSafeInteger,
  requireString,
  ServiceContractError,
} from '../../src/services/contract';

test('asRecord rechaza nulos, listas y primitivos', () => {
  for (const value of [null, undefined, [], 42, 'texto']) {
    assert.throws(
      () => asRecord(value, 'payload'),
      (error: unknown) =>
        error instanceof ServiceContractError && error.field === 'payload',
    );
  }
  assert.deepEqual(asRecord({ a: 1 }, 'payload'), { a: 1 });
});

test('requireString exige texto no vacío', () => {
  assert.equal(requireString({ id: 'abc' }, 'id'), 'abc');
  for (const value of ['', '   ', 12, null, undefined]) {
    assert.throws(
      () => requireString({ id: value }, 'id'),
      ServiceContractError,
    );
  }
});

test('optionalString distingue ausente de inválido', () => {
  assert.equal(optionalString({}, 'alias'), null);
  assert.equal(optionalString({ alias: null }, 'alias'), null);
  assert.equal(optionalString({ alias: 'neo' }, 'alias'), 'neo');
  assert.throws(
    () => optionalString({ alias: 7 }, 'alias'),
    ServiceContractError,
  );
});

test('requireSafeInteger rechaza decimales y respeta los límites', () => {
  assert.equal(requireSafeInteger({ n: 10 }, 'n'), 10);
  assert.throws(() => requireSafeInteger({ n: 10.5 }, 'n'), ServiceContractError);
  assert.throws(
    () => requireSafeInteger({ n: Number.NaN }, 'n'),
    ServiceContractError,
  );
  assert.throws(
    () => requireSafeInteger({ n: -1 }, 'n', { min: 0 }),
    ServiceContractError,
  );
  assert.throws(
    () => requireSafeInteger({ n: 201 }, 'n', { max: 200 }),
    ServiceContractError,
  );
});

test('optionalSafeInteger devuelve null solo cuando falta', () => {
  assert.equal(optionalSafeInteger({}, 'balanceAfterCents'), null);
  assert.equal(optionalSafeInteger({ balanceAfterCents: null }, 'balanceAfterCents'), null);
  assert.equal(optionalSafeInteger({ balanceAfterCents: 0 }, 'balanceAfterCents'), 0);
  assert.throws(
    () => optionalSafeInteger({ balanceAfterCents: '0' }, 'balanceAfterCents'),
    ServiceContractError,
  );
});

test('requireArray rechaza objetos', () => {
  assert.deepEqual(requireArray({ items: [1, 2] }, 'items'), [1, 2]);
  assert.throws(() => requireArray({ items: {} }, 'items'), ServiceContractError);
});

test('requireOneOf solo acepta valores de la lista', () => {
  assert.equal(requireOneOf({ s: 'B' }, 's', ['A', 'B'] as const), 'B');
  assert.throws(() => requireOneOf({ s: 'C' }, 's', ['A', 'B'] as const), ServiceContractError);
});

test('centsToCopAmount serializa centavos sin error binario', () => {
  assert.equal(centsToCopAmount(100), 1);
  assert.equal(centsToCopAmount(123456), 1234.56);
  assert.equal(centsToCopAmount(999), 9.99);
  assert.equal(centsToCopAmount(0), 0);
  assert.throws(() => centsToCopAmount(-1), ServiceContractError);
  assert.throws(() => centsToCopAmount(10.5), ServiceContractError);
});
