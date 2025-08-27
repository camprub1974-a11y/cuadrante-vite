// js/main.js (VERSIÓN FINAL CON CORRECCIÓN DE SINCRONIZACIÓN)

import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { setUser, currentUser, pendingNotificationsCount, selectedMonthId, selectedAgentId } from './state.js';
import { loadInitialAgents, updateNotificationCount } from './dataController.js';
import { initSelectors } from './ui/selectorManager.js';
import { showLoginScreen, showAppContent, showLoading, hideLoading, displayMessage } from './ui/viewManager.js';
import { loadAndDisplaySchedule } from './logic.js';

// Importación de las funciones de renderizado de cada vista
import { renderPlanningView, resetPlanningView } from './ui/planningView.js';
import { renderReportsList, resetReportsListView } from './ui/reportsListView.js';
import { renderExtraServicesView, resetExtraServicesView } from './ui/extraServicesRenderer.js';
import { renderAdminDashboard } from './ui/adminDashboardView.js';
import { renderRegistroView, resetRegistroView } from './ui/registroView.js';
import { renderCroquisView, resetCroquisView } from './ui/croquisView.js';
import { renderServiceReport } from './ui/serviceReportView.js';
import { renderTemplateManagerView } from './ui/templateManagerView.js'; // <-- Ya estaba importada, solo faltaba usarla
import { renderActivityFeed } from './ui/activityFeedRenderer.js';

// Importación de los inicializadores de modales y componentes
import { initializeAgentManagerModal } from './ui/agentManagerModal.js';
import { initializeRequestPermissionModal } from './ui/requestPermissionModal.js';
import { initializeManageRequestsModal, showManageRequestsModal } from './ui/manageRequestsModal.js';
import { initializeProposeChangeModal } from './ui/proposeChangeModal.js';
import { initializeRespondToProposalModal } from './ui/respondToProposalModal.js';
import { initializeShiftModal } from './ui/shiftModal.js';
import { initializeViewSelectorModal, showViewSelectorModal } from './ui/viewSelectorModal.js';
import { initializeManagementSelectorModal, showManagementSelectorModal } from './ui/managementSelectorModal.js';
import { initializeAddMarkedDateModal } from './ui/addMarkedDateModal.js';
import { initializeExtraServiceModal } from './ui/extraServiceModal.js';
import { initializeServiceOrderModal } from './ui/serviceOrderModal.js';
import { initializeAssignmentModal } from './ui/assignmentModal.js';
import { initializeReportEntryModal } from './ui/reportEntryModal.js';
import { initializeDefaultOrderTemplateModal } from './ui/defaultOrderTemplateModal.js';
import { initializeReportSummaryModal } from './ui/reportSummaryModal.js';
import { initializeAddRequerimientoModal } from './ui/addRequerimientoModal.js';
import { initializeRegistroModal } from './ui/registroModal.js';

const viewContainer = document.getElementById('app-view-container');
let appInitialized = false;
let currentLoadedView = null;

async function loadViewAndInitialize(viewName, renderFunction) {
    if (currentLoadedView === viewName) return;

    // ... otros resets
    if (currentLoadedView === 'servicios_extra') resetExtraServicesView();
    if (currentLoadedView === 'planificacion') resetPlanningView();
    if (currentLoadedView === 'registro_electronico') resetRegistroView();
    if (currentLoadedView === 'croquizador') resetCroquisView();
    if (currentLoadedView === 'partes_servicio') resetReportsListView();
    
    showLoading(`Cargando ${viewName}...`);
    try {
        const response = await fetch(`/views/${viewName}.html?v=${new Date().getTime()}`);
        if (!response.ok) throw new Error(`El archivo /views/${viewName}.html no existe.`);
        const html = await response.text();
        viewContainer.innerHTML = html;
        currentLoadedView = viewName;

        await new Promise(resolve => setTimeout(resolve, 0)); 

        if (renderFunction) await renderFunction();

    } catch (error) {
        console.error(`Error al cargar la vista ${viewName}:`, error);
        displayMessage(`Error al cargar la sección.`, "error");
    } finally {
        hideLoading();
    }
}

