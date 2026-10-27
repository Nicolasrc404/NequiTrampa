import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import colors from '../../theme/colors';

export interface BudgetFormFieldProps {
  readonly label: string;
  readonly value: string;
  readonly placeholder?: string;
  readonly error?: boolean;
  readonly helper?: string;
  readonly editable?: boolean;
  readonly onChangeText?: (value: string) => void;
}

export const BudgetFormField: React.FC<BudgetFormFieldProps> = ({
  label,
  value,
  placeholder,
  error = false,
  helper,
  editable = false,
  onChangeText,
}) => {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, error ? styles.fieldError : null]}>
        {editable ? <TextInput
          style={styles.value}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.budgetsMutedAlt}
          keyboardType="numeric"
          accessibilityLabel={label}
        /> : <Text
          style={[
            styles.value,
            !value ? styles.placeholder : null,
            error && !value ? styles.errorValue : null,
          ]}
        >
          {value || placeholder}
        </Text>}
      </View>
      {helper ? (
        <Text style={[styles.helper, error ? styles.helperError : null]}>
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
    paddingLeft: 4,
    fontSize: 14,
    fontWeight: '500',
    color: colors.budgetsMutedAlt,
  },
  field: {
    minHeight: 56,
    backgroundColor: colors.budgetsWhite,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.budgetsInputBorder,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  fieldError: {
    borderColor: colors.budgetsErrorBorder,
    borderWidth: 1.5,
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.budgetsTitle,
  },
  placeholder: {
    fontWeight: '400',
    color: colors.budgetsMutedAlt,
  },
  errorValue: {
    color: colors.budgetsErrorText,
  },
  helper: {
    paddingLeft: 2,
    fontSize: 12,
    color: colors.budgetsMuted,
  },
  helperError: {
    color: colors.budgetsErrorText,
  },
});

export default BudgetFormField;
