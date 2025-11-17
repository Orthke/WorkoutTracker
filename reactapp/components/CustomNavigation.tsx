import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TabItem {
  key: string;
  label: string;
  icon: string;
  path: string;
}

interface CustomNavigationProps {
  active: string;
}

const TAB_ITEMS: TabItem[] = [
  {
    key: 'profile',
    label: 'Profile',
    icon: 'person',
    path: '/profile',
  },
  {
    key: 'workout',
    label: 'Workout',
    icon: 'fitness',
    path: '/workout-list',
  },
  {
    key: 'calendar',
    label: 'Calendar',
    icon: 'calendar',
    path: '/calendar',
  },
];

export default function CustomNavigation({ active }: CustomNavigationProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleTabPress = (item: TabItem) => {
    // Don't navigate if already on the same tab
    if (item.key === active) return;
    
    router.push(item.path as any);
  };

  const isActive = (itemKey: string) => {
    return active === itemKey;
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.tabBar}>
        {TAB_ITEMS.map((item) => {
          const isTabActive = isActive(item.key);
          return (
            <TouchableOpacity
              key={item.key}
              style={styles.tabItem}
              onPress={() => handleTabPress(item)}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={item.icon as any} 
                size={24} 
                color={isTabActive ? '#155724' : '#666'} 
              />
              <Text style={[
                styles.tabLabel, 
                { color: isTabActive ? '#155724' : '#666' }
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  tabBar: {
    flexDirection: 'row',
    height: 60,
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
});