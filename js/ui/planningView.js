<<<<<<< HEAD
// js/ui/planningView.js (VERSIÓN CORREGIDA Y LIMPIA)
=======
// js/ui/planningView.js (VERSIÓN FINAL CON PAGINACIÓN INTEGRADA)
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33

import { displayMessage, showLoading, hideLoading } from './viewManager.js';
import { getServiceOrders, deleteServiceOrder, generateAiServiceOrder } from '../dataController.js';
import { formatDate } from '../utils.js';
import { openServiceOrderModal } from './serviceOrderModal.js';
import { openAssignmentModal } from './assignmentModal.js';
import { openViewOrderModal } from './viewOrderModal.js';
<<<<<<< HEAD
// ✅ La importación de 'renderContext' ha sido eliminada.
=======
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33

let isInitialized = false;
let currentOrders = [];

// --- VARIABLES DE ESTADO PARA LA PAGINACIÓN ---
let currentPage = 1;
<<<<<<< HEAD
let lastVisibleDoc = null;
let pageHistory = [null];
=======
let lastVisibleDoc = null; // Cursor para la siguiente página
let pageHistory = [null];  // Historial de cursores para el botón "Anterior"
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
let hasNextPage = false;

// --- FUNCIONES PRINCIPALES ---

export async function renderPlanningView() {
<<<<<<< HEAD
    try {
        initializePlanningView();
        currentPage = 1;
        lastVisibleDoc = null;
        pageHistory = [null];
        await loadAndRenderOrders();
    } catch (error) {
        console.error("Fallo crítico en la inicialización de PlanningView:", error);
        displayMessage(`Error al iniciar la vista: ${error.message}`, 'error');
        hideLoading();
    }
}

export function resetPlanningView() {
    isInitialized = false;
    // Detener listeners si es necesario al salir de la vista
    const listContainer = document.getElementById('service-orders-list-container');
    if (listContainer) listContainer.removeEventListener('click', handleTableActions);
    document.removeEventListener('serviceOrderCreated', renderPlanningView);
    document.removeEventListener('serviceOrderUpdated', renderPlanningView);
}

// --- LÓGICA DE INICIALIZACIÓN Y EVENTOS ---

function initializePlanningView() {
    if (isInitialized) return;

    const elements = {
        listContainer: document.getElementById('service-orders-list-container'),
        createOrderBtn: document.getElementById('create-order-btn'),
        aiGenerateBtn: document.getElementById('ai-generate-order-btn'),
        dateFilter: document.getElementById('order-filter-date'),
        shiftFilter: document.getElementById('order-filter-shift'),
        statusFilter: document.getElementById('order-filter-status'),
        applyFiltersBtn: document.getElementById('apply-filters-btn'),
        clearFiltersBtn: document.getElementById('clear-filters-btn'),
        paginationControls: document.getElementById('planning-pagination-controls'),
    };

    for (const [key, element] of Object.entries(elements)) {
        if (!element) {
            throw new Error(`El elemento con ID para '${key}' no se encontró en planificacion.html.`);
        }
    }

    elements.createOrderBtn.addEventListener('click', () => openServiceOrderModal(null, renderPlanningView));
    elements.aiGenerateBtn.addEventListener('click', () => handleAiGenerateClick(elements.dateFilter, elements.shiftFilter));
    elements.applyFiltersBtn.addEventListener('click', () => {
        currentPage = 1;
        lastVisibleDoc = null;
        pageHistory = [null];
        loadAndRenderOrders();
    });
    elements.clearFiltersBtn.addEventListener('click', () => clearFilters(elements));
    elements.listContainer.addEventListener('click', handleTableActions);
    elements.paginationControls.addEventListener('click', handlePaginationClick);

    document.addEventListener('serviceOrderCreated', renderPlanningView);
    document.addEventListener('serviceOrderUpdated', renderPlanningView);

    isInitialized = true;
}

// --- LÓGICA DE DATOS Y RENDERIZADO ---

async function loadAndRenderOrders() {
    const listContainer = document.getElementById('service-orders-list-container');
    if (!listContainer) return;

    showLoading('Cargando órdenes...');

    try {
        const filters = {
            date: document.getElementById('order-filter-date').value || null,
            service_shift: document.getElementById('order-filter-shift').value !== 'all' ? document.getElementById('order-filter-shift').value : null,
            status: document.getElementById('order-filter-status').value !== 'all' ? document.getElementById('order-filter-status').value : null,
            limit: 15,
            startAfter: pageHistory[currentPage - 1]
        };

        const result = await getServiceOrders(filters);

        if (!result.success) {
            throw new Error(result.message || 'Error en la respuesta del servidor.');
        }

        currentOrders = result.orders || [];
        lastVisibleDoc = result.lastVisible || null;
        hasNextPage = !!lastVisibleDoc;

        if (hasNextPage && pageHistory.length === currentPage) {
            pageHistory.push(lastVisibleDoc);
        }

        renderOrdersTable(currentOrders);
        updatePaginationControls(currentOrders.length);

    } catch (error) {
        displayMessage(`Error al cargar las órdenes: ${error.message}`, 'error');
        renderOrdersTable([]);
    } finally {
        hideLoading();
    }
}

