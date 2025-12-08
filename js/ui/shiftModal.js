// js/ui/shiftModal.js (VERSIÓN COMPLETA REDISEÑADA)

import { displayMessage, showLoading, hideLoading } from './viewManager.js';
import { updateShiftV2, getAllShiftTypes } from '../dataController.js';
import { currentUser, availableAgents } from '../state.js';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// --- Constantes para la nueva UI ---
const PRIMARY_SHIFTS = ['M', 'T', 'N', 'L'];
const SECONDARY_SHIFTS = ['V', 'P', 'B', 'AP'];
const ICONS = {
  M: 'sun',
  T: 'sunset',
  N: 'moon',
  L: 'coffee',
  V: 'plane',
  P: 'award',
  B: 'thermometer',
  AP: 'briefcase'
};

// --- Variables del Módulo ---
let modal, modalTitle, agentNameDisplay, dateDisplay, removeButton;
let primaryGrid, secondaryGrid, otherSelect;
let isInitialized = false;
let currentShiftData = null;
let detailsPopup = null; // El popup que tú creaste

// --- Funciones Internas ---

function hideShiftModal() {
  if (modal) modal.classList.add('hidden');
}

// ✅ AÑADE ESTA FUNCIÓN COMPLETA
function hideShiftDetailsPopup() {
  if (detailsPopup && detailsPopup.parentNode) {
    // Elimina el popup del DOM
    detailsPopup.parentNode.removeChild(detailsPopup);
    detailsPopup = null;
    // Quita el listener global para que no se acumulen
    document.removeEventListener('click', handleOutsideClick, true);
  }
}

/**
 * Rellena los botones y el desplegable con todos los tipos de turno.
 */
async function populateShiftOptions() {
  primaryGrid.innerHTML = '';
  secondaryGrid.innerHTML = '';
  otherSelect.innerHTML = '<option value="">-- Seleccionar permiso... --</option>';
  
  try {
    const shiftTypes = await getAllShiftTypes();
    
    shiftTypes.forEach((type) => {
      const symbol = type.quadrant_symbol;
      if (symbol === '-') return; // Ignorar el turno "vacío"

      if (PRIMARY_SHIFTS.includes(symbol)) {
        // --- 1. Crear botón principal (M, T, N, L) ---
        const icon = ICONS[symbol] || 'circle';
        const button = document.createElement('button');
        button.className = `button shift-button-icon shift-${symbol.toLowerCase()}`;
        button.dataset.shiftType = symbol;
        button.innerHTML = `
          <i data-feather="${icon}"></i>
          <span>${type.name}</span>
        `;
        button.addEventListener('click', handleShiftTypeClick);
        primaryGrid.appendChild(button);

      } else if (SECONDARY_SHIFTS.includes(symbol)) {
        // --- 2. Crear botón secundario (V, P, B, AP) ---
        const button = document.createElement('button');
        button.className = 'button button-secondary';
        button.dataset.shiftType = symbol;
        button.textContent = type.name;
        button.addEventListener('click', handleShiftTypeClick);
        secondaryGrid.appendChild(button);

      } else {
        // --- 3. Crear opción para el desplegable (Resto) ---
        const option = document.createElement('option');
        option.value = symbol;
        option.textContent = type.name;
        otherSelect.appendChild(option);
      }
    });
    
    if (window.feather) feather.replace(); // Actualizar los nuevos iconos
    
  } catch (error) {
    primaryGrid.innerHTML = '<p class="error-message">Error al cargar turnos.</p>';
  }
}

/**
 * Gestiona el clic en un botón o el cambio en el 'select'.
 */
function handleShiftTypeClick(event) {
  const newShiftType = event.currentTarget.dataset.shiftType || event.currentTarget.value;
  if (!newShiftType || !currentShiftData) return;
  
  saveShiftUpdate(newShiftType);
}

/**
 * Gestiona el clic en el botón de eliminar turno.
 */
function handleRemoveShift() {
  saveShiftUpdate('-'); // El guion representa un turno eliminado
}

/**
 * Función unificada para guardar el cambio (actualizar o eliminar).
 */
