import test from 'node:test';
import assert from 'node:assert/strict';

import { ApiError } from '../../src/services/http/ApiError';
import { createProjectionStatusService } from '../../src/services/projectionStatusService';
import { createFakeHttp } from './support/fakeHttp';

const STATUS = {
  operationId: 'op-1',
  status: 'PENDING',
  events: [{
    eventId: 'evt-1', eventType: 'TRANSFER_COMPLETED', published: true,
    attempts: 1, lastError: null, projected: false,
  }],
};

test('consulta estados confirmados y pendientes sin reinterpretarlos', async () => {
  const fake = createFakeHttp(() => STATUS);
  const result = await createProjectionStatusService(fake.http).get('ref/01');

  assert.equal(fake.calls[0].path, '/v1/support/operations/ref%2F01/projection-status');
  assert.equal(result.status, 'PENDING');
  assert.equal(result.events[0].projected, false);
});

test('conserva errores de sesión y conectividad del cliente HTTP', async () => {
  const unavailable = ApiError.fromResponse(503, JSON.stringify({ title: 'Unavailable' }));
  const fake = createFakeHttp(() => { throw unavailable; });

  await assert.rejects(
    createProjectionStatusService(fake.http).get('op-1'),
    (error: unknown) => error === unavailable && (error as ApiError).status === 503,
  );
});

test('una referencia vacía no dispara una consulta', async () => {
  const fake = createFakeHttp(() => STATUS);
  await assert.rejects(createProjectionStatusService(fake.http).get('   '), /obligatoria/);
  assert.equal(fake.calls.length, 0);
});
