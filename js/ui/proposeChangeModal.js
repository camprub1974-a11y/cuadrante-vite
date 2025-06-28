// js/ui/proposeChangeModal.js

import { currentUser, availableAgents, scheduleData } from '../state.js';
import { displayMessage, showLoading, hideLoading } from './viewManager.js';
import { addShiftChangeRequest, updateNotificationCount } from '../dataController.js'; // Añadido updateNotificationCount
import { getShiftDisplayText } from '../utils.js';

let modal = null;
let form = null;
let closeButton = null;
let submitButton = null;
let requesterShiftInfo = null;
let targetAgentSelect = null;
let targetDateInput = null;
let targetShiftInfo = null;
let commentsInput = null;

let currentProposal = {};

// Esta función solo inicializa el modal principal
export function initializeProposeChangeModal() {
    console.log("[DEBUG - ProposeChangeModal] initializeProposeChangeModal llamado.");
    modal = document.getElementById('propose-change-modal');
    if (!modal) {
        console.error("ERROR - ProposeChangeModal: Modal #propose-change-modal no encontrado. ABORTANDO INICIALIZACIÓN.");
        return;
    }
    closeButton = modal.querySelector('.close-button');
    if (closeButton) {
        closeButton.addEventListener('click', hideProposeChangeModal);
    } else {
        console.warn("WARN - ProposeChangeModal: Botón de cierre (.close-button) no encontrado en el modal principal.");
    }
    console.log("[DEBUG - ProposeChangeModal] Modal principal de propuesta inicializado.");
}

// Inicialización de elementos internos y listeners (se llama la primera vez que se abre el modal)
function _initializeInternalDOMElements() {
    if (form) { // Si ya se inicializaron
        console.log("[DEBUG - ProposeChangeModal] Elementos internos ya inicializados.");
        return true;
    }

    console.log("[DEBUG - ProposeChangeModal] Inicializando elementos internos del modal por primera vez...");
    form = modal.querySelector('#propose-change-form');
    submitButton = modal.querySelector('#propose-submit-btn');
    requesterShiftInfo = modal.querySelector('#propose-requester-shift-info');
    targetAgentSelect = modal.querySelector('#propose-target-agent-select');
    targetDateInput = modal.querySelector('#propose-target-date-input');
    targetShiftInfo = modal.querySelector('#propose-target-shift-info');
    commentsInput = modal.querySelector('#propose-comments');

    // === NUEVOS LOGS DE DEPURACIÓN ESPECÍFICOS ===
    console.log("Elementos ProposeChangeModal - Estado de obtención (después de querySelector):");
    console.log("  form:", !!form, form);
    console.log("  submitButton:", !!submitButton, submitButton);
    console.log("  requesterShiftInfo:", !!requesterShiftInfo, requesterShiftInfo);
    console.log("  targetAgentSelect:", !!targetAgentSelect, targetAgentSelect);
    console.log("  targetDateInput:", !!targetDateInput, targetDateInput);
    console.log("  targetShiftInfo:", !!targetShiftInfo, targetShiftInfo);
    console.log("  commentsInput:", !!commentsInput, commentsInput);
    // === FIN NUEVOS LOGS ===

    if (!form || !submitButton || !requesterShiftInfo || !targetAgentSelect ||
        !targetDateInput || !targetShiftInfo || !commentsInput) {
        console.error("ERROR - ProposeChangeModal: Fallo al encontrar elementos DOM internos cruciales. Verifique IDs en index.html.");
        const missing = [];
        if (!form) missing.push('form');
        if (!submitButton) missing.push('submitButton');
        if (!requesterShiftInfo) missing.push('requesterShiftInfo');
        if (!targetAgentSelect) missing.push('targetAgentSelect');
        if (!targetDateInput) missing.push('targetDateInput');
        if (!targetShiftInfo) missing.push('targetShiftInfo');
        if (!commentsInput) missing.push('commentsInput');
        console.error("Elementos faltantes:", missing.join(', '));
        displayMessage("Error: No se pudo cargar el formulario de propuesta. Recargue.", "error");
        return false;
    }

    // Adjuntar listeners (solo una vez)
    form.addEventListener('submit', handleSubmitProposal);
    targetAgentSelect.addEventListener('change', fetchAndDisplayTargetShift);
    targetDateInput.addEventListener('change', fetchAndDisplayTargetShift);

    console.log("[DEBUG - ProposeChangeModal] Elementos internos y listeners inicializados completamente.");
    return true;
}


