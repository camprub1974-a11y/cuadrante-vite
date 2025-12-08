<<<<<<< HEAD
// js/state.js (VERSIÓN CORREGIDA)
=======
// js/state.js (VERSIÓN FINAL, CORREGIDA Y COMPATIBLE)
>>>>>>> 755f45b7c267bfffa0ee6a809a10400904711786
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

<<<<<<< HEAD
=======

>>>>>>> 755f45b7c267bfffa0ee6a809a10400904711786
// --- ACCIONES (Setters) ---
export const setUser = currentUser.set;
export const setView = currentView.set;
export const setAvailableAgents = availableAgents.set;
export const toggleEditMode = () => isEditModeActive.set(!isEditModeActive.get());
export const setAgent = selectedAgentId.set;
<<<<<<< HEAD
=======

// ✅ LÍNEAS CORREGIDAS: Exportamos las funciones setter que faltaban.
>>>>>>> 755f45b7c267bfffa0ee6a809a10400904711786
export const setPendingTasksCount = pendingTasksCount.set;
export const setPendingRequestsCount = pendingRequestsCount.set;

/**
 * Actualiza el año y el ID del mes de forma síncrona.
<<<<<<< HEAD
 * Ahora acepta SOLO el monthId y extrae el año automáticamente.
 * @param {string} monthId - El ID completo del mes (ej: "cuadrante_enero_2024").
 */
export function setDate(monthId) {
    console.log('[state.js] setDate llamado con monthId:', monthId);
    
    if (!monthId || typeof monthId !== 'string') {
        console.error('[state.js] setDate recibió monthId inválido:', monthId);
        return;
    }
    
    // Extraer el año del monthId (formato: cuadrante_octubre_2025)
    const parts = monthId.split('_');
    if (parts.length !== 3) {
        console.error('[state.js] Formato de monthId inválido:', monthId);
        return;
    }
    
    const year = parseInt(parts[2], 10);
    
    if (isNaN(year)) {
        console.error('[state.js] No se pudo extraer el año de:', monthId);
        return;
    }
    
    // Actualizar AMBOS estados
    selectedYear.set(year);
    selectedMonthId.set(monthId);
    
    console.log('[state.js] Estado actualizado - year:', year, 'monthId:', monthId);
=======
 * @param {number} year - El año seleccionado.
 * @param {string} monthId - El ID completo del mes (ej: "cuadrante_enero_2024").
 */
export function setDate(year, monthId) {
    selectedYear.set(year);
    selectedMonthId.set(monthId);
>>>>>>> 755f45b7c267bfffa0ee6a809a10400904711786
}

// --- CONSTANTES ---
export const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];