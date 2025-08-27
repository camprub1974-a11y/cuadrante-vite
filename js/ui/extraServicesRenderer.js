// js/ui/extraServicesRenderer.js

import { currentUser, availableAgents } from '../state.js';
import { getExtraServices, getAllExtraServices, updateExtraService } from '../dataController.js';
import { showLoading, hideLoading, displayMessage } from './viewManager.js';
import { EXTRA_SERVICE_TYPES } from '../constants.js';
import { formatDate } from '../utils.js';
import { showExtraServiceModal } from './extraServiceModal.js';
import { Chart } from 'chart.js/auto';

Chart.register();

// --- Variables de Módulo ---
let calendar = null;
let guardDataCache = [];
let statsChart = null;
let currentExtraServicesStatsRange = 'current_month';
const annualExtraServicesCache = {};

const EVENT_COLORS = {
    'diurno': '#3b82f6',
    'nocturno': '#1f2937',
    'festivo': '#f59e0b',
    'festivo_nocturno': '#ef4444',
};

let adminTableContainer;
let isInitialized = false;

export function initializeExtraServicesView() {
    if (isInitialized) return;

    const extraServicesStatsRangeSelector = document.getElementById('extra-services-stats-range-select');
    if (extraServicesStatsRangeSelector) {
        extraServicesStatsRangeSelector.addEventListener('change', (event) => {
            currentExtraServicesStatsRange = event.target.value;
            if (calendar) calendar.refetchEvents();
        });
    }

    const adminView = document.getElementById('extra-services-admin-view');
    if (adminView) {
        const applyBtn = document.getElementById('admin-service-apply-filters-btn');
        const clearBtn = document.getElementById('admin-service-clear-filters-btn');
        const tableContainer = document.getElementById('admin-services-table-container');

        if (applyBtn) {
            applyBtn.addEventListener('click', executeAdminSearch);
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                document.getElementById('admin-service-filter-agent').value = 'all';
                document.getElementById('admin-service-filter-type').value = 'all';
                document.getElementById('admin-service-filter-start-date').value = '';
                document.getElementById('admin-service-filter-end-date').value = '';
                executeAdminSearch();
            });
        }
        
        if (tableContainer) {
             tableContainer.addEventListener('click', (event) => {
                const editButton = event.target.closest('.edit-service-btn');
                if (editButton) {
                    const row = editButton.closest('tr');
                    const serviceId = row.dataset.serviceId;
                    showLoading();
                    getAllExtraServices({}).then(services => {
                        const serviceToEdit = services.find(s => s.id === serviceId);
                        if (serviceToEdit) {
                            showExtraServiceModal('edit', serviceToEdit.date, serviceToEdit);
                        } else {
                            displayMessage("No se encontró el servicio para editar.", "error");
                        }
                    }).catch(error => {
                        displayMessage("Error al cargar detalles del servicio para editar: " + error.message, "error");
                    }).finally(() => {
                        hideLoading();
                    });
                }
            });
        }
    }
    
    adminTableContainer = document.getElementById('admin-services-table-container');

    isInitialized = true;
    console.log("✅ Módulo de Vista de Servicios Extraordinarios inicializado.");
}

export function renderExtraServicesView() {
    // La inicialización ahora se llama aquí para asegurar que se ejecute en cada renderizado
    initializeExtraServicesView();

    const userProfile = currentUser.get();
    if (!userProfile) {
        displayMessage("No se pudo determinar el rol del usuario.", "error");
        return;
    }

    const guardView = document.getElementById('extra-services-guard-view');
    const adminView = document.getElementById('extra-services-admin-view');

    if (userProfile.role === 'admin' || userProfile.role === 'supervisor') {
        if(guardView) guardView.classList.add('hidden');
        if(adminView) adminView.classList.remove('hidden');
        renderAdminView();
    } else {
        if(adminView) adminView.classList.add('hidden');
        if(guardView) guardView.classList.remove('hidden');
        renderGuardView();
    }
}

