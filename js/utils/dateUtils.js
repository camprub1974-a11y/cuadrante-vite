// js/state.js (VERSIÓN FINAL, CORREGIDA Y COMPATIBLE)
import { atom } from 'nanostores';

<<<<<<< HEAD
// --- ÁTOMOS DE ESTADO ---
export const currentUser = atom(null);
export const selectedAgentId = atom(null);
export const currentView = atom('cuadrante');
export const availableAgents = atom([]);
export const isEditModeActive = atom(false);
export const pendingTasksCount = atom(0);
export const pendingRequestsCount = atom(0);

const now = new Date();
const currentMonthName = now.toLocaleString('es-ES', { month: 'long' }).toLowerCase();
const currentYear = now.getFullYear();

export const selectedYear = atom(currentYear);
export const selectedMonthId = atom(`cuadrante_${currentMonthName}_${currentYear}`);


// --- ACCIONES (Setters) ---
export const setUser = currentUser.set;
export const setView = currentView.set;
export const setAvailableAgents = availableAgents.set;
export const toggleEditMode = () => isEditModeActive.set(!isEditModeActive.get());

// ✅ LÍNEAS CORREGIDAS: Exportamos las funciones setter que faltaban.
export const setPendingTasksCount = pendingTasksCount.set;
export const setPendingRequestsCount = pendingRequestsCount.set;

/**
 * Actualiza el año y el ID del mes de forma síncrona.
 * @param {number} year - El año seleccionado.
 * @param {string} monthId - El ID completo del mes (ej: "cuadrante_enero_2024").
 */
export function setDate(year, monthId) {
    selectedYear.set(year);
    selectedMonthId.set(monthId);
}

// --- CONSTANTES ---
export const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
=======
function createState(initialValue) {
  return atom(initialValue);
}

// ÁTOMOS DE ESTADO (Fuentes únicas de verdad)
export const currentUser = createState(null);
const now = new Date();
export const selectedYear = createState(now.getFullYear());
export const selectedMonthId = createState(null);
export const selectedAgentId = createState(null);
export const currentView = createState('tarjetas');
export const availableAgents = createState([]);
export const scheduleData = createState(null);
export const pendingNotificationsCount = createState(0);
export const isEditModeActive = createState(false);
export const markedDatesForMonth = createState([]);

// ACCIONES (Setters para modificar los átomos de forma controlada)
export const setUser = currentUser.set;
export const setDate = (year, monthId) => {
  selectedYear.set(year);
  selectedMonthId.set(monthId);
};
export const setAgent = selectedAgentId.set;
export const setView = currentView.set;
export const setScheduleData = scheduleData.set;
export const setMarkedDatesForMonth = markedDatesForMonth.set;
export const setAvailableAgents = availableAgents.set;
export const setPendingNotificationsCount = pendingNotificationsCount.set;
export const toggleEditMode = () => isEditModeActive.set(!isEditModeActive.get());

// ESTADOS COMPUTADOS (Datos derivados de los átomos)
export const isUserAdmin = computed(
  currentUser,
  (profile) => !!profile && profile.role === 'admin'
);
export const isUserSupervisor = computed(
  currentUser,
  (profile) => !!profile && profile.role === 'supervisor'
);

export const agentSelectorContext = computed(
  [currentView, availableAgents, isUserAdmin, currentUser],
  (view, agents, admin, user) => ({ view, agents, isAdmin: admin, currentUser: user })
);

export const currentMonthTitle = computed(selectedMonthId, (monthId) => {
  if (!monthId) return 'Selecciona Mes';
  try {
    const [_, monthName, year] = monthId.split('_');
    return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
  } catch (e) {
    return 'Cargando...';
  }
});

export const renderContext = computed(
  [currentUser, scheduleData, currentView, selectedAgentId, markedDatesForMonth],
  (user, schedule, view, agentId, markedDates) => {
    return {
      userProfile: user,
      scheduleData: schedule,
      currentView: view,
      selectedAgentId: agentId,
      markedDates: markedDates,
    };
  }
);
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
