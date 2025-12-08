// ============================================================================
// js/main.js - VERSIÓN BRIDGE (Solo Datos)
// ============================================================================
// Este archivo mantiene el estado global (currentUser, selectedAgentId, etc.)
// sincronizado con Firebase Auth para que dataController.js siga funcionando.
// 
// 🛑 NO manipula el DOM ni hace redirecciones. De eso se encarga React (App.jsx).
// ============================================================================

import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import {
    setUser,
    currentUser,
    selectedAgentId,
    selectedMonthId,
    setAgent
} from '/js/state.js';
import {
    loadInitialAgents,
    updateNotificationCount
} from './dataController.js';

// Inicialización de efectos visuales globales (CSS variables, fondos)
import { initAllEffects } from './utils/uiEffects.js';

// =======================================================
// 1. INICIALIZACIÓN SILENCIOSA
// =======================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log("[main.js] DOM cargado. Modo: React Bridge (UI Legacy desactivada).");
    
    // Inicializamos solo efectos CSS globales si son necesarios
    try {
        initAllEffects();
    } catch (e) {
        console.warn("No se pudieron iniciar efectos visuales legacy:", e);
    }
});

// =======================================================
// 2. SINCRONIZACIÓN DE ESTADO DE DATOS
// =======================================================

// Escuchamos Auth SOLO para actualizar el estado en memoria (state.js).
// React (useAuthStore en App.jsx) manejará la redirección y la UI visual.
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // --- USUARIO CONECTADO ---
        try {
            // 1. Obtener rol y datos extra de Firestore
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            const userData = userDoc.exists() ? userDoc.data() : {};
            
            const userProfile = {
                uid: user.uid,
                email: user.email,
                role: userData.role || 'guard',
                agentId: String(userData.agentId || ''), 
                name: userData.name || user.email.split('@')[0],
                ...userData
            };

            // 2. Actualizar estado global (CRÍTICO para dataController.js)
            setUser(userProfile);
            
            // Fijar agente seleccionado por defecto en el estado global antiguo
            if (!selectedAgentId.get()) {
                if (userProfile.role === 'admin' || userProfile.role === 'supervisor') {
                    setAgent('all');
                } else if (userProfile.agentId) {
                    setAgent(userProfile.agentId);
                }
            }
            
            // 3. Cargar datos en segundo plano para que el dataController tenga caché
            loadInitialAgents().catch(err => console.warn("Error carga agentes bg:", err));
            updateNotificationCount().catch(err => console.warn("Error notificaciones bg:", err));
            
            console.log("[main.js] Estado global sincronizado para:", userProfile.email);

        } catch (error) {
            console.error("[main.js] Error sincronizando perfil:", error);
        }
    } else {
        // --- USUARIO DESCONECTADO ---
        setUser(null);
        console.log("[main.js] Estado global limpiado.");
    }
});

// =======================================================
// 3. EXPORTACIONES NEUTRALIZADAS (Para compatibilidad)
// =======================================================
// Estas funciones existen para que los imports en otros archivos no fallen,
// pero ya no hacen nada visual. La navegación la maneja React Router.

export function showScheduleView() {}
export function showPlanningView() {}
export function showReportsListView() {}
export function showTasksView() {}
export function showExtraServicesView() {}
export function showAdminDashboardView() {}
export function showCroquisView() {}
export function showIdentificacionesView() {}
export function showPlantillasView() {}
export function showRegistroView() {}
export function showServiceReportView() {}

// Exponer estado para depuración si es necesario
window.CuadranteApp = {
    state: { currentUser, selectedAgentId, selectedMonthId }
};