function updateActiveTab(viewName) {
    document.querySelectorAll('.module-nav .module-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    const activeTab = document.querySelector(`.module-tab[data-view="${viewName}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
}

export async function showScheduleView() {
    await loadViewAndInitialize('cuadrante', async () => {
        updateActiveTab('cuadrante');
        
         // ✅ LÍNEA AÑADIDA: Busca la sidebar y le quita la clase 'hidden'.
        document.querySelector('.sidebar-column')?.classList.remove('hidden'); 

        const managementSelectorBtn = document.getElementById('management-selector-btn');
        if (managementSelectorBtn) {
            managementSelectorBtn.addEventListener('click', showManagementSelectorModal);
        }
        await initSelectors();
        loadAndDisplaySchedule(selectedMonthId.get(), selectedAgentId.get());
    });
}

export async function showPlanningView() {
    await loadViewAndInitialize('planificacion', () => {
        updateActiveTab('planificacion');
        renderPlanningView();
    });
}

export async function showReportsListView() {
    await loadViewAndInitialize('partes_servicio', () => {
        updateActiveTab('partes_servicio');
        renderReportsList();
    });
}

export async function showExtraServicesView() {
    await loadViewAndInitialize('servicios_extra', () => {
        updateActiveTab('servicios_extra');
        renderExtraServicesView();
    });
}

export async function showAdminDashboardView() {
    await loadViewAndInitialize('registros_estadisticas', () => {
        updateActiveTab('registros_estadisticas');
        renderAdminDashboard();
    });
}

export async function showRegistroView() {
    await loadViewAndInitialize('registro_electronico', () => {
        updateActiveTab('registro_electronico');
        renderRegistroView();
    });
}

export async function showCroquisView() {
    await loadViewAndInitialize('croquizador', async () => {
        updateActiveTab('croquis');
        await renderCroquisView();
    });
}

// ✅ FUNCIÓN AÑADIDA QUE FALTABA
export async function showTemplateManagerView() {
    await loadViewAndInitialize('template_manager', () => {
        // Mantenemos 'registro_electronico' como la pestaña activa para consistencia
        updateActiveTab('registro_electronico');
        // Llamamos a la función que renderiza el contenido de la vista
        renderTemplateManagerView();
    });
}

export function showServiceReportView(reportId) { 
    viewContainer.innerHTML = '<div id="service-report-view" class="view-content"></div>';
    currentLoadedView = 'service-report-detail';
    updateActiveTab('partes_servicio');
    renderServiceReport(reportId); 
}

// ... (El resto del archivo, desde handleAuthStateChange hasta el final, se mantiene exactamente igual)
async function handleAuthStateChange(user) {
    if (user) {
        if (appInitialized) return;
        showLoading("Verificando usuario...");
        try {
            const userDocRef = doc(db, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                const userProfile = { uid: user.uid, email: user.email, role: userData.role || 'guard', agentId: String(userData.agentId || ''), displayName: userData.name || userData.agentId };
                setUser(userProfile);
                showAppContent(userProfile.agentId);
                await initializeAppData();
                appInitialized = true;
                await showScheduleView();
            } else {
                displayMessage("Perfil de usuario no encontrado en la base de datos.", "error");
                await signOut(auth);
            }
        } catch (error) {
            console.error("Error en handleAuthStateChange:", error);
            await signOut(auth);
        } finally {
            hideLoading();
        }
    } else {
        showLoginScreen();
        appInitialized = false;
        currentLoadedView = null;
    }
}

async function initializeAppData() {
    try {
        await loadInitialAgents();
        
        initializeAgentManagerModal();
        initializeRequestPermissionModal();
        initializeManageRequestsModal();
        initializeProposeChangeModal();
        initializeRespondToProposalModal();
        initializeShiftModal();
        initializeViewSelectorModal();
        initializeManagementSelectorModal();
        initializeAddMarkedDateModal();
        initializeExtraServiceModal();
        initializeServiceOrderModal();
        initializeAssignmentModal();
        initializeReportEntryModal();
        initializeDefaultOrderTemplateModal();
        initializeReportSummaryModal();
        initializeAddRequerimientoModal();
        initializeRegistroModal();
        
        configureMainNavigationAndButtons();
        await updateNotificationCount();
        renderActivityFeed();

        document.addEventListener('viewReport', (event) => { if (event.detail.reportId) showServiceReportView(event.detail.reportId); });
        document.addEventListener('scheduleShouldRefresh', async () => {
            await loadAndDisplaySchedule(selectedMonthId.get(), selectedAgentId.get());
        });
        
    } catch (error) {
        console.error("Error crítico al cargar los componentes de la aplicación:", error);
    }
}

function configureMainNavigationAndButtons() {
    const userProfile = currentUser.get();
    const isMando = userProfile?.role === 'admin' || userProfile?.role === 'supervisor';
    
    const cleanAndListen = (element, handler) => {
        if (!element) return;
        const newElement = element.cloneNode(true); 
        element.parentNode.replaceChild(newElement, element);
        newElement.addEventListener('click', (e) => { e.preventDefault(); handler(e); });
    };

    const loggedInUserDisplay = document.getElementById('logged-in-user-display');
    if (loggedInUserDisplay) {
        loggedInUserDisplay.textContent = userProfile.agentId;
    }

    document.querySelectorAll('.module-tab').forEach(tab => {
        const view = tab.dataset.view;
        const handler = {
            'cuadrante': showScheduleView,
            'planificacion': showPlanningView,
            'partes_servicio': showReportsListView,
            'servicios_extra': showExtraServicesView,
            'registros_estadisticas': showAdminDashboardView,
            'registro_electronico': showRegistroView,
            'croquis': showCroquisView
        }[view];

        const isMandoView = ['planificacion', 'registros_estadisticas'].includes(view);
        if (isMandoView && !isMando) {
            tab.style.display = 'none';
        } else if(handler) {
            cleanAndListen(tab, handler);
        }
    });
    
    cleanAndListen(document.getElementById('logout-button-header'), handleLogout);

    const notificationBellButton = document.getElementById('notification-bell-button');
    if (notificationBellButton) {
        cleanAndListen(notificationBellButton, showManageRequestsModal);
        const badge = notificationBellButton.querySelector('#notification-badge');
        pendingNotificationsCount.subscribe(count => {
            if (badge) {
                badge.textContent = count > 9 ? '9+' : count;
                badge.classList.toggle('hidden', count === 0);
            }
        });
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    showLoading();
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        hideLoading();
        displayMessage("Nº de identificación o contraseña incorrectos.", 'error');
    }
}

async function handleLogout() {
    showLoading();
    try {
        await signOut(auth);
    } catch (error) {
        displayMessage(`Error al cerrar sesión.`, 'error');
    } finally {
        hideLoading();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, handleAuthStateChange);
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
});