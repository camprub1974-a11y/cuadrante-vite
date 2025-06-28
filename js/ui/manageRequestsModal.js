// js/ui/manageRequestsModal.js

import { showLoading, hideLoading, displayMessage } from './viewManager.js';
import { availableAgents, currentUser } from '../state.js';
import { formatDate } from '../utils.js';
import { getSolicitudes, getShiftChangeRequests, respondToShiftChangeRequest, getPermissionTypes, updateSolicitudStatus, markShiftChangeNotificationAsSeen, updateNotificationCount } from '../dataController.js';

let manageRequestsModal; // Solo el modal principal se obtiene en initialize
// Declarar el resto como null, se inicializarán la primera vez que showManageRequestsModal sea llamado
let permissionsListContainer = null;
let permissionsFilterStatus = null;
let permissionsFilterAgent = null;
let permissionsApplyFilterBtn = null;
let shiftChangesListContainer = null;
let shiftChangesFilterStatus = null;
let shiftChangesFilterAgent = null;
let shiftChangesApplyFilterBtn = null;
let tabButtons = null; // Será un NodeList
let closeButton = null;

let allPermissionTypes = []; // Para almacenar los tipos de permiso cargados

// Esta función solo inicializa el modal principal y el botón de cerrar
export function initializeManageRequestsModal() {
    console.log("[DEBUG - ManageRequestsModal] initializeManageRequestsModal llamado.");
    manageRequestsModal = document.getElementById('manage-requests-modal');
    if (!manageRequestsModal) {
        console.error("ERROR - ManageRequestsModal: Modal #manage-requests-modal no encontrado. ABORTANDO INICIALIZACIÓN.");
        return;
    }
    
    closeButton = manageRequestsModal.querySelector('.close-button'); 
    if (closeButton) {
        closeButton.addEventListener('click', hideManageRequestsModal);
    } else {
        console.warn("WARN - ManageRequestsModal: Botón de cierre (.close-button) no encontrado en el modal principal.");
    }

    // Los demás elementos se inicializarán en showManageRequestsModal
    console.log("[DEBUG - ManageRequestsModal] Modal principal de gestión de solicitudes inicializado. Elementos internos se inicializarán al abrir.");
}

