import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  ArrowLeft,
  Package,
  CheckCircle2,
  X,
  MessageCircle,
  Send,
  Clock,
  ShoppingBag,
  Plus,
  Trash2,
  Store,
  Upload,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/useAuthStore';
import type { CategoriaTienda, Usuario } from '@/types';

interface Reserva {
  id: string;
  productoId: string;
  productoNombre: string;
  tiendaUid: string;
  clienteUid: string;
  clienteNombre: string;
  cantidad: number;
  nota: string;
  estado: 'pendiente' | 'confirmada' | 'rechazada';
  createdAt: any;
}

interface PedidoPersonalizado {
  id: string;
  clienteUid: string;
  clienteNombre: string;
  clienteCelular: string;
  descripcion: string;
  fotoUrl: string | null;
  estado: 'pendiente' | 'confirmada';
  createdAt: any;
}

interface MiProducto {
  id: string;
  tiendaUid: string;
  tiendaNombre: string;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  flash: boolean;
  categoria: CategoriaTienda;
  imagenUrl?: string;
  activo: boolean;
  createdAt: any;
}

const CATEGORIAS: CategoriaTienda[] = ['Bodegas', 'Ferreterías', 'Carnicerías', 'Farmacias'];
const LIMITE_PRODUCTOS = 10;

type Tab = 'vitrina' | 'reservas' | 'pedidos';

