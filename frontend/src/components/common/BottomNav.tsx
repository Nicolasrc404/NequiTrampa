import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../../theme/colors';

interface BottomNavProps {
  activeTab?: 'inicio' | 'movimientos' | 'asistente' | 'perfil';
  onTabPress?: (tab: 'inicio' | 'movimientos' | 'asistente' | 'perfil') => void;
  bottomOffset?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab = 'movimientos',
  onTabPress,
  bottomOffset = 0,
}) => {
  return (
    <View style={[styles.container, { bottom: bottomOffset }]}>
      <TouchableOpacity
        style={styles.tab}
        activeOpacity={0.7}
        onPress={() => onTabPress?.('inicio')}
      >
        <Feather
          name="home"
          size={22}
          color={activeTab === 'inicio' ? colors.magenta : colors.grayNav}
        />
        <Text
          style={[
            styles.tabText,
            activeTab === 'inicio' ? styles.tabTextActive : styles.tabTextInactive,
          ]}
        >
          Inicio
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tab}
        activeOpacity={0.7}
        onPress={() => onTabPress?.('movimientos')}
      >
        <Feather
          name="menu"
          size={22}
          color={activeTab === 'movimientos' ? colors.magenta : colors.grayNav}
        />
        <Text
          style={[
            styles.tabText,
            activeTab === 'movimientos' ? styles.tabTextActive : styles.tabTextInactive,
          ]}
        >
          Movimientos
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tab}
        activeOpacity={0.7}
        onPress={() => onTabPress?.('asistente')}
      >
        <Ionicons
          name="sparkles-outline"
          size={22}
          color={activeTab === 'asistente' ? colors.magenta : colors.grayNav}
        />
        <Text
          style={[
            styles.tabText,
            activeTab === 'asistente' ? styles.tabTextActive : styles.tabTextInactive,
          ]}
        >
          Asistente
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tab}
        activeOpacity={0.7}
        onPress={() => onTabPress?.('perfil')}
      >
        <Feather
          name="user"
          size={22}
          color={activeTab === 'perfil' ? colors.magenta : colors.grayNav}
        />
        <Text
          style={[
            styles.tabText,
            activeTab === 'perfil' ? styles.tabTextActive : styles.tabTextInactive,
          ]}
        >
          Perfil
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: 'rgba(240, 239, 245, 0.9)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 100,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 3,
  },
  tabText: {
    fontSize: 11,
    letterSpacing: -0.2,
  },
  tabTextActive: {
    color: colors.magenta,
    fontWeight: '700',
  },
  tabTextInactive: {
    color: colors.grayNav,
    fontWeight: '400',
  },
});

export default BottomNav;
