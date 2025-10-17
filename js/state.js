// js/state.js (VERSIÓN FINAL, CORREGIDA Y COMPATIBLE)
import { atom } from 'nanostores';

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