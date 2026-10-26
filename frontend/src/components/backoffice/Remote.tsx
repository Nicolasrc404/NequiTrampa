import React from 'react';
import type { ApiResource } from '../../hooks/useApiResource';
import { ErrorState, SkeletonList } from './ui';

interface Props<T> {
  state: ApiResource<T>;
  resource: string;
  onBack?: () => void;
  skeletonRows?: number;
  children: (data: T) => React.ReactNode;
}

/** Cubre los 4 estados de UI: loading, error, (empty lo decide el hijo) y success. */
export function Remote<T>({ state, resource, onBack, skeletonRows, children }: Props<T>) {
  if (state.status === 'error' && state.error) {
    return <ErrorState error={state.error} resource={resource} onRetry={state.reload} onBack={onBack} />;
  }
  if (state.status !== 'success' || state.data === null) return <SkeletonList rows={skeletonRows} />;
  return <>{children(state.data)}</>;
}
