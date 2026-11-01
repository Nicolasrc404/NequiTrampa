import './support/apiEnv';
import test from 'node:test';
import assert from 'node:assert/strict';

import { ApiError, configureHttp, request } from '../../src/api/http';

interface CapturedCall {
  readonly url: string;
  readonly headers: Record<string, string>;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function problemResponse(status: number, code: string): Response {
  return new Response(
    JSON.stringify({
      type: `https://errors.nequitrampa.internal/${code}`,
      title: 'error',
      status,
      detail: 'detalle',
      code,
    }),
    { status, headers: { 'content-type': 'application/problem+json' } },
  );
}

function stubFetch(makeResponse: () => Response): {
  readonly calls: CapturedCall[];
  restore: () => void;
} {
  const original = globalThis.fetch;
  const calls: CapturedCall[] = [];
  globalThis.fetch = (async (
    input: RequestInfo | URL,
    init: RequestInit = {},
  ) => {
    calls.push({
      url: String(input),
      headers: { ...(init.headers as Record<string, string> | undefined) },
    });
    return makeResponse();
  }) as typeof fetch;
  return {
    calls,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}

test('adjunta el JWT vigente y la Idempotency-Key', async () => {
  configureHttp({ getToken: async () => 'jwt-1', onUnauthorized: () => {} });
  const { calls, restore } = stubFetch(() => jsonResponse({ ok: true }));
  try {
    const data = await request<{ ok: boolean }>('/v1/transfers', {
      method: 'POST',
      body: { amount: 1000 },
      idempotencyKey: 'idem-1',
    });

    assert.deepEqual(data, { ok: true });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://api.test.local/v1/transfers');
    assert.equal(calls[0].headers.Authorization, 'Bearer jwt-1');
    assert.equal(calls[0].headers['Idempotency-Key'], 'idem-1');
    assert.equal(calls[0].headers['Content-Type'], 'application/json');
  } finally {
    restore();
  }
});

test('sin sesión no envía Authorization', async () => {
  configureHttp({ getToken: async () => null, onUnauthorized: () => {} });
  const { calls, restore } = stubFetch(() => jsonResponse({ ok: true }));
  try {
    await request('/v1/admin/users');
    assert.equal(calls[0].headers.Authorization, undefined);
  } finally {
    restore();
  }
});

test('un 401 propaga ApiError y notifica el token usado', async () => {
  const received: Array<string | null> = [];
  configureHttp({
    getToken: async () => 'jwt-old',
    onUnauthorized: (accessToken) => received.push(accessToken),
  });
  const { restore } = stubFetch(() => problemResponse(401, 'unauthenticated'));
  try {
    await assert.rejects(
      request('/v1/admin/users'),
      (error: unknown) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.status, 401);
        return true;
      },
    );
    assert.deepEqual(received, ['jwt-old']);
  } finally {
    restore();
  }
});

test('un 403 no invalida la sesión', async () => {
  let notified = 0;
  configureHttp({
    getToken: async () => 'jwt-1',
    onUnauthorized: () => {
      notified += 1;
    },
  });
  const { restore } = stubFetch(() => problemResponse(403, 'forbidden'));
  try {
    await assert.rejects(
      request('/v1/admin/users'),
      (error: unknown) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.status, 403);
        return true;
      },
    );
    assert.equal(notified, 0);
  } finally {
    restore();
  }
});
