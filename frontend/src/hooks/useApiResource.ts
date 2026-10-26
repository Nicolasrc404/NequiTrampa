// ============================================================
// Hook base de lectura de API
// ============================================================
// Centraliza loading / success / error, cancelación al desmontar y descarte de
// respuestas tardías (por ejemplo después de cerrar sesión).
//
// No interpreta los datos: cada dominio entrega su view model ya validado.

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, asApiError } from '../services/http';

export type ApiResourceStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ApiResource<T> {
  readonly status: ApiResourceStatus;
  readonly data: T | null;
  readonly error: ApiError | null;
  readonly reload: () => void;
}

export type ApiLoader<T> = (signal: AbortSignal) => Promise<T>;

interface ResourceState<T> {
  readonly status: ApiResourceStatus;
  readonly data: T | null;
  readonly error: ApiError | null;
}

const IDLE = { status: 'idle', data: null, error: null } as const;

/**
 * @param loader `null` desactiva la carga (DEMO, sin sesión o recurso ausente).
 * @param deps cambia cuando debe repetirse la solicitud.
 */
export function useApiResource<T>(
  loader: ApiLoader<T> | null,
  deps: readonly unknown[],
): ApiResource<T> {
  const [state, setState] = useState<ResourceState<T>>(IDLE);
  const [reloadToken, setReloadToken] = useState(0);
  const loaderRef = useRef<ApiLoader<T> | null>(loader);
  loaderRef.current = loader;

  const reload = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    const current = loaderRef.current;
    if (!current) {
      setState(IDLE);
      return;
    }

    const controller = new AbortController();
    let active = true;
    setState((previous) => ({
      status: 'loading',
      data: previous.data,
      error: null,
    }));

    void current(controller.signal)
      .then((data) => {
        if (!active) return;
        setState({ status: 'success', data, error: null });
      })
      .catch((cause: unknown) => {
        if (!active) return;
        const error = asApiError(cause);
        // Una cancelación deliberada no es un error de usuario.
        if (error.kind === 'aborted') return;
        setState({ status: 'error', data: null, error });
      });

    return () => {
      active = false;
      controller.abort();
    };
    // `deps` lo controla el hook de dominio; `reloadToken` fuerza reintentos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadToken, ...deps]);

  return {
    status: state.status,
    data: state.data,
    error: state.error,
    reload,
  };
}
