import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveTransferCompletionTarget } from '../../src/utils/transferCompletionNavigation';

test('el botón Volver al inicio lleva a Wallet y no al flujo de transferencia', () => {
  assert.equal(resolveTransferCompletionTarget('home'), 'Wallet_01');
});

test('movimientos y retroceso físico llevan al historial confirmado', () => {
  assert.equal(resolveTransferCompletionTarget('movements'), 'Movements_01');
  assert.equal(resolveTransferCompletionTarget('back'), 'Movements_01');
});