function renderOrdersTable(orders) {
    const listContainer = document.getElementById('service-orders-list-container');
    if (!listContainer) return;

    if (orders.length === 0) {
        listContainer.innerHTML = `<div class="empty-state"><h4>No hay órdenes</h4><p>No se encontraron órdenes con los filtros actuales.</p></div>`;
        return;
    }

    listContainer.innerHTML = `
    <table class="data-table">
      <thead class="sticky-header">
        <tr>
          <th>Nº Registro</th><th>Título</th><th>Fecha y Turno</th>
          <th>Estado</th><th>Agentes</th><th style="text-align: left;">Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${orders.map(order => {
        const statusText = (order.status || 'unknown').replace('_', ' ');
        const serviceDate = order.service_date ? new Date(order.service_date) : new Date();
        return `
            <tr data-id="${order.id}">
              <td>${order.order_reg_number || '---'}</td>
              <td>${order.title}</td>
              <td>${formatDate(serviceDate, 'dd/MM/yyyy')} - ${order.service_shift}</td>
              <td><span class="status-pill status-${order.status}">${statusText}</span></td>
              <td>${(order.assigned_agents || []).length}</td>
              <td class="actions-cell">
                <button class="icon-button" data-action="view" title="Ver Contenido"><i data-feather="eye"></i></button>
                <button class="icon-button" data-action="assign" title="Asignar Agentes"><i data-feather="user-plus"></i></button>
                <button class="icon-button" data-action="edit" title="Editar Orden"><i data-feather="edit-2"></i></button>
                <button class="icon-button" data-action="delete" title="Eliminar Orden"><i data-feather="trash-2"></i></button>
              </td>
            </tr>
          `;
    }).join('')}
      </tbody>
    </table>
  `;
    if (window.feather) feather.replace();
}

// --- MANEJADORES DE ACCIONES (HANDLERS) ---

function handlePaginationClick(event) {
    const nextButton = event.target.closest('#planning-next-page');
    const prevButton = event.target.closest('#planning-prev-page');

    if (nextButton && hasNextPage) {
        currentPage++;
        loadAndRenderOrders();
    } else if (prevButton && currentPage > 1) {
        currentPage--;
        pageHistory.pop();
        loadAndRenderOrders();
    }
}

function updatePaginationControls(recordCount) {
    const pageInfo = document.getElementById('planning-page-info');
    const prevButton = document.getElementById('planning-prev-page');
    const nextButton = document.getElementById('planning-next-page');

    if (pageInfo) pageInfo.textContent = `Página ${currentPage}`;
    if (prevButton) prevButton.disabled = currentPage === 1;
    if (nextButton) nextButton.disabled = !hasNextPage;
}

function handleTableActions(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const orderId = button.closest('tr')?.dataset.id;
    if (!orderId) return;

    const action = button.dataset.action;
    const orderToProcess = currentOrders.find(o => o.id === orderId);
    if (!orderToProcess) return;

    switch (action) {
        case 'view':
            openViewOrderModal(orderToProcess);
            break;
        case 'assign':
            openAssignmentModal(orderToProcess);
            break;
        case 'edit':
            openServiceOrderModal(orderId, loadAndRenderOrders);
            break;
        case 'delete':
            handleDeleteOrder(orderId);
            break;
    }
}

