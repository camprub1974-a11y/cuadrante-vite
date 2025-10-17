<<<<<<< HEAD
// ============================================================================
// js/main.js - VERSIÓN CORREGIDA Y FUNCIONAL
// ============================================================================
// CAMBIOS CLAVE:
// 1. Función applyCalendarTheme() correctamente implementada
// 2. Eliminado 'theme' de calendarOptions
// 3. Exportación de currentCalendarInstance para debugging
// ============================================================================
=======
// js/main.js (VERSIÓN FINAL Y CORREGIDA)
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33

// --- IMPORTACIONES DE FIREBASE Y ESTADO ---
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { openRegistroModal, initializeRegistroModal } from './ui/registroModal.js'; 
import { initializeTemplateEditorModal } from './ui/templateEditorModal.js'; 
import { doc, getDoc } from 'firebase/firestore';
import {
  setUser,
  currentUser,
<<<<<<< HEAD
  selectedAgentId,
  selectedMonthId,
  pendingRequestsCount,
  MESES,
} from './state.js';
import {
    getScheduleForMonth,
    loadInitialAgents,
    updateNotificationCount,
  getMarkedDates,
} from './dataController.js';

// --- IMPORTACIONES DE GESTORES DE UI Y LIBRERÍAS ---
import { showLoginScreen, showAppContent, showLoading, hideLoading, displayMessage } from './ui/viewManager.js';
import { initSelectors } from './ui/selectorManager.js';

// --- IMPORTACIONES DE TOAST UI CALENDAR ---
import Calendar from '@toast-ui/calendar';
import '@toast-ui/calendar/dist/toastui-calendar.min.css';

// --- IMPORTACIONES DE VISTAS Y MÓDULOS ---
import { renderPlanningView } from './ui/planningView.js';
import { renderIdentificacionesView } from './ui/identificacionesView.js';
import { renderReportsList } from './ui/reportsListView.js';
import { renderTasksView } from './ui/tasksView.js';
import { renderExtraServicesView } from './ui/extraServicesRenderer.js';
=======
  pendingNotificationsCount,
  selectedMonthId,
  setPendingNotificationsCount,
  selectedAgentId,
  isEditModeActive,
  toggleEditMode,
  currentView,
  renderContext,
} from './state.js';
import {
  loadInitialAgents,
  updateNotificationCount,
  getScheduleForMonth,
  getMarkedDates,
} from './dataController.js';
import { initSelectors } from './ui/selectorManager.js';
import {
  showLoginScreen,
  showAppContent,
  showLoading,
  hideLoading,
  displayMessage,
} from './ui/viewManager.js';
import { renderPlanningView, resetPlanningView } from './ui/planningView.js';
import { renderIdentificacionesView } from './ui/identificacionesView.js';
import { renderReportsList, resetReportsListView } from './ui/reportsListView.js';
import { renderExtraServicesView, resetExtraServicesView } from './ui/extraServicesRenderer.js';
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
import { renderAdminDashboard } from './ui/adminDashboardView.js';
import { renderCroquisView } from './ui/croquisView.js';
import { renderRegistroView } from './ui/registroView.js';
import { renderPlantillasView } from './ui/plantillasView.js';
import { renderServiceReport } from './ui/serviceReportView.js';
<<<<<<< HEAD

// --- IMPORTACIONES DE MODALES ---
import { initializeShiftModal, showShiftDetailsPopup } from './ui/shiftModal.js';
import { initializeRegistroModal } from './ui/registroModal.js';
import { initializeTemplateEditorModal } from './ui/templateEditorModal.js';
import { showManagementSelectorModal, initializeManagementSelectorModal } from './ui/managementSelectorModal.js';
import { showUserRequestSelectorModal, initializeUserRequestSelectorModal } from './ui/userRequestSelectorModal.js';
import { showManageRequestsModal, initializeManageRequestsModal } from './ui/manageRequestsModal.js';
import { showViewSelectorModal, initializeViewSelectorModal } from './ui/viewSelectorModal.js';

// --- VARIABLES GLOBALES ---
=======
import { renderActivityFeed } from './ui/activityFeedRenderer.js';
import { initializeAgentManagerModal } from './ui/agentManagerModal.js';
import { initializePdfOptionsModal } from './ui/pdfOptionsModal.js';
import { initializeAgentTasksModal, showAgentTasksModal } from './ui/agentTasksModal.js';
import { initializeRequestPermissionModal } from './ui/requestPermissionModal.js';
import {
  initializeManageRequestsModal,
  showManageRequestsModal,
} from './ui/manageRequestsModal.js';
import { initializeProposeChangeModal } from './ui/proposeChangeModal.js';
import { initializeRespondToProposalModal } from './ui/respondToProposalModal.js';
import { initializeShiftModal } from './ui/shiftModal.js';
import { initializeViewSelectorModal, showViewSelectorModal } from './ui/viewSelectorModal.js';
import {
  initializeManagementSelectorModal,
  showManagementSelectorModal,
} from './ui/managementSelectorModal.js';
import { initializeAddMarkedDateModal } from './ui/addMarkedDateModal.js';
import { initializeExtraServiceModal } from './ui/extraServiceModal.js';
import { initializeReportEntryModal } from './ui/reportEntryModal.js';
import { initializeReportSummaryModal } from './ui/reportSummaryModal.js';
import { initializeDefaultOrderTemplateModal } from './ui/defaultOrderTemplateModal.js';
import { initializeAddRequerimientoModal } from './ui/addRequerimientoModal.js';
import { render } from './ui/scheduleRenderer.js';
import {
  initializeUserRequestSelectorModal,
  showUserRequestSelectorModal,
} from './ui/userRequestSelectorModal.js';
import { initializeEstablecimientoModal } from './ui/establecimientoModal.js';
import { renderPlantillasView, resetPlantillasView } from './ui/plantillasView.js';


