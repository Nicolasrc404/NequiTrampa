import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import colors from '../../../theme/colors';

export interface LoadingStateProps {
  readonly message?: string;
  readonly hint?: string;
  readonly testID?: string;
}

/** Estado de carga reutilizable para cualquier vista que consuma la API. */
export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Cargando…',
  hint,
  testID = 'loading-state',
}) => (
  <View
    style={styles.container}
    testID={testID}
    accessibilityRole="progressbar"
    accessibilityLabel={message}
  >
    <ActivityIndicator size="large" color={colors.magenta} />
    <Text style={styles.message}>{message}</Text>
    {hint ? <Text style={styles.hint}>{hint}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
    gap: 12,
  },
  message: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.stateTitle,
    textAlign: 'center',
  },
  hint: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.stateBody,
    textAlign: 'center',
  },
});

export default LoadingState;