async function saveShiftUpdate(newShiftType) {
  if (!currentShiftData) return;

  const dataToSend = {
    monthId: currentShiftData.monthId,
    weekKey: currentShiftData.weekKey,
    dayKey: currentShiftData.dayKey,
    agentId: currentShiftData.agentId,
    newShiftType: newShiftType,
  };

  const actionText = newShiftType === '-' ? 'Eliminando' : 'Actualizando';
  showLoading(`${actionText} turno...`);
  try {
    await updateShiftV2(dataToSend);
    hideShiftModal();
    displayMessage(`Turno ${actionText.toLowerCase()} con éxito.`, 'success');
    document.dispatchEvent(new CustomEvent('scheduleShouldRefresh'));
  } catch (error) {
    displayMessage(`Error al ${actionText.toLowerCase()} el turno: ${error.message}`, 'error');
  } finally {
    hideLoading();
  }
}

// --- Funciones Exportadas ---

/**
 * Muestra el popup con la lista de agentes para seleccionar uno.
 */
export function showShiftDetailsPopup(event, nativeEvent) {
  hideShiftDetailsPopup(); // Cierra popups anteriores

  const user = currentUser.get(); // Obtenemos el usuario logueado
  if (!user || !user.agentId) return; // Salir si no hay usuario o agentId

  const isAdmin = user.role === 'admin';
  const data = parseEventBody(event.body);
  if (!data || !data.shifts || data.shifts.length === 0) return;

  const allShifts = data.shifts;
  const backgroundColor = data.backgroundColor || '#6b7280';
  const sectionLabel = event.body.split('\n')[0] || 'Turnos';

  detailsPopup = document.createElement('div');
  detailsPopup.className = 'custom-toast-popup';

  const agents = availableAgents.get() || [];
  
  // --- INICIO DE LA MODIFICACIÓN ---
  const agentListHtml = allShifts.map(shift => {
    const agent = agents.find(a => a.id === shift.agentId);
    const agentName = agent ? agent.name : `Agente ${shift.agentId}`;
    const agentColor = getAgentColor(shift.agentId);
    const shiftJsonString = encodeURIComponent(JSON.stringify(shift));

    // Comprobar si este turno pertenece al usuario actual
    const isCurrentUserShift = String(shift.agentId) === String(user.agentId);

    // Definir qué icono mostrar (editar para admin, cambiar para el propio usuario)
    let actionIconHtml = '';
    if (isAdmin) {
      // Los admins ven el icono de editar para TODOS
      actionIconHtml = `<i data-feather="edit-2" class="agent-edit-icon action-icon" data-action="edit"></i>`;
    } else if (isCurrentUserShift) {
      // Los usuarios normales ven el icono de cambiar SOLO en sus turnos
      actionIconHtml = `<i data-feather="refresh-cw" class="agent-change-icon action-icon" data-action="propose-change"></i>`;
    }

    return `
      <li class="popup-agent-item" data-shift-json='${shiftJsonString}'>
        <span class="agent-tag-popup" style="background-color: ${agentColor};">${shift.agentId.slice(-2)}</span>
        <span class="agent-name-popup">${agentName}</span>
        ${actionIconHtml}
      </li>
    `;
  }).join('');
  // --- FIN DE LA MODIFICACIÓN ---

  detailsPopup.innerHTML = `
    <div class="popup-header" style="background-color: ${backgroundColor};">
      <p class="popup-title">${sectionLabel}</p>
    </div>
    <div class="popup-body">
      <p class="popup-details" style="margin-bottom: 8px;">
        <i data-feather="users"></i>
        <span>Agentes en este turno:</span>
      </p>
      <ul class="agent-list-popup">
        ${agentListHtml}
      </ul>
    </div>
  `;

  document.body.appendChild(detailsPopup);
  // ... (código de posicionamiento del popup - sin cambios) ...
    const popupRect = detailsPopup.getBoundingClientRect();
    let top = nativeEvent.clientY + 5;
    let left = nativeEvent.clientX;
    if (top + popupRect.height > window.innerHeight) {
        top = nativeEvent.clientY - popupRect.height - 5;
    }
    if (left + popupRect.width > window.innerWidth) {
        left = nativeEvent.clientX - popupRect.width;
    }
    detailsPopup.style.top = `${top}px`;
    detailsPopup.style.left = `${left}px`;

  if (window.feather) feather.replace();

  // --- INICIO DE LA MODIFICACIÓN: Listener de clic ---
  detailsPopup.querySelectorAll('.popup-agent-item .action-icon').forEach(icon => {
    icon.addEventListener('click', (e) => {
      e.stopPropagation(); // Evitar que el clic cierre el popup inmediatamente
      const listItem = icon.closest('.popup-agent-item');
      const shiftData = JSON.parse(decodeURIComponent(listItem.dataset.shiftJson));
      const action = icon.dataset.action;

      hideShiftDetailsPopup(); // Cerrar el popup de detalles

      if (action === 'edit') {
        openEditShiftModal(shiftData); // Abrir modal de edición (admins)
      } else if (action === 'propose-change') {
    // --- INICIO DE LA CORRECCIÓN ---
    // 1. Verificar que dateString existe ANTES de llamar a la función global
    if (!shiftData.dateString) {
        console.error("Error Crítico: shiftData no contiene dateString.", shiftData);
        displayMessage("No se pudo obtener la fecha de este turno para proponer el cambio.", "error");
        // No llamamos a window.openProposeChangeModal si falta la fecha
    } else if (window.openProposeChangeModal) {
    // --- FIN DE LA CORRECCIÓN ---    
        const proposalArgs = {
            requesterAgentId: shiftData.agentId,
            requesterShiftDate: shiftData.dateString, // Ahora sabemos que existe
            requesterShiftType: shiftData.shiftType
        };
        window.openProposeChangeModal(proposalArgs);
    } else {
        console.error("La función openProposeChangeModal no está definida globalmente.");
    }
}
    });
  });
  // --- FIN DE LA MODIFICACIÓN ---
  
  setTimeout(() => {
    document.addEventListener('click', handleOutsideClick, true);
  }, 0);
}