async function handleAiGenerateClick(dateFilter, shiftFilter) {
    const dateString = dateFilter.value;
    const shiftType = shiftFilter.value;

    if (!dateString || shiftType === 'all' || shiftType === 'Especial') {
        displayMessage('Por favor, selecciona una fecha y un turno específicos (Mañana, Tarde o Noche) para usar la IA.', 'info');
        return;
    }
    showLoading('Generando orden con IA...');
    try {
        const result = await generateAiServiceOrder(dateString, shiftType);
        displayMessage(result.message, 'success');
        await renderPlanningView();
    } catch (error) {
        displayMessage(`Error de la IA: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

async function handleDeleteOrder(orderId) {
    if (confirm(`¿Estás seguro de que quieres eliminar esta orden?`)) {
        showLoading('Eliminando orden...');
        try {
            await deleteServiceOrder(orderId);
            displayMessage('Orden eliminada con éxito.', 'success');
            await renderPlanningView();
        } catch (error) {
            displayMessage(`Error al eliminar la orden: ${error.message}`, 'error');
        } finally {
            hideLoading();
        }
    }
}

function clearFilters(elements) {
    elements.dateFilter.value = '';
    elements.shiftFilter.value = 'all';
    elements.statusFilter.value = 'all';
    renderPlanningView();
}

// ✅ La función obsoleta 'render()' ha sido eliminada por completo.
=======
  try {
    initializePlanningView();
    // Al entrar, reseteamos la paginación y cargamos la primera página
    currentPage = 1;
    lastVisibleDoc = null;
    pageHistory = [null];
    await loadAndRenderOrders();
  } catch (error) {
    console.error("Fallo crítico en la inicialización de PlanningView:", error);
    displayMessage(`Error al iniciar la vista: ${error.message}`, 'error');
    hideLoading();
  }
}

export function resetPlanningView() {
  isInitialized = false;
}

// --- LÓGICA DE INICIALIZACIÓN Y EVENTOS ---

function initializePlanningView() {
  if (isInitialized) return;

  const elements = {
    listContainer: document.getElementById('service-orders-list-container'),
    createOrderBtn: document.getElementById('create-order-btn'),
    aiGenerateBtn: document.getElementById('ai-generate-order-btn'),
    dateFilter: document.getElementById('order-filter-date'),
    shiftFilter: document.getElementById('order-filter-shift'),
    statusFilter: document.getElementById('order-filter-status'),
    applyFiltersBtn: document.getElementById('apply-filters-btn'),
    clearFiltersBtn: document.getElementById('clear-filters-btn'),
    paginationControls: document.getElementById('planning-pagination-controls'), // Control de paginación
  };

  for (const [key, element] of Object.entries(elements)) {
    if (!element) {
      throw new Error(`El elemento con ID para '${key}' no se encontró en planificacion.html.`);
    }
  }

  elements.createOrderBtn.addEventListener('click', () => openServiceOrderModal(null, renderPlanningView));
  elements.aiGenerateBtn.addEventListener('click', () => handleAiGenerateClick(elements.dateFilter, elements.shiftFilter));
  elements.applyFiltersBtn.addEventListener('click', () => {
    // Al filtrar, siempre volvemos a la página 1
    currentPage = 1;
    lastVisibleDoc = null;
    pageHistory = [null];
    loadAndRenderOrders();
  });
  elements.clearFiltersBtn.addEventListener('click', () => clearFilters(elements));
  elements.listContainer.addEventListener('click', handleTableActions);
  elements.paginationControls.addEventListener('click', handlePaginationClick); // Listener para paginación

  document.addEventListener('serviceOrderCreated', renderPlanningView);
  document.addEventListener('serviceOrderUpdated', renderPlanningView);
  
  isInitialized = true;
}

// --- LÓGICA DE DATOS Y RENDERIZADO (CON PAGINACIÓN) ---

async function loadAndRenderOrders() {
  const listContainer = document.getElementById('service-orders-list-container');
  if (!listContainer) return;

  showLoading('Cargando órdenes...');
  
  try {
    const filters = {
      date: document.getElementById('order-filter-date').value || null,
      service_shift: document.getElementById('order-filter-shift').value !== 'all' ? document.getElementById('order-filter-shift').value : null,
      status: document.getElementById('order-filter-status').value !== 'all' ? document.getElementById('order-filter-status').value : null,
      limit: 15, // Límite de 15 registros por página
      startAfter: pageHistory[currentPage - 1] // Cursor para empezar a buscar
    };

    const result = await getServiceOrders(filters);
    
    if (!result.success) {
      throw new Error(result.message || 'Error en la respuesta del servidor.');
    }

    currentOrders = result.orders || [];
    lastVisibleDoc = result.lastVisible || null;
    hasNextPage = !!lastVisibleDoc;

    // Guardamos el cursor para la siguiente página si existe
    if (hasNextPage && pageHistory.length === currentPage) {
      pageHistory.push(lastVisibleDoc);
    }
    
    renderOrdersTable(currentOrders);
    updatePaginationControls(currentOrders.length);

  } catch (error) {
    displayMessage(`Error al cargar las órdenes: ${error.message}`, 'error');
    renderOrdersTable([]);
  } finally {
    hideLoading();
  }
}

function renderOrdersTable(orders) {
  const listContainer = document.getElementById('service-orders-list-container');
  if (!listContainer) return;

  if (orders.length === 0) {
    listContainer.innerHTML = `<div class="empty-state"><h4>No hay órdenes</h4><p>No se encontraron órdenes con los filtros actuales.</p></div>`;
    return;
  }

  listContainer.innerHTML = `
    <table class="data-table">
      <thead class="sticky-header">
        <tr>
          <th>Nº Registro</th><th>Título</th><th>Fecha y Turno</th>
          <th>Estado</th><th>Agentes</th><th style="text-align: left;">Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${orders.map(order => {
          const statusText = (order.status || 'unknown').replace('_', ' ');
          return `
            <tr data-id="${order.id}">
              <td>${order.order_reg_number || '---'}</td>
              <td>${order.title}</td>
              <td>${formatDate(new Date(order.service_date), 'dd/MM/yyyy')} - ${order.service_shift}</td>
              <td><span class="status-pill status-${order.status}">${statusText}</span></td>
              <td>${(order.assigned_agents || []).length}</td>
              <td class="actions-cell">
                <button class="icon-button" data-action="view" title="Ver Contenido"><i data-feather="eye"></i></button>
                <button class="icon-button" data-action="assign" title="Asignar Agentes"><i data-feather="user-plus"></i></button>
                <button class="icon-button" data-action="edit" title="Editar Orden"><i data-feather="edit-2"></i></button>
                <button class="icon-button" data-action="delete" title="Eliminar Orden"><i data-feather="trash-2"></i></button>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
  if (window.feather) feather.replace();
}

// --- MANEJADORES DE ACCIONES (HANDLERS) ---

function handlePaginationClick(event) {
    const nextButton = event.target.closest('#planning-next-page');
    const prevButton = event.target.closest('#planning-prev-page');

    if (nextButton && hasNextPage) {
        currentPage++;
        loadAndRenderOrders();
    } else if (prevButton && currentPage > 1) {
        currentPage--;
        // No necesitamos `lastVisibleDoc`, el historial ya lo tiene
        pageHistory.pop(); // Quitamos el cursor de la página actual para volver a la anterior
        loadAndRenderOrders();
    }
}

function updatePaginationControls(recordCount) {
    const pageInfo = document.getElementById('planning-page-info');
    const prevButton = document.getElementById('planning-prev-page');
    const nextButton = document.getElementById('planning-next-page');

    if (pageInfo) pageInfo.textContent = `Página ${currentPage}`;
    if (prevButton) prevButton.disabled = currentPage === 1;
    if (nextButton) nextButton.disabled = !hasNextPage || recordCount < 15;
}

function handleTableActions(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const orderId = button.closest('tr')?.dataset.id;
  if (!orderId) return;

  const action = button.dataset.action;
  const orderToProcess = currentOrders.find(o => o.id === orderId);
  if (!orderToProcess) return;

  switch (action) {
    case 'view':
      openViewOrderModal(orderToProcess);
      break;
    case 'assign':
      openAssignmentModal(orderToProcess);
      break;
    case 'edit':
      openServiceOrderModal(orderId, loadAndRenderOrders);
      break;
    case 'delete':
      handleDeleteOrder(orderId);
      break;
  }
}

async function handleAiGenerateClick(dateFilter, shiftFilter) {
  const dateString = dateFilter.value;
  const shiftType = shiftFilter.value;

  if (!dateString || shiftType === 'all' || shiftType === 'Especial') {
    displayMessage('Por favor, selecciona una fecha y un turno específicos (Mañana, Tarde o Noche) para usar la IA.', 'info');
    return;
  }
  showLoading('Generando orden con IA...');
  try {
    const result = await generateAiServiceOrder(dateString, shiftType);
    displayMessage(result.message, 'success');
    await renderPlanningView(); // Recarga la vista desde la página 1
  } catch (error) {
    displayMessage(`Error de la IA: ${error.message}`, 'error');
  } finally {
    hideLoading();
  }
}

async function handleDeleteOrder(orderId) {
  if (confirm(`¿Estás seguro de que quieres eliminar esta orden?`)) {
    showLoading('Eliminando orden...');
    try {
      await deleteServiceOrder(orderId);
      displayMessage('Orden eliminada con éxito.', 'success');
      await renderPlanningView(); // Recarga la vista desde la página 1
    } catch (error) {
      displayMessage(`Error al eliminar la orden: ${error.message}`, 'error');
    } finally {
      hideLoading();
    }
  }
}

function clearFilters(elements) {
  elements.dateFilter.value = '';
  elements.shiftFilter.value = 'all';
  elements.statusFilter.value = 'all';
  renderPlanningView(); // Recarga la vista desde la página 1
}
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
