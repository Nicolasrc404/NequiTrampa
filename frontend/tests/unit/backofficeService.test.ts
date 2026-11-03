import test from 'node:test';
import assert from 'node:assert/strict';

import { ApiError } from '../../src/services/http';
import { ServiceContractError } from '../../src/services/contract';
import { createApiServices } from '../../src/services/factories';
import { createBackofficeService } from '../../src/services/backofficeService';
import { createFakeHttp, type FakeResponder } from './support/fakeHttp';

const KEY = '55555555-5555-4555-8555-555555555555';
const CLIENT_ID = '11111111-1111-4111-8111-111111111111';

const CLIENT = {
  clientId: CLIENT_ID,
  authSubject: 'idp-sub-alejandro',
  transferCode: 'TRF-ALE-0001',
  status: 'ACTIVE',
  timezone: 'America/Bogota',
  accountId: 'aaaaaaaa-0000-4000-8000-000000000001',
  walletStatus: 'ACTIVE',
  balanceCents: 76500000,
  createdAt: '2026-09-01T01:21:05.4203306+00:00',
};

const OPERATION = {
  operationId: '04cc33f8-209e-4187-bf73-a2bc67cd2676',
  publicReference: 'TRF-20261008-4DFA0B5D796',
  type: 'INTERNAL_TRANSFER',
  status: 'COMPLETED',
  actorId: CLIENT_ID,
  actorType: 'CLIENT',
  amountCents: 2500000,
  currency: 'COP',
  originalOperationId: null,
  reason: 'Pago almuerzo',
  createdAt: '2026-10-08T18:22:38.8968823Z',
  confirmedAt: '2026-10-08T18:22:38.9Z',
};

const CASE = {
  id: 'CASE-0F8E40BF4550',
  clientId: CLIENT_ID,
  subject: 'Transferencia no recibida',
  description: 'Caso de prueba',
  priority: 'HIGH',
  status: 'OPEN',
  assignedTo: null,
  escalationLevel: 0,
  createdBy: 'idp-sub-support',
  createdAt: '2026-10-26T22:11:17.63Z',
  updatedAt: '2026-10-26T22:11:17.63Z',
};

const MESSAGE = {
  id: 'msg1',
  caseId: CASE.id,
  authorId: 'idp-sub-support',
  body: 'Estamos revisando tu operación.',
  createdAt: '2026-10-26T22:12:00Z',
};

function service(responder?: FakeResponder) {
  const fake = createFakeHttp(responder);
  return { fake, svc: createBackofficeService(fake.http) };
}

// ───────── construcción ─────────

test('createBackofficeService exige un cliente HTTP con URL base válida', () => {
  const fake = createFakeHttp();
  assert.throws(() => createBackofficeService({ ...fake.http, baseUrl: '' }), /URL base/);
});

test('createApiServices expone el servicio de backoffice sobre el mismo cliente', async () => {
  const fake = createFakeHttp(() => ({ roles: ['ADMIN'] }));
  const services = createApiServices(fake.http);
  assert.deepEqual(await services.backoffice.admin.listRoles(), ['ADMIN']);
  assert.equal(fake.calls[0].path, '/v1/admin/roles');
});

// ───────── admin ─────────

test('listUsers usa paginación por defecto, valida y mapea la lista', async () => {
  const { fake, svc } = service(() => ({ users: [CLIENT], page: 1, pageSize: 20, total: 1 }));
  const page = await svc.admin.listUsers();

  assert.equal(fake.calls[0].method, 'GET');
  assert.equal(fake.calls[0].path, '/v1/admin/users');
  assert.deepEqual(fake.calls[0].options?.query, { page: 1, pageSize: 20, status: undefined });
  assert.equal(page.total, 1);
  assert.equal(page.users[0].transferCode, 'TRF-ALE-0001');
  assert.equal(page.users[0].balanceCents, 76500000);
});

