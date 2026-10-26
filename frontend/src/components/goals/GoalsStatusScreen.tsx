import React, { ComponentProps, ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '../../theme/colors';
import GoalsActionButtons from './GoalsActionButtons';

type FeatherName = ComponentProps<typeof Feather>['name'];

export interface GoalsStatusScreenProps {
  readonly icon: FeatherName;
  readonly iconBackground: string;
  readonly iconColor: string;
  readonly iconWrapperSize?: number;
  readonly iconSize?: number;
  readonly title: string;
  readonly titleSize?: number;
  readonly description: string;
  readonly children?: ReactNode;
  readonly primaryLabel: string;
  readonly onPrimary?: () => void;
  readonly secondaryLabel?: string;
  readonly onSecondary?: () => void;
  readonly demoHint?: string;
  readonly backgroundColor?: string;
}

export const GoalsStatusScreen: React.FC<GoalsStatusScreenProps> = ({
  icon,
  iconBackground,
  iconColor,
  iconWrapperSize = 96,
  iconSize = 38,
  title,
  titleSize = 25,
  description,
  children,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  demoHint,
  backgroundColor = colors.goalsBg,
}) => {
  return (
    <View style={[styles.root, { backgroundColor }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.iconCircle,
            {
              width: iconWrapperSize,
              height: iconWrapperSize,
              borderRadius: iconWrapperSize / 2,
              backgroundColor: iconBackground,
            },
          ]}
        >
          <Feather name={icon} size={iconSize} color={iconColor} />
        </View>

        <Text style={[styles.title, { fontSize: titleSize }]}>{title}</Text>
        <Text style={styles.description}>{description}</Text>

        {children ? <View style={styles.children}>{children}</View> : null}
      </ScrollView>

      <View style={styles.footer}>
        <GoalsActionButtons
          primaryLabel={primaryLabel}
          onPrimary={onPrimary}
          secondaryLabel={secondaryLabel}
          onSecondary={onSecondary}
        />
        {demoHint ? <Text style={styles.demoHint}>{demoHint}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.goalsBg,
  },
  scroll: {
    flex: 1,
  },
  body: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
  },
  iconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: colors.goalsShadow,
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  title: {
    maxWidth: 320,
    marginBottom: 12,
    fontWeight: '700',
    color: colors.goalsDark,
    textAlign: 'center',
    letterSpacing: -0.4,
    lineHeight: 32,
  },
  description: {
    maxWidth: 310,
    fontSize: 15.5,
    lineHeight: 22,
    fontWeight: '400',
    color: colors.goalsMuted,
    textAlign: 'center',
  },
  children: {
    width: '100%',
    marginTop: 26,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
  },
  demoHint: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: colors.goalsMuted,
    textTransform: 'uppercase',
  },
});

export default GoalsStatusScreen;
