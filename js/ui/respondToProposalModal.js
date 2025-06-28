// js/ui/respondToProposalModal.js

import { displayMessage, showLoading, hideLoading } from './viewManager.js';
import { respondToShiftChangeRequest, getShiftChangeRequests, updateNotificationCount } from '../dataController.js';
import { getAgentName, render as renderSchedule } from './scheduleRenderer.js';
import { formatDate } from '../utils.js';

let modal = null;
let closeButton = null;
let approveButton = null;
let rejectButton = null;
let detailsContainer = null;
let requesterNameEl = null;
let requesterShiftInfoEl = null;
let targetShiftInfoEl = null;
let commentsContainer = null;
let commentsTextEl = null;

let currentChangeId = null;

export function initializeRespondToProposalModal() {
    console.log("[DEBUG - RespondToProposalModal] initializeRespondToProposalModal llamado.");
    
    modal = document.getElementById('respond-to-proposal-modal');
    if (!modal) {
        console.error("ERROR - RespondToProposalModal: Modal #respond-to-proposal-modal no encontrado en el DOM. ABORTANDO INICIALIZACIÓN.");
        return;
    }

    closeButton = modal.querySelector('.close-button'); 
    if (closeButton) {
        closeButton.addEventListener('click', hideRespondToProposalModal);
    } else {
        console.warn("WARN - RespondToProposalModal: Botón de cierre (.close-button) no encontrado en el modal.");
    }
    
    console.log("[DEBUG - RespondToProposalModal] Modal de respuesta principal inicializado. Elementos internos se inicializarán al abrir.");
}

// Inicialización de elementos internos y listeners (se llama la primera vez que se abre el modal)
function _initializeInternalDOMElements() {
    if (detailsContainer) { // Si ya se inicializaron
        console.log("[DEBUG - RespondToProposalModal] Elementos internos ya inicializados.");
        return true;
    }

    console.log("[DEBUG - RespondToProposalModal] Inicializando elementos internos del modal por primera vez...");
    approveButton = modal.querySelector('#respond-accept-btn');
    rejectButton = modal.querySelector('#respond-reject-btn');
    detailsContainer = modal.querySelector('#respond-proposal-details');
    requesterNameEl = detailsContainer ? detailsContainer.querySelector('#respond-requester-name') : null;
    requesterShiftInfoEl = detailsContainer ? detailsContainer.querySelector('#respond-requester-shift-info') : null;
    targetShiftInfoEl = detailsContainer ? detailsContainer.querySelector('#respond-target-shift-info') : null;
    commentsContainer = detailsContainer ? detailsContainer.querySelector('#respond-comments-container') : null;
    commentsTextEl = commentsContainer ? commentsContainer.querySelector('#respond-comments-text') : null;

    // === NUEVOS LOGS DE DEPURACIÓN ESPECÍFICOS ===
    console.log("Elementos RespondToProposalModal - Estado de obtención (después de querySelector):");
    console.log("  approveButton:", !!approveButton, approveButton);
    console.log("  rejectButton:", !!rejectButton, rejectButton);
    console.log("  detailsContainer:", !!detailsContainer, detailsContainer);
    console.log("  requesterNameEl:", !!requesterNameEl, requesterNameEl);
    console.log("  requesterShiftInfoEl:", !!requesterShiftInfoEl, requesterShiftInfoEl);
    console.log("  targetShiftInfoEl:", !!targetShiftInfoEl, targetShiftInfoEl);
    console.log("  commentsContainer:", !!commentsContainer, commentsContainer);
    console.log("  commentsTextEl:", !!commentsTextEl, commentsTextEl);
    // === FIN NUEVOS LOGS ===

    if (!approveButton || !rejectButton || !detailsContainer || 
        !requesterNameEl || !requesterShiftInfoEl || !targetShiftInfoEl || 
        !commentsContainer || !commentsTextEl) {
        console.error("ERROR - RespondToProposalModal: Fallo al encontrar elementos internos al abrir el modal.");
        displayMessage("Error: Faltan elementos en el modal. Recargue.", "error");
        return false;
    }
    console.log("[DEBUG - RespondToProposalModal] Elementos internos inicializados y listeners adjuntados.");

    // Adjuntar listeners (solo una vez)
    if (approveButton) approveButton.addEventListener('click', () => handleResponse('Aprobado_Ambos'));
    if (rejectButton) rejectButton.addEventListener('click', () => handleResponse('Rechazado'));
    
    return true;
}