// Nueva función para inicializar los elementos internos si aún no lo han sido
function initializeInternalDOMElements() {
    // Si permissionsListContainer ya tiene un valor, significa que ya se inicializaron
    if (permissionsListContainer) { 
        console.log("[DEBUG - ManageRequestsModal] Elementos internos ya inicializados.");
        return true; 
    }

    console.log("[DEBUG - ManageRequestsModal] Inicializando elementos internos del modal por primera vez...");
    permissionsListContainer = manageRequestsModal.querySelector('#permissions-list-container');
    permissionsFilterStatus = manageRequestsModal.querySelector('#permissions-filter-status');
    permissionsFilterAgent = manageRequestsModal.querySelector('#permissions-filter-agent');
    permissionsApplyFilterBtn = manageRequestsModal.querySelector('#permissions-apply-filter-btn');
    
    shiftChangesListContainer = manageRequestsModal.querySelector('#shift-changes-list-container');
    shiftChangesFilterStatus = manageRequestsModal.querySelector('#shift-changes-filter-status');
    shiftChangesFilterAgent = manageRequestsModal.querySelector('#shift-changes-filter-agent');
    shiftChangesApplyFilterBtn = manageRequestsModal.querySelector('#shift-changes-apply-filter-btn');
    
    tabButtons = manageRequestsModal.querySelectorAll('.tab-button'); // NodeList, se maneja diferente

    // === NUEVOS LOGS DE DEPURACIÓN ESPECÍFICOS PARA CADA ELEMENTO ===
    console.log("Elementos ManageRequestsModal - Estado de obtención (después de querySelector):");
    console.log("  permissionsListContainer:", !!permissionsListContainer, permissionsListContainer);
    console.log("  permissionsFilterStatus:", !!permissionsFilterStatus, permissionsFilterStatus);
    console.log("  permissionsFilterAgent:", !!permissionsFilterAgent, permissionsFilterAgent);
    console.log("  permissionsApplyFilterBtn:", !!permissionsApplyFilterBtn, permissionsApplyFilterBtn);
    console.log("  shiftChangesListContainer:", !!shiftChangesListContainer, shiftChangesListContainer);
    console.log("  shiftChangesFilterStatus:", !!shiftChangesFilterStatus, shiftChangesFilterStatus);
    console.log("  shiftChangesFilterAgent:", !!shiftChangesFilterAgent, shiftChangesFilterAgent);
    console.log("  shiftChangesApplyFilterBtn:", !!shiftChangesApplyFilterBtn, shiftChangesApplyFilterBtn);
    console.log("  tabButtons (length):", tabButtons ? tabButtons.length : 0, tabButtons);
    // === FIN NUEVOS LOGS ===

    // Validar que todos los elementos esenciales se hayan encontrado
    if (!permissionsListContainer || !permissionsFilterStatus || !permissionsFilterAgent || !permissionsApplyFilterBtn ||
        !shiftChangesListContainer || !shiftChangesFilterStatus || !shiftChangesFilterAgent || !shiftChangesApplyFilterBtn ||
        tabButtons.length === 0) { // tabButtons es un NodeList, se verifica su longitud
        console.error("ERROR - ManageRequestsModal: Uno o más elementos DOM del modal de gestión de solicitudes NO SE ENCONTRARON AL INICIALIZAR INTERNAMENTE. Revise los logs detallados arriba.");
        const missing = [];
        if (!permissionsListContainer) missing.push('permissionsListContainer');
        if (!permissionsFilterStatus) missing.push('permissionsFilterStatus');
        if (!permissionsFilterAgent) missing.push('permissionsFilterAgent');
        if (!permissionsApplyFilterBtn) missing.push('permissionsApplyFilterBtn');
        if (!shiftChangesListContainer) missing.push('shiftChangesListContainer');
        if (!shiftChangesFilterStatus) missing.push('shiftChangesFilterStatus');
        if (!shiftChangesFilterAgent) missing.push('shiftChangesFilterAgent');
        if (!shiftChangesApplyFilterBtn) missing.push('shiftChangesApplyFilterBtn');
        if (tabButtons.length === 0) missing.push('tabButtons');
        displayMessage("Error: No se pudo iniciar el modal de solicitudes. Recargue.", "error");
        return false; // Indicar fallo
    }
    console.log("[DEBUG - ManageRequestsModal] Elementos internos del modal encontrados y asignados.");

    // Adjuntar listeners, solo si no estaban ya adjuntos
    if (permissionsApplyFilterBtn) permissionsApplyFilterBtn.addEventListener('click', renderPermissionsList);
    if (shiftChangesApplyFilterBtn) shiftChangesApplyFilterBtn.addEventListener('click', renderShiftChangesList); 
    if (tabButtons) tabButtons.forEach(button => button.addEventListener('click', handleTabChange));

    loadPermissionTypesMapping();
    console.log("[DEBUG - ManageRequestsModal] Listeners y mapeo de tipos de permiso cargados para elementos internos.");
    return true; // Indicar éxito
}

export function showManageRequestsModal() {
    console.log("[DEBUG - ManageRequestsModal] showManageRequestsModal llamado.");
    if (!manageRequestsModal) {
        console.error("[ERROR - ManageRequestsModal] Modal de gestión de solicitudes no inicializado. No se puede mostrar.");
        return;
    }
    // Inicializar elementos internos si aún no lo han sido
    const initialized = initializeInternalDOMElements();
    if (!initialized) {
        console.error("[ERROR - ManageRequestsModal] Falló la inicialización de elementos internos. No se muestra el modal.");
        return; // No mostrar si la inicialización interna falló
    }

    populateAgentFilters(); 
    manageRequestsModal.classList.remove('hidden');
    manageRequestsModal.style.display = 'flex';
    setActiveTab('permissions'); // Por defecto, la pestaña de permisos
    console.log("[DEBUG - ManageRequestsModal] Modal de gestión de solicitudes visible. (display: flex)");
}

export function hideManageRequestsModal() {
    console.log("[DEBUG - ManageRequestsModal] hideManageRequestsModal llamado.");
    if (manageRequestsModal) {
        manageRequestsModal.classList.add('hidden');
        manageRequestsModal.style.display = 'none';
        console.log("[DEBUG - ManageRequestsModal] Modal de gestión de solicitudes oculto. (display: none)");
    }
}

function setActiveTab(tabName) {
    console.log("[DEBUG - ManageRequestsModal] setActiveTab llamado. Pestaña:", tabName);
    const permissionsTab = document.getElementById('permissions-tab-content');
    const shiftChangesTab = document.getElementById('shift-changes-tab-content');

    // Asegurarse de que las pestañas existen antes de manipular
    if (!permissionsTab || !shiftChangesTab) {
        console.error("ERROR - ManageRequestsModal: Elementos de pestaña no encontrados.");
        return;
    }

    tabButtons.forEach(button => button.classList.toggle('active', button.dataset.tab === tabName));

    if (tabName === 'permissions') {
        permissionsTab.classList.remove('hidden');
        permissionsTab.style.display = 'block';
        shiftChangesTab.classList.add('hidden');
        shiftChangesTab.style.display = 'none';
    } else if (tabName === 'shift-changes') {
        shiftChangesTab.classList.remove('hidden');
        shiftChangesTab.style.display = 'block';
        permissionsTab.classList.add('hidden');
        permissionsTab.style.display = 'none';
    }

    if (tabName === 'permissions') {
        renderPermissionsList();
    } else if (tabName === 'shift-changes') {
        renderShiftChangesList();
    }
}

