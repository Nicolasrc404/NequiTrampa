import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';
import { TransferItem } from '../../types/transfers';
import { formatSignedCopFromCents } from '../../data/demoTransfers';

export interface TransferHistoryRowProps {
  readonly item: TransferItem;
  readonly onPress?: () => void;
}

export const TransferHistoryRow: React.FC<TransferHistoryRowProps> = ({
  item,
  onPress,
}) => {
  const isSent = item.direction === 'sent';
  const prefix = isSent ? 'A' : 'De';
  const actionLetter = isSent ? 'A' : 'D';

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${prefix} ${item.counterpartyName}, ${formatSignedCopFromCents(item.amountCents, item.direction)}`}
    >
      <View style={styles.left}>
        <View
          style={[
            styles.avatar,
            isSent ? styles.avatarSent : styles.avatarReceived,
          ]}
        >
          <Text
            style={[
              styles.avatarText,
              isSent ? styles.avatarTextSent : styles.avatarTextReceived,
            ]}
          >
            {actionLetter}
          </Text>
        </View>
        <View style={styles.labels}>
          <Text style={styles.name}>
            {prefix} {item.counterpartyName}
          </Text>
          <Text style={styles.date}>{item.occurredAtLabel}</Text>
        </View>
      </View>
      <Text style={[styles.amount, isSent ? styles.amountSent : styles.amountReceived]}>
        {formatSignedCopFromCents(item.amountCents, item.direction)}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 10,
  },
  pressed: {
    opacity: 0.7,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSent: {
    backgroundColor: colors.transfersPinkBg,
  },
  avatarReceived: {
    backgroundColor: colors.transfersGreenBg,
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '700',
  },
  avatarTextSent: {
    color: colors.transfersPinkText,
  },
  avatarTextReceived: {
    color: colors.transfersGreen,
  },
  labels: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.transfersDarkList,
    lineHeight: 20,
  },
  date: {
    fontSize: 13,
    color: colors.grayPlaceholder,
    marginTop: 2,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'right',
  },
  amountSent: {
    color: colors.transfersDarkList,
  },
  amountReceived: {
    color: colors.transfersGreen,
  },
});

export default TransferHistoryRow;
