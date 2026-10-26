import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isRetryableKind,
  kindForStatus,
  parseProblemDetails,
  parseRetryAfter,
  STATUS_TITLES,
} from '../../src/services/http/problemDetails';

const headersWith = (values: Record<string, string>) => ({
  get: (name: string) => values[name.toLowerCase()] ?? null,
});

test('parseProblemDetails lee el formato RFC 9457 del backend', () => {
  const body = JSON.stringify({
    type: 'https://errors.nequitrampa.internal/missing-idempotency-key',
    title: 'Encabezado Idempotency-Key requerido',
    status: 400,
    detail: 'Las operaciones de transferencia requieren una clave.',
    code: 'MISSING_IDEMPOTENCY_KEY',
    instance: '/v1/transfers',
  });

  const problem = parseProblemDetails(400, body);
  assert.equal(problem.title, 'Encabezado Idempotency-Key requerido');
  assert.equal(problem.status, 400);
  assert.equal(problem.code, 'MISSING_IDEMPOTENCY_KEY');
  assert.equal(problem.instance, '/v1/transfers');
  assert.match(problem.detail ?? '', /clave/);
});

test('parseProblemDetails normaliza errores de validación por campo', () => {
  const body = JSON.stringify({
    title: 'Revisa los campos',
    status: 422,
    errors: {
      amount: ['El monto debe ser mayor a 0.'],
      alias: 'Alias inválido',
      ignored: [],
    },
  });

  const problem = parseProblemDetails(422, body);
  assert.deepEqual(problem.errors, {
    amount: ['El monto debe ser mayor a 0.'],
    alias: ['Alias inválido'],
  });
});

test('parseProblemDetails usa títulos por estado cuando el cuerpo no es JSON', () => {
  const problem = parseProblemDetails(503, '<html>upstream error</html>');
  assert.equal(problem.title, STATUS_TITLES[503]);
  assert.equal(problem.detail, undefined);

  const textProblem = parseProblemDetails(502, 'Bad gateway');
  assert.equal(textProblem.title, STATUS_TITLES[502]);
  assert.equal(textProblem.detail, 'Bad gateway');
});

test('parseProblemDetails ignora el status del cuerpo y conserva el HTTP real', () => {
  const body = JSON.stringify({ title: 'Conflicto', status: 200 });
  assert.equal(parseProblemDetails(409, body).status, 409);
});

test('parseProblemDetails recupera el requestId de extensión o de cabecera', () => {
  const fromBody = parseProblemDetails(
    400,
    JSON.stringify({ title: 'Error', requestId: 'req-body' }),
  );
  assert.equal(fromBody.traceId, 'req-body');

  const fromHeader = parseProblemDetails(
    400,
    JSON.stringify({ title: 'Error' }),
    headersWith({ 'x-request-id': 'req-header' }),
  );
  assert.equal(fromHeader.traceId, 'req-header');
});

test('parseProblemDetails no lanza con JSON corrupto', () => {
  const problem = parseProblemDetails(500, '{"title": ');
  assert.equal(problem.title, STATUS_TITLES[500]);
});

test('kindForStatus cubre los códigos que maneja la app', () => {
  assert.equal(kindForStatus(400), 'bad_request');
  assert.equal(kindForStatus(401), 'unauthorized');
  assert.equal(kindForStatus(403), 'forbidden');
  assert.equal(kindForStatus(404), 'not_found');
  assert.equal(kindForStatus(409), 'conflict');
  assert.equal(kindForStatus(422), 'unprocessable');
  assert.equal(kindForStatus(429), 'rate_limited');
  assert.equal(kindForStatus(500), 'server_error');
  assert.equal(kindForStatus(503), 'unavailable');
  assert.equal(kindForStatus(418), 'client_error');
  assert.equal(kindForStatus(599), 'server_error');
  assert.equal(kindForStatus(200), 'unexpected');
});

test('solo los errores transitorios son reintentables', () => {
  assert.equal(isRetryableKind('rate_limited'), true);
  assert.equal(isRetryableKind('server_error'), true);
  assert.equal(isRetryableKind('unavailable'), true);
  assert.equal(isRetryableKind('network'), true);
  assert.equal(isRetryableKind('timeout'), true);
  assert.equal(isRetryableKind('conflict'), false);
  assert.equal(isRetryableKind('unprocessable'), false);
  assert.equal(isRetryableKind('unauthorized'), false);
  assert.equal(isRetryableKind('not_found'), false);
});

test('parseRetryAfter acepta segundos y fechas HTTP', () => {
  assert.equal(parseRetryAfter('30'), 30);
  assert.equal(parseRetryAfter(' 0 '), 0);
  assert.equal(parseRetryAfter(undefined), undefined);
  assert.equal(parseRetryAfter('no-es-fecha'), undefined);
  assert.equal(parseRetryAfter(''), undefined);

  const now = Date.parse('2026-01-01T00:00:00Z');
  assert.equal(parseRetryAfter('Thu, 01 Jan 2026 00:00:45 GMT', now), 45);
  assert.equal(parseRetryAfter('Thu, 01 Jan 2025 00:00:45 GMT', now), 0);
});
