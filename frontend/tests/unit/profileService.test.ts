import test from 'node:test';
import assert from 'node:assert/strict';

import { ServiceContractError } from '../../src/services/contract';
import {
  createProfileService,
  MAX_ALIAS_LENGTH,
  MIN_ALIAS_LENGTH,
} from '../../src/services/profileService';
import { createFakeHttp } from './support/fakeHttp';

const PROFILE = {
  clientId: 'cli_01',
  authSubject: 'auth_01',
  email: 'ana@example.test',
  username: 'ana',
  firstName: 'Ana',
  lastName: 'Pérez',
  alias: 'anita',
  transferCode: '3001234567',
  status: 'ACTIVE',
  timezone: 'America/Bogota',
  walletId: 'wal_01',
  walletStatus: 'ACTIVE',
  currency: 'COP',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: null,
};

test('get consulta GET /v1/profile y conserva los campos opcionales nulos', async () => {
  const fake = createFakeHttp(() => ({ ...PROFILE, alias: null, walletId: null }));
  const profile = await createProfileService(fake.http).get();

  assert.equal(fake.calls[0].method, 'GET');
  assert.equal(fake.calls[0].path, '/v1/profile');
  assert.equal(profile.alias, null);
  assert.equal(profile.walletId, null);
  assert.equal(profile.transferCode, '3001234567');
});

test('update hace PATCH solo con los campos enviados y recortados', async () => {
  const fake = createFakeHttp(() => PROFILE);
  const service = createProfileService(fake.http);

  await service.update({ alias: '  anita  ' });
  assert.equal(fake.calls[0].method, 'PATCH');
  assert.equal(fake.calls[0].path, '/v1/profile');
  assert.deepEqual(fake.calls[0].body, { alias: 'anita' });
  assert.equal(fake.calls[0].options?.signal, undefined);

  await service.update({ timezone: ' America/Bogota ' });
  assert.deepEqual(fake.calls[1].body, { timezone: 'America/Bogota' });

  await service.update({ alias: 'anita', timezone: 'America/Bogota' });
  assert.deepEqual(fake.calls[2].body, {
    timezone: 'America/Bogota',
    alias: 'anita',
  });
});

test('update exige al menos un campo y valida la longitud del alias', async () => {
  const fake = createFakeHttp(() => PROFILE);
  const service = createProfileService(fake.http);

  await assert.rejects(service.update({}), Error);
  await assert.rejects(service.update({ alias: '   ' }), Error);
  await assert.rejects(
    service.update({ alias: 'x'.repeat(MIN_ALIAS_LENGTH - 1) }),
    Error,
  );
  await assert.rejects(
    service.update({ alias: 'x'.repeat(MAX_ALIAS_LENGTH + 1) }),
    Error,
  );
  assert.equal(fake.calls.length, 0);
});

test('update acepta los límites de longitud del alias', async () => {
  const fake = createFakeHttp(() => PROFILE);
  const service = createProfileService(fake.http);

  await service.update({ alias: 'x'.repeat(MIN_ALIAS_LENGTH) });
  await service.update({ alias: 'x'.repeat(MAX_ALIAS_LENGTH) });
  assert.equal(fake.calls.length, 2);
});

test('un perfil incompleto no se acepta como válido', async () => {
  const fake = createFakeHttp(() => {
    const { transferCode: _ignored, ...rest } = PROFILE;
    return rest;
  });
  await assert.rejects(
    createProfileService(fake.http).get(),
    ServiceContractError,
  );
});
