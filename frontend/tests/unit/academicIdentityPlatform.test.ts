import test from 'node:test';
import assert from 'node:assert/strict';

import { createAcademicIdentityPlatformClient } from '../../src/services/session/academicIdentityPlatform';
import { buildSession } from '../../src/services/session/session';
import { AuthError } from '../../src/services/session/errors';

test('el proveedor academico crea una sesion compatible con SessionManager', async () => {
  const client = createAcademicIdentityPlatformClient();
  const tokens = await client.signInWithPassword('Alumno@Example.test', 'clave-local');
  const session = buildSession({ ...tokens, now: Date.now() });

  assert.equal(session.user.uid, 'academic-alumno-example-test');
  assert.deepEqual(session.user.roles, ['CLIENTE']);
  assert.ok(session.tokens.expiresAt > Date.now());
});

test('el proveedor academico no acepta credenciales vacias', async () => {
  const client = createAcademicIdentityPlatformClient();

  await assert.rejects(
    () => client.signInWithPassword('', ''),
    (error: unknown) => error instanceof AuthError && error.code === 'invalid_credentials',
  );
});

test('el refresh academico conserva la identidad ficticia', async () => {
  const client = createAcademicIdentityPlatformClient();
  const signedIn = await client.signInWithPassword('alumno@example.test', 'clave-local');
  const refreshed = await client.refresh(signedIn.refreshToken);
  const session = buildSession({ ...refreshed, now: Date.now() });

  assert.equal(session.user.uid, 'academic-alumno-example-test');
});