function handleTabChange(event) {
    setActiveTab(event.target.dataset.tab);
}

async function loadPermissionTypesMapping() {
    console.log("[DEBUG - ManageRequestsModal] Cargando mapeo de tipos de permiso.");
    try {
        allPermissionTypes = await getPermissionTypes();
        console.log("[DEBUG - ManageRequestsModal] Tipos de permiso cargados:", allPermissionTypes);
    } catch (error) { 
        console.error("ERROR - ManageRequestsModal: Error al cargar tipos de permiso:", error); 
    }
}

function getAgentName(agentId) {
    const agent = availableAgents.get().find(a => String(a.id) === String(agentId));
    return agent ? agent.name : `ID ${agentId}`;
}

function getPermissionTypeName(typeId) {
    const type = allPermissionTypes.find(t => t.id === typeId);
    return type ? type.name : 'Desconocido';
}

function populateAgentFilters() {
    console.log("[DEBUG - ManageRequestsModal] populateAgentFilters llamado.");
    // Asegurarse de que los selectores de filtro están inicializados
    if (!permissionsFilterAgent || !shiftChangesFilterAgent) {
        console.warn("[DEBUG - ManageRequestsModal] Selectores de filtro de agente no encontrados al poblar.");
        return;
    }

    const agents = availableAgents.get();
    const userProfile = currentUser.get();
    if (!userProfile) {
        console.warn("[DEBUG - ManageRequestsModal] No hay perfil de usuario para poblar filtros de agente.");
        return;
    }

    if (userProfile.role === 'admin') {
        let optionsHtml = '<option value="all">Todos los agentes</option>';
        agents.forEach(agent => optionsHtml += `<option value="${agent.id}">${agent.name}</option>`);
        permissionsFilterAgent.innerHTML = optionsHtml;
        shiftChangesFilterAgent.innerHTML = optionsHtml;
        permissionsFilterAgent.disabled = false;
        shiftChangesFilterAgent.disabled = false;
        console.log("[DEBUG - ManageRequestsModal] Filtros de agente poblados para Admin.");
    } else { // Guard
        const userAgentOption = agents.find(a => String(a.id) === String(userProfile.agentId));
        const optionsHtml = userAgentOption 
            ? `<option value="${userAgentOption.id}">${userAgentOption.name}</option>`
            : '<option value="">- No encontrado -</option>';
        
        permissionsFilterAgent.innerHTML = optionsHtml;
        shiftChangesFilterAgent.innerHTML = optionsHtml;
        permissionsFilterAgent.disabled = true;
        shiftChangesFilterAgent.disabled = true;
        console.log("[DEBUG - ManageRequestsModal] Filtros de agente poblados para Guardia (solo su agente).");
    }
}

