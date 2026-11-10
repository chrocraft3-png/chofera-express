import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  ArrowLeft,
  Crown,
  LayoutGrid,
  CheckCircle2,
  X,
  UserCheck,
  AlertTriangle,
} from 'lucide-react-native';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/useAuthStore';
import type { Usuario } from '@/types';

interface VoucherMembresia {
  id: string;
  usuarioUid: string;
  usuarioNombre: string;
  plan: string;
  monto: number;
  fotoUrl: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  createdAt: any;
}

interface VoucherMural {
  id: string;
  clienteUid: string;
  clienteNombre: string;
  descripcion: string;
  fotoVoucherUrl: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  createdAt: any;
}

type AdminTab = 'vip' | 'mural' | 'equipo';

export default function AdminDashboardScreen() {
  const user = useAuthStore((s) => s.user) as Usuario | null;
  const router = useRouter();

  const [tab, setTab] = useState<AdminTab>('vip');
  const [vouchersVip, setVouchersVip] = useState<VoucherMembresia[]>([]);
  const [vouchersMural, setVouchersMural] = useState<VoucherMural[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalImagen, setModalImagen] = useState<string | null>(null);

  const esSuperAdmin = user?.rol === 'super_admin';
  const esModerador = user?.rol === 'moderador';

  useEffect(() => {
    if (!user || (!esSuperAdmin && !esModerador)) return;

    // 1. Escuchar Vouchers de Membresías VIP
    const qVip = query(collection(db, 'vouchers_membresias'), where('estado', '==', 'pendiente'));
    const unsubVip = onSnapshot(qVip, (snap) => {
      const lista: VoucherMembresia[] = [];
      snap.forEach((d) => lista.push({ id: d.id, ...(d.data() as any) }));
      setVouchersVip(lista);
      setLoading(false);
    }, () => setLoading(false));

    // 2. Escuchar Vouchers del Mural / Pedidos (S/ 3)
    const qMural = query(collection(db, 'vouchers_mural'), where('estado', '==', 'pendiente'));
    const unsubMural = onSnapshot(qMural, (snap) => {
      const lista: VoucherMural[] = [];
      snap.forEach((d) => lista.push({ id: d.id, ...(d.data() as any) }));
      setVouchersMural(lista);
    });

    return () => {
      unsubVip();
      unsubMural();
    };
  }, [user]);

  // Aprobar Membresía VIP
  const aprobarVip = async (v: VoucherMembresia) => {
    try {
      await updateDoc(doc(db, 'vouchers_membresias', v.id), {
        estado: 'aprobado',
        revisadoPor: user?.nombre,
        updatedAt: serverTimestamp(),
      });
      Alert.alert('Éxito', 'Membresía VIP aprobada correctamente.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo aprobar.');
    }
  };

  // Aprobar Anuncio/Pedido del Mural (S/ 3)
  const aprobarMural = async (v: VoucherMural) => {
    try {
      await updateDoc(doc(db, 'vouchers_mural', v.id), {
        estado: 'aprobado',
        revisadoPor: user?.nombre,
        updatedAt: serverTimestamp(),
      });
      Alert.alert('Éxito', 'Anuncio del Mural aprobado y publicado.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo aprobar.');
    }
  };

  if (!user || (!esSuperAdmin && !esModerador)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f9fafb' }}>
        <AlertTriangle color="#ef4444" size={48} />
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827', marginTop: 12 }}>Acceso Denegado</Text>
        <Text style={{ color: '#6b7280', textAlign: 'center', marginTop: 6, marginBottom: 20 }}>
          No tienes permisos de administración para ver este panel.
        </Text>
        <Pressable onPress={() => router.replace('/(tabs)/perfil')} style={{ backgroundColor: '#059669', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Volver al perfil</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f3f4f6' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Pressable onPress={() => router.replace('/(tabs)/perfil')}>
            <ArrowLeft color="#111827" size={24} />
          </Pressable>
          <View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827' }}>Panel de Administración</Text>
            <Text style={{ color: '#6b7280', fontSize: 13 }}>Control de pagos y validaciones</Text>
          </View>
        </View>

        {/* Pestañas de Navegación Admin separadas */}
        <View style={{ flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 14, padding: 4 }}>
          {(['vip', 'mural', 'equipo'] as const).map((t) => (
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
              <Text style={{ fontWeight: '700', fontSize: 11, color: tab === t ? '#059669' : '#6b7280' }}>
                {t === 'vip' ? 'Vouchers VIP' : t === 'mural' ? 'Vouchers Mural (S/3)' : 'Ayudantes'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color="#059669" style={{ marginTop: 40 }} />
      ) : tab === 'vip' ? (
        /* BANDEJA 1: MEMBRESÍAS VIP */
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 12 }}>
            Validación de Membresías VIP (Choferes / Tiendas)
          </Text>
          {vouchersVip.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Crown color="#d1d5db" size={40} />
              <Text style={{ color: '#9ca3af', marginTop: 12 }}>No hay vouchers de membresía pendientes.</Text>
            </View>
          ) : (
            vouchersVip.map((item) => (
              <View key={item.id} style={{ backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#e5e7eb' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontWeight: '700', color: '#111827', fontSize: 16 }}>{item.usuarioNombre}</Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#059669' }}>S/ {item.monto}</Text>
                </View>
                <Text style={{ color: '#6b7280', fontSize: 13, marginBottom: 10 }}>Plan solicitado: <Text style={{ fontWeight: '700', color: '#111827' }}>{item.plan}</Text></Text>

                {item.fotoUrl && (
                  <Pressable onPress={() => setModalImagen(item.fotoUrl)} style={{ marginBottom: 12 }}>
                    <Image source={{ uri: item.fotoUrl }} style={{ width: '100%', height: 180, borderRadius: 12 }} resizeMode="cover" />
                    <Text style={{ color: '#059669', fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 4 }}>Toca para ampliar comprobante</Text>
                  </Pressable>
                )}

                <Pressable onPress={() => aprobarVip(item)} style={{ backgroundColor: '#059669', paddingVertical: 12, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                  <CheckCircle2 color="#fff" size={18} />
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Aprobar Membresía VIP</Text>
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>
      ) : tab === 'mural' ? (
        /* BANDEJA 2: ANUNCIOS Y PEDIDOS DEL MURAL (S/ 3) */
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 12 }}>
            Validación de Anuncios / Pedidos Mural (S/ 3)
          </Text>
          {vouchersMural.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <LayoutGrid color="#d1d5db" size={40} />
              <Text style={{ color: '#9ca3af', marginTop: 12 }}>No hay pagos de anuncios pendientes.</Text>
            </View>
          ) : (
            vouchersMural.map((item) => (
              <View key={item.id} style={{ backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#e5e7eb' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontWeight: '700', color: '#111827', fontSize: 16 }}>{item.clienteNombre}</Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#d97706' }}>S/ 3.00 (Anuncio)</Text>
                </View>
                <View style={{ backgroundColor: '#f9fafb', borderRadius: 10, padding: 10, marginBottom: 10 }}>
                  <Text style={{ color: '#374151', fontSize: 14 }}>{item.descripcion}</Text>
                </View>

                {item.fotoVoucherUrl && (
                  <Pressable onPress={() => setModalImagen(item.fotoVoucherUrl)} style={{ marginBottom: 12 }}>
                    <Image source={{ uri: item.fotoVoucherUrl }} style={{ width: '100%', height: 180, borderRadius: 12 }} resizeMode="cover" />
                    <Text style={{ color: '#059669', fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 4 }}>Toca para ampliar voucher de pago</Text>
                  </Pressable>
                )}

                <Pressable onPress={() => aprobarMural(item)} style={{ backgroundColor: '#059669', paddingVertical: 12, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                  <CheckCircle2 color="#fff" size={18} />
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Aprobar y Publicar en Mural</Text>
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>
      ) : (
        /* PANEL DE AYUDANTES / MODERADORES */
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 6 }}>
            Control de Ayudantes y Moderadores
          </Text>
          <Text style={{ color: '#6b7280', fontSize: 13, marginBottom: 16 }}>
            {esSuperAdmin ? 'Tienes control total como Super Admin. Los moderadores solo pueden revisar vouchers pero no modificar ajustes globales.' : 'Estás operando en modo moderador con accesos limitados.'}
          </Text>

          <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <UserCheck color="#059669" size={24} />
              <View>
                <Text style={{ fontWeight: '700', color: '#111827', fontSize: 15 }}>Tu Rango Actual:</Text>
                <Text style={{ color: '#059669', fontWeight: '800', textTransform: 'uppercase', fontSize: 13 }}>{user.rol}</Text>
              </View>
            </View>
            <Text style={{ color: '#6b7280', fontSize: 13, lineHeight: 20 }}>
              Los ayudantes revisan comprobantes de Yape/Plin con agilidad para mantener la app activa en Tambogrande y CP3 sin comprometer la seguridad del sistema.
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Modal para ampliar imagen de voucher */}
      <Modal visible={!!modalImagen} transparent animationType="fade" onRequestClose={() => setModalImagen(null)}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)', padding: 20 }}>
          <Pressable onPress={() => setModalImagen(null)} style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, backgroundColor: '#fff', padding: 8, borderRadius: 20 }}>
            <X color="#111827" size={24} />
          </Pressable>
          {modalImagen && (
            <Image source={{ uri: modalImagen }} style={{ width: '100%', height: '80%', borderRadius: 16 }} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </View>
  );
}