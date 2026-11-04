import test from 'node:test';
import assert from 'node:assert/strict';

import { AuthError } from '../../src/services/session/errors';
import type {
  IdentityPlatformClient,
} from '../../src/services/session/identityPlatform';
import { SessionManager } from '../../src/services/session/sessionManager';
import { MemorySessionStorage } from '../../src/services/session/storage';
import type { IdentityTokens } from '../../src/services/session/types';
import { expSecondsFromNow, makeJwt, NOW_MS } from './support/tokens';

function idToken(
  overrides: Record<string, unknown> = {},
  expiresInSeconds = 3600,
): string {
  return makeJwt({
    user_id: 'uid-1',
    client_id: 'client-1',
    roles: ['CLIENTE'],
    exp: expSecondsFromNow(expiresInSeconds),
    ...overrides,
  });
}

function tokens(
  overrides: Partial<IdentityTokens> = {},
): IdentityTokens {
  return {
    idToken: idToken(),
    refreshToken: 'refresh-new',
    expiresInSeconds: 3600,
    ...overrides,
  };
}

interface FakeIdentityOptions {
  readonly refresh?: (refreshToken: string) => Promise<IdentityTokens>;
  readonly signIn?: (email: string, password: string) => Promise<IdentityTokens>;
  readonly signUp?: (email: string, password: string) => Promise<IdentityTokens>;
}

class FakeIdentity implements IdentityPlatformClient {
  readonly refreshCalls: string[] = [];
  readonly signInCalls: Array<{ email: string; password: string }> = [];
  readonly signUpCalls: Array<{ email: string; password: string }> = [];
  private readonly refreshHandler: (refreshToken: string) => Promise<IdentityTokens>;
  private readonly signInHandler: (email: string, password: string) => Promise<IdentityTokens>;
  private readonly signUpHandler: (email: string, password: string) => Promise<IdentityTokens>;

  constructor(options: FakeIdentityOptions = {}) {
    this.refreshHandler =
      options.refresh ?? (async () => tokens({ refreshToken: 'refresh-rotated' }));
    this.signInHandler = options.signIn ?? (async () => tokens());
    this.signUpHandler = options.signUp ?? (async () => tokens());
  }

  async signInWithPassword(email: string, password: string): Promise<IdentityTokens> {
    this.signInCalls.push({ email, password });
    return this.signInHandler(email, password);
  }

  async signUp(email: string, password: string): Promise<IdentityTokens> {
    this.signUpCalls.push({ email, password });
    return this.signUpHandler(email, password);
  }

  async refresh(refreshToken: string): Promise<IdentityTokens> {
    this.refreshCalls.push(refreshToken);
    return this.refreshHandler(refreshToken);
  }
}

function createManager(
  options: {
    readonly storage?: MemorySessionStorage;
    readonly identity?: FakeIdentity;
    readonly now?: () => number;
    readonly onSessionCleared?: () => void | Promise<void>;
  } = {},
) {
  let now = options.now ? options.now() : NOW_MS;
  const storage = options.storage ?? new MemorySessionStorage();
  const identity = options.identity ?? new FakeIdentity();
  const manager = new SessionManager({
    storage,
    identity,
    now: () => now,
    onSessionCleared: options.onSessionCleared,
  });
  return {
    manager,
    storage,
    identity,
    advanceTo: (value: number) => {
      now = value;
    },
  };
}

test('sin refresh token la restauración queda anonymous y no llama al proveedor', async () => {
  const { manager, identity } = createManager();

  const snapshot = await manager.restore();

  assert.equal(snapshot.status, 'anonymous');
  assert.equal(snapshot.user, null);
  assert.equal(identity.refreshCalls.length, 0);
});

test('con refresh token válido restaura, persiste la rotación y expone la identidad', async () => {
  const storage = new MemorySessionStorage('refresh-old');
  const identity = new FakeIdentity({
    refresh: async () => tokens({ refreshToken: 'refresh-rotated' }),
  });
  const { manager } = createManager({ storage, identity });

  const snapshot = await manager.restore();

  assert.equal(snapshot.status, 'authenticated');
  assert.equal(snapshot.user?.uid, 'uid-1');
  assert.equal(snapshot.user?.clientId, 'client-1');
  assert.equal(snapshot.expiresAt, NOW_MS + 3_600_000);
  assert.equal(await storage.loadRefreshToken(), 'refresh-rotated');
  assert.deepEqual(identity.refreshCalls, ['refresh-old']);
});