function renderGuardView() {
    const calendarEl = document.getElementById('extra-services-calendar');
    if (!calendarEl) return;

    if (!calendar) {
        const isMobile = window.innerWidth <= 768;
        const desktopToolbar = { left: 'prev,next today addServiceButton', center: 'title', right: 'dayGridMonth,dayGridWeek' };
        const mobileToolbar = { left: 'prev,next', center: 'title', right: 'addServiceButton,listWeek' };

        calendar = new FullCalendar.Calendar(calendarEl, {
            headerToolbar: isMobile ? mobileToolbar : desktopToolbar,
            initialView: isMobile ? 'listWeek' : 'dayGridMonth',
            locale: 'es',
            buttonText: {
                prev: '< Mes',
                next: ' >',
                today: 'Hoy',
                month: 'Mes',
                week: 'Semana'
            },
            customButtons: {
                addServiceButton: {
                    text: 'Añadir',
                    click: () => showExtraServiceModal('add', new Date())
                }
            },
            editable: true,
            selectable: true,
            select: handleDateSelect,
            eventClick: handleEventClick,
            eventDrop: handleEventDrop,
            events: loadServicesForCalendar
        });
        
        calendar.render();
    } else {
        calendar.refetchEvents();
    }
}

async function loadServicesForCalendar(fetchInfo, successCallback, failureCallback) {
    showLoading();
    try {
        const agentId = currentUser.get().agentId;
        const viewYear = fetchInfo.start.getFullYear();
        let servicesToRender;

        if (currentExtraServicesStatsRange === 'current_month') {
            servicesToRender = await getExtraServices(agentId, fetchInfo.start, fetchInfo.end);
        } else {
            if (annualExtraServicesCache[viewYear]) {
                servicesToRender = annualExtraServicesCache[viewYear];
            } else {
                const yearStartDate = new Date(viewYear, 0, 1);
                const yearEndDate = new Date(viewYear, 11, 31);
                const allYearServices = await getExtraServices(agentId, yearStartDate, yearEndDate);
                annualExtraServicesCache[viewYear] = allYearServices;
                servicesToRender = allYearServices;
            }
        }
        
        guardDataCache = servicesToRender;

        const eventsForCalendar = servicesToRender.map(service => ({
            id: service.id,
            title: `${EXTRA_SERVICE_TYPES[service.type]?.name || 'Desconocido'} (${service.hours}h)`,
            start: formatDate(service.date, 'yyyy-MM-dd'),
            color: EVENT_COLORS[service.type],
            extendedProps: service
        }));
        
        successCallback(eventsForCalendar);
        renderGuardStats(servicesToRender);

    } catch (error) {
        console.error("Error en loadServicesForCalendar:", error);
        failureCallback(error);
        displayMessage("Error al cargar servicios.", "error");
    } finally {
        hideLoading();
    }
}

function handleDateSelect(info) {
    showExtraServiceModal('add', info.startStr);
    calendar.unselect();
}

function handleEventClick(info) {
    const service = info.event.extendedProps;
    showExtraServiceModal('edit', service.date, service);
}

async function handleEventDrop(info) {
    const serviceId = info.event.id;
    const newDate = info.event.startStr;
    const serviceToUpdate = guardDataCache.find(s => s.id === serviceId);

    if (serviceToUpdate) {
        showLoading();
        try {
            const { id, ...dataToUpdate } = serviceToUpdate;
            dataToUpdate.date = new Date(newDate);
            await updateExtraService(serviceId, dataToUpdate);
            displayMessage("Servicio actualizado.", "success");
        } catch (error) {
            info.revert();
            displayMessage("Error al actualizar servicio.", "error");
        } finally {
            calendar.refetchEvents();
            hideLoading();
        }
    }
}

function renderGuardStats(services) {
    const statsContainer = document.getElementById('extra-services-stats-container');
    if (!statsContainer) return;

    const stats = { totalServices: 0, totalHours: 0, totalIncome: 0, typeCounts: {}, hoursByType: {} };
    Object.keys(EXTRA_SERVICE_TYPES).forEach(type => {
        stats.typeCounts[type] = 0;
        stats.hoursByType[type] = 0;
    });

    if (services && services.length > 0) {
        stats.totalServices = services.length;
        services.forEach(service => {
            stats.totalHours += service.hours;
            stats.totalIncome += service.hours * (EXTRA_SERVICE_TYPES[service.type]?.price || 0);
            if (stats.typeCounts.hasOwnProperty(service.type)) {
                stats.typeCounts[service.type]++;
                stats.hoursByType[service.type] += service.hours;
            }
        });
    }
    
    statsContainer.innerHTML = `
        <div class="stats-info-grid">
            <div class="stat-item"><div class="value">${stats.totalServices}</div><div class="label">Servicios</div></div>
            <div class="stat-item"><div class="value">${stats.totalHours}h</div><div class="label">Horas</div></div>
            <div class="stat-item"><div class="value">${stats.totalIncome.toFixed(2)}€</div><div class="label">Ingresos</div></div>
        </div>
        <hr class="stats-divider">
        <div class="stats-chart-container" style="position: relative; height: 250px;"><canvas id="extra-services-chart"></canvas></div>`;
    renderGuardStatsChart(stats);
}

