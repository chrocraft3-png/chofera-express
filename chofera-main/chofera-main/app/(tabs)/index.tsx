import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Modal,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Platform,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  runTransaction,
  doc,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  MapPin,
  Navigation,
  Tag,
  Clock,
  Gavel,
  X,
  Car,
  Star,
  Trash2,
} from 'lucide-react-native';
import MapView, { Marker } from 'react-native-maps';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/useAuthStore';
import { useSoundAlerta } from '@/hooks/useSoundAlerta';
import type { Usuario } from '@/types';

interface Solicitud {
  id: string;
  clienteUid: string;
  clienteNombre: string;
  caserio: string;
  destino: string;
  precioOferta: number;
  estado: 'abierta' | 'aceptada' | 'finalizada';
  createdAt: any;
}

interface ContraOferta {
  id: string;
  solicitudId: string;
  choferUid: string;
  choferNombre: string;
  precio: number;
  calificacion: number;
  createdAt: any;
}

const TAMBOGRANDE_REGION = {
  latitude: -5.0561,
  longitude: -80.3472,
  latitudeDelta: 0.03,
  longitudeDelta: 0.03,
};

const DESTINOS_RAPIDOS = [
  'Mercado Central',
  'CP11',
  'CP12',
  'San Martín de Papras',
  'Centro Tambogrande',
];

