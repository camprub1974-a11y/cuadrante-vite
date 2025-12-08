// Archivo: src/components/LegacyAuthSync.jsx
import { useEffect } from 'react';
import { auth, db } from '../../js/firebase-config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { setUser } from '../../js/state'; // Importamos el setter del estado antiguo

export const LegacyAuthSync = () => {
  useEffect(() => {
    // Escuchar cambios en la autenticación de Firebase
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Obtener datos del perfil (rol, agentId) necesarios para dataController
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            // Construir el perfil completo como lo espera el código antiguo
            const userProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: userData.role || 'guard',
              agentId: String(userData.agentId || ''),
              displayName: userData.name || 'Usuario',
              ...userData
            };
            
            // 🔥 AQUÍ OCURRE LA MAGIA: Actualizamos el estado legacy
            setUser(userProfile);
            console.log("✅ Sistema Legacy sincronizado con usuario:", userProfile.agentId);
          }
        } catch (error) {
          console.error("Error sincronizando perfil legacy:", error);
        }
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  return null; // Este componente no renderiza nada visualmente
};