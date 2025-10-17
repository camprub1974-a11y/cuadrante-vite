// js/ui/shiftModal.js (VERSIÓN CORREGIDA Y UNIFICADA)

import { displayMessage, showLoading, hideLoading } from './viewManager.js';
import { updateShiftV2, getAllShiftTypes } from '../dataController.js';
import { format } from 'date-fns';
import { currentUser } from '../state.js';
import { es } from 'date-fns/locale';

// --- Variables del Módulo ---
let modal, modalTitle, agentNameDisplay, dateDisplay, buttonsContainer, removeButton;
let isInitialized = false;
let currentShiftData = null;

// --- Funciones Internas ---

/**
 * Cierra el modal. Se mueve aquí para asegurar que esté definida antes de su uso.
 */
function hideShiftModal() {
  if (modal) modal.classList.add('hidden');
}

/**
 * Gestiona el clic en uno de los botones de tipo de turno.
 */
async function handleShiftTypeClick(event) {
  const newShiftType = event.currentTarget.dataset.shiftType;
  if (!currentShiftData) return;

  // ✅ DEBUG: Ver qué datos tenemos
  console.log("=== DEBUG: Datos a enviar a updateShiftV2 ===");
  console.log("currentShiftData:", currentShiftData);
  console.log("newShiftType:", newShiftType);
  
  const dataToSend = {
    monthId: currentShiftData.monthId,
    weekKey: currentShiftData.weekKey,
    dayKey: currentShiftData.dayKey,
    agentId: currentShiftData.agentId,
    newShiftType: newShiftType,
  };
  console.log("Objeto a enviar:", dataToSend);
  console.log("=== FIN DEBUG ===");

  showLoading('Actualizando turno...');
  try {
    await updateShiftV2(dataToSend);

    hideShiftModal();
    displayMessage('Turno actualizado con éxito.', 'success');
    document.dispatchEvent(new CustomEvent('scheduleShouldRefresh'));
  } catch (error) {
    displayMessage(`Error al actualizar el turno: ${error.message}`, 'error');
  } finally {
    hideLoading();
  }
}


/**
 * Gestiona el clic en el botón de eliminar turno.
 */
async function handleRemoveShift() {
  if (!currentShiftData) return;

  const newShiftType = '-'; // El guion representa un turno eliminado
  showLoading('Eliminando turno...');
  try {
    await updateShiftV2({
      monthId: currentShiftData.monthId,
      weekKey: currentShiftData.weekKey,
      dayKey: currentShiftData.dayKey,
      agentId: currentShiftData.agentId,
      newShiftType: newShiftType,
    });

    hideShiftModal();
    displayMessage('Turno eliminado.', 'success');
    document.dispatchEvent(new CustomEvent('scheduleShouldRefresh'));
  } catch (error) {
    displayMessage(`Error al eliminar el turno: ${error.message}`, 'error');
  } finally {
    hideLoading();
  }
}

// --- Funciones Exportadas ---

/**
 * Abre el modal, lo rellena con datos y lo posiciona en la pantalla.
 * @param {object} shiftData - Datos del turno.
 * @param {MouseEvent} event - El evento de clic para posicionar el modal.
 */
export async function openShiftModal(shiftData) {
  console.log('5. 🚀 openShiftModal: Función INVOCADA.');
  console.log("=== DEBUG: Datos recibidos en openShiftModal ===");
  console.log("shiftData completo:", shiftData);
  console.log("Campos individuales:");
  console.log("  - monthId:", shiftData.monthId);
  console.log("  - weekKey:", shiftData.weekKey);
  console.log("  - dayKey:", shiftData.dayKey);
  console.log("  - agentId:", shiftData.agentId);
  console.log("  - dateString:", shiftData.dateString);
  console.log("=== FIN DEBUG ===");

  if (!isInitialized) {
    console.warn('Intentando abrir un modal no inicializado. Se intentará inicializar ahora.');
    initializeShiftModal();
  }

  if (!modal) {
    console.error('CRÍTICO: La variable del modal es NULA o UNDEFINED.');
    displayMessage('Error crítico: El modal de edición no pudo ser encontrado.', 'error');
    return;
  }
  
  currentShiftData = shiftData;
  modalTitle.textContent = `Editar Turno`;
  agentNameDisplay.textContent = shiftData.agentName;

  try {
    const date = new Date(`${shiftData.dateString}T12:00:00Z`);
    dateDisplay.textContent = format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: es });
  } catch (e) {
    dateDisplay.textContent = 'Fecha inválida';
  }

  buttonsContainer.innerHTML = '';
  showLoading('Cargando opciones...');
  try {
    const shiftTypes = await getAllShiftTypes();
    shiftTypes.forEach((type) => {
      if (type.quadrant_symbol !== '-') {
        const button = document.createElement('button');
        button.className = 'button button-secondary';
        button.textContent = type.name;
        button.dataset.shiftType = type.quadrant_symbol;
        button.addEventListener('click', handleShiftTypeClick);
        buttonsContainer.appendChild(button);
      }
    });
  } catch (error) {
    buttonsContainer.innerHTML =
      '<p class="error-message">No se pudieron cargar los tipos de turno.</p>';
  } finally {
    hideLoading();
  }
  
  console.log('8. ✨ Mostrando modal...');
  modal.classList.remove('hidden');
}
/**
 * Inicializa los elementos del DOM y los listeners del modal una sola vez.
 */
