import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CheckCircle, ShieldCheck, Phone, Eye, EyeOff } from 'lucide-react-native';
import { useAuthStore } from '@/store/useAuthStore';

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const registrar = useAuthStore((s) => s.registrar);
  const loading = useAuthStore((s) => s.loading);

  const [modo, setModo] = useState<'login' | 'registro'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false); // Estado para mostrar/ocultar clave
  const [nombre, setNombre] = useState('');
  const [celular, setCelular] = useState('');
  const [caserio, setCaserio] = useState('');
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [aceptaAntiEstafa, setAceptaAntiEstafa] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!email || !password) {
      setError('Completa correo y contraseña.');
      return;
    }
    if (modo === 'registro') {
      if (!nombre || !celular || !caserio) {
        setError('Completa todos los campos para registrarte.');
        return;
      }
      if (celular.replace(/\D/g, '').length < 6) {
        setError('El celular es obligatorio y debe ser válido.');
        return;
      }
      if (!aceptaTerminos || !aceptaAntiEstafa) {
        setError('Debes aceptar los Términos y el compromiso anti-estafa.');
        return;
      }
      try {
        await registrar(email, password, { nombre, celular, caserio });
        router.replace('/(tabs)');
      } catch (e: any) {
        setError(mensajeAuth(e));
      }
      return;
    }
    try {
      await login(email, password);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(mensajeAuth(e));
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'web' ? undefined : 'padding'}
      style={{ flex: 1, backgroundColor: '#f9fafb' }}
    >
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              backgroundColor: '#059669',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <ShieldCheck color="#fff" size={32} />
          </View>
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#111827' }}>
            Rutas Express
          </Text>
          <Text style={{ fontSize: 15, color: '#6b7280', marginTop: 4 }}>
            Transporte, tienda y comunidad local
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            backgroundColor: '#e5e7eb',
            borderRadius: 14,
            padding: 4,
            marginBottom: 20,
          }}
        >
          {(['login', 'registro'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setModo(m)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                alignItems: 'center',
                backgroundColor: modo === m ? '#fff' : 'transparent',
              }}
            >
              <Text
                style={{
                  fontWeight: '700',
                  color: modo === m ? '#059669' : '#6b7280',
                  fontSize: 15,
                }}
              >
                {m === 'login' ? 'Ingresar' : 'Registrarse'}
              </Text>
            </Pressable>
          ))}
        </View>

        {modo === 'registro' && (
          <>
            <Campo label="Nombre completo" value={nombre} onChange={setNombre} placeholder="Tu nombre" />
            <Campo
              label="Celular"
              value={celular}
              onChange={setCelular}
              placeholder="999 999 999"
              icon={<Phone color="#9ca3af" size={18} />}
              keyboardType="phone-pad"
            />
            <Campo
              label="Caserío / zona"
              value={caserio}
              onChange={setCaserio}
              placeholder="Ej: San José"
            />
          </>
        )}

        <Campo
          label="Correo electrónico"
          value={email}
          onChange={setEmail}
          placeholder="correo@ejemplo.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* CAMPO DE CONTRASEÑA CON EL BOTÓN DEL OJO */}
        <View style={{ marginBottom: 14 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
            Contraseña
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#fff',
              borderRadius: 14,
              paddingHorizontal: 14,
              borderWidth: 1,
              borderColor: '#e5e7eb',
            }}
          >
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry={!verPassword}
              autoCapitalize="none"
              style={{ flex: 1, paddingVertical: 14, fontSize: 16, color: '#111827' }}
            />
            <Pressable onPress={() => setVerPassword(!verPassword)} style={{ padding: 4 }}>
              {verPassword ? <EyeOff color="#6b7280" size={20} /> : <Eye color="#6b7280" size={20} />}
            </Pressable>
          </View>
        </View>

        {modo === 'registro' && (
          <View style={{ marginTop: 8, gap: 10 }}>
            <CheckLegal
              texto="Acepto los Términos de servicio"
              marcado={aceptaTerminos}
              onToggle={() => setAceptaTerminos((v) => !v)}
            />
            <CheckLegal
              texto="Me comprometo con las normas anti-estafa"
              marcado={aceptaAntiEstafa}
              onToggle={() => setAceptaAntiEstafa((v) => !v)}
            />
          </View>
        )}

        {error && (
          <View
            style={{
              marginTop: 16,
              backgroundColor: '#fef2f2',
              borderRadius: 12,
              padding: 12,
              borderLeftWidth: 4,
              borderLeftColor: '#ef4444',
            }}
          >
            <Text style={{ color: '#b91c1c', fontSize: 14 }}>{error}</Text>
          </View>
        )}

        <Pressable
          onPress={handleSubmit}
          disabled={loading}
          style={{
            backgroundColor: loading ? '#a7f3d0' : '#059669',
            paddingVertical: 16,
            borderRadius: 16,
            alignItems: 'center',
            marginTop: 24,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 17 }}>
            {loading ? 'Procesando...' : modo === 'login' ? 'Ingresar' : 'Crear cuenta'}
          </Text>
        </Pressable>

        <Text
          style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 20 }}
        >
          Al continuar confirmas tener +18 años.{'\n'}
          Esta app no se responsabiliza de acuerdos privados.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Campo({
  label,
  value,
  onChange,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences';
  icon?: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#fff',
          borderRadius: 14,
          paddingHorizontal: 14,
          borderWidth: 1,
          borderColor: '#e5e7eb',
        }}
      >
        {icon && <View style={{ marginRight: 8 }}>{icon}</View>}
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? 'sentences'}
          style={{ flex: 1, paddingVertical: 14, fontSize: 16, color: '#111827' }}
        />
      </View>
    </View>
  );
}

function CheckLegal({
  texto,
  marcado,
  onToggle,
}: {
  texto: string;
  marcado: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 7,
          borderWidth: 2,
          borderColor: marcado ? '#059669' : '#d1d5db',
          backgroundColor: marcado ? '#059669' : '#fff',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {marcado && <CheckCircle color="#fff" size={16} />}
      </View>
      <Text style={{ flex: 1, color: '#374151', fontSize: 14 }}>{texto}</Text>
    </Pressable>
  );
}

function mensajeAuth(e: any): string {
  const code = e?.code ?? '';
  if (code.includes('invalid-credential') || code.includes('wrong-password'))
    return 'Correo o contraseña incorrectos.';
  if (code.includes('email-already-in-use')) return 'Ese correo ya está registrado.';
  if (code.includes('weak-password')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (code.includes('network-request-failed'))
    return 'Sin conexión. Revisa tu internet e intenta de nuevo.';
  return e?.message ?? 'Ocurrió un error. Intenta de nuevo.';
}