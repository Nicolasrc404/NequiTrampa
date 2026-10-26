import React, { ComponentProps, ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '../../theme/colors';
import TransfersHeader from './TransfersHeader';
import TransferActionButtons from './TransferActionButtons';

type FeatherName = ComponentProps<typeof Feather>['name'];

export interface TransferStatusScreenProps {
  readonly icon: FeatherName;
  readonly iconBackground: string;
  readonly iconColor: string;
  readonly iconWrapperSize?: number;
  readonly badge?: string;
  readonly badgeBackground?: string;
  readonly badgeColor?: string;
  readonly title: string;
  readonly titleFontSize?: number;
  readonly description: string;
  readonly headerTitle?: string;
  readonly headerTitleSize?: number;
  readonly onBack?: () => void;
  readonly primaryLabel?: string;
  readonly onPrimary?: () => void;
  readonly secondaryLabel?: string;
  readonly onSecondary?: () => void;
  readonly children?: ReactNode;
  readonly systemBar?: boolean;
  readonly demoHint?: string;
}

export const TransferStatusScreen: React.FC<TransferStatusScreenProps> = ({
  icon,
  iconBackground,
  iconColor,
  iconWrapperSize = 96,
  badge,
  badgeBackground,
  badgeColor,
  title,
  titleFontSize = 25,
  description,
  headerTitle,
  headerTitleSize = 21,
  onBack,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  children,
  systemBar = false,
  demoHint,
}) => {
  return (
    <View style={styles.root}>
      {headerTitle ? (
        <View style={styles.header}>
          <TransfersHeader
            title={headerTitle}
            onBack={onBack}
            titleSize={headerTitleSize}
          />
        </View>
      ) : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.body,
          headerTitle ? styles.bodyWithHeader : styles.bodyCentered,
        ]}
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
          <Feather name={icon} size={38} color={iconColor} />
        </View>

        {badge ? (
          <View
            style={[
              styles.badge,
              { backgroundColor: badgeBackground ?? colors.transfersWarningBadgeBg },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: badgeColor ?? colors.transfersWarningText },
              ]}
            >
              {badge}
            </Text>
          </View>
        ) : null}

        <Text style={[styles.title, { fontSize: titleFontSize }]}>{title}</Text>
        <Text style={styles.description}>{description}</Text>

        {children ? <View style={styles.children}>{children}</View> : null}
      </ScrollView>

      {primaryLabel ? (
        <View style={styles.footer}>
          <TransferActionButtons
            primaryLabel={primaryLabel}
            onPrimary={onPrimary}
            secondaryLabel={secondaryLabel}
            onSecondary={onSecondary}
          />
          {demoHint ? <Text style={styles.demoHint}>{demoHint}</Text> : null}
        </View>
      ) : null}

      {systemBar ? <View style={styles.systemBar} /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.transfersBg,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 30,
  },
  scroll: {
    flex: 1,
  },
  body: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  bodyCentered: {
    justifyContent: 'center',
    paddingTop: 40,
    paddingBottom: 28,
  },
  bodyWithHeader: {
    justifyContent: 'flex-start',
    paddingTop: 48,
    paddingBottom: 28,
  },
  iconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    shadowColor: colors.transfersShadow,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 18,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  title: {
    maxWidth: 330,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '800',
    color: colors.transfersDark,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  description: {
    maxWidth: 320,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
    color: colors.transfersMuted,
    textAlign: 'center',
  },
  children: {
    width: '100%',
    marginTop: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 32,
  },
  demoHint: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: colors.transfersNavInactive,
    textTransform: 'uppercase',
  },
  systemBar: {
    height: 28,
    backgroundColor: colors.transfersSystemBar,
  },
});

export default TransferStatusScreen;
