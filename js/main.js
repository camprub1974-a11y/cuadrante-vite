// ============================================================================
// js/main.js - VERSIÓN CORREGIDA Y FUNCIONAL
// ============================================================================
// CAMBIOS CLAVE:
// 1. Función applyCalendarTheme() correctamente implementada
// 2. Eliminado 'theme' de calendarOptions
// 3. Exportación de currentCalendarInstance para debugging
// ============================================================================

// --- IMPORTACIONES DE FIREBASE Y ESTADO ---
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import {
    setUser,
    currentUser,
    selectedAgentId,
    selectedMonthId,
    pendingRequestsCount,
    MESES,
    setDate,
} from '/js/state.js';
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
import { renderAdminDashboard } from './ui/adminDashboardView.js';
import { renderCroquisView } from './ui/croquisView.js';
import { renderRegistroView } from './ui/registroView.js';
import { renderPlantillasView } from './ui/plantillasView.js';
import { renderServiceReport } from './ui/serviceReportView.js';
import { renderActivityFeed } from './ui/activityFeedRenderer.js';

// --- IMPORTACIONES DE MODALES ---
import { initializeShiftModal, showShiftDetailsPopup } from './ui/shiftModal.js';
import { initializeRegistroModal } from './ui/registroModal.js';
import { initializeTemplateEditorModal } from './ui/templateEditorModal.js';
import { showManagementSelectorModal, initializeManagementSelectorModal } from './ui/managementSelectorModal.js';
import { showUserRequestSelectorModal, initializeUserRequestSelectorModal } from './ui/userRequestSelectorModal.js';
import { showManageRequestsModal, initializeManageRequestsModal } from './ui/manageRequestsModal.js';
import { showViewSelectorModal, initializeViewSelectorModal } from './ui/viewSelectorModal.js';
import { initializeAddMarkedDateModal } from './ui/addMarkedDateModal.js';
import { initializeProposeChangeModal, openProposeChangeModal } from './ui/proposeChangeModal.js';



// ✅ ASEGÚRATE DE QUE ESTA DEFINICIÓN ESTÉ AQUÍ, EN EL NIVEL SUPERIOR
const shiftColors = {
    'M': { bg: '#2563eb', border: '#1e40af', text: '#ffffff' },
    'T': { bg: '#ea580c', border: '#c2410c', text: '#ffffff' },
    'N': { bg: '#4b5563', border: '#374151', text: '#ffffff' },
    'L': { bg: '#78716c', border: '#57534e', text: '#ffffff' },
    'P': { bg: '#a855f7', border: '#9333ea', text: '#ffffff' },
    'V': { bg: '#8b5cf6', border: '#7c3aed', text: '#ffffff' },
    'B': { bg: '#dc2626', border: '#991b1b', text: '#ffffff' },
    'AP': { bg: '#0d9488', border: '#0f766e', text: '#ffffff' },
    'Lc': { bg: '#16a34a', border: '#15803d', text: '#ffffff' },
    'default': { bg: '#cccccc', border: '#aaaaaa', text: '#333333'} // Color de texto oscuro para fondo gris
};

// --- VARIABLES GLOBALES ---
let appInitialized = false;
let currentLoadedView = null;
let mainContentElement = null;
let currentCalendarInstance = null;
let unsubscribeFromCurrentView = () => {};

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

    // ✅ AÑADE ESTE LISTENER AQUÍ
    // Escuchará el evento 'dataShouldRefresh' y llamará a las funciones
    // de actualización de la UI.
    document.addEventListener('dataShouldRefresh', async () => {
        console.log('[EVENT] dataShouldRefresh detectado. Actualizando vistas...');
        // Si estamos en la vista del cuadrante, la refrescamos
        if (currentLoadedView === 'cuadrante') {
            await refreshCalendarView();
        }
        // Siempre refrescamos el panel de novedades
        await renderActivityFeed();
    });
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
    }
}

