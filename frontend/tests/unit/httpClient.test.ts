import test from 'node:test';
import assert from 'node:assert/strict';

import { ApiError } from '../../src/services/http/ApiError';
import { createHttpClient } from '../../src/services/http/client';

interface FakeCall {
  readonly url: string;
  readonly init: RequestInit;
}

function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  const normalized = new Map(
    Object.entries({ 'content-type': 'application/json', ...headers }).map(
      ([key, value]) => [key.toLowerCase(), value] as const,
    ),
  );
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (name: string) => normalized.get(name.toLowerCase()) ?? null },
    text: async () =>
      typeof body === 'string' ? body : body === undefined ? '' : JSON.stringify(body),
  } as unknown as Response;
}

function createFetcher(
  handler: (call: FakeCall) => Response | Promise<Response>,
): { fetcher: typeof fetch; calls: FakeCall[] } {
  const calls: FakeCall[] = [];
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const call: FakeCall = { url: String(input), init: init ?? {} };
    calls.push(call);
    return handler(call);
  }) as unknown as typeof fetch;
  return { fetcher, calls };
}

function headersOf(call: FakeCall): Record<string, string> {
  return (call.init.headers ?? {}) as Record<string, string>;
}

function pendingUntilAborted(): typeof fetch {
  return (async (_input: RequestInfo | URL, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        const error = new Error('Aborted');
        error.name = 'AbortError';
        reject(error);
      });
    })) as unknown as typeof fetch;
}

test('createHttpClient rechaza URLs base inválidas', () => {
  assert.throws(() => createHttpClient({ baseUrl: '' }), /baseUrl/);
  assert.throws(() => createHttpClient({ baseUrl: 'ftp://api.test' }), /baseUrl/);
  assert.throws(() => createHttpClient({ baseUrl: 'api.test' }), /baseUrl/);
});

test('GET construye la URL, omite parámetros vacíos y adjunta Accept', async () => {
  const { fetcher, calls } = createFetcher(() => jsonResponse({ ok: true }));
  const client = createHttpClient({ baseUrl: 'https://api.test/', fetchImpl: fetcher });

  const data = await client.get<{ ok: boolean }>('/v1/wallet/balance', {
    query: { page: 2, active: true, empty: '', skip: undefined, none: null },
  });

  assert.equal(data.ok, true);
  assert.equal(
    calls[0].url,
    'https://api.test/v1/wallet/balance?page=2&active=true',
  );
  assert.equal(headersOf(calls[0]).Accept, 'application/json');
  assert.equal(headersOf(calls[0])['Content-Type'], undefined);
  assert.equal(headersOf(calls[0]).Authorization, undefined);
});

test('GET codifica parámetros con caracteres especiales', async () => {
  const { fetcher, calls } = createFetcher(() => jsonResponse({}));
  const client = createHttpClient({ baseUrl: 'https://api.test', fetchImpl: fetcher });

  await client.get('/v1/movements', { query: { clientId: 'a b&c', limit: 20 } });

  assert.equal(calls[0].url, 'https://api.test/v1/movements?clientId=a%20b%26c&limit=20');
});

test('adjunta el JWT del proveedor de sesión', async () => {
  const { fetcher, calls } = createFetcher(() => jsonResponse({}));
  const client = createHttpClient({
    baseUrl: 'https://api.test',
    fetchImpl: fetcher,
    getAccessToken: async () => 'jwt-token',
  });

  await client.get('/v1/profile');

  assert.equal(headersOf(calls[0]).Authorization, 'Bearer jwt-token');
});

test('no adjunta Authorization cuando no hay sesión', async () => {
  const { fetcher, calls } = createFetcher(() => jsonResponse({}));
  const client = createHttpClient({
    baseUrl: 'https://api.test',
    fetchImpl: fetcher,
    getAccessToken: () => null,
  });

  await client.get('/v1/movements');

  assert.equal(headersOf(calls[0]).Authorization, undefined);
});

test('un proveedor de token que falla no rompe la solicitud', async () => {
  const { fetcher, calls } = createFetcher(() => jsonResponse({}));
  const client = createHttpClient({
    baseUrl: 'https://api.test',
    fetchImpl: fetcher,
    getAccessToken: () => {
      throw new Error('session store unavailable');
    },
  });

  await client.get('/v1/movements');

  assert.equal(headersOf(calls[0]).Authorization, undefined);
});