test('listUsers normaliza el filtro de estado y rechaza valores inválidos sin llamar a la red', async () => {
  const { fake, svc } = service(() => ({ users: [], page: 1, pageSize: 50, total: 0 }));
  await svc.admin.listUsers({ pageSize: 50, status: 'suspended' });
  assert.deepEqual(fake.calls[0].options?.query, { page: 1, pageSize: 50, status: 'SUSPENDED' });

  await assert.rejects(svc.admin.listUsers({ status: 'DELETED' }), /status debe ser uno de/);
  await assert.rejects(svc.admin.listUsers({ pageSize: 101 }), RangeError);
  await assert.rejects(svc.admin.listUsers({ page: 0 }), RangeError);
  assert.equal(fake.calls.length, 1);
});

test('listUsers rechaza respuestas fuera de contrato', async () => {
  const noList = service(() => ({ page: 1, pageSize: 20, total: 0 }));
  await assert.rejects(noList.svc.admin.listUsers(), ServiceContractError);

  const badClient = service(() => ({
    users: [{ ...CLIENT, transferCode: undefined }],
    page: 1,
    pageSize: 20,
    total: 1,
  }));
  await assert.rejects(badClient.svc.admin.listUsers(), ServiceContractError);

  const badBalance = service(() => ({
    users: [{ ...CLIENT, balanceCents: 10.5 }],
    page: 1,
    pageSize: 20,
    total: 1,
  }));
  await assert.rejects(badBalance.svc.admin.listUsers(), ServiceContractError);
});

test('getUser codifica el id y distingue roles desconocidos de roles vacíos', async () => {
  const known = service(() => ({ user: CLIENT, roles: ['CLIENTE'] }));
  const withRoles = await known.svc.admin.getUser('a/b c');
  assert.equal(known.fake.calls[0].path, '/v1/admin/users/a%2Fb%20c');
  assert.deepEqual(withRoles.roles, ['CLIENTE']);

  const unknown = service(() => ({ user: CLIENT, roles: null }));
  assert.equal((await unknown.svc.admin.getUser(CLIENT_ID)).roles, null);

  await assert.rejects(service(() => ({ roles: [] })).svc.admin.getUser(CLIENT_ID), ServiceContractError);
  await assert.rejects(known.svc.admin.getUser('   '), /obligatorio/);
});

test('setUserStatus envía PATCH con el estado en mayúsculas y valida el cambio', async () => {
  const { fake, svc } = service(() => ({ userId: CLIENT_ID, previousStatus: 'ACTIVE', status: 'SUSPENDED' }));
  const change = await svc.admin.setUserStatus(CLIENT_ID, 'suspended');

  assert.equal(fake.calls[0].method, 'PATCH');
  assert.equal(fake.calls[0].path, `/v1/admin/users/${CLIENT_ID}/status`);
  assert.deepEqual(fake.calls[0].body, { status: 'SUSPENDED' });
  assert.deepEqual(change, { userId: CLIENT_ID, previousStatus: 'ACTIVE', status: 'SUSPENDED' });

  await assert.rejects(svc.admin.setUserStatus(CLIENT_ID, 'FROZEN'), /El estado debe ser uno de/);
  assert.equal(fake.calls.length, 1);
});

test('setUserRoles deduplica, normaliza y exige al menos un rol válido', async () => {
  const { fake, svc } = service(() => ({ userId: 'idp-sub-x', roles: ['CLIENTE', 'SOPORTE'] }));
  const result = await svc.admin.setUserRoles(CLIENT_ID, ['cliente', 'SOPORTE', 'soporte']);

  assert.equal(fake.calls[0].method, 'PUT');
  assert.equal(fake.calls[0].path, `/v1/admin/users/${CLIENT_ID}/roles`);
  assert.deepEqual(fake.calls[0].body, { roles: ['CLIENTE', 'SOPORTE'] });
  assert.deepEqual(result.roles, ['CLIENTE', 'SOPORTE']);

  await assert.rejects(svc.admin.setUserRoles(CLIENT_ID, []), /al menos un rol/);
  await assert.rejects(svc.admin.setUserRoles(CLIENT_ID, ['SUPERUSER']), /Cada rol debe ser uno de/);
  assert.equal(fake.calls.length, 1);
});