function renderGuardStatsChart(stats) {
    const ctx = document.getElementById('extra-services-chart');
    if (!ctx) return;
    if (statsChart) statsChart.destroy();

    statsChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.values(EXTRA_SERVICE_TYPES).map(t => t.name),
            datasets: [{
                data: Object.keys(EXTRA_SERVICE_TYPES).map(typeKey => stats.hoursByType[typeKey]),
                backgroundColor: Object.values(EVENT_COLORS),
                borderColor: '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { boxWidth: 12 } },
                title: { display: true, text: `Horas por Categoría`, font: { size: 14 } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((context.raw / total) * 100).toFixed(1) : 0;
                            return `${context.label}: ${context.raw}h (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function renderAdminView() {
    const adminFilterAgent = document.getElementById('admin-service-filter-agent');
    const adminFilterType = document.getElementById('admin-service-filter-type');
    if (!adminFilterAgent || !adminFilterType) return;
    populateAdminFilters(adminFilterAgent, adminFilterType);
    executeAdminSearch();
}

function populateAdminFilters(adminFilterAgent, adminFilterType) {
    const agents = availableAgents.get();
    let agentOptions = '<option value="all">Todos los Agentes</option>';
    agents.forEach(agent => {
        agentOptions += `<option value="${agent.id}">${agent.name}</option>`;
    });
    adminFilterAgent.innerHTML = agentOptions;
    
    let typeOptions = '<option value="all">Todos los Tipos</option>';
    for (const key in EXTRA_SERVICE_TYPES) {
        typeOptions += `<option value="${key}">${EXTRA_SERVICE_TYPES[key].name}</option>`;
    }
    adminFilterType.innerHTML = typeOptions;
}

async function executeAdminSearch() {
    const adminFilterAgent = document.getElementById('admin-service-filter-agent');
    const adminFilterType = document.getElementById('admin-service-filter-type');
    const adminFilterStartDate = document.getElementById('admin-service-filter-start-date');
    const adminFilterEndDate = document.getElementById('admin-service-filter-end-date');

    if (!adminFilterAgent || !adminFilterType || !adminFilterStartDate || !adminFilterEndDate) return;

    showLoading();
    try {
        const filters = {
            agentId: adminFilterAgent.value,
            type: adminFilterType.value,
            startDate: adminFilterStartDate.value,
            endDate: adminFilterEndDate.value
        };
        const services = await getAllExtraServices(filters);
        renderAdminTable(services);
    } catch (error) {
        displayMessage("Error al buscar servicios: " + error.message, "error");
        if(adminTableContainer) adminTableContainer.innerHTML = `<p class="error-message">Error al cargar los datos.</p>`;
    } finally {
        hideLoading();
    }
}

function renderAdminTable(services) {
    if (!adminTableContainer) return;
    if (!services || services.length === 0) {
        adminTableContainer.innerHTML = `<p class="info-message">No se encontraron servicios con los filtros aplicados.</p>`;
        return;
    }

    const agentsMap = new Map(availableAgents.get().map(agent => [String(agent.id), agent.name]));
    
    let tableHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Agente</th>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Horas</th>
                    <th>Observaciones</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;

    services.forEach(service => {
        tableHTML += `
            <tr data-service-id="${service.id}">
                <td>${agentsMap.get(String(service.agentId)) || 'Desconocido'}</td>
                <td>${formatDate(service.date, 'dd/MM/yyyy')}</td>
                <td>${EXTRA_SERVICE_TYPES[service.type]?.name || 'N/A'}</td>
                <td>${service.hours}</td>
                <td class="notes-cell">${service.notes || '-'}</td>
                <td class="actions-cell">
                    <button class="button button-icon button-secondary edit-service-btn" title="Editar Servicio">
                        <span class="material-icons">edit</span>
                    </button>
                </td>
            </tr>
        `;
    });

    tableHTML += `</tbody></table>`;
    adminTableContainer.innerHTML = tableHTML;
}

// ✅ FUNCIÓN DE REINICIO AÑADIDA
// Esta función será llamada desde main.js cuando se navegue fuera de esta vista.
export function resetExtraServicesView() {
    isInitialized = false;
    // También es buena idea reiniciar el calendario para que se reconstruya
    // si las dimensiones de la ventana han cambiado.
    calendar = null; 
}