export function initializeShiftModal() {
  if (isInitialized) return;
  // Ahora encontrará el único y correcto modal que hemos dejado en el HTML
  modal = document.getElementById('edit-shift-modal');
  if (!modal) return;

  // ✅ CORRECCIÓN: Apuntamos a los IDs del modal correcto
  modalTitle = modal.querySelector('#shift-form-title'); 
  agentNameDisplay = modal.querySelector('#shift-edit-agent-name');
  dateDisplay = modal.querySelector('#shift-edit-date');
  buttonsContainer = modal.querySelector('#shift-type-buttons'); // Contenedor de botones de turno
  removeButton = modal.querySelector('#remove-shift-btn'); // Botón de quitar turno

  const closeButtons = modal.querySelectorAll('.close-button');

  if (removeButton) removeButton.addEventListener('click', handleRemoveShift);

  if (closeButtons) {
    closeButtons.forEach(button => {
      button.addEventListener('click', hideShiftModal);
    });
  }

  isInitialized = true;
  console.log('✅ Modal de edición de turnos (unificado) inicializado correctamente.');
}

/**
 * Muestra un popup personalizado con detalles del turno y botones de acción.
 * Reemplaza al popup por defecto de TOAST UI.
 * @param {object} event - El objeto del evento de TOAST UI Calendar.
 * @param {object} nativeEvent - El evento nativo del DOM (clic del ratón).
 */