test('POST serializa el cuerpo, define Content-Type y envía Idempotency-Key', async () => {
  const { fetcher, calls } = createFetcher(() => jsonResponse({ id: 'trf-1' }, 201));
  const client = createHttpClient({ baseUrl: 'https://api.test', fetchImpl: fetcher });

  const result = await client.post<{ id: string }>(
    '/v1/transfers',
    { destinationTransferCode: 'LAUR-5120', amount: 15000.5, currency: 'COP' },
    { idempotencyKey: 'key-123' },
  );

  assert.equal(result.id, 'trf-1');
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(headersOf(calls[0])['Content-Type'], 'application/json');
  assert.equal(headersOf(calls[0])['Idempotency-Key'], 'key-123');
  assert.deepEqual(JSON.parse(String(calls[0].init.body)), {
    destinationTransferCode: 'LAUR-5120',
    amount: 15000.5,
    currency: 'COP',
  });
});

test('reutiliza la misma Idempotency-Key en un reintento', async () => {
  const { fetcher, calls } = createFetcher(() => jsonResponse({ id: 'trf-1' }, 201));
  const client = createHttpClient({ baseUrl: 'https://api.test', fetchImpl: fetcher });

  await client.post('/v1/transfers', { amount: 1 }, { idempotencyKey: 'same-key' });
  await client.post('/v1/transfers', { amount: 1 }, { idempotencyKey: 'same-key' });

  assert.equal(headersOf(calls[0])['Idempotency-Key'], 'same-key');
  assert.equal(headersOf(calls[1])['Idempotency-Key'], 'same-key');
});

test('204 sin cuerpo devuelve undefined', async () => {
  const { fetcher } = createFetcher(() => jsonResponse(undefined, 204));
  const client = createHttpClient({ baseUrl: 'https://api.test', fetchImpl: fetcher });

  const result = await client.delete('/v1/categories/1');
  assert.equal(result, undefined);
});

test('clasifica correctamente cada código de error HTTP', async () => {
  const cases: Array<[number, string]> = [
    [400, 'bad_request'],
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'not_found'],
    [409, 'conflict'],
    [422, 'unprocessable'],
    [429, 'rate_limited'],
    [500, 'server_error'],
    [503, 'unavailable'],
  ];

  for (const [status, kind] of cases) {
    const { fetcher } = createFetcher(() =>
      jsonResponse({ title: 'Fallo', detail: 'detalle' }, status),
    );
    const client = createHttpClient({
      baseUrl: 'https://api.test',
      fetchImpl: fetcher,
      onUnauthorized: () => undefined,
    });

    const error = await client.get('/v1/x').then(
      () => null,
      (caught: unknown) => caught as ApiError,
    );
    assert.ok(error instanceof ApiError, `status ${status}`);
    assert.equal(error.kind, kind);
    assert.equal(error.status, status);
  }
});

test('401 notifica al manejador de sesión y marca requiresLogin', async () => {
  const { fetcher } = createFetcher(() =>
    jsonResponse({ title: 'Unauthorized' }, 401),
  );
  let notified = 0;
  const client = createHttpClient({
    baseUrl: 'https://api.test',
    fetchImpl: fetcher,
    onUnauthorized: () => {
      notified += 1;
    },
  });

  const error = await client.get('/v1/profile').then(
    () => null,
    (caught: unknown) => caught as ApiError,
  );

  assert.equal(notified, 1);
  assert.ok(error instanceof ApiError);
  assert.equal(error.requiresLogin, true);
  assert.equal(error.toUserMessage().primaryAction, 'login');
});

test('401 con skipAuth no notifica ni adjunta token', async () => {
  const { fetcher, calls } = createFetcher(() => jsonResponse({}, 401));
  let notified = 0;
  const client = createHttpClient({
    baseUrl: 'https://api.test',
    fetchImpl: fetcher,
    getAccessToken: () => 'jwt-token',
    onUnauthorized: () => {
      notified += 1;
    },
  });

  await client.post('/v1/session/refresh', {}, { skipAuth: true }).catch(() => null);

  assert.equal(notified, 0);
  assert.equal(headersOf(calls[0]).Authorization, undefined);
});

test('429 respeta Retry-After y es reintentable', async () => {
  const { fetcher } = createFetcher(() =>
    jsonResponse({ title: 'Too many' }, 429, { 'retry-after': '30' }),
  );
  const client = createHttpClient({ baseUrl: 'https://api.test', fetchImpl: fetcher });

  const error = await client.get('/v1/movements').then(
    () => null,
    (caught: unknown) => caught as ApiError,
  );

  assert.ok(error instanceof ApiError);
  assert.equal(error.kind, 'rate_limited');
  assert.equal(error.retryAfterSeconds, 30);
  assert.equal(error.isRetryable, true);
  assert.match(error.toUserMessage().message, /30 segundos/);
});

test('un 5xx no filtra el detalle interno del servidor al usuario', async () => {
  const { fetcher } = createFetcher(() =>
    jsonResponse(
      { title: 'Internal', detail: 'stack trace at Nequi.Wallet.Service' },
      500,
    ),
  );
  const client = createHttpClient({ baseUrl: 'https://api.test', fetchImpl: fetcher });

  const error = await client.get('/v1/wallet').then(
    () => null,
    (caught: unknown) => caught as ApiError,
  );

  assert.ok(error instanceof ApiError);
  const message = error.toUserMessage();
  assert.equal(message.primaryAction, 'retry');
  assert.equal(message.message.includes('stack trace'), false);
});