// --- VARIABLES GLOBALES DEL MÓDULO ---
const viewContainer = document.getElementById('app-view-container');
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
let appInitialized = false;
let currentLoadedView = null;
let mainContentElement = null;
let currentCalendarInstance = null;
let unsubscribeFromCurrentView = () => {};

<<<<<<< HEAD
// Almacenamiento temporal de datos de shifts por ID de evento
const shiftsDataMap = new Map();

// ============================================================================
// FUNCIÓN AUXILIAR: Guardar datos de shifts
// ============================================================================

function storeShiftsData(eventId, shiftsData) {
    shiftsDataMap.set(eventId, shiftsData);
}

// ============================================================================
// FUNCIÓN AUXILIAR: Recuperar datos de shifts
// ============================================================================

function getShiftsData(eventId) {
    return shiftsDataMap.get(eventId);
}


// ============================================================================
// ✅ EXPORTAR currentCalendarInstance PARA DEBUGGING EN CONSOLA
// ============================================================================
// Esto permite acceder desde la consola: window.currentCalendarInstance
if (typeof window !== 'undefined') {
    window.getCurrentCalendarInstance = () => currentCalendarInstance;
    window.debugCalendar = {
        getInstance: () => currentCalendarInstance,
        getTheme: () => currentCalendarInstance?.getOptions?.(),
        applyTestTheme: () => {
            if (currentCalendarInstance) {
                currentCalendarInstance.setTheme({
                    month: {
                        weekend: { backgroundColor: '#ff0000' }
                    }
                });
                console.log('✅ Tema de prueba aplicado (rojo)');
            } else {
                console.error('❌ No hay instancia de calendario disponible');
            }
        }
    };
}

// --- PUNTO DE ENTRADA Y CICLO DE VIDA DE LA APP ---
document.addEventListener('DOMContentLoaded', () => {
    mainContentElement = document.getElementById('app-view-container');
    window.loadView = loadView;
    onAuthStateChanged(auth, handleAuthStateChange);
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
});

