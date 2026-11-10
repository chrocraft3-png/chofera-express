import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import type { ReactNode } from 'react';

export function LoadingPantalla({ mensaje = 'Cargando...' }: { mensaje?: string }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#059669" />
      <Text style={styles.texto}>{mensaje}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  texto: {
    marginTop: 12,
    fontSize: 16,
    color: '#4b5563',
  },
});

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <View className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 ${className}`}>
      {children}
    </View>
  );
}

export { StyleSheet, View, Text };
