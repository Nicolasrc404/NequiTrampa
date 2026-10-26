import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import colors from '../../theme/colors';

export interface CategoryFieldProps {
  readonly label: string;
  readonly value: string;
  readonly placeholder?: string;
  readonly onChangeText?: (text: string) => void;
  readonly error?: string;
  readonly editable?: boolean;
  readonly helper?: string;
  readonly inputProps?: TextInputProps;
}

export const CategoryField: React.FC<CategoryFieldProps> = ({
  label,
  value,
  placeholder,
  onChangeText,
  error,
  editable = true,
  helper,
  inputProps,
}) => {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        value={value}
        placeholder={placeholder}
        placeholderTextColor={colors.grayPlaceholder}
        onChangeText={onChangeText}
        editable={editable}
        accessibilityLabel={label}
        {...inputProps}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!error && helper ? <Text style={styles.helperText}>{helper}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  group: {
    gap: 7,
  },
  label: {
    fontSize: 14.5,
    fontWeight: '500',
    color: colors.categoriesLabel,
    paddingLeft: 2,
  },
  input: {
    width: '100%',
    height: 56,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.categoriesInputBorder,
    color: colors.categoriesDark,
    fontSize: 16,
    fontWeight: '500',
  },
  inputError: {
    borderColor: colors.categoriesErrorBorder,
    borderWidth: 2,
  },
  errorText: {
    fontSize: 12.5,
    color: colors.categoriesError,
    paddingLeft: 2,
  },
  helperText: {
    fontSize: 12,
    color: colors.categoriesLabel,
    paddingLeft: 2,
  },
});

export default CategoryField;
