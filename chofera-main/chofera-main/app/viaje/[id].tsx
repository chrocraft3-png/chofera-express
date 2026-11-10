import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  doc,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { 
  ArrowLeft, 
  Send, 
  XCircle, 
  CheckCircle, 
  DollarSign, 
  Mic, 
  AlertTriangle, 
  Check, 
  CheckCheck, 
  MapPin, 
  MessageSquare 
} from 'lucide-react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/useAuthStore';
import type { Usuario } from '@/types';

interface Mensaje {
  id: string;
  senderUid: string;
  senderNombre: string;
  texto: string;
  tipo?: 'texto' | 'audio';
  leido?: boolean;
  createdAt: any;
}

export default function ViajeChatScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const user = useAuthStore((s) => s.user) as Usuario | null;

  const [chatData, setChatData] = useState<any>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState('');
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);

  // Estado para alternar pantalla completa entre Mapa y Chat
  const [vistaMapaCompleto, setVistaMapaCompleto] = useState(false);

  // Ubicación GPS real
  const [regionMapa, setRegionMapa] = useState({
    latitude: -5.0590,
    longitude: -80.3500,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });

  // Estados de control de modales
  const [modalOferta, setModalOferta] = useState(false);
  const [nuevoPrecio, setNuevoPrecio] = useState('');
  const [modalReporte, setModalReporte] = useState(false);
  const [motivoReporte, setMotivoReporte] = useState('');

  const esChofer = user?.rol === 'chofer';

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let loc = await Location.getCurrentPositionAsync({});
        setRegionMapa({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        });
      }
    })();
  }, []);

  useEffect(() => {
    if (!id) return;
    const docRef = doc(db, 'chats', id as string);
    const unsubChat = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setChatData(data);
        if (data.estado === 'cancelado') {
          Alert.alert('Aviso', 'El viaje ha sido cancelado.');
          router.replace('/(tabs)');
        }
      }
      setLoading(false);
    });
    return unsubChat;
  }, [id]);

  useEffect(() => {
    if (!id || !user) return;
    const q = query(
      collection(db, 'chats', id as string, 'mensajes'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, async (snap) => {
      const lista: Mensaje[] = [];
      const batch = writeBatch(db);
      let hayNuevosNoLeidos = false;

      snap.forEach((d) => {
        const data = d.data() as any;
        lista.push({ id: d.id, ...data } as Mensaje);

        if (data.senderUid !== user.uid && !data.leido) {
          batch.update(doc(db, 'chats', id as string, 'mensajes', d.id), { leido: true });
          hayNuevosNoLeidos = true;
        }
      });

      if (hayNuevosNoLeidos) {
        await batch.commit().catch(() => {});
      }
      setMensajes(lista);
    });
    return unsub;
  }, [id, user]);

  const enviarMensaje = async (customTexto?: string, tipo: 'texto' | 'audio' = 'texto') => {
    const mensajeFinal = customTexto || texto;
    if (!user || (!mensajeFinal.trim() && tipo === 'texto') || !id || enviando) return;

    setEnviando(true);
    try {
      if (tipo === 'texto' && !customTexto) setTexto('');
      await addDoc(collection(db, 'chats', id as string, 'mensajes'), {
        senderUid: user.uid,
        senderNombre: user.nombre,
        texto: tipo === 'audio' ? '🎤 [Nota de voz]' : mensajeFinal.trim(),
        tipo,
        leido: false,
        createdAt: serverTimestamp(),
      });
    } catch (e: any) {
      Alert.alert('Error', 'No se pudo enviar el mensaje.');
    } finally {
      setEnviando(false);
    }
  };

  // Envío directo de nota de voz sin alertas molestas
  const enviarNotaDeVoz = () => {
    enviarMensaje('🎤 [Nota de voz rápida]', 'audio');
  };

  const enviarContraoferta = async () => {
    if (!nuevoPrecio || isNaN(Number(nuevoPrecio))) return;
    try {
      await updateDoc(doc(db, 'chats', id as string), { precioAcordado: Number(nuevoPrecio) });
      await enviarMensaje(`💰 Propongo ajustar la tarifa a: S/ ${nuevoPrecio}`);
      setModalOferta(false);
      setNuevoPrecio('');
    } catch (e) {}
  };

  const cancelarViaje = async () => {
    Alert.alert('Cancelar viaje', '¿Seguro que deseas cancelar esta ruta?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, cancelar',
        style: 'destructive',
        onPress: async () => {
          await updateDoc(doc(db, 'chats', id as string), { estado: 'cancelado' }).catch(() => {});
          router.replace('/(tabs)');
        },
      },
    ]);
  };

  const finalizarViaje = async () => {
    Alert.alert('Finalizar viaje', '¿Deseas concluir y cerrar esta ruta?', [
      { text: 'Volver', style: 'cancel' },
      {
        text: 'Sí, finalizar',
        onPress: async () => {
          await updateDoc(doc(db, 'chats', id as string), { estado: 'finalizado' }).catch(() => {});
          router.replace('/(tabs)');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' }}>
        <Text style={{ color: '#fff' }}>Cargando viaje y GPS...</Text>
      </View>
    );
  }

  const nombreContraparte = esChofer ? chatData?.clienteNombre : chatData?.choferNombre;

  return (
    <View style={{ flex: 1, backgroundColor: '#111827' }}>
      {/* 1. MAPA GPS EN VIVO */}
      <View style={{ height: vistaMapaCompleto ? '100%' : 200, width: '100%', position: 'relative' }}>
        <MapView
          style={{ width: '100%', height: '100%' }}
          region={regionMapa}
          showsUserLocation={true}
          showsMyLocationButton={true}
        >
          <Marker coordinate={{ latitude: -5.0561, longitude: -80.3472 }} title="Recogida" pinColor="green" />
          <Marker coordinate={{ latitude: -5.0620, longitude: -80.3550 }} title="Destino" pinColor="red" />
          <Polyline coordinates={[{ latitude: -5.0561, longitude: -80.3472 }, { latitude: -5.0620, longitude: -80.3550 }]} strokeColor="#10b981" strokeWidth={5} />
        </MapView>

        <View style={styles.topNavCard}>
          <Pressable onPress={() => router.replace('/(tabs)')} style={styles.backBtn}>
            <ArrowLeft color="#111827" size={18} />
          </Pressable>
          <View style={{ flex: 1, marginHorizontal: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#111827' }} numberOfLines={1}>{nombreContraparte}</Text>
            <Text style={{ fontSize: 11, color: '#059669', fontWeight: '700' }} numberOfLines={1}>Destino: {chatData?.destino} · S/ {chatData?.precioAcordado}</Text>
          </View>
          <Pressable onPress={() => setModalReporte(true)} style={styles.reportBtn}>
            <AlertTriangle color="#ef4444" size={16} />
          </Pressable>
        </View>

        {/* Botón flotante estilo InDrive */}
        <Pressable
          onPress={() => setVistaMapaCompleto(!vistaMapaCompleto)}
          style={styles.floatingMapToggle}
        >
          {vistaMapaCompleto ? (
            <>
              <MessageSquare color="#fff" size={18} />
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>Ver Chat</Text>
            </>
          ) : (
            <>
              <MapPin color="#fff" size={18} />
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>Mapa Completo</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* 2. CHAT ESTILO WHATSAPP (Barra inferior rediseñada, más amplia y cómoda) */}
      {!vistaMapaCompleto && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.bottomPanel}>
          <View style={styles.actionsRow}>
            <Pressable onPress={() => enviarMensaje('📍 ¡Ya estoy aquí en el punto de encuentro!')} style={styles.btnPrimary} disabled={enviando}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 11 }}>Ya estoy aquí</Text>
            </Pressable>
            <Pressable onPress={() => setModalOferta(true)} style={styles.btnOffer}>
              <DollarSign color="#d97706" size={13} />
              <Text style={{ color: '#d97706', fontWeight: '800', fontSize: 11 }}>Contraofertar</Text>
            </Pressable>
            <Pressable onPress={cancelarViaje} style={styles.btnDanger}>
              <XCircle color="#dc2626" size={13} />
              <Text style={{ color: '#dc2626', fontWeight: '700', fontSize: 10 }}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={finalizarViaje} style={styles.btnSuccess}>
              <CheckCircle color="#fff" size={13} />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 10 }}>Finalizar</Text>
            </Pressable>
          </View>

          <FlatList
            data={mensajes}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8 }}
            style={{ flex: 1 }}
            renderItem={({ item }) => {
              const esMio = item.senderUid === user?.uid;
              return (
                <View style={[styles.bubble, esMio ? styles.bubbleMio : styles.bubbleOtro]}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: esMio ? '#d1fae5' : '#6b7280' }}>{item.senderNombre}</Text>
                  <Text style={{ fontSize: 13, color: esMio ? '#fff' : '#111827' }}>{item.texto}</Text>
                  {esMio && (
                    <View style={{ alignSelf: 'flex-end', marginTop: 2 }}>
                      {item.leido ? <CheckCheck color="#d1fae5" size={13} /> : <Check color="#d1fae5" size={13} />}
                    </View>
                  )}
                </View>
              );
            }}
          />

          {/* Referencias rápidas */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickScroll}>
            {['📍 Estoy al lado de la referencia...', '🏡 Voy más allá, hasta la CP...', '⏳ Espérame 3 minutos', '👍 ¡Trato hecho!'].map((t, idx) => (
              <Pressable key={idx} onPress={() => setTexto(t)} style={styles.quickChip}>
                <Text style={{ color: '#047857', fontSize: 11, fontWeight: '600' }}>{t}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Barra inferior de escritura estilo WhatsApp optimizada (botones más grandes y elevados) */}
          <View style={styles.inputRow}>
            <Pressable onPress={enviarNotaDeVoz} style={styles.micBtn}>
              <Mic color="#fff" size={20} />
            </Pressable>

            <TextInput
              value={texto}
              onChangeText={setTexto}
              placeholder="Escribe un mensaje o dirección..."
              placeholderTextColor="#9ca3af"
              style={styles.textInput}
            />

            <Pressable onPress={() => enviarMensaje()} style={styles.sendBtn} disabled={enviando}>
              <Send color="#fff" size={18} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Modales */}
      <Modal visible={modalOferta} transparent animationType="fade" onRequestClose={() => setModalOferta(false)}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 24 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 340 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 6 }}>Nueva Tarifa (S/)</Text>
            <TextInput value={nuevoPrecio} onChangeText={setNuevoPrecio} placeholder="Ej: 9" keyboardType="numeric" style={styles.modalInput} />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <Pressable onPress={() => setModalOferta(false)} style={{ flex: 1, paddingVertical: 12, backgroundColor: '#f3f4f6', borderRadius: 12, alignItems: 'center' }}><Text style={{ fontWeight: '700', color: '#6b7280' }}>Cancelar</Text></Pressable>
              <Pressable onPress={enviarContraoferta} style={{ flex: 1, paddingVertical: 12, backgroundColor: '#059669', borderRadius: 12, alignItems: 'center' }}><Text style={{ fontWeight: '700', color: '#fff' }}>Actualizar</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalReporte} transparent animationType="fade" onRequestClose={() => setModalReporte(false)}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 24 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 340 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#ef4444', marginBottom: 6 }}>Reportar Incidencia</Text>
            <TextInput value={motivoReporte} onChangeText={setMotivoReporte} placeholder="Describe el motivo..." multiline style={[styles.modalInput, { minHeight: 80, textAlignVertical: 'top' }]} />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <Pressable onPress={() => setModalReporte(false)} style={{ flex: 1, paddingVertical: 12, backgroundColor: '#f3f4f6', borderRadius: 12, alignItems: 'center' }}><Text style={{ fontWeight: '700', color: '#6b7280' }}>Cancelar</Text></Pressable>
              <Pressable onPress={async () => {
                if (!motivoReporte.trim() || !user || !chatData) return;
                const acusadoUid = user.uid === chatData.clienteUid ? chatData.choferUid : chatData.clienteUid;
                await addDoc(collection(db, 'reportes'), {
                  viajeId: id,
                  reportanteUid: user.uid,
                  reportanteNombre: user.nombre,
                  acusadoUid: acusadoUid || 'desconocido',
                  motivo: motivoReporte.trim(),
                  estado: 'pendiente',
                  createdAt: serverTimestamp(),
                });
                setModalReporte(false);
                setMotivoReporte('');
                Alert.alert('Reporte enviado', 'El administrador revisará esta incidencia.');
              }} style={{ flex: 1, paddingVertical: 12, backgroundColor: '#ef4444', borderRadius: 12, alignItems: 'center' }}><Text style={{ fontWeight: '700', color: '#fff' }}>Denunciar</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  topNavCard: { position: 'absolute', top: 35, left: 12, right: 12, backgroundColor: '#fff', borderRadius: 14, padding: 8, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, elevation: 4, zIndex: 10 },
  backBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  reportBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fee2e2', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#fca5a5' },
  floatingMapToggle: { position: 'absolute', bottom: 16, right: 16, backgroundColor: '#059669', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 25, flexDirection: 'row', alignItems: 'center', gap: 6, elevation: 6, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, zIndex: 20 },
  bottomPanel: { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 8 },
  actionsRow: { flexDirection: 'row', paddingHorizontal: 10, marginBottom: 6, gap: 4, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#059669', paddingVertical: 8, paddingHorizontal: 8, borderRadius: 10, alignItems: 'center' },
  btnOffer: { backgroundColor: '#fef3c7', paddingVertical: 8, paddingHorizontal: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 2, borderWidth: 1, borderColor: '#fde68a' },
  btnDanger: { backgroundColor: '#fee2e2', paddingVertical: 8, paddingHorizontal: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 2, borderWidth: 1, borderColor: '#fca5a5' },
  btnSuccess: { backgroundColor: '#059669', paddingVertical: 8, paddingHorizontal: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 2 },
  bubble: { maxWidth: '75%', padding: 8, borderRadius: 12, marginBottom: 4 },
  bubbleMio: { alignSelf: 'flex-end', backgroundColor: '#059669' },
  bubbleOtro: { alignSelf: 'flex-start', backgroundColor: '#f3f4f6' },
  quickScroll: { paddingHorizontal: 12, maxHeight: 30, marginBottom: 4 },
  quickChip: { backgroundColor: '#d1fae5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginRight: 6, height: 24 },
  
  // Estilos mejorados estilo WhatsApp para la barra de chat
  inputRow: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 10, gap: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6', alignItems: 'center', backgroundColor: '#fff' },
  micBtn: { backgroundColor: '#059669', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  textInput: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 22, paddingHorizontal: 16, height: 44, borderWidth: 1, borderColor: '#e5e7eb', fontSize: 14, color: '#111827' },
  sendBtn: { backgroundColor: '#059669', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  
  modalInput: { backgroundColor: '#f9fafb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, borderWidth: 1, borderColor: '#e5e7eb', color: '#111827' },
});