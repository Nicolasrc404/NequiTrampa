// ============================================================
// Transfers_03 — Enviando tu dinero
// Fuente visual: Stitch screen 3f7e4ba535b249dd88e5207e5a2b0e4a
// ============================================================
import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '../../theme/colors';

export interface Transfers03ScreenProps {
  readonly onShowDemoResult?: () => void;
}
export const Transfers03Screen: React.FC<Transfers03ScreenProps> = ({
  onShowDemoResult,
}) => {
  return (
    <View style={styles.root}>
      <View style={styles.body}>
        <View style={styles.iconCircle}>
          <Feather name="clock" size={40} color={colors.transfersAvatarText} />
        </View>

        <Text style={styles.title}>Enviando tu dinero</Text>
        <Text style={styles.description}>
          No cierres la app. Esto toma unos segundos.
        </Text>
        <Text style={styles.note}>
          Si algo falla puedes reintentar: no se cobra dos veces.
        </Text>
      </View>

      {onShowDemoResult ? (
        <TouchableOpacity
          style={styles.demoButton}
          activeOpacity={0.7}
          onPress={onShowDemoResult}
          accessibilityRole="button"
          accessibilityLabel="Ver resultado DEMO"
        >
          <Text style={styles.demoButtonText}>Ver resultado DEMO (201)</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.transfersBg,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 96,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.transfersAvatarBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 27,
    fontWeight: '700',
    color: colors.transfersDark,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 14,
  },
  description: {
    fontSize: 17,
    lineHeight: 24,
    color: colors.transfersMuted,
    textAlign: 'center',
  },
  note: {
    maxWidth: 310,
    fontSize: 14,
    lineHeight: 21,
    color: colors.transfersMuted,
    textAlign: 'center',
    marginTop: 14,
  },
  demoButton: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 32,
  },
  demoButtonText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: colors.transfersNavInactive,
    textTransform: 'uppercase',
  },
});

export default Transfers03Screen;
