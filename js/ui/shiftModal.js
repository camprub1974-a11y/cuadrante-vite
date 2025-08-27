// js/ui/shiftModal.js

import { availableAgents } from '../state.js';
import { displayMessage, showLoading, hideLoading } from './viewManager.js';
import { updateShiftV2 } from '../dataController.js'; 
import { FULL_SHIFT_TYPE_MAP } from '../constants.js';
import { getAgentName } from './scheduleRenderer.js';

let modal, closeButton, title, agentNameEl, dateEl, shiftButtonsContainer, removeBtn;
let currentShiftData = null;
let isInitialized = false;

/**
 * @fileoverview Lógica para el modal de edición de turnos (para administradores).
 */

/**
 * Inicializa el modal de edición de turnos, obteniendo sus referencias y listeners.
 */
export function initializeShiftModal() {
    if (isInitialized) return;

    modal = document.getElementById('edit-shift-modal');
    if (!modal) {
        console.error("ERROR - ShiftModal: Modal #edit-shift-modal no encontrado.");
        return;
    }

    closeButton = modal.querySelector('.close-button');
    title = modal.querySelector('#shift-form-title');
    agentNameEl = modal.querySelector('#shift-edit-agent-name');
    dateEl = modal.querySelector('#shift-edit-date');
    shiftButtonsContainer = modal.querySelector('#shift-type-buttons');
    removeBtn = modal.querySelector('#remove-shift-btn');
    
    if (!closeButton || !title || !agentNameEl || !dateEl || !shiftButtonsContainer || !removeBtn) {
        console.error("ERROR - ShiftModal: Faltan elementos internos en el modal de edición. Asegúrate de que los IDs en el HTML son correctos.");
        return;
    }

    closeButton.addEventListener('click', hideShiftModal);
    modal.addEventListener('click', (e) => { 
        if (e.target === modal) hideShiftModal();
    });
    
    shiftButtonsContainer.addEventListener('click', (e) => {
        const button = e.target.closest('.shift-type-btn');
        if (button && button.dataset.shiftType) {
            handleShiftSelection(button.dataset.shiftType);
        }
    });

    removeBtn.addEventListener('click', () => handleShiftSelection('-'));
    
    isInitialized = true;
    console.log("✅ Módulo del Modal de Edición de Turnos inicializado.");
}

/**
 * Abre el modal y lo prepara con los datos del turno.
 * @param {object} shiftData - Objeto con los datos del turno.
 */
export function openShiftModal(shiftData) {
    if (!isInitialized) {
        displayMessage("Error: El modal de edición de turnos no está listo. Reinicia la aplicación.", "error");
        return;
    }

    currentShiftData = shiftData;

    const agentObj = availableAgents.get().find(agent => String(agent.id) === String(shiftData.agentId));
    const agentDisplayName = agentObj ? agentObj.name : getAgentName(shiftData.agentId);

    agentNameEl.textContent = agentDisplayName || 'Agente Desconocido';
    dateEl.textContent = formatDateForDisplay(shiftData.dayDate);

    // ✅ LÓGICA CORREGIDA: Ahora lee correctamente el objeto simple { 'M': 'Mañana' }
    // En lugar de `[key, { name, color }]`, ahora es `[key, name]`
    shiftButtonsContainer.innerHTML = Object.entries(FULL_SHIFT_TYPE_MAP)
        .filter(([key]) => key !== '-') // No mostrar el botón "Sin Asignación"
        .map(([key, name]) => 
            `<button class="shift-type-btn" data-shift-type="${key}">${name}</button>`
        ).join('');

    shiftButtonsContainer.querySelectorAll('.shift-type-btn').forEach(btn => {
        if (btn.dataset.shiftType === shiftData.shiftType) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

/**
 * Oculta el modal de edición de turnos.
 */
function hideShiftModal() {
    if (modal) modal.classList.add('hidden');
    currentShiftData = null;
}

/**
 * Maneja la selección de un nuevo tipo de turno o la acción de quitar turno.
 * @param {string} newShiftType - El nuevo tipo de turno.
 */
async function handleShiftSelection(newShiftType) {
    if (newShiftType === 'N') {
        displayMessage('El turno de Noche no se puede asignar directamente. Utilice la gestión de cambios de turno.', 'warning');
        return; 
    }

    showLoading();
    try {
        await updateShiftV2({
            monthId: currentShiftData.monthId,
            weekKey: currentShiftData.weekKey,
            dayKey: currentShiftData.dayKey,
            agentId: currentShiftData.agentId, 
            newShiftType: newShiftType,
            existingShiftKey: currentShiftData.existingShiftKey
        });
        
        displayMessage('Turno actualizado con éxito.', 'success');
        hideShiftModal();
        
        document.dispatchEvent(new CustomEvent('scheduleShouldRefresh'));

    } catch (error) {
        displayMessage(`Error al actualizar el turno: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

/**
 * Formatea una cadena de fecha para mostrarla de forma legible en el modal.
 * @param {string} dateString - Fecha en formato YYYY-MM-DD.
 * @returns {string} Fecha formateada.
 */
function formatDateForDisplay(dateString) {
    const date = new Date(dateString + 'T12:00:00'); 
    return date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}