async function renderPermissionsList() {
    console.log("[DEBUG - ManageRequestsModal] renderPermissionsList llamado.");
    if (!permissionsListContainer) {
        console.error("ERROR - ManageRequestsModal: permissionsListContainer no encontrado. No se puede renderizar la lista de permisos.");
        return;
    }
    permissionsListContainer.innerHTML = '<p>Cargando solicitudes...</p>';
    showLoading();
    try {
        const filters = {
            status: permissionsFilterStatus.value === 'all' ? null : permissionsFilterStatus.value,
            agentId: permissionsFilterAgent.value, 
        };
        console.log("[DEBUG - ManageRequestsModal] Filtros para permisos:", filters);
        const solicitudes = await getSolicitudes(filters);
        
        if (solicitudes.length > 0) {
            const userProfile = currentUser.get();
            const isAdmin = userProfile.role === 'admin';

            let tableRowsHtml = '';
            solicitudes.forEach(sol => {
                 const agentName = getAgentName(sol.agentId);
                 const typeName = getPermissionTypeName(sol.typeId);
                 const startDateFormatted = sol.startDate?.toDate instanceof Function ? formatDate(sol.startDate.toDate(), 'dd/MM/yyyy') : (sol.startDate instanceof Date ? formatDate(sol.startDate, 'dd/MM/yyyy') : 'Inválida');
                 const endDateFormatted = sol.endDate?.toDate instanceof Function ? formatDate(sol.endDate.toDate(), 'dd/MM/yyyy') : (sol.endDate instanceof Date ? formatDate(sol.endDate, 'dd/MM/yyyy') : 'Inválida');

                 const attachmentHtml = (sol.attachments && sol.attachments.length > 0 && sol.attachments[0].url) 
                    ? `<a href="${sol.attachments[0].url}" target="_blank" class="attachment-link" title="Ver adjunto"><svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px" fill="#1a73e8"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V7.5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5V16c0 .55-.45 1-1 1s-1-.45-1-1V7.5c0-.55-.45-1-1-1s-1 .45-1 1V16c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V6h-2z"/></svg></a>`
                    : '';
                
                tableRowsHtml += `
                    <tr>
                        <td>${sol.id.substring(0, 6)}...</td>
                        <td>${agentName}</td>
                        <td>${typeName}</td>
                        <td>${startDateFormatted} a ${endDateFormatted}</td>
                        <td><span class="status-badge status-${sol.status.toLowerCase()}">${sol.status}</span></td>
                        <td>${attachmentHtml}</td>
                        <td>
                            ${(isAdmin && sol.status === 'Pendiente') ? `
                                <button class="button button-success button-sm approve-permission-btn" data-id="${sol.id}">Aprobar</button>
                                <button class="button button-danger button-sm reject-permission-btn" data-id="${sol.id}">Rechazar</button>
                            ` : '-'}
                        </td>
                    </tr>
                `;
            });
            permissionsListContainer.innerHTML = `
                <table class="requests-table">
                    <thead><tr><th>ID</th><th>Agente</th><th>Tipo</th><th>Fechas</th><th>Estado</th><th>Adjunto</th><th>Acciones</th></tr></thead>
                    <tbody>${tableRowsHtml}</tbody>
                </table>`;
            console.log("[DEBUG - ManageRequestsModal] Lista de permisos renderizada con éxito.");

            permissionsListContainer.querySelectorAll('.approve-permission-btn').forEach(btn => {
                btn.addEventListener('click', e => handleRespondToPermission(e.target.dataset.id, 'Aprobado'));
            });
            permissionsListContainer.querySelectorAll('.reject-permission-btn').forEach(btn => {
                btn.addEventListener('click', e => handleRespondToPermission(e.target.dataset.id, 'Rechazado'));
            });

        } else {
            permissionsListContainer.innerHTML = '<p>No hay solicitudes de permisos o licencias.</p>';
            console.log("[DEBUG - ManageRequestsModal] No hay solicitudes de permisos para renderizar.");
        }
    } catch (error) {
        permissionsListContainer.innerHTML = `<p class="error-message">Error al cargar solicitudes: ${error.message}</p>`;
        console.error("ERROR - ManageRequestsModal: Error al cargar lista de permisos:", error);
    } finally {
        hideLoading();
    }
}

async function handleRespondToPermission(solicitudId, newStatus) {
    console.log(`[DEBUG - ManageRequestsModal] handleRespondToPermission llamado para ID ${solicitudId} con estado ${newStatus}.`);
    showLoading();
    try {
        await updateSolicitudStatus({ solicitudId, newStatus });
        displayMessage(`Solicitud de permiso procesada con éxito.`, 'success');
        console.log(`[DEBUG - ManageRequestsModal] Solicitud de permiso ${solicitudId} procesada.`);
        await renderPermissionsList();
        await updateNotificationCount(); // Actualizar contador de notificaciones
    } catch (error) {
        displayMessage(`Error al responder al permiso: ${error.message}`, 'error');
        console.error(`ERROR - ManageRequestsModal: Error al responder a la solicitud de permiso ${solicitudId}:`, error);
    } finally {
        hideLoading();
    }
}