export async function openRespondToProposalModal(changeId) {
    currentChangeId = changeId;
    
    if (!modal) {
        console.error("ERROR - RespondToProposalModal: El modal principal no está inicializado. No se puede abrir.");
        displayMessage("Error: El modal de respuesta no está listo.", "error");
        return;
    }
    // Inicializar elementos internos si aún no lo han sido
    const initialized = _initializeInternalDOMElements();
    if (!initialized) {
        console.error("ERROR - RespondToProposalModal: Falló la inicialización de elementos internos. No se muestra el modal.");
        return;
    }

    modal.classList.remove('hidden');
    modal.style.display = 'flex';

    requesterNameEl.textContent = 'Cargando...';
    requesterShiftInfoEl.textContent = '---';
    targetShiftInfoEl.textContent = '---';
    commentsContainer.style.display = 'none';

    try {
        console.log("[DEBUG - RespondToProposalModal] Abriendo modal de respuesta para changeId:", changeId);
        // Obtener todas las solicitudes de cambio de turno del usuario (guardia) o admin
        // El `getShiftChangeRequests` ya filtra por agente si no es admin, o trae todo si lo es.
        const allMyRequests = await getShiftChangeRequests(); 
        const proposal = allMyRequests.find(req => req.id === changeId);

        if (proposal) {
            console.log("[DEBUG - RespondToProposalModal] Propuesta encontrada:", proposal);
            requesterNameEl.textContent = getAgentName(proposal.requesterAgentId);
            
            const requesterDateFormatted = formatDate(proposal.requesterShiftDate, 'dd/MM/yyyy');
            const targetDateFormatted = formatDate(proposal.targetShiftDate, 'dd/MM/yyyy');
            
            requesterShiftInfoEl.textContent = `${proposal.requesterShiftType} del ${requesterDateFormatted}`;
            targetShiftInfoEl.textContent = `${proposal.targetShiftType} del ${targetDateFormatted}`;

            if (proposal.requesterComments) {
                commentsTextEl.textContent = proposal.requesterComments;
                commentsContainer.style.display = 'block';
            }
            
        } else {
           requesterNameEl.textContent = "Error";
           requesterShiftInfoEl.textContent = "No se pudo cargar la propuesta.";
           console.error("[ERROR - RespondToProposalModal] Propuesta no encontrada en el caché o en la lista de solicitudes:", changeId);
        }
    } catch (error) {
        requesterNameEl.textContent = "Error";
        requesterShiftInfoEl.textContent = `Error al cargar: ${error.message}`;
        console.error("ERROR - RespondToProposalModal: Error al cargar propuesta para respuesta:", error);
    }
}

function hideRespondToProposalModal() {
    console.log("[DEBUG - RespondToProposalModal] hideRespondToProposalModal llamado.");
    if (!modal) return;
    modal.classList.add('hidden');
    modal.style.display = 'none';
    console.log("[DEBUG - RespondToProposalModal] Modal de respuesta oculto. (display: none)");
}

async function handleResponse(newStatus) {
    if (!currentChangeId) return;

    showLoading();
    try {
        console.log(`[DEBUG - RespondToProposalModal] Enviando respuesta para changeId ${currentChangeId} con estado ${newStatus}.`);
        await respondToShiftChangeRequest({ changeId: currentChangeId, newStatus });
        displayMessage('Respuesta enviada con éxito.', 'success');
        console.log("[DEBUG - RespondToProposalModal] Respuesta a propuesta enviada por Cloud Function.");
        hideRespondToProposalModal();
        await renderSchedule(); // Re-renderizar el cuadrante para mostrar los cambios
        await updateNotificationCount(); // Actualizar contador de notificaciones
    } catch (error) {
        displayMessage(`Error al enviar la respuesta: ${error.message}`, 'error');
        console.error("ERROR - RespondToProposalModal: Error al enviar la respuesta a la propuesta:", error);
    } finally {
        hideLoading();
    }
}