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
}

export const Goals07Screen: React.FC<Goals07ScreenProps> = ({ onCorrect }) => {
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
      demoHint="Estado DEMO · sin conexión al backend"
    >
      <View style={styles.card}>
        <Text style={styles.line}>
          {DEMO_GOAL_INVALID_DATE.name} ·{' '}
          {formatGoalAmount(DEMO_GOAL_INVALID_DATE.targetCents)} COP
        </Text>
        <Text style={styles.line}>
          Fecha elegida: {DEMO_GOAL_INVALID_DATE.targetDateLabel}.
        </Text>
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
