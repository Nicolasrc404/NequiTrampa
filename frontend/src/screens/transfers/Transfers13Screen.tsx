// ============================================================
// Transfers_13 — Algo salió mal (500)
// Fuente visual: Stitch screen 4d2b6ce6a7094cf786d6f00f638f26ff
// ============================================================
import React from 'react';
import colors from '../../theme/colors';
import TransferStatusScreen from '../../components/transfers/TransferStatusScreen';

export interface Transfers13ScreenProps {
  readonly onViewMovements?: () => void;
  readonly onRetry?: () => void;
  /**
   * `true` cuando la solicitud quedó sin confirmar (timeout/red/5xx).
   * En ese caso NO se afirma que el dinero no se descontó.
   */
  readonly uncertain?: boolean;
  /** `false` cuando los datos provienen de la API real. */
  readonly demoMode?: boolean;
}

export const Transfers13Screen: React.FC<Transfers13ScreenProps> = ({
  onViewMovements,
  onRetry,
  uncertain = false,
  demoMode = true,
}) => {
  return (
    <TransferStatusScreen
      icon="alert-triangle"
      iconBackground={colors.transfersDangerBg}
      iconColor={colors.transfersDangerIcon}
      badge={uncertain ? 'SIN CONFIRMAR' : '500'}
      badgeBackground={colors.transfersDangerBg}
      badgeColor={colors.transfersError}
      title={uncertain ? 'No pudimos confirmar el resultado' : 'Algo salió mal'}
      description={
        uncertain
          ? 'La solicitud pudo haberse procesado. Revisa tus movimientos antes de volver a intentar: no se hará un segundo cobro automático.'
          : 'No pudimos completar la transferencia. No se descontó dinero.'
      }
      primaryLabel="Ver movimientos"
      onPrimary={onViewMovements}
      secondaryLabel="Reintentar"
      onSecondary={onRetry}
      demoHint={
        demoMode
          ? 'Estado DEMO · verifica el resultado antes de reintentar'
          : undefined
      }
    />
  );
};

export default Transfers13Screen;
