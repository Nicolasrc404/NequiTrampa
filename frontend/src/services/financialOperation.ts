// ============================================================
// Operaciones financieras: una intención, una clave, un envío
// ============================================================
// Reglas:
//   - Nunca se ejecutan dos envíos simultáneos de la misma operación.
//   - Un reintento de la MISMA intención reutiliza la `Idempotency-Key`.
//   - Al confirmar (o recibir un rechazo definitivo) la clave se libera para
//     que una intención nueva no reutilice la respuesta cacheada del backend.
//   - Ante timeout, red o 5xx el resultado es INCIERTO: se conserva la clave y
//     no se presenta la operación como exitosa ni como rechazada.
//   - No hay reintentos automáticos.

import { ApiError, asApiError } from './http';
import {
  idempotencyKeys as defaultKeyStore,
  type IdempotencyKeyStore,
} from '../utils/idempotency';

export type FinancialOperationStatus =
  | 'confirmed'
  | 'rejected'
  | 'uncertain'
  | 'cancelled'
  | 'blocked';

export interface FinancialOperationResult<T> {
  readonly status: FinancialOperationStatus;
  readonly value?: T;
  readonly error?: ApiError;
}

export interface FinancialOperationOptions {
  readonly scope: string;
  readonly keyStore?: IdempotencyKeyStore;
}

const DEFINITIVE_REJECTIONS: ReadonlySet<ApiError['kind']> = new Set([
  'bad_request',
  'unauthorized',
  'forbidden',
  'not_found',
  'conflict',
  'unprocessable',
  'rate_limited',
  'client_error',
]);

const CANCELLED: ReadonlySet<ApiError['kind']> = new Set(['aborted']);

export class FinancialOperation {
  private readonly scope: string;
  private readonly keyStore: IdempotencyKeyStore;
  private fingerprint: string | null = null;
  private submitting = false;

  constructor(options: FinancialOperationOptions) {
    if (options.scope.trim().length === 0) {
      throw new Error('La operación financiera requiere un scope estable.');
    }
    this.scope = options.scope;
    this.keyStore = options.keyStore ?? defaultKeyStore;
  }

  get isSubmitting(): boolean {
    return this.submitting;
  }

  /** Clave vigente, solo para diagnóstico/tests. No se registra en logs. */
  peekKey(): string | undefined {
    return this.keyStore.peek(this.scope);
  }

  /**
   * Ejecuta la intención. `fingerprint` describe los datos que la definen:
   * si cambia, la intención es distinta y recibe otra clave.
   */
  async run<T>(
    fingerprint: string,
    submit: (idempotencyKey: string) => Promise<T>,
  ): Promise<FinancialOperationResult<T>> {
    if (this.submitting) {
      return { status: 'blocked' };
    }
    if (fingerprint.trim().length === 0) {
      throw new Error('La intención financiera requiere una huella no vacía.');
    }

    if (this.fingerprint !== fingerprint) {
      this.keyStore.rotate(this.scope);
      this.fingerprint = fingerprint;
    }
    const key = this.keyStore.acquire(this.scope);

    this.submitting = true;
    try {
      const value = await submit(key);
      // Confirmado: la próxima intención debe recibir una clave nueva.
      this.keyStore.release(this.scope);
      this.fingerprint = null;
      return { status: 'confirmed', value };
    } catch (cause) {
      const error = asApiError(cause);
      if (DEFINITIVE_REJECTIONS.has(error.kind)) {
        // El backend puede cachear 4xx: una clave nueva permite corregir y
        // reintentar sin recibir la misma respuesta obsoleta.
        this.keyStore.release(this.scope);
        this.fingerprint = null;
        return { status: 'rejected', error };
      }
      if (CANCELLED.has(error.kind)) {
        // Cancelación local: el servidor pudo haber recibido la solicitud.
        return { status: 'cancelled', error };
      }
      // timeout, network, 5xx, unexpected: resultado desconocido.
      return { status: 'uncertain', error };
    } finally {
      this.submitting = false;
    }
  }

  reset(): void {
    this.keyStore.release(this.scope);
    this.fingerprint = null;
    this.submitting = false;
  }
}
