// ============================================================
// Beneficiaries_02 — Sin beneficiarios (Empty State)
// Fuente visual: Stitch screen 63a67cf399ae460e998f80d9374f7706
// ============================================================
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import colors from '../../theme/colors';

interface Beneficiaries02ScreenProps {
  onBack?: () => void;
  onAddBeneficiary?: () => void;
}

export const Beneficiaries02Screen: React.FC<Beneficiaries02ScreenProps> = ({
  onBack,
  onAddBeneficiary,
}) => {
  return (
    <View style={styles.root}>
      {/* TopBar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.7}
            onPress={onBack}
            accessibilityLabel="Volver"
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Beneficiarios</Text>
        </View>
        <TouchableOpacity activeOpacity={0.7} onPress={onAddBeneficiary}>
          <Text style={styles.addLink}>Agregar</Text>
        </TouchableOpacity>
      </View>

      {/* Empty state body */}
      <View style={styles.body}>
        {/* Illustration circle */}
        <View style={styles.illustrationCircle}>
          <View style={styles.illustrationInner}>
            {/* Person icon SVG-like with Views */}
            <View style={styles.personHead} />
            <View style={styles.personBody} />
          </View>
          {/* Plus badge */}
          <View style={styles.plusBadge}>
            <Text style={styles.plusText}>+</Text>
          </View>
        </View>

        <Text style={styles.emptyTitle}>Aún no tienes beneficiarios</Text>
        <Text style={styles.emptySubtitle}>
          Agrega personas de confianza para enviarles dinero rápidamente sin
          necesidad de buscar su código cada vez.
        </Text>

        <TouchableOpacity
          style={styles.ctaButton}
          activeOpacity={0.85}
          onPress={onAddBeneficiary}
          accessibilityLabel="Agregar mi primer beneficiario"
        >
          <Text style={styles.ctaText}>Agregar mi primer beneficiario</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F4FB',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 20,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  backIcon: {
    fontSize: 28,
    color: '#2b2b40',
    lineHeight: 32,
    marginTop: -2,
    fontWeight: '300',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111126',
    letterSpacing: -0.3,
  },
  addLink: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.magenta,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingBottom: 60,
  },
  illustrationCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#EDEAF8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  illustrationInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  personHead: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#9B8EC4',
    marginBottom: 4,
  },
  personBody: {
    width: 44,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#9B8EC4',
  },
  plusBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.magenta,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#EDEAF8',
  },
  plusText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111126',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6E6D82',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 36,
  },
  ctaButton: {
    backgroundColor: colors.magenta,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignSelf: 'stretch',
    alignItems: 'center',
    shadowColor: colors.magenta,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  ctaText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default Beneficiaries02Screen;