test('un refresh token inválido borra la persistencia y deja anonymous', async () => {
  const storage = new MemorySessionStorage('refresh-old');
  const identity = new FakeIdentity({
    refresh: async () => {
      throw new AuthError('invalid_session', 'vencida');
    },
  });
  let cleared = 0;
  const { manager } = createManager({
    storage,
    identity,
    onSessionCleared: () => {
      cleared += 1;
    },
  });

  const snapshot = await manager.restore();

  assert.equal(snapshot.status, 'anonymous');
  assert.equal(snapshot.errorCode, 'invalid_session');
  assert.equal(await storage.loadRefreshToken(), null);
  assert.equal(cleared >= 1, true);
});

test('un fallo de red conserva el refresh token y permite reintentar', async () => {
  const storage = new MemorySessionStorage('refresh-old');
  let attempts = 0;
  const identity = new FakeIdentity({
    refresh: async () => {
      attempts += 1;
      if (attempts === 1) throw new AuthError('network', 'sin red');
      return tokens({ refreshToken: 'refresh-rotated' });
    },
  });
  const { manager } = createManager({ storage, identity });

  const failed = await manager.restore();
  assert.equal(failed.status, 'unavailable');
  assert.equal(failed.errorCode, 'network');
  assert.equal(await storage.loadRefreshToken(), 'refresh-old');

  const restored = await manager.restore();
  assert.equal(restored.status, 'authenticated');
  assert.equal(await storage.loadRefreshToken(), 'refresh-rotated');
  assert.equal(attempts, 2);
});

test('getAccessToken renueva una sola vez aunque lleguen solicitudes concurrentes', async () => {
  const identity = new FakeIdentity({
    signIn: async () =>
      tokens({
        idToken: idToken({}, 30),
        refreshToken: 'refresh-old',
        expiresInSeconds: 30,
      }),
    refresh: async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return tokens({ idToken: idToken({}, 3600), refreshToken: 'refresh-rotated' });
    },
  });
  const { manager } = createManager({ identity });

  await manager.signIn('persona@example.com', 'secreto');
  const [first, second] = await Promise.all([
    manager.getAccessToken(),
    manager.getAccessToken(),
  ]);

  assert.ok(first);
  assert.equal(first, second);
  assert.equal(identity.refreshCalls.length, 1);
});

test('getAccessToken devuelve null sin sesión y no intenta refrescar', async () => {
  const { manager, identity } = createManager();

  assert.equal(await manager.getAccessToken(), null);
  assert.equal(identity.refreshCalls.length, 0);
});

test('signOut borra tokens, limpia claves auxiliares y notifica anonymous', async () => {
  const storage = new MemorySessionStorage('refresh-old');
  const identity = new FakeIdentity();
  let cleared = 0;
  const { manager } = createManager({
    storage,
    identity,
    onSessionCleared: () => {
      cleared += 1;
    },
  });

  await manager.restore();
  assert.equal(manager.getSnapshot().status, 'authenticated');

  const events: string[] = [];
  manager.subscribe((snapshot) => events.push(snapshot.status));
  await manager.signOut();

  assert.equal(manager.getSnapshot().status, 'anonymous');
  assert.equal(await storage.loadRefreshToken(), null);
  assert.equal(cleared >= 1, true);
  assert.deepEqual(events.slice(-2), ['authenticated', 'anonymous']);
});

test('un 401 invalida la sesión local sin reintentar la solicitud', async () => {
  const { manager, storage } = createManager({
    storage: new MemorySessionStorage('refresh-old'),
  });
  await manager.restore();

  await manager.handleUnauthorized();

  assert.equal(manager.getSnapshot().status, 'anonymous');
  assert.equal(manager.getSnapshot().errorCode, 'invalid_session');
  assert.equal(await storage.loadRefreshToken(), null);
});

test('signIn persiste el refresh token y limpia claves de la sesión anterior', async () => {
  const storage = new MemorySessionStorage(null);
  const identity = new FakeIdentity({
    signIn: async () => tokens({ refreshToken: 'refresh-signed-in' }),
  });
  let cleared = 0;
  const { manager } = createManager({
    storage,
    identity,
    onSessionCleared: () => {
      cleared += 1;
    },
  });

  const snapshot = await manager.signIn('persona@example.com', 'secreto');

  assert.equal(snapshot.status, 'authenticated');
  assert.equal(await storage.loadRefreshToken(), 'refresh-signed-in');
  assert.equal(cleared, 1);
  assert.deepEqual(identity.signInCalls, [
    { email: 'persona@example.com', password: 'secreto' },
  ]);
});

test('signIn propaga el error del proveedor sin crear sesión', async () => {
  const identity = new FakeIdentity({
    signIn: async () => {
      throw new AuthError('invalid_credentials', 'credenciales');
    },
  });
  const { manager, storage } = createManager({ identity });

  await assert.rejects(
    () => manager.signIn('persona@example.com', 'secreto'),
    (error: unknown) =>
      error instanceof AuthError && error.code === 'invalid_credentials',
  );
  assert.equal(manager.getSnapshot().status, 'initializing');
  assert.equal(await storage.loadRefreshToken(), null);
});

