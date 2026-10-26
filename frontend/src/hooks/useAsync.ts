import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/http';

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: ApiError };

export function toApiError(e: unknown): ApiError {
  return e instanceof ApiError ? e : new ApiError(500, 'Error inesperado.', 'unexpected');
}

/** Ejecuta `fn` al montar y cuando cambian `deps`; `reload` reintenta. */
export function useAsync<T>(fn: () => Promise<T>, deps: ReadonlyArray<unknown>) {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  const [nonce, setNonce] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let alive = true;
    setState({ status: 'loading' });
    fnRef.current().then(
      (data) => alive && setState({ status: 'success', data }),
      (e) => alive && setState({ status: 'error', error: toApiError(e) }),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { state, reload };
}

/** Para acciones (POST/PATCH): `run` devuelve el resultado o `undefined` si falló. */
export function useAction<A extends unknown[], R>(fn: (...args: A) => Promise<R>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const run = async (...args: A): Promise<R | undefined> => {
    setBusy(true);
    setError(null);
    try {
      return await fn(...args);
    } catch (e) {
      setError(toApiError(e));
      return undefined;
    } finally {
      setBusy(false);
    }
  };
  return { run, busy, error, clearError: () => setError(null) };
}
