// js/ui/reportsListView.js (VERSIÓN CON EXPORTACIÓN CORREGIDA)

import { getServiceReports } from '../dataController.js';
import { displayMessage, showLoading, hideLoading } from './viewManager.js';
import { formatDate } from '../utils.js';
import { getAgentName } from './scheduleRenderer.js';
import { availableAgents } from '../state.js';

let viewContainer, listContainer, calendarContainer, listContent, calendarContent;
let filterStatusSelect, filterYearSelect, filterMonthSelect, filterAgentSelect, applyFiltersBtn;
let showListBtn, showCalendarBtn;
let isInitialized = false;

// ✅ CORRECCIÓN: Añadimos la palabra 'export' para que main.js pueda importar esta función.
export function initializeReportsListView() {
    if (isInitialized) return true;

    viewContainer = document.getElementById('reports-list-view');
    listContainer = document.getElementById('reports-list-container');
    calendarContainer = document.getElementById('service-reports-calendar');
    listContent = document.getElementById('reports-list-content');
    calendarContent = document.getElementById('reports-calendar-content');
    
    filterStatusSelect = document.getElementById('report-filter-status');
    filterYearSelect = document.getElementById('report-filter-year');
    filterMonthSelect = document.getElementById('report-filter-month');
    filterAgentSelect = document.getElementById('report-filter-agent');
    applyFiltersBtn = document.getElementById('apply-report-filters-btn');
    
    showListBtn = document.getElementById('show-reports-list-btn');
    showCalendarBtn = document.getElementById('show-reports-calendar-btn');

    if (!listContainer || !calendarContainer || !applyFiltersBtn || !showListBtn || !viewContainer) {
        console.error("Faltan elementos de la interfaz en la vista de Partes de Servicio.");
        return false;
    }
    
    applyFiltersBtn.addEventListener('click', loadAndRenderReports);

    showListBtn.addEventListener('click', () => {
        listContent.classList.remove('hidden');
        calendarContent.classList.add('hidden');
        showListBtn.classList.add('active');
        showCalendarBtn.classList.remove('active');
    });

    showCalendarBtn.addEventListener('click', () => {
        calendarContent.classList.remove('hidden');
        listContent.classList.add('hidden');
        showCalendarBtn.classList.add('active');
        showListBtn.classList.remove('active');
    });

    viewContainer.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (button?.classList.contains('view-report-details-btn')) {
            const reportId = button.dataset.reportId;
            document.dispatchEvent(new CustomEvent('viewReport', { detail: { reportId } }));
        }
    });
    
    isInitialized = true;
    return true;
}

export async function renderReportsList() {
    if (!initializeReportsListView()) {
        return;
    }
    
    populateFilters();
    await loadAndRenderReports();
}

async function loadAndRenderReports() {
    if (!listContainer) {
        console.error("El contenedor de la lista de partes no está disponible. No se puede renderizar.");
        return;
    }
    showLoading();
    listContainer.innerHTML = `<p class="info-message">Cargando partes de servicio...</p>`;
    try {
        const filters = {
            status: filterStatusSelect.value !== 'all' ? filterStatusSelect.value : null,
            year: parseInt(filterYearSelect.value, 10),
            month: filterMonthSelect.value !== 'all' ? parseInt(filterMonthSelect.value, 10) : null,
            agentId: filterAgentSelect.value !== 'all' ? filterAgentSelect.value : null
        };
        const result = await getServiceReports(filters);
        if (result.success) {
            renderReportsTable(result.reports);
        } else {
            throw new Error(result.message || 'Error desconocido');
        }
    } catch (error) {
        displayMessage(`Error al cargar los partes: ${error.message}`, 'error');
        listContainer.innerHTML = `<p class="error-message">No se pudieron cargar los partes de servicio.</p>`;
    } finally {
        hideLoading();
    }
}

function renderReportsTable(reports) {
    if (!listContainer) return;
    if (reports.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <span class="material-icons empty-state-icon">receipt_long</span>
                <h4>No se encontraron partes de servicio</h4>
                <p>Prueba a cambiar los filtros para ver otros partes.</p>
            </div>
        `;
        return;
    }    
        const tableHtml = `
        <table class="data-table">
            <thead> <tr> <th>Nº Registro</th> <th>Fecha Creación</th> <th>Título Orden</th> <th>Turno</th> <th>Estado</th> <th>Agentes</th> <th>Acciones</th> </tr> </thead>
            <tbody>
                ${reports.map(report => `
                    <tr>
                        <td><strong>${report.order_reg_number || '---'}</strong></td>
                        <td>${formatDate(new Date(report.created_at), 'dd/MM/yyyy HH:mm')}</td>
                        <td>${report.order_title || 'N/A'}</td>
                        <td>${report.service_shift || 'N/A'}</td>
                        <td><span class="status-badge status-${report.status.toLowerCase()}">${report.status}</span></td>
                        <td>${(report.assigned_agents || []).map(id => getAgentName(id)).join(', ')}</td>
                        <td class="actions-cell">
                            <button class="button button-icon button-secondary view-report-details-btn" title="Ver Detalles del Parte" data-report-id="${report.id}">
                                <span class="material-icons">visibility</span>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>`;
    listContainer.innerHTML = tableHtml;
}

function populateFilters() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    if (filterYearSelect) {
        filterYearSelect.innerHTML = '';
        for (let y = currentYear - 2; y <= currentYear + 1; y++) {
            filterYearSelect.innerHTML += `<option value="${y}">${y}</option>`;
        }
        filterYearSelect.value = currentYear;
    }

    if (filterMonthSelect) {
        const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        filterMonthSelect.innerHTML = '<option value="all">Todos</option>';
        meses.forEach((mes, index) => {
            filterMonthSelect.innerHTML += `<option value="${index}">${mes}</option>`;
        });
        filterMonthSelect.value = currentMonth;
    }

    if (filterAgentSelect) {
        const agents = availableAgents.get();
        filterAgentSelect.innerHTML = '<option value="all">Todos los Agentes</option>';
        agents.forEach(agent => {
            filterAgentSelect.innerHTML += `<option value="${agent.id}">${agent.name}</option>`;
        });
    }
}

// ✅ NUEVA FUNCIÓN AÑADIDA PARA REINICIAR EL MÓDULO
export function resetReportsListView() {
    isInitialized = false;
}