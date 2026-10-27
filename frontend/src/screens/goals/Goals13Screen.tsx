import React from 'react';
import colors from '../../theme/colors';
import GoalsStatusScreen from '../../components/goals/GoalsStatusScreen';

export interface Goals13ScreenProps {
  readonly onRetry?: () => void;
  /** `true` solo en modo demostración. */
  readonly demo?: boolean;
  /** Referencia de soporte (traceId) cuando exista. */
  readonly errorReference?: string | null;
}

export const Goals13Screen: React.FC<Goals13ScreenProps> = ({
  onRetry,
  demo = true,
  errorReference,
}) => {
  const description = errorReference
    ? `La información anterior de tu meta sigue guardada. Si vuelve a pasar, comparte la referencia ${errorReference}.`
    : 'La información anterior de tu meta sigue guardada. Es un problema de nuestro lado. Intenta de nuevo en unos minutos.';

  return (
    <GoalsStatusScreen
      icon="wifi"
      iconBackground={colors.goalsErrorCircleSoft}
      iconColor={colors.goalsErrorIconAlt}
      iconWrapperSize={80}
      iconSize={32}
      title="No pudimos guardar los cambios"
      titleSize={24}
      description={description}
      primaryLabel="Intentar nuevamente"
      onPrimary={onRetry}
      demoHint={demo ? 'Estado DEMO · sin conexión al backend' : undefined}
    />
  );
};

export default Goals13Screen;
