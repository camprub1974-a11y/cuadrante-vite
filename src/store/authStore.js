// Archivo: /src/store/authStore.js

import { create } from 'zustand';
import { doc, getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'; 
import { db, auth } from '../../js/firebase-config'; 

export const useAuthStore = create((set) => ({
  user: null,      
  loading: true,   // Inicia cargando
  
  // --- LOGIN ---
  login: async (email, password) => {
      set({ loading: true });
      try {
          await signInWithEmailAndPassword(auth, email, password);
          // No hacemos nada más aquí, onAuthStateChanged se encargará del resto
      } catch (error) {
          set({ loading: false });
          throw error; 
      }
  },

  // --- CHECK AUTH (EL LISTENER) ---
  checkAuth: () => {
    // Devolvemos una promesa que se resuelve cuando tenemos la primera respuesta de Firebase
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // 1. Usuario autenticado en Firebase Auth
                try {
                    const userProfileDoc = await getDoc(doc(db, 'users', user.uid));
                    
                    if (userProfileDoc.exists()) {
                        const userProfile = { 
                            uid: user.uid, 
                            email: user.email, 
                            ...userProfileDoc.data() 
                        };
                        // ✅ ÉXITO: Guardamos usuario y quitamos loading
                        set({ user: userProfile, loading: false });
                    } else {
                        console.error("No se encontró perfil en Firestore");
                        set({ user: null, loading: false });
                        // Opcional: forzar logout si no tiene perfil
                        await signOut(auth);
                    }
                } catch (error) {
                    console.error("Error obteniendo perfil:", error);
                    set({ user: null, loading: false });
                }
            } else {
                // 2. No hay usuario (Logout o no logueado)
                // ✅ IMPORTANTE: Solo actualizamos estado, NO redirigimos con window.location
                set({ user: null, loading: false });
            }
            resolve(); // Resolvemos la promesa inicial
        });
        // Nota: Mantenemos la suscripción activa para cambios futuros
    });
  },

  // --- LOGOUT ---
  logout: async () => {
    set({ loading: true });
    try {
        await signOut(auth);
        set({ user: null, loading: false });
        // Aquí no hace falta redirigir, App.jsx detectará user=null y mostrará LoginPage
    } catch (error) {
        console.error("Error al salir:", error);
        set({ loading: false });
    }
  }
}));