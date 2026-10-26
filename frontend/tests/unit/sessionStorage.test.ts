import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createSecureSessionStorage,
  MemorySessionStorage,
  SESSION_STORAGE_KEY_DEFAULT,
  type SecureStoreLike,
} from '../../src/services/session/storage';

class FakeSecureStore implements SecureStoreLike {
  readonly values = new Map<string, string>();
  deletes = 0;

  async getItemAsync(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async setItemAsync(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }

  async deleteItemAsync(key: string): Promise<void> {
    this.deletes += 1;
    this.values.delete(key);
  }
}

test('MemorySessionStorage conserva y borra el refresh token', async () => {
  const storage = new MemorySessionStorage();
  assert.equal(await storage.loadRefreshToken(), null);

  await storage.saveRefreshToken('refresh-1');
  assert.equal(await storage.loadRefreshToken(), 'refresh-1');

  await storage.clear();
  assert.equal(await storage.loadRefreshToken(), null);
});

test('SecureStore guarda solo el refresh token, nunca el ID token', async () => {
  const store = new FakeSecureStore();
  const storage = createSecureSessionStorage(store);

  await storage.saveRefreshToken('refresh-1');

  const raw = store.values.get(SESSION_STORAGE_KEY_DEFAULT);
  assert.ok(raw);
  const parsed = JSON.parse(raw);
  assert.deepEqual(parsed, { version: 1, refreshToken: 'refresh-1' });
  assert.equal(raw.includes('idToken'), false);
  assert.equal(raw.includes('id_token'), false);
  assert.equal(await storage.loadRefreshToken(), 'refresh-1');
});

test('un valor corrupto o de versión desconocida se ignora', async () => {
  const store = new FakeSecureStore();
  const storage = createSecureSessionStorage(store, 'clave-prueba');

  store.values.set('clave-prueba', '{no-es-json');
  assert.equal(await storage.loadRefreshToken(), null);

  store.values.set('clave-prueba', JSON.stringify({ version: 2, refreshToken: 'x' }));
  assert.equal(await storage.loadRefreshToken(), null);

  store.values.set('clave-prueba', JSON.stringify({ version: 1, refreshToken: '' }));
  assert.equal(await storage.loadRefreshToken(), null);
});

test('clear elimina la entrada de SecureStore', async () => {
  const store = new FakeSecureStore();
  const storage = createSecureSessionStorage(store);

  await storage.saveRefreshToken('refresh-1');
  await storage.clear();

  assert.equal(store.values.size, 0);
  assert.equal(store.deletes, 1);
  assert.equal(await storage.loadRefreshToken(), null);
});

test('no se persiste un refresh token vacío', async () => {
  const storage = createSecureSessionStorage(new FakeSecureStore());

  await assert.rejects(() => storage.saveRefreshToken(''), /refresh token vacío/);
});
