import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAcademicMovementDtos } from '../../src/services/mappers/academicMovementMapper';
import type { RechargeDto } from '../../src/services/rechargesService';
import type { TransferDto } from '../../src/services/transfersService';

const transfer = (overrides: Partial<TransferDto> = {}): TransferDto => ({
  transferId: 'trf_01',
  originClientId: 'cli_01',
  destinationClientId: 'cli_02',
  destinationTransferCode: 'DEST-02',
  amount: 1000,
  amountCents: 100000,
  currency: 'COP',
  status: 'COMPLETED',
  ledgerOperationId: 'led_01',
  timestamp: '2026-11-01T12:00:00Z',
  description: 'Pago académico',
  ...overrides,
});

const recharge = (overrides: Partial<RechargeDto> = {}): RechargeDto => ({
  rechargeId: 'rch_01',
  clientId: 'cli_01',
  amount: 2000,
  amountCents: 200000,
  currency: 'COP',
  paymentMethod: 'SIMULATED_PSE',
  status: 'COMPLETED',
  ledgerOperationId: 'led_02',
  timestamp: '2026-11-01T13:00:00Z',
  ...overrides,
});

test('construye movimientos académicos con signo y orden cronológico', () => {
  const items = buildAcademicMovementDtos(
    [transfer()],
    [recharge()],
    'cli_01',
  );

  assert.equal(items.length, 2);
  assert.equal(items[0].type, 'RECHARGE');
  assert.equal(items[0].amountCents, 200000);
  assert.equal(items[1].type, 'TRANSFER_SENT');
  assert.equal(items[1].amountCents, -100000);
});

test('interpreta transferencias recibidas como abonos y filtra otros clientes', () => {
  const items = buildAcademicMovementDtos(
    [
      transfer({
        transferId: 'trf_received',
        originClientId: 'cli_02',
        destinationClientId: 'cli_01',
        timestamp: '2026-11-01T14:00:00Z',
      }),
      transfer({
        transferId: 'trf_other',
        originClientId: 'cli_03',
        destinationClientId: 'cli_04',
      }),
    ],
    [],
    'cli_01',
  );

  assert.equal(items.length, 1);
  assert.equal(items[0].type, 'TRANSFER_RECEIVED');
  assert.equal(items[0].amountCents, 100000);
});
