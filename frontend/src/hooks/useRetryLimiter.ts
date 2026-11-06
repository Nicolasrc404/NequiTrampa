import { useCallback, useRef } from 'react';

const DEFAULT_MAX_ATTEMPTS = 3;

export interface RetryLimiter {
  /** Ejecuta `action` si quedan intentos disponibles; si no, llama a `onExceeded`. */
  readonly attempt: (action: () => void) => void;
  /** Reinicia el contador. Debe llamarse cuando el recurso vuelve a 'success'. */
  readonly reset: () => void;
}

/**
 * Limita reintentos manuales consecutivos de una misma operación (p. ej. el
 * botón "Reintentar" de una pantalla de error). Tras `maxAttempts` intentos
 * sin éxito, deja de reintentar la acción y ejecuta `onExceeded` en su lugar
 * (volver al inicio, contactar soporte) para no dejar al usuario atrapado en
 * un ciclo de error indefinido.
 */
export function useRetryLimiter(
  onExceeded: () => void,
  maxAttempts: number = DEFAULT_MAX_ATTEMPTS,
): RetryLimiter {
  const attempts = useRef(0);

  const attempt = useCallback(
    (action: () => void) => {
      if (attempts.current >= maxAttempts) {
        attempts.current = 0;
        onExceeded();
        return;
      }
      attempts.current += 1;
      action();
    },
    [maxAttempts, onExceeded],
  );

  const reset = useCallback(() => {
    attempts.current = 0;
  }, []);

  return { attempt, reset };
}
