import test from 'node:test';
import assert from 'node:assert/strict';

import {
  generateIdempotencyKey,
  IdempotencyKeyStore,
} from '../../src/utils/idempotency';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test('generateIdempotencyKey produce UUID v4 compatibles con el backend', () => {
  for (let index = 0; index < 50; index += 1) {
    const key = generateIdempotencyKey();
    assert.match(key, UUID_V4);
    assert.ok(key.length >= 1 && key.length <= 128);
  }
});

test('generateIdempotencyKey no repite claves en una ráfaga', () => {
  const keys = new Set<string>();
  for (let index = 0; index < 200; index += 1) {
    keys.add(generateIdempotencyKey());
  }
  assert.equal(keys.size, 200);
});

test('IdempotencyKeyStore reutiliza la clave de una misma intención', () => {
  const store = new IdempotencyKeyStore();
  const first = store.acquire('transfer:draft-1');
  const second = store.acquire('transfer:draft-1');

  assert.equal(first, second);
  assert.equal(store.peek('transfer:draft-1'), first);
});

test('IdempotencyKeyStore aísla operaciones distintas', () => {
  const store = new IdempotencyKeyStore();
  const transfer = store.acquire('transfer:draft-1');
  const recharge = store.acquire('recharge:draft-1');

  assert.notEqual(transfer, recharge);
});

test('release permite generar una nueva clave para la siguiente intención', () => {
  const store = new IdempotencyKeyStore();
  const first = store.acquire('transfer:draft-1');
  store.release('transfer:draft-1');
  assert.equal(store.peek('transfer:draft-1'), undefined);

  const second = store.acquire('transfer:draft-1');
  assert.notEqual(first, second);
});

test('rotate cambia la clave conservando el alcance', () => {
  const store = new IdempotencyKeyStore();
  const first = store.acquire('recharge:draft-1');
  const rotated = store.rotate('recharge:draft-1');

  assert.notEqual(first, rotated);
  assert.equal(store.peek('recharge:draft-1'), rotated);
});

test('clear descarta todas las claves (cierre de sesión)', () => {
  const store = new IdempotencyKeyStore();
  store.acquire('transfer:draft-1');
  store.acquire('recharge:draft-1');
  store.clear();

  assert.equal(store.peek('transfer:draft-1'), undefined);
  assert.equal(store.peek('recharge:draft-1'), undefined);
});
