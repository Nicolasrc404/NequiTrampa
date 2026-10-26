import test from 'node:test';
import assert from 'node:assert/strict';

import { AuthError } from '../../src/services/session/errors';
import {
  createIdentityPlatformClient,
  IDENTITY_REFRESH_URL,
  IDENTITY_SIGN_IN_URL,
} from '../../src/services/session/identityPlatform';

interface FakeCall {
  readonly url: string;
  readonly init: RequestInit;
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
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

async function expectAuthError(
  action: () => Promise<unknown>,
  code: AuthError['code'],
): Promise<AuthError> {
  try {
    await action();
  } catch (error) {
    assert.ok(error instanceof AuthError);
    assert.equal(error.code, code);
    return error;
  }
  assert.fail(`Se esperaba AuthError(${code})`);
}

test('signInWithPassword usa la API key y devuelve los tokens normalizados', async () => {
  const { fetcher, calls } = createFetcher(() =>
    jsonResponse({
      idToken: 'id-token-1',
      refreshToken: 'refresh-token-1',
      expiresIn: '3600',
    }),
  );
  const client = createIdentityPlatformClient({ apiKey: 'public-key', fetchImpl: fetcher });

  const tokens = await client.signInWithPassword('persona@example.com', 'secreto');

  assert.deepEqual(tokens, {
    idToken: 'id-token-1',
    refreshToken: 'refresh-token-1',
    expiresInSeconds: 3600,
  });
  assert.equal(calls.length, 1);
  assert.ok(calls[0].url.startsWith(`${IDENTITY_SIGN_IN_URL}?key=public-key`));
  const body = JSON.parse(String(calls[0].init.body));
  assert.deepEqual(body, {
    email: 'persona@example.com',
    password: 'secreto',
    returnSecureToken: true,
  });
  assert.equal((calls[0].init.headers as Record<string, string>)['Content-Type'], 'application/json');
});

test('credenciales inválidas se traducen sin filtrar correo ni contraseña', async () => {
  const { fetcher } = createFetcher(() =>
    jsonResponse({ error: { code: 400, message: 'INVALID_LOGIN_CREDENTIALS' } }, 400),
  );
  const client = createIdentityPlatformClient({ apiKey: 'public-key', fetchImpl: fetcher });

  const error = await expectAuthError(
    () => client.signInWithPassword('persona@example.com', 'secreto-super-secreto'),
    'invalid_credentials',
  );

  assert.doesNotMatch(error.message, /persona@example\.com|secreto/);
  assert.equal(error.status, 400);
});

test('una cuenta deshabilitada se distingue de credenciales inválidas', async () => {
  const { fetcher } = createFetcher(() =>
    jsonResponse({ error: { code: 400, message: 'USER_DISABLED' } }, 400),
  );
  const client = createIdentityPlatformClient({ apiKey: 'public-key', fetchImpl: fetcher });

  await expectAuthError(
    () => client.signInWithPassword('persona@example.com', 'secreto'),
    'user_disabled',
  );
});

test('demasiados intentos es reintentable y respeta el estado 429', async () => {
  const { fetcher } = createFetcher(() =>
    jsonResponse({ error: { code: 429, message: 'TOO_MANY_ATTEMPTS_TRY_LATER' } }, 429),
  );
  const client = createIdentityPlatformClient({ apiKey: 'public-key', fetchImpl: fetcher });

  const error = await expectAuthError(
    () => client.signInWithPassword('persona@example.com', 'secreto'),
    'too_many_attempts',
  );

  assert.equal(error.isRetryable, true);
  assert.equal(error.status, 429);
  assert.ok((error.retryAfterMs ?? 0) > 0);
});

test('refresh envía el formulario esperado y conserva el refresh token si no rota', async () => {
  const { fetcher, calls } = createFetcher(() =>
    jsonResponse({ id_token: 'id-token-2', refresh_token: '', expires_in: '1800' }),
  );
  const client = createIdentityPlatformClient({ apiKey: 'public-key', fetchImpl: fetcher });

  const tokens = await client.refresh('refresh-token-1');

  assert.equal(tokens.idToken, 'id-token-2');
  assert.equal(tokens.refreshToken, 'refresh-token-1');
  assert.equal(tokens.expiresInSeconds, 1800);
  assert.ok(calls[0].url.startsWith(`${IDENTITY_REFRESH_URL}?key=public-key`));
  const form = new URLSearchParams(String(calls[0].init.body));
  assert.equal(form.get('grant_type'), 'refresh_token');
  assert.equal(form.get('refresh_token'), 'refresh-token-1');
});

test('un refresh rechazado es invalid_session (no credenciales)', async () => {
  const { fetcher } = createFetcher(() =>
    jsonResponse({ error: { code: 400, message: 'INVALID_REFRESH_TOKEN' } }, 400),
  );
  const client = createIdentityPlatformClient({ apiKey: 'public-key', fetchImpl: fetcher });

  await expectAuthError(() => client.refresh('refresh-token-1'), 'invalid_session');
});

test('un fallo de red es AuthError(network) sin cuerpo del proveedor', async () => {
  const { fetcher } = createFetcher(() => {
    throw new TypeError('fetch failed');
  });
  const client = createIdentityPlatformClient({ apiKey: 'public-key', fetchImpl: fetcher });

  await expectAuthError(
    () => client.signInWithPassword('persona@example.com', 'secreto'),
    'network',
  );
});

test('un timeout se clasifica como network y aborta la petición', async () => {
  let aborted = false;
  const fetcher = (async (_input: RequestInfo | URL, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        aborted = true;
        const error = new Error('Aborted');
        error.name = 'AbortError';
        reject(error);
      });
    })) as unknown as typeof fetch;

  const client = createIdentityPlatformClient({
    apiKey: 'public-key',
    fetchImpl: fetcher,
    timeoutMs: 5,
  });

  await expectAuthError(() => client.refresh('refresh-token-1'), 'network');
  assert.equal(aborted, true);
});

test('sin API key el cliente falla por configuración, no por red', async () => {
  const client = createIdentityPlatformClient({ apiKey: '   ' });

  await expectAuthError(
    () => client.signInWithPassword('persona@example.com', 'secreto'),
    'configuration',
  );
  await expectAuthError(() => client.refresh('refresh-token-1'), 'configuration');
});
