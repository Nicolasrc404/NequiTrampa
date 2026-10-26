import React from 'react';
import { AsyncState } from '../../hooks/useAsync';
import { ErrorState, SkeletonList } from './ui';

interface Props<T> {
  state: AsyncState<T>;
  resource: string;
  onRetry: () => void;
  onBack?: () => void;
  skeletonRows?: number;
  children: (data: T) => React.ReactNode;
}

/** Cubre los 4 estados de UI: loading, error, (empty lo decide el hijo) y success. */
export function Remote<T>({ state, resource, onRetry, onBack, skeletonRows, children }: Props<T>) {
  if (state.status === 'loading') return <SkeletonList rows={skeletonRows} />;
  if (state.status === 'error') return <ErrorState error={state.error} resource={resource} onRetry={onRetry} onBack={onBack} />;
  return <>{children(state.data)}</>;
}
