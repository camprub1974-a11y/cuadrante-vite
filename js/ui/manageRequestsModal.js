// js/ui/manageRequestsModal.js

import { showLoading, hideLoading, displayMessage } from './viewManager.js';
import { availableAgents, currentUser } from '../state.js';
import { getShiftDisplayText, formatDate, parseISO } from '../utils.js';
import {
  getAgentName,
  getSolicitudes,
  getShiftChangeRequests,
  respondToShiftChangeRequest,
  getPermissionTypes,
  updateSolicitudStatus,
  markShiftChangeNotificationAsSeen,
  updateNotificationCount,
} from '../dataController.js';

// Definición de colores para cada tipo de turno
const shiftColors = {
    'M': { bg: '#2563eb', border: '#1e40af', text: '#ffffff' },
    'T': { bg: '#ea580c', border: '#c2410c', text: '#ffffff' },
    'N': { bg: '#4b5563', border: '#374151', text: '#ffffff' },
    'L': { bg: '#78716c', border: '#57534e', text: '#ffffff' },
    'P': { bg: '#a855f7', border: '#9333ea', text: '#ffffff' },
    'V': { bg: '#8b5cf6', border: '#7c3aed', text: '#ffffff' },
    'B': { bg: '#dc2626', border: '#991b1b', text: '#ffffff' },
    'AP': { bg: '#0d9488', border: '#0f766e', text: '#ffffff' },
    'Lc': { bg: '#16a34a', border: '#15803d', text: '#ffffff' },
    'default': { bg: '#cccccc', border: '#aaaaaa', text: '#333333'} // Color por defecto
};

// Mapa de iniciales para cada tipo de turno
const initialMap = {
    'M': 'M', 'T': 'T', 'N': 'N', 'L': 'L', 'P': 'P', 'V': 'V', 'B': 'B', 'AP': 'A', 'Lc': 'Lc'
};

/**
 * @fileoverview Lógica para el modal de gestión de solicitudes.
 * Muestra solicitudes de permisos y cambios de turno, adaptándose al rol del usuario (Admin o Guardia).
 */

let manageRequestsModal;
let permissionsListContainer = null;
let permissionsFilterStatus = null;
let permissionsFilterAgent = null;
let permissionsApplyFilterBtn = null;
let shiftChangesListContainer = null;
let shiftChangesFilterStatus = null;
let shiftChangesFilterAgent = null;
let shiftChangesApplyFilterBtn = null;
let tabButtons = null;
let closeButton = null;

let allPermissionTypes = [];

/**
 * Inicializa el modal principal de selección de gestión.
 * Esta función es llamada una sola vez al inicio de la aplicación.
 */
export function initializeManageRequestsModal() {
  console.log('[DEBUG - ManageRequestsModal] initializeManageRequestsModal llamado.');
  manageRequestsModal = document.getElementById('manage-requests-modal');
  if (!manageRequestsModal) {
    console.error(
      'ERROR - ManageRequestsModal: Modal #manage-requests-modal no encontrado. ABORTANDO INICIALIZACIÓN.'
    );
    return;
  }

  closeButton = manageRequestsModal.querySelector('.close-button');
  if (closeButton) {
    closeButton.addEventListener('click', hideManageRequestsModal);
  } else {
    console.warn(
      'WARN - ManageRequestsModal: Botón de cierre (.close-button) no encontrado en el modal principal.'
    );
  }
  // Los demás elementos se inicializarán en showManageRequestsModal
  console.log(
    '[DEBUG - ManageRequestsModal] Modal principal de gestión de solicitudes inicializado. Elementos internos se inicializarán al abrir.'
  );
}

/**
 * Inicializa los elementos DOM internos y los listeners.
 * Se llama solo la primera vez que el modal se abre para mejorar el rendimiento.
 * @returns {boolean} - true si la inicialización fue exitosa, false en caso contrario.
 */