export default function RutasScreen() {
  const user = useAuthStore((s) => s.user) as Usuario | null;
  const router = useRouter();
  const { reproducir } = useSoundAlerta();

  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [modalOfertas, setModalOfertas] = useState<Solicitud | null>(null);
  const [ofertas, setOfertas] = useState<ContraOferta[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeoutActivo, setTimeoutActivo] = useState(false);
  const [creando, setCreando] = useState(false);

  const [destino, setDestino] = useState('');
  const [precio, setPrecio] = useState('');
  const [precioChofer, setPrecioChofer] = useState('');

  const esChofer = user?.rol === 'chofer';
  const esClienteOtienda = user?.rol === 'cliente' || user?.rol === 'tienda';

  useEffect(() => {
    const q = query(
      collection(db, 'solicitudes'),
      where('estado', '==', 'abierta')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const lista: Solicitud[] = [];
        snap.forEach((d) => {
          const data = d.data() as any;
          lista.push({ id: d.id, ...data });
        });
        lista.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
        setSolicitudes(lista);
        setLoading(false);
        if (esChofer && lista.length > 0) reproducir('solicitud');
      },
      () => setLoading(false)
    );
    return unsub;
  }, [esChofer, reproducir]);

  useEffect(() => {
    if (!modalOfertas) {
      setOfertas([]);
      return;
    }
    const q = query(
      collection(db, 'contraofertas'),
      where('solicitudId', '==', modalOfertas.id)
    );
    const unsub = onSnapshot(q, (snap) => {
      const lista: ContraOferta[] = [];
      snap.forEach((d) => {
        const data = d.data() as any;
        lista.push({ id: d.id, ...data });
      });
      lista.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setOfertas(lista);
      if (lista.length > 0) reproducir('oferta');
    });
    return unsub;
  }, [modalOfertas, reproducir]);

  useEffect(() => {
    if (!esChofer || !user) return;
    const q = query(
      collection(db, 'chats'),
      where('choferUid', '==', user.uid),
      where('estado', '==', 'en_curso')
    );
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const chatDoc = snap.docs[0];
        router.push(`/viaje/${chatDoc.id}`);
      }
    });
    return unsub;
  }, [esChofer, user, router]);

  const crearSolicitud = async () => {
    if (!user || creando) return;
    if (!destino.trim() || !precio) {
      Alert.alert('Faltan datos', 'Indica un destino y tu oferta de precio.');
      return;
    }
    setCreando(true);
    try {
      await addDoc(collection(db, 'solicitudes'), {
        clienteUid: user.uid,
        clienteNombre: user.nombre,
        caserio: user.caserio || 'Tambogrande',
        destino: destino.trim(),
        precioOferta: Number(precio),
        estado: 'abierta',
        createdAt: serverTimestamp(),
      });
      setDestino('');
      setPrecio('');
      setModalNuevo(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo crear la solicitud.');
    } finally {
      setCreando(false);
    }
  };

  const eliminarSolicitud = async (solId: string) => {
    Alert.alert('Eliminar solicitud', '¿Deseas cancelar esta búsqueda?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'solicitudes', solId));
          } catch (e) {
            Alert.alert('Error', 'No se pudo eliminar.');
          }
        },
      },
    ]);
  };

  const enviarContraoferta = async (sol: Solicitud) => {
    if (!user) return;
    if (!precioChofer || Number(precioChofer) <= 0) {
      Alert.alert('Precio inválido', 'Ingresa un precio válido.');
      return;
    }
    try {
      await addDoc(collection(db, 'contraofertas'), {
        solicitudId: sol.id,
        choferUid: user.uid,
        choferNombre: user.nombre,
        precio: Number(precioChofer),
        calificacion: user.calificacion_promedio ?? 0.0,
        createdAt: serverTimestamp(),
      });
      setPrecioChofer('');
      Alert.alert('Enviada', 'Tu contraoferta fue enviada al pasajero.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo enviar.');
    }
  };

  const aceptarOferta = async (oferta: ContraOferta, sol: Solicitud) => {
    if (!user) return;
    setTimeoutActivo(true);
    try {
      const resultado = await Promise.race([
        runTransaction(db, async (tx) => {
          const solRef = doc(db, 'solicitudes', sol.id);
          const solSnap = await tx.get(solRef);
          if (!solSnap.exists()) throw new Error('La solicitud ya no existe.');
          if (solSnap.data().estado !== 'abierta')
            throw new Error('La solicitud ya fue aceptada.');

          tx.update(solRef, {
            estado: 'aceptada',
            choferUid: oferta.choferUid,
            choferNombre: oferta.choferNombre,
            precioAcordado: oferta.precio,
          });

          const chatRef = doc(collection(db, 'chats'));
          tx.set(chatRef, {
            solicitudId: sol.id,
            clienteUid: sol.clienteUid,
            choferUid: oferta.choferUid,
            clienteNombre: sol.clienteNombre,
            choferNombre: oferta.choferNombre,
            destino: sol.destino,
            precioAcordado: oferta.precio,
            estado: 'en_curso',
            createdAt: serverTimestamp(),
          });
          return chatRef.id;
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 5000)
        ),
      ]);

      setModalOfertas(null);
      router.push(`/viaje/${resultado}`);
    } catch (e: any) {
      Alert.alert('Aviso', e?.message ?? 'No se pudo procesar.');
    } finally {
      setTimeoutActivo(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#111827' }}>Rutas Express</Text>
        <Text style={{ fontSize: 15, color: '#6b7280', marginTop: 2 }}>
          {esClienteOtienda ? 'Pide tu ruta y lanza tu precio' : esChofer ? 'Contraoferta solicitudes' : 'Zona activa'}
        </Text>
      </View>

      <View style={{ marginHorizontal: 20, height: 180, borderRadius: 24, overflow: 'hidden', backgroundColor: '#e5e7eb', marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb' }}>
        {Platform.OS !== 'web' ? (
          <MapView
            style={{ width: '100%', height: '100%' }}
            initialRegion={TAMBOGRANDE_REGION}
            zoomEnabled={true}
            scrollEnabled={true}
          >
            <Marker coordinate={{ latitude: -5.0561, longitude: -80.3472 }} title={`Zona ${user?.caserio ?? 'Tambogrande'}`} />
          </MapView>
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <MapPin color="#059669" size={24} />
            <Text style={{ color: '#374151', fontWeight: '700', marginTop: 4 }}>Zona {user?.caserio ?? 'Tambogrande'}</Text>
          </View>
        )}
      </View>

      {esClienteOtienda && (
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <Pressable
            onPress={() => setModalNuevo(true)}
            style={{ backgroundColor: '#059669', paddingVertical: 16, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, shadowColor: '#059669', shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 }}
          >
            <Gavel color="#fff" size={20} />
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Nueva solicitud de ruta</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={solicitudes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => {}} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color="#059669" style={{ marginTop: 40 }} />
          ) : (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Text style={{ color: '#9ca3af', fontSize: 15 }}>No hay solicitudes abiertas ahora.</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f3f4f6', elevation: 1, position: 'relative' }}>
            {item.clienteUid === user?.uid && (
              <Pressable 
                onPress={() => eliminarSolicitud(item.id)} 
                style={{ position: 'absolute', top: 12, right: 12, backgroundColor: '#fee2e2', padding: 6, borderRadius: 10, zIndex: 10 }}
              >
                <Trash2 color="#ef4444" size={18} />
              </Pressable>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, paddingRight: 36 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center' }}>
                  <Car color="#059669" size={18} />
                </View>
                <View>
                  <Text style={{ fontWeight: '700', color: '#111827', fontSize: 15 }}>{item.clienteNombre}</Text>
                  <Text style={{ color: '#9ca3af', fontSize: 12 }}>{item.caserio}</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#059669' }}>S/ {item.precioOferta}</Text>
                <Text style={{ fontSize: 11, color: '#9ca3af' }}>oferta</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Navigation color="#6b7280" size={16} />
              <Text style={{ color: '#374151', fontSize: 14, fontWeight: '600' }}>{item.destino}</Text>
            </View>

            {esChofer ? (
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <TextInput
                  value={precioChofer}
                  onChangeText={setPrecioChofer}
                  placeholder="Tu precio S/"
                  keyboardType="numeric"
                  style={{ flex: 1, backgroundColor: '#f9fafb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, borderWidth: 1, borderColor: '#e5e7eb', color: '#111827' }}
                />
                <Pressable onPress={() => enviarContraoferta(item)} style={{ backgroundColor: '#fbbf24', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 12 }}>
                  <Text style={{ fontWeight: '800', color: '#1f2937' }}>Ofertar</Text>
                </Pressable>
              </View>
            ) : esClienteOtienda && item.clienteUid === user?.uid ? (
              <Pressable onPress={() => setModalOfertas(item)} style={{ backgroundColor: '#059669', paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Ver contraofertas</Text>
              </Pressable>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Tag color="#9ca3af" size={16} />
                <Text style={{ color: '#9ca3af', fontSize: 13 }}>Esperando contraofertas...</Text>
              </View>
            )}
          </View>
        )}
      />

      {/* Modal Nueva Solicitud con Destinos Rápidos */}
      <Modal visible={modalNuevo} transparent animationType="slide" onRequestClose={() => setModalNuevo(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, maxHeight: '90%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827' }}>Nueva ruta</Text>
              <Pressable onPress={() => setModalNuevo(false)}><X color="#6b7280" size={24} /></Pressable>
            </View>

            <Text style={styles.label}>Destinos frecuentes (Toca para seleccionar):</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {DESTINOS_RAPIDOS.map((d) => (
                <Pressable
                  key={d}
                  onPress={() => setDestino(d)}
                  style={{
                    backgroundColor: destino === d ? '#059669' : '#f3f4f6',
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                    marginRight: 8,
                  }}
                >
                  <Text style={{ color: destino === d ? '#fff' : '#374151', fontWeight: '700', fontSize: 13 }}>{d}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.label}>¿A dónde vas?</Text>
            <TextInput value={destino} onChangeText={setDestino} placeholder="Ej: Mercado Central o referencia..." style={styles.input} />

            <Text style={styles.label}>Tu oferta de precio (S/)</Text>
            <TextInput value={precio} onChangeText={setPrecio} placeholder="Ej: 8" keyboardType="numeric" style={styles.input} />
            
            <Pressable 
              onPress={crearSolicitud} 
              disabled={creando}
              style={{ backgroundColor: creando ? '#a7f3d0' : '#059669', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 16 }}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
                {creando ? 'Publicando...' : 'Publicar solicitud'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal Ver Contraofertas */}
      <Modal visible={!!modalOfertas} transparent animationType="slide" onRequestClose={() => setModalOfertas(null)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, maxHeight: '85%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827' }}>Contraofertas</Text>
                <Text style={{ color: '#9ca3af', fontSize: 13 }}>Hacia: {modalOfertas?.destino}</Text>
              </View>
              <Pressable onPress={() => setModalOfertas(null)}><X color="#6b7280" size={24} /></Pressable>
            </View>

            {ofertas.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                <Clock color="#d1d5db" size={40} />
                <Text style={{ color: '#9ca3af', marginTop: 12 }}>Esperando choferes...</Text>
              </View>
            ) : (
              <ScrollView>
                {ofertas.map((o) => (
                  <View key={o.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center' }}>
                        <Car color="#059669" size={20} />
                      </View>
                      <View>
                        <Text style={{ fontWeight: '700', color: '#111827', fontSize: 15 }}>{o.choferNombre}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <Star color="#fbbf24" size={13} fill="#fbbf24" />
                          <Text style={{ color: '#6b7280', fontSize: 12 }}>{o.calificacion > 0 ? o.calificacion.toFixed(1) : 'Nuevo (0.0)'}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 20, fontWeight: '800', color: '#059669' }}>S/ {o.precio}</Text>
                      <Pressable onPress={() => aceptarOferta(o, modalOfertas!)} disabled={timeoutActivo} style={{ backgroundColor: timeoutActivo ? '#a7f3d0' : '#059669', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, marginTop: 6 }}>
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{timeoutActivo ? 'Procesando...' : 'Aceptar'}</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#f9fafb', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, borderWidth: 1, borderColor: '#e5e7eb', color: '#111827' },
});