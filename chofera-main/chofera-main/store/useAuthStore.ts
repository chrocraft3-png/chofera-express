import { create } from 'zustand';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { Rol, Usuario } from '@/types';

interface AuthState {
  user: Usuario | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  inicializado: boolean;
  init: () => () => void;
  login: (email: string, password: string) => Promise<void>;
  registrar: (
    email: string,
    password: string,
    data: { nombre: string; celular: string; caserio: string }
  ) => Promise<void>;
  logout: () => Promise<void>;
  refrescarPerfil: () => Promise<void>;
  solicitarRol: (rol: Rol) => Promise<void>;
}

const APP_VERSION = '1.0.0';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  firebaseUser: null,
  loading: false,
  inicializado: false,

  init: () => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const perfil = await cargarPerfil(fbUser.uid);
        set({ firebaseUser: fbUser, user: perfil, inicializado: true });
      } else {
        set({ firebaseUser: null, user: null, inicializado: true });
      }
    });
    return unsub;
  },

  login: async (email, password) => {
    set({ loading: true });
    try {
      await signInWithEmailAndPassword(auth, email, password);
      const perfil = await cargarPerfil(auth.currentUser!.uid);
      set({ user: perfil, firebaseUser: auth.currentUser });
    } finally {
      set({ loading: false });
    }
  },

  registrar: async (email, password, data) => {
    set({ loading: true });
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: data.nombre });
      const nuevo: Usuario = {
        uid: cred.user.uid,
        nombre: data.nombre,
        celular: data.celular,
        rol: 'cliente',
        caserio: data.caserio,
        strikes: 0,
        viajes_completados: 0,
        calificacion_promedio: 5,
        fecha_fin_prueba: null,
        ventas_mural_mes: 0,
      };
      await setDoc(doc(db, 'usuarios', cred.user.uid), {
        ...nuevo,
        createdAt: serverTimestamp(),
      });
      set({ user: nuevo, firebaseUser: cred.user });
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    await signOut(auth);
    set({ user: null, firebaseUser: null });
  },

  refrescarPerfil: async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const perfil = await cargarPerfil(uid);
    set({ user: perfil });
  },

  solicitarRol: async (rol: Rol) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const fin = new Date();
    fin.setDate(fin.getDate() + 7);
    await updateDoc(doc(db, 'usuarios', uid), {
      rol,
      fecha_fin_prueba: fin.toISOString(),
    });
    await get().refrescarPerfil();
  },
}));

async function cargarPerfil(uid: string): Promise<Usuario | null> {
  const snap = await getDoc(doc(db, 'usuarios', uid));
  if (!snap.exists()) return null;
  const d = snap.data() as any;
  return {
    uid,
    nombre: d.nombre ?? '',
    celular: d.celular ?? '',
    rol: d.rol ?? 'cliente',
    caserio: d.caserio ?? '',
    strikes: d.strikes ?? 0,
    viajes_completados: d.viajes_completados ?? 0,
    calificacion_promedio: d.calificacion_promedio ?? 5,
    fecha_fin_prueba: d.fecha_fin_prueba ?? null,
    ventas_mural_mes: d.ventas_mural_mes ?? 0,
  };
}

export { APP_VERSION };
