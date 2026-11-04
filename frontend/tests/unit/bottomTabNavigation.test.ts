import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveBottomTab } from '../../src/utils/bottomTabNavigation';
import { RECHARGE_ENTRY_STATE } from '../../src/utils/rechargeNavigation';

test('las pestañas del MVP resuelven rutas navegables', () => {
  assert.equal(resolveBottomTab('inicio'), 'Wallet_01');
  assert.equal(resolveBottomTab('movimientos'), 'Movements_01');
  assert.equal(resolveBottomTab('perfil'), 'Profile_01');
});

test('Asistente no aparenta una ruta implementada fuera de alcance', () => {
  assert.equal(resolveBottomTab('asistente'), null);
});

test('el acceso financiero de recarga desde Inicio apunta al formulario', () => {
  assert.equal(RECHARGE_ENTRY_STATE, 'Recharges_01');
});
