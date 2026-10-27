import test from 'node:test';
import assert from 'node:assert/strict';

import type { MovementDto } from '../../src/services/movementsService';
import type { TransferDto } from '../../src/services/transfersService';
import type { RechargeDto } from '../../src/services/rechargesService';
import {
  mapMovement,
  mapMovements,
  movementIdentifier,
} from '../../src/services/mappers/movementMapper';
import {
  mapTransfer,
  mapTransferStatus,
  mapTransfers,
  transferDirection,
} from '../../src/services/mappers/transferMapper';
import {
  mapRecharge,
  mapRechargeResult,
  mapRechargeStatus,
} from '../../src/services/mappers/rechargeMapper';
import {
  categoryInitial,
  mapCategories,
  mapCategory,
} from '../../src/services/mappers/categoryMapper';
import type { CategoryDto } from '../../src/services/categoriesService';

const MOVEMENT: MovementDto = {
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

const TRANSFER: TransferDto = {
  transferId: 'TRF-0001',
  originClientId: 'cli_01',
  destinationClientId: 'cli_02',
  destinationTransferCode: '3001234567',
  amount: 1000,
  amountCents: 100000,
  currency: 'COP',
  status: 'COMPLETED',
  ledgerOperationId: 'op_01',
  timestamp: '2026-10-08T14:02:00Z',
  description: 'Cena',
};

const RECHARGE: RechargeDto = {
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

test('mapMovement conserva centavos, saldo y estado sin inventar contraparte', () => {
  const item = mapMovement(MOVEMENT);
  assert.ok(item);
  assert.equal(item.id, 'op_01');
  assert.equal(item.reference, 'op_01');
  assert.equal(item.title, 'Pago a Ana');
  assert.equal(item.type, 'TRANSFER_SENT');
  assert.equal(item.amountCents, -250000);
  assert.equal(item.amount, -2500);
  assert.equal(item.balanceAfterCents, 750000);
  assert.equal(item.balanceAfter, 7500);
  assert.equal(item.status, 'Completada');
  assert.equal(item.formattedDate, '8 oct 2026 · 9:02 a. m.');
  assert.equal(item.timestamp, '9:02 a. m.');
  assert.ok(!JSON.stringify(item).includes('Ana María'));
});

test('movementIdentifier prefiere operationId y cae a eventId', () => {
  assert.equal(movementIdentifier(MOVEMENT), 'op_01');
  assert.equal(
    movementIdentifier({ ...MOVEMENT, operationId: null }),
    'evt_01',
  );
  assert.equal(
    movementIdentifier({ ...MOVEMENT, operationId: null, eventId: null }),
    null,
  );
});

test('mapMovements descarta movimientos sin identificador estable', () => {
  const items = mapMovements([
    MOVEMENT,
    { ...MOVEMENT, operationId: null, eventId: null },
    { ...MOVEMENT, operationId: 'op_03', type: 'RECHARGE' },
  ]);
  assert.deepEqual(items.map((item) => item.id), ['op_01', 'op_03']);
});

test('mapMovement usa la etiqueta de tipo cuando no hay descripción', () => {
  const item = mapMovement({ ...MOVEMENT, description: '   ' });
  assert.equal(item?.title, 'Transferencia enviada');
  assert.equal(item?.categoryLabel, 'Transferencia enviada');

  const unknown = mapMovement({ ...MOVEMENT, description: null, type: 'CASH_IN' });
  assert.equal(unknown?.title, 'CASH_IN');
  assert.equal(unknown?.type, 'OTHER');

  const noType = mapMovement({ ...MOVEMENT, description: null, type: null });
  assert.equal(noType?.title, 'Movimiento');
  assert.equal(noType?.categoryLabel, 'Movimiento');
});

test('mapMovement traduce los tipos de evento reales del backend', () => {
  const sent = mapMovement({
    ...MOVEMENT,
    type: 'TRANSFER_COMPLETED',
    amountCents: -250000,
    description: null,
  });
  assert.equal(sent?.type, 'TRANSFER_SENT');
  assert.equal(sent?.title, 'Transferencia enviada');
  assert.equal(sent?.categoryLabel, 'Transferencia enviada');

  const received = mapMovement({
    ...MOVEMENT,
    type: 'TRANSFER_COMPLETED',
    amountCents: 250000,
    description: null,
  });
  assert.equal(received?.type, 'TRANSFER_RECEIVED');
  assert.equal(received?.title, 'Transferencia recibida');

  const recharge = mapMovement({
    ...MOVEMENT,
    type: 'RECHARGE_COMPLETED',
    amountCents: 150000,
    description: null,
  });
  assert.equal(recharge?.type, 'RECHARGE');
  assert.equal(recharge?.title, 'Recarga');
});

test('mapMovement distingue estados pendientes, fallidos y desconocidos', () => {  assert.equal(mapMovement({ ...MOVEMENT, status: 'PENDING' })?.status, 'Pendiente');
  assert.equal(mapMovement({ ...MOVEMENT, status: 'FAILED' })?.status, 'Fallida');
  assert.equal(mapMovement({ ...MOVEMENT, status: 'ALIEN' })?.status, 'Desconocido');
  assert.equal(mapMovement({ ...MOVEMENT, status: null })?.status, 'Desconocido');
});

test('mapMovement no inventa saldo posterior si el backend no lo envía', () => {
  const item = mapMovement({ ...MOVEMENT, balanceAfterCents: null });
  assert.equal(item?.balanceAfterCents, null);
  assert.equal(item?.balanceAfter, null);
});

test('mapTransfer enviada usa el código destino como contraparte visible', () => {
  const item = mapTransfer(TRANSFER, { ownClientId: 'cli_01' });
  assert.equal(item.id, 'TRF-0001');
  assert.equal(item.direction, 'sent');
  assert.equal(item.counterpartyName, '3001234567');
  assert.equal(item.counterpartyCode, '3001234567');
  assert.equal(item.amountCents, 100000);
  assert.equal(item.message, 'Cena');
  assert.equal(item.statusLabel, 'Completada');
  assert.equal(item.balanceAfterCents, null);
  assert.equal(item.occurredAtLabel, '8 oct 2026 · 9:02 a. m.');
});

test('mapTransfer recibida no fabrica el origen que el contrato no expone', () => {
  const item = mapTransfer(TRANSFER, { ownClientId: 'cli_02' });
  assert.equal(item.direction, 'received');
  assert.equal(item.counterpartyName, 'Origen no disponible');
  assert.equal(item.counterpartyCode, '');
  assert.equal(item.balanceAfterCents, null);
});

test('mapTransfer rechaza transferencias ajenas y contextos sin clientId', () => {
  assert.throws(() => mapTransfer(TRANSFER, { ownClientId: 'cli_99' }), Error);
  assert.throws(() => mapTransfer(TRANSFER, { ownClientId: '   ' }), Error);
  assert.throws(() => transferDirection(TRANSFER, 'cli_99'), Error);
});

test('mapTransferStatus traduce solo los estados conocidos', () => {
  assert.equal(mapTransferStatus('COMPLETED'), 'Completada');
  assert.equal(mapTransferStatus('completed'), 'Completada');
  assert.equal(mapTransferStatus('REVERSED'), 'Reversada');
  assert.equal(mapTransferStatus('PENDING'), 'PENDING');
});

test('mapTransfers mapea la lista completa', () => {
  const items = mapTransfers([TRANSFER, { ...TRANSFER, transferId: 'TRF-0002' }], {
    ownClientId: 'cli_01',
  });
  assert.deepEqual(items.map((item) => item.id), ['TRF-0001', 'TRF-0002']);
});

test('mapRecharge conserva monto y no inventa saldo posterior', () => {
  const item = mapRecharge(RECHARGE);
  assert.equal(item.id, 'RCH-0001');
  assert.equal(item.reference, 'RCH-0001');
  assert.equal(item.amountCents, 150000);
  assert.equal(item.statusLabel, 'Recarga completada');
  assert.equal(item.balanceAfterCents, null);
  assert.equal(item.occurredAtLabel, '8 oct 2026 · 9:02 a. m.');
});

test('mapRechargeStatus traduce estados y respeta los desconocidos', () => {
  assert.equal(mapRechargeStatus('COMPLETED'), 'Recarga completada');
  assert.equal(mapRechargeStatus('PENDING'), 'Recarga pendiente');
  assert.equal(mapRechargeStatus('FAILED'), 'Recarga fallida');
  assert.equal(mapRechargeStatus('HOLD'), 'HOLD');
});

test('mapRechargeResult usa el saldo confirmado o null si la consulta falló', () => {
  const withBalance = mapRechargeResult(RECHARGE, 1234567);
  assert.equal(withBalance.reference, 'RCH-0001');
  assert.equal(withBalance.balanceAfterCents, 1234567);

  const withoutBalance = mapRechargeResult(RECHARGE, null);
  assert.equal(withoutBalance.balanceAfterCents, null);
});

const CATEGORY: CategoryDto = {
  id: 'cat_01',
  name: 'Mercado',
  type: 'gasto',
  isSystem: false,
  active: true,
  movementsCount: 3,
  totalAmountCents: 125000,
  currency: 'COP',
  createdAt: '2026-10-01T10:00:00Z',
  updatedAt: '2026-10-08T10:00:00Z',
};

test('mapCategory conserva el monto autoritativo y la letra inicial', () => {
  const item = mapCategory(CATEGORY);
  assert.equal(item.id, 'cat_01');
  assert.equal(item.type, 'gasto');
  assert.equal(item.movementsCount, 3);
  assert.equal(item.initialLetter, 'M');
  assert.equal(item.isSystem, false);
});

test('mapCategory distingue las categorías del sistema', () => {
  const system = mapCategory({ ...CATEGORY, id: 'cat_sys', isSystem: true });
  assert.equal(system.isSystem, true);
  assert.equal(mapCategory({ ...CATEGORY, isSystem: false }).isSystem, false);
});

test('mapCategory no inventa monto cuando la suma es cero', () => {
  const empty = mapCategory({ ...CATEGORY, movementsCount: 0, totalAmountCents: 0 });
  assert.equal(empty.movementsCount, 0);
  assert.match(empty.formattedAmount, /\$\s?0/);
});

test('categoryInitial tolera nombres vacíos sin lanzar', () => {
  assert.equal(categoryInitial('  mercado'), 'M');
  assert.equal(categoryInitial(''), '?');
  assert.equal(categoryInitial('   '), '?');
});

test('mapCategories respeta el orden entregado por el backend', () => {
  const items = mapCategories([
    CATEGORY,
    { ...CATEGORY, id: 'cat_02', name: 'Transporte' },
  ]);
  assert.deepEqual(items.map((item) => item.id), ['cat_01', 'cat_02']);
});
