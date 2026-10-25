import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../../theme/colors';

interface HeaderProps {
  title?: string;
  onFilterPress?: () => void;
  showFilter?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Movimientos',
  onFilterPress,
  showFilter = true,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {showFilter && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onFilterPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.filterButton}>Filtrar</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.navy,
    letterSpacing: -0.5,
  },
  filterButton: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.magenta,
  },
});

export default Header;
