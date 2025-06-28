// js/main.js

import { auth, db, app } from './firebase-config.js';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

// --- MEJORA: Importaciones centralizadas y estáticas ---
import { loadInitialAgents, updateNotificationCount } from './dataController.js';
import { setUser, setAvailableAgents, selectedMonthId, availableAgents, setDate, selectedYear, selectedAgentId, currentUser, pendingNotificationsCount } from './state.js';
import { initSelectors } from './ui/selectorManager.js';
import { initializeViewButtons, showLoginScreen, showAppContent, showLoading, hideLoading, displayMessage } from './ui/viewManager.js';
import { initializeAgentManagerModal, showAgentManagerModal } from './ui/agentManagerModal.js';
import { initializeRequestPermissionModal, showRequestPermissionModal } from './ui/requestPermissionModal.js';
import { initializeManageRequestsModal, showManageRequestsModal } from './ui/manageRequestsModal.js';
import { initializeProposeChangeModal } from './ui/proposeChangeModal.js';
import { initializeRespondToProposalModal } from './ui/respondToProposalModal.js';
import { initializeShiftModal } from './ui/shiftModal.js';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { loadAndDisplaySchedule } from './logic.js';
import { getMonthNumberFromName, formatDate } from './utils.js';
import { handlePrintButtonClick } from './print.js'; // IMPORTACIÓN CONFIRMADA

const functions = getFunctions(app);

/**
 * Gestiona los cambios en el estado de autenticación de Firebase.
 * Se ejecuta cuando el usuario inicia o cierra sesión.
 * @param {import('firebase/auth').User | null} user - El objeto de usuario de Firebase, o null si no está autenticado.
 */
async function handleAuthStateChange(user) {
    if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const userProfile = {
                uid: user.uid,
                email: user.email,
                ...userData,
                agentId: String(userData.agentId)
            };
            setUser(userProfile);
            showAppContent(userProfile.email);
            await initializeAppData(); // Carga todos los datos y la UI de la aplicación.
        } else {
            displayMessage("El perfil de usuario no se encontró en la base de datos.", "error");
            await signOut(auth);
        }
    } else {
        setUser(null);
        setAvailableAgents([]);
        showLoginScreen();
    }
}

/**
 * Inicializa los datos, la UI y los listeners de la aplicación una vez que el usuario está autenticado.
 */
async function initializeAppData() {
    showLoading();
    try {
        await loadInitialAgents();

        // Inicialización de componentes de la UI
        initializeViewButtons();
        initializeAgentManagerModal(); 
        initializeRequestPermissionModal();
        initializeManageRequestsModal();
        initializeProposeChangeModal();
        initializeRespondToProposalModal();
        initializeShiftModal(); 
        initializeNotificationBell();

        // Configuración de botones y selectores principales
        configureMainButtons();
        await initSelectors();
        
        await updateNotificationCount();

    } catch (error) {
        console.error("ERROR - main: Error al inicializar datos de la aplicación:", error);
        displayMessage("Error crítico al cargar la aplicación. Por favor, recarga la página.", 'error');
    } finally {
        hideLoading();
    }
}

/**
 * Configura los botones principales de la aplicación, mostrando/ocultando según el rol del usuario
 * y asignando sus respectivos manejadores de eventos.
 */
function configureMainButtons() {
    const userProfile = currentUser.get();
    const isAdmin = userProfile?.role === 'admin';

    const buttonConfigs = [
        { id: 'manageAgentsButton', handler: showAgentManagerModal, adminOnly: true },
        { id: 'requestPermissionButton', handler: showRequestPermissionModal, adminOnly: false },
        { id: 'logout-button', handler: handleLogout, adminOnly: false },
        { id: 'initializeMonthButton', handler: handleInitializeMonth, adminOnly: true },
        { id: 'manageRequestsButton', handler: showManageRequestsModal, adminOnly: true },
        { id: 'printButton', handler: handlePrintButtonClick, adminOnly: false }, 
    ];

    buttonConfigs.forEach(config => {
        const element = document.getElementById(config.id);
        if (element) {
            const shouldShow = !config.adminOnly || isAdmin;
            element.style.display = shouldShow ? 'block' : 'none';
            if (shouldShow) {
                element.removeEventListener('click', config.handler); // Prevenir duplicados
                element.addEventListener('click', config.handler);
                // --- LOG DE DEPURACIÓN AÑADIDO ---
                console.log(`[DEBUG - main] Botón ${config.id} configurado y visible.`);
                // --- FIN LOG ---
            } else {
                console.log(`[DEBUG - main] Botón ${config.id} oculto.`);
            }
        } else {
            console.warn(`[DEBUG - main] Botón no encontrado en DOM: ${config.id}`);
        }
    });
}

