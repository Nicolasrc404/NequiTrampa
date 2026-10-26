import test from 'node:test';
import assert from 'node:assert/strict';

import { ServiceContractError } from '../../src/services/contract';
import { createCashService } from '../../src/services/cashService';
import { createFakeHttp } from './support/fakeHttp';

const KEY = '33333333-3333-4333-8333-333333333333';

const BALANCE = {
  availableCents: 500000,
  incomeCents: 1000000,
  expenseCents: 500000,
  movementCount: 2,
  currency: 'COP',
  updatedAt: '2026-10-08T14:02:00Z',
};

const MOVEMENT = {
  id: 'cash_01',
  direction: 'expense',
  amountCents: 25000,
  categoryId: 'cat_01',
  categoryName: 'Mercado',
  note: 'Compra',
  occurredOn: '2026-10-08',
  balanceAfterCents: 475000,
  createdAt: '2026-10-08T14:02:00Z',
};

test('getBalance obtiene saldo de efectivo', async () => {
  const fake = createFakeHttp(() => BALANCE);
  const balance = await createCashService(fake.http).getBalance();

  assert.equal(fake.calls[0].path, '/v1/cash/balance');
  assert.equal(balance.availableCents, 500000);
  assert.equal(balance.currency, 'COP');
});

test('listMovements pasa limit y valida lista', async () => {
  const fake = createFakeHttp(() => [MOVEMENT]);
  const movements = await createCashService(fake.http).listMovements({ limit: 50 });

  assert.equal(fake.calls[0].path, '/v1/cash/movements');
  assert.deepEqual(fake.calls[0].options?.query, { limit: 50 });
  assert.equal(movements.length, 1);
  assert.equal(movements[0].direction, 'expense');

  const notAList = createFakeHttp(() => ({ items: [] }));
  await assert.rejects(
    createCashService(notAList.http).listMovements(),
    ServiceContractError,
  );
});

test('createMovement requiere Idempotency-Key y envía cuerpo correcto', async () => {
  const fake = createFakeHttp(() => ({ movement: MOVEMENT, balance: BALANCE }));
  const result = await createCashService(fake.http).createMovement(
    { direction: 'expense', amountCents: 25000, categoryId: 'cat_01', note: 'Compra', occurredOn: '2026-10-08' },
    { idempotencyKey: KEY },
  );

  assert.equal(fake.calls[0].method, 'POST');
  assert.equal(fake.calls[0].path, '/v1/cash/movements');
  assert.equal(fake.calls[0].options?.idempotencyKey, KEY);
  assert.deepEqual(fake.calls[0].body, {
    direction: 'expense',
    amountCents: 25000,
    categoryId: 'cat_01',
    note: 'Compra',
    occurredOn: '2026-10-08',
  });
  assert.equal(result.movement.id, 'cash_01');
  assert.equal(result.balance.availableCents, 500000);
});

test('createMovement normaliza note/categoryId y valida entradas', async () => {
  const fake = createFakeHttp(() => ({ movement: { ...MOVEMENT, categoryId: null, note: null }, balance: BALANCE }));
  await createCashService(fake.http).createMovement(
    { direction: 'income', amountCents: 100000, categoryId: '   ', note: '   ' },
    { idempotencyKey: KEY },
  );

  assert.deepEqual(fake.calls[0].body, {
    direction: 'income',
    amountCents: 100000,
    categoryId: null,
    note: null,
    occurredOn: null,
  });

  const fake2 = createFakeHttp(() => ({ movement: MOVEMENT, balance: BALANCE }));
  const service = createCashService(fake2.http);
  await assert.rejects(service.createMovement({ direction: 'expense', amountCents: 0 }, { idempotencyKey: KEY }), Error);
  await assert.rejects(service.createMovement({ direction: 'expense', amountCents: 1000 }, { idempotencyKey: '' }), Error);
  await assert.rejects(service.createMovement({ direction: 'both' as never, amountCents: 1000 }, { idempotencyKey: KEY }), Error);
  await assert.rejects(service.createMovement({ direction: 'expense', amountCents: 1000, occurredOn: '10-08-2026' }, { idempotencyKey: KEY }), Error);
});
