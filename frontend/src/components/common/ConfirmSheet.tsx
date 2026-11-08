import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '../../theme/colors';

export interface ConfirmSheetProps {
  readonly visible: boolean;
  readonly icon: React.ComponentProps<typeof Feather>['name'];
  readonly title: string;
  readonly body: string;
  readonly primaryLabel: string;
  readonly onPrimary: () => void;
  readonly primaryLoading?: boolean;
  readonly secondaryLabel: string;
  readonly onSecondary: () => void;
}

export default function ConfirmSheet({
  visible,
  icon,
  title,
  body,
  primaryLabel,
  onPrimary,
  primaryLoading = false,
  secondaryLabel,
  onSecondary,
}: ConfirmSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onSecondary}>
      <Pressable style={styles.backdrop} onPress={onSecondary}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.handle} />
          <View style={styles.iconCircle}>
            <Feather name={icon} size={24} color={colors.navy} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={primaryLabel}
            disabled={primaryLoading}
            onPress={onPrimary}
            style={({ pressed }) => [
              styles.primary,
              primaryLoading ? styles.primaryDisabled : null,
              pressed && !primaryLoading ? styles.primaryPressed : null,
            ]}
          >
            {primaryLoading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>{primaryLabel}</Text>}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={secondaryLabel}
            onPress={onSecondary}
            style={({ pressed }) => [styles.secondary, pressed ? styles.secondaryPressed : null]}
          >
            <Text style={styles.secondaryText}>{secondaryLabel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 17, 34, 0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 28,
    alignItems: 'center',
    gap: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.grayBorder,
    marginBottom: 8,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.stateIconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    color: colors.navy,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.graySub,
    textAlign: 'center',
    marginBottom: 6,
  },
  primary: {
    width: '100%',
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: colors.magenta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryPressed: {
    backgroundColor: colors.magentaHover,
  },
  primaryDisabled: {
    opacity: 0.6,
  },
  primaryText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  secondary: {
    width: '100%',
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.magenta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryPressed: {
    backgroundColor: colors.magentaLight,
  },
  secondaryText: {
    color: colors.magenta,
    fontSize: 14,
    fontWeight: '800',
  },
});
