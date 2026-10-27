import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import colors from '../../theme/colors';

export interface BudgetFormFieldProps {
  readonly label: string;
  readonly value: string;
  readonly placeholder?: string;
  readonly error?: boolean;
  readonly helper?: string;
  readonly onChangeText?: (text: string) => void;
  /** Marca el campo como solo lectura. Se mantiene por compatibilidad. */
  readonly readOnly?: boolean;
  /** Alternativa a `readOnly`; tiene prioridad cuando se especifica. */
  readonly editable?: boolean;
  readonly keyboardType?: TextInputProps['keyboardType'];
  readonly autoCapitalize?: TextInputProps['autoCapitalize'];
  readonly maxLength?: number;
}

export const BudgetFormField: React.FC<BudgetFormFieldProps> = ({
  label,
  value,
  placeholder,
  error = false,
  helper,
  onChangeText,
  readOnly,
  editable,
  keyboardType,
  autoCapitalize,
  maxLength,
}) => {
  const isEditable = editable ?? !(readOnly ?? true);

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, error ? styles.fieldError : null]}>
        {isEditable ? (
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.budgetsMutedAlt}
            keyboardType={keyboardType ?? 'numeric'}
            autoCapitalize={autoCapitalize}
            maxLength={maxLength}
            accessibilityLabel={label}
          />
        ) : (
          <Text
            style={[
              styles.value,
              !value ? styles.placeholder : null,
              error && !value ? styles.errorValue : null,
            ]}
          >
            {value || placeholder}
          </Text>
        )}
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
  input: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.budgetsTitle,
    paddingVertical: 0,
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
