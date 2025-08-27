// js/ui/planningView.js

import { displayMessage, showLoading, hideLoading } from './viewManager.js';
import { getServiceOrders, deleteServiceOrder, getAutomationConfig, setAutomationConfig } from '../dataController.js';
import { formatDate } from '../utils.js';
import { initializeServiceOrderModal, openServiceOrderModal } from './serviceOrderModal.js';
import { openAssignmentModal } from './assignmentModal.js';
import { currentUser } from '../state.js';
import { openDefaultOrderTemplateModal } from './defaultOrderTemplateModal.js';

let listContainer, createOrderBtn, createDefaultOrdersBtn;
let filterYear, filterMonth, filterShift, filterStatus, applyFiltersBtn, clearFiltersBtn;
let isInitialized = false;
let currentOrders = [];

export function initializePlanningView() {
    if (isInitialized) return true;

    listContainer = document.getElementById('service-orders-list-container');
    createOrderBtn = document.getElementById('create-order-btn');
    createDefaultOrdersBtn = document.getElementById('create-default-orders-btn');

    filterYear = document.getElementById('order-filter-year');
    filterMonth = document.getElementById('order-filter-month');
    filterShift = document.getElementById('order-filter-shift');
    filterStatus = document.getElementById('order-filter-status');
    applyFiltersBtn = document.getElementById('apply-order-filters-btn');
    clearFiltersBtn = document.getElementById('clear-order-filters-btn');
    const autoGenerateToggle = document.getElementById('auto-generate-toggle');

    if (!listContainer || !createOrderBtn || !createDefaultOrdersBtn || !applyFiltersBtn || !clearFiltersBtn) {
        console.error("Faltan elementos de la interfaz en la vista de Planificación.");
        return false;
    }

    initializeServiceOrderModal(loadAndRenderOrders);

    createOrderBtn.addEventListener('click', () => openServiceOrderModal(null, loadAndRenderOrders));
    createDefaultOrdersBtn.addEventListener('click', openDefaultOrderTemplateModal);
    applyFiltersBtn.addEventListener('click', loadAndRenderOrders);

    clearFiltersBtn.addEventListener('click', () => {
        populateDateFilters();
        filterShift.value = 'all';
        filterStatus.value = 'all';
        loadAndRenderOrders();
    });

    listContainer.addEventListener('click', handleTableActions);

    // ✅ INICIO: LÓGICA DE REFRESCO AUTOMÁTICO
    // Escucha los eventos personalizados que dispara el modal al guardar.
    document.addEventListener('serviceOrderCreated', loadAndRenderOrders);
    document.addEventListener('serviceOrderUpdated', loadAndRenderOrders);
    // ✅ FIN: LÓGICA DE REFRESCO AUTOMÁTICO

    isInitialized = true;
    return true;
}

export function renderPlanningView() {
    const success = initializePlanningView();
    if (success) {
        populateDateFilters();
        loadAndRenderOrders();
    }
}

async function loadAndRenderOrders() {
    if (!listContainer) return;
    showLoading();
    listContainer.innerHTML = `<p class="info-message">Cargando órdenes...</p>`;

    const filters = {
        year: parseInt(filterYear.value, 10),
        month: parseInt(filterMonth.value, 10),
        service_shift: filterShift.value !== 'all' ? filterShift.value : null,
        status: filterStatus.value !== 'all' ? filterStatus.value : null,
    };

    try {
        const result = await getServiceOrders(filters);
        currentOrders = result.success ? result.orders : [];
        renderOrdersTable(currentOrders);
    } catch (error) {
        displayMessage(`Error al cargar las órdenes: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

function renderOrdersTable(orders) {
    if (!listContainer) return;
    if (orders.length === 0) {
        listContainer.innerHTML = `<div class="empty-state"><h4>No hay órdenes</h4><p>No se encontraron órdenes con los filtros actuales.</p></div>`;
        return;
    }

    const tableHtml = `
        <table class="data-table">
            <thead class="sticky-header">
                <tr>
                    <th>Nº Registro</th>
                    <th>Título</th>
                    <th>Fecha y Turno</th>
                    <th>Estado</th>
                    <th>Agentes</th>
                    <th style="text-align: right;">Acciones</th>
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
                                <button class="icon-button" data-action="assign" title="Asignar Agentes">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="20" height="20">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                                    </svg>
                                </button>
                                <button class="icon-button" data-action="edit" title="Editar Orden">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="20" height="20">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                    </svg>
                                </button>
                                <button class="icon-button" data-action="delete" title="Eliminar Orden">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="20" height="20">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.067-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                    </svg>
                                </button>
                                </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
    listContainer.innerHTML = tableHtml;
}

async function handleTableActions(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const orderId = button.closest('tr')?.dataset.id;
    if (!orderId) return;

    const action = button.dataset.action;

    if (action === 'assign') {
        const orderToProcess = currentOrders.find(o => o.id === orderId);
        if (orderToProcess) openAssignmentModal(orderToProcess);
    } else if (action === 'edit') {
        openServiceOrderModal(orderId, loadAndRenderOrders);
    } else if (action === 'delete') {
        handleDeleteOrder(orderId);
    }
}

async function handleDeleteOrder(orderId) {
    if (confirm(`¿Estás seguro? Esta acción no se puede deshacer.`)) {
        showLoading();
        try {
            await deleteServiceOrder(orderId);
            displayMessage('Orden eliminada.', 'success');
            loadAndRenderOrders();
        } catch (error) {
            displayMessage(`Error: ${error.message}`, 'error');
        } finally {
            hideLoading();
        }
    }
}

function populateDateFilters() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    if (!filterYear || !filterMonth) return;

    if (filterYear.options.length === 0) {
        for (let y = currentYear - 2; y <= currentYear + 1; y++) {
            filterYear.add(new Option(y, y));
        }
    }
    filterYear.value = currentYear;

    if (filterMonth.options.length === 0) {
        const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        meses.forEach((mes, index) => {
            filterMonth.add(new Option(mes, index));
        });
    }
    filterMonth.value = currentMonth;
}

export function resetPlanningView() {
    // ✅ ELIMINAMOS LOS LISTENERS AL SALIR DE LA VISTA PARA EVITAR DUPLICADOS
    document.removeEventListener('serviceOrderCreated', loadAndRenderOrders);
    document.removeEventListener('serviceOrderUpdated', loadAndRenderOrders);
    isInitialized = false;
}