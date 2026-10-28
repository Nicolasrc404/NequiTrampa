import test from 'node:test';
import assert from 'node:assert/strict';

import { AuthError } from '../../src/services/session/errors';
import { decodeJwtPayload } from '../../src/services/session/jwt';
import {
  buildSession,
  DEFAULT_REFRESH_SKEW_MS,
  hasRole,
  isSessionExpired,
} from '../../src/services/session/session';
import { expSecondsFromNow, makeJwt, NOW_MS } from './support/tokens';

function claims(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    user_id: 'auth-subject-1',
    client_id: 'client-1',
    roles: ['CLIENTE'],
    exp: expSecondsFromNow(),
    ...overrides,
  };
}

test('buildSession extrae uid, client_id, roles y expiración', () => {
  const session = buildSession({
    idToken: makeJwt(claims()),
    refreshToken: 'refresh-1',
    expiresInSeconds: 3600,
    now: NOW_MS,
  });

  assert.equal(session.user.uid, 'auth-subject-1');
  assert.equal(session.user.clientId, 'client-1');
  assert.deepEqual(session.user.roles, ['CLIENTE']);
  assert.equal(session.tokens.expiresAt, NOW_MS + 3_600_000);
  assert.equal(session.tokens.refreshToken, 'refresh-1');
});

test('sin claim client_id el clientId es null y nunca se usa el uid', () => {
  const session = buildSession({
    idToken: makeJwt(claims({ client_id: undefined })),
    refreshToken: 'refresh-1',
    expiresInSeconds: 0,
    now: NOW_MS,
  });

  assert.equal(session.user.uid, 'auth-subject-1');
  assert.equal(session.user.clientId, null);
});

test('roles acepta el claim singular y elimina duplicados', () => {
  const session = buildSession({
    idToken: makeJwt(claims({ roles: ['CLIENTE', 'SOPORTE'], role: 'CLIENTE' })),
    refreshToken: 'refresh-1',
    expiresInSeconds: 0,
    now: NOW_MS,
  });

  assert.deepEqual(session.user.roles, ['CLIENTE', 'SOPORTE']);
  assert.equal(hasRole(session.user, 'SOPORTE'), true);
  assert.equal(hasRole(session.user, 'ADMIN'), false);
  assert.equal(hasRole(null, 'CLIENTE'), false);
});

test('la expiración no se sobreestima si expiresIn supera al claim exp', () => {
  const session = buildSession({
    idToken: makeJwt(claims({ exp: expSecondsFromNow(600) })),
    refreshToken: 'refresh-1',
    expiresInSeconds: 3600,
    now: NOW_MS,
  });

  assert.equal(session.tokens.expiresAt, NOW_MS + 600_000);
});

test('un token sin identidad o sin expiración no crea sesión', () => {
  assert.throws(
    () =>
      buildSession({
        idToken: makeJwt({ client_id: 'client-1', exp: expSecondsFromNow() }),
        refreshToken: 'refresh-1',
        expiresInSeconds: 3600,
        now: NOW_MS,
      }),
    (error: unknown) =>
      error instanceof AuthError && error.code === 'invalid_session',
  );

  assert.throws(
    () =>
      buildSession({
        idToken: makeJwt({ user_id: 'uid-1', client_id: 'client-1' }),
        refreshToken: 'refresh-1',
        expiresInSeconds: 0,
        now: NOW_MS,
      }),
    (error: unknown) =>
      error instanceof AuthError && error.code === 'invalid_session',
  );
});

test('un JWT mal formado se rechaza sin lanzar desde el decodificador', () => {
  assert.equal(decodeJwtPayload('no-es-un-jwt'), null);
  assert.equal(decodeJwtPayload('a.@@@.c'), null);
  assert.equal(decodeJwtPayload('a.' + Buffer.from('{"a":1}').toString('base64url')), null);

  assert.throws(
    () =>
      buildSession({
        idToken: 'no-es-un-jwt',
        refreshToken: 'refresh-1',
        expiresInSeconds: 3600,
        now: NOW_MS,
      }),
    AuthError,
  );
});

test('el decodificador admite UTF-8 y base64url sin padding', () => {
  const token = makeJwt({ user_id: 'usuario-ñandú', exp: expSecondsFromNow() });
  const payload = decodeJwtPayload(token);

  assert.equal(payload?.user_id, 'usuario-ñandú');
});

test('isSessionExpired respeta el margen de renovación', () => {
  const session = buildSession({
    idToken: makeJwt(claims({ exp: expSecondsFromNow(120) })),
    refreshToken: 'refresh-1',
    expiresInSeconds: 0,
    now: NOW_MS,
  });

  assert.equal(isSessionExpired(session, NOW_MS, 0), false);
  assert.equal(
    isSessionExpired(session, NOW_MS + 120_000 - DEFAULT_REFRESH_SKEW_MS + 1, DEFAULT_REFRESH_SKEW_MS),
    true,
  );
  assert.equal(isSessionExpired(session, NOW_MS + 120_000, 0), true);
});