function handleOutsideClick(event) {
  if (detailsPopup && !detailsPopup.contains(event.target)) {
    hideShiftDetailsPopup();
  }
}

/**
 * Abre el modal de edición final con los datos del agente seleccionado.
 */
function openEditShiftModal(shift) {
  if (!isInitialized) initializeShiftModal();
  if (!modal) return;
  
  currentShiftData = shift;
  
  // Rellenar la info
  const agent = availableAgents.get().find(a => a.id === shift.agentId);
  agentNameDisplay.textContent = agent ? `${agent.name} (${shift.agentId})` : `Agente ${shift.agentId}`;
  
  const date = new Date(shift.dateString + 'T00:00:00');
  dateDisplay.textContent = date.toLocaleString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  // Limpiar el 'select' por si se quedó algo seleccionado
  otherSelect.value = '';
  
  modal.classList.remove('hidden');
}

/**
 * Inicializa el modal de edición rediseñado.
 */
export function initializeShiftModal() {
  if (isInitialized) return;
  modal = document.getElementById('edit-shift-modal');
  if (!modal) return;

  // --- Encontrar los NUEVOS elementos ---
  agentNameDisplay = modal.querySelector('#shift-edit-agent-name');
  dateDisplay = modal.querySelector('#shift-edit-date');
  primaryGrid = modal.querySelector('#primary-shifts-grid');
  secondaryGrid = modal.querySelector('#secondary-shifts-grid');
  otherSelect = modal.querySelector('#other-leave-select');
  removeButton = modal.querySelector('#remove-shift-btn');
  const closeButtons = modal.querySelectorAll('.close-button');

  if (!agentNameDisplay || !dateDisplay || !primaryGrid || !secondaryGrid || !otherSelect || !removeButton) {
    console.error('Error al inicializar el nuevo modal de edición: Faltan elementos.');
    return;
  }

  // --- Rellenar los botones (se hace solo una vez) ---
  populateShiftOptions();

  // --- Asignar listeners ---
  removeButton.addEventListener('click', handleRemoveShift);
  otherSelect.addEventListener('change', handleShiftTypeClick);
  closeButtons.forEach(button => {
    button.addEventListener('click', hideShiftModal);
  });

  isInitialized = true;
  console.log('✅ Nuevo modal de edición de turnos inicializado.');
}

// --- Funciones auxiliares que deben estar en este archivo ---
function parseEventBody(body) {
  try {
    if (!body || typeof body !== 'string') return null;
    const jsonPart = body.split('---SHIFTS_JSON---')[1];
    if (!jsonPart) return null;
    return JSON.parse(jsonPart);
  } catch (e) {
    console.error('Error al parsear JSON del evento:', e, body);
    return null;
  }
}

function getAgentColor(agentId) {
  if (String(agentId) === '5281') return '#8e44ad';
  if (String(agentId) === '5605') return '#16a085';
  const colors = [
    '#d32f2f', '#c2185b', '#7b1fa2', '#512da8', '#303f9f', 
    '#1976d2', '#0288d1', '#0097a7', '#00796b', '#388e3c', 
    '#689f38', '#afb42b', '#fbc02d', '#ffa000', '#f57c00'
  ];
  const hash = String(agentId).split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
  return colors[hash % colors.length];
}

