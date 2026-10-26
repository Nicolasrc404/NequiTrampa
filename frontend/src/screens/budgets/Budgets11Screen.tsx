// ============================================================
// Budgets_11 — Revisa los campos marcados (422)
// Fuente visual: Stitch screen a30d60e1b0d446d68a8c8bc2029a0a7e
// ============================================================
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';
import BudgetsHeader from '../../components/budgets/BudgetsHeader';
import BudgetFormField from '../../components/budgets/BudgetFormField';
import BudgetsActionButtons from '../../components/budgets/BudgetsActionButtons';
import { DEMO_BUDGET_CREATE_DRAFT } from '../../data/demoBudgets';

export interface Budgets11ScreenProps {
  readonly onBack?: () => void;
  readonly onSubmit?: () => void;
  readonly onCancel?: () => void;
}

export const Budgets11Screen: React.FC<Budgets11ScreenProps> = ({
  onBack,
  onSubmit,
  onCancel,
}) => {
  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <BudgetsHeader
          title="Crear presupuesto"
          onBack={onBack}
          titleSize={24}
        />

        <View style={styles.banner}>
          <Text style={styles.bannerText}>Revisa los campos marcados (422).</Text>
        </View>

        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Límite mensual</Text>
          <Text style={styles.amount}>$ 0</Text>
          <Text style={styles.amountError}>El límite debe ser mayor a cero</Text>
        </View>

        <View style={styles.form}>
          <BudgetFormField
            label="Categoría"
            value=""
            placeholder="Elige una categoría"
            error
            helper="Este campo es obligatorio"
          />
          <BudgetFormField
            label="Periodo"
            value={DEMO_BUDGET_CREATE_DRAFT.period}
          />
        </View>

        <Text style={styles.demoHint}>
          Validación DEMO · el backend conserva la validación definitiva
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <BudgetsActionButtons
          primaryLabel="Crear presupuesto"
          onPrimary={onSubmit}
          secondaryLabel="Cancelar"
          onSecondary={onCancel}
          primaryBackground={colors.cashMagenta}
          secondaryBorderColor={colors.budgetsBorderPurple}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.budgetsBg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 20,
  },
  banner: {
    marginTop: 22,
    marginBottom: 20,
    backgroundColor: colors.budgetsErrorBg,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  bannerText: {
    fontSize: 15,
    lineHeight: 20,
    color: colors.budgetsErrorText,
  },
  amountCard: {
    backgroundColor: colors.budgetsWhite,
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: colors.budgetsShadow,
    shadowOpacity: 0.03,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  amountLabel: {
    fontSize: 14,
    color: colors.budgetsMuted,
    marginBottom: 4,
  },
  amount: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '800',
    color: colors.budgetsRedAlt,
    letterSpacing: -0.8,
    marginVertical: 2,
  },
  amountError: {
    marginTop: 4,
    fontSize: 12,
    color: colors.budgetsRedAlt,
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
    color: colors.budgetsMuted,
    textTransform: 'uppercase',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
  },
});

export default Budgets11Screen;
