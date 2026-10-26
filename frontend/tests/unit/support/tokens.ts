// Helpers compartidos por las pruebas de sesión (no es un archivo de test).
export const NOW_MS = 1_800_000_000_000;

/** Construye un JWT sintáctico (sin firma válida) para probar el decodificador. */
export function makeJwt(payload: Record<string, unknown>): string {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.firma`;
}

export function expSecondsFromNow(seconds = 3600, nowMs: number = NOW_MS): number {
  return Math.floor(nowMs / 1000) + seconds;
}
