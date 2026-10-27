// ============================================================
// Chips de selección única
// ============================================================
// Control compartido para elegir una categoría sin depender de un selector
// nativo ni de un menú desplegable. Reutiliza los tokens de tema existentes y
// no introduce una pantalla nueva: se coloca debajo del campo que describe.

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '../../theme/colors';

export interface OptionChip {
  readonly id: string;
  readonly label: string;
}

export interface OptionChipsProps {
  readonly options: readonly OptionChip[];
  readonly selectedId?: string | null;
  readonly onSelect?: (id: string) => void;
  readonly accentColor?: string;
  readonly disabled?: boolean;
  readonly emptyLabel?: string;
}

export const OptionChips: React.FC<OptionChipsProps> = ({
  options,
  selectedId,
  onSelect,
  accentColor = colors.magenta,
  disabled = false,
  emptyLabel,
}) => {
  if (options.length === 0) {
    return emptyLabel ? <Text style={styles.empty}>{emptyLabel}</Text> : null;
  }

  return (
    <View style={styles.row}>
      {options.map((option) => {
        const selected = option.id === selectedId;
        return (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.chip,
              selected ? { borderColor: accentColor } : null,
              selected ? { backgroundColor: accentColor } : null,
              disabled ? styles.chipDisabled : null,
            ]}
            activeOpacity={0.8}
            disabled={disabled}
            onPress={() => onSelect?.(option.id)}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled }}
            accessibilityLabel={option.label}
          >
            <Text
              style={[
                styles.label,
                selected ? styles.labelSelected : null,
              ]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    maxWidth: '100%',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.white,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.graySub,
  },
  labelSelected: {
    color: colors.white,
  },
  empty: {
    fontSize: 13,
    color: colors.graySub,
  },
});

export default OptionChips;
