import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ServiceContractError,
} from '../../src/services/contract';
import { createWalletService } from '../../src/services/walletService';
import { createFakeHttp } from './support/fakeHttp';

const WALLET_PAYLOAD = {
  walletId: 'wal_01',
  clientId: 'cli_01',
  phoneNumber: '3001234567',
  status: 'ACTIVE',
  currency: 'COP',
  createdAt: '2026-10-01T12:00:00Z',
  updatedAt: null,
};

const BALANCE_PAYLOAD = {
  walletId: 'wal_01',
  clientId: 'cli_01',
  availableBalance: 1234.56,
  availableBalanceCents: 123456,
  currency: 'COP',
  asOfTimestamp: '2026-10-08T14:02:00Z',
  sourceAuthority: 'SPANNER',
};

test('getWallet consulta GET /v1/wallet sin enviar clientId', async () => {
  const fake = createFakeHttp(() => WALLET_PAYLOAD);
  const wallet = await createWalletService(fake.http).getWallet();

  assert.equal(fake.calls.length, 1);
  assert.equal(fake.calls[0].method, 'GET');
  assert.equal(fake.calls[0].path, '/v1/wallet');
  assert.deepEqual(fake.calls[0].options?.query, undefined);
  assert.equal((fake.calls[0].options as { clientId?: string } | undefined)?.clientId, undefined);

  assert.equal(wallet.walletId, 'wal_01');
  assert.equal(wallet.currency, 'COP');
  assert.equal(wallet.phoneNumber, '3001234567');
  assert.equal(wallet.updatedAt, null);
});

test('getWallet rechaza una moneda distinta de COP', async () => {
  const fake = createFakeHttp(() => ({ ...WALLET_PAYLOAD, currency: 'USD' }));
  await assert.rejects(
    createWalletService(fake.http).getWallet(),
    (error: unknown) =>
      error instanceof ServiceContractError && error.field === 'currency',
  );
});

test('getBalance usa centavos enteros y conserva la autoridad del backend', async () => {
  const fake = createFakeHttp(() => BALANCE_PAYLOAD);
  const balance = await createWalletService(fake.http).getBalance();

  assert.equal(fake.calls[0].path, '/v1/wallet/balance');
  assert.equal(balance.availableBalanceCents, 123456);
  assert.equal(balance.availableBalance, 1234.56);
  assert.equal(balance.sourceAuthority, 'SPANNER');
  assert.equal(balance.asOfTimestamp, '2026-10-08T14:02:00Z');
});

test('getBalance no redondea un availableBalanceCents decimal', async () => {
  const fake = createFakeHttp(() => ({
    ...BALANCE_PAYLOAD,
    availableBalanceCents: 1234.56,
  }));
  await assert.rejects(
    createWalletService(fake.http).getBalance(),
    ServiceContractError,
  );
});

test('getBalance rechaza saldos negativos y clientId ausente', async () => {
  const negative = createFakeHttp(() => ({
    ...BALANCE_PAYLOAD,
    availableBalanceCents: -100,
  }));
  await assert.rejects(
    createWalletService(negative.http).getBalance(),
    ServiceContractError,
  );

  const missing = createFakeHttp(() => {
    const { clientId: _ignored, ...rest } = BALANCE_PAYLOAD;
    return rest;
  });
  await assert.rejects(
    createWalletService(missing.http).getBalance(),
    ServiceContractError,
  );
});

test('getBalance indica UNKNOWN cuando el backend no informa la fuente', async () => {
  const fake = createFakeHttp(() => {
    const { sourceAuthority: _ignored, ...rest } = BALANCE_PAYLOAD;
    return rest;
  });
  const balance = await createWalletService(fake.http).getBalance();
  assert.equal(balance.sourceAuthority, 'UNKNOWN');
});

test('createWalletService exige una URL base válida', () => {
  const fake = createFakeHttp();
  assert.throws(() =>
    createWalletService({ ...fake.http, baseUrl: 'no-es-url' }),
  );
});
