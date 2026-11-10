import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Modal,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
  runTransaction,
} from 'firebase/firestore';
import {
  LayoutGrid,
  X,
  CheckCircle2,
  HandCoins,
  Clock,
  Trash2,
  Upload,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/useAuthStore';
import { useSoundAlerta } from '@/hooks/useSoundAlerta';
import type { Usuario } from '@/types';

interface PublicacionMural {
  id: string;
  creadorUid: string;
  creadorNombre: string;
  descripcion: string;
  fotoUrl: string | null;
  estado: 'abierta' | 'aceptada' | 'cerrada';
  createdAt: any;
}

interface OfertaMural {
  id: string;
  publicacionId: string;
  oferenteUid: string;
  oferenteNombre: string;
  precio: number;
  nota: string;
  estado: 'pendiente' | 'aceptada' | 'rechazada';
  createdAt: any;
}

export default function MuralScreen() {
  const user = useAuthStore((s) => s.user) as Usuario | null;
  const refrescarPerfil = useAuthStore((s) => s.refrescarPerfil);
  const { reproducir } = useSoundAlerta();
  const router = useRouter();

  const [publicaciones, setPublicaciones] = useState<PublicacionMural[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [modalOfertas, setModalOfertas] = useState<PublicacionMural | null>(null);
  const [ofertas, setOfertas] = useState<OfertaMural[]>([]);
  const [modalOfertar, setModalOfertar] = useState<PublicacionMural | null>(null);
  const [modalLimite, setModalLimite] = useState(false);

  // Modal exclusivo de Promoción S/ 3
  const [modalPromo, setModalPromo] = useState(false);
  const [nroOperacionPromo, setNroOperacionPromo] = useState('');
  const [voucherPromoUri, setVoucherPromoUri] = useState<string | null>(null);
  const [enviandoPromo, setEnviandoPromo] = useState(false);

  const [descNueva, setDescNueva] = useState('');
  const [fotoUri, setFotoUri] = useState<string | null>(null);

  const [precioOferta, setPrecioOferta] = useState('');
  const [notaOferta, setNotaOferta] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'mural'), where('estado', '==', 'abierta'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const ahora = Date.now();
        const lista: PublicacionMural[] = [];
        
        snap.forEach((d) => {
          const data = d.data() as any;
          const createdAtMillis = data.createdAt?.seconds ? data.createdAt.seconds * 1000 : ahora;
          
          if (ahora - createdAtMillis <= 24 * 60 * 60 * 1000) {
            lista.push({ id: d.id, ...data });
          }
        });

        lista.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
        setPublicaciones(lista);
        setLoading(false);
      },
      (error) => {
        console.log('Error al cargar mural:', error);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  useEffect(() => {
    if (!modalOfertas) {
      setOfertas([]);
      return;
    }
    const q = query(
      collection(db, 'mural', modalOfertas.id, 'ofertas'),
      where('estado', '==', 'pendiente')
    );
    const unsub = onSnapshot(q, (snap) => {
      const lista: OfertaMural[] = [];
      snap.forEach((d) => lista.push({ id: d.id, ...(d.data() as any) }));
      lista.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setOfertas(lista);
      if (lista.length > 0) reproducir('oferta');
    });
    return unsub;
  }, [modalOfertas, reproducir]);

  // Selección y conversión estricta a Base64 optimizada para Firebase Cloud Sync
  const seleccionarFotoReal = async (esVoucher = false) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.3, 
    });

    if (!result.canceled && result.assets[0].uri) {
      try {
        const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const uriOptimizada = `data:image/jpeg;base64,${base64}`;

        if (esVoucher) {
          setVoucherPromoUri(uriOptimizada);
        } else {
          setFotoUri(uriOptimizada);
        }
      } catch (e) {
        Alert.alert('Error', 'No se pudo procesar la imagen.');
      }
    }
  };

  const enviarComprobantePromo = async () => {
    if (!user || !nroOperacionPromo.trim() || !voucherPromoUri) {
      Alert.alert('Faltan datos', 'Ingresa el número de operación y sube la foto del voucher.');
      return;
    }
    setEnviandoPromo(true);
    try {
      await addDoc(collection(db, 'pagos_verificacion'), {
        uid: user.uid,
        nombreUsuario: user.nombre,
        rol: user.rol,
        plan: 'Promoción Mural 24 Horas',
        monto: 3,
        nroOperacion: nroOperacionPromo.trim(),
        voucherUri: voucherPromoUri,
        estado: 'pendiente',
        createdAt: serverTimestamp(),
      });
      Alert.alert('¡Enviado!', 'El administrador verificará tu pago de S/ 3.');
      setModalPromo(false);
      setNroOperacionPromo('');
      setVoucherPromoUri(null);
    } catch (e) {
      Alert.alert('Error', 'No se pudo enviar el comprobante.');
    } finally {
      setEnviandoPromo(false);
    }
  };

  const publicarEnMural = async () => {
    if (!user) return;
    if (!descNueva.trim()) {
      Alert.alert('Faltan datos', 'Describe lo que buscas.');
      return;
    }
    try {
      await addDoc(collection(db, 'mural'), {
        creadorUid: user.uid,
        creadorNombre: user.nombre,
        descripcion: descNueva.trim(),
        fotoUrl: fotoUri || null, // Guardado en base64 para sincronización universal
        estado: 'abierta',
        createdAt: serverTimestamp(),
      });
      Alert.alert('Publicado', 'Tu pedido ya está visible en el Mural.');
      setModalNuevo(false);
      setDescNueva('');
      setFotoUri(null);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo publicar.');
    }
  };

  const eliminarPublicacion = async (pubId: string) => {
    Alert.alert('Eliminar publicación', '¿Deseas borrar este pedido del mural?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sí, eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'mural', pubId));
            Alert.alert('Eliminado', 'Tu publicación fue borrada.');
          } catch (e) {
            Alert.alert('Error', 'No se pudo eliminar.');
          }
        },
      },
    ]);
  };

  const abrirModalOfertar = (pub: PublicacionMural) => {
    if (!user) return;
    if (user.uid === pub.creadorUid) {
      Alert.alert('Acción no permitida', 'No puedes ofertar en tu propia publicación.');
      return;
    }
    if (user.rol === 'cliente' && user.ventas_mural_mes >= 3) {
      setModalLimite(true);
      return;
    }
    setModalOfertar(pub);
  };

  const enviarOferta = async () => {
    if (!user || !modalOfertar) return;
    const precio = Number(precioOferta);
    if (!precio || precio <= 0) {
      Alert.alert('Precio inválido', 'Ingresa un precio válido.');
      return;
    }
    try {
      await addDoc(collection(db, 'mural', modalOfertar.id, 'ofertas'), {
        oferenteUid: user.uid,
        oferenteNombre: user.nombre,
        precio,
        nota: notaOferta.trim(),
        estado: 'pendiente',
        createdAt: serverTimestamp(),
      });
      if (user.rol === 'cliente') {
        await updateDoc(doc(db, 'usuarios', user.uid), {
          ventas_mural_mes: user.ventas_mural_mes + 1,
        });
        await refrescarPerfil();
      }
      Alert.alert('Oferta enviada', 'El creador verá tu oferta.');
      setModalOfertar(null);
      setPrecioOferta('');
      setNotaOferta('');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo enviar.');
    }
  };

  const aceptarOferta = async (oferta: OfertaMural, pub: PublicacionMural) => {
    if (!user) return;
    try {
      const chatId = await runTransaction(db, async (tx) => {
        const pubRef = doc(db, 'mural', pub.id);
        const pubSnap = await tx.get(pubRef);
        if (!pubSnap.exists()) throw new Error('La publicación ya no existe.');
        if (pubSnap.data().estado !== 'abierta')
          throw new Error('Ya fue aceptada otra oferta.');

        tx.update(pubRef, { estado: 'aceptada' });

        const ofRef = doc(db, 'mural', pub.id, 'ofertas', oferta.id);
        tx.update(ofRef, { estado: 'aceptada' });

        const chatRef = doc(collection(db, 'chats'));
        tx.set(chatRef, {
          muralId: pub.id,
          clienteUid: pub.creadorUid,
          choferUid: oferta.oferenteUid,
          clienteNombre: pub.creadorNombre,
          choferNombre: oferta.oferenteNombre,
          destino: pub.descripcion,
          precioAcordado: oferta.precio,
          estado: 'en_curso',
          createdAt: serverTimestamp(),
          autoBorrado: false,
        });
        return chatRef.id;
      });
      setModalOfertas(null);
      router.push(`/viaje/${chatId}`);
    } catch (e: any) {
      Alert.alert('No disponible', e?.message ?? 'No se pudo aceptar.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#111827' }}>Mural</Text>
          <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
            Comunidad de Tambogrande y CP3
          </Text>
        </View>
        <Pressable
          onPress={() => setModalPromo(true)}
          style={{
            backgroundColor: '#d97706',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>🔥 Promo x S/3</Text>
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <Pressable
          onPress={() => setModalNuevo(true)}
          style={{
            backgroundColor: '#059669',
            paddingVertical: 16,
            borderRadius: 16,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <LayoutGrid color="#fff" size={20} />
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Busco algo / Publicar</Text>
        </Pressable>
      </View>

      <FlatList
        data={publicaciones}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color="#059669" style={{ marginTop: 40 }} />
          ) : (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <LayoutGrid color="#d1d5db" size={40} />
              <Text style={{ color: '#9ca3af', marginTop: 12 }}>El Mural está vacío o expiraron las publicaciones.</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: '#fff',
              borderRadius: 18,
              padding: 16,
              marginBottom: 14,
              borderWidth: 1,
              borderColor: '#f3f4f6',
              shadowColor: '#000',
              shadowOpacity: 0.04,
              shadowRadius: 6,
              elevation: 1,
              position: 'relative',
            }}
          >
            {item.creadorUid === user?.uid && (
              <Pressable
                onPress={() => eliminarPublicacion(item.id)}
                style={{
                  position: 'absolute',
                  top: 14,
                  right: 14,
                  backgroundColor: '#fee2e2',
                  padding: 8,
                  borderRadius: 10,
                  zIndex: 10,
                }}
              >
                <Trash2 color="#ef4444" size={18} />
              </Pressable>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, paddingRight: 36 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontWeight: '800', color: '#059669', fontSize: 16 }}>
                  {item.creadorNombre ? item.creadorNombre.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: '#111827', fontSize: 15 }}>{item.creadorNombre}</Text>
                <Text style={{ color: '#9ca3af', fontSize: 12 }}>Busca algo</Text>
              </View>
            </View>

            <Text style={{ color: '#374151', fontSize: 15, lineHeight: 21, marginBottom: 10 }}>
              {item.descripcion}
            </Text>

            {item.fotoUrl ? (
              <Image
                source={{ uri: item.fotoUrl }}
                style={{ width: '100%', height: 180, borderRadius: 14, marginBottom: 10 }}
                resizeMode="cover"
              />
            ) : null}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              {user?.uid === item.creadorUid ? (
                <Pressable
                  onPress={() => setModalOfertas(item)}
                  style={{ flex: 1, backgroundColor: '#059669', paddingVertical: 12, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}
                >
                  <HandCoins color="#fff" size={18} />
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Ver ofertas recibidas</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => abrirModalOfertar(item)}
                  style={{ flex: 1, backgroundColor: '#fbbf24', paddingVertical: 12, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}
                >
                  <HandCoins color="#1f2937" size={18} />
                  <Text style={{ color: '#1f2937', fontWeight: '800' }}>Yo lo tengo / Ofrecer</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
      />

      {/* Modal Promo S/ 3 */}
      <Modal visible={modalPromo} transparent animationType="slide" onRequestClose={() => setModalPromo(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827' }}>Promoción Mural (24 Horas)</Text>
              <Pressable onPress={() => setModalPromo(false)}>
                <X color="#6b7280" size={24} />
              </Pressable>
            </View>
            <Text style={{ color: '#6b7280', fontSize: 13, marginBottom: 16 }}>
              Destaca tu publicación por S/ 3 y ponla en la cima del mural.
            </Text>

            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{ width: 150, height: 150, backgroundColor: '#f3f4f6', borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#d1d5db' }}>
                <Text style={{ color: '#6b7280', fontSize: 11, textAlign: 'center' }}>[ Tu QR de Yape / Plin ]</Text>
              </View>
              <Text style={{ color: '#374151', fontWeight: '700', marginTop: 6 }}>Yape / Plin: 9XX XXX XXX</Text>
            </View>

            <Text style={styles.label}>Nro de Operación / Recibo</Text>
            <TextInput
              value={nroOperacionPromo}
              onChangeText={setNroOperacionPromo}
              placeholder="Ej: 98765432"
              style={styles.input}
            />

            <Text style={styles.label}>Captura del Voucher</Text>
            <Pressable
              onPress={() => seleccionarFotoReal(true)}
              style={{ backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderStyle: 'dashed', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 6, marginBottom: 16 }}
            >
              {voucherPromoUri ? (
                <Image source={{ uri: voucherPromoUri }} style={{ width: 80, height: 80, borderRadius: 8 }} />
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <Upload color="#6b7280" size={20} />
                  <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>Subir foto del pago</Text>
                </View>
              )}
            </Pressable>

            <Pressable onPress={enviarComprobantePromo} disabled={enviandoPromo} style={{ backgroundColor: '#d97706', paddingVertical: 16, borderRadius: 16, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
                {enviandoPromo ? 'Enviando...' : 'Enviar pago de S/ 3'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal Nueva Publicación */}
      <Modal visible={modalNuevo} transparent animationType="slide" onRequestClose={() => setModalNuevo(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, maxHeight: '90%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827' }}>Publicar en el Mural</Text>
              <Pressable onPress={() => setModalNuevo(false)}>
                <X color="#6b7280" size={24} />
              </Pressable>
            </View>

            <Text style={styles.label}>¿Qué buscas?</Text>
            <TextInput
              value={descNueva}
              onChangeText={setDescNueva}
              placeholder="Ej: Busco repuesto o delivery..."
              multiline
              style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
            />

            <Text style={styles.label}>Foto real (opcional)</Text>
            <Pressable
              onPress={() => seleccionarFotoReal(false)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                backgroundColor: '#f9fafb',
                borderRadius: 14,
                padding: 14,
                borderWidth: 1,
                borderColor: '#e5e7eb',
                marginTop: 6,
              }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: fotoUri ? '#d1fae5' : '#f3f4f6', justifyContent: 'center', alignItems: 'center' }}>
                {fotoUri ? <CheckCircle2 color="#059669" size={22} /> : <Upload color="#6b7280" size={22} />}
              </View>
              <Text style={{ flex: 1, color: '#374151', fontSize: 14 }}>
                {fotoUri ? 'Foto seleccionada' : 'Toca para elegir de galería'}
              </Text>
            </Pressable>

            {fotoUri && (
              <View style={{ alignItems: 'center', marginTop: 12 }}>
                <Image source={{ uri: fotoUri }} style={{ width: 100, height: 100, borderRadius: 14 }} />
              </View>
            )}

            <Pressable onPress={publicarEnMural} style={{ backgroundColor: '#059669', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 16 }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Publicar (Duración: 24h)</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal Ofertar */}
      <Modal visible={!!modalOfertar} transparent animationType="slide" onRequestClose={() => setModalOfertar(null)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827' }}>Ofrecer</Text>
              <Pressable onPress={() => setModalOfertar(null)}>
                <X color="#6b7280" size={24} />
              </Pressable>
            </View>
            <Text style={{ color: '#374151', fontSize: 14, marginBottom: 12 }}>{modalOfertar?.descripcion}</Text>

            <Text style={styles.label}>Tu precio (S/)</Text>
            <TextInput value={precioOferta} onChangeText={setPrecioOferta} placeholder="Ej: 15" keyboardType="numeric" style={styles.input} />

            <Text style={styles.label}>Nota (opcional)</Text>
            <TextInput
              value={notaOferta}
              onChangeText={setNotaOferta}
              placeholder="Ej: Tengo disponible ahora mismo..."
              multiline
              style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
            />

            <Pressable onPress={enviarOferta} style={{ backgroundColor: '#fbbf24', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 12 }}>
              <Text style={{ color: '#1f2937', fontWeight: '800', fontSize: 16 }}>Enviar oferta</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal Ver Ofertas */}
      <Modal visible={!!modalOfertas} transparent animationType="slide" onRequestClose={() => setModalOfertas(null)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, maxHeight: '85%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827' }}>Ofertas recibidas</Text>
              <Pressable onPress={() => setModalOfertas(null)}>
                <X color="#6b7280" size={24} />
              </Pressable>
            </View>

            {ofertas.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                <Clock color="#d1d5db" size={40} />
                <Text style={{ color: '#9ca3af', marginTop: 12 }}>Esperando ofertas...</Text>
              </View>
            ) : (
              <ScrollView>
                {ofertas.map((o) => (
                  <View
                    key={o.id}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#f9fafb',
                      borderRadius: 16,
                      padding: 14,
                      marginBottom: 10,
                      borderWidth: 1,
                      borderColor: '#e5e7eb',
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '700', color: '#111827', fontSize: 15 }}>{o.oferenteNombre}</Text>
                      {o.nota ? <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>{o.nota}</Text> : null}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 18, fontWeight: '800', color: '#059669' }}>S/ {o.precio}</Text>
                      <Pressable
                        onPress={() => aceptarOferta(o, modalOfertas!)}
                        style={{ backgroundColor: '#059669', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, marginTop: 6 }}
                      >
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Aceptar</Text>
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

const styles = {
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 10 } as any,
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    color: '#111827',
  } as any,
};