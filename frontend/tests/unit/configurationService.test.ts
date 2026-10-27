import test from 'node:test';
import assert from 'node:assert/strict';

import { ApiError } from '../../src/services/http/ApiError';
import { createConfigurationService } from '../../src/services/configurationService';
import { createFakeHttp } from './support/fakeHttp';

const CONFIGURATION = {
  maintenanceMode: false,
  notificationsEnabled: true,
  supportEmail: 'soporte@example.test',
  supportHours: 'L-V 08:00-18:00 America/Bogota',
  updatedAt: '2026-10-26T12:00:00Z',
  updatedBy: 'admin-1',
};

test('consulta y actualización de configuración usan el contrato administrativo', async () => {
  const fake = createFakeHttp(() => ({ configuration: CONFIGURATION }));
  const service = createConfigurationService(fake.http);

  const current = await service.get();
  assert.equal(current.notificationsEnabled, true);
  assert.equal(fake.calls[0].path, '/v1/admin/configuration');

  await service.update({ notificationsEnabled: false });
  assert.equal(fake.calls[1].method, 'PATCH');
  assert.deepEqual(fake.calls[1].body, { notificationsEnabled: false });
});

test('no convierte un 403 del backend en éxito local', async () => {
  const forbidden = ApiError.fromResponse(403, JSON.stringify({ title: 'Forbidden' }));
  const fake = createFakeHttp(() => { throw forbidden; });

  await assert.rejects(
    createConfigurationService(fake.http).get(),
    (error: unknown) => error === forbidden && (error as ApiError).status === 403,
  );
});

test('rechaza actualizaciones vacías antes de llamar al Gateway', async () => {
  const fake = createFakeHttp(() => ({ configuration: CONFIGURATION }));
  await assert.rejects(createConfigurationService(fake.http).update({}), /al menos una/);
  assert.equal(fake.calls.length, 0);
});