function initializeInternalDOMElements() {
  if (permissionsListContainer) {
    console.log('[DEBUG - ManageRequestsModal] Elementos internos ya inicializados.');
    return true;
  }

  console.log(
    '[DEBUG - ManageRequestsModal] Inicializando elementos internos del modal por primera vez...'
  );
  permissionsListContainer = manageRequestsModal.querySelector('#permissions-list-container');
  permissionsFilterStatus = manageRequestsModal.querySelector('#permissions-filter-status');
  permissionsFilterAgent = manageRequestsModal.querySelector('#permissions-filter-agent');
  permissionsApplyFilterBtn = manageRequestsModal.querySelector('#permissions-apply-filter-btn');

  shiftChangesListContainer = manageRequestsModal.querySelector('#shift-changes-list-container');
  shiftChangesFilterStatus = manageRequestsModal.querySelector('#shift-changes-filter-status');
  shiftChangesFilterAgent = manageRequestsModal.querySelector('#shift-changes-filter-agent');
  shiftChangesApplyFilterBtn = manageRequestsModal.querySelector('#shift-changes-apply-filter-btn');

  tabButtons = manageRequestsModal.querySelectorAll('.tab-button');

  // [VALIDACIÓN] Asegurar que todos los elementos esenciales se hayan encontrado
  if (
    !permissionsListContainer ||
    !permissionsFilterStatus ||
    !permissionsFilterAgent ||
    !permissionsApplyFilterBtn ||
    !shiftChangesListContainer ||
    !shiftChangesFilterStatus ||
    !shiftChangesFilterAgent ||
    !shiftChangesApplyFilterBtn ||
    tabButtons.length === 0
  ) {
    console.error(
      'ERROR - ManageRequestsModal: Uno o más elementos DOM del modal de gestión de solicitudes NO SE ENCONTRARON AL INICIALIZAR INTERNAMENTE. Revise los logs detallados arriba.'
    );
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
    displayMessage('Error: No se pudo iniciar el modal de solicitudes. Recargue.', 'error');
    return false;
  }
  console.log(
    '[DEBUG - ManageRequestsModal] Elementos internos del modal encontrados y asignados.'
  );

  // Adjuntar listeners, solo si no estaban ya adjuntos
  permissionsApplyFilterBtn.addEventListener('click', renderPermissionsList);
  shiftChangesApplyFilterBtn.addEventListener('click', renderShiftChangesList);
  tabButtons.forEach((button) => button.addEventListener('click', handleTabChange));

  loadPermissionTypesMapping();
  console.log(
    '[DEBUG - ManageRequestsModal] Listeners y mapeo de tipos de permiso cargados para elementos internos.'
  );
  return true;
}

/**
 * Muestra el modal de gestión de solicitudes, inicializando sus elementos internos si es la primera vez.
 */
export function showManageRequestsModal() {
  console.log('[DEBUG - ManageRequestsModal] showManageRequestsModal llamado.');
  if (!manageRequestsModal) {
    console.error(
      '[ERROR - ManageRequestsModal] Modal de gestión de solicitudes no inicializado. No se puede mostrar.'
    );
    return;
  }
  // Inicializar elementos internos si aún no lo han sido
  const initialized = initializeInternalDOMElements();
  if (!initialized) {
    console.error(
      '[ERROR - ManageRequestsModal] Falló la inicialización de elementos internos. No se muestra el modal.'
    );
    return;
  }

  populateAgentFilters();
  manageRequestsModal.classList.remove('hidden');
  manageRequestsModal.style.display = 'flex';

  // [ADAPTACIÓN] Activa la pestaña correcta al abrir el modal, dependiendo del rol.
  const userProfile = currentUser.get();
  if (userProfile.role === 'admin') {
    setActiveTab('permissions'); // Por defecto, la pestaña de permisos para admins
  } else {
    setActiveTab('shift-changes'); // Para guardias, por defecto muestra sus cambios de turno
  }

  console.log(
    '[DEBUG - ManageRequestsModal] Modal de gestión de solicitudes visible. (display: flex)'
  );
}

