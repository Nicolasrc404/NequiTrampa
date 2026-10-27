import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';
import GoalsHeader from '../../components/goals/GoalsHeader';
import GoalFormField from '../../components/goals/GoalFormField';
import GoalsActionButtons from '../../components/goals/GoalsActionButtons';
import LoadingState from '../../components/common/states/LoadingState';
import {
  DEMO_GOAL_EDIT_DRAFT,
  formatGoalAmount,
  formatGoalSignedAmount,
} from '../../data/demoGoals';
import {
  MAX_GOAL_CENTS,
  MAX_GOAL_NAME_LENGTH,
  MIN_GOAL_NAME_LENGTH,
} from '../../services/goalsService';
import { formatLongDateLabel } from '../../utils/datetime';
import { parseCopInput } from '../../utils/money';
import type { GoalItem } from '../../types/goals';
import { isValidFutureDate, type GoalFormSubmit } from './Goals05Screen';

export interface Goals10ScreenProps {
  readonly onBack?: () => void;
  readonly onSave?: (input: GoalFormSubmit) => void;
  readonly onCancel?: () => void;
  /** Meta seleccionada en la lista. */
  readonly goal?: GoalItem;
  /** Bloquea el formulario mientras el servidor confirma. */
  readonly submitting?: boolean;
  /** `true` solo en modo demostración. */
  readonly demo?: boolean;
  readonly initialName?: string;
  readonly initialAmountText?: string;
  /** Fecha inicial en formato `AAAA-MM-DD`. */
  readonly initialDate?: string;
  readonly loading?: boolean;
}

export const Goals10Screen: React.FC<Goals10ScreenProps> = ({
  onBack,
  onSave,
  onCancel,
  goal,
  submitting = false,
  demo = true,
  initialName,
  initialAmountText,
  initialDate,
  loading = false,
}) => {
  const [name, setName] = useState(
    initialName ??
      goal?.name ??
      (demo ? DEMO_GOAL_EDIT_DRAFT.name : ''),
  );
  const [amountText, setAmountText] = useState(
    initialAmountText ??
      (goal
        ? formatGoalAmount(goal.targetCents)
        : demo
          ? formatGoalSignedAmount(DEMO_GOAL_EDIT_DRAFT.targetCents)
          : ''),
  );
  const [dateText, setDateText] = useState(
    initialDate ??
      goal?.targetDate ??
      (demo ? '2027-07-31' : ''),
  );
  // El DEMO reproduce el estado de validación original de Stitch.
  const [touched, setTouched] = useState(demo);

  if (loading) {
    return (
      <LoadingState
        message="Cargando meta…"
        hint="Consultando el progreso confirmado."
      />
    );
  }

  const trimmedName = name.trim().replace(/\s+/g, ' ');
  const nameValid =
    trimmedName.length >= MIN_GOAL_NAME_LENGTH &&
    trimmedName.length <= MAX_GOAL_NAME_LENGTH;

  const parsedAmount = parseCopInput(amountText);
  const amountValid =
    parsedAmount !== null && parsedAmount >= 1 && parsedAmount <= MAX_GOAL_CENTS;

  const dateValid = isValidFutureDate(dateText);
  const hasErrors = !nameValid || !amountValid || !dateValid;
  const showErrors = touched && hasErrors;

  const handleSubmit = () => {
    setTouched(true);
    if (submitting || !nameValid || !amountValid || !dateValid) return;
    if (parsedAmount === null) return;
    onSave?.({
      name: trimmedName,
      targetCents: parsedAmount,
      targetDate: dateText.trim(),
    });
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <GoalsHeader title="Editar meta" onBack={onBack} titleSize={24} />

        {showErrors ? (
          <View style={styles.alert}>
            <Text style={styles.alertText}>
              Revisa el campo marcado para poder guardar.
            </Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <GoalFormField
            label="Nombre de la meta"
            value={name}
            placeholder="Ej. Viaje a Cartagena"
            onChangeText={setName}
            readOnly={false}
            maxLength={MAX_GOAL_NAME_LENGTH}
            error={showErrors && !nameValid}
            errorBorderWidth={2}
            helper={
              showErrors && !nameValid
                ? `Escribe un nombre de al menos ${MIN_GOAL_NAME_LENGTH} caracteres.`
                : 'El nombre que verás en Mis metas.'
            }
            helperError={showErrors && !nameValid}
            labelSize={15}
            labelColor={colors.goalsEditLabel}
          />
          <GoalFormField
            label="Monto objetivo (COP)"
            value={amountText}
            placeholder="$ 0"
            onChangeText={setAmountText}
            readOnly={false}
            keyboardType="numeric"
            error={showErrors && !amountValid}
            errorBorderWidth={2}
            helper={
              showErrors && !amountValid
                ? 'Ingresa un monto mayor a $ 0 COP.'
                : 'Cuánto quieres reunir en total.'
            }
            helperError={showErrors && !amountValid}
            helperColor={colors.goalsError}
            labelSize={15}
            labelColor={colors.goalsEditLabel}
          />
          <GoalFormField
            label="Fecha objetivo (AAAA-MM-DD)"
            value={dateText}
            placeholder="2027-07-31"
            onChangeText={setDateText}
            readOnly={false}
            maxLength={10}
            error={showErrors && !dateValid}
            errorBorderWidth={2}
            helper={
              showErrors && !dateValid
                ? 'Escribe una fecha futura con formato AAAA-MM-DD.'
                : dateValid
                  ? `Fecha: ${formatLongDateLabel(dateText.trim())}`
                  : 'Elige una fecha futura para alcanzar tu meta.'
            }
            helperError={showErrors && !dateValid}
            labelSize={15}
            labelColor={colors.goalsEditLabel}
          />
        </View>

        <Text style={styles.demoHint}>
          {demo
            ? 'Edición DEMO · no modifica metas reales'
            : 'Solo se actualizan los campos que cambies'}
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <GoalsActionButtons
          primaryLabel={submitting ? 'Guardando…' : 'Guardar cambios'}
          onPrimary={submitting ? undefined : handleSubmit}
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
    marginTop: 24,
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
