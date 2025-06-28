// js/state.js
import { atom, computed } from 'nanostores';

// ÁTOMOS DE ESTADO
export const currentUser = atom(null);
const now = new Date();
export const selectedYear = atom(now.getFullYear());
export const selectedMonthId = atom(null);
export const selectedAgentId = atom('all');
export const currentView = atom('tarjetas');
export const availableAgents = atom([]);
export const scheduleData = atom(null);
export const pendingNotificationsCount = atom(0);
export const selectedShiftTypeFilter = atom(null); // <--- AÑADIDO

// ESTADOS COMPUTADOS
export const isUserAdmin = computed(currentUser, profile => !!profile && profile.role === 'admin');

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

// ACCIONES (Setters para los átomos)
export function setUser(userProfile) { currentUser.set(userProfile); }
export function setDate(year, monthId) {
  selectedYear.set(year);
  selectedMonthId.set(monthId);
}
export function setAgent(agentId) { selectedAgentId.set(agentId); }
export function setView(viewType) { currentView.set(viewType); }
export function setScheduleData(data) { scheduleData.set(data); }
export function setAvailableAgents(agents) { availableAgents.set(agents); }
export function setPendingNotificationsCount(count) { pendingNotificationsCount.set(count); }
export function setSelectedShiftTypeFilter(filter) { selectedShiftTypeFilter.set(filter); } // <--- AÑADIDO