/**
 * Oculta el modal de selección de gestión.
 */
export function hideManageRequestsModal() {
  console.log('[DEBUG - ManageRequestsModal] hideManageRequestsModal llamado.');
  if (manageRequestsModal) {
    manageRequestsModal.classList.add('hidden');
    manageRequestsModal.style.display = 'none';
    console.log(
      '[DEBUG - ManageRequestsModal] Modal de gestión de solicitudes oculto. (display: none)'
    );
  }
}

/**
 * Activa la pestaña seleccionada y renderiza su contenido.
 * @param {string} tabName - El nombre de la pestaña a activar ('permissions' o 'shift-changes').
 */
function setActiveTab(tabName) {
  console.log('[DEBUG - ManageRequestsModal] setActiveTab llamado. Pestaña:', tabName);
  const permissionsTab = document.getElementById('permissions-tab-content');
  const shiftChangesTab = document.getElementById('shift-changes-tab-content');

  // Asegurarse de que las pestañas existen antes de manipular
  if (!permissionsTab || !shiftChangesTab) {
    console.error('ERROR - ManageRequestsModal: Elementos de pestaña no encontrados.');
    return;
  }

  // [ADAPTACIÓN] Ocultar/mostrar filtros de agentes para guardias
  const userProfile = currentUser.get();
  const isAdmin = userProfile?.role === 'admin';
  if (!isAdmin) {
    // Oculta los selectores de agente para usuarios no admin
    permissionsFilterAgent.parentElement.style.display = 'none';
    shiftChangesFilterAgent.parentElement.style.display = 'none';
    permissionsApplyFilterBtn.style.display = 'none';
    shiftChangesApplyFilterBtn.style.display = 'none';
  } else {
    // Muestra los selectores para admins
    permissionsFilterAgent.parentElement.style.display = 'flex';
    shiftChangesFilterAgent.parentElement.style.display = 'flex';
    permissionsApplyFilterBtn.style.display = 'inline-flex';
    shiftChangesApplyFilterBtn.style.display = 'inline-flex';
  }

  tabButtons.forEach((button) => button.classList.toggle('active', button.dataset.tab === tabName));

  if (tabName === 'permissions') {
    permissionsTab.classList.remove('hidden');
    permissionsTab.style.display = 'block';
    shiftChangesTab.classList.add('hidden');
    shiftChangesTab.style.display = 'none';
    renderPermissionsList();
  } else if (tabName === 'shift-changes') {
    shiftChangesTab.classList.remove('hidden');
    shiftChangesTab.style.display = 'block';
    permissionsTab.classList.add('hidden');
    permissionsTab.style.display = 'none';
    renderShiftChangesList();
  }
}

/**
 * Maneja el cambio de pestaña.
 * @param {Event} event - El evento de clic.
 */
function handleTabChange(event) {
  setActiveTab(event.target.dataset.tab);
}

/**
 * Carga los tipos de permiso y los almacena en una variable global.
 */
async function loadPermissionTypesMapping() {
  console.log('[DEBUG - ManageRequestsModal] Cargando mapeo de tipos de permiso.');
  try {
    allPermissionTypes = await getPermissionTypes();
    console.log('[DEBUG - ManageRequestsModal] Tipos de permiso cargados:', allPermissionTypes);
  } catch (error) {
    console.error('ERROR - ManageRequestsModal: Error al cargar tipos de permiso:', error);
  }
}

/**
 * Obtiene el nombre completo de un tipo de permiso a partir de su ID.
 * @param {string} typeId - El ID del tipo de permiso.
 * @returns {string} El nombre del tipo de permiso o 'Desconocido'.
 */
function getPermissionTypeName(typeId) {
  const type = allPermissionTypes.find((t) => t.id === typeId);
  return type ? type.name : 'Desconocido';
}

/**
 * Rellena los selectores de filtro de agente según el rol del usuario.
 */
