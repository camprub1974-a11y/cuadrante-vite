// js/ui/shiftModal.js (VERSIÓN CORREGIDA Y UNIFICADA)

import { displayMessage, showLoading, hideLoading } from './viewManager.js';
import { updateShiftV2, getAllShiftTypes } from '../dataController.js';
import { format } from 'date-fns';
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

  showLoading('Actualizando turno...');
  try {
    await updateShiftV2({
      monthId: currentShiftData.monthId,
      weekKey: currentShiftData.weekKey,
      dayKey: currentShiftData.dayKey,
      agentId: currentShiftData.agentId,
      newShiftType: newShiftType,
    });

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
  if (!isInitialized) initializeShiftModal();

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

  modal.classList.remove('hidden');
}

/**
 * Inicializa los elementos del DOM y los listeners del modal una sola vez.
 */
export function initializeShiftModal() {
  if (isInitialized) return;
  modal = document.getElementById('edit-shift-modal');
  if (!modal) return;

  modalTitle = modal.querySelector('#shift-modal-title');
  agentNameDisplay = modal.querySelector('#shift-modal-agent-name');
  dateDisplay = modal.querySelector('#shift-modal-date');
  buttonsContainer = modal.querySelector('#shift-modal-buttons');
  removeButton = modal.querySelector('#shift-modal-remove-btn');
  
  // --- INICIO DE LA CORRECCIÓN ---
  // Seleccionamos TODOS los botones de cierre, no solo el primero.
  const closeButtons = modal.querySelectorAll('.close-button');

  if (removeButton) removeButton.addEventListener('click', handleRemoveShift);
  
  // Aplicamos el evento de cierre a cada uno de los botones encontrados.
  if (closeButtons) {
    closeButtons.forEach(button => {
      button.addEventListener('click', hideShiftModal);
    });
  }
  // --- FIN DE LA CORRECCIÓN ---

  isInitialized = true;
  console.log('✅ Modal de edición de turnos inicializado correctamente.');
}