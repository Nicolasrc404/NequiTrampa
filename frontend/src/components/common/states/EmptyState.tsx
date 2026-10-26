import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '../../../theme/colors';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

export interface EmptyStateProps {
  readonly title: string;
  readonly description?: string;
  readonly icon?: FeatherName;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
  readonly testID?: string;
}

/** Estado vacío reutilizable (listas sin datos, búsquedas sin resultados). */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon = 'inbox',
  actionLabel,
  onAction,
  testID = 'empty-state',
}) => (
  <View style={styles.container} testID={testID}>
    <View style={styles.iconCircle}>
      <Feather name={icon} size={28} color={colors.magentaText} />
    </View>
    <Text style={styles.title}>{title}</Text>
    {description ? <Text style={styles.body}>{description}</Text> : null}
    {actionLabel && onAction ? (
      <Pressable
        onPress={onAction}
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.buttonText}>{actionLabel}</Text>
      </Pressable>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
    gap: 12,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.stateIconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.stateTitle,
    textAlign: 'center',
  },
  body: {
    maxWidth: 320,
    fontSize: 15,
    lineHeight: 22,
    color: colors.stateBody,
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
    backgroundColor: colors.magenta,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});

export default EmptyState;
