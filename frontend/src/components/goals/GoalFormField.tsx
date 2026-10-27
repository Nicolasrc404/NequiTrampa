import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import colors from '../../theme/colors';

export interface GoalFormFieldProps {
  readonly label: string;
  readonly value: string;
  readonly placeholder?: string;
  readonly error?: boolean;
  readonly helper?: string;
  readonly helperError?: boolean;
  readonly labelSize?: number;
  readonly fieldHeight?: number;
  readonly errorBorderWidth?: number;
  readonly errorBorderColor?: string;
  readonly helperColor?: string;
  readonly labelColor?: string;
  readonly onChangeText?: (text: string) => void;
  readonly readOnly?: boolean;
  readonly keyboardType?: TextInputProps['keyboardType'];
  readonly autoCapitalize?: TextInputProps['autoCapitalize'];
  readonly maxLength?: number;
}

export const GoalFormField: React.FC<GoalFormFieldProps> = ({
  label,
  value,
  placeholder,
  error = false,
  helper,
  helperError = false,
  labelSize = 14,
  fieldHeight = 56,
  errorBorderWidth = 1,
  errorBorderColor = colors.goalsError,
  helperColor,
  labelColor = colors.goalsMuted,
  onChangeText,
  readOnly = true,
  keyboardType,
  autoCapitalize,
  maxLength,
}) => {
  return (
    <View style={styles.group}>
      <Text style={[styles.label, { fontSize: labelSize, color: labelColor }]}>
        {label}
      </Text>
      <View
        style={[
          styles.field,
          { minHeight: fieldHeight },
          error
            ? { borderColor: errorBorderColor, borderWidth: errorBorderWidth }
            : null,
        ]}
      >
        {readOnly ? (
          <Text style={styles.value}>{value || placeholder}</Text>
        ) : (
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.goalsMuted}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            maxLength={maxLength}
            accessibilityLabel={label}
          />
        )}
      </View>
      {helper ? (
        <Text
          style={[
            styles.helper,
            helperError ? { color: colors.goalsErrorText } : null,
            helperColor ? { color: helperColor } : null,
          ]}
        >
          {helper}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  group: {
    gap: 7,
  },
  label: {
    paddingLeft: 2,
    fontWeight: '500',
    color: colors.goalsMuted,
  },
  field: {
    backgroundColor: colors.goalsWhite,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.goalsInputBorder,
    paddingHorizontal: 17,
    justifyContent: 'center',
    shadowColor: colors.goalsShadow,
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  value: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.goalsDark,
  },
  input: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.goalsDark,
    paddingVertical: 0,
  },
  helper: {
    paddingLeft: 2,
    fontSize: 12.5,
    color: colors.goalsMuted,
  },
});

export default GoalFormField;