test('un 422 expone los errores de validación al formulario', async () => {
  const { fetcher } = createFetcher(() =>
    jsonResponse(
      {
        title: 'Revisa los campos',
        detail: 'El monto debe ser mayor a 0.',
        code: 'VALIDATION_ERROR',
        errors: { amount: ['El monto debe ser mayor a 0.'] },
      },
      422,
    ),
  );
  const client = createHttpClient({ baseUrl: 'https://api.test', fetchImpl: fetcher });

  const error = await client.get('/v1/x').then(
    () => null,
    (caught: unknown) => caught as ApiError,
  );

  assert.ok(error instanceof ApiError);
  assert.equal(error.kind, 'unprocessable');
  assert.equal(error.problem.code, 'VALIDATION_ERROR');
  assert.deepEqual(error.problem.errors, {
    amount: ['El monto debe ser mayor a 0.'],
  });
  assert.equal(error.isRetryable, false);
});

test('un fallo de red se clasifica como network', async () => {
  const { fetcher } = createFetcher(() => {
    throw new TypeError('Network request failed');
  });
  const client = createHttpClient({ baseUrl: 'https://api.test', fetchImpl: fetcher });

  const error = await client.get('/v1/x').then(
    () => null,
    (caught: unknown) => caught as ApiError,
  );

  assert.ok(error instanceof ApiError);
  assert.equal(error.kind, 'network');
  assert.equal(error.isRetryable, true);
});

test('el timeout se clasifica como timeout, no como red', async () => {
  const client = createHttpClient({
    baseUrl: 'https://api.test',
    fetchImpl: pendingUntilAborted(),
    timeoutMs: 5,
  });

  const error = await client.get('/v1/slow').then(
    () => null,
    (caught: unknown) => caught as ApiError,
  );

  assert.ok(error instanceof ApiError);
  assert.equal(error.kind, 'timeout');
  assert.equal(error.isRetryable, true);
});

test('una señal ya abortada no dispara la solicitud', async () => {
  const { fetcher, calls } = createFetcher(() => jsonResponse({}));
  const client = createHttpClient({ baseUrl: 'https://api.test', fetchImpl: fetcher });
  const controller = new AbortController();
  controller.abort();

  const error = await client
    .get('/v1/x', { signal: controller.signal })
    .then(() => null, (caught: unknown) => caught as ApiError);

  assert.ok(error instanceof ApiError);
  assert.equal(error.kind, 'aborted');
  assert.equal(calls.length, 0);
});

test('abortar mientras se resuelve el token no envía la solicitud', async () => {
  const { fetcher, calls } = createFetcher(() => jsonResponse({}));
  const controller = new AbortController();
  let releaseToken: (token: string | null) => void = () => {};
  const tokenReady = new Promise<string | null>((resolve) => {
    releaseToken = resolve;
  });
  const client = createHttpClient({
    baseUrl: 'https://api.test',
    fetchImpl: fetcher,
    getAccessToken: () => tokenReady,
  });

  const pending = client
    .get('/v1/x', { signal: controller.signal })
    .then(() => null, (caught: unknown) => caught as ApiError);

  // La señal se cancela antes de que el proveedor de sesión responda:
  // el listener todavía no existe, así que debe comprobarse al reanudar.
  controller.abort();
  releaseToken('token');

  const error = await pending;
  assert.ok(error instanceof ApiError);
  assert.equal(error.kind, 'aborted');
  assert.equal(calls.length, 0);
});

test('cancelar durante la solicitud se clasifica como aborted', async () => {
  const client = createHttpClient({
    baseUrl: 'https://api.test',
    fetchImpl: pendingUntilAborted(),
    timeoutMs: 1000,
  });
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 5);

  const error = await client
    .get('/v1/x', { signal: controller.signal })
    .then(() => null, (caught: unknown) => caught as ApiError);

  assert.ok(error instanceof ApiError);
  assert.equal(error.kind, 'aborted');
  assert.equal(error.isRetryable, false);
});

test('conserva el X-Request-Id para soporte', async () => {
  const { fetcher } = createFetcher(() =>
    jsonResponse({ title: 'Fallo' }, 500, { 'x-request-id': 'req-42' }),
  );
  const client = createHttpClient({ baseUrl: 'https://api.test', fetchImpl: fetcher });

  const error = await client.get('/v1/x').then(
    () => null,
    (caught: unknown) => caught as ApiError,
  );

  assert.ok(error instanceof ApiError);
  assert.equal(error.requestId, 'req-42');
});
