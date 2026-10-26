import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '../../../theme/colors';
import { asApiError, type ApiErrorKind } from '../../../services/http';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

const ICONS: Readonly<Record<ApiErrorKind, FeatherName>> = {
  bad_request: 'edit-3',
  unauthorized: 'lock',
  forbidden: 'slash',
  not_found: 'search',
  conflict: 'alert-circle',
  unprocessable: 'edit-3',
  rate_limited: 'clock',
  server_error: 'alert-triangle',
  unavailable: 'wifi-off',
  client_error: 'alert-circle',
  network: 'wifi-off',
  timeout: 'clock',
  aborted: 'x-circle',
  unexpected: 'alert-circle',
};

export interface ErrorStateProps {
  /** Cualquier error lanzado; se normaliza con `asApiError`. */
  readonly error: unknown;
  readonly onRetry?: () => void;
  readonly retryLabel?: string;
  readonly onSecondary?: () => void;
  readonly secondaryLabel?: string;
  /** Oculta el título para usarlo dentro de una tarjeta. */
  readonly compact?: boolean;
  readonly testID?: string;
}

/**
 * Estado de error reutilizable alineado con los diseños de Stitch.
 * No muestra detalles internos en 5xx: `ApiError.toUserMessage()` ya los filtra.
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  onRetry,
  retryLabel = 'Reintentar',
  onSecondary,
  secondaryLabel = 'Volver',
  compact = false,
  testID = 'error-state',
}) => {
  const apiError = asApiError(error);
  const message = apiError.toUserMessage();
  const showRetry = onRetry !== undefined && apiError.isRetryable;

  return (
    <View
      style={[styles.container, compact && styles.containerCompact]}
      testID={testID}
      accessibilityRole="alert"
    >
      <View style={styles.iconCircle}>
        <Feather name={ICONS[apiError.kind]} size={28} color={colors.magentaText} />
      </View>
      {!compact ? <Text style={styles.title}>{message.title}</Text> : null}
      <Text style={styles.body}>{message.message}</Text>

      <View style={styles.actions}>
        {showRetry ? (
          <Pressable
            onPress={onRetry}
            accessibilityRole="button"
            accessibilityLabel={retryLabel}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.primaryButtonText}>{retryLabel}</Text>
          </Pressable>
        ) : null}
        {onSecondary ? (
          <Pressable
            onPress={onSecondary}
            accessibilityRole="button"
            accessibilityLabel={secondaryLabel}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryButtonText}>{secondaryLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
    gap: 12,
    backgroundColor: colors.background,
  },
  containerCompact: {
    flex: 0,
    backgroundColor: 'transparent',
    paddingVertical: 20,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.stateIconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.stateTitle,
    textAlign: 'center',
  },
  body: {
    maxWidth: 320,
    fontSize: 15,
    lineHeight: 22,
    color: colors.stateBody,
    textAlign: 'center',
  },
  actions: {
    marginTop: 8,
    width: '100%',
    maxWidth: 320,
    gap: 10,
  },
  primaryButton: {
    backgroundColor: colors.magenta,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.stateBorder,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  secondaryButtonText: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
});

export default ErrorState;
