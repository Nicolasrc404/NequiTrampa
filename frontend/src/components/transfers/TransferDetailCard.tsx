import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';

export interface TransferDetailRow {
  readonly label: string;
  readonly value: string;
  readonly valueColor?: string;
  readonly strong?: boolean;
}

export interface TransferDetailCardProps {
  readonly title?: string;
  readonly rows: readonly TransferDetailRow[];
  readonly caption?: string;
}

export const TransferDetailCard: React.FC<TransferDetailCardProps> = ({
  title,
  rows,
  caption,
}) => {
  return (
    <View style={styles.card}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={styles.rows}>
        {rows.map((row, index) => (
          <View key={`${row.label}-${index}`} style={styles.row}>
            <Text style={styles.label}>{row.label}</Text>
            <Text
              style={[
                styles.value,
                row.strong ? styles.valueStrong : null,
                row.valueColor ? { color: row.valueColor } : null,
              ]}
              numberOfLines={2}
            >
              {row.value}
            </Text>
          </View>
        ))}
      </View>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.transfersDivider,
    shadowColor: colors.transfersShadow,
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.transfersDark,
    marginBottom: 12,
  },
  rows: {
    gap: 11,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  label: {
    fontSize: 13.5,
    color: colors.transfersSubtext,
    flexShrink: 0,
  },
  value: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.transfersDark,
    textAlign: 'right',
    flex: 1,
  },
  valueStrong: {
    fontWeight: '800',
  },
  caption: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.transfersDivider,
    fontSize: 12,
    lineHeight: 18,
    color: colors.transfersSubtext,
    textAlign: 'center',
  },
});

export default TransferDetailCard;
