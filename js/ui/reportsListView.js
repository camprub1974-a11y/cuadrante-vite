// js/ui/reportsListView.js (VERSIÓN FINAL Y DEFINITIVA)

import { populateAgentSelector, populateMonthSelector, populateYearSelector } from './selectorManager.js';
import { getServiceReports, getActiveServiceOrdersForAgent, startServiceOrder, deleteServiceReport } from '../dataController.js';
import { displayMessage, showLoading, hideLoading } from './viewManager.js';
import { formatDate } from '../utils.js';
import { currentUser } from '../state.js';
import { showServiceReportView } from '../main.js';

let adminEventListenersInitialized = false;

// --- Variables de paginación (para la vista de admin) ---
let currentPage = 1;
let lastVisibleDoc = null;
let pageHistory = [null];
let hasNextPage = false;

// ==================================================================
// === FUNCIÓN PRINCIPAL DE RENDERIZADO =============================
// ==================================================================

export async function renderReportsList() {
  await new Promise(resolve => requestAnimationFrame(resolve));

  const user = currentUser.get();
  const isAdminView = user.role === 'admin' || user.role === 'supervisor';

  const adminContainer = document.getElementById('admin-view-container');
  const agentContainer = document.getElementById('agent-view-container');

  if (!adminContainer || !agentContainer) {
    console.error("Error crítico: No se encontraron los contenedores de vista #admin-view-container o #agent-view-container.");
    displayMessage("Error al cargar la interfaz de Partes de Servicio.", "error");
    return;
  }

  adminContainer.classList.toggle('hidden', !isAdminView);
  agentContainer.classList.toggle('hidden', isAdminView);

  if (isAdminView) {
    initializeAdminView();
  } else {
    initializeAgentView();
  }
}

// ==================================================================
// === VISTA DE AGENTE ==============================================
// ==================================================================

/**
 * Inicializa la vista del agente, cargando los partes y configurando los eventos.
 */
function initializeAgentView() {
  const agentContainer = document.getElementById('agent-view-container');
  if (!agentContainer) return;

  loadAndRenderAgentOrders();
  initializeAgentCardListeners(agentContainer);
}

/**
 * Llama a la Cloud Function para obtener los partes y los renderiza en la pantalla.
 */
async function loadAndRenderAgentOrders() {
  showLoading();
  try {
    // --- INICIO DE LA CORRECIÓN FINAL ---
    // El ID correcto en tu HTML es 'agent-reports-list-container', no 'agent-active-orders'.
    const container = document.getElementById('agent-reports-list-container');
    // --- FIN DE LA CORRECIÓN FINAL ---

    if (!container) {
      console.error("Error definitivo: El contenedor #agent-reports-list-container no existe en el archivo partes_servicio.html.");
      return;
    }

    const orders = await getActiveServiceOrdersForAgent();
    
    if (orders && orders.length > 0) {
      container.innerHTML = orders.map(order => createIntelligentOrderCard(order)).join('');
    } else {
      container.innerHTML = `
        <div class="empty-state">
          <i data-feather="coffee"></i>
          <p>No tienes partes de servicio activos para hoy.</p>
        </div>
      `;
    }

    if (window.feather) feather.replace();

  } catch (error) {
    console.error('Error en loadAndRenderAgentOrders:', error);
    const container = document.getElementById('agent-reports-list-container');
    if(container) container.innerHTML = `<p class="error-message">No se pudieron cargar los partes de servicio.</p>`;
  } finally {
    hideLoading();
  }
}

/**
 * Genera el HTML para una tarjeta de parte de servicio.
 */