function populateAgentFilters() {
  console.log('[DEBUG - ManageRequestsModal] populateAgentFilters llamado.');
  if (!permissionsFilterAgent || !shiftChangesFilterAgent) {
    console.warn(
      '[DEBUG - ManageRequestsModal] Selectores de filtro de agente no encontrados al poblar.'
    );
    return;
  }

  const agents = availableAgents.get();
  const userProfile = currentUser.get();
  if (!userProfile) {
    console.warn(
      '[DEBUG - ManageRequestsModal] No hay perfil de usuario para poblar filtros de agente.'
    );
    return;
  }

  if (userProfile.role === 'admin') {
    let optionsHtml = '<option value="all">Todos los agentes</option>';
    agents.forEach(
      (agent) => (optionsHtml += `<option value="${agent.id}">${agent.name}</option>`)
    );
    permissionsFilterAgent.innerHTML = optionsHtml;
    shiftChangesFilterAgent.innerHTML = optionsHtml;
    permissionsFilterAgent.disabled = false;
    shiftChangesFilterAgent.disabled = false;
    console.log('[DEBUG - ManageRequestsModal] Filtros de agente poblados para Admin.');
  } else {
    // Rol 'guard'
    const userAgentOption = agents.find((a) => String(a.id) === String(userProfile.agentId));
    const optionsHtml = userAgentOption
      ? `<option value="${userAgentOption.id}">${userAgentOption.name}</option>`
      : '<option value="">- No encontrado -</option>';

    permissionsFilterAgent.innerHTML = optionsHtml;
    shiftChangesFilterAgent.innerHTML = optionsHtml;
    permissionsFilterAgent.disabled = true;
    shiftChangesFilterAgent.disabled = true;
    console.log(
      '[DEBUG - ManageRequestsModal] Filtros de agente poblados para Guardia (solo su agente).'
    );
  }
}

/**
 * Renderiza la lista de solicitudes de permisos.
 */
