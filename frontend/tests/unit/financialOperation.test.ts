import test from 'node:test';
import assert from 'node:assert/strict';

import { ApiError } from '../../src/services/http';
import { FinancialOperation } from '../../src/services/financialOperation';
import { IdempotencyKeyStore } from '../../src/utils/idempotency';

function makeOperation(scope = 'transfers.create') {
  const keyStore = new IdempotencyKeyStore();
  return { keyStore, operation: new FinancialOperation({ scope, keyStore }) };
}

test('una segunda ejecución simultánea de la misma intención se bloquea', async () => {
  const { operation } = makeOperation();
  let release!: (value: string) => void;
  const gate = new Promise<string>((resolve) => {
    release = resolve;
  });

  const first = operation.run('misma-intencion', () => gate);
  const second = await operation.run('misma-intencion', async () => 'segundo');
  assert.equal(second.status, 'blocked');

  release('ok');
  const firstResult = await first;
  assert.equal(firstResult.status, 'confirmed');
  assert.equal(firstResult.value, 'ok');
});

test('un timeout conserva la misma clave para el reintento de la intención', async () => {
  const { operation } = makeOperation();
  const keys: string[] = [];

  const first = await operation.run('draft-1', async (key) => {
    keys.push(key);
    throw ApiError.fromTransport('timeout');
  });
  assert.equal(first.status, 'uncertain');
  assert.equal(first.error?.kind, 'timeout');

  const second = await operation.run('draft-1', async (key) => {
    keys.push(key);
    return 'TRF-0001';
  });
  assert.equal(second.status, 'confirmed');
  assert.equal(keys[0], keys[1]);
  // UUID v4 estándar: 36 caracteres, por debajo del máximo de 64 del backend.
  assert.equal(keys[0].length, 36);
});

test('un fallo de red o 5xx mantiene la clave y el resultado incierto', async () => {
  const { operation } = makeOperation();
  const keys: string[] = [];

  for (const error of [
    ApiError.fromTransport('network'),
    ApiError.fromResponse(500, ''),
    ApiError.fromResponse(503, ''),
  ]) {
    const result = await operation.run('draft-1', async (key) => {
      keys.push(key);
      throw error;
    });
    assert.equal(result.status, 'uncertain');
  }

  assert.equal(new Set(keys).size, 1);
});

test('confirmar libera la clave: la siguiente intención recibe una nueva', async () => {
  const { operation, keyStore } = makeOperation();
  const keys: string[] = [];

  await operation.run('draft-1', async (key) => {
    keys.push(key);
    return 'ok';
  });
  assert.equal(keyStore.peek('transfers.create'), undefined);

  await operation.run('draft-1', async (key) => {
    keys.push(key);
    return 'ok';
  });
  assert.notEqual(keys[0], keys[1]);
});

test('un rechazo definitivo 4xx libera la clave para corregir y reintentar', async () => {
  const { operation, keyStore } = makeOperation();

  const rejected = await operation.run('draft-1', async () => {
    throw ApiError.fromResponse(422, '');
  });
  assert.equal(rejected.status, 'rejected');
  assert.equal(rejected.error?.kind, 'unprocessable');
  assert.equal(keyStore.peek('transfers.create'), undefined);
});

test('un 409 confirma que la operación ya fue procesada sin reintentar', async () => {
  const { operation } = makeOperation();
  let calls = 0;

  const result = await operation.run('draft-1', async () => {
    calls += 1;
    throw ApiError.fromResponse(
      409,
      JSON.stringify({ title: 'Conflicto', status: 409, code: 'CONCURRENCY_CONFLICT' }),
    );
  });

  assert.equal(result.status, 'rejected');
  assert.equal(result.error?.problem.code, 'CONCURRENCY_CONFLICT');
  assert.equal(calls, 1);
});

test('un cambio de huella usa una clave distinta', async () => {
  const { operation } = makeOperation();
  const keys: string[] = [];

  await operation.run('draft-1|1000', async (key) => {
    keys.push(key);
    throw ApiError.fromTransport('timeout');
  });
  await operation.run('draft-1|2000', async (key) => {
    keys.push(key);
    throw ApiError.fromTransport('timeout');
  });

  assert.notEqual(keys[0], keys[1]);
});

test('la cancelación local no se presenta como éxito ni como rechazo', async () => {
  const { operation, keyStore } = makeOperation();

  const result = await operation.run('draft-1', async () => {
    throw ApiError.fromTransport('aborted');
  });

  assert.equal(result.status, 'cancelled');
  assert.equal(result.error?.kind, 'aborted');
  assert.notEqual(keyStore.peek('transfers.create'), undefined);
});

test('un error inesperado se trata como resultado incierto', async () => {
  const { operation } = makeOperation();
  const result = await operation.run('draft-1', async () => {
    throw new Error('boom');
  });
  assert.equal(result.status, 'uncertain');
  assert.equal(result.error?.kind, 'unexpected');
});

test('una huella vacía no ejecuta el envío', async () => {
  const { operation } = makeOperation();
  let calls = 0;

  await assert.rejects(
    operation.run('   ', async () => {
      calls += 1;
      return 'ok';
    }),
    Error,
  );
  assert.equal(calls, 0);
});

test('isSubmitting y reset reflejan el ciclo de la operación', async () => {
  const { operation, keyStore } = makeOperation();
  assert.equal(operation.isSubmitting, false);

  const pending = operation.run('draft-1', async () => {
    throw ApiError.fromTransport('timeout');
  });
  assert.equal(operation.isSubmitting, true);
  await pending;
  assert.equal(operation.isSubmitting, false);

  operation.reset();
  assert.equal(keyStore.peek('transfers.create'), undefined);
});

test('la operación exige un scope estable', () => {
  assert.throws(
    () => new FinancialOperation({ scope: '  ', keyStore: new IdempotencyKeyStore() }),
    Error,
  );
});
