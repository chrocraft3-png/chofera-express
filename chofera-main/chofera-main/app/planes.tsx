import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Crown, Upload } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/useAuthStore';

export default function PlanesScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [planSeleccionado, setPlanSeleccionado] = useState<{ id: string; nombre: string; precio: number } | null>(null);
  const [voucherUri, setVoucherUri] = useState<string | null>(null);
  const [nroOperacion, setNroOperacion] = useState('');
  const [enviando, setEnviando] = useState(false);

  const planes = [
    { id: '1', nombre: 'Mes de Prueba / Promo', precio: 3, desc: 'Ideal para empezar (Primer mes)' },
    { id: '2', nombre: 'Plan Estándar VIP', precio: 5, desc: 'Prioridad en rutas y alertas tempranas' },
    { id: '3', nombre: 'Plan Negocio Pro', precio: 10, desc: 'Sin comisiones para tiendas y choferes' },
    { id: '4', nombre: 'Plan Full Emperador', precio: 20, desc: 'Insignia dorada y soporte prioritario' },
  ];

  const seleccionarImagen = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setVoucherUri(result.assets[0].uri);
    }
  };

  const enviarComprobante = async () => {
    if (!user || !planSeleccionado || !nroOperacion.trim() || !voucherUri) {
      Alert.alert('Faltan datos', 'Selecciona un plan, ingresa el número de operación y adjunta la foto de tu voucher.');
      return;
    }

    setEnviando(true);
    try {
      await addDoc(collection(db, 'pagos_verificacion'), {
        uid: user.uid,
        nombreUsuario: user.nombre,
        rol: user.rol,
        plan: planSeleccionado.nombre,
        monto: planSeleccionado.precio,
        nroOperacion: nroOperacion.trim(),
        voucherUri: voucherUri,
        estado: 'pendiente',
        createdAt: serverTimestamp(),
      });

      Alert.alert('¡Comprobante enviado!', 'El administrador revisará tu pago y activará tu cuenta VIP en breve.');
      router.back();
    } catch (e: any) {
      Alert.alert('Error', 'No se pudo enviar el comprobante.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f9fafb' }} contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 40, marginBottom: 20, gap: 12 }}>
        <Pressable onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' }}>
          <ArrowLeft color="#111827" size={20} />
        </Pressable>
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827' }}>Membresías VIP</Text>
      </View>

      <Text style={{ color: '#6b7280', marginBottom: 16, fontSize: 14 }}>
        Elige tu plan, escanea el código QR y sube tu voucher de Yape o Plin para verificar tu pago.
      </Text>

      {planes.map((p) => {
        const seleccionado = planSeleccionado?.id === p.id;
        return (
          <Pressable
            key={p.id}
            onPress={() => setPlanSeleccionado(p)}
            style={{
              backgroundColor: seleccionado ? '#f0fdf4' : '#fff',
              borderWidth: 2,
              borderColor: seleccionado ? '#059669' : '#e5e7eb',
              borderRadius: 18,
              padding: 16,
              marginBottom: 12,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Crown color={seleccionado ? '#059669' : '#9ca3af'} size={18} />
                <Text style={{ fontWeight: '800', fontSize: 16, color: '#111827' }}>{p.nombre}</Text>
              </View>
              <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>{p.desc}</Text>
            </View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#059669' }}>S/ {p.precio}</Text>
          </Pressable>
        );
      })}

      {planSeleccionado && (
        <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20, marginTop: 10, borderWidth: 1, borderColor: '#e5e7eb' }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 10 }}>
            Paga S/ {planSeleccionado.precio} escaneando el QR
          </Text>

          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View style={{ width: 180, height: 180, backgroundColor: '#f3f4f6', borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#d1d5db' }}>
              <Text style={{ color: '#6b7280', fontSize: 12, textAlign: 'center' }}>[ Tu Código QR de Yape / Plin ]</Text>
            </View>
            <Text style={{ color: '#374151', fontWeight: '700', marginTop: 8 }}>Yape / Plin: 9XX XXX XXX (Gabo)</Text>
          </View>

          <Text style={{ fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 6 }}>Número de Operación / Recibo</Text>
          <TextInput
            value={nroOperacion}
            onChangeText={setNroOperacion}
            placeholder="Ej: 12345678"
            style={{ backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 16 }}
          />

          <Text style={{ fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 6 }}>Captura del Voucher</Text>
          <Pressable
            onPress={seleccionarImagen}
            style={{ backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#d1d5db', borderStyle: 'dashed', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 20 }}
          >
            {voucherUri ? (
              <Image source={{ uri: voucherUri }} style={{ width: 100, height: 100, borderRadius: 8 }} />
            ) : (
              <View style={{ alignItems: 'center' }}>
                <Upload color="#6b7280" size={24} />
                <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 6 }}>Toca para subir foto del voucher</Text>
              </View>
            )}
          </Pressable>

          <Pressable
            onPress={enviarComprobante}
            disabled={enviando}
            style={{ backgroundColor: '#059669', paddingVertical: 16, borderRadius: 16, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
              {enviando ? 'Enviando...' : 'Enviar comprobante para revisión'}
            </Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}