export default function ReservasScreen() {
  const user = useAuthStore((s) => s.user) as Usuario | null;
  const router = useRouter();

  const [tab, setTab] = useState<Tab>('vitrina');
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [pedidos, setPedidos] = useState<PedidoPersonalizado[]>([]);
  const [misProductos, setMisProductos] = useState<MiProducto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalChat, setModalChat] = useState<{ id: string; nombre: string } | null>(null);
  const [modalProducto, setModalProducto] = useState(false);
  const [mensaje, setMensaje] = useState('');

  // form producto con compresión en la nube para fotos visibles por todos
  const [pNombre, setPNombre] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pPrecio, setPPrecio] = useState('');
  const [pStock, setPStock] = useState('10');
  const [pFlash, setPFlash] = useState(false);
  const [pFotoUri, setPFotoUri] = useState<string | null>(null);
  const [pCategoria, setPCategoria] = useState<CategoriaTienda>('Bodegas');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'reservas'), where('tiendaUid', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const lista: Reserva[] = [];
      snap.forEach((d) => lista.push({ id: d.id, ...(d.data() as any) }));
      lista.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setReservas(lista);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'pedidos_personalizados'), where('estado', '==', 'pendiente'));
    const unsub = onSnapshot(q, (snap) => {
      const lista: PedidoPersonalizado[] = [];
      snap.forEach((d) => lista.push({ id: d.id, ...(d.data() as any) }));
      lista.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setPedidos(lista);
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'productos'), where('tiendaUid', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const lista: MiProducto[] = [];
      snap.forEach((d) => lista.push({ id: d.id, ...(d.data() as any) }));
      lista.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setMisProductos(lista);
    });
    return unsub;
  }, [user]);

  // Selección y conversión optimizada a Base64 con compresión fuerte
  const seleccionarFotoProducto = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.3, // Compresión fuerte para carga rápida con poco internet
    });

    if (!result.canceled && result.assets[0].uri) {
      try {
        const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        setPFotoUri(`data:image/jpeg;base64,${base64}`);
      } catch (e) {
        setPFotoUri(result.assets[0].uri);
      }
    }
  };

  const confirmarReserva = async (r: Reserva) => {
    try {
      await updateDoc(doc(db, 'reservas', r.id), { estado: 'confirmada' });
      Alert.alert('Confirmada', 'La reserva fue confirmada.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo confirmar.');
    }
  };

  const confirmarPedido = async (p: PedidoPersonalizado) => {
    try {
      await updateDoc(doc(db, 'pedidos_personalizados', p.id), { estado: 'confirmada' });
      Alert.alert('Confirmado', 'El pedido fue confirmado.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo confirmar.');
    }
  };

  const abrirChat = (p: PedidoPersonalizado) => {
    setModalChat({ id: p.clienteUid, nombre: p.clienteNombre });
  };

  const enviarMensajeChat = async () => {
    if (!user || !modalChat || !mensaje.trim()) return;
    try {
      await addDoc(collection(db, 'chats_tienda'), {
        tiendaUid: user.uid,
        tiendaNombre: user.nombre,
        clienteUid: modalChat.id,
        clienteNombre: modalChat.nombre,
        texto: mensaje.trim(),
        autorUid: user.uid,
        autorNombre: user.nombre,
        createdAt: serverTimestamp(),
      });
      setMensaje('');
      Alert.alert('Enviado', 'Mensaje enviado al cliente.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo enviar.');
    }
  };

  const abrirAgregarProducto = () => {
    const activos = misProductos.filter((p) => p.activo !== false);
    if (activos.length >= LIMITE_PRODUCTOS) {
      Alert.alert(
        'Límite alcanzado',
        `Límite de ${LIMITE_PRODUCTOS} productos alcanzado. Elimina uno antiguo para subir uno nuevo.`
      );
      return;
    }
    setModalProducto(true);
  };

  const guardarProducto = async () => {
    if (!user) return;
    if (!pNombre || !pPrecio) {
      Alert.alert('Faltan datos', 'Completa nombre y precio.');
      return;
    }
    setGuardando(true);
    try {
      await addDoc(collection(db, 'productos'), {
        tiendaUid: user.uid,
        tiendaNombre: user.nombre,
        nombre: pNombre.trim(),
        descripcion: pDesc.trim(),
        precio: Number(pPrecio),
        stock: Number(pStock) || 10,
        flash: pFlash,
        categoria: pCategoria,
        imagenUrl: pFotoUri || null, // Foto sincronizada visible para todos
        activo: true,
        createdAt: serverTimestamp(),
      });
      Alert.alert('Producto agregado', 'Tu producto está en la vitrina.');
      setModalProducto(false);
      setPNombre('');
      setPDesc('');
      setPPrecio('');
      setPStock('10');
      setPFlash(false);
      setPFotoUri(null);
      setPCategoria('Bodegas');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  };

  const eliminarProducto = (p: MiProducto) => {
    Alert.alert(
      'Eliminar producto',
      `¿Eliminar "${p.nombre}" de tu vitrina?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'productos', p.id));
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'No se pudo eliminar.');
            }
          },
        },
      ]
    );
  };

  const activos = misProductos.filter((p) => p.activo !== false);

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Pressable onPress={() => router.replace('/(tabs)/perfil')}>
            <ArrowLeft color="#111827" size={24} />
          </Pressable>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#111827' }}>Panel de tienda</Text>
        </View>

        <View style={{ flexDirection: 'row', backgroundColor: '#e5e7eb', borderRadius: 14, padding: 4 }}>
          {(['vitrina', 'reservas', 'pedidos'] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                alignItems: 'center',
                backgroundColor: tab === t ? '#fff' : 'transparent',
              }}
            >
              <Text style={{ fontWeight: '700', fontSize: 12, color: tab === t ? '#059669' : '#6b7280' }}>
                {t === 'vitrina' ? 'Mi Vitrina' : t === 'reservas' ? 'Reservas' : 'Pedidos'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color="#059669" style={{ marginTop: 40 }} />
      ) : tab === 'vitrina' ? (
        <FlatList
          data={misProductos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          ListHeaderComponent={
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>Mi Vitrina</Text>
                  <Text style={{ color: '#9ca3af', fontSize: 13 }}>{activos.length}/{LIMITE_PRODUCTOS} productos</Text>
                </View>
                <Pressable
                  onPress={abrirAgregarProducto}
                  disabled={activos.length >= LIMITE_PRODUCTOS}
                  style={{
                    backgroundColor: activos.length >= LIMITE_PRODUCTOS ? '#d1d5db' : '#059669',
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Plus color="#fff" size={18} />
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Agregar</Text>
                </Pressable>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Store color="#d1d5db" size={40} />
              <Text style={{ color: '#9ca3af', marginTop: 12 }}>Tu vitrina está vacía. Agrega tu primer producto.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View
              style={{
                backgroundColor: '#fff',
                borderRadius: 18,
                padding: 14,
                marginBottom: 12,
                flexDirection: 'row',
                gap: 12,
                borderWidth: 1,
                borderColor: '#f3f4f6',
              }}
            >
              {item.imagenUrl ? (
                <Image source={{ uri: item.imagenUrl }} style={{ width: 64, height: 64, borderRadius: 14 }} resizeMode="cover" />
              ) : (
                <View style={{ width: 64, height: 64, borderRadius: 14, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' }}>
                  <Package color="#9ca3af" size={26} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontWeight: '700', color: '#111827', fontSize: 15, flex: 1 }} numberOfLines={1}>{item.nombre}</Text>
                  {item.flash && (
                    <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                      <Text style={{ color: '#d97706', fontWeight: '700', fontSize: 10 }}>FLASH</Text>
                    </View>
                  )}
                </View>
                <Text style={{ color: '#6b7280', fontSize: 12 }}>{item.categoria} · Stock: {item.stock}</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#059669', marginTop: 4 }}>S/ {item.precio}</Text>
              </View>
              <Pressable
                onPress={() => eliminarProducto(item)}
                style={{ alignSelf: 'center', width: 36, height: 36, borderRadius: 18, backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center' }}
              >
                <Trash2 color="#ef4444" size={18} />
              </Pressable>
            </View>
          )}
        />
      ) : tab === 'reservas' ? (
        <FlatList
          data={reservas}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Package color="#d1d5db" size={40} />
              <Text style={{ color: '#9ca3af', marginTop: 12 }}>No tienes reservas aún.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f3f4f6' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <View>
                  <Text style={{ fontWeight: '700', color: '#111827', fontSize: 16 }}>{item.productoNombre}</Text>
                  <Text style={{ color: '#9ca3af', fontSize: 13 }}>{item.clienteNombre}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#059669' }}>x{item.cantidad}</Text>
                  {item.estado === 'pendiente' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <Clock color="#f59e0b" size={12} />
                      <Text style={{ color: '#d97706', fontSize: 11, fontWeight: '600' }}>Pendiente</Text>
                    </View>
                  )}
                  {item.estado === 'confirmada' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <CheckCircle2 color="#059669" size={12} />
                      <Text style={{ color: '#059669', fontSize: 11, fontWeight: '600' }}>Confirmada</Text>
                    </View>
                  )}
                </View>
              </View>
              {item.nota ? (
                <View style={{ backgroundColor: '#f9fafb', borderRadius: 10, padding: 10, marginBottom: 10 }}>
                  <Text style={{ color: '#6b7280', fontSize: 13 }}>Nota: {item.nota}</Text>
                </View>
              ) : null}
              {item.estado === 'pendiente' && (
                <Pressable onPress={() => confirmarReserva(item)} style={{ backgroundColor: '#059669', paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Confirmar reserva</Text>
                </Pressable>
              )}
            </View>
          )}
        />
      ) : (
        <FlatList
          data={pedidos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <ShoppingBag color="#d1d5db" size={40} />
              <Text style={{ color: '#9ca3af', marginTop: 12 }}>No hay pedidos personalizados.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f3f4f6' }}>
              <Text style={{ fontWeight: '700', color: '#111827', fontSize: 16 }}>{item.clienteNombre}</Text>
              <Text style={{ color: '#9ca3af', fontSize: 13, marginBottom: 8 }}>Cel: {item.clienteCelular}</Text>
              <View style={{ backgroundColor: '#f9fafb', borderRadius: 10, padding: 12, marginBottom: 10 }}>
                <Text style={{ color: '#374151', fontSize: 14 }}>{item.descripcion}</Text>
              </View>
              {item.fotoUrl && (
                <Image source={{ uri: item.fotoUrl }} style={{ width: '100%', height: 160, borderRadius: 14, marginBottom: 10 }} resizeMode="cover" />
              )}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable onPress={() => confirmarPedido(item)} style={{ flex: 1, backgroundColor: '#059669', paddingVertical: 12, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 color="#fff" size={18} />
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Confirmar</Text>
                </Pressable>
                <Pressable onPress={() => abrirChat(item)} style={{ flex: 1, backgroundColor: '#fff', paddingVertical: 12, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#e5e7eb' }}>
                  <MessageCircle color="#059669" size={18} />
                  <Text style={{ color: '#059669', fontWeight: '700' }}>Contactar</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      {/* Modal mini-chat */}
      <Modal visible={!!modalChat} transparent animationType="slide" onRequestClose={() => setModalChat(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'web' ? undefined : 'padding'} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MessageCircle color="#059669" size={22} />
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>Chat con {modalChat?.nombre}</Text>
              </View>
              <Pressable onPress={() => setModalChat(null)}>
                <X color="#6b7280" size={24} />
              </Pressable>
            </View>
            <TextInput
              value={mensaje}
              onChangeText={setMensaje}
              placeholder="Escribe un mensaje..."
              multiline
              style={{
                backgroundColor: '#f9fafb',
                borderRadius: 14,
                paddingHorizontal: 14,
                paddingVertical: 14,
                fontSize: 15,
                minHeight: 60,
                textAlignVertical: 'top',
                borderWidth: 1,
                borderColor: '#e5e7eb',
              }}
            />
            <Pressable onPress={enviarMensajeChat} style={{ backgroundColor: '#059669', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 12, flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
              <Send color="#fff" size={18} />
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Enviar</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal agregar producto con Compresión Cloud */}
      <Modal visible={modalProducto} transparent animationType="slide" onRequestClose={() => setModalProducto(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'web' ? undefined : 'padding'} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, maxHeight: '90%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827' }}>Agregar producto</Text>
              <Pressable onPress={() => setModalProducto(false)}>
                <X color="#6b7280" size={24} />
              </Pressable>
            </View>

            <Text style={styles.label}>Foto real del producto (opcional)</Text>
            <Pressable
              onPress={seleccionarFotoProducto}
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
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: pFotoUri ? '#d1fae5' : '#f3f4f6', justifyContent: 'center', alignItems: 'center' }}>
                {pFotoUri ? <CheckCircle2 color="#059669" size={22} /> : <Upload color="#6b7280" size={22} />}
              </View>
              <Text style={{ flex: 1, color: '#374151', fontSize: 14 }}>
                {pFotoUri ? 'Foto de producto seleccionada' : 'Toca para elegir de tu galería'}
              </Text>
            </Pressable>

            {pFotoUri && (
              <View style={{ alignItems: 'center', marginTop: 12 }}>
                <Image source={{ uri: pFotoUri }} style={{ width: 90, height: 90, borderRadius: 14 }} resizeMode="cover" />
              </View>
            )}

            <Text style={styles.label}>Nombre del producto</Text>
            <TextInput value={pNombre} onChangeText={setPNombre} placeholder="Ej: Arroz 5kg" style={styles.input} />

            <Text style={styles.label}>Descripción corta</Text>
            <TextInput value={pDesc} onChangeText={setPDesc} placeholder="Ej: Arroz extra, grano largo" multiline style={[styles.input, { minHeight: 50, textAlignVertical: 'top' }]} />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Precio (S/)</Text>
                <TextInput value={pPrecio} onChangeText={setPPrecio} placeholder="Ej: 12" keyboardType="numeric" style={styles.input} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Stock</Text>
                <TextInput value={pStock} onChangeText={setPStock} placeholder="10" keyboardType="numeric" style={styles.input} />
              </View>
            </View>

            <Text style={styles.label}>Categoría</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
              {CATEGORIAS.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setPCategoria(cat)}
                  style={{
                    backgroundColor: pCategoria === cat ? '#059669' : '#fff',
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                    marginRight: 8,
                    borderWidth: 1,
                    borderColor: pCategoria === cat ? '#059669' : '#e5e7eb',
                  }}
                >
                  <Text style={{ fontWeight: '700', fontSize: 13, color: pCategoria === cat ? '#fff' : '#6b7280' }}>{cat}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable
              onPress={() => setPFlash(!pFlash)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 }}
            >
              <Switch value={pFlash} onValueChange={setPFlash} trackColor={{ true: '#fbbf24', false: '#d1d5db' }} />
              <Text style={{ color: '#374151', fontSize: 14, fontWeight: '600' }}>Oferta Flash</Text>
            </Pressable>

            <Pressable onPress={guardarProducto} disabled={guardando} style={{ backgroundColor: guardando ? '#a7f3d0' : '#059669', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 16 }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>{guardando ? 'Guardando...' : 'Publicar producto'}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
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