test('subscribe emite el estado actual y deja de hacerlo al cancelar', async () => {
  const { manager } = createManager();
  const statuses: string[] = [];
  const unsubscribe = manager.subscribe((snapshot) => statuses.push(snapshot.status));

  await manager.restore();
  unsubscribe();
  await manager.signOut();

  assert.deepEqual(statuses.slice(0, 2), ['initializing', 'anonymous']);
});

test('un logout durante la restauración impide que la respuesta tardía reabra la sesión', async () => {
  let resolveRefresh: (value: IdentityTokens) => void = () => {};
  const pendingRefresh = new Promise<IdentityTokens>((resolve) => {
    resolveRefresh = resolve;
  });
  const identity = new FakeIdentity({ refresh: () => pendingRefresh });
  const storage = new MemorySessionStorage('refresh-old');
  const { manager } = createManager({ storage, identity });

  const restoring = manager.restore();
  while (identity.refreshCalls.length === 0) {
    await Promise.resolve();
  }

  await manager.signOut();
  resolveRefresh(tokens({ refreshToken: 'refresh-late' }));

  const snapshot = await restoring;
  assert.equal(snapshot.status, 'anonymous');
  assert.equal(manager.getSnapshot().status, 'anonymous');
  assert.equal(await storage.loadRefreshToken(), null);
});

test('un 401 con el token de una sesión anterior no cierra la sesión nueva', async () => {
  let signInCount = 0;
  const identity = new FakeIdentity({
    signIn: async () => {
      signInCount += 1;
      return tokens({
        idToken: idToken({ user_id: `uid-${signInCount}` }),
        refreshToken: `refresh-${signInCount}`,
      });
    },
  });
  const { manager } = createManager({ identity });

  await manager.signIn('a@nequi.com', 'pw');
  const previousToken = await manager.getAccessToken();
  await manager.signOut();
  await manager.signIn('b@nequi.com', 'pw');

  await manager.handleUnauthorized(previousToken);

  assert.equal(manager.getSnapshot().status, 'authenticated');
  assert.equal(manager.getSnapshot().user?.uid, 'uid-2');
});

test('un 401 con el token vigente sí invalida la sesión', async () => {
  const { manager } = createManager();
  await manager.signIn('a@nequi.com', 'pw');
  const currentToken = await manager.getAccessToken();

  await manager.handleUnauthorized(currentToken);

  assert.equal(manager.getSnapshot().status, 'anonymous');
  assert.equal(manager.getSnapshot().errorCode, 'invalid_session');
});

class DelayedClearStorage extends MemorySessionStorage {
  private readonly pending: Array<() => void> = [];

  override async clear(): Promise<void> {
    await new Promise<void>((resolve) => this.pending.push(resolve));
    await super.clear();
  }

  release(): void {
    for (const resolve of this.pending.splice(0)) resolve();
  }
}

test('getAccessToken durante el logout no reutiliza el refresh token', async () => {
  const storage = new DelayedClearStorage();
  await storage.saveRefreshToken('refresh-old');
  const identity = new FakeIdentity();
  const { manager } = createManager({ storage, identity });
  await manager.restore();
  assert.equal(identity.refreshCalls.length, 1);

  const loggingOut = manager.signOut();
  const tokenDuringLogout = await manager.getAccessToken();
  assert.equal(tokenDuringLogout, null);
  assert.equal(identity.refreshCalls.length, 1);

  storage.release();
  await loggingOut;
  assert.equal(manager.getSnapshot().status, 'anonymous');
  assert.equal(await manager.getAccessToken(), null);
  assert.equal(await storage.loadRefreshToken(), null);
});

test('signUp registra usuario, persiste refresh token y queda autenticado', async () => {
  const storage = new MemorySessionStorage();
  const identity = new FakeIdentity({
    signUp: async (email) =>
      tokens({
        idToken: idToken({ email, user_id: 'new-uid' }),
        refreshToken: 'refresh-registered',
      }),
  });
  const { manager } = createManager({ storage, identity });
  const snapshot = await manager.signUp('nuevo@nequi.com', 'secreto123');

  assert.equal(snapshot.status, 'authenticated');
  assert.equal(snapshot.user?.uid, 'new-uid');
  assert.equal(identity.signUpCalls.length, 1);
  assert.equal(identity.signUpCalls[0].email, 'nuevo@nequi.com');
  assert.equal(await storage.loadRefreshToken(), 'refresh-registered');
});