test('listRoles y getUserRoles validan listas de texto', async () => {
  const { svc } = service((call) =>
    call.path === '/v1/admin/roles' ? { roles: ['CLIENTE', 'ADMIN'] } : { userId: 'u1', roles: ['CLIENTE'] },
  );
  assert.deepEqual(await svc.admin.listRoles(), ['CLIENTE', 'ADMIN']);
  assert.deepEqual(await svc.admin.getUserRoles('u1'), { userId: 'u1', roles: ['CLIENTE'] });

  const bad = service(() => ({ roles: ['CLIENTE', 7] }));
  await assert.rejects(bad.svc.admin.listRoles(), ServiceContractError);
});

// ───────── casos de soporte ─────────

test('cases.list aplica estado y límite, y completa escalationLevel ausente', async () => {
  const { escalationLevel: _omit, ...withoutLevel } = CASE;
  const { fake, svc } = service(() => ({ count: 1, items: [withoutLevel] }));
  const items = await svc.cases.list({ status: 'in_progress' });

  assert.equal(fake.calls[0].path, '/v1/support/cases');
  assert.deepEqual(fake.calls[0].options?.query, { status: 'IN_PROGRESS', limit: 100 });
  assert.equal(items[0].escalationLevel, 0);
  assert.equal(items[0].assignedTo, null);

  await assert.rejects(svc.cases.list({ limit: 201 }), RangeError);
  await assert.rejects(svc.cases.list({ status: 'PENDING' }), /status debe ser uno de/);
});

test('cases.get devuelve caso y mensajes; un payload sin caso es un error de contrato', async () => {
  const ok = service(() => ({ case: CASE, messages: [MESSAGE] }));
  const detail = await ok.svc.cases.get(CASE.id);
  assert.equal(ok.fake.calls[0].path, `/v1/support/cases/${CASE.id}`);
  assert.equal(detail.messages[0].body, 'Estamos revisando tu operación.');

  await assert.rejects(service(() => ({ messages: [] })).svc.cases.get(CASE.id), ServiceContractError);
  await assert.rejects(
    service(() => ({ case: CASE, messages: [{ ...MESSAGE, body: '' }] })).svc.cases.get(CASE.id),
    ServiceContractError,
  );
});

test('cases: estado, asignación, escalamiento y respuesta usan la ruta y el cuerpo del contrato', async () => {
  const { fake, svc } = service((call) =>
    call.path.endsWith('/messages') ? MESSAGE : { ...CASE, status: 'IN_PROGRESS', assignedTo: 'idp-sub-support' },
  );

  await svc.cases.setStatus(CASE.id, 'in_progress');
  await svc.cases.assign(CASE.id, ' idp-sub-support ');
  await svc.cases.escalate(CASE.id, '  Requiere revisión  ');
  const message = await svc.cases.reply(CASE.id, ' Hola ');

  assert.deepEqual(
    fake.calls.map((c) => [c.method, c.path]),
    [
      ['PATCH', `/v1/support/cases/${CASE.id}/status`],
      ['POST', `/v1/support/cases/${CASE.id}/assignments`],
      ['POST', `/v1/support/cases/${CASE.id}/escalations`],
      ['POST', `/v1/support/cases/${CASE.id}/messages`],
    ],
  );
  assert.deepEqual(fake.calls[0].body, { status: 'IN_PROGRESS' });
  assert.deepEqual(fake.calls[1].body, { assigneeId: 'idp-sub-support' });
  assert.deepEqual(fake.calls[2].body, { reason: 'Requiere revisión' });
  assert.deepEqual(fake.calls[3].body, { body: 'Hola' });
  assert.equal(message.id, 'msg1');
});

test('cases valida las entradas antes de enviar', async () => {
  const { fake, svc } = service(() => CASE);
  await assert.rejects(svc.cases.setStatus(CASE.id, 'REOPENED'), /El estado debe ser uno de/);
  await assert.rejects(svc.cases.assign(CASE.id, ' '), /responsable es obligatorio/);
  await assert.rejects(svc.cases.escalate(CASE.id, 'ab'), /al menos 3/);
  await assert.rejects(svc.cases.escalate(CASE.id, 'x'.repeat(501)), /no puede exceder 500/);
  await assert.rejects(svc.cases.reply(CASE.id, '   '), /mensaje es obligatorio/);
  await assert.rejects(svc.cases.reply(CASE.id, 'x'.repeat(2001)), /no puede exceder 2000/);
  assert.equal(fake.calls.length, 0);
});

