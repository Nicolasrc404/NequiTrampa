import test from 'node:test';
import assert from 'node:assert/strict';

import { ServiceContractError } from '../../src/services/contract';
import {
  createRechargesService,
  DEFAULT_RECHARGE_PAYMENT_METHOD,
  MAX_RECHARGE_CENTS,
  MIN_RECHARGE_CENTS,
} from '../../src/services/rechargesService';
import { createFakeHttp } from './support/fakeHttp';

const KEY = '22222222-2222-4222-8222-222222222222';

const RECHARGE = {
  rechargeId: 'RCH-0001',
  clientId: 'cli_01',
  amount: 1500,
  amountCents: 150000,
  currency: 'COP',
  paymentMethod: 'SIMULATED_PSE',
  status: 'COMPLETED',
  ledgerOperationId: 'op_02',
  timestamp: '2026-10-08T14:02:00Z',
};

test('create usa SIMULATED_PSE, decimal COP e Idempotency-Key', async () => {
  const fake = createFakeHttp(() => RECHARGE);
  const recharge = await createRechargesService(fake.http).create(
    { amountCents: 150000 },
    { idempotencyKey: KEY },
  );

  const call = fake.calls[0];
  assert.equal(call.method, 'POST');
  assert.equal(call.path, '/v1/recharges');
  assert.deepEqual(call.body, {
    amount: 1500,
    paymentMethod: DEFAULT_RECHARGE_PAYMENT_METHOD,
    currency: 'COP',
  });
  assert.equal(call.options?.idempotencyKey, KEY);
  assert.ok(!JSON.stringify(call.body).includes('clientId'));

  assert.equal(recharge.rechargeId, 'RCH-0001');
  assert.equal(recharge.status, 'COMPLETED');
  assert.equal(recharge.amountCents, 150000);
});

test('create acepta un método simulado explícito', async () => {
  const fake = createFakeHttp(() => ({ ...RECHARGE, paymentMethod: 'SIMULATED_CARD' }));
  await createRechargesService(fake.http).create(
    { amountCents: 150000, paymentMethod: 'SIMULATED_CARD' },
    { idempotencyKey: KEY },
  );
  assert.equal(
    (fake.calls[0].body as { paymentMethod: string }).paymentMethod,
    'SIMULATED_CARD',
  );
});

test('create valida monto, método y clave antes de llamar a la API', async () => {
  const fake = createFakeHttp(() => RECHARGE);
  const service = createRechargesService(fake.http);
  const options = { idempotencyKey: KEY };

  for (const amountCents of [
    MIN_RECHARGE_CENTS - 1,
    MAX_RECHARGE_CENTS + 1,
    100.5,
    -1,
  ]) {
    await assert.rejects(service.create({ amountCents }, options), Error);
  }

  await assert.rejects(
    service.create(
      { amountCents: 150000, paymentMethod: 'CASH' as never },
      options,
    ),
    Error,
  );
  await assert.rejects(
    service.create({ amountCents: 150000 }, { idempotencyKey: '' }),
    Error,
  );

  assert.equal(fake.calls.length, 0);
});

test('create acepta los límites de monto', async () => {
  const fake = createFakeHttp(() => RECHARGE);
  const service = createRechargesService(fake.http);
  const options = { idempotencyKey: KEY };

  await service.create({ amountCents: MIN_RECHARGE_CENTS }, options);
  await service.create({ amountCents: MAX_RECHARGE_CENTS }, options);
  assert.equal(fake.calls.length, 2);
});

test('create rechaza moneda distinta de COP y campos obligatorios ausentes', async () => {
  const wrongCurrency = createFakeHttp(() => ({ ...RECHARGE, currency: 'USD' }));
  await assert.rejects(
    createRechargesService(wrongCurrency.http).create(
      { amountCents: 150000 },
      { idempotencyKey: KEY },
    ),
    ServiceContractError,
  );

  const missingStatus = createFakeHttp(() => {
    const { status: _ignored, ...rest } = RECHARGE;
    return rest;
  });
  await assert.rejects(
    createRechargesService(missingStatus.http).create(
      { amountCents: 150000 },
      { idempotencyKey: KEY },
    ),
    ServiceContractError,
  );
});

test('list devuelve las recargas validadas y exige una lista', async () => {
  const fake = createFakeHttp(() => [RECHARGE]);
  const recharges = await createRechargesService(fake.http).list();

  assert.equal(fake.calls[0].path, '/v1/recharges');
  assert.equal(recharges.length, 1);
  assert.equal(recharges[0].rechargeId, 'RCH-0001');

  const notAList = createFakeHttp(() => ({ items: [RECHARGE] }));
  await assert.rejects(
    createRechargesService(notAList.http).list(),
    ServiceContractError,
  );
});
