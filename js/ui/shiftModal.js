// js/ui/shiftModal.js

import { availableAgents, currentUser, selectedMonthId } from '../state.js'; // Añadido selectedMonthId
import { displayMessage, showLoading, hideLoading } from './viewManager.js';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase-config.js'; // Asegúrate de que 'app' sea la instancia de Firebase
import { render as renderSchedule } from './scheduleRenderer.js';
import { getPermissionTypes } from '../dataController.js';

let modal = null;
let form = null;
let closeButton = null;
let shiftSelect = null;
let agentSelect = null;
let formTitle = null;

let currentShiftData = {};
let allPermissionTypes = [];

export function initializeShiftModal() {
    console.log("[DEBUG - ShiftModal] initializeShiftModal llamado.");
    modal = document.getElementById('edit-shift-modal');
    if (!modal) {
        console.error("ERROR - ShiftModal: Modal #edit-shift-modal no encontrado en el DOM. ABORTANDO INICIALIZACIÓN.");
        return;
    }

    closeButton = modal.querySelector('.close-button'); 
    if (closeButton) {
        closeButton.addEventListener('click', hideShiftModal);
    } else {
        console.warn("WARN - ShiftModal: Botón de cierre (.close-button) no encontrado en el modal principal.");
    }
    console.log("[DEBUG - ShiftModal] Modal principal de edición de turno inicializado.");
}

// Inicialización de elementos internos y listeners (se llama la primera vez que se abre el modal)
async function _initializeInternalDOMElements() {
    if (form) { // Si ya se inicializaron
        console.log("[DEBUG - ShiftModal] Elementos internos ya inicializados.");
        return true;
    }

    console.log("[DEBUG - ShiftModal] Inicializando elementos internos del modal por primera vez...");
    form = modal.querySelector('#edit-shift-form');
    shiftSelect = modal.querySelector('#shift-type-select');
    agentSelect = modal.querySelector('#shift-agent-select');
    formTitle = modal.querySelector('#shift-form-title');
    
    // === NUEVOS LOGS DE DEPURACIÓN ESPECÍFICOS ===
    console.log("Elementos ShiftModal - Estado de obtención (después de querySelector):");
    console.log("  form:", !!form, form);
    console.log("  shiftSelect:", !!shiftSelect, shiftSelect);
    console.log("  agentSelect:", !!agentSelect, agentSelect);
    console.log("  formTitle:", !!formTitle, formTitle);
    // === FIN NUEVOS LOGS ===

    if (!form || !shiftSelect || !agentSelect || !formTitle) {
        console.error("ERROR - ShiftModal: Fallo al encontrar elementos DOM internos cruciales. Verifique IDs en index.html.");
        const missing = [];
        if (!form) missing.push('form');
        if (!shiftSelect) missing.push('shiftSelect');
        if (!agentSelect) missing.push('agentSelect');
        if (!formTitle) missing.push('formTitle');
        console.error("Elementos faltantes:", missing.join(', '));
        displayMessage("Error: No se pudo cargar el formulario de edición de turno. Recargue.", "error");
        return false;
    }

    // Adjuntar listeners (solo una vez)
    form.addEventListener('submit', handleFormSubmit);
    
    await loadPermissionTypesForShiftModal(); // Cargar tipos de permiso una vez que shiftSelect esté disponible
    console.log("[DEBUG - ShiftModal] Elementos internos y listeners inicializados completamente.");
    return true;
}

// Nueva función para cargar y poblar los tipos de permiso
async function loadPermissionTypesForShiftModal() {
    console.log("[DEBUG - ShiftModal] Cargando tipos de permiso para el selector de turno...");
    try {
        allPermissionTypes = await getPermissionTypes();
        console.log("[DEBUG - ShiftModal] Tipos de permiso recibidos de dataController:", allPermissionTypes);
        
        let optionsHtml = '';
        optionsHtml += '<option value="M">Mañana</option>';
        optionsHtml += '<option value="T">Tarde</option>';
        optionsHtml += '<option value="N">Noche</option>';
        optionsHtml += '<option value="L">Libre</option>';
        optionsHtml += '<option value="-">Sin Asignación</option>';

        if (allPermissionTypes && allPermissionTypes.length > 0) {
            allPermissionTypes.forEach(type => {
                const value = type.initial_quadrant || type.id; 
                optionsHtml += `<option value="${value}">${type.name}</option>`;
            });
        }
        shiftSelect.innerHTML = optionsHtml;
        console.log("[DEBUG - ShiftModal] Selector de tipo de turno poblado con HTML:", optionsHtml);
        console.log("[DEBUG - ShiftModal] Contenido final de shiftSelect.innerHTML:", shiftSelect.innerHTML);
    } catch (error) {
        displayMessage('Error al cargar tipos de permiso para el modal de turno.', 'error');
        console.error("ERROR - ShiftModal: Error al cargar tipos de permiso:", error);
    }
}

