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