/**
 * Gestiona el envío del formulario de login.
 * @param {Event} event - El evento de envío del formulario.
 */
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        displayMessage("Por favor, introduce tu correo y contraseña.", "warning");
        return;
    }
    showLoading();
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        displayMessage(`Error de autenticación: ${error.code}`, 'error');
        console.error("Error de autenticación:", error);
    } finally {
        hideLoading();
    }
}

/**
 * Gestiona el cierre de sesión del usuario.
 */
async function handleLogout() {
    showLoading();
    try {
        await signOut(auth);
        displayMessage("Sesión cerrada correctamente.", "info");
    } catch (error) {
        displayMessage(`Error al cerrar sesión: ${error.message}`, 'error');
        console.error("Error al cerrar sesión:", error);
    } finally {
        hideLoading();
    }
}

/**
 * Gestiona la inicialización de un nuevo mes en el cuadrante (acción de admin).
 */
async function handleInitializeMonth() {
    const currentMonthId = selectedMonthId.get();
    const currentYear = selectedYear.get();
    
    if (!currentMonthId || isNaN(currentYear)) {
        displayMessage("Error: Mes o año no especificado para inicializar.", "error");
        return;
    }

    const peopleToInitialize = availableAgents.get().map(agent => agent.id); 
    if (!peopleToInitialize || peopleToInitialize.length === 0) {
        displayMessage("No hay agentes disponibles para inicializar el cuadrante.", "warning");
        return;
    }

    const monthNameFromId = currentMonthId.split('_')[1];
    const monthIndex = getMonthNumberFromName(monthNameFromId);
    if (monthIndex === null) { 
        displayMessage("Error: Nombre de mes inválido para inicializar.", "error");
        return;
    }

    showLoading();
    try {
        const initializeMonthCallable = httpsCallable(functions, 'initializeMonth');
        const result = await initializeMonthCallable({
            monthId: currentMonthId, 
            year: currentYear, 
            monthIndex: monthIndex, 
            peopleToInitialize: peopleToInitialize
        });
        
        displayMessage(result.data.message, result.data.status === 'success' ? 'success' : 'info');
        
        // Recargar el cuadrante para mostrar los datos recién inicializados
        await loadAndDisplaySchedule(
            currentMonthId, 
            selectedAgentId.get(), 
            document.getElementById('schedule-content'), 
            document.getElementById('currentMonthTitle'), 
            document.getElementById('printButton'), 
            document.getElementById('agent-select'),
            document.getElementById('seasonal-shift-note')
        );
    } catch (error) {
        displayMessage(`Error al inicializar mes: ${error.message}`, "error");
        console.error("ERROR - main: Error detallado al inicializar mes:", error);
    } finally {
        hideLoading();
    }
}

/**
 * Inicializa la campana de notificaciones y la suscribe a los cambios en el estado.
 */
function initializeNotificationBell() {
    const bellContainer = document.getElementById('notification-bell-container');
    const bellIcon = document.getElementById('notification-bell-icon');
    const countSpan = document.getElementById('notification-count');

    if (!bellContainer || !bellIcon || !countSpan) {
        console.warn("[DEBUG - main] Elementos de la campana de notificación no encontrados.");
        return;
    }

    pendingNotificationsCount.subscribe(count => {
        const hasNotifications = count > 0;
        countSpan.textContent = count;
        countSpan.style.display = hasNotifications ? 'inline-block' : 'none';
        bellIcon.classList.toggle('has-notifications', hasNotifications);
        bellContainer.style.display = hasNotifications ? 'flex' : 'none';
    });

    bellContainer.addEventListener('click', showManageRequestsModal);
}

// Punto de entrada de la aplicación
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, handleAuthStateChange);
    
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    } else {
        console.error("ERROR - main: El formulario de login no se encontró en el DOM.");
    }
});