import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '../../theme/colors';
import { MovementItem } from '../../types/movements';
import { formatCopCents } from '../../utils/money';

interface TransactionItemProps {
  item: MovementItem;
  onPress?: (item: MovementItem) => void;
  showDivider?: boolean;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  item,
  onPress,
  showDivider = true,
}) => {
  const signedCents = item.amountCents ?? Math.round(item.amount * 100);
  const isPositive = signedCents > 0;
  const isRecharge = item.type === 'RECHARGE';

  const formatAmount = (item: MovementItem) => {
    if (typeof item.amountCents === 'number') {
      return `${item.amountCents > 0 ? '+' : '-'} ${formatCopCents(
        Math.abs(item.amountCents),
      )}`;
    }
    const absVal = Math.abs(item.amount);
    const formatted = absVal.toLocaleString('es-CO');
    return isPositive ? `+ $ ${formatted}` : `- $ ${formatted}`;
  };

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        activeOpacity={0.7}
        onPress={() => onPress?.(item)}
      >
        <View style={styles.leftRow}>
          {/* Avatar Icon / Letter */}
          {isRecharge ? (
            <View style={[styles.avatar, styles.greenAvatar]}>
              <Feather name="plus" size={20} color={colors.greenText} />
            </View>
          ) : isPositive ? (
            <View style={[styles.avatar, styles.greenAvatar]}>
              <Text style={styles.avatarLetterGreen}>{item.initialLetter || 'N'}</Text>
            </View>
          ) : (
            <View style={[styles.avatar, styles.pinkAvatar]}>
              <Text style={styles.avatarLetterPink}>{item.initialLetter || 'N'}</Text>
            </View>
          )}

          {/* Texts */}
          <View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.timestamp}>{item.timestamp}</Text>
          </View>
        </View>

        {/* Amount */}
        <View style={styles.rightColumn}>
          <Text
            style={[
              styles.amountText,
              isPositive ? styles.amountGreen : styles.amountNavy,
            ]}
          >
            {formatAmount(item)}
          </Text>
        </View>
      </TouchableOpacity>
      {showDivider && <View style={styles.divider} />}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinkAvatar: {
    backgroundColor: colors.magentaLight,
  },
  greenAvatar: {
    backgroundColor: colors.greenBadge,
  },
  avatarLetterPink: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.magentaText,
  },
  avatarLetterGreen: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.greenText,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15.5,
    fontWeight: '700',
    color: colors.navy,
    letterSpacing: -0.2,
  },
  timestamp: {
    fontSize: 13,
    color: colors.graySub,
    marginTop: 2,
  },
  rightColumn: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 15.5,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  amountGreen: {
    color: colors.green,
  },
  amountNavy: {
    color: colors.navy,
  },
  divider: {
    height: 1,
    backgroundColor: colors.grayBorder,
    marginHorizontal: 16,
  },
});

export default TransactionItem;
