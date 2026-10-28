import test from 'node:test';
import assert from 'node:assert/strict';

import { ServiceContractError } from '../../src/services/contract';
import {
  createTransfersService,
  DEFAULT_TRANSFER_PAGE_SIZE,
  MAX_TRANSFER_CENTS,
  MAX_TRANSFER_DESCRIPTION_LENGTH,
  MIN_TRANSFER_CENTS,
} from '../../src/services/transfersService';
import { createFakeHttp } from './support/fakeHttp';

const KEY = '11111111-1111-4111-8111-111111111111';

const TRANSFER = {
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

const RECEIPT = {
  receiptNumber: 'RCP-0001',
  transferId: 'TRF-0001',
  originMaskedTransferCode: '****1234',
  destinationMaskedTransferCode: '****5678',
  amount: 1234.56,
  currency: 'COP',
  completedAt: '2026-10-08T14:02:00Z',
  authorizationCode: 'AUTH-01',
  status: 'COMPLETED',
};

test('create envía el monto como decimal COP, la clave y ningún clientId', async () => {
  const fake = createFakeHttp(() => TRANSFER);
  const transfer = await createTransfersService(fake.http).create(
    {
      destinationTransferCode: ' 3001234567 ',
      amountCents: 100000,
      description: '  Cena  ',
    },
    { idempotencyKey: KEY },
  );

  const call = fake.calls[0];
  assert.equal(call.method, 'POST');
  assert.equal(call.path, '/v1/transfers');
  assert.deepEqual(call.body, {
    destinationTransferCode: '3001234567',
    amount: 1000,
    description: 'Cena',
    currency: 'COP',
  });
  assert.equal(call.options?.idempotencyKey, KEY);
  assert.ok(!JSON.stringify(call.body).includes('clientId'));

  assert.equal(transfer.transferId, 'TRF-0001');
  assert.equal(transfer.amountCents, 100000);
});

test('create envía description null cuando el mensaje está vacío', async () => {
  const fake = createFakeHttp(() => TRANSFER);
  await createTransfersService(fake.http).create(
    { destinationTransferCode: '3001234567', amountCents: 100000, description: '   ' },
    { idempotencyKey: KEY },
  );
  assert.equal((fake.calls[0].body as { description: unknown }).description, null);
});

test('create exige clave de idempotencia antes de llamar a la API', async () => {
  const fake = createFakeHttp(() => TRANSFER);
  const service = createTransfersService(fake.http);
  const input = { destinationTransferCode: '3001234567', amountCents: 100000 };

  await assert.rejects(service.create(input, { idempotencyKey: '' }), Error);
  await assert.rejects(
    service.create(input, { idempotencyKey: 'x'.repeat(65) }),
    Error,
  );
  assert.equal(fake.calls.length, 0);
});

test('create valida código destino, monto y descripción antes de la API', async () => {
  const fake = createFakeHttp(() => TRANSFER);
  const service = createTransfersService(fake.http);
  const options = { idempotencyKey: KEY };

  for (const code of ['', '   ', 'abc def', 'codigo!', 'A'.repeat(21)]) {
    await assert.rejects(
      service.create(
        { destinationTransferCode: code, amountCents: 100000 },
        options,
      ),
      Error,
    );
  }

  for (const amountCents of [
    MIN_TRANSFER_CENTS - 1,
    MAX_TRANSFER_CENTS + 1,
    100.5,
    0,
    -100,
  ]) {
    await assert.rejects(
      service.create(
        { destinationTransferCode: '3001234567', amountCents },
        options,
      ),
      Error,
    );
  }

  await assert.rejects(
    service.create(
      {
        destinationTransferCode: '3001234567',
        amountCents: 100000,
        description: 'x'.repeat(MAX_TRANSFER_DESCRIPTION_LENGTH + 1),
      },
      options,
    ),
    Error,
  );

  assert.equal(fake.calls.length, 0);
});

test('create acepta los límites de monto y la descripción máxima', async () => {
  const fake = createFakeHttp(() => TRANSFER);
  const service = createTransfersService(fake.http);

  await service.create(
    { destinationTransferCode: 'a-b_C', amountCents: MIN_TRANSFER_CENTS },
    { idempotencyKey: KEY },
  );
  await service.create(
    { destinationTransferCode: '3001234567', amountCents: MAX_TRANSFER_CENTS },
    { idempotencyKey: KEY },
  );
  await service.create(
    {
      destinationTransferCode: '3001234567',
      amountCents: 100000,
      description: 'x'.repeat(MAX_TRANSFER_DESCRIPTION_LENGTH),
    },
    { idempotencyKey: KEY },
  );

  assert.equal(fake.calls.length, 3);
});

test('create rechaza respuestas con moneda distinta de COP o sin referencia', async () => {
  const wrongCurrency = createFakeHttp(() => ({ ...TRANSFER, currency: 'USD' }));
  await assert.rejects(
    createTransfersService(wrongCurrency.http).create(
      { destinationTransferCode: '3001234567', amountCents: 100000 },
      { idempotencyKey: KEY },
    ),
    ServiceContractError,
  );

  const missingId = createFakeHttp(() => {
    const { transferId: _ignored, ...rest } = TRANSFER;
    return rest;
  });
  await assert.rejects(
    createTransfersService(missingId.http).create(
      { destinationTransferCode: '3001234567', amountCents: 100000 },
      { idempotencyKey: KEY },
    ),
    ServiceContractError,
  );
});

test('list usa page y pageSize por defecto y devuelve la lista validada', async () => {
  const fake = createFakeHttp(() => [TRANSFER]);
  const transfers = await createTransfersService(fake.http).list();

  assert.equal(fake.calls[0].path, '/v1/transfers');
  assert.deepEqual(fake.calls[0].options?.query, {
    page: 1,
    pageSize: DEFAULT_TRANSFER_PAGE_SIZE,
  });
  assert.equal(transfers.length, 1);
  assert.equal(transfers[0].amountCents, 100000);
});

test('list valida page/pageSize y rechaza una respuesta que no sea lista', async () => {
  const fake = createFakeHttp(() => []);
  const service = createTransfersService(fake.http);

  await assert.rejects(service.list({ page: 0 }), RangeError);
  await assert.rejects(service.list({ page: 1.5 }), RangeError);
  await assert.rejects(service.list({ pageSize: 0 }), RangeError);
  await assert.rejects(service.list({ pageSize: 101 }), RangeError);
  assert.equal(fake.calls.length, 0);

  const notAList = createFakeHttp(() => ({ items: [] }));
  await assert.rejects(
    createTransfersService(notAList.http).list(),
    ServiceContractError,
  );
});

test('getById codifica el identificador y exige uno no vacío', async () => {
  const fake = createFakeHttp(() => TRANSFER);
  const service = createTransfersService(fake.http);

  await service.getById('TRF/0001');
  assert.equal(fake.calls[0].path, '/v1/transfers/TRF%2F0001');

  await assert.rejects(service.getById('   '), Error);
  assert.equal(fake.calls.length, 1);
});

test('getReceipt consulta /receipt y convierte el decimal a centavos', async () => {
  const fake = createFakeHttp(() => RECEIPT);
  const receipt = await createTransfersService(fake.http).getReceipt('TRF-0001');

  assert.equal(fake.calls[0].path, '/v1/transfers/TRF-0001/receipt');
  assert.equal(receipt.receiptNumber, 'RCP-0001');
  assert.equal(receipt.amountCents, 123456);
  assert.equal(receipt.originMaskedTransferCode, '****1234');
  assert.equal(receipt.authorizationCode, 'AUTH-01');
});

test('getReceipt rechaza montos no decimales y monedas distintas de COP', async () => {
  const nan = createFakeHttp(() => ({ ...RECEIPT, amount: 'uno' }));
  await assert.rejects(
    createTransfersService(nan.http).getReceipt('TRF-0001'),
    ServiceContractError,
  );

  const exp = createFakeHttp(() => ({ ...RECEIPT, amount: 1e21 }));
  await assert.rejects(
    createTransfersService(exp.http).getReceipt('TRF-0001'),
    ServiceContractError,
  );

  const usd = createFakeHttp(() => ({ ...RECEIPT, currency: 'USD' }));
  await assert.rejects(
    createTransfersService(usd.http).getReceipt('TRF-0001'),
    ServiceContractError,
  );
});