// --- LÓGICA PRINCIPAL DE AUTENTICACIÓN ---
async function handleAuthStateChange(user) {
    if (user) {
        if (appInitialized) return;
        showLoading('Iniciando sesión...');
        try {
            const userDocRef = doc(db, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (!userDocSnap.exists()) {
                throw new Error("Perfil de usuario no encontrado.");
            }
            const userData = userDocSnap.data();
            const userProfile = {
                uid: user.uid,
                email: user.email,
                role: userData.role || 'guard',
                agentId: String(userData.agentId || ''),
                displayName: userData.name || 'Usuario',
                ...userData
            };
            setUser(userProfile);

            if (userProfile.role === 'admin' || userProfile.role === 'supervisor') {
                selectedAgentId.set('all');
            } else {
                selectedAgentId.set(userProfile.agentId);
            }
            
            showAppContent(userProfile.agentId);
            await initializeAppData(userProfile);
            await window.loadView('cuadrante');
            appInitialized = true;
        } catch (error) {
            console.error('Error durante la autenticación:', error);
            displayMessage(error.message, 'error');
            await signOut(auth);
        } finally {
            hideLoading();
        }
    } else {
        showLoginScreen();
        setUser(null);
        appInitialized = false;
        unsubscribeFromCurrentView();
=======
// --- FUNCIONES DE INICIALIZACIÓN Y NAVEGACIÓN ---

// CADA VISTA AHORA GESTIONA SUS PROPIOS EVENTOS DE MODAL.

async function loadViewAndInitialize(viewName, renderFunction) {
  showLoading(`Cargando ${viewName}...`);
  try {
    const response = await fetch(`/views/${viewName}.html?v=${new Date().getTime()}`);
    if (!response.ok) throw new Error(`El archivo /views/${viewName}.html no existe.`);
    const htmlContent = await response.text();

    // --- ESTRATEGIA DE CARGA CORREGIDA ---
    // Se vacía el contenedor y se utiliza un parser para crear los nodos
    // de forma controlada, eliminando la condición de carrera.
    viewContainer.innerHTML = '';
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    viewContainer.append(...doc.body.childNodes);
    // --- FIN DE LA CORRECCIÓN ---

    currentLoadedView = viewName;

    if (window.feather) feather.replace();
    
    // Ahora, la función de renderizado se ejecuta con la certeza
    // de que los elementos HTML ya existen en el DOM.
    if (renderFunction) {
      await renderFunction();
    }

  } catch (error) {
    console.error(`Error al cargar la vista ${viewName}:`, error);
    displayMessage('Error al cargar la sección.', 'error');
  } finally {
    hideLoading();
  }
}

function updateActiveTab(viewName) {
  document
    .querySelectorAll('.module-nav .module-tab')
    .forEach((tab) => tab.classList.remove('active'));
  const activeTab = document.querySelector(
    `.module-tab[data-view="${viewName}"], .module-tab-dropdown-container .module-tab[data-view="${viewName}"]`
  );
  if (activeTab) {
    activeTab.classList.add('active');
    const parentDropdown = activeTab.closest('.module-tab-dropdown-container');
    if (parentDropdown) {
      parentDropdown.querySelector('.module-tab').classList.add('active');
    }
  }
}

// --- FUNCIONES PARA MOSTRAR CADA VISTA ---

export async function showScheduleView() {
  await loadViewAndInitialize('cuadrante', async () => {
    updateActiveTab('cuadrante');
    document.querySelector('.sidebar-column')?.classList.remove('hidden');

    const userProfile = currentUser.get();
    const editButton = document.getElementById('edit-mode-toggle');
    if (editButton) {
      if (userProfile && userProfile.role === 'admin') {
        editButton.style.display = 'inline-flex';
        const updateButtonState = () => {
          const isActive = isEditModeActive.get();
          editButton.innerHTML = isActive
            ? '<i data-feather="eye"></i><span>Modo Visor</span>'
            : '<i data-feather="edit-2"></i><span>Modo Editor</span>';
          if (window.feather) feather.replace();
          editButton.classList.toggle('active', isActive);
          document.body.classList.toggle('edit-mode-active', isActive);
        };
        editButton.addEventListener('click', () => {
          toggleEditMode();
          updateButtonState();
        });
        updateButtonState();
      } else {
        editButton.style.display = 'none';
      }
    }

    const managementButton = document.getElementById('management-selector-btn');
    if (managementButton) {
      if (userProfile && userProfile.role === 'admin') {
        managementButton.style.display = 'inline-flex';
        managementButton.addEventListener('click', showManagementSelectorModal);
      } else {
        managementButton.style.display = 'none';
      }
    }

    const userRequestsButton = document.getElementById('user-requests-selector-btn');
    if (userRequestsButton) {
      if (userProfile && userProfile.role !== 'admin') {
        userRequestsButton.style.display = 'inline-flex';
        userRequestsButton.addEventListener('click', showUserRequestSelectorModal);
      } else {
        userRequestsButton.style.display = 'none';
      }
    }

    document.getElementById('view-selector-btn')?.addEventListener('click', showViewSelectorModal);
    initSelectors();
    renderContext.subscribe(render);
    selectedMonthId.subscribe(refreshScheduleView);
    selectedAgentId.subscribe(refreshScheduleView);
    currentView.subscribe(refreshScheduleView);
    await refreshScheduleView();
    renderActivityFeed();
  });
}

export async function showPlanningView() {
  // ✅ LÍNEA AÑADIDA: Oculta la barra lateral antes de cargar.
  document.querySelector('.sidebar-column')?.classList.add('hidden');
  // ✅ CORRECCIÓN: Se añade la llamada a updateActiveTab dentro de la función de renderizado.
  await loadViewAndInitialize('planificacion', async () => {
    updateActiveTab('planificacion');
    await renderPlanningView(); // Mantenemos la llamada a la función original
  });
}

export async function showReportsListView() {
  document.querySelector('.sidebar-column')?.classList.add('hidden');
  await loadViewAndInitialize('partes_servicio', () => {
    updateActiveTab('partes_servicio');
    renderReportsList();
    if (window.feather) feather.replace();
  });
}

export async function showExtraServicesView() {
  document.querySelector('.sidebar-column')?.classList.add('hidden');
  await loadViewAndInitialize('servicios_extra', () => {
    updateActiveTab('servicios_extra');
    renderExtraServicesView();
    if (window.feather) feather.replace();
  });
}

export async function showAdminDashboardView() {
  document.querySelector('.sidebar-column')?.classList.add('hidden');
  await loadViewAndInitialize('registros_estadisticas', () => {
    updateActiveTab('registros_estadisticas');
    renderAdminDashboard();
  });
}

export async function showRegistroView(subview = 'registros') {
  document.querySelector('.sidebar-column')?.classList.add('hidden');
  await loadViewAndInitialize('registro_electronico', () => {
    updateActiveTab('registro_electronico');
    renderRegistroView(subview);
  });
}

export async function showCroquisView() {
  document.querySelector('.sidebar-column')?.classList.add('hidden');
  await loadViewAndInitialize('croquizador', async () => {
    updateActiveTab('croquis');
    // Le pasamos el contenedor de la vista directamente
    await renderCroquisView(viewContainer);
  });
}

export async function showServiceReportView(reportId) {
  await loadViewAndInitialize('service_report', () => {
    updateActiveTab('partes_servicio');
    renderServiceReport(reportId);
  });
}

export async function showIdentificacionesView() {
  // ✅ LÍNEA AÑADIDA: Oculta la barra lateral antes de cargar.
  document.querySelector('.sidebar-column')?.classList.add('hidden');
  
  await loadViewAndInitialize('identificaciones', renderIdentificacionesView);
}

// ✅ 2. CREAMOS LA FUNCIÓN QUE CARGA LA VISTA DE PLANTILLAS
export async function showPlantillasView() {
  document.querySelector('.sidebar-column')?.classList.add('hidden');
  await loadViewAndInitialize('plantillas', () => {
    updateActiveTab('gestion_plantillas');
    renderPlantillasView();
  });
}


// --- LÓGICA DE AUTENTICACIÓN E INICIO DE LA APP ---

async function handleAuthStateChange(user) {
  if (user) {
    if (appInitialized) return;
    showLoading('Verificando usuario...');
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const userProfile = {
          uid: user.uid,
          email: user.email,
          role: userData.role || 'guard',
          agentId: String(userData.agentId || ''),
          displayName: userData.name || userData.agentId,
        };
        setUser(userProfile);
        showAppContent(userProfile.agentId);
        await initializeAppData();
        appInitialized = true;
        await showScheduleView();
      } else {
        displayMessage('Perfil de usuario no encontrado.', 'error');
        await signOut(auth);
      }
    } catch (error) {
      console.error('Error en handleAuthStateChange:', error);
      await signOut(auth);
    } finally {
      hideLoading();
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
    }
  } else {
    showLoginScreen();
    appInitialized = false;
    currentLoadedView = null;
  }
}

<<<<<<< HEAD
async function initializeAppData(userProfile) {
    await loadInitialAgents();
    initializeAllModals();
    initializeNavigationAndUI(userProfile);
    await updateNotificationCount();
}

// --- LÓGICA DE CARGA DE VISTAS ---
async function loadView(viewName, params = {}) {
    unsubscribeFromCurrentView();
    if (currentLoadedView === viewName && !params.forceReload) return;

    showLoading(`Cargando ${viewName}...`);
    try {
        const response = await fetch(`views/${viewName}.html?v=${new Date().getTime()}`);
        if (!response.ok) throw new Error(`No se pudo cargar la vista: ${viewName}.html`);
        
        mainContentElement.innerHTML = await response.text();
        currentLoadedView = viewName;
        updateActiveTab(viewName);

        if (window.feather) feather.replace();

        switch (viewName) {
            case 'cuadrante':
                setTimeout(async () => {
                    try {
                        await initializeCalendarView();
                        await initSelectors();

                        // ✅ Listener para refrescar cuando cambia un turno
                        document.addEventListener('scheduleShouldRefresh', refreshCalendarView);
                        
                        const unsubMonth = selectedMonthId.subscribe(refreshCalendarView);
                        const unsubAgent = selectedAgentId.subscribe(refreshCalendarView);
                        unsubscribeFromCurrentView = () => {
                            unsubMonth();
                            unsubAgent();
                        };
                        await refreshCalendarView();
                    } catch (e) {
                        console.error("Error inicializando la vista de cuadrante:", e);
                        displayMessage("Error al cargar el calendario.", "error");
                    }
                }, 0);
                break;
            case 'planificacion': renderPlanningView(); break;
            case 'identificaciones': renderIdentificacionesView(); break;
            case 'partes_servicio': renderReportsList(); break;
            case 'tareas': renderTasksView(); break;
            case 'servicios_extra': renderExtraServicesView(); break;
            case 'registros_estadisticas': renderAdminDashboard(); break;
            case 'croquis':
            case 'croquizador': renderCroquisView(mainContentElement); break;
            case 'registro_electronico': renderRegistroView(params.subview || 'entrada', params.taskId); break;
            case 'plantillas': renderPlantillasView(); break;
            case 'service_report': renderServiceReport(params.reportId); break;
        }
    } catch (error) {
        console.error(`Error al cargar la vista ${viewName}:`, error);
        displayMessage(`Error al cargar la vista: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

// ============================================================================
// ✅ FUNCIÓN CORREGIDA: initializeCalendarView
// ============================================================================
async function initializeCalendarView() {
    const calendarContainer = document.getElementById('calendar-container');
    if (!calendarContainer) {
        console.error("CRITICAL: El contenedor #calendar-container no existe.");
        return;
    }

    if (currentCalendarInstance) {
        currentCalendarInstance.destroy();
        currentCalendarInstance = null;
    }

    configureScheduleViewButtons();

    // ✅ CAMBIO 1: Opciones del calendario corregidas
    const calendarOptions = {
        defaultView: 'month',
        useDetailPopup: false, // <-- Desactivamos el popup por defecto
        isReadOnly: true,
        calendars: [{ id: 'shifts', name: 'Turnos' }],
        template: {
            allday(event) {
                return event.title;
            },
            // Se elimina la plantilla 'popupDetail' porque ya no se usa
        }
    };

    // ✅ CREAR INSTANCIA DEL CALENDARIO
    currentCalendarInstance = new Calendar(calendarContainer, calendarOptions);

    // ✅ CAMBIO 2: Verificación de seguridad para evitar el error
    if (!currentCalendarInstance) {
        console.error("CRITICAL: La creación de la instancia del calendario ha fallado.");
        displayMessage("No se pudo inicializar el calendario.", "error");
        return; // Salimos para prevenir el crash
    }
    
    console.log('[INFO] Instancia de calendario creada');

    // ✅ CAMBIO 3: Añadimos el listener para nuestro popup personalizado
   currentCalendarInstance.on('clickEvent', ({ event, nativeEvent }) => {

    // LÍNEA AÑADIDA PARA DEPURAR
  console.log('DATOS DEL EVENTO AL HACER CLICK:', event);
  
    // Ahora pasamos tanto el evento del calendario como el evento nativo del DOM
    showShiftDetailsPopup(event, nativeEvent); 
});

    // APLICAR TEMA INMEDIATAMENTE DESPUÉS
    applyCalendarTheme();

    // CONFIGURAR CONTROLES
    setupCalendarControls(currentCalendarInstance);
}

// ============================================================================
// FUNCIÓN: applyCalendarTheme() - Aplicar tema con setTheme()
// Añade esta función a main.js después de initializeCalendarView()
// ============================================================================

function applyCalendarTheme() {
    if (!currentCalendarInstance) {
        console.error('[ERROR] currentCalendarInstance es null.');
        return;
    }

    try {
        currentCalendarInstance.setTheme({
            // ====================================================================
            // 1. ESTILOS COMUNES (para todas las vistas)
            // ====================================================================
            common: {
                backgroundColor: '#7cc9d3ff',
                border: '1px solid #628fb9ff',
                gridSelection: {
                    backgroundColor: 'rgba(81, 92, 230, 0.1)',
                    border: '1px solid #515CE6'
                },
                dayname: { color: '#333' },
                holiday: { color: '#FF4040' },
                saturday: { color: '#135DE6' },
                today: { color: '#C1351F',
                         backgroundColor: 'rgba(81, 92, 230, 0.1)'
                }
            },

            // ====================================================================
            // 2. VISTA DE MES
            // ====================================================================
            month: {
                dayname: {
                    backgroundColor: '#F5F5F5',
                    borderLeft: 'none',
                    color: '#333'
                },
                gridCell: {
                    border: '1px solid #E5E5E5',
                    header: {
                        color: '#555'
                    }
                },
                weekend: {
                    backgroundColor: 'rgba(245, 245, 245, 0.5)'
                },
                today: {
                    backgroundColor: 'rgba(193, 53, 31, 0.1)',
                    header: {
                        fontWeight: 'bold'
                    }
                }
            },

            // ====================================================================
            // 3. VISTA DE SEMANA Y DÍA
            // ====================================================================
            week: {
                dayname: {
                    borderTop: '1px solid #E0E0E0',
                    borderBottom: '1px solid #E0E0E0',
                    backgroundColor: 'inherit'
                },
                gridline: {
                    color: '#E0E0E0',
                    border: '1px solid #E0E0E0'
                },
                timegridHalfHour: {
                    borderBottom: '1px dashed #E0E0E0'
                },
                timegridHour: {
                    borderBottom: '1px solid #E0E0E0'
                },
                nowIndicator: {
                    color: '#C1351F',
                    border: '2px solid #C1351F'
                },
                pastTime: {
                    color: '#bbb'
                }
            }
        });
        console.log('[INFO] ✅ Tema de TOAST UI Calendar aplicado correctamente.');
    } catch (error) {
        console.error('[ERROR] al aplicar el tema de TOAST UI:', error);
    }
}

        
function getAgentColor(agentId) {
    if (String(agentId) === '5281') {
        return '#8e44ad';
    }
    if (String(agentId) === '5605') {
        return '#16a085';
    }

    const colors = [
        '#d32f2f', '#c2185b', '#7b1fa2', '#512da8', '#303f9f', 
        '#1976d2', '#0288d1', '#0097a7', '#00796b', '#388e3c', 
        '#689f38', '#afb42b', '#fbc02d', '#ffa000', '#f57c00'
    ];
    const hash = String(agentId).split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    return colors[hash % colors.length];
}

// ============================================================================
// FUNCIÓN MEJORADA: renderCalendarEvents() con 5 Secciones
// Mañana | Tarde | Noche | Asuntos | Libre
// ============================================================================

function renderCalendarEvents(scheduleData) {
    if (!currentCalendarInstance) return;

    currentCalendarInstance.clear();

    if (!scheduleData || !scheduleData.weeks) {
        console.warn("No se encontraron datos de cuadrante para el mes seleccionado.");
        return;
    }

    const shiftColors = {
        'M': { bg: '#2563eb', border: '#1e40af', text: '#ffffff' },
        'T': { bg: '#ea580c', border: '#c2410c', text: '#ffffff' },
        'N': { bg: '#4b5563', border: '#374151', text: '#ffffff' },
        'L': { bg: '#78716c', border: '#57534e', text: '#ffffff' },
        'P': { bg: '#a855f7', border: '#9333ea', text: '#ffffff' },
        'V': { bg: '#8b5cf6', border: '#7c3aed', text: '#ffffff' },
        'B': { bg: '#dc2626', border: '#991b1b', text: '#ffffff' },
        'AP': { bg: '#0d9488', border: '#0f766e', text: '#ffffff' },
        'Lc': { bg: '#16a34a', border: '#15803d', text: '#ffffff' }
    };

    // Categorizar turnos en 5 secciones
    const SHIFT_SECTIONS = {
        'morning': ['M'],         // Mañana
        'afternoon': ['T'],         // Tarde
        'night': ['N'],           // Noche
        'matters': ['L', 'B', 'AP'], // Asuntos (Pernoctación, Baja, Otros)
        'free': ['AP', 'V', 'Lc']   // Libre (Libre, Vacaciones, Licencia)
    };

    // Función auxiliar para determinar sección
    const getSection = (shiftType) => {
        if (SHIFT_SECTIONS.morning.includes(shiftType)) return 'morning';
        if (SHIFT_SECTIONS.afternoon.includes(shiftType)) return 'afternoon';
        if (SHIFT_SECTIONS.night.includes(shiftType)) return 'night';
        if (SHIFT_SECTIONS.matters.includes(shiftType)) return 'matters';
        if (SHIFT_SECTIONS.free.includes(shiftType)) return 'free';
        return 'free'; // Fallback
    };

    const SECTION_COLORS = {
        'morning': { bg: '#2563eb', border: '#1e40af', label: 'Mañana' },
        'afternoon': { bg: '#ea580c', border: '#c2410c', label: 'Tarde' },
        'night': { bg: '#4b5563', border: '#374151', label: 'Noche' },
        'matters': { bg: '#8b5cf6', border: '#7c3aed', label: 'Asuntos' },
        'free': { bg: '#10b981', border: '#059669', label: 'Libre' }
    };

    const agentIdToShow = selectedAgentId.get();
    const events = [];

    Object.values(scheduleData.weeks).forEach(week => {
        Object.values(week.days).forEach(day => {
            if (day.shifts && day.isCurrentMonth) {
                // Filtrar fines de semana
                const dayDate = new Date(day.date);
                const dayOfWeek = dayDate.getDay();

                if (dayOfWeek === 0 || dayOfWeek === 6) {
                    return;
                }

                const groupedShifts = {};
                Object.values(day.shifts).forEach(shift => {
                    const type = shift.shiftType;
                    if (!groupedShifts[type]) groupedShifts[type] = [];
                    groupedShifts[type].push(shift.agentId);
                });

                // Agrupar por 5 secciones
                const shiftsBySection = {
                    morning: [],
                    afternoon: [],
                    night: [],
                    matters: [],
                    free: []
                };

                for (const shiftType in groupedShifts) {
                    const agentIds = groupedShifts[shiftType];

                    if (agentIdToShow !== 'all' && !agentIds.includes(String(agentIdToShow))) continue;

                    const shiftColor = shiftColors[shiftType] || shiftColors['L'];

                    // Determinar sección usando la función auxiliar
                    const section = getSection(shiftType);

                    // Limitar a máximo 2 agentes visibles
                    const visibleAgents = agentIds.slice(0, 2);
                    const agentHtml = visibleAgents.map(id => {
                        const agentColor = getAgentColor(id);
                        return `<span class="agent-tag" style="background-color: ${agentColor};">${id}</span>`;
                    }).join('');

                    const extraCount = agentIds.length - visibleAgents.length;
                    const extraLabel = extraCount > 0 ? `<span class="agent-extra">+${extraCount}</span>` : '';

                    const initialMap = {
                        'M': 'M', 'T': 'T', 'N': 'N', 'L': 'L', 'P': 'P', 'V': 'V', 'B': 'B', 'AP': 'A', 'Lc': 'Lc'
                    };
                    const initial = initialMap[shiftType] || '?';

                    shiftsBySection[section].push({
                        initial,
                        agentHtml,
                        extraLabel,
                        shiftColor,
                        shiftType,
                        agentIds
                    });
                }

                // ====================================================================
                // CREAR EVENTO POR SECCIÓN - Una barra por cada sección con contenido
                // ====================================================================

                
['morning', 'afternoon', 'night', 'matters', 'free'].forEach(sectionKey => {
    if (shiftsBySection[sectionKey].length > 0) {
        const shifts = shiftsBySection[sectionKey];
        const sectionColor = SECTION_COLORS[sectionKey];

        const shiftsHtml = shifts.map(s => `
            <span class="event-letter-icon" style="background-color: ${s.shiftColor.bg}; border-color: ${s.shiftColor.border};">${s.initial}</span>
            <div class="event-agents-list">${s.agentHtml}${s.extraLabel}</div>
        `).join('&nbsp;');

        const eventTitle = `
            <div class="event-background" style="background-color: ${sectionColor.bg};"></div>
            <div class="event-foreground event-section-bar">
                ${shiftsHtml}
            </div>
        `;

        // Preparar datos de shifts
        const shiftsDataToStore = shifts.flatMap(s => s.agentIds.map(agentId => ({
            agentId: agentId,
            shiftType: s.shiftType,
            monthId: selectedMonthId.get(),
            weekKey: Object.keys(scheduleData.weeks).find(k => scheduleData.weeks[k] === week),
            dayKey: Object.keys(week.days).find(k => week.days[k] === day),
            dateString: day.date
        })));

        // ✅ Serializar shifts como JSON en el body
        const bodyText = `${sectionColor.label}\nTurnos: ${shifts.map(s => s.shiftType).join(', ')}\nAgentes: ${shifts.flatMap(s => s.agentIds).join(', ')}\n---SHIFTS_JSON---${JSON.stringify({
            backgroundColor: sectionColor.bg,
            shifts: shiftsDataToStore
        })}`;

        events.push({
            id: `${day.date}-${sectionKey}`,
            calendarId: 'shifts',
            title: eventTitle,
            start: day.date,
            end: day.date,
            isAllday: true,
            category: 'allday',
            backgroundColor: 'transparent',
            borderColor: sectionColor.border,
            body: bodyText  // ✅ Incluir JSON aquí
        });
    }
});
                  
            }
        });
    });

    if (events.length > 0) {
        currentCalendarInstance.createEvents(events);
        console.log(`[INFO] ${events.length} eventos renderizados en 5 secciones`);
    }
}

function setupCalendarControls(calendar) {
    const updateStateFromCalendar = () => {
        const newDate = calendar.getDate().toDate();
        const newYear = newDate.getFullYear();
        const newMonthIndex = newDate.getMonth();
        const newMonthName = MESES[newMonthIndex];
        const newMonthId = `cuadrante_${newMonthName}_${newYear}`;

        setDate(newYear, newMonthId);
    };

    document.getElementById('prevBtn')?.addEventListener('click', () => {
        calendar.prev();
        updateStateFromCalendar();
    });

    document.getElementById('nextBtn')?.addEventListener('click', () => {
        calendar.next();
        updateStateFromCalendar();
    });

    document.getElementById('todayBtn')?.addEventListener('click', () => {
        calendar.today();
        updateStateFromCalendar();
    });
}

async function refreshCalendarView() {
    if (!currentCalendarInstance) return;

    const monthId = selectedMonthId.get();
    if (!monthId) return;

    const [_, monthName, year] = monthId.split('_');
    
    const titleElement = document.getElementById('currentMonthTitle');
    if (titleElement) {
        titleElement.textContent = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} de ${year}`;
    }
    
    const dateToSync = new Date(year, MESES.indexOf(monthName), 1);
    currentCalendarInstance.setDate(dateToSync);

    showLoading('Actualizando...');
    try {
        const [scheduleData, markedDates] = await Promise.all([
            getScheduleForMonth(monthId),
            getMarkedDates(monthId)
        ]);
        
        renderCalendarEvents(scheduleData);
        
        requestAnimationFrame(() => {
            renderMarkedDateIndicators(markedDates);
        });

    } catch (error) {
        console.error("Error al refrescar el calendario:", error);
        displayMessage('Error al refrescar los datos.', 'error');
    } finally {
        hideLoading();
    }
}

function renderMarkedDateIndicators(markedDates) {
    if (!markedDates || markedDates.length === 0) return;

    markedDates.forEach(markedDate => {
        const dateStr = new Date(markedDate.date).toISOString().split('T')[0];
        const dayCell = document.querySelector(`.toastui-calendar-daygrid-cell[data-date="${dateStr}"]`);
        
        if (dayCell && !dayCell.querySelector('.marked-date-indicator')) {
            const indicator = document.createElement('span');
            indicator.className = 'marked-date-indicator';
            indicator.title = markedDate.description;
            
            dayCell.querySelector('.toastui-calendar-daygrid-cell-header')?.appendChild(indicator);
        }
    });
}

// --- FUNCIONES DE SOPORTE, AUTENTICACIÓN Y NAVEGACIÓN ---
async function handleLogin(event) {
    event.preventDefault();
    const identification = document.getElementById('identification').value.trim();
    const password = document.getElementById('password').value;
    if (!identification || !password) {
        displayMessage('El Nº de Identificación y la contraseña son obligatorios.', 'error');
        return;
    }
    const email = identification.includes('@') ? identification : `${identification}@cuadrante.es`;
    showLoading('Verificando...');
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        displayMessage('Credenciales incorrectas o error de autenticación. Inténtalo de nuevo.', 'error');
        console.error('Login error:', error.code, error.message);
    } finally {
        hideLoading();
    }
}

async function handleLogout() {
    showLoading('Cerrando sesión...');
    try {
        await signOut(auth);
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        displayMessage('Error al cerrar sesión.', 'error');
    } finally {
        hideLoading();
    }
}

function initializeAllModals() {
    initializeShiftModal();
    initializeRegistroModal();
    initializeTemplateEditorModal();
    initializeManagementSelectorModal();
    initializeUserRequestSelectorModal();
    initializeManageRequestsModal();
    initializeViewSelectorModal();
}

function initializeNavigationAndUI(userProfile) {
    const navContainer = document.querySelector('.module-nav');
    const sidebar = document.getElementById('management-sidebar');
    if (!navContainer) return;

    const isMando = userProfile?.role === 'admin' || userProfile?.role === 'supervisor';
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = isMando ? 'flex' : 'none');
    
    const openSidebar = () => document.body.classList.add('sidebar-open');
    const closeSidebar = () => document.body.classList.remove('sidebar-open');
    document.getElementById('open-sidebar-btn')?.addEventListener('click', openSidebar);
    document.getElementById('close-sidebar-btn')?.addEventListener('click', closeSidebar);
    document.getElementById('sidebar-overlay')?.addEventListener('click', closeSidebar);

    [navContainer, sidebar].filter(el => el).forEach(container => {
        container.addEventListener('click', (event) => {
            const tab = event.target.closest('.module-tab[data-view]');
            if (!tab) return;
            event.preventDefault();
            closeSidebar();
            loadView(tab.dataset.view);
        });
    });

    document.getElementById('tasks-bell-button')?.addEventListener('click', () => loadView('tareas'));
    const notificationBell = document.getElementById('requests-bell-button');
    if (notificationBell) {
        notificationBell.addEventListener('click', showManageRequestsModal);
        const badge = document.getElementById('notification-badge');
        pendingRequestsCount.subscribe(count => {
            if (badge) {
                badge.textContent = count > 9 ? '9+' : count;
                badge.classList.toggle('hidden', count === 0);
            }
        });
    }
    document.getElementById('logout-button-header')?.addEventListener('click', handleLogout);
    const loggedInUserDisplay = document.getElementById('logged-in-user-display');
    if (loggedInUserDisplay && userProfile) {
        loggedInUserDisplay.textContent = userProfile.agentId;
    }
}