export function showShiftDetailsPopup(event, nativeEvent) {
    console.log("🚀 1. Función showShiftDetailsPopup INVOCADA.");
    
    const existingPopup = document.querySelector('.custom-toast-popup');
    if (existingPopup) {
        console.log("🧹 Limpiando popup anterior.");
        existingPopup.remove();
    }

    const user = currentUser.get();
    const isAdmin = user && user.role === 'admin';
    console.log(`👤 2. Verificando permisos... Rol: '${user?.role}'. ¿Admin?: ${isAdmin}`);

    // ✅ Extraer datos del body
    let shiftsData = null;
    try {
        if (event.body && event.body.includes('---SHIFTS_JSON---')) {
            const jsonStart = event.body.indexOf('---SHIFTS_JSON---') + '---SHIFTS_JSON---'.length;
            const jsonStr = event.body.substring(jsonStart);
            shiftsData = JSON.parse(jsonStr);
            console.log("✅ Datos extraídos del body:", shiftsData);
        }
    } catch (err) {
        console.error("❌ Error al parsear JSON del body:", err);
    }

    const hasShiftsData = shiftsData && shiftsData.shifts && shiftsData.shifts.length > 0;
    
    if (!isAdmin || !hasShiftsData) {
        console.error("❌ 4. FUNCIÓN DETENIDA.");
        if (!isAdmin) console.error("   - El usuario no es administrador.");
        if (!hasShiftsData) console.error("   - No se encontraron datos de shifts.");
        return;
    }

    console.log("✅ 5. Creando popup...");

    const popup = document.createElement('div');
    popup.className = 'custom-toast-popup';
    
    const backgroundColor = shiftsData.backgroundColor || '#6b7280';
    const bodyLines = event.body.split('\n');
    const sectionLabel = bodyLines[0] || 'Turnos';
    const agentsText = bodyLines[2] || 'Agentes no disponibles';

    popup.innerHTML = `
        <div class="popup-header" style="background-color: ${backgroundColor};">
            <p class="popup-title">${sectionLabel}</p>
        </div>
        <div class="popup-body">
            <p class="popup-details">
                <i data-feather="users"></i>
                <span>${agentsText}</span>
            </p>
        </div>
        <div class="popup-footer">
            <button id="popup-edit-btn" class="popup-button">
                <i data-feather="edit-2"></i> Edit
            </button>
            <button id="popup-delete-btn" class="popup-button">
                <i data-feather="trash-2"></i> Delete
            </button>
        </div>
    `;

    document.body.appendChild(popup);
    if (window.feather) feather.replace();

    const eventElement = document.querySelector(`[data-event-id="${event.id}"]`);
    if (eventElement) {
        const rect = eventElement.getBoundingClientRect();
        popup.style.left = `${rect.left + window.scrollX}px`;
        popup.style.top = `${rect.bottom + window.scrollY + 5}px`;
    }

    popup.querySelector('#popup-edit-btn').addEventListener('click', () => {
        popup.remove();
        const shifts = shiftsData.shifts;
        if (shifts.length === 1) {
            const shift = shifts[0];
            openShiftModal({
                monthId: shift.monthId,
                weekKey: shift.weekKey,
                dayKey: shift.dayKey,
                agentId: shift.agentId,
                agentName: shift.agentId,
                dateString: shift.dateString,
                currentShiftType: shift.shiftType,
            });
        } else {
            showAgentSelectorForEditing(shifts);
        }
    });

    popup.querySelector('#popup-delete-btn').addEventListener('click', async () => {
        if (!confirm(`¿Estás seguro de que quieres eliminar TODOS los turnos de esta sección?`)) {
            return;
        }
        popup.remove();
        showLoading('Eliminando turnos...');
        try {
            const deletePromises = shiftsData.shifts.map(shift => 
                updateShiftV2({
                    monthId: shift.monthId,
                    weekKey: shift.weekKey,
                    dayKey: shift.dayKey,
                    agentId: shift.agentId,
                    newShiftType: '-',
                })
            );
            await Promise.all(deletePromises);
            
            document.dispatchEvent(new CustomEvent('scheduleShouldRefresh'));
            displayMessage('Turnos eliminados correctamente.', 'success');
        } catch (error) {
            displayMessage(`Error al eliminar: ${error.message}`, 'error');
        } finally {
            hideLoading();
        }
    });

    setTimeout(() => {
        document.addEventListener('click', (e) => {
            if (!popup.contains(e.target)) popup.remove();
        }, { once: true });
    }, 10);
}

/**
 * Muestra un pequeño modal para seleccionar qué agente editar.
 * @param {Array} shifts - El array de turnos de la sección.
 */
function showAgentSelectorForEditing(shifts) {
    const selectorModal = document.createElement('div');
    selectorModal.className = 'modal-overlay';
    
    const agentButtons = shifts.map(shift => 
        `<button class="button" data-agent-id="${shift.agentId}">Agente ${shift.agentId} (${shift.shiftType})</button>`
    ).join('');

    selectorModal.innerHTML = `
        <div class="modal-content card" style="max-width: 300px;">
            <div class="modal-header">
                <h3 class="modal-title">Seleccionar Agente</h3>
                <button class="close-button">&times;</button>
            </div>
            <div class="modal-body" style="display: flex; flex-direction: column; gap: 10px;">
                <p>Elige el turno que quieres editar:</p>
                ${agentButtons}
            </div>
        </div>
    `;

    document.body.appendChild(selectorModal);
    
    selectorModal.addEventListener('click', (e) => {
        const agentId = e.target.dataset.agentId;
        if (agentId) {
            const selectedShift = shifts.find(s => s.agentId === agentId);
            openShiftModal({
                monthId: selectedShift.monthId,
                weekKey: selectedShift.weekKey,
                dayKey: selectedShift.dayKey,
                agentId: selectedShift.agentId,
                agentName: selectedShift.agentId,
                dateString: selectedShift.dateString,
                currentShiftType: selectedShift.shiftType,
            });
            selectorModal.remove();
        }

        if (e.target.classList.contains('close-button') || e.target.classList.contains('modal-overlay')) {
            selectorModal.remove();
        }
    });
}