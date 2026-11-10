import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';

export default function AdminTabRedirect() {
  const user = useAuthStore((s) => s.user);
  if (!user || (user.rol !== 'moderador' && user.rol !== 'super_admin')) {
    return <Redirect href="/(tabs)" />;
  }
  return <Redirect href="/(admin)/dashboard" />;
}
