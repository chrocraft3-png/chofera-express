import { useEffect, useState } from 'react';
import { View, Text, Modal, Pressable, StyleSheet, Platform } from 'react-native';
import { AlertTriangle, WifiOff, X } from 'lucide-react-native';

// Banner flotante amarillo "Sin red"
export function OfflineBanner({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View style={styles.banner}>
      <WifiOff color="#1f2937" size={18} />
      <Text style={styles.bannerTexto}>Sin red — Modo Trocha activado</Text>
    </View>
  );
}

// Modal bloqueante de actualización obligatoria
export function ModalVersion({
  visible,
  versionMinima,
  onClose,
}: {
  visible: boolean;
  versionMinima: string;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconoCirc}>
            <AlertTriangle color="#f59e0b" size={40} />
          </View>
          <Text style={styles.titulo}>Actualización requerida</Text>
          <Text style={styles.cuerpo}>
            Tu versión está obsoleta. La versión mínima actual es {versionMinima}. Actualiza la
            app para seguir usándola.
          </Text>
          <Pressable style={styles.boton} onPress={onClose}>
            <Text style={styles.botonTexto}>Entendido</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    backgroundColor: '#fbbf24',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 50,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  bannerTexto: {
    color: '#1f2937',
    fontWeight: '700',
    fontSize: 14,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 380,
  },
  iconoCirc: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  titulo: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  cuerpo: {
    fontSize: 15,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
  boton: {
    backgroundColor: '#059669',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  botonTexto: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});

// Hook para detectar conectividad seguro para móvil y web
export function useConnectividad() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      setOnline(navigator.onLine);
      const on = () => setOnline(true);
      const off = () => setOnline(false);
      window.addEventListener('online', on);
      window.addEventListener('offline', off);
      return () => {
        window.removeEventListener('online', on);
        window.removeEventListener('removeEventListener' as any, off);
      };
    }
  }, []);
  return online;
}