export function openProposeChangeModal(requesterAgentId, requesterDate, requesterShiftType) {
    currentProposal = { requesterAgentId, requesterDate, requesterShiftType };

    if (!modal) {
        console.error("ERROR - ProposeChangeModal: El modal de propuesta no está inicializado. No se puede abrir.");
        displayMessage("Error: El modal de propuesta no está listo.", "error");
        return;
    }
    // Inicializar elementos internos si aún no lo han sido
    const initialized = _initializeInternalDOMElements();
    if (!initialized) {
        console.error("ERROR - ProposeChangeModal: Falló la inicialización de elementos internos. No se muestra el modal.");
        return;
    }

    requesterShiftInfo.textContent = `${requesterShiftType} del ${new Date(requesterDate + 'T12:00:00').toLocaleDateString('es-ES')}`;
    
    const agents = availableAgents.get();
    const userProfile = currentUser.get();
    targetAgentSelect.innerHTML = '<option value="">Selecciona un compañero...</option>';
    if (agents && userProfile) {
        agents.forEach(agent => {
            if (String(agent.id) !== String(userProfile.agentId)) { // Comparar como strings
                targetAgentSelect.innerHTML += `<option value="${agent.id}">${agent.name}</option>`;
            }
        });
    } else {
        console.warn("[DEBUG - ProposeChangeModal] No hay agentes o perfil de usuario para poblar selector de compañero.");
    }
    
    form.reset();
    targetShiftInfo.textContent = 'Selecciona compañero y fecha...';
    targetShiftInfo.style.color = 'inherit';
    submitButton.disabled = true;

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    console.log("[DEBUG - ProposeChangeModal] Abriendo modal para proponer cambio. Solicitante:", requesterAgentId, "Fecha:", requesterDate, "Turno:", requesterShiftType);
    console.log("[DEBUG - ProposeChangeModal] Modal de propuesta visible. (display: flex)");
}

function hideProposeChangeModal() {
    console.log("[DEBUG - ProposeChangeModal] hideProposeChangeModal llamado.");
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
        console.log("[DEBUG - ProposeChangeModal] Modal de propuesta oculto. (display: none)");
    }
}

async function fetchAndDisplayTargetShift() {
    const targetAgentId = targetAgentSelect.value;
    const targetDate = targetDateInput.value;

    submitButton.disabled = true;
    targetShiftInfo.textContent = '...';

    if (!targetAgentId || !targetDate) {
        targetShiftInfo.textContent = 'Selecciona compañero y fecha...';
        return;
    }

    const schedule = scheduleData.get();
    let foundShift = null;

    if (!schedule || !schedule.weeks) {
        console.warn("[DEBUG - ProposeChangeModal] Datos de cuadrante no disponibles para buscar turno objetivo.");
        targetShiftInfo.textContent = 'Cuadrante no disponible.';
        targetShiftInfo.style.color = 'var(--color-danger)';
        return;
    }

    for (const weekKey in schedule.weeks) {
        for (const dayKey in schedule.weeks[weekKey].days) {
            const day = schedule.weeks[weekKey].days[dayKey];
            if (day.date === targetDate) {
                const shiftEntry = Object.values(day.shifts).find(s => String(s.agentId) === String(targetAgentId)); // Comparar como strings
                if (shiftEntry) {
                    foundShift = shiftEntry.shiftType;
                }
                break;
            }
        }
        if (foundShift !== null) break;
    }

    if (foundShift) {
        targetShiftInfo.textContent = `${getShiftDisplayText(foundShift)}`;
        targetShiftInfo.style.color = 'var(--success-color)'; // Usar la variable CSS correcta
        currentProposal.targetAgentId = targetAgentId;
        currentProposal.targetDate = targetDate;
        currentProposal.targetShiftType = foundShift;
        submitButton.disabled = false;
        console.log(`[DEBUG - ProposeChangeModal] Turno objetivo encontrado: ${foundShift} para agente ${targetAgentId} en ${targetDate}`);
    } else {
        targetShiftInfo.textContent = 'No se encontró turno para esa fecha.';
        targetShiftInfo.style.color = 'var(--danger-color)'; // Usar la variable CSS correcta
        console.warn(`[DEBUG - ProposeChangeModal] No se encontró turno para agente ${targetAgentId} en ${targetDate}`);
    }
}

async function handleSubmitProposal(event) {
    event.preventDefault();
    submitButton.disabled = true;
    console.log("[DEBUG - ProposeChangeModal] Intentando enviar propuesta de cambio de turno.");

    const proposalData = {
        requesterAgentId: currentProposal.requesterAgentId,
        targetAgentId: currentProposal.targetAgentId,
        requesterShiftDate: currentProposal.requesterDate,
        requesterShiftType: currentProposal.requesterShiftType,
        targetShiftDate: currentProposal.targetDate,
        targetShiftType: currentProposal.targetShiftType,
        requesterComments: commentsInput.value
    };
    
    console.log("[DEBUG - ProposeChangeModal] Datos de la propuesta a enviar:", proposalData);

    try {
        const result = await addShiftChangeRequest(proposalData);
        console.log("[DEBUG - ProposeChangeModal] Respuesta de addShiftChangeRequest (dataController):", result);
        displayMessage('Solicitud de cambio de turno enviada correctamente.', 'success');
        hideProposeChangeModal();
        await updateNotificationCount(); // Actualizar notificaciones
    } catch (error) {
        console.error("ERROR - ProposeChangeModal: Error al enviar la propuesta de cambio:", error);
        displayMessage(`Error al enviar la propuesta: ${error.message}`, 'error');
        submitButton.disabled = false;
    }
}