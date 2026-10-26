// ============================================================
// Cash_06 — Error de validación (400)
// Fuente visual: Stitch screen f3104679e48147ea8dde8219d2b7d049
// ============================================================
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';
import TransfersHeader from '../../components/transfers/TransfersHeader';
import CashFormField from '../../components/cash/CashFormField';
import CashActionButtons from '../../components/cash/CashActionButtons';

export interface Cash06ScreenProps {
  readonly onBack?: () => void;
  readonly onSave?: () => void;
  readonly onCancel?: () => void;
}

export const Cash06Screen: React.FC<Cash06ScreenProps> = ({
  onBack,
  onSave,
  onCancel,
}) => {
  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TransfersHeader
            title="Registrar gasto"
            onBack={onBack}
            titleSize={26}
          />
        </View>

        <View style={styles.banner}>
          <Text style={styles.bannerText}>Revisa los datos ingresados (400).</Text>
        </View>

        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Monto del gasto</Text>
          <Text style={styles.amount}>$ 0</Text>
          <Text style={styles.amountNote}>Ingresa un monto mayor a cero</Text>
        </View>

        <View style={styles.form}>
          <CashFormField
            label="Categoría"
            value=""
            placeholder="Elige una categoría"
            readOnly
            error
            helper="Este campo es obligatorio"
            height={56}
          />
          <CashFormField
            label="Fecha"
            value="8 oct 2026"
            readOnly
            height={56}
          />
        </View>

        <Text style={styles.demoHint}>
          Validación DEMO · el backend conserva la validación definitiva
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <CashActionButtons
          primaryLabel="Guardar gasto"
          onPrimary={onSave}
          secondaryLabel="Cancelar"
          onSecondary={onCancel}
          secondaryBorderColor={colors.cashBorderPurple}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.cashBgError,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
  },
  header: {
    marginBottom: 24,
  },
  banner: {
    backgroundColor: colors.cashErrorBg,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginBottom: 20,
  },
  bannerText: {
    fontSize: 15,
    color: colors.cashErrorText,
  },
  amountCard: {
    backgroundColor: colors.cashWhite,
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: colors.cashShadow,
    shadowOpacity: 0.02,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  amountLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.cashNavy,
    marginBottom: 4,
  },
  amount: {
    fontSize: 46,
    lineHeight: 52,
    fontWeight: '800',
    color: colors.cashErrorText,
    letterSpacing: -1,
    marginVertical: 4,
  },
  amountNote: {
    fontSize: 14.5,
    color: colors.cashMutedStrong,
  },
  form: {
    gap: 16,
  },
  demoHint: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: colors.cashSubtle,
    textTransform: 'uppercase',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
  },
});

export default Cash06Screen;
