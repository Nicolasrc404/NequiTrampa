import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import colors from '../../theme/colors';

export interface CashFormFieldProps {
  readonly label: string;
  readonly value: string;
  readonly placeholder?: string;
  readonly onChangeText?: (text: string) => void;
  readonly readOnly?: boolean;
  readonly error?: boolean;
  readonly helper?: string;
  readonly height?: number;
  readonly keyboardType?: TextInputProps['keyboardType'];
  readonly autoCapitalize?: TextInputProps['autoCapitalize'];
  readonly maxLength?: number;
}

export const CashFormField: React.FC<CashFormFieldProps> = ({
  label,
  value,
  placeholder,
  onChangeText,
  readOnly = false,
  error = false,
  helper,
  height = 54,
  keyboardType,
  autoCapitalize,
  maxLength,
}) => {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      {readOnly ? (
        <View
          style={[
            styles.field,
            { height },
            error ? styles.fieldError : null,
          ]}
        >
          <Text
            style={[
              styles.readOnlyText,
              !value ? styles.placeholder : null,
              error ? styles.errorValue : null,
            ]}
          >
            {value || placeholder}
          </Text>
        </View>
      ) : (
        <View style={[styles.field, { height }, error ? styles.fieldError : null]}>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.cashInputPlaceholder}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            maxLength={maxLength}
            accessibilityLabel={label}
          />
        </View>
      )}
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
    gap: 8,
  },
  label: {
    paddingLeft: 2,
    fontSize: 14.5,
    fontWeight: '500',
    color: colors.cashMuted,
  },
  field: {
    backgroundColor: colors.cashWhite,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cashBorder,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  fieldError: {
    borderWidth: 1.5,
    borderColor: colors.cashErrorText,
  },
  readOnlyText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.cashNavy,
  },
  placeholder: {
    fontWeight: '400',
    color: colors.cashInputPlaceholder,
  },
  errorValue: {
    color: colors.cashInputPlaceholder,
  },
  input: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.cashInputText,
    paddingVertical: 0,
  },
  helper: {
    paddingLeft: 2,
    fontSize: 13.5,
    fontWeight: '500',
    color: colors.cashMuted,
  },
  helperError: {
    color: colors.cashErrorText,
  },
});

export default CashFormField;
