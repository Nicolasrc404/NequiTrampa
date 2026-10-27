import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';
import GoalsHeader from '../../components/goals/GoalsHeader';
import GoalFormField from '../../components/goals/GoalFormField';
import GoalsActionButtons from '../../components/goals/GoalsActionButtons';
import {
  DEMO_GOAL_CREATE_DRAFT,
  formatGoalAmount,
} from '../../data/demoGoals';
import type { CreateGoalInput } from '../../services/goalsService';

export interface Goals05ScreenProps {
  readonly onBack?: () => void;
  readonly onCreate?: () => void;
  readonly onCancel?: () => void;
  readonly onCreateInput?: (input: CreateGoalInput) => void;
  readonly demo?: boolean;
  readonly submitting?: boolean;
}

export const Goals05Screen: React.FC<Goals05ScreenProps> = ({
  onBack,
  onCreate,
  onCancel,
  onCreateInput,
  demo = true,
  submitting = false,
}) => {
  const [name, setName] = useState(demo ? DEMO_GOAL_CREATE_DRAFT.name : '');
  const [target, setTarget] = useState(demo ? String(DEMO_GOAL_CREATE_DRAFT.targetCents / 100) : '');
  const [targetDate, setTargetDate] = useState(demo ? '2027-06-30' : '');
  const targetCents = Math.round(Number(target.replace(/[^0-9]/g, '')) * 100);
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
            value={name}
            editable={!demo}
            onChangeText={setName}
            error
            errorBorderColor={colors.goalsErrorFormBorder}
            helper="Escribe un nombre de al menos 3 caracteres."
            helperError
            labelColor={colors.goalsFormLabel}
          />
          <GoalFormField
            label="Monto objetivo (COP)"
            value={demo ? formatGoalAmount(DEMO_GOAL_CREATE_DRAFT.targetCents) : target}
            editable={!demo}
            onChangeText={setTarget}
            keyboardType="numeric"
            error
            errorBorderColor={colors.goalsErrorFormBorder}
            helper="Ingresa un monto mayor a $ 0 COP."
            helperError
            labelColor={colors.goalsFormLabel}
          />
          <GoalFormField
            label="Fecha objetivo"
            value={demo ? DEMO_GOAL_CREATE_DRAFT.targetDateLabel : targetDate}
            editable={!demo}
            onChangeText={setTargetDate}
            helper="Elige una fecha futura para alcanzar tu meta."
            labelColor={colors.goalsFormLabel}
          />
        </View>

        {demo ? <Text style={styles.demoHint}>
          Meta DEMO · no se guardará en el servidor
        </Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <GoalsActionButtons
          primaryLabel={submitting ? 'Guardando…' : 'Crear meta'}
          onPrimary={onCreateInput
            ? () => onCreateInput({ name, targetCents, targetDate })
            : onCreate}
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
