import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';
import GoalsStatusScreen from '../../components/goals/GoalsStatusScreen';
import {
  DEMO_GOAL_INVALID_DATE,
  formatGoalAmount,
} from '../../data/demoGoals';

export interface Goals07ScreenProps {
  readonly onCorrect?: () => void;
  /** Nombre de la meta rechazada. */
  readonly goalName?: string;
  /** Monto objetivo rechazado, en centavos. */
  readonly targetCents?: number;
  /** Fecha rechazada, ya formateada para lectura. */
  readonly targetDateLabel?: string;
  /** `true` solo en modo demostración. */
  readonly demo?: boolean;
}

export const Goals07Screen: React.FC<Goals07ScreenProps> = ({
  onCorrect,
  goalName = DEMO_GOAL_INVALID_DATE.name,
  targetCents = DEMO_GOAL_INVALID_DATE.targetCents,
  targetDateLabel = DEMO_GOAL_INVALID_DATE.targetDateLabel,
  demo = true,
}) => {
  return (
    <GoalsStatusScreen
      icon="file-text"
      iconBackground={colors.goalsNoticeBg}
      iconColor={colors.goalsNoticeIcon}
      iconWrapperSize={80}
      iconSize={36}
      title="No pudimos crear esta meta"
      description="La fecha objetivo debe ser futura. Elige una fecha posterior a hoy para crear tu meta."
      primaryLabel="Corregir información"
      onPrimary={onCorrect}
      demoHint={demo ? 'Estado DEMO · sin conexión al backend' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.line}>
          {goalName} · {formatGoalAmount(targetCents)} COP
        </Text>
        <Text style={styles.line}>Fecha elegida: {targetDateLabel}.</Text>
        <Text style={styles.line}>Cámbiala por una fecha futura.</Text>
      </View>
    </GoalsStatusScreen>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.goalsCardBorderSoft,
    backgroundColor: colors.goalsWhite,
    padding: 20,
    gap: 3,
    shadowColor: colors.goalsShadow,
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  line: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.goalsDark,
  },
});

export default Goals07Screen;
