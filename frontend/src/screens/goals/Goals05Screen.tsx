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
import {
  MAX_GOAL_CENTS,
  MAX_GOAL_NAME_LENGTH,
  MIN_GOAL_NAME_LENGTH,
} from '../../services/goalsService';
import { bogotaDayKey, formatLongDateLabel } from '../../utils/datetime';
import { parseCopInput } from '../../utils/money';

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface GoalFormSubmit {
  readonly name: string;
  readonly targetCents: number;
  /** Fecha `AAAA-MM-DD` que se envía al backend. */
  readonly targetDate: string;
}

/** Valida una fecha `AAAA-MM-DD` real y posterior a hoy (Colombia). */
export function isValidFutureDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value.trim());
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return false;
  }
  const today = bogotaDayKey(new Date().toISOString());
  if (!today) return false;
  return value.trim() > today;
}

export interface Goals05ScreenProps {
  readonly onBack?: () => void;
  readonly onCreate?: (input: GoalFormSubmit) => void;
  readonly onCancel?: () => void;
  /** Bloquea el formulario mientras el servidor confirma. */
  readonly submitting?: boolean;
  /** `true` solo en modo demostración. */
  readonly demo?: boolean;
  readonly initialName?: string;
  readonly initialAmountText?: string;
  /** Fecha inicial en formato `AAAA-MM-DD`. */
  readonly initialDate?: string;
}

export const Goals05Screen: React.FC<Goals05ScreenProps> = ({
  onBack,
  onCreate,
  onCancel,
  submitting = false,
  demo = true,
  initialName,
  initialAmountText,
  initialDate,
}) => {
  const [name, setName] = useState(
    initialName ?? (demo ? DEMO_GOAL_CREATE_DRAFT.name : ''),
  );
  const [amountText, setAmountText] = useState(
    initialAmountText ??
      (demo ? formatGoalAmount(DEMO_GOAL_CREATE_DRAFT.targetCents) : ''),
  );
  const [dateText, setDateText] = useState(
    initialDate ?? (demo ? '2027-06-30' : ''),
  );
  // El DEMO reproduce el estado de validación original de Stitch.
  const [touched, setTouched] = useState(demo);

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
    onCreate?.({
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
        <GoalsHeader title="Crear meta" onBack={onBack} titleSize={26} />

        {showErrors ? (
          <View style={styles.alert}>
            <Text style={styles.alertTitle}>Revisa algunos datos</Text>
            <Text style={styles.alertText}>
              Corrige los campos marcados para crear tu meta.
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
            errorBorderColor={colors.goalsErrorFormBorder}
            helper={
              showErrors && !nameValid
                ? `Escribe un nombre de al menos ${MIN_GOAL_NAME_LENGTH} caracteres.`
                : 'El nombre que verás en Mis metas.'
            }
            helperError={showErrors && !nameValid}
            labelColor={colors.goalsFormLabel}
          />
          <GoalFormField
            label="Monto objetivo (COP)"
            value={amountText}
            placeholder="$ 0"
            onChangeText={setAmountText}
            readOnly={false}
            keyboardType="numeric"
            error={showErrors && !amountValid}
            errorBorderColor={colors.goalsErrorFormBorder}
            helper={
              showErrors && !amountValid
                ? 'Ingresa un monto mayor a $ 0 COP.'
                : 'Cuánto quieres reunir en total.'
            }
            helperError={showErrors && !amountValid}
            labelColor={colors.goalsFormLabel}
          />
          <GoalFormField
            label="Fecha objetivo (AAAA-MM-DD)"
            value={dateText}
            placeholder="2027-06-30"
            onChangeText={setDateText}
            readOnly={false}
            maxLength={10}
            error={showErrors && !dateValid}
            errorBorderColor={colors.goalsErrorFormBorder}
            helper={
              showErrors && !dateValid
                ? 'Escribe una fecha futura con formato AAAA-MM-DD.'
                : dateValid
                  ? `Fecha: ${formatLongDateLabel(dateText.trim())}`
                  : 'Elige una fecha futura para alcanzar tu meta.'
            }
            helperError={showErrors && !dateValid}
            labelColor={colors.goalsFormLabel}
          />
        </View>

        <Text style={styles.demoHint}>
          {demo
            ? 'Meta DEMO · no se guardará en el servidor'
            : 'El backend valida la fecha y el monto'}
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <GoalsActionButtons
          primaryLabel={submitting ? 'Creando…' : 'Crear meta'}
          onPrimary={submitting ? undefined : handleSubmit}
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

export default Goals05Screen;
