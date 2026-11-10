import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useAuthStore } from '@/store/useAuthStore';
import { db } from '@/lib/firebase';
import { APP_VERSION } from '@/store/useAuthStore';
import { ModalVersion, OfflineBanner, useConnectividad } from '@/components/Modales';
import '../global.css';

function compararVersiones(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const da = pa[i] ?? 0;
    const dbb = pb[i] ?? 0;
    if (da > dbb) return 1;
    if (da < dbb) return -1;
  }
  return 0;
}

export default function RootLayout() {
  useFrameworkReady();
  const init = useAuthStore((s) => s.init);
  const inicializado = useAuthStore((s) => s.inicializado);
  const user = useAuthStore((s) => s.user);
  const online = useConnectividad();

  const [versionOk, setVersionOk] = useState(true);
  const [versionMinima, setVersionMinima] = useState('1.0.0');
  const [verificandoVersion, setVerificandoVersion] = useState(true);

  useEffect(() => {
    const unsub = init();
    return unsub;
  }, [init]);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'config', 'app'));
        if (snap.exists()) {
          const min = (snap.data() as any).version_minima ?? '1.0.0';
          setVersionMinima(min);
          if (compararVersiones(APP_VERSION, min) < 0) {
            setVersionOk(false);
          }
        }
      } catch {
        // si no hay config, permitir
      } finally {
        setVerificandoVersion(false);
      }
    })();
  }, []);

  if (!inicializado || verificandoVersion) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={{ marginTop: 12, color: '#4b5563' }}>Iniciando Rutas Express...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="viaje/[id]" />
        <Stack.Screen name="(vendedor)" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <OfflineBanner visible={!online} />
      <ModalVersion visible={!versionOk} versionMinima={versionMinima} onClose={() => setVersionOk(true)} />
      <StatusBar style="auto" />
    </>
  );
}