export function openEditShiftModal(weekKey, dayKey, agentId, currentShiftType, actualDayDate, cell) {
    console.log("[DEBUG - ShiftModal] openEditShiftModal llamado.");
    console.log(`[DEBUG - ShiftModal] Datos para edición: week=${weekKey}, day=${dayKey}, agent=${agentId}, type=${currentShiftType}, date=${actualDayDate}`);
    
    if (!modal) {
        console.error("ERROR - ShiftModal: El modal de edición de turno no está inicializado. No se puede abrir.");
        displayMessage("Error: El modal de edición de turno no está listo.", "error");
        return;
    }
    // Inicializar elementos internos si aún no lo han sido
    const initialized = _initializeInternalDOMElements();
    if (!initialized) {
        console.error("ERROR - ShiftModal: Falló la inicialización de elementos internos. No se muestra el modal.");
        return;
    }

    currentShiftData = { weekKey, dayKey, agentId: String(agentId), existingShiftKey: cell.dataset.existingShiftKey };
    
    if (formTitle) formTitle.textContent = `Editar Turno del Día ${new Date(actualDayDate + 'T12:00:00').toLocaleDateString('es-ES')}`;
    
    const agents = availableAgents.get();
    if (agentSelect && agents && agents.length > 0) {
        agentSelect.innerHTML = '';
        agents.forEach(agent => {
            const option = document.createElement('option');
            option.value = String(agent.id);
            option.textContent = agent.name;
            if (String(agent.id) === String(agentId)) {
                option.selected = true;
            }
            agentSelect.appendChild(option);
        });
        console.log("[DEBUG - ShiftModal] Selector de agentes en modal de edición poblado.");
    } else if (agentSelect) {
        agentSelect.innerHTML = '<option>Cargando agentes...</option>';
        console.warn("[DEBUG - ShiftModal] No hay agentes disponibles para poblar el selector en el modal de edición.");
    }
    
    if (shiftSelect) {
        // Asegurarse de que el valor actual del select sea el que se pasa
        const foundOptionByValue = Array.from(shiftSelect.options).find(opt => opt.value === currentShiftType);
        if (foundOptionByValue) {
            shiftSelect.value = foundOptionByValue.value;
        } else {
            // Si no se encuentra por valor, intentar buscar por texto o usar un valor predeterminado
            const foundOptionByText = Array.from(shiftSelect.options).find(opt => opt.textContent === currentShiftType);
            if (foundOptionByText) {
                shiftSelect.value = foundOptionByText.value;
            } else {
                shiftSelect.value = '-'; // Valor por defecto
            }
        }
    }
    console.log(`[DEBUG - ShiftModal] Selector de turno establecido a: ${shiftSelect.value}`);

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    console.log("[DEBUG - ShiftModal] Modal de edición de turno visible. (display: flex)");
}

function hideShiftModal() {
    console.log("[DEBUG - ShiftModal] hideShiftModal llamado.");
    if (!modal) return;
    modal.classList.add('hidden');
    modal.style.display = 'none';
    console.log("[DEBUG - ShiftModal] Modal de edición de turno oculto. (display: none)");
}

async function handleFormSubmit(event) {
    event.preventDefault();
    console.log("[DEBUG - ShiftModal] handleFormSubmit llamado.");
    showLoading();

    const functions = getFunctions(app); // 'app' viene de firebase-config.js, está correcto
    const updateShift = httpsCallable(functions, 'updateShiftV2');

    // Obtener monthId del átomo selectedMonthId
    const monthId = selectedMonthId.get(); 

    if (!monthId) {
        displayMessage('No se pudo determinar el mes actual. Recarga la página.', 'error');
        console.error("ERROR - ShiftModal: No se pudo obtener el monthId del átomo selectedMonthId.");
        hideLoading();
        return;
    }

    const dataToSend = {
        ...currentShiftData,
        monthId: monthId,
        agentId: String(agentSelect.value),
        newShiftType: shiftSelect.value
    };
    console.log("[DEBUG - ShiftModal] Datos a enviar a updateShiftV2:", dataToSend);

    try {
        await updateShift(dataToSend);
        displayMessage('Turno actualizado con éxito.', 'success');
        console.log("[DEBUG - ShiftModal] Turno actualizado por Cloud Function.");
        hideShiftModal();
        await renderSchedule(); // Re-renderizar el cuadrante para mostrar los cambios
    } catch (error) {
        displayMessage(`Error al actualizar el turno: ${error.message}`, 'error');
        console.error("ERROR - ShiftModal: Error al llamar a Cloud Function updateShiftV2:", error);
    } finally {
        hideLoading();
    }
}