// ───────── soporte: clientes y operaciones ─────────

test('support.getClient y listClientOperations', async () => {
  const { fake, svc } = service((call) =>
    call.path.endsWith('/operations') ? { clientId: CLIENT_ID, count: 1, items: [OPERATION] } : CLIENT,
  );
  assert.equal((await svc.support.getClient(CLIENT_ID)).transferCode, 'TRF-ALE-0001');
  const ops = await svc.support.listClientOperations(CLIENT_ID);

  assert.equal(fake.calls[0].path, `/v1/support/clients/${CLIENT_ID}`);
  assert.equal(fake.calls[1].path, `/v1/support/clients/${CLIENT_ID}/operations`);
  assert.deepEqual(fake.calls[1].options?.query, { limit: 50 });
  assert.equal(ops.items[0].type, 'INTERNAL_TRANSFER');
  assert.equal(ops.items[0].originalOperationId, null);
});

test('las operaciones aceptan tipos y estados nuevos del backend como texto', async () => {
  const { svc } = service(() => ({ ...OPERATION, type: 'SIMULATED_RECHARGE', status: 'REVERSED' }));
  const op = await svc.support.getOperation(OPERATION.publicReference);
  assert.equal(op.type, 'SIMULATED_RECHARGE');
  assert.equal(op.status, 'REVERSED');

  const badAmount = service(() => ({ ...OPERATION, amountCents: '25000' }));
  await assert.rejects(badAmount.svc.support.getOperation('x'), ServiceContractError);
  const noRef = service(() => ({ ...OPERATION, publicReference: undefined }));
  await assert.rejects(noRef.svc.support.getOperation('x'), ServiceContractError);
});

test('support.getTimeline conserva eventos sin fecha o sin detalle', async () => {
  const { fake, svc } = service(() => ({
    operationId: OPERATION.operationId,
    publicReference: OPERATION.publicReference,
    timeline: [
      { at: '2026-10-08T18:22:38Z', step: 'LEDGER_OPERATION_CREATED', detail: 'INTERNAL_TRANSFER COMPLETED', eventId: null },
      { at: '', step: 'PROJECTED_TO_FIRESTORE', detail: null, eventId: 'evt1' },
    ],
  }));
  const result = await svc.support.getTimeline(OPERATION.publicReference);

  assert.equal(fake.calls[0].path, `/v1/support/operations/${OPERATION.publicReference}/timeline`);
  assert.equal(result.timeline.length, 2);
  assert.equal(result.timeline[1].at, '');
  assert.equal(result.timeline[1].detail, '');
  assert.equal(result.timeline[1].eventId, 'evt1');

  const noStep = service(() => ({
    operationId: 'o',
    publicReference: 'p',
    timeline: [{ at: 'x', detail: 'y' }],
  }));
  await assert.rejects(noStep.svc.support.getTimeline('p'), ServiceContractError);
});

// ───────── operaciones financieras ─────────

test('finance.getLedger valida asientos y el indicador de balance', async () => {
  const entries = [
    { entryNo: 1, accountId: 'a', clientId: CLIENT_ID, accountType: 'CLIENT_WALLET', deltaCents: -2500000, balanceBeforeCents: 79000000, balanceAfterCents: 76500000, createdAt: '2026-10-08T18:22:38Z' },
    { entryNo: 2, accountId: 'b', clientId: null, accountType: 'CLIENT_WALLET', deltaCents: 2500000, balanceBeforeCents: 67200000, balanceAfterCents: 69700000, createdAt: '2026-10-08T18:22:38Z' },
  ];
  const { fake, svc } = service(() => ({
    operationId: OPERATION.operationId,
    publicReference: OPERATION.publicReference,
    balanced: true,
    ledgerEntries: entries,
  }));
  const ledger = await svc.finance.getLedger(OPERATION.publicReference);

  assert.equal(fake.calls[0].path, `/v1/financial-operations/${OPERATION.publicReference}/ledger`);
  assert.equal(ledger.balanced, true);
  assert.equal(ledger.entries.length, 2);
  assert.equal(ledger.entries[0].deltaCents, -2500000);

  const noFlag = service(() => ({ operationId: 'o', publicReference: 'p', ledgerEntries: [] }));
  await assert.rejects(noFlag.svc.finance.getLedger('p'), ServiceContractError);
  const badEntry = service(() => ({
    operationId: 'o',
    publicReference: 'p',
    balanced: true,
    ledgerEntries: [{ ...entries[0], entryNo: 0 }],
  }));
  await assert.rejects(badEntry.svc.finance.getLedger('p'), ServiceContractError);
});

