// ============================================================
// Claves de idempotencia
// ============================================================
// El backend (`IdempotencyActionFilter`) exige `Idempotency-Key` en todas las
// mutaciones financieras y la vincula al actor + método + ruta + hash del cuerpo.
// Regla del cliente:
//   - Un reintento de la MISMA intención reutiliza la misma clave.
//   - Una operación nueva (o un cambio de monto/destino) usa otra clave.
// El generador no es criptográfico: la clave solo debe ser única, no secreta.

const MAX_KEY_LENGTH = 128;

function randomHex(bytes: number): string {
  const cryptoObject = (globalThis as { crypto?: Crypto }).crypto;
  if (cryptoObject && typeof cryptoObject.getRandomValues === 'function') {
    const buffer = new Uint8Array(bytes);
    cryptoObject.getRandomValues(buffer);
    return Array.from(buffer, (value) => value.toString(16).padStart(2, '0')).join('');
  }
  let output = '';
  for (let index = 0; index < bytes; index += 1) {
    output += Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0');
  }
  return output;
}

/** Genera una clave compatible con el backend (UUID v4 en formato estándar). */
export function generateIdempotencyKey(): string {
  const hex = randomHex(16);
  const variant = ((parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80)
    .toString(16)
    .padStart(2, '0');
  const key = [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `${variant}${hex.slice(18, 20)}`,
    `${hex.slice(20, 32)}`,
  ].join('-');
  return key.length <= MAX_KEY_LENGTH ? key : key.slice(0, MAX_KEY_LENGTH);
}

/**
 * Conserva una clave por operación lógica para que los reintentos no dupliquen
 * una transferencia o recarga.
 */
export class IdempotencyKeyStore {
  private readonly keys = new Map<string, string>();

  /** Devuelve la clave vigente de la operación, creándola si no existe. */
  acquire(scope: string): string {
    const existing = this.keys.get(scope);
    if (existing) return existing;
    const created = generateIdempotencyKey();
    this.keys.set(scope, created);
    return created;
  }

  /** Clave vigente sin crear una nueva. */
  peek(scope: string): string | undefined {
    return this.keys.get(scope);
  }

  /** Descarta la clave (la próxima intención recibe una nueva). */
  release(scope: string): void {
    this.keys.delete(scope);
  }

  /** Cambia la clave de la operación (tras éxito o fallo definitivo). */
  rotate(scope: string): string {
    const created = generateIdempotencyKey();
    this.keys.set(scope, created);
    return created;
  }

  clear(): void {
    this.keys.clear();
  }
}

/**
 * Store compartido por las operaciones financieras de la app.
 * Se limpia al cerrar sesión para no reutilizar claves de otro actor.
 */
export const idempotencyKeys = new IdempotencyKeyStore();
