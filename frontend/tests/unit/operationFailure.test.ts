import test from 'node:test';
import assert from 'node:assert/strict';

import { ApiError } from '../../src/services/http';
import {
  classifyOperationFailure,
  isAmbiguousFailure,
} from '../../src/services/operationFailure';

function problem(status: number, code?: string): ApiError {
  return ApiError.fromResponse(
    status,
    JSON.stringify({
      title: 'Error',
      status,
      ...(code ? { code } : {}),
    }),
  );
}

test('los códigos de negocio financieros tienen prioridad sobre el estado HTTP', () => {
  assert.equal(
    classifyOperationFailure(problem(422, 'INSUFFICIENT_FUNDS')),
    'insufficient_funds',
  );
  assert.equal(
    classifyOperationFailure(problem(422, 'LIMIT_EXCEEDED')),
    'limit_exceeded',
  );
  assert.equal(
    classifyOperationFailure(problem(400, 'LIMIT_EXCEEDED')),
    'limit_exceeded',
  );
});

test('clasifica cada estado HTTP en la intención de UI correspondiente', () => {
  const cases: Array<[number, string]> = [
    [400, 'validation'],
    [401, 'session'],
    [403, 'forbidden'],
    [404, 'not_found'],
    [409, 'conflict'],
    [422, 'validation'],
    [429, 'rate_limited'],
    [500, 'server_error'],
    [502, 'server_error'],
    [503, 'unavailable'],
    [504, 'unavailable'],
  ];
  for (const [status, expected] of cases) {
    assert.equal(classifyOperationFailure(problem(status)), expected, `status ${status}`);
  }
});

test('timeout y red son resultados inciertos, no rechazos', () => {
  for (const error of [
    ApiError.fromTransport('timeout'),
    ApiError.fromTransport('network'),
  ]) {
    const kind = classifyOperationFailure(error);
    assert.equal(kind, 'uncertain');
    assert.equal(isAmbiguousFailure(kind), true);
  }
});

test('la cancelación se distingue de un resultado incierto', () => {
  const kind = classifyOperationFailure(ApiError.fromTransport('aborted'));
  assert.equal(kind, 'cancelled');
  assert.equal(isAmbiguousFailure(kind), false);
});

test('errores desconocidos y no-ApiError no se interpretan como éxito', () => {
  assert.equal(classifyOperationFailure(new Error('boom')), 'unknown');
  assert.equal(classifyOperationFailure('texto'), 'unknown');
  assert.equal(classifyOperationFailure(null), 'unknown');
});

test('solo uncertain se considera ambiguo', () => {
  const kinds = [
    'validation',
    'session',
    'forbidden',
    'not_found',
    'conflict',
    'insufficient_funds',
    'limit_exceeded',
    'rate_limited',
    'server_error',
    'unavailable',
    'uncertain',
    'cancelled',
    'unknown',
  ] as const;
  for (const kind of kinds) {
    assert.equal(isAmbiguousFailure(kind), kind === 'uncertain');
  }
});
