import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';
import GoalsHeader from '../../components/goals/GoalsHeader';
import GoalFormField from '../../components/goals/GoalFormField';
import GoalsActionButtons from '../../components/goals/GoalsActionButtons';
import {
  DEMO_GOAL_CREATE_DRAFT,
  formatGoalAmount,
} from '../../data/demoGoals';

export interface Goals05ScreenProps {
  readonly onBack?: () => void;
  readonly onCreate?: () => void;
  readonly onCancel?: () => void;
}

export const Goals05Screen: React.FC<Goals05ScreenProps> = ({
  onBack,
  onCreate,
  onCancel,
}) => {
  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <GoalsHeader title="Crear meta" onBack={onBack} titleSize={26} />

        <View style={styles.alert}>
          <Text style={styles.alertTitle}>Revisa algunos datos</Text>
          <Text style={styles.alertText}>
            Corrige los campos marcados para crear tu meta.
          </Text>
        </View>

        <View style={styles.form}>
          <GoalFormField
            label="Nombre de la meta"
            value={DEMO_GOAL_CREATE_DRAFT.name}
            error
            errorBorderColor={colors.goalsErrorFormBorder}
            helper="Escribe un nombre de al menos 3 caracteres."
            helperError
            labelColor={colors.goalsFormLabel}
          />
          <GoalFormField
            label="Monto objetivo (COP)"
            value={formatGoalAmount(DEMO_GOAL_CREATE_DRAFT.targetCents)}
            error
            errorBorderColor={colors.goalsErrorFormBorder}
            helper="Ingresa un monto mayor a $ 0 COP."
            helperError
            labelColor={colors.goalsFormLabel}
          />
          <GoalFormField
            label="Fecha objetivo"
            value={DEMO_GOAL_CREATE_DRAFT.targetDateLabel}
            helper="Elige una fecha futura para alcanzar tu meta."
            labelColor={colors.goalsFormLabel}
          />
        </View>

        <Text style={styles.demoHint}>
          Meta DEMO · no se guardará en el servidor
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <GoalsActionButtons
          primaryLabel="Crear meta"
          onPrimary={onCreate}
          secondaryLabel="Cancelar"
          onSecondary={onCancel}
          primaryBackground={colors.goalsMagentaForm}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.goalsBg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
  },
  alert: {
    marginTop: 24,
    marginBottom: 24,
    borderRadius: 16,
    backgroundColor: colors.goalsErrorSoftBg,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  alertTitle: {
    marginBottom: 2,
    fontSize: 15,
    fontWeight: '600',
    color: colors.goalsErrorSoftTitle,
  },
  alertText: {
    fontSize: 13.5,
    lineHeight: 18,
    color: colors.goalsErrorSoftText,
  },
  form: {
    gap: 20,
  },
  demoHint: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: colors.goalsMuted,
    textTransform: 'uppercase',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
  },
});

export default Goals05Screen;