function createIntelligentOrderCard(order) {
  const isInProgress = order.status === 'in_progress';
  const buttonText = isInProgress ? 'Continuar Parte' : 'Activar Parte';
  const buttonIcon = isInProgress ? 'edit' : 'play-circle';
  const buttonAction = isInProgress ? 'continue-report' : 'start-report';
  const buttonClass = isInProgress ? 'button-success' : 'button-primary';
  
  return `
    <div class="report-card">
      <div class="card-body">
        <h3 class="card-title">${order.title}</h3>
        <p class="card-subtitle">${order.order_reg_number || 'Sin Nº Registro'}</p>
        <div class="card-details">
          <div><i data-feather="calendar"></i><span>${formatDate(new Date(order.service_date), 'dd/MM/yyyy')}</span></div>
          <div><i data-feather="clock"></i><span>${order.service_shift}</span></div>
        </div>
        <div class="card-actions">
          <button class="button ${buttonClass}" data-action="${buttonAction}" data-order-id="${order.id}" ${isInProgress ? `data-report-id="${order.reportId}"` : ''}>
            <i data-feather="${buttonIcon}"></i>
            <span>${buttonText}</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Configura los listeners para los botones de las tarjetas de agente (Activar/Continuar).
 */
function initializeAgentCardListeners(container) {
  if (!container || container.dataset.listenerAttached === 'true') return;
  container.dataset.listenerAttached = 'true';

  container.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    
    const action = button.dataset.action;
    const orderId = button.dataset.orderId;
    
    if (action === 'start-report') {
      if (!confirm('¿Seguro que quieres activar este parte de servicio?')) return;
      showLoading('Activando parte...');
      try {
        const result = await startServiceOrder(orderId);
        showServiceReportView(result.reportId);
      } catch (error) {
        displayMessage(`Error al activar: ${error.message}`, 'error');
      } finally {
        hideLoading();
      }
    } else if (action === 'continue-report') {
      const reportId = button.dataset.reportId;
      if (reportId) showServiceReportView(reportId);
    }
  });
}

// ==================================================================
// === VISTA DE ADMINISTRADOR (LÓGICA SIN CAMBIOS) ==================
// ==================================================================

function initializeAdminView() {
    if (adminEventListenersInitialized) {
        loadAdminReports();
        return;
    }
    
    setupAdminFilters();
    currentPage = 1;
    pageHistory = [null];
    loadAdminReports();
    
    const adminViewContainer = document.getElementById('admin-view-container');
    if (!adminViewContainer) return;

    adminViewContainer.addEventListener('click', async (event) => {
        const button = event.target.closest('button');
        if (!button) return;

        if (button.closest('#reports-pagination-controls')) {
            if (button.id === 'reports-next-page' && hasNextPage) {
                currentPage++;
                loadAdminReports();
            } else if (button.id === 'reports-prev-page' && currentPage > 1) {
                currentPage--;
                pageHistory.pop();
                loadAdminReports();
            }
            return;
        }

        if (button.id === 'apply-report-filters-btn' || button.id === 'clear-report-filters-btn') {
            if (button.id === 'clear-report-filters-btn') {
                document.getElementById('report-filter-year').selectedIndex = 0;
                document.getElementById('report-filter-month').value = 'all';
                document.getElementById('report-filter-agent').selectedIndex = 0;
                document.getElementById('report-filter-status').selectedIndex = 0;
            }
            currentPage = 1;
            pageHistory = [null];
            loadAdminReports();
            return;
        }

        const reportId = button.dataset.reportId;
        const action = button.dataset.action;

        if (reportId) {
            if (action === 'review' || action === 'view') {
                showServiceReportView(reportId);
            } else if (action === 'delete') {
                if (confirm('¿Seguro que quieres eliminar este parte de servicio?')) {
                    showLoading('Eliminando...');
                    try {
                        await deleteServiceReport(reportId);
                        displayMessage('Parte eliminado.', 'success');
                        loadAdminReports();
                    } catch (error) {
                        displayMessage(`Error al eliminar: ${error.message}`, 'error');
                    } finally {
                        hideLoading();
                    }
                }
            }
        }
    });

    adminEventListenersInitialized = true;
}

function setupAdminFilters() {
  populateYearSelector(document.getElementById('report-filter-year'));
  populateMonthSelector(document.getElementById('report-filter-month'));
  populateAgentSelector(document.getElementById('report-filter-agent'), true);
}

async function loadAdminReports() {
  showLoading('Cargando partes de servicio...');
  try {
    const filters = {
      year: document.getElementById('report-filter-year').value,
      month: document.getElementById('report-filter-month').value,
      agentId: document.getElementById('report-filter-agent').value,
      status: document.getElementById('report-filter-status').value,
      limit: 15,
      startAfter: pageHistory[currentPage - 1]
    };
    
    const result = await getServiceReports(filters);

    if (result && result.success && Array.isArray(result.reports)) {
      lastVisibleDoc = result.lastVisible || null;
      hasNextPage = !!lastVisibleDoc;
      if (hasNextPage && pageHistory.length === currentPage) {
        pageHistory.push(lastVisibleDoc);
      }
      renderAdminReportsTable(result.reports);
      updatePaginationControls(result.reports.length);
    } else {
      renderAdminReportsTable([]);
      if (result && result.message) displayMessage(result.message, 'info');
    }
  } catch (error) {
    displayMessage(`Error al cargar los partes: ${error.message}`, 'error');
  } finally {
    hideLoading();
  }
}

function renderAdminReportsTable(reports) {
  const container = document.getElementById('reports-list-container');
  if (!container) return;
  if (!reports || reports.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No se encontraron partes con los filtros seleccionados.</p></div>`;
    return;
  }
  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Nº Registro</th>
          <th>Título de la Orden</th>
          <th>Fecha</th>
          <th>Turno</th>
          <th>Estado</th>
          <th class="actions-cell">Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${reports.map(report => `
          <tr data-id="${report.id}">
            <td>${report.order_reg_number || '---'}</td>
            <td>${report.order_title || 'N/A'}</td>
            <td>${new Date(report.created_at).toLocaleDateString()}</td>
            <td>${report.service_shift || 'N/A'}</td>
            <td><span class="status-pill status-${report.status}">${report.status.replace(/_/g, ' ')}</span></td>
            <td class="actions-cell">${getActionButtonForReport(report)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  if (window.feather) feather.replace();
}

function updatePaginationControls(recordCount) {
    const pageInfo = document.getElementById('reports-page-info');
    const prevButton = document.getElementById('reports-prev-page');
    const nextButton = document.getElementById('reports-next-page');
    if (pageInfo) pageInfo.textContent = `Página ${currentPage}`;
    if (prevButton) prevButton.disabled = currentPage === 1;
    if (nextButton) nextButton.disabled = !hasNextPage || recordCount < 15;
}

function getActionButtonForReport(report) {
  let actions = '';
  const canDelete = currentUser.get().role === 'admin';
  switch (report.status) {
    case 'pending_review':
      actions += `<button class="button button-primary" data-action="review" data-report-id="${report.id}" title="Revisar Parte"><i data-feather="eye"></i><span>Revisar</span></button>`;
      break;
    default:
      actions += `<button class="button button-secondary" data-action="view" data-report-id="${report.id}" title="Ver Parte"><i data-feather="file-text"></i><span>Ver</span></button>`;
      break;
  }
  if (canDelete) {
    actions += `<button class="button button-danger button-icon" data-action="delete" data-report-id="${report.id}" title="Eliminar Parte"><i data-feather="trash-2"></i></button>`;
  }
  return actions;
}

// ==================================================================
// === FUNCIÓN DE LIMPIEZA ==========================================
// ==================================================================

export function resetReportsListView() {
  adminEventListenersInitialized = false;
  const agentViewContainer = document.getElementById('agent-view-container');
  if (agentViewContainer) {
    delete agentViewContainer.dataset.listenerAttached;
  }
}