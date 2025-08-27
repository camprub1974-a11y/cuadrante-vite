// js/ui/registroView.js (VERSIÓN FINAL Y ROBUSTA)

import { showLoading, hideLoading, displayMessage } from './viewManager.js';
import { openRegistroModal } from './registroModal.js';
import { getRegistros, getRegistroById } from '../dataController.js';
import { currentUser, availableAgents } from '../state.js';

let createRegistroBtn, registrosListContainer;
let yearFilter, monthFilter, typeFilter, destinatarioFilter, destinatarioSuggestions, applyFiltersBtn, clearFiltersBtn;
let isInitialized = false;

// ✅ CAMBIO CLAVE: Añadir 'export' a la función initialize
export function initializeRegistroView() {
    if (isInitialized) return true;

    createRegistroBtn = document.getElementById('create-registro-btn');
    registrosListContainer = document.getElementById('registros-list-container');
    
    yearFilter = document.getElementById('registro-filter-year');
    monthFilter = document.getElementById('registro-filter-month');
    typeFilter = document.getElementById('registro-filter-type');
    destinatarioFilter = document.getElementById('registro-filter-destinatario');
    destinatarioSuggestions = document.getElementById('destinatario-suggestions');
    applyFiltersBtn = document.getElementById('apply-registro-filters-btn');
    clearFiltersBtn = document.getElementById('clear-registro-filters-btn');

    if (!createRegistroBtn || !registrosListContainer || !applyFiltersBtn || !destinatarioFilter || !destinatarioSuggestions) {
        console.error("No se pudieron encontrar los elementos esenciales en la vista de Registro.");
        return false;
    }
    
    populateDateFilters();
    setDefaultFilters();

    // Asignar listeners solo una vez
    createRegistroBtn.addEventListener('click', () => openRegistroModal(refreshRegistroView));
    applyFiltersBtn.addEventListener('click', loadAndRenderRegistros);
    clearFiltersBtn.addEventListener('click', clearFiltersAndRender);
    registrosListContainer.addEventListener('click', handleTableClicks);

    destinatarioFilter.addEventListener('input', () => {
        const query = destinatarioFilter.value.toLowerCase();
        if (query.length < 2) {
            destinatarioSuggestions.classList.add('hidden');
            return;
        }
        const agents = availableAgents.get();
        const matches = agents.filter(agent => agent.name.toLowerCase().includes(query) || String(agent.id).includes(query));
        renderSuggestions(matches);
    });

    document.addEventListener('click', (e) => {
        if (!destinatarioFilter.contains(e.target) && !destinatarioSuggestions.contains(e.target)) {
            destinatarioSuggestions.classList.add('hidden');
        }
    });

    isInitialized = true;
    return true;
}

function renderSuggestions(matches) {
    destinatarioSuggestions.innerHTML = '';
    if (matches.length > 0) {
        matches.forEach(agent => {
            const div = document.createElement('div');
            div.textContent = `${agent.name} (${agent.id})`;
            div.addEventListener('click', () => {
                destinatarioFilter.value = agent.name;
                destinatarioSuggestions.classList.add('hidden');
            });
            destinatarioSuggestions.appendChild(div);
        });
        destinatarioSuggestions.classList.remove('hidden');
    } else {
        destinatarioSuggestions.classList.add('hidden');
    }
}

function populateDateFilters() {
    // Lógica para llenar los selectores de año y mes, ahora en una función separada.
    const currentYear = new Date().getFullYear();
    yearFilter.innerHTML = '';
    for (let i = currentYear; i >= 2023; i--) {
        yearFilter.add(new Option(i, i));
    }
    
    const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    monthFilter.innerHTML = '<option value="all">Todos</option>';
    months.forEach((month, index) => {
        monthFilter.add(new Option(month, index + 1));
    });
}

// Nueva función unificada de carga y renderizado
async function loadAndRenderRegistros() {
    showLoading("Cargando registros...");
    if (registrosListContainer) registrosListContainer.innerHTML = `<p class="info-message">Cargando registros...</p>`;
    
    const filters = {
        year: yearFilter.value !== 'all' ? parseInt(yearFilter.value) : null,
        month: monthFilter.value !== 'all' ? parseInt(monthFilter.value) : null,
        type: typeFilter.value !== 'all' ? typeFilter.value : null,
        destinatario: destinatarioFilter.value.trim() !== '' ? destinatarioFilter.value.trim() : null
    };

    try {
        const registros = await getRegistros(filters);
        renderTable(registros);
    } catch (error) {
        console.error("Error al cargar los registros:", error);
        if (registrosListContainer) registrosListContainer.innerHTML = `<p class="error-message">Hubo un error al cargar los datos: ${error.message}</p>`;
    } finally {
        hideLoading();
    }
}

export async function renderRegistroView(shouldSetDefaultFilters = false) {
    if (!initializeRegistroView()) { // ✅ Se llama a la función exportada
        return;
    }
    document.getElementById('registro-header-controls')?.classList.remove('hidden');
    document.getElementById('registro-filters-card')?.classList.remove('hidden');
    document.getElementById('registro-view')?.classList.remove('hidden');
    
    if (shouldSetDefaultFilters) {
        setDefaultFilters();
    }
    
    await loadAndRenderRegistros();
}

function clearFiltersAndRender() {
    yearFilter.value = new Date().getFullYear();
    monthFilter.value = "all";
    typeFilter.value = "all";
    destinatarioFilter.value = "";
    destinatarioSuggestions.classList.add('hidden');
    loadAndRenderRegistros();
}

function setDefaultFilters() {
    const now = new Date();
    yearFilter.value = now.getFullYear();
    monthFilter.value = "all"; // Se establece en "all" por defecto para no filtrar por mes.
    typeFilter.value = "all";
    destinatarioFilter.value = "";
}

