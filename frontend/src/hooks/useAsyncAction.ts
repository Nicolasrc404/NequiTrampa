import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, asApiError } from '../services/http';

export type AsyncActionStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UseAsyncActionOptions<TResult> {
  readonly onSuccess?: (result: TResult) => void;
  readonly onError?: (error: ApiError) => void;
}

export interface UseAsyncActionResult<TArgs extends unknown[], TResult> {
  readonly status: AsyncActionStatus;
  readonly error: ApiError | null;
  readonly data: TResult | null;
  /** `true` mientras hay una ejecución en curso (bloquea doble envío). */
  readonly isSubmitting: boolean;
  /** Ejecuta la acción; devuelve `null` si se bloqueó o falló. */
  execute: (...args: TArgs) => Promise<TResult | null>;
  /** Reintenta con los últimos argumentos y la misma clave de idempotencia del llamador. */
  retry: () => Promise<TResult | null>;
  reset: () => void;
}

/**
 * Ejecuta una acción asíncrona con:
 *  - bloqueo síncrono de doble envío (ref, no estado: evita la carrera entre taps),
 *  - estado de carga/error tipado,
 *  - reintento seguro con los mismos argumentos,
 *  - descarte de resultados si el componente se desmonta.
 *
 * No genera claves de idempotencia: el llamador debe pasarlas como argumento
 * para que un reintento reutilice exactamente la misma intención.
 */
export function useAsyncAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
  options: UseAsyncActionOptions<TResult> = {},
): UseAsyncActionResult<TArgs, TResult> {
  const [status, setStatus] = useState<AsyncActionStatus>('idle');
  const [error, setError] = useState<ApiError | null>(null);
  const [data, setData] = useState<TResult | null>(null);

  const inFlight = useRef(false);
  const mounted = useRef(true);
  const lastArgs = useRef<TArgs | null>(null);
  const actionRef = useRef(action);
  const optionsRef = useRef(options);

  actionRef.current = action;
  optionsRef.current = options;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const execute = useCallback(async (...args: TArgs): Promise<TResult | null> => {
    if (inFlight.current) return null;
    inFlight.current = true;
    lastArgs.current = args;
    setStatus('loading');
    setError(null);

    try {
      const result = await actionRef.current(...args);
      if (!mounted.current) return result;
      setData(result);
      setStatus('success');
      optionsRef.current.onSuccess?.(result);
      return result;
    } catch (unknownError) {
      const apiError = asApiError(unknownError);
      if (!mounted.current) return null;
      setError(apiError);
      setStatus('error');
      optionsRef.current.onError?.(apiError);
      return null;
    } finally {
      inFlight.current = false;
    }
  }, []);

  const retry = useCallback(async (): Promise<TResult | null> => {
    const args = lastArgs.current;
    if (!args) return null;
    return execute(...args);
  }, [execute]);

  const reset = useCallback(() => {
    inFlight.current = false;
    lastArgs.current = null;
    setStatus('idle');
    setError(null);
    setData(null);
  }, []);

  return {
    status,
    error,
    data,
    isSubmitting: status === 'loading',
    execute,
    retry,
    reset,
  };
}

export default useAsyncAction;
