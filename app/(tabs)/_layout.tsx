import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

type TabConfig = {
  name: string;
  title: string;
  icon: IoniconsName;
  iconFocused: IoniconsName;
};

const TABS: TabConfig[] = [
  { name: 'index',        title: 'Início',    icon: 'home-outline',            iconFocused: 'home' },
  { name: 'planilha',     title: 'Planilha',  icon: 'grid-outline',            iconFocused: 'grid' },
  { name: 'handover',     title: 'Passagem',  icon: 'swap-horizontal-outline', iconFocused: 'swap-horizontal' },
  { name: 'guide',        title: 'Guia',      icon: 'book-outline',            iconFocused: 'book' },
  { name: 'report',       title: 'Relatório', icon: 'bar-chart-outline',       iconFocused: 'bar-chart' },
  { name: 'settings',     title: 'Config.',   icon: 'settings-outline',        iconFocused: 'settings' },
];

const HIDDEN_TABS = [
  'turno', 'gallery', 'explore', 'products', 'tabela-turno',
];

export default function TabLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 10,
          paddingBottom: bottomPad + 10,
          height: 62 + bottomPad,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.07,
          shadowRadius: 8,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.2,
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
      }}
    >
      {TABS.map(({ name, title, icon, iconFocused }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? iconFocused : icon}
                size={size ?? 22}
                color={color}
              />
            ),
          }}
        />
      ))}

      {HIDDEN_TABS.map((name) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{ href: null }}
        />
      ))}
    </Tabs>
  );
}
