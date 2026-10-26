import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';
import GoalsHeader from '../../components/goals/GoalsHeader';
import GoalFormField from '../../components/goals/GoalFormField';
import GoalsActionButtons from '../../components/goals/GoalsActionButtons';
import {
  DEMO_GOAL_EDIT_DRAFT,
  formatGoalSignedAmount,
} from '../../data/demoGoals';

export interface Goals10ScreenProps {
  readonly onBack?: () => void;
  readonly onSave?: () => void;
  readonly onCancel?: () => void;
}

export const Goals10Screen: React.FC<Goals10ScreenProps> = ({
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
        <GoalsHeader title="Editar meta" onBack={onBack} titleSize={24} />

        <View style={styles.alert}>
          <Text style={styles.alertText}>
            Revisa el campo marcado para poder guardar.
          </Text>
        </View>

        <View style={styles.form}>
          <GoalFormField
            label="Nombre de la meta"
            value={DEMO_GOAL_EDIT_DRAFT.name}
            helper="El nombre que verás en Mis metas."
            labelSize={15}
            labelColor={colors.goalsEditLabel}
          />
          <GoalFormField
            label="Monto objetivo (COP)"
            value={formatGoalSignedAmount(DEMO_GOAL_EDIT_DRAFT.targetCents)}
            error
            errorBorderWidth={2}
            helper="Ingresa un monto mayor a $ 0 COP."
            helperError
            helperColor={colors.goalsError}
            labelSize={15}
            labelColor={colors.goalsEditLabel}
          />
          <GoalFormField
            label="Fecha objetivo"
            value={DEMO_GOAL_EDIT_DRAFT.targetDateLabel}
            helper="Elige una fecha futura para alcanzar tu meta."
            labelSize={15}
            labelColor={colors.goalsEditLabel}
          />
        </View>

        <Text style={styles.demoHint}>
          Edición DEMO · no modifica metas reales
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <GoalsActionButtons
          primaryLabel="Guardar cambios"
          onPrimary={onSave}
          secondaryLabel="Cancelar"
          onSecondary={onCancel}
          primaryBackground={colors.goalsMagentaEdit}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.goalsBgForm,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 20,
  },
  alert: {
    marginTop: 24,
    marginBottom: 24,
    borderRadius: 16,
    backgroundColor: colors.goalsEditAlertBg,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  alertText: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.goalsEditAlertText,
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

export default Goals10Screen;
