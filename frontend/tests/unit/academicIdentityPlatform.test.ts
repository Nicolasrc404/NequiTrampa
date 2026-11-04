import test from 'node:test';
import assert from 'node:assert/strict';

import { createAcademicIdentityPlatformClient } from '../../src/services/session/academicIdentityPlatform';
import { buildSession } from '../../src/services/session/session';
import { AuthError } from '../../src/services/session/errors';
import { ACADEMIC_TRANSFER_RECIPIENTS } from '../../src/services/academicCatalog';

const ACTIVE_EMAIL = 'laura@demo.local';
const ACTIVE_PASSWORD = 'DemoLaura123!';

test('el proveedor academico autentica una cuenta activa autorizada', async () => {
  const client = createAcademicIdentityPlatformClient();
  const tokens = await client.signInWithPassword(ACTIVE_EMAIL, ACTIVE_PASSWORD);
  const session = buildSession({ ...tokens, now: Date.now() });

  assert.equal(session.user.uid, 'academic-laura');
  assert.deepEqual(session.user.roles, ['CLIENTE']);
  assert.ok(session.tokens.expiresAt > Date.now());
});

test('el proveedor academico rechaza usuario inexistente y contrasena incorrecta', async () => {
  const client = createAcademicIdentityPlatformClient();

  for (const credentials of [
    ['usuario.inexistente@demo.local', ACTIVE_PASSWORD],
    [ACTIVE_EMAIL, 'incorrecta'],
    ['', ''],
  ]) {
    await assert.rejects(
      () => client.signInWithPassword(credentials[0], credentials[1]),
      (error: unknown) =>
        error instanceof AuthError &&
        error.code === 'invalid_credentials' &&
        error.message === 'Correo o contraseña incorrectos.',
    );
  }
});

test('el proveedor academico rechaza una cuenta inactiva', async () => {
  const client = createAcademicIdentityPlatformClient();

  await assert.rejects(
    () => client.signInWithPassword('ana@demo.local', 'DemoAna123!'),
    (error: unknown) => error instanceof AuthError && error.code === 'user_disabled',
  );
});

test('el refresh academico conserva solo una identidad activa del catalogo', async () => {
  const client = createAcademicIdentityPlatformClient();
  const signedIn = await client.signInWithPassword('carlos@demo.local', 'DemoCarlos123!');
  const refreshed = await client.refresh(signedIn.refreshToken);
  const session = buildSession({ ...refreshed, now: Date.now() });

  assert.equal(session.user.uid, 'academic-carlos');
});

test('el refresh academico rechaza tokens inventados o de cuentas inactivas', async () => {
  const client = createAcademicIdentityPlatformClient();

  await assert.rejects(() => client.refresh('academic-refresh-inventado'), AuthError);
  await assert.rejects(() => client.refresh('academic-refresh:academic-ana'), AuthError);
});

test('el catalogo academico expone nombres verificados por codigo', () => {
  assert.deepEqual(
    ACADEMIC_TRANSFER_RECIPIENTS.find((recipient) => recipient.code === 'CARL-9941'),
    { id: 'academic-carlos', name: 'Carlos Demo', code: 'CARL-9941', initialLetter: 'C', isActive: true },
  );
  assert.equal(
    ACADEMIC_TRANSFER_RECIPIENTS.find((recipient) => recipient.code === 'ANA-3092')?.isActive,
    false,
  );
});
