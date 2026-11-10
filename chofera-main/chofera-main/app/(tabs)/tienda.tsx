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
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  Zap,
  Store,
  X,
  Package,
  Heart,
  Edit3,
  Trash2,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/useAuthStore';
import { useSoundAlerta } from '@/hooks/useSoundAlerta';
import type { CategoriaTienda, Usuario } from '@/types';

interface Producto {
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
  createdAt: any;
}

const CATEGORIAS: ('Todas' | CategoriaTienda)[] = [
  'Todas',
  'Bodegas',
  'Ferreterías',
  'Carnicerías',
  'Farmacias',
];

export default function TiendaScreen() {
  const user = useAuthStore((s) => s.user) as Usuario | null;
  const { reproducir } = useSoundAlerta();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriaSel, setCategoriaSel] = useState<'Todas' | CategoriaTienda>('Todas');
  const [modalReserva, setModalReserva] = useState<Producto | null>(null);

  // Estados para reserva
  const [cantidad, setCantidad] = useState('1');
  const [nota, setNota] = useState('');
  const [procesando, setProcesando] = useState(false);

  // Estados para Edición de Producto propio
  const [modalEditar, setModalEditar] = useState<Producto | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editPrecio, setEditPrecio] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'productos'), where('activo', '!=', false));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const lista: Producto[] = [];
        snap.forEach((d) => {
          const data = d.data() as any;
          if (data.nombre && data.precio) {
            lista.push({ id: d.id, ...data });
          }
        });
        lista.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
        setProductos(lista);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, []);

  const reservar = async () => {
    if (!user || !modalReserva || procesando) return;
    const cant = Number(cantidad);
    if (!cant || cant <= 0) {
      Alert.alert('Cantidad inválida', 'Ingresa una cantidad válida.');
      return;
    }
    setProcesando(true);
    try {
      await addDoc(collection(db, 'reservas'), {
        productoId: modalReserva.id,
        productoNombre: modalReserva.nombre,
        tiendaUid: modalReserva.tiendaUid,
        clienteUid: user.uid,
        clienteNombre: user.nombre,
        cantidad: cant,
        nota,
        estado: 'pendiente',
        createdAt: serverTimestamp(),
      });
      reproducir('exito');
      Alert.alert('Reserva enviada', 'La tienda confirmará tu reserva.');
      setModalReserva(null);
      setCantidad('1');
      setNota('');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo reservar.');
    } finally {
      setProcesando(false);
    }
  };

  const abrirEdicion = (prod: Producto) => {
    setModalEditar(prod);
    setEditNombre(prod.nombre);
    setEditPrecio(String(prod.precio));
    setEditStock(String(prod.stock));
    setEditDescripcion(prod.descripcion || '');
  };

  const guardarEdicion = async () => {
    if (!modalEditar || procesando) return;
    setProcesando(true);
    try {
      await updateDoc(doc(db, 'productos', modalEditar.id), {
        nombre: editNombre.trim(),
        precio: Number(editPrecio),
        stock: Number(editStock),
        descripcion: editDescripcion.trim(),
      });
      Alert.alert('Actualizado', 'Tu producto ha sido modificado.');
      setModalEditar(null);
    } catch (e) {
      Alert.alert('Error', 'No se pudo actualizar el producto.');
    } finally {
      setProcesando(false);
    }
  };

  const eliminarProducto = async (prodId: string) => {
    Alert.alert('Eliminar producto', '¿Estás seguro de borrar este producto de la tienda?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sí, eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'productos', prodId));
            Alert.alert('Eliminado', 'El producto fue retirado.');
          } catch (e) {
            Alert.alert('Error', 'No se pudo eliminar.');
          }
        },
      },
    ]);
  };

  const productosFiltrados =
    categoriaSel === 'Todas'
      ? productos
      : productos.filter((p) => p.categoria === categoriaSel);

  const flash = productosFiltrados.filter((p) => p.flash);
  const normales = productosFiltrados.filter((p) => !p.flash);

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 }}>
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#111827' }}>Tienda</Text>
        <Text style={{ fontSize: 15, color: '#6b7280', marginTop: 2 }}>
          Productos locales y ofertas flash en Tambogrande
        </Text>
      </View>

      {/* Filtro por categorías */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }}
        style={{ maxHeight: 52 }}
      >
        {CATEGORIAS.map((cat) => (
          <Pressable
            key={cat}
            onPress={() => setCategoriaSel(cat)}
            style={{
              backgroundColor: categoriaSel === cat ? '#059669' : '#fff',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              marginRight: 8,
              borderWidth: 1,
              borderColor: categoriaSel === cat ? '#059669' : '#e5e7eb',
            }}
          >
            <Text
              style={{
                fontWeight: '700',
                fontSize: 13,
                color: categoriaSel === cat ? '#fff' : '#6b7280',
              }}
            >
              {cat}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <FlatList
        data={normales}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        ListHeaderComponent={
          <View>
            {flash.length > 0 && (
              <View style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <Zap color="#f59e0b" size={22} fill="#f59e0b" />
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>Ofertas Flash</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {flash.map((p) => {
                    const esMio = p.tiendaUid === user?.uid;
                    return (
                      <View
                        key={p.id}
                        style={{
                          width: 160,
                          backgroundColor: '#fff',
                          borderRadius: 18,
                          padding: 14,
                          marginRight: 12,
                          borderWidth: 2,
                          borderColor: '#fbbf24',
                        }}
                      >
                        {p.imagenUrl ? (
                          <Image source={{ uri: p.imagenUrl }} style={{ width: '100%', height: 80, borderRadius: 12, marginBottom: 8 }} resizeMode="cover" />
                        ) : (
                          <View style={{ width: '100%', height: 80, borderRadius: 12, backgroundColor: '#fef3c7', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                            <Package color="#f59e0b" size={28} />
                          </View>
                        )}
                        <Text style={{ fontWeight: '700', color: '#111827', fontSize: 14 }} numberOfLines={1}>{p.nombre}</Text>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: '#059669', marginTop: 4 }}>S/ {p.precio}</Text>
                        
                        {esMio ? (
                          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                            <Pressable onPress={() => abrirEdicion(p)} style={{ flex: 1, backgroundColor: '#e0f2fe', paddingVertical: 6, borderRadius: 8, alignItems: 'center' }}>
                              <Edit3 color="#0284c7" size={14} />
                            </Pressable>
                            <Pressable onPress={() => eliminarProducto(p.id)} style={{ flex: 1, backgroundColor: '#fee2e2', paddingVertical: 6, borderRadius: 8, alignItems: 'center' }}>
                              <Trash2 color="#dc2626" size={14} />
                            </Pressable>
                          </View>
                        ) : (
                          <Pressable
                            onPress={() => setModalReserva(p)}
                            style={{ backgroundColor: '#fbbf24', paddingVertical: 8, borderRadius: 10, alignItems: 'center', marginTop: 8 }}
                          >
                            <Text style={{ fontWeight: '800', color: '#1f2937', fontSize: 13 }}>Reservar</Text>
                          </Pressable>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, marginTop: 4 }}>
              <Heart color="#059669" size={20} />
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>Productos {categoriaSel !== 'Todas' ? `· ${categoriaSel}` : ''}</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color="#059669" style={{ marginTop: 40 }} />
          ) : (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Store color="#d1d5db" size={40} />
              <Text style={{ color: '#9ca3af', marginTop: 12 }}>No hay productos en esta categoría.</Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const esMio = item.tiendaUid === user?.uid;
          return (
            <View
              style={{
                backgroundColor: '#fff',
                borderRadius: 18,
                padding: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: '#f3f4f6',
                shadowColor: '#000',
                shadowOpacity: 0.03,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              <View style={{ flexDirection: 'row', gap: 14 }}>
                {item.imagenUrl ? (
                  <Image source={{ uri: item.imagenUrl }} style={{ width: 72, height: 72, borderRadius: 14 }} resizeMode="cover" />
                ) : (
                  <View style={{ width: 72, height: 72, borderRadius: 14, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' }}>
                    <Package color="#9ca3af" size={28} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: '#111827', fontSize: 16 }}>{item.nombre}</Text>
                  <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 1 }}>{item.tiendaNombre} · {item.categoria}</Text>
                  <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }} numberOfLines={2}>{item.descripcion}</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: '#059669' }}>S/ {item.precio}</Text>
                    <Text style={{ color: '#9ca3af', fontSize: 12 }}>Stock: {item.stock}</Text>
                  </View>
                </View>
              </View>

              {esMio ? (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <Pressable
                    onPress={() => abrirEdicion(item)}
                    style={{ flex: 1, backgroundColor: '#e0f2fe', paddingVertical: 10, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}
                  >
                    <Edit3 color="#0284c7" size={16} />
                    <Text style={{ color: '#0284c7', fontWeight: '700' }}>Editar</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => eliminarProducto(item.id)}
                    style={{ flex: 1, backgroundColor: '#fee2e2', paddingVertical: 10, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}
                  >
                    <Trash2 color="#dc2626" size={16} />
                    <Text style={{ color: '#dc2626', fontWeight: '700' }}>Eliminar</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => setModalReserva(item)}
                  style={{
                    backgroundColor: '#059669',
                    paddingVertical: 12,
                    borderRadius: 12,
                    alignItems: 'center',
                    marginTop: 12,
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Reservar</Text>
                </Pressable>
              )}
            </View>
          );
        }}
      />

      {/* Modal Reserva */}
      <Modal visible={!!modalReserva} transparent animationType="slide" onRequestClose={() => setModalReserva(null)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827' }}>Reservar</Text>
              <Pressable onPress={() => setModalReserva(null)}>
                <X color="#6b7280" size={24} />
              </Pressable>
            </View>
            <Text style={{ color: '#374151', fontSize: 15, marginBottom: 4 }}>{modalReserva?.nombre}</Text>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#059669', marginBottom: 16 }}>S/ {modalReserva?.precio}</Text>

            <Text style={styles.label}>Cantidad</Text>
            <TextInput value={cantidad} onChangeText={setCantidad} placeholder="1" keyboardType="numeric" style={styles.input} />

            <Text style={styles.label}>Nota (opcional)</Text>
            <TextInput
              value={nota}
              onChangeText={setNota}
              placeholder="Ej: sin azúcar, entregar en la puerta..."
              multiline
              style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]}
            />

            <Pressable onPress={reservar} disabled={procesando} style={{ backgroundColor: '#059669', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 12, opacity: procesando ? 0.7 : 1 }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>{procesando ? 'Enviando...' : 'Confirmar reserva'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal Editar Producto */}
      <Modal visible={modalEditar !== null} transparent animationType="slide" onRequestClose={() => setModalEditar(null)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827' }}>Editar Producto</Text>
              <Pressable onPress={() => setModalEditar(null)}>
                <X color="#6b7280" size={24} />
              </Pressable>
            </View>

            <Text style={styles.label}>Nombre</Text>
            <TextInput value={editNombre} onChangeText={setEditNombre} style={styles.input} />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Precio (S/)</Text>
                <TextInput value={editPrecio} onChangeText={setEditPrecio} keyboardType="numeric" style={styles.input} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Stock</Text>
                <TextInput value={editStock} onChangeText={setEditStock} keyboardType="numeric" style={styles.input} />
              </View>
            </View>

            <Text style={styles.label}>Descripción</Text>
            <TextInput value={editDescripcion} onChangeText={setEditDescripcion} multiline style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]} />

            <Pressable onPress={guardarEdicion} disabled={procesando} style={{ backgroundColor: '#0284c7', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 16, opacity: procesando ? 0.7 : 1 }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>{procesando ? 'Guardando...' : 'Guardar cambios'}</Text>
            </Pressable>
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