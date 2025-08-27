// js/state.js
import { atom, computed } from 'nanostores';

// ✅ CORRECCIÓN: La función ahora devuelve el átomo completo.
function createState(initialValue) {
    // Simplemente creamos y devolvemos el átomo.
    // Esto preserva toda la API de nanostores, incluyendo .listen()
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

// ACCIONES (Setters para modificar los átomos de forma controlada)
// La forma de llamar a .set() no cambia.
export const setUser = currentUser.set;
export const setDate = (year, monthId) => {
  selectedYear.set(year);
  selectedMonthId.set(monthId);
};
export const setAgent = selectedAgentId.set;
export const setView = currentView.set;
export const setScheduleData = scheduleData.set;
export const setAvailableAgents = availableAgents.set;
export const setPendingNotificationsCount = pendingNotificationsCount.set;

// ESTADOS COMPUTADOS (Datos derivados de los átomos)
export const isUserAdmin = computed(currentUser, profile => !!profile && profile.role === 'admin');
export const isUserSupervisor = computed(currentUser, profile => !!profile && profile.role === 'supervisor');

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
  [currentUser, scheduleData, currentView, selectedAgentId],
  (user, schedule, view, agentId) => {
    return {
      userProfile: user,
      scheduleData: schedule,
      currentView: view,
      selectedAgentId: agentId
    };
  }
);