async function initializeAppData(userProfile) {
    // Doble-check de seguridad
    if (!selectedAgentId.get()) {
        selectedAgentId.set('all');
    }
    await loadInitialAgents();
    initializeAllModals();
    initializeNavigationAndUI(userProfile);
    await updateNotificationCount();

    // Se mantiene solo una llamada, eliminando la duplicada.
    await renderActivityFeed();
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
                // Use setTimeout to ensure the DOM is ready for calendar initialization
                setTimeout(async () => {
                    try {
                        console.log('[loadView cuadrante] Initializing...');
                        
                        // 1. Initialize Calendar FIRST
                        await initializeCalendarView();
                        console.log('[loadView cuadrante] Calendar initialized.');
                        
                        // 2. Initialize Selectors
                        //    initSelectors internally uses requestAnimationFrame
                        //    to set the initial 'all' value visually.
                        await initSelectors(currentUser.get()); 
                        console.log('[loadView cuadrante] Selectors initialized.');

                        // 3. Setup listeners/subscriptions for FUTURE changes
                        document.addEventListener('scheduleShouldRefresh', refreshCalendarView);
                        
                        // Make subscriptions slightly safer
                        const unsubMonth = selectedMonthId.subscribe(async (monthId) => {
                            console.log('[Subscription] Month changed:', monthId);
                            // Add guard: only refresh if calendar exists and monthId looks valid
                            if (currentCalendarInstance && monthId && monthId.includes('_')) {
                                 await refreshCalendarView();
                            } else {
                                console.warn('[Subscription] Skipping month refresh - calendar instance or monthId invalid.');
                            }
                        });
                        const unsubAgent = selectedAgentId.subscribe(async (agentId) => {
                            console.log('[Subscription] Agent changed:', agentId);
                             // Add guard: only refresh if calendar exists and agentId is not null/undefined
                            if (currentCalendarInstance && agentId) {
                                await refreshCalendarView();
                            } else {
                                console.warn('[Subscription] Skipping agent refresh - calendar instance or agentId invalid.');
                            }
                        });
                        
                        // Function to clean up listeners when view changes
                        unsubscribeFromCurrentView = () => {
                            console.log('[Unsubscribe] Cleaning up cuadrante listeners.');
                            document.removeEventListener('scheduleShouldRefresh', refreshCalendarView);
                            unsubMonth();
                            unsubAgent();
                            // Also clear the global marked dates cache
                            window.markedDatesForMonth = []; 
                        };
                        console.log('[loadView cuadrante] Subscriptions set up.');

                        // --- THIS IS THE CRUCIAL PART ---
                        // 4. Perform the *initial* refresh AFTER everything is set up.
                        //    By now, handleAuthStateChange should have set state to 'all'.
                        console.log('[loadView cuadrante] Performing initial refresh call with agentId="all"...');
                        await refreshCalendarView('all'); // <-- 3. Pass 'all' here
                        console.log('[loadView cuadrante] Initial refresh call finished.');
                        // --- END CRUCIAL PART ---

                    } catch (e) {
                        console.error("Error inicializando la vista de cuadrante:", e);
                        displayMessage("Error al cargar el calendario.", "error");
                        // Ensure loading is hidden on error during init
                        hideLoading(); 
                    } 
                    // Note: hideLoading() is now handled within refreshCalendarView's finally block
                }, 0); // Keep the timeout
                break; // <-- Ensure this break statement is here!
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

    const calendarOptions = {
        defaultView: 'month',
        useDetailPopup: false, // Seguimos sin usar el popup por defecto
        isReadOnly: true,
        calendars: [{ id: 'shifts', name: 'Turnos' }],
        template: {
            // Plantilla para las barras de eventos (sin cambios)
            allday(event) {
                return event.title;
            },

            // --- NUEVA PLANTILLA PARA LA CELDA DEL DÍA ---
            monthGridHeader(model) {
                const date = new Date(model.date);
                const year = date.getFullYear();
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const day = date.getDate().toString().padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;

                // Comprobar si esta fecha está en nuestra lista de fechas señaladas
                // (Necesitaremos una forma de acceder a markedDates aquí)
                const isMarked = window.markedDatesForMonth && window.markedDatesForMonth.some(
                    d => d.dateStr === dateStr
                );

                // Construir el HTML de la cabecera
               return `
    <div class="day-number-container ${isMarked ? 'has-marker' : ''}">
        <span class="toastui-calendar-weekday-grid-date ${model.isToday ? 'toastui-calendar-weekday-grid-date-decorator' : ''}">
            ${day}
        </span>
        ${isMarked ? '<div class="marked-date-indicator-wrapper" title="Fecha Señalada"><span class="marked-date-indicator"><i data-feather="bell"></i></span></div>' : ''}
    </div>
`;
            },
            // --- FIN NUEVA PLANTILLA ---
        }
    };

    currentCalendarInstance = new Calendar(calendarContainer, calendarOptions);
    
    if (!currentCalendarInstance) {
        console.error("CRITICAL: La creación de la instancia del calendario ha fallado.");
        displayMessage("No se pudo inicializar el calendario.", "error");
        return; 
    }
    
    console.log('[INFO] Instancia de calendario creada');

    currentCalendarInstance.on('clickEvent', ({ event, nativeEvent }) => {
        nativeEvent.stopPropagation(); 
        showShiftDetailsPopup(event, nativeEvent); 
    });

    applyCalendarTheme();
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
                    backgroundColor: 'rgba(247, 185, 185, 0.5)'
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

// js/main.js

// REEMPLAZA TU FUNCIÓN renderCalendarEvents ANTIGUA POR ESTA:
function renderCalendarEvents(scheduleData) {
    if (!currentCalendarInstance) return;

    currentCalendarInstance.clear();

    if (!scheduleData || !scheduleData.weeks) {
        console.warn("No se encontraron datos de cuadrante para el mes seleccionado.");
        return;
    }

        const initialMap = {
        'M': 'M', 'T': 'T', 'N': 'N', 'L': 'L', 'P': 'P', 'V': 'V', 'B': 'B', 'AP': 'A', 'Lc': 'Lc'
    };

    const SHIFT_SECTIONS = {
        'permisos': ['V', 'P', 'AP', 'Lc'],
        'bajas_libres': ['L', 'B', 'N']
    };

    const getSection = (shiftType) => {
        if (shiftType === 'M') return 'morning';
        if (shiftType === 'T') return 'afternoon';
        if (SHIFT_SECTIONS.permisos.includes(shiftType)) return 'permisos';
        if (SHIFT_SECTIONS.bajas_libres.includes(shiftType)) return 'bajas_libres';
        return 'skip'; 
    };

    const SECTION_COLORS = {
        'morning_1': { bg: '#2563eb', border: '#1e40af', label: 'Mañana' },
        'morning_2': { bg: '#2563eb', border: '#1e40af', label: 'Mañana' },
        'afternoon_1': { bg: '#ea580c', border: '#c2410c', label: 'Tarde' },
        'afternoon_2': { bg: '#ea580c', border: '#c2410c', label: 'Tarde' },
        'permisos': { bg: '#8b5cf6', border: '#7c3aed', label: 'Permisos y Vacaciones' },
        'bajas_libres': { bg: '#dc2626', border: '#991b1b', label: 'Bajas y Libres' }
    };

    const createShiftData = (shiftType, agentIds) => {
        const shiftColor = shiftColors[shiftType] || shiftColors['L'];
        const initial = initialMap[shiftType] || '?';
        const visibleAgents = agentIds.slice(0, 2); 
        const agentHtml = visibleAgents.map(id => {
            const agentColor = getAgentColor(id);
            return `<span class="agent-tag" style="background-color: ${agentColor};" title="Agente ${id}">${id}</span>`;
        }).join('');
        const extraCount = agentIds.length - visibleAgents.length;
        const extraLabel = extraCount > 0 ? `<span class="agent-extra">+${extraCount}</span>` : '';
        
        return { initial, agentHtml, extraLabel, shiftColor, shiftType, agentIds };
    };
    
    const agentIdToShow = selectedAgentId.get();
    const events = [];

    Object.values(scheduleData.weeks).forEach(week => {
        Object.values(week.days).forEach(day => {
            if (day.shifts && day.isCurrentMonth) {
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

                const shiftsBySection = {
                    morning_1: [], morning_2: [],
                    afternoon_1: [], afternoon_2: [],
                    permisos: [], bajas_libres: []
                };

                // --- BUCLE PRINCIPAL CON LÓGICA DE FILTRADO ---
                for (const shiftType in groupedShifts) {
                    const allAgentIds = groupedShifts[shiftType]; // [4684, 5605]

                    // --- INICIO DE LA CORRECCIÓN ---
                    // 1. Determinar qué agentes mostrar
                    let agentsForThisBar;
                    if (agentIdToShow === 'all') {
                        agentsForThisBar = allAgentIds; // Mostrar todos
                    } else {
                        // Mostrar solo el agente seleccionado, si está en esta lista
                        const agentIdToShowString = String(agentIdToShow);
                        agentsForThisBar = allAgentIds.filter(id => String(id) === agentIdToShowString);
                    }

                    // 2. Si no hay agentes que mostrar (porque el seleccionado no está en este turno), saltar
                    if (agentsForThisBar.length === 0) continue;
                    // --- FIN DE LA CORRECCIÓN ---

                    const section = getSection(shiftType);
                    if (section === 'skip') continue; 

                    // 3. --- LÓGICA DE DIVISIÓN (Ahora usa la lista filtrada) ---
                    if (section === 'morning') {
                        const midPoint = Math.ceil(agentsForThisBar.length / 2);
                        const agents_1 = agentsForThisBar.slice(0, midPoint);
                        const agents_2 = agentsForThisBar.slice(midPoint);

                        if (agents_1.length > 0) {
                            shiftsBySection['morning_1'].push(createShiftData(shiftType, agents_1));
                        }
                        if (agents_2.length > 0) {
                            shiftsBySection['morning_2'].push(createShiftData(shiftType, agents_2));
                        }
                    } else if (section === 'afternoon') {
                        const midPoint = Math.ceil(agentsForThisBar.length / 2);
                        const agents_1 = agentsForThisBar.slice(0, midPoint);
                        const agents_2 = agentsForThisBar.slice(midPoint);
                        
                        if (agents_1.length > 0) {
                            shiftsBySection['afternoon_1'].push(createShiftData(shiftType, agents_1));
                        }
                        if (agents_2.length > 0) {
                            shiftsBySection['afternoon_2'].push(createShiftData(shiftType, agents_2));
                        }
                    } else {
                        // 4. Pasar la lista filtrada a las otras secciones
                        shiftsBySection[section].push(createShiftData(shiftType, agentsForThisBar));
                    }
                }
                // --- FIN DEL BUCLE PRINCIPAL ---

                ['morning_1', 'morning_2', 'afternoon_1', 'afternoon_2', 'permisos', 'bajas_libres'].forEach(sectionKey => {
                    if (shiftsBySection[sectionKey].length > 0) {
                        const shifts = shiftsBySection[sectionKey];
                        const sectionColor = SECTION_COLORS[sectionKey];

                        const shiftsHtml = shifts.map(s => `
                            <span class="event-letter-icon" style="background-color: ${s.shiftColor.bg}; border-color: ${s.shiftColor.border};" title="${s.shiftType}">${s.initial}</span>
                            <div class="event-agents-list">${s.agentHtml}${s.extraLabel}</div>
                        `).join('&nbsp;');

                        const eventTitle = `
                            <div class="event-background" style="background-color: ${sectionColor.bg};"></div>
                            <div class="event-foreground event-section-bar">
                                ${shiftsHtml}
                            </div>
                        `;

                        const shiftsDataToStore = shifts.flatMap(s => s.agentIds.map(agentId => {
    // --- INICIO DE LA CORRECCIÓN ---
    let dateStr = null;
    if (day && typeof day.date === 'string' && day.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Solo asigna si 'day.date' es un string válido en formato YYYY-MM-DD
        dateStr = day.date;
    } else {
        // Si falta o es inválido, logueamos un aviso y dejamos dateStr como null
        console.warn(`[renderCalendarEvents] Falta o es inválida la fecha para el día:`, day, `Turno: ${s.shiftType}, Agente: ${agentId}`);
    }
    // --- FIN DE LA CORRECCIÓN ---

    return {
        agentId: agentId,
        shiftType: s.shiftType,
        monthId: selectedMonthId.get(),
        weekKey: Object.keys(scheduleData.weeks).find(k => scheduleData.weeks[k] === week),
        dayKey: Object.keys(week.days).find(k => week.days[k] === day),
        dateString: dateStr // Ahora dateStr será un string válido o null
    };
}));

                        const bodyText = `${sectionColor.label}\n---SHIFTS_JSON---${JSON.stringify({
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
                            body: bodyText
                        });
                    }
                });
            }
        });
    });

    if (events.length > 0) {
        currentCalendarInstance.createEvents(events);
        console.log(`[INFO] ${events.length} eventos renderizados en 6 secciones (2M, 2T, 2 Otros)`);
    }
}

function setupCalendarControls(calendar) {
    const updateStateFromCalendar = () => {
        const newDate = calendar.getDate().toDate();
        const newYear = newDate.getFullYear();
        const newMonthIndex = newDate.getMonth();
        const newMonthName = MESES[newMonthIndex];
        const newMonthId = `cuadrante_${newMonthName}_${newYear}`;


        console.log('[DEBUG] Nuevo mes seleccionado:', newMonthId);  // ← Añade debug
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

// REEMPLAZA TU FUNCIÓN refreshCalendarView ACTUAL POR ESTA
async function refreshCalendarView(overrideAgentId = null) { // <-- 1. Add optional parameter
    if (!currentCalendarInstance) return;

    const monthId = selectedMonthId.get();
    if (!monthId) return;

    // --- LÓGICA DE AGENTE CORREGIDA ---
    // 2. Usar el override si existe, si no, obtener del estado
    const agentId = overrideAgentId || selectedAgentId.get(); 
    // --- FIN CORRECCIÓN ---

    // Guard Clause: Sigue siendo útil por si las suscripciones se disparan con null/undefined
    if (!agentId) { 
        console.log('[refreshCalendarView] Skipping refresh due to invalid agentId:', agentId);
        return; 
    }
    
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
            getMarkedDates(monthId) // Obtenemos las fechas señaladas
        ]);
        
        // --- INICIO MODIFICACIÓN ---
        // 1. Guardar las fechas formateadas para la plantilla
        window.markedDatesForMonth = markedDates.map(d => {
            const date = d.date;
            if (!(date instanceof Date) || isNaN(date)) return null;
            const y = date.getFullYear();
            const m = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            return { dateStr: `${y}-${m}-${day}`, title: d.title || d.description };
        }).filter(Boolean); // Filtrar nulos si hay fechas inválidas

        // 2. Renderizar eventos (barras)
        renderCalendarEvents(scheduleData);
        
        // 3. Calcular y renderizar estadísticas
        const stats = calculateAgentStats(agentId, scheduleData);
        renderQuadrantStats(stats);
        
        // 4. Forzar re-renderizado para que la plantilla monthGridHeader se actualice
        //    y muestre los puntos rojos. Usamos requestAnimationFrame para asegurar
        //    que se haga después de que los eventos se hayan dibujado.
        requestAnimationFrame(() => {
            currentCalendarInstance.render();
            if (window.feather) feather.replace(); 
            
            console.log("Calendario re-renderizado para mostrar indicadores.");
        });
        // --- FIN MODIFICACIÓN ---

    } catch (error) {
        console.error("Error al refrescar el calendario:", error);
        displayMessage('Error al refrescar los datos.', 'error');
    } finally {
        hideLoading();
    }
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
    initializeAddMarkedDateModal();
    initializeProposeChangeModal();
}

// ✅ AÑADE ESTA NUEVA FUNCIÓN (puedes ponerla cerca de initializeAllModals)
/**
 * Abre el modal para proponer un cambio de turno, pre-rellenando los datos.
 * Se expone globalmente para ser llamada desde shiftModal.js
 * @param {object} shiftData - Datos del turno que se ofrece.
 */
window.openProposeChangeModal = function(shiftData) {
    if (!shiftData) {
        console.error("openProposeChangeModal: No se recibieron datos del turno.");
        displayMessage("Error al iniciar la propuesta de cambio.", "error");
        return;
    }
    // Llama a la función exportada por proposeChangeModal.js
    openProposeChangeModal(shiftData); // <-- Nombre CORREGIDO
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
        const badge = document.getElementById('requests-notification-badge'); // 1. Is the ID correct?
        pendingRequestsCount.subscribe(count => { // 2. Is this subscription happening?
            console.log(`[Subscription pendingRequestsCount] Received count: ${count}`); // <-- ADD THIS LOG
            if (badge) { // 3. Is 'badge' element found?
                badge.textContent = count > 9 ? '9+' : String(count); // 4. Is textContent being set?
                badge.classList.toggle('hidden', count === 0); // 5. Is 'hidden' class toggled correctly?
            } else {
                console.error("Badge element #requests-notification-badge not found!"); // <-- Check for this error
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

/**
 * Calcula las estadísticas de turnos para un agente específico O para todos.
 * @param {string} agentId - El ID del agente o la cadena 'all'.
 * @param {object} scheduleData - Los datos del cuadrante.
 * @returns {object} Un objeto con los conteos por tipo de turno.
 */
function calculateAgentStats(agentId, scheduleData) {
    const stats = {};
    if (!scheduleData || !scheduleData.weeks) return stats;

    const calculateForAll = (agentId === 'all'); // Flag para saber si contamos todo
    const agentIdString = calculateForAll ? null : String(agentId); // String solo si es individual

    Object.values(scheduleData.weeks).forEach(week => {
        Object.values(week.days).forEach(day => {
            if (day.shifts && day.isCurrentMonth) {
                Object.values(day.shifts).forEach(shift => {
                    // Si calculamos para todos O si el ID coincide...
                    if (calculateForAll || String(shift.agentId) === agentIdString) {
                        // ...contamos el turno.
                        const type = shift.shiftType;
                        stats[type] = (stats[type] || 0) + 1;
                    }
                });
            }
        });
    });
    return stats;
}

/**
 * Dibuja la rejilla de estadísticas en el panel lateral.
 * (Versión adaptada a tu _stats-widget.css)
 */
function renderQuadrantStats(stats) {
    const container = document.getElementById('stats-container');
    if (!container) return;

    if (Object.keys(stats).length === 0) {
        container.innerHTML = '<p class="info-message">No hay turnos para este agente en el mes.</p>';
        return;
    }

    const names = { 
        M: 'Mañanas', T: 'Tardes', N: 'Noches', V: 'Vacaciones', P: 'Permisos', 
        B: 'Bajas', AP: 'Asuntos P.', L: 'Libres', Lc: 'Licencia' 
    };

    const sortedKeys = Object.keys(stats).sort((a, b) => {
        const order = ['M', 'T', 'N', 'L', 'V', 'P', 'AP', 'B', 'Lc'];
        return (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 99 : order.indexOf(b));
    });

    let gridHtml = '<div class="stats-info-grid">';
    
    for (const type of sortedKeys) {
        const count = stats[type];
        const name = names[type] || type;
        
        // --- INICIO DE LA MODIFICACIÓN ---
        // 1. Obtener los colores para este tipo de turno
        const colors = shiftColors[type] || shiftColors['default']; // Usa el color o el gris por defecto
        
        // 2. Añadir estilos en línea para fondo, borde y texto
        gridHtml += `
            <div class="stat-item" style="background-color: ${colors.bg}; border-color: ${colors.border};">
                <div class="value" style="color: ${colors.text};">${count}</div>
                <div class="label" style="color: ${colors.text}; opacity: 0.9;">${name}</div>
            </div>
        `;
        // --- FIN DE LA MODIFICACIÓN ---
    }
    gridHtml += '</div>';
    container.innerHTML = gridHtml;
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