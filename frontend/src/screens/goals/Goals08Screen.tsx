import React from 'react';
import colors from '../../theme/colors';
import GoalsStatusScreen from '../../components/goals/GoalsStatusScreen';

export interface Goals08ScreenProps {
  readonly onRetry?: () => void;
  /** `true` solo en modo demostración. */
  readonly demo?: boolean;
  /** Referencia de soporte (traceId) cuando exista. */
  readonly errorReference?: string | null;
}

export const Goals08Screen: React.FC<Goals08ScreenProps> = ({
  onRetry,
  demo = true,
  errorReference,
}) => {
  const description = errorReference
    ? `Es un problema de nuestro lado, no tuyo. No se creó una meta duplicada. Si vuelve a pasar, comparte la referencia ${errorReference}.`
    : 'Es un problema de nuestro lado, no tuyo. No se creó una meta duplicada. Intenta de nuevo en unos minutos.';

  return (
    <GoalsStatusScreen
      icon="wifi"
      iconBackground={colors.goalsErrorCircleAlt}
      iconColor={colors.goalsMagentaError}
      iconWrapperSize={96}
      iconSize={40}
      title="No pudimos crear tu meta"
      description={description}
      primaryLabel="Intentar nuevamente"
      onPrimary={onRetry}
      demoHint={demo ? 'Estado DEMO · sin conexión al backend' : undefined}
    />
  );
};

export default Goals08Screen;
