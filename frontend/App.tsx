import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import colors from './src/theme/colors';
import { MovementsState, MovementItem } from './src/types/movements';
import { DEMO_MOVEMENTS } from './src/data/demoMovements';

import DevStateBar from './src/components/common/DevStateBar';
import Movements01Screen from './src/screens/movements/Movements01Screen';
import Movements02Screen from './src/screens/movements/Movements02Screen';
import Movements03Screen from './src/screens/movements/Movements03Screen';
import Movements04Screen from './src/screens/movements/Movements04Screen';
import Movements05Screen from './src/screens/movements/Movements05Screen';
import Movements06Screen from './src/screens/movements/Movements06Screen';
import Movements07Screen from './src/screens/movements/Movements07Screen';
import Movements08Screen from './src/screens/movements/Movements08Screen';

export default function App() {
  const [currentState, setCurrentState] = useState<MovementsState>('Movements_01');
  const [selectedMovement, setSelectedMovement] = useState<MovementItem>(DEMO_MOVEMENTS[1]); // Default REC-000071 matching Stitch

  const handleSelectMovement = (item: MovementItem) => {
    setSelectedMovement(item);
    setCurrentState('Movements_05');
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />

      {/* Persistent DEV preview switcher bar */}
      <DevStateBar
        currentState={currentState}
        onSelectState={setCurrentState}
      />

      {/* Screen Render according to State */}
      <View style={styles.screenContainer}>
        {currentState === 'Movements_01' && (
          <Movements01Screen
            onOpenFilter={() => setCurrentState('Movements_04')}
            onSelectMovement={handleSelectMovement}
          />
        )}

        {currentState === 'Movements_02' && (
          <Movements02Screen
            onOpenFilter={() => setCurrentState('Movements_04')}
            onRechargePress={() => setCurrentState('Movements_01')}
          />
        )}

        {currentState === 'Movements_03' && (
          <Movements03Screen
            onOpenFilter={() => setCurrentState('Movements_04')}
          />
        )}

        {currentState === 'Movements_04' && (
          <Movements04Screen
            onBack={() => setCurrentState('Movements_01')}
            onApplyFilters={() => setCurrentState('Movements_01')}
          />
        )}

        {currentState === 'Movements_05' && (
          <Movements05Screen
            movement={selectedMovement}
            onBack={() => setCurrentState('Movements_01')}
          />
        )}

        {currentState === 'Movements_06' && (
          <Movements06Screen
            onBack={() => setCurrentState('Movements_01')}
          />
        )}

        {currentState === 'Movements_07' && (
          <Movements07Screen
            onLoginPress={() => setCurrentState('Movements_01')}
          />
        )}

        {currentState === 'Movements_08' && (
          <Movements08Screen
            onRetryPress={() => setCurrentState('Movements_01')}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenContainer: {
    flex: 1,
  },
});