async function renderPermissionsList() {
  console.log('[DEBUG - ManageRequestsModal] renderPermissionsList llamado.');
  if (!permissionsListContainer) {
    console.error(
      'ERROR - ManageRequestsModal: permissionsListContainer no encontrado. No se puede renderizar la lista de permisos.'
    );
    return;
  }
  permissionsListContainer.innerHTML = '<p>Cargando solicitudes...</p>';
  showLoading();
  try {
    const userProfile = currentUser.get();
    const isAdmin = userProfile?.role === 'admin';

    // [ADAPTACIÓN CLAVE] Solo filtrar por el agente del usuario si no es admin
    const filters = {
      status: permissionsFilterStatus.value === 'all' ? null : permissionsFilterStatus.value,
      agentId: isAdmin ? permissionsFilterAgent.value : userProfile?.agentId,
    };
    console.log('[DEBUG - ManageRequestsModal] Filtros para permisos:', filters);
    const solicitudes = await getSolicitudes(filters);

    if (solicitudes.length > 0) {
      let tableRowsHtml = '';
      solicitudes.forEach((sol) => {
        const agentName = getAgentName(sol.agentId);
        const typeName = getPermissionTypeName(sol.typeId);
        const startDateFormatted =
          sol.startDate?.toDate instanceof Function
            ? formatDate(sol.startDate.toDate(), 'dd/MM/yyyy')
            : sol.startDate instanceof Date
              ? formatDate(sol.startDate, 'dd/MM/yyyy')
              : 'Inválida';
        const endDateFormatted =
          sol.endDate?.toDate instanceof Function
            ? formatDate(sol.endDate.toDate(), 'dd/MM/yyyy')
            : sol.endDate instanceof Date
              ? formatDate(sol.endDate, 'dd/MM/yyyy')
              : 'Inválida';

        const attachmentHtml =
          sol.attachments && sol.attachments.length > 0 && sol.attachments[0].url
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
                            ${
                              isAdmin && sol.status === 'Pendiente'
                                ? `
                                <button class="button button-success button-sm approve-permission-btn" data-id="${sol.id}">Aprobar</button>
                                <button class="button button-danger button-sm reject-permission-btn" data-id="${sol.id}">Rechazar</button>
                            `
                                : '-'
                            }
                        </td>
                    </tr>
                `;
      });
      permissionsListContainer.innerHTML = `
                <table class="requests-table">
                    <thead><tr><th>ID</th><th>Agente</th><th>Tipo</th><th>Fechas</th><th>Estado</th><th>Adjunto</th><th>Acciones</th></tr></thead>
                    <tbody>${tableRowsHtml}</tbody>
                </table>`;
      console.log('[DEBUG - ManageRequestsModal] Lista de permisos renderizada con éxito.');

      // [VALIDACIÓN] Solo adjuntar listeners si el usuario es admin y hay botones de acción
      if (isAdmin) {
        permissionsListContainer.querySelectorAll('.approve-permission-btn').forEach((btn) => {
          btn.addEventListener('click', (e) =>
            handleRespondToPermission(e.target.dataset.id, 'Aprobado')
          );
        });
        permissionsListContainer.querySelectorAll('.reject-permission-btn').forEach((btn) => {
          btn.addEventListener('click', (e) =>
            handleRespondToPermission(e.target.dataset.id, 'Rechazado')
          );
        });
      }
    } else {
      permissionsListContainer.innerHTML = '<p>No hay solicitudes de permisos o licencias.</p>';
      console.log('[DEBUG - ManageRequestsModal] No hay solicitudes de permisos para renderizar.');
    }
  } catch (error) {
    permissionsListContainer.innerHTML = `<p class="error-message">Error al cargar solicitudes: ${error.message}</p>`;
    console.error('ERROR - ManageRequestsModal: Error al cargar lista de permisos:', error);
  } finally {
    hideLoading();
  }
}

/**
 * Maneja la respuesta a una solicitud de permiso.
 * @param {string} solicitudId - El ID de la solicitud.
 * @param {string} newStatus - El nuevo estado de la solicitud ('Aprobado' o 'Rechazado').
 */
async function handleRespondToPermission(solicitudId, newStatus) {
  console.log(
    `[DEBUG - ManageRequestsModal] handleRespondToPermission llamado para ID ${solicitudId} con estado ${newStatus}.`
  );
  showLoading();
  try {
    await updateSolicitudStatus({ solicitudId, newStatus });
    displayMessage(`Solicitud de permiso procesada con éxito.`, 'success');
    console.log(`[DEBUG - ManageRequestsModal] Solicitud de permiso ${solicitudId} procesada.`);
    await renderPermissionsList();
    await updateNotificationCount();
  } catch (error) {
    displayMessage(`Error al responder al permiso: ${error.message}`, 'error');
    console.error(
      `ERROR - ManageRequestsModal: Error al responder a la solicitud de permiso ${solicitudId}:`,
      error
    );
  } finally {
    hideLoading();
  }
}



/**
 * Renderiza la lista de solicitudes de cambio de turno.
 */
async function renderShiftChangesList() {
    console.log("[DEBUG - ManageRequestsModal] renderShiftChangesList llamado.");
    const container = document.getElementById('shift-changes-list-container');
    if (!container) {
        console.error("Error: Contenedor #shift-changes-list-container no encontrado.");
        return;
    }

    container.innerHTML = '<p class="info-message">Cargando propuestas...</p>';

    const statusFilter = document.getElementById('shift-changes-filter-status').value;
    const agentFilter = document.getElementById('shift-changes-filter-agent').value;
    const user = currentUser.get();

    if (!user || !user.agentId) {
        container.innerHTML = '<p class="error-message">Error: Usuario no válido.</p>';
        return;
    }

    const filters = {
        status: statusFilter === 'all' ? null : statusFilter,
        agentId: (user.role === 'admin' || user.role === 'supervisor') && agentFilter !== 'all' ? agentFilter : user.agentId
    };
    console.log("[DEBUG - ManageRequestsModal] Filtros para cambios de turno enviados a dataController:", filters);

    try {
        const requests = await getShiftChangeRequests(filters);
        console.log("[DEBUG - ManageRequestsModal] Datos recibidos de getShiftChangeRequests:", requests);

        if (!Array.isArray(requests)) {
             throw new Error("La respuesta de getShiftChangeRequests no fue un array.");
        }

        if (requests.length === 0) {
            container.innerHTML = '<p class="info-message">No hay propuestas de cambio de turno que coincidan con los filtros.</p>';
            return;
        }

        const agentsMap = new Map(availableAgents.get().map(a => [String(a.id), a.name]));

        const cardsHtml = requests.map(req => {
            const requesterName = agentsMap.get(String(req.requesterAgentId)) || `Agente ${req.requesterAgentId}`;
            // targetName is not used in the card display but could be useful elsewhere

            // --- Robust Date Formatting ---
            let requesterDateFormatted = 'N/A';
            if (req.requesterShiftDate) {
                try {
                    const dateObj = (req.requesterShiftDate instanceof Date) ? req.requesterShiftDate : parseISO(String(req.requesterShiftDate));
                    if (dateObj && !isNaN(dateObj)) {
                        requesterDateFormatted = formatDate(dateObj, 'd MMM');
                    } else {
                        console.warn(`[renderShiftChangesList] Invalid requesterShiftDate after parsing:`, req.requesterShiftDate);
                    }
                } catch (e) {
                    console.error(`Error parsing or formatting requesterShiftDate: ${req.requesterShiftDate}`, e);
                }
            }

            let targetDateFormatted = 'N/A';
            if (req.targetShiftDate) {
                 try {
                    const dateObj = (req.targetShiftDate instanceof Date) ? req.targetShiftDate : parseISO(String(req.targetShiftDate));
                    if (dateObj && !isNaN(dateObj)) {
                        targetDateFormatted = formatDate(dateObj, 'd MMM');
                    } else {
                        console.warn(`[renderShiftChangesList] Invalid targetShiftDate after parsing:`, req.targetShiftDate);
                    }
                } catch (e) {
                     console.error(`Error parsing or formatting targetShiftDate: ${req.targetShiftDate}`, e);
                }
            }
            // --- End Robust Date Formatting ---

            const isTargetUser = String(req.targetAgentId) === String(user.agentId);
            const canRespond = isTargetUser && req.status === 'Pendiente_Target';

            const requesterShiftInfo = getShiftVisuals(req.requesterShiftType);
            const targetShiftInfo = getShiftVisuals(req.targetShiftType);
            const statusText = req.status ? req.status.replace(/_/g, ' ') : 'Desconocido';

            return `
                <div class="shift-change-card" data-request-id="${req.id}">
                    <div class="card-header">
                        Propuesta de: <strong>${requesterName} (${req.requesterAgentId})</strong>
                    </div>
                    <div class="card-body">
                        <div class="shift-comparison">
                            <div class="shift-details offered">
                                <span class="shift-label">Turno Ofrecido</span>
                                <div class="shift-info">
                                    <span class="shift-icon" style="background-color: ${requesterShiftInfo.color}; border-color: ${requesterShiftInfo.border};">
                                        ${requesterShiftInfo.initial}
                                    </span>
                                    <span class="shift-type">${getShiftDisplayText(req.requesterShiftType)}</span>
                                </div>
                                <span class="shift-date">${requesterDateFormatted}</span>
                            </div>
                            <div class="exchange-icon">
                                <i data-feather="refresh-cw"></i>
                            </div>
                            <div class="shift-details requested">
                                <span class="shift-label">Tu Turno</span>
                                <div class="shift-info">
                                     <span class="shift-icon" style="background-color: ${targetShiftInfo.color}; border-color: ${targetShiftInfo.border};">
                                        ${targetShiftInfo.initial}
                                    </span>
                                    <span class="shift-type">${req.targetShiftType ? getShiftDisplayText(req.targetShiftType) : 'Día Libre'}</span>
                                </div>
                                <span class="shift-date">${targetDateFormatted}</span>
                            </div>
                        </div>
                        ${req.requesterComments ? `<div class="comments-section"><p><strong>Comentarios:</strong> ${req.requesterComments}</p></div>` : ''}
                        <div class="status-section">
                            Estado: <span class="status-pill status-${req.status}">${statusText}</span>
                        </div>
                    </div>
                    ${canRespond ? `
                    <div class="card-footer actions">
                        <button class="button button-danger respond-btn" data-action="reject">
                            <i data-feather="x-circle"></i> Rechazar
                        </button>
                        <button class="button button-success respond-btn" data-action="approve">
                            <i data-feather="check-circle"></i> Aceptar
                        </button>
                    </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        container.innerHTML = cardsHtml;
        if (window.feather) feather.replace();

        container.querySelectorAll('.respond-btn').forEach(button => {
            button.addEventListener('click', handleShiftChangeResponse);
        });

        console.log("[DEBUG - ManageRequestsModal] Lista de cambios de turno renderizada con éxito.");

    } catch (error) {
        console.error("Error al renderizar la lista de cambios de turno:", error);
        container.innerHTML = `<p class="error-message">Error al cargar las propuestas: ${error.message}</p>`;
    }
}

// Función auxiliar para obtener inicial y color (similar a la de main.js)
// ¡Asegúrate de que `shiftColors` e `initialMap` estén disponibles aquí!
// Puedes definirlas globalmente en este archivo o importarlas si las exportas desde otro sitio.


function getShiftVisuals(shiftType) {
    const colors = shiftColors[shiftType] || shiftColors['default'] || { bg: '#ccc', border: '#aaa' };
    const initial = initialMap[shiftType] || '?';
    return { initial: initial, color: colors.bg, border: colors.border };
}


// Asegúrate de tener esta función para manejar la respuesta
async function handleShiftChangeResponse(event) {
    const button = event.currentTarget;
    const action = button.dataset.action; // 'approve' or 'reject'
    const card = button.closest('.shift-change-card');
    const requestId = card.dataset.requestId;

    const confirmationMessage = action === 'approve'
        ? "¿Estás seguro de que quieres ACEPTAR este cambio de turno?"
        : "¿Estás seguro de que quieres RECHAZAR esta propuesta?";

    if (!confirm(confirmationMessage)) return;

    showLoading('Procesando respuesta...');
    try {
        await respondToShiftChangeRequest({ // Función de dataController
            changeId: requestId,
            response: action // 'approve' or 'reject'
        });
        displayMessage(`Propuesta ${action === 'approve' ? 'aceptada' : 'rechazada'}.`, 'success');
        // Vuelve a renderizar la lista para que desaparezca la propuesta respondida
        await renderShiftChangesList(); 
        await updateNotificationCount(); // Actualiza la campana
    } catch (error) {
        displayMessage(`Error al ${action === 'approve' ? 'aceptar' : 'rechazar'}: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

/**
 * Maneja la respuesta a una solicitud de cambio de turno.
 * @param {string} changeId - El ID de la solicitud de cambio.
 * @param {string} newStatus - El nuevo estado.
 */
async function handleRespondToShiftChange(changeId, newStatus) {
  console.log(
    `[DEBUG - ManageRequestsModal] handleRespondToShiftChange llamado para ID ${changeId} con estado ${newStatus}.`
  );
  showLoading();
  try {
    await respondToShiftChangeRequest({ changeId, newStatus });
    displayMessage(`Solicitud procesada con éxito.`, 'success');
    console.log(
      `[DEBUG - ManageRequestsModal] Solicitud ${changeId} procesada por Cloud Function.`
    );
    await renderShiftChangesList();
    await updateNotificationCount();
  } catch (error) {
    displayMessage(`Error al responder: ${error.message}`, 'error');
    console.error(
      `ERROR - ManageRequestsModal: Error al responder a la solicitud ${changeId}:`,
      error
    );
  } finally {
    hideLoading();
  }
}
