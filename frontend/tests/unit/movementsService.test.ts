import test from 'node:test';
import assert from 'node:assert/strict';

import { ServiceContractError } from '../../src/services/contract';
import {
  createMovementsService,
  MOVEMENTS_DEFAULT_LIMIT,
  MOVEMENTS_MAX_LIMIT,
} from '../../src/services/movementsService';
import { createFakeHttp } from './support/fakeHttp';

const MOVEMENT_ITEM = {
  eventId: 'evt_01',
  operationId: 'op_01',
  type: 'TRANSFER_SENT',
  amountCents: -250000,
  currency: 'COP',
  counterpartyClientId: 'cli_02',
  description: 'Pago a Ana',
  balanceAfterCents: 750000,
  occurredAt: '2026-10-08T14:02:00Z',
  syncStatus: 'SYNCED',
  status: 'COMPLETED',
};

const PAGE = {
  clientId: 'cli_01',
  count: 1,
  limit: MOVEMENTS_DEFAULT_LIMIT,
  items: [MOVEMENT_ITEM],
};

test('list usa el límite por defecto y no envía clientId', async () => {
  const fake = createFakeHttp(() => PAGE);
  const page = await createMovementsService(fake.http).list();

  assert.equal(fake.calls[0].method, 'GET');
  assert.equal(fake.calls[0].path, '/v1/movements');
  assert.deepEqual(fake.calls[0].options?.query, {
    limit: MOVEMENTS_DEFAULT_LIMIT,
  });

  const serialized = JSON.stringify(fake.calls[0]);
  assert.ok(!serialized.includes('clientId'), 'la solicitud no debe incluir clientId');

  assert.equal(page.clientId, 'cli_01');
  assert.equal(page.count, 1);
  assert.equal(page.items[0].amountCents, -250000);
  assert.equal(page.items[0].balanceAfterCents, 750000);
});

test('list acepta un límite explícito dentro del rango', async () => {
  const fake = createFakeHttp(() => ({ ...PAGE, limit: 10 }));
  await createMovementsService(fake.http).list({ limit: 10 });
  assert.deepEqual(fake.calls[0].options?.query, { limit: 10 });
});

test('list rechaza límites fuera de 1..200 antes de llamar a la API', async () => {
  const fake = createFakeHttp(() => PAGE);
  const service = createMovementsService(fake.http);

  for (const limit of [0, -1, 1.5, MOVEMENTS_MAX_LIMIT + 1]) {
    await assert.rejects(service.list({ limit }), RangeError);
  }
  assert.equal(fake.calls.length, 0);
});

test('list acepta el máximo de 200', async () => {
  const fake = createFakeHttp(() => ({ ...PAGE, limit: 200 }));
  await createMovementsService(fake.http).list({ limit: 200 });
  assert.deepEqual(fake.calls[0].options?.query, { limit: 200 });
});

test('list exige amountCents entero en cada movimiento', async () => {
  const fake = createFakeHttp(() => ({
    ...PAGE,
    items: [{ ...MOVEMENT_ITEM, amountCents: 12.5 }],
  }));
  await assert.rejects(
    createMovementsService(fake.http).list(),
    ServiceContractError,
  );
});

test('list rechaza una página sin lista de items', async () => {
  const fake = createFakeHttp(() => ({ ...PAGE, items: null }));
  await assert.rejects(
    createMovementsService(fake.http).list(),
    ServiceContractError,
  );
});

test('list rechaza un límite de respuesta mayor al máximo', async () => {
  const fake = createFakeHttp(() => ({ ...PAGE, limit: 500 }));
  await assert.rejects(
    createMovementsService(fake.http).list(),
    ServiceContractError,
  );
});

test('list tolera campos opcionales ausentes sin inventar valores', async () => {
  const fake = createFakeHttp(() => ({
    clientId: 'cli_01',
    count: 1,
    limit: 50,
    items: [
      {
        amountCents: 100000,
      },
    ],
  }));
  const page = await createMovementsService(fake.http).list();
  const item = page.items[0];

  assert.equal(item.eventId, null);
  assert.equal(item.operationId, null);
  assert.equal(item.type, null);
  assert.equal(item.description, null);
  assert.equal(item.balanceAfterCents, null);
  assert.equal(item.occurredAt, null);
  assert.equal(item.status, null);
});
