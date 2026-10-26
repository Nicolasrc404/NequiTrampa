import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';

export interface SimulationBannerProps {
  /** Texto específico de la pantalla; si falta se usa el mensaje genérico. */
  readonly message?: string;
  readonly testID?: string;
}

const DEFAULT_MESSAGE =
  'Datos de demostración. No se ejecutó ninguna operación real ni se movió dinero.';

/**
 * Aviso obligatorio para cualquier pantalla que muestre resultados simulados.
 * Se renderiza solo cuando el modo DEMO está activo y la pantalla es de éxito.
 */
export const SimulationBanner: React.FC<SimulationBannerProps> = ({
  message = DEFAULT_MESSAGE,
  testID = 'simulation-banner',
}) => (
  <View style={styles.container} testID={testID} accessibilityRole="alert">
    <View style={styles.tag}>
      <Text style={styles.tagText}>SIMULACIÓN</Text>
    </View>
    <Text style={styles.message}>{message}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.simulationBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.simulationBorder,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tag: {
    backgroundColor: colors.simulationTagBg,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  tagText: {
    color: colors.simulationTagText,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  message: {
    flex: 1,
    color: colors.simulationText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
});

export default SimulationBanner;
