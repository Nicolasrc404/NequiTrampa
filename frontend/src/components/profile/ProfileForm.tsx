import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import colors from '../../theme/colors';
import { Module1DemoActions, Module1DemoState } from '../../types/module1';
import type { ProfileDto } from '../../types/profile';
import { MIN_ALIAS_LENGTH, MAX_ALIAS_LENGTH } from '../../services/profileService';

export interface ProfileFormProps extends Module1DemoState, Module1DemoActions {
  readonly profile?: ProfileDto | null;
  readonly onSave?: () => void;
  readonly onCancel?: () => void;
  readonly saving?: boolean;
  readonly saveError?: string | null;
}

export default function ProfileForm({
  value,
  submitted,
  setValue,
  profile,
  onSave,
  onCancel,
  saving,
  saveError,
}: ProfileFormProps) {
  const isReal = profile !== undefined;
  const trimmed = value.trim();
  const hasLengthError =
    trimmed.length > 0 &&
    (trimmed.length < MIN_ALIAS_LENGTH || trimmed.length > MAX_ALIAS_LENGTH);
  const canSave = !saving && trimmed.length >= MIN_ALIAS_LENGTH && trimmed.length <= MAX_ALIAS_LENGTH;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Actualiza tu información</Text>
      <Text style={styles.label}>Alias (nombre visible para otros clientes)</Text>
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder={profile?.alias ?? profile?.username ?? 'Nicolás Ramírez'}
        placeholderTextColor={colors.grayPlaceholder}
        style={styles.input}
        maxLength={MAX_ALIAS_LENGTH}
        accessibilityLabel="Alias de perfil"
      />
      {submitted && !trimmed ? (
        <Text style={styles.error}>El alias es obligatorio.</Text>
      ) : null}
      {hasLengthError ? (
        <Text style={styles.error}>
          El alias debe tener entre {MIN_ALIAS_LENGTH} y {MAX_ALIAS_LENGTH} caracteres.
        </Text>
      ) : null}
      {isReal && profile ? (
        <Text style={styles.hint}>
          {profile.email} · {profile.timezone}
        </Text>
      ) : null}
      {saveError ? <Text style={styles.error}>{saveError}</Text> : null}

      {isReal && onSave ? (
        <View style={styles.formActions}>
          <Pressable
            disabled={!canSave}
            onPress={onSave}
            style={[styles.saveButton, !canSave ? styles.buttonDisabled : null]}
            accessibilityRole="button"
            accessibilityLabel="Guardar alias"
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Guardando…' : 'Guardar alias'}
            </Text>
          </Pressable>
          {onCancel ? (
            <Pressable
              disabled={saving}
              onPress={onCancel}
              style={styles.cancelButton}
              accessibilityRole="button"
              accessibilityLabel="Cancelar edición"
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.grayBorder,
  },
  title: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  label: {
    color: colors.graySub,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 7,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 13,
    paddingHorizontal: 14,
    color: colors.navy,
    fontSize: 15,
  },
  error: {
    color: '#C83232',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  hint: {
    color: colors.graySub,
    fontSize: 12,
    marginTop: 10,
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  saveButton: {
    backgroundColor: colors.magenta,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: colors.magenta,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: colors.magenta,
    fontSize: 14,
    fontWeight: '800',
  },
});