function updateActiveTab(viewName) {
    document.querySelectorAll('.module-nav .module-tab, .module-tab-dropdown-container').forEach(el => {
        el.classList.remove('active', 'has-active-child');
    });
    const activeTab = document.querySelector(`.module-tab[data-view="${viewName}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
        const parentDropdown = activeTab.closest('.module-tab-dropdown-container');
        if (parentDropdown) {
            parentDropdown.classList.add('has-active-child');
        }
    }
}

function configureScheduleViewButtons() {
    const userProfile = currentUser.get();
    const managementButton = document.getElementById('management-selector-btn');
    if (managementButton) {
        managementButton.style.display = userProfile?.role === 'admin' ? 'inline-flex' : 'none';
        managementButton.addEventListener('click', showManagementSelectorModal);
    }
    const userRequestsButton = document.getElementById('user-requests-selector-btn');
    if (userRequestsButton) {
        userRequestsButton.style.display = userProfile?.role !== 'admin' ? 'inline-flex' : 'none';
        userRequestsButton.addEventListener('click', showUserRequestSelectorModal);
    }
}

// --- FUNCIONES EXPORTADAS PARA NAVEGACIÓN ---
export function showScheduleView() { window.loadView?.('cuadrante'); }
export function showPlanningView() { window.loadView?.('planificacion'); }
export function showReportsListView() { window.loadView?.('partes_servicio'); }
export function showTasksView() { window.loadView?.('tareas'); }
export function showExtraServicesView() { window.loadView?.('servicios_extra'); }
export function showAdminDashboardView() { window.loadView?.('registros_estadisticas'); }
export function showCroquisView() { window.loadView?.('croquis'); }
export function showIdentificacionesView() { window.loadView?.('identificaciones'); }
export function showPlantillasView() { window.loadView?.('plantillas'); }
export function showRegistroView(subview = 'entrada') { window.loadView?.('registro_electronico', { subview }); }
export function showRegistroViewForTask(taskId) { window.loadView?.('registro_electronico', { subview: 'entrada', taskId, forceReload: true }); }
export function showServiceReportView(reportId) { window.loadView?.('service_report', { reportId, forceReload: true }); }
=======
async function initializeAppData() {
  try {
    await loadInitialAgents();
    initializeAgentTasksModal();
    initializeShiftModal();
    initializePdfOptionsModal();
    initializeAgentManagerModal();
    initializeRequestPermissionModal();
    initializeManageRequestsModal();
    initializeProposeChangeModal();
    initializeRespondToProposalModal();
    initializeViewSelectorModal();
    initializeManagementSelectorModal();
    initializeAddMarkedDateModal();
    initializeExtraServiceModal();
    initializeReportEntryModal();
    initializeReportSummaryModal();
    initializeDefaultOrderTemplateModal();
    initializeAddRequerimientoModal();
    initializeRegistroModal();
    initializeUserRequestSelectorModal();
    initializeTemplateEditorModal();
    initializeAgentTasksModal();

    configureMainNavigationAndButtons();
    await updateNotificationCount();
    document.addEventListener('scheduleShouldRefresh', refreshScheduleView);
  } catch (error) {
    console.error('Error crítico al cargar los componentes de la aplicación:', error);
  }
}


// ✅ 3. ACTUALIZAMOS LA FUNCIÓN DE NAVEGACIÓN
function configureMainNavigationAndButtons() {
  const userProfile = currentUser.get();
  const isMando = userProfile?.role === 'admin' || userProfile?.role === 'supervisor';

  const viewResetFunctions = {
    planificacion: resetPlanningView,
    partes_servicio: resetReportsListView,
    servicios_extra: resetExtraServicesView,
    registro_electronico: resetRegistroView,
    gestion_plantillas: resetPlantillasView,
    croquis: resetCroquisView,
  };
  
  const cleanAndListen = (element, handler) => {
    if (!element) return;
    const newElement = element.cloneNode(true);
    element.parentNode.replaceChild(newElement, element);
    newElement.addEventListener('click', (e) => {
      e.preventDefault();
      const viewName = element.dataset.view;
      const previousView = currentLoadedView;
      if (previousView && viewResetFunctions[previousView]) {
          viewResetFunctions[previousView]();
      }
      handler(e);
    });
  };

  const loggedInUserDisplay = document.getElementById('logged-in-user-display');
  if (loggedInUserDisplay) loggedInUserDisplay.textContent = userProfile.agentId;

  document.querySelectorAll('.module-nav .module-tab').forEach((tab) => {
    const view = tab.dataset.view;
    const isAdminView = ['planificacion', 'registros_estadisticas', 'gestion_plantillas'].includes(view);

    if (isAdminView) {
      tab.style.display = isMando ? 'flex' : 'none';
    }

    const handler = {
      cuadrante: showScheduleView,
      planificacion: showPlanningView,
      partes_servicio: showReportsListView,
      servicios_extra: showExtraServicesView,
      registros_estadisticas: showAdminDashboardView,
      registro_electronico: () => showRegistroView('entrada'),
      gestion_plantillas: showPlantillasView, // Se conecta la nueva función
      croquis: showCroquisView,
      identificaciones: showIdentificacionesView,
    }[view];

    if (handler) {
      cleanAndListen(tab, handler);
    }
  });

  cleanAndListen(document.getElementById('logout-button-header'), handleLogout);

   const notificationBellButton = document.getElementById('notification-bell-button');
    if (notificationBellButton) {
        cleanAndListen(notificationBellButton, () => {
            const user = currentUser.get();
            if (user.role === 'admin') {
                showManageRequestsModal(); // El admin sigue viendo las solicitudes
            } else {
                showAgentTasksModal(); // El agente ahora ve sus tareas
            }
        });
    }
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('identification').value;
  const password = document.getElementById('password').value;
  showLoading();
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    hideLoading();
    displayMessage('Nº de identificación o contraseña incorrectos.', 'error');
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

async function refreshScheduleView() {
  if (currentLoadedView !== 'cuadrante') return;
  showLoading('Actualizando cuadrante...');
  try {
    const monthId = selectedMonthId.get();
    const agentId = selectedAgentId.get();
    const scheduleData = await getScheduleForMonth(monthId);
    const markedDates = await getMarkedDates(monthId);
    const context = {
      scheduleData: scheduleData,
      markedDates: markedDates,
      selectedAgentId: agentId,
      userProfile: currentUser.get(),
      currentView: currentView.get(),
    };
    renderContext.set(context);
  } catch (error) {
    console.error('Error al refrescar el cuadrante:', error);
    displayMessage('No se pudo actualizar el cuadrante.', 'error');
  } finally {
    hideLoading();
  }
}

>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
