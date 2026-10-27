import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';
import GoalsHeader from '../../components/goals/GoalsHeader';
import GoalFormField from '../../components/goals/GoalFormField';
import GoalsActionButtons from '../../components/goals/GoalsActionButtons';
import {
  DEMO_GOAL_EDIT_DRAFT,
  formatGoalSignedAmount,
} from '../../data/demoGoals';
import type { GoalItem } from '../../types/goals';
import type { UpdateGoalInput } from '../../services/goalsService';
import LoadingState from '../../components/common/states/LoadingState';

export interface Goals10ScreenProps {
  readonly onBack?: () => void;
  readonly onSave?: (input: UpdateGoalInput) => void;
  readonly onCancel?: () => void;
  readonly goal?: GoalItem;
  readonly loading?: boolean;
  readonly demo?: boolean;
  readonly submitting?: boolean;
}

export const Goals10Screen: React.FC<Goals10ScreenProps> = ({
  onBack,
  onSave,
  onCancel,
  goal,
  loading = false,
  demo = true,
  submitting = false,
}) => {
  const [name, setName] = useState(goal?.name ?? DEMO_GOAL_EDIT_DRAFT.name);
  const [target, setTarget] = useState(
    demo ? String(DEMO_GOAL_EDIT_DRAFT.targetCents / 100) : String((goal?.targetCents ?? 0) / 100),
  );
  const [date, setDate] = useState(goal?.targetDate ?? '');
  if (loading) {
    return <LoadingState message="Cargando meta…" hint="Consultando el progreso confirmado." />;
  }
  const targetCents = Math.round(Number(target.replace(/[^0-9]/g, '')) * 100);
  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <GoalsHeader title="Editar meta" onBack={onBack} titleSize={24} />

        {demo ? <View style={styles.alert}>
          <Text style={styles.alertText}>Revisa el campo marcado para poder guardar.</Text>
        </View> : null}

        <View style={styles.form}>
          <GoalFormField
            label="Nombre de la meta"
            value={name}
            editable={!demo}
            onChangeText={setName}
            helper="El nombre que verás en Mis metas."
            labelSize={15}
            labelColor={colors.goalsEditLabel}
          />
          <GoalFormField
            label="Monto objetivo (COP)"
            value={demo ? formatGoalSignedAmount(DEMO_GOAL_EDIT_DRAFT.targetCents) : target}
            editable={!demo}
            onChangeText={setTarget}
            keyboardType="numeric"
            error={demo}
            errorBorderWidth={demo ? 2 : undefined}
            helper={demo ? 'Ingresa un monto mayor a $ 0 COP.' : 'Monto objetivo confirmado por el servidor.'}
            helperError={demo}
            helperColor={demo ? colors.goalsError : undefined}
            labelSize={15}
            labelColor={colors.goalsEditLabel}
          />
          <GoalFormField
            label="Fecha objetivo"
            value={demo ? DEMO_GOAL_EDIT_DRAFT.targetDateLabel : date}
            editable={!demo}
            onChangeText={setDate}
            helper="Elige una fecha futura para alcanzar tu meta."
            labelSize={15}
            labelColor={colors.goalsEditLabel}
          />
        </View>

        {demo ? <Text style={styles.demoHint}>
          Edición DEMO · no modifica metas reales
        </Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <GoalsActionButtons
          primaryLabel={submitting ? 'Guardando…' : 'Guardar cambios'}
          onPrimary={() => onSave?.({ name, targetCents, targetDate: date })}
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
