import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  User,
  Car,
  Store,
  Star,
  TrendingUp,
  AlertTriangle,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Clock,
  Package,
  CheckCircle2,
  Crown,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/useAuthStore';
import type { Rol } from '@/types';

export default function PerfilScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const solicitarRol = useAuthStore((s) => s.solicitarRol);
  const refrescarPerfil = useAuthStore((s) => s.refrescarPerfil);
  const router = useRouter();
  const [solicitando, setSolicitando] = useState(false);
  const [modalConfirma, setModalConfirma] = useState<Rol | null>(null);
  const [modalExito, setModalExito] = useState(false);
  const [errorRol, setErrorRol] = useState<string | null>(null);

  // Estados para los formularios adicionales por rol
  const [placa, setPlaca] = useState('');
  const [nombreTienda, setNombreTienda] = useState('');
  const [referenciaTienda, setReferenciaTienda] = useState('');

  if (!user) {
    router.replace('/(auth)/login');
    return null;
  }

  const pruebaActiva =
    user.fecha_fin_prueba && new Date(user.fecha_fin_prueba) > new Date();
  const pruebaVencida =
    user.fecha_fin_prueba && new Date(user.fecha_fin_prueba) <= new Date();

  const ejecutarSolicitudRol = async (rol: Rol) => {
    if (rol === 'chofer' && !placa.trim()) {
      setErrorRol('Por favor ingresa el número de tu placa.');
      return;
    }
    if (rol === 'tienda' && (!nombreTienda.trim() || !referenciaTienda.trim())) {
      setErrorRol('Ingresa el nombre de la tienda y su referencia.');
      return;
    }

    setSolicitando(true);
    setErrorRol(null);
    try {
      await solicitarRol(rol);
      await refrescarPerfil();
      setModalConfirma(null);
      setPlaca('');
      setNombreTienda('');
      setReferenciaTienda('');
      setModalExito(true);
    } catch (e: any) {
      setErrorRol(e?.message ?? 'No se pudo activar la prueba.');
    } finally {
      setSolicitando(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f9fafb' }} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Header */}
      <View style={{ alignItems: 'center', paddingTop: 60, paddingBottom: 20 }}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: '#059669',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <User color="#fff" size={36} />
        </View>
        <Text style={{ fontSize: 24, fontWeight: '800', color: '#111827' }}>{user.nombre}</Text>
        <Text style={{ color: '#6b7280', fontSize: 15, marginTop: 2 }}>{user.caserio}</Text>
        <View
          style={{
            marginTop: 8,
            backgroundColor: '#d1fae5',
            paddingHorizontal: 14,
            paddingVertical: 4,
            borderRadius: 20,
          }}
        >
          <Text style={{ color: '#059669', fontWeight: '700', fontSize: 13, textTransform: 'capitalize' }}>
            {user.rol}
          </Text>
        </View>
      </View>

      {/* Stats Dinámicas según el rol */}
      <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {user.rol === 'tienda' ? (
            <>
              <StatCard
                icon={<Store color="#0891b2" size={22} />}
                valor="Activa"
                label="Mi Tienda"
              />
              <StatCard
                icon={<Package color="#059669" size={22} />}
                valor="CP3"
                label="Zona Local"
              />
            </>
          ) : user.rol === 'chofer' ? (
            <>
              <StatCard
                icon={<Star color="#fbbf24" size={22} fill="#fbbf24" />}
                valor={user.calificacion_promedio > 0 ? user.calificacion_promedio.toFixed(1) : '5.0'}
                label="Calificación"
              />
              <StatCard
                icon={<TrendingUp color="#059669" size={22} />}
                valor={String(user.viajes_completados ?? 0)}
                label="Viajes"
              />
            </>
          ) : (
            <>
              <StatCard
                icon={<Star color="#fbbf24" size={22} fill="#fbbf24" />}
                valor="Cliente"
                label="Cuenta"
              />
              <StatCard
                icon={<TrendingUp color="#059669" size={22} />}
                valor={String(user.viajes_completados ?? 0)}
                label="Rutas"
              />
            </>
          )}
          <StatCard
            icon={<AlertTriangle color={(user.strikes ?? 0) >= 3 ? '#ef4444' : '#9ca3af'} size={22} />}
            valor={String(user.strikes ?? 0)}
            label="Strikes"
          />
        </View>
      </View>

      {/* Período de prueba */}
      {pruebaActiva && (
        <View style={{ marginHorizontal: 20, marginBottom: 16 }}>
          <View
            style={{
              backgroundColor: '#fef3c7',
              borderRadius: 16,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              borderWidth: 1,
              borderColor: '#fde68a',
            }}
          >
            <Clock color="#d97706" size={24} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: '#92400e' }}>Prueba activa</Text>
              <Text style={{ color: '#92400e', fontSize: 13 }}>
                Vence el {new Date(user.fecha_fin_prueba!).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Solicitar rol chofer o tienda si es cliente */}
      {user.rol === 'cliente' && !user.fecha_fin_prueba && (
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 12 }}>
            ¿Quieres ganar dinero?
          </Text>
          <RolCard
            icon={<Car color="#fff" size={22} />}
            titulo="Convertirme en chofer"
            desc="Transporta personas y gana por ruta"
            color="#059669"
            onPress={() => setModalConfirma('chofer')}
            loading={solicitando}
          />
          <View style={{ height: 12 }} />
          <RolCard
            icon={<Store color="#fff" size={22} />}
            titulo="Abrir mi tienda"
            desc="Vende productos locales con ofertas flash"
            color="#0891b2"
            onPress={() => setModalConfirma('tienda')}
            loading={solicitando}
          />
        </View>
      )}

      {/* Prueba vencida */}
      {pruebaVencida && (
        <View style={{ marginHorizontal: 20, marginBottom: 16 }}>
          <View
            style={{
              backgroundColor: '#fef2f2',
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: '#fecaca',
            }}
          >
            <Text style={{ fontWeight: '700', color: '#b91c1c', marginBottom: 4 }}>
              Tu período de prueba venció
            </Text>
            <Text style={{ color: '#7f1d1d', fontSize: 13, marginBottom: 12 }}>
              Si tu prueba fue exitosa, contacta al administrador o renueva tu plan VIP.
            </Text>
            <Pressable
              onPress={() => router.push('/planes')}
              style={{ backgroundColor: '#059669', paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Ver Planes VIP</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Accesos según rol y botón de Membresías VIP */}
      <View style={{ paddingHorizontal: 20 }}>
        {/* Acceso directo a Planes VIP para Choferes y Tiendas */}
        <Pressable
          onPress={() => router.push('/planes')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            backgroundColor: '#fff',
            borderRadius: 18,
            padding: 16,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: '#059669',
          }}
        >
          <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center' }}>
            <Crown color="#059669" size={22} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', color: '#111827', fontSize: 15 }}>Membresías y Planes VIP</Text>
            <Text style={{ color: '#6b7280', fontSize: 13 }}>Mejora tu cuenta con Yape o Plin</Text>
          </View>
          <ChevronRight color="#9ca3af" size={22} />
        </Pressable>

        {user.rol === 'tienda' && (
          <AccesoCard
            icon={<Package color="#059669" size={22} />}
            titulo="Panel de reservas"
            desc="Gestiona reservas y pedidos"
            onPress={() => router.push('/(vendedor)/reservas')}
          />
        )}
        {(user.rol === 'moderador' || user.rol === 'super_admin') && (
          <AccesoCard
            icon={<ShieldCheck color="#059669" size={22} />}
            titulo="Panel de administración"
            desc="Yapes, baneos y purga de chats"
            onPress={() => router.push('/(admin)/dashboard')}
          />
        )}
      </View>

      {/* Logout */}
      <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
        <Pressable
          onPress={handleLogout}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingVertical: 14,
            borderRadius: 16,
            backgroundColor: '#fff',
            borderWidth: 1,
            borderColor: '#fecaca',
          }}
        >
          <LogOut color="#ef4444" size={20} />
          <Text style={{ color: '#ef4444', fontWeight: '700' }}>Cerrar sesión</Text>
        </Pressable>
      </View>

      {/* Modal con Formulario para Chofer o Tienda */}
      <Modal visible={!!modalConfirma} transparent animationType="fade" onRequestClose={() => setModalConfirma(null)}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 24 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 28, width: '100%', maxWidth: 380 }}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                {modalConfirma === 'chofer' ? <Car color="#059669" size={32} /> : <Store color="#059669" size={32} />}
              </View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827', textAlign: 'center' }}>
                {modalConfirma === 'chofer' ? 'Registro de Chofer' : 'Registro de Tienda'}
              </Text>
              <Text style={{ color: '#6b7280', fontSize: 13, textAlign: 'center', marginTop: 4 }}>
                Completa tus datos para activar 7 días de prueba gratis.
              </Text>
            </View>

            {modalConfirma === 'chofer' ? (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 6 }}>Número de Placa / Vehículo</Text>
                <TextInput
                  value={placa}
                  onChangeText={setPlaca}
                  placeholder="Ej: 4859-FP (Moto/Auto)"
                  style={{ backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 }}
                />
              </View>
            ) : (
              <View style={{ marginBottom: 16, gap: 10 }}>
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 6 }}>Nombre de la Tienda</Text>
                  <TextInput
                    value={nombreTienda}
                    onChangeText={setNombreTienda}
                    placeholder="Ej: Bodega San Martín"
                    style={{ backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 }}
                  />
                </View>
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 6 }}>Referencia de ubicación</Text>
                  <TextInput
                    value={referenciaTienda}
                    onChangeText={setReferenciaTienda}
                    placeholder="Ej: Frente al parque principal CP3"
                    style={{ backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 }}
                  />
                </View>
              </View>
            )}

            {errorRol && (
              <View style={{ backgroundColor: '#fef2f2', borderRadius: 10, padding: 10, marginBottom: 12 }}>
                <Text style={{ color: '#b91c1c', fontSize: 13, textAlign: 'center' }}>{errorRol}</Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <Pressable
                onPress={() => { setModalConfirma(null); setErrorRol(null); }}
                disabled={solicitando}
                style={{ flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center', backgroundColor: '#f3f4f6' }}
              >
                <Text style={{ color: '#6b7280', fontWeight: '700', fontSize: 15 }}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={() => ejecutarSolicitudRol(modalConfirma!)}
                disabled={solicitando}
                style={{ flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center', backgroundColor: solicitando ? '#a7f3d0' : '#059669' }}
              >
                {solicitando ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Registrar</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de éxito */}
      <Modal visible={modalExito} transparent animationType="fade" onRequestClose={() => setModalExito(false)}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 24 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 28, alignItems: 'center', width: '100%', maxWidth: 340 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <CheckCircle2 color="#059669" size={32} />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8, textAlign: 'center' }}>
              ¡Registro exitoso!
            </Text>
            <Text style={{ color: '#6b7280', fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 20 }}>
              Tu membresía y datos han sido guardados. Ya puedes operar en tu nuevo rol.
            </Text>
            <Pressable
              onPress={() => setModalExito(false)}
              style={{ backgroundColor: '#059669', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 16 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Entendido</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function StatCard({ icon, valor, label }: { icon: React.ReactNode; valor: string; label: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#f3f4f6' }}>
      {icon}
      <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827', marginTop: 6 }}>{valor}</Text>
      <Text style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

function RolCard({
  icon,
  titulo,
  desc,
  color,
  onPress,
  loading,
}: {
  icon: React.ReactNode;
  titulo: string;
  desc: string;
  color: string;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
      }}
    >
      <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: color, justifyContent: 'center', alignItems: 'center' }}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '700', color: '#111827', fontSize: 15 }}>{titulo}</Text>
        <Text style={{ color: '#6b7280', fontSize: 13 }}>{desc}</Text>
      </View>
      {loading ? (
        <ActivityIndicator color="#059669" />
      ) : (
        <ChevronRight color="#9ca3af" size={22} />
      )}
    </Pressable>
  );
}

function AccesoCard({
  icon,
  titulo,
  desc,
  onPress,
}: {
  icon: React.ReactNode;
  titulo: string;
  desc: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
      }}
    >
      <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center' }}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '700', color: '#111827', fontSize: 15 }}>{titulo}</Text>
        <Text style={{ color: '#6b7280', fontSize: 13 }}>{desc}</Text>
      </View>
      <ChevronRight color="#9ca3af" size={22} />
    </Pressable>
  );
}