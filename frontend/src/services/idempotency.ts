// ============================================================
// Idempotencia de mutaciones financieras
// ============================================================
// El backend exige `Idempotency-Key` en POST /v1/transfers y /v1/recharges.
// La clave identifica una INTENCIÓN: mientras la intención no cambie, los
// reintentos deben reutilizarla. Una intención distinta (monto, destino o
// método) necesita una clave nueva.

export const MAX_IDEMPOTENCY_KEY_LENGTH = 64;

export function requireIdempotencyKey(
  key: string | null | undefined,
): string {
  const trimmed = (key ?? '').trim();
  if (trimmed.length === 0) {
    throw new Error(
      'La operación requiere una clave de idempotencia antes de enviarse.',
    );
  }
  if (trimmed.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    throw new Error('La clave de idempotencia supera la longitud permitida.');
  }
  return trimmed;
}