test('finance.getAudit acepta auditoría vacía y conserva los campos del registro', async () => {
  const empty = service(() => ({ operationId: OPERATION.operationId, auditEntries: [] }));
  assert.deepEqual((await empty.svc.finance.getAudit('x')).entries, []);

  const { svc } = service(() => ({
    operationId: OPERATION.operationId,
    auditEntries: [
      { id: 'a1', action: 'FINANCIAL_REVERSAL_CREATED', actorId: 'idp-sub-operator', occurredAt: '2026-10-26T22:14:00Z', details: '{"reason":"x"}' },
    ],
  }));
  const [entry] = (await svc.finance.getAudit('x')).entries;
  assert.equal(entry.action, 'FINANCIAL_REVERSAL_CREATED');
  assert.equal(entry.actorId, 'idp-sub-operator');
  assert.equal(entry.details, '{"reason":"x"}');

  await assert.rejects(service(() => ({ operationId: 'o', auditEntries: ['x'] })).svc.finance.getAudit('o'), ServiceContractError);
});

test('createReversal exige Idempotency-Key, valida el motivo y la envía en la cabecera', async () => {
  const { fake, svc } = service(() => ({
    ...OPERATION,
    type: 'REVERSAL',
    publicReference: 'REV-20261026-56deb0a2c6be',
    originalOperationId: OPERATION.operationId,
  }));

  await assert.rejects(svc.finance.createReversal('TRF-1', 'Duplicidad', { idempotencyKey: '  ' }), /clave de idempotencia/);
  await assert.rejects(svc.finance.createReversal('TRF-1', 'abcd', { idempotencyKey: KEY }), /al menos 5/);
  await assert.rejects(svc.finance.createReversal('TRF-1', 'x'.repeat(257), { idempotencyKey: KEY }), /no puede exceder 256/);
  assert.equal(fake.calls.length, 0);

  const reversal = await svc.finance.createReversal('TRF/1', '  Duplicidad reportada  ', { idempotencyKey: KEY });
  assert.equal(fake.calls[0].method, 'POST');
  assert.equal(fake.calls[0].path, '/v1/financial-operations/TRF%2F1/reversals');
  assert.deepEqual(fake.calls[0].body, { reason: 'Duplicidad reportada' });
  assert.equal(fake.calls[0].options?.idempotencyKey, KEY);
  assert.equal(reversal.type, 'REVERSAL');
  assert.equal(reversal.originalOperationId, OPERATION.operationId);
});

test('createReversal propaga el conflicto del servidor sin enmascararlo', async () => {
  const conflict = ApiError.fromResponse(
    409,
    JSON.stringify({ title: 'Conflict', status: 409, detail: 'Reversal REV-1 exists.' }),
    null,
  );
  const { svc } = service(() => {
    throw conflict;
  });
  await assert.rejects(
    svc.finance.createReversal('TRF-1', 'Segundo intento', { idempotencyKey: KEY }),
    (error: unknown) => error === conflict && (error as ApiError).kind === 'conflict',
  );
});

test('finance.getReversal usa la ruta de reversos', async () => {
  const { fake, svc } = service(() => ({ ...OPERATION, type: 'REVERSAL' }));
  await svc.finance.getReversal('REV-1');
  assert.equal(fake.calls[0].path, '/v1/reversals/REV-1');
});

test('las lecturas reenvían la señal de cancelación al cliente HTTP', async () => {
  const controller = new AbortController();
  const { fake, svc } = service(() => ({ case: CASE, messages: [] }));
  await svc.cases.get(CASE.id, { signal: controller.signal });
  assert.equal(fake.calls[0].options?.signal, controller.signal);
});