async function renderShiftChangesList() {
    console.log("[DEBUG - ManageRequestsModal] renderShiftChangesList llamado.");
    if (!shiftChangesListContainer) {
        console.error("ERROR - ManageRequestsModal: shiftChangesListContainer no encontrado. No se puede renderizar la lista de cambios de turno.");
        return;
    }
    shiftChangesListContainer.innerHTML = '<p>Cargando cambios de turno...</p>';
    showLoading();
    try {
        const userProfile = currentUser.get();
        const isAdmin = userProfile.role === 'admin';

        const filters = {
            status: shiftChangesFilterStatus.value === 'all' ? null : shiftChangesFilterStatus.value,
            agentId: isAdmin ? shiftChangesFilterAgent.value : userProfile.agentId
        };
        console.log("[DEBUG - ManageRequestsModal] Filtros para cambios de turno enviados a dataController:", filters);
        const solicitudesCambio = await getShiftChangeRequests(filters);
        console.log("[DEBUG - ManageRequestsModal] Datos recibidos de getShiftChangeRequests:", solicitudesCambio);

         if (solicitudesCambio.length > 0) {
            let tableRowsHtml = '';
            solicitudesCambio.forEach(sol => {
                const requesterAgentName = getAgentName(sol.requesterAgentId);
                const targetAgentName = getAgentName(sol.targetAgentId);
                const reqDateFormatted = sol.requesterShiftDate instanceof Date ? formatDate(sol.requesterShiftDate, 'dd/MM/yyyy') : 'Inválida';
                const targetDateFormatted = sol.targetShiftDate instanceof Date ? formatDate(sol.targetShiftDate, 'dd/MM/yyyy') : 'Inválida';
                const showActionButtons = sol.status === 'Pendiente_Target' && (isAdmin || String(userProfile.agentId) === String(sol.targetAgentId));
                
                tableRowsHtml += `
                    <tr>
                        <td>${sol.id.substring(0, 6)}...</td>
                        <td>${requesterAgentName}</td>
                        <td>${reqDateFormatted} (${sol.requesterShiftType})</td>
                        <td>${targetAgentName}</td>
                        <td>${targetDateFormatted} (${sol.targetShiftType})</td>
                        <td><span class="status-badge status-${sol.status.toLowerCase()}">${sol.status}</span></td>
                        <td>
                            ${showActionButtons ? `
                                <button class="button button-success button-sm approve-shift-change-btn" data-id="${sol.id}">Aprobar</button>
                                <button class="button button-danger button-sm reject-shift-change-btn" data-id="${sol.id}">Rechazar</button>
                            ` : '-'}
                            ${isAdmin && sol.status === 'Aprobado_Ambos' && sol.adminNotified === false ? `
                                <button class="button button-secondary button-sm mark-seen-btn" data-id="${sol.id}">Marcar visto</button>
                            ` : ''}
                        </td>
                    </tr>
                `;
            });
            shiftChangesListContainer.innerHTML = `
                <table class="requests-table">
                    <thead><tr><th>ID</th><th>Solicitante</th><th>Turno Ofrecido</th><th>Compañero</th><th>Turno Recibido</th><th>Estado</th><th>Acciones</th></tr></thead>
                    <tbody>${tableRowsHtml}</tbody>
                </table>`;

            shiftChangesListContainer.querySelectorAll('.approve-shift-change-btn').forEach(btn => btn.addEventListener('click', e => handleRespondToShiftChange(e.target.dataset.id, 'Aprobado_Ambos')));
            shiftChangesListContainer.querySelectorAll('.reject-shift-change-btn').forEach(btn => btn.addEventListener('click', e => handleRespondToShiftChange(e.target.dataset.id, 'Rechazado')));
            // Listener para el nuevo botón "Marcar visto"
            shiftChangesListContainer.querySelectorAll('.mark-seen-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    await markShiftChangeNotificationAsSeen(e.target.dataset.id);
                    renderShiftChangesList(); // Re-renderizar la lista para que el botón desaparezca
                });
            });
            console.log("[DEBUG - ManageRequestsModal] Lista de cambios de turno renderizada con éxito.");
        } else {
            shiftChangesListContainer.innerHTML = '<p>No hay solicitudes de cambio de turno para ti.</p>';
            console.log("[DEBUG - ManageRequestsModal] No hay solicitudes de cambio de turno para renderizar.");
        }
    } catch (error) {
        shiftChangesListContainer.innerHTML = `<p class="error-message">Error al cargar cambios de turno: ${error.message}</p>`;
        console.error("ERROR - ManageRequestsModal: Error al cargar lista de cambios de turno:", error);
    } finally {
        hideLoading();
    }
}

async function handleRespondToShiftChange(changeId, newStatus) {
    console.log(`[DEBUG - ManageRequestsModal] handleRespondToShiftChange llamado para ID ${changeId} con estado ${newStatus}.`);
    showLoading();
    try {
        await respondToShiftChangeRequest({ changeId, newStatus });
        displayMessage(`Solicitud procesada con éxito.`, 'success');
        console.log(`[DEBUG - ManageRequestsModal] Solicitud ${changeId} procesada por Cloud Function.`);
        await renderShiftChangesList();
        await updateNotificationCount(); // Actualizar contador de notificaciones
    } catch (error) {
        displayMessage(`Error al responder: ${error.message}`, 'error');
        console.error(`ERROR - ManageRequestsModal: Error al responder a la solicitud ${changeId}:`, error);
    } finally {
        hideLoading();
    }
}