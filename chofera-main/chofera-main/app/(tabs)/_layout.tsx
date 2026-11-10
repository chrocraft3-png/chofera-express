import { Tabs } from 'expo-router';
import { Home, Store, User, LayoutGrid } from 'lucide-react-native';
import { useAuthStore } from '@/store/useAuthStore';

export default function TabsLayout() {
  const user = useAuthStore((s) => s.user);

  // Admin tab is completely hidden from the tab bar.
  // Admin access is only via the Perfil screen for moderador/super_admin roles.
  const tabs = [
    { name: 'index', title: 'Rutas', icon: Home },
    { name: 'tienda', title: 'Tienda', icon: Store },
    { name: 'mural', title: 'Mural', icon: LayoutGrid },
    { name: 'perfil', title: 'Perfil', icon: User },
  ];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#059669',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#f3f4f6',
          borderTopWidth: 1,
          paddingBottom: 6,
          paddingTop: 6,
          height: 60,
        },
        tabBarLabelStyle: {
          fontWeight: '600',
          fontSize: 12,
        },
      }}
    >
      {tabs.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ size, color }) => <t.icon size={size} color={color} />,
          }}
        />
      ))}
      {/* admin.tsx exists in this dir but must never appear in the tab bar.
          href: null removes it from navigation entirely. */}
      <Tabs.Screen name="admin" options={{ href: null }} />
    </Tabs>
  );
}