async function handleTableClicks(event) {
    const target = event.target;
    
    const editButton = target.closest('.button-edit');
    if (editButton) {
        const row = editButton.closest('tr');
        const recordId = row.dataset.id;
        if (!recordId) return;

        showLoading();
        try {
            const recordData = await getRegistroById(recordId);
            openRegistroModal(refreshRegistroView, recordData);
        } catch (error) {
            displayMessage(`Error al cargar el registro: ${error.message}`, 'error');
        } finally {
            hideLoading();
        }
        return;
    }

    const detailsButton = target.closest('.toggle-details-btn');
    if (detailsButton) {
        const row = detailsButton.closest('tr');
        const recordId = row.dataset.id;
        if (!recordId) return;

        const detailsRow = document.querySelector(`.deletion-details-row[data-details-for="${recordId}"]`);
        if (detailsRow) {
            detailsRow.classList.toggle('visible');
        }
        return;
    }

    const pdfButton = target.closest('.generate-pdf-btn');
    if (pdfButton) {
        const pdfUrl = pdfButton.dataset.pdfUrl;
        if (pdfUrl) {
            window.open(pdfUrl, '_blank');
        } else {
            displayMessage("El PDF para este registro no está disponible o aún no ha sido generado.", "warning");
        }
    }
}

function formatFirestoreDate(timestamp) {
    if (!timestamp || typeof timestamp.seconds !== 'number') return 'Fecha inválida';
    return new Date(timestamp.seconds * 1000).toLocaleDateString('es-ES');
}

function getAgentNameById(agentId) {
    if (!agentId) return '---'; 
    const agents = availableAgents.get();
    const agent = agents.find(a => String(a.id) === String(agentId));
    return agent ? agent.name : `ID ${agentId}`;
}

function renderTable(registros) {
    if (!registrosListContainer) return;

    if (registros.length === 0) {
        registrosListContainer.innerHTML = `
            <div class="empty-state">
                <span class="material-icons empty-state-icon">find_in_page</span>
                <h4>No se encontraron registros</h4>
                <p>Prueba a cambiar los filtros o <br> crea un nuevo registro para empezar.</p>
                <button id="create-first-record-btn" class="button button-primary button-icon-only" title="Crear Nuevo Registro">
                    <span class="material-icons">add</span>
                </button>
            </div>
        `;
        document.getElementById('create-first-record-btn')?.addEventListener('click', () => openRegistroModal(refreshRegistroView));
        return;
    }

    const userProfile = currentUser.get();
    let tableHtml = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Nº Registro</th><th>Tipo</th><th>Asunto</th><th>Destinatario</th>
                    <th>Agente Grabador</th><th>Agentes Firmantes</th><th>Fecha Creación</th><th>Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;

    registros.forEach(reg => {
        const isDeleted = reg.status === 'eliminado';
        const canEdit = !isDeleted && (userProfile?.role === 'admin' || String(userProfile?.agentId) === String(reg.createdByAgentId));
        const tipoDocumento = reg.documentType.charAt(0).toUpperCase() + reg.documentType.slice(1);
        const grabadorName = getAgentNameById(reg.createdByAgentId);
        const firmantesNames = (reg.details?.signingAgents || []).map(getAgentNameById).join(', ');
        const asuntoDisplay = isDeleted 
            ? `<span class="deleted-text">${reg.subject || 'Sin asunto'}</span><small class="deletion-reason">Eliminado: ${reg.deletionReason || 'Sin motivo'}</small>`
            : (reg.subject || 'Sin asunto');
        
        let actionsHtml = '';
        if (isDeleted) {
            actionsHtml = `<button class="button button-icon button-secondary toggle-details-btn" title="Ver detalles de eliminación"><span class="material-icons">info</span></button>`;
        } else {
            actionsHtml = `
                <button class="button button-icon button-view" title="Ver Detalles"><span class="material-icons">visibility</span></button>
                ${canEdit ? `<button class="button button-icon button-edit" title="Editar"><span class="material-icons">edit</span></button>` : ''}
                <button class="button button-icon button-primary generate-pdf-btn" title="Generar Documento" data-pdf-url="${reg.pdfUrl || ''}">
                    <span class="material-icons">picture_as_pdf</span>
                </button>
            `;
        }

        const detailsRowHtml = isDeleted ? `
            <tr class="deletion-details-row" data-details-for="${reg.id}">
                <td colspan="8" class="deletion-details-cell">
                    <strong>Motivo de eliminación:</strong> ${reg.deletionReason || 'No especificado'}<br>
                    <strong>Eliminado por:</strong> ${getAgentNameById(reg.deletedByAgentId)} el ${reg.deletedAt ? formatFirestoreDate(reg.deletedAt) : 'N/A'}
                </td>
            </tr>
        ` : '';

        tableHtml += `
            <tr data-id="${reg.id}" class="${isDeleted ? 'deleted-row' : ''}">
                <td>${reg.registration_number || 'N/A'}</td><td>${tipoDocumento}</td>
                <td>${asuntoDisplay}</td><td>${reg.details?.destinatario || '---'}</td>
                <td>${grabadorName}</td><td class="firmantes-cell">${firmantesNames || '---'}</td>
                <td>${formatFirestoreDate(reg.createdAt)}</td><td class="actions-cell">${actionsHtml}</td>
            </tr>
            ${detailsRowHtml}
        `;
    });

    tableHtml += '</tbody></table>';
    registrosListContainer.innerHTML = tableHtml;
}

export function refreshRegistroView() {
    loadAndRenderRegistros();
}

// ✅ NUEVA FUNCIÓN AÑADIDA PARA REINICIAR EL MÓDULO
export function resetRegistroView() {
    isInitialized = false;
}