import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '../../theme/colors';
import { AnalyticsTab } from '../../types/analytics';

export interface AnalyticsTabsProps {
  readonly activeTab: AnalyticsTab;
  readonly onSelectTab?: (tab: AnalyticsTab) => void;
}

export const AnalyticsTabs: React.FC<AnalyticsTabsProps> = ({
  activeTab,
  onSelectTab,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'resumen' && styles.tabActive,
        ]}
        activeOpacity={0.8}
        onPress={() => onSelectTab?.('resumen')}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === 'resumen' }}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === 'resumen' && styles.tabTextActive,
          ]}
        >
          Resumen
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'categorias' && styles.tabActive,
        ]}
        activeOpacity={0.8}
        onPress={() => onSelectTab?.('categorias')}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === 'categorias' }}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === 'categorias' && styles.tabTextActive,
          ]}
        >
          Categorías
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'tendencias' && styles.tabActive,
        ]}
        activeOpacity={0.8}
        onPress={() => onSelectTab?.('tendencias')}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === 'tendencias' }}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === 'tendencias' && styles.tabTextActive,
          ]}
        >
          Tendencias
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: colors.analyticsMagenta,
    shadowColor: colors.analyticsMagenta,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.analyticsMuted,
  },
  tabTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
});

export default AnalyticsTabs;
