import test from 'node:test';
import assert from 'node:assert/strict';

import { loadAcademicMovementDtos } from '../../src/services/academicMovementsService';

test('la carga académica termina sin depender de un clientId previo', async () => {
  const result = await Promise.race([
    loadAcademicMovementDtos(
      {
        wallet: {
          async getBalance() {
            return {
              walletId: 'wal_01',
              clientId: 'cli_01',
              availableBalance: 1250000,
              availableBalanceCents: 125000000,
              currency: 'COP' as const,
              asOfTimestamp: null,
              sourceAuthority: 'ACADEMIC_MEMORY',
            };
          },
        },
        transfers: {
          async list() {
            return [
              {
                transferId: 'trf_01',
                originClientId: 'cli_01',
                destinationClientId: 'cli_02',
                destinationTransferCode: 'DEST-02',
                amount: 1000,
                amountCents: 100000,
                currency: 'COP' as const,
                status: 'COMPLETED',
                ledgerOperationId: 'led_01',
                timestamp: '2026-11-01T12:00:00Z',
                description: 'Pago académico',
              },
            ];
          },
        },
        recharges: {
          async list() {
            return [];
          },
        },
      },
      null,
    ),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('carga académica no terminó')), 250),
    ),
  ]);

  assert.equal(result.length, 1);
  assert.equal(result[0].operationId, 'led_01');
});

test('la carga acadÃ©mica recorre todas las pÃ¡ginas de transferencias', async () => {
  const calls: number[] = [];
  const firstPage = Array.from({ length: 100 }, (_, index) => ({
    transferId: `trf_${index}`,
    originClientId: 'cli_01',
    destinationClientId: 'cli_02',
    destinationTransferCode: 'DEST-02',
    amount: 1000,
    amountCents: 100000,
    currency: 'COP' as const,
    status: 'COMPLETED',
    ledgerOperationId: `led_${index}`,
    timestamp: `2026-11-01T12:${String(index % 60).padStart(2, '0')}:00Z`,
    description: null,
  }));
  const secondPage = [{ ...firstPage[0], transferId: 'trf_100', ledgerOperationId: 'led_100' }];

  const result = await loadAcademicMovementDtos(
    {
      wallet: {
        async getBalance() {
          return {
            walletId: 'wal_01', clientId: 'cli_01', availableBalance: 1250000,
            availableBalanceCents: 125000000, currency: 'COP' as const,
            asOfTimestamp: null, sourceAuthority: 'ACADEMIC_MEMORY',
          };
        },
      },
      transfers: {
        async list(options) {
          calls.push(options?.page ?? 0);
          return options?.page === 1 ? firstPage : secondPage;
        },
      },
      recharges: { async list() { return []; } },
    },
    'cli_01',
  );

  assert.deepEqual(calls, [1, 2]);
  assert.equal(result.length, 101);
});
