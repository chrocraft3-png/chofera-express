import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';

export default function IndexRedirect() {
  const user = useAuthStore((s) => s.user);
  const inicializado = useAuthStore((s) => s.inicializado);

  if (!inicializado) return null;
  if (!user) return <Redirect href="/(auth)/login" />;
  return <Redirect href="/(tabs)" />;
}
