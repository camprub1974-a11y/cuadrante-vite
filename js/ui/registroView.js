// js/ui/registroView.js (VERSIÓN CORREGIDA Y FINAL)

import { displayMessage, showLoading, hideLoading } from './viewManager.js';
import { getRegistros, createRegistro, updateRegistro, getRegistroById, markRegistroAsDeleted, generateRegistroPdf } from '../dataController.js';
import { openRegistroModal } from './registroModal.js';
import { openResolucionEntradaModal } from './resolucionEntradaModal.js';
import { format } from 'date-fns';
import { currentUser } from '../state.js';

// ✅ SOLUCIÓN: La variable 'isInitialized' se elimina. Ya no es necesaria.
let currentSubview = 'entrada';
let pendingTaskId = null; // ✅ 1. Variable para guardar el ID de la tarea

const paginationState = {
    entrada: { currentPage: 1, lastVisible: null, pageHistory: [null], hasNextPage: false },
    salida: { currentPage: 1, lastVisible: null, pageHistory: [null], hasNextPage: false }
};

// ✅ 2. La función de renderizado ahora acepta un ID de tarea opcional
export function renderRegistroView(subview = 'entrada', taskId = null) {
    currentSubview = subview;
    setupEventListeners();
    populateFilters();
    
    Object.keys(paginationState).forEach(key => {
        paginationState[key] = { currentPage: 1, lastVisible: null, pageHistory: [null], hasNextPage: false };
    });
    updateViewForSubview();
    loadAndRenderRegistros();

    // Si se pasó un ID de tarea, lo guardamos y abrimos el formulario
    if (taskId) {
        pendingTaskId = taskId;
        openEntradaForm();
    }
}

export function resetRegistroView() {
    console.warn('[Depuración] resetRegistroView ha sido llamado.');
    // Ya no necesitamos 'isInitialized', pero mantenemos la limpieza del DOM si se usa.
    const viewContent = document.getElementById('registro-view-content');
    if (viewContent) {
        // Eliminar el atributo 'data-listener-attached' fuerza a que se vuelva a adjuntar la próxima vez.
        delete viewContent.dataset.listenerAttached;
        const newViewContent = viewContent.cloneNode(true);
        viewContent.parentNode.replaceChild(newViewContent, viewContent);
    }
}

function updateViewForSubview() {
    console.log(`[Depuración] updateViewForSubview cambiando a: ${currentSubview}`);
    document.querySelectorAll('.sub-nav-tab').forEach(link => {
        link.classList.toggle('active', link.dataset.subview === currentSubview);
    });
    document.querySelectorAll('.sub-view').forEach(view => {
        view.classList.toggle('active', view.id === `${currentSubview}-subview`);
        view.classList.toggle('hidden', view.id !== `${currentSubview}-subview`);
    });
    const user = currentUser.get();
    const isMando = user.role === 'admin' || user.role === 'supervisor';
    const adminFilters = document.getElementById('admin-filters');
    if (adminFilters) {
        adminFilters.classList.toggle('hidden', !isMando);
    }
    const addEntradaBtn = document.getElementById('add-entrada-btn');
    const createSalidaBtn = document.getElementById('create-salida-btn');
    if (addEntradaBtn) addEntradaBtn.style.display = currentSubview === 'entrada' ? 'inline-flex' : 'none';
    if (createSalidaBtn) createSalidaBtn.style.display = currentSubview === 'salida' ? 'inline-flex' : 'none';
    const typeFilterGroup = document.getElementById('registro-type-filter-group');
    if (typeFilterGroup) {
        typeFilterGroup.style.display = currentSubview === 'entrada' ? 'block' : 'none';
    }
}

function collectFilters() {
    const filters = {};
    const user = currentUser.get();
    if (user.role === 'admin' || user.role === 'supervisor') {
        const agentFilter = document.getElementById('filter-agent-id')?.value;
        if (agentFilter && agentFilter !== 'all') filters.agentId = agentFilter;
    }
    const startDate = document.getElementById('filter-start-date')?.value;
    if (startDate) filters.startDate = startDate;
    const endDate = document.getElementById('filter-end-date')?.value;
    if (endDate) filters.endDate = endDate;
    const searchTerm = document.getElementById('filter-search-term')?.value;
    if (searchTerm) filters.searchTerm = searchTerm;

    if (currentSubview === 'entrada') {
        const typeFilter = document.getElementById('registro-filter-type')?.value;
        if (typeFilter) {
            filters.documentType = typeFilter;
        }
    }
    console.log('[Depuración] Filtros recolectados:', JSON.stringify(filters));
    return filters;
}

function generateTableHTML(registros, subview) {
    if (!registros || registros.length === 0) return '<p class="empty-state-text">No se encontraron registros.</p>';
    const isEntrada = subview === 'entrada';
    return `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Nº Reg.</th>
                    <th>Fecha</th>
                    <th>Asunto</th>
                    <th>Interesado</th>
                    ${isEntrada ? '<th>Estado</th>' : ''}
                    ${isEntrada ? '<th>Comentario / R. Salida</th>' : ''}
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${registros.map(reg => {
                    const createdAtDate = reg.createdAt?.seconds ? new Date(reg.createdAt.seconds * 1000) : (reg.createdAt ? new Date(reg.createdAt) : null);
                    const previewButton = reg.pdfUrl ? `<button class="icon-button button-preview" title="Previsualizar PDF"><i data-feather="eye"></i></button>` : '';
                    return `
                    <tr data-id="${reg.id}" class="status-${reg.estado || 'default'}">
                        <td>${reg.registrationNumber || ''}</td>
                        <td>${createdAtDate ? format(createdAtDate, 'dd/MM/yyyy HH:mm') : ''}</td>
                        <td>${reg.subject || reg.asunto || ''}</td>
                        <td>${reg.interesado || ''}</td>
                        ${isEntrada ? `<td><span class="status-badge status-${reg.estado || 'default'}">${(reg.estado || 'N/A').replace(/_/g, ' ')}</span></td>` : ''}
                        ${isEntrada ? `
                        <td>
                            ${reg.estado === 'finalizado_rs' && reg.linkedSalidaNumber
                                ? `<a href="#" class="linked-record" data-record-id="${reg.linkedSalidaId}">${reg.linkedSalidaNumber}</a>`
                                : (reg.comentario || '-')
                            }
                        </td>` : ''}
                        <td class="actions-cell">
                            ${previewButton}
                            <button class="icon-button button-pdf" title="Generar/Descargar PDF"><i data-feather="download"></i></button>
                            <button class="icon-button button-edit" title="Editar"><i data-feather="edit"></i></button>
                            ${isEntrada && reg.estado === 'pendiente' ? `
                                <button class="icon-button btn-finalizar-salida" title="Finalizar con Doc. Salida"><i data-feather="send"></i></button>
                                <button class="icon-button btn-finalizar-sin-salida" title="Finalizar sin Doc. Salida"><i data-feather="check-circle"></i></button>
                            ` : ''}
                            <button class="icon-button button-delete" title="Anular"><i data-feather="trash-2"></i></button>
                        </td>
                    </tr>
                `}).join('')}
            </tbody>
        </table>`;
}

function setupEventListeners() {
    const viewContent = document.getElementById('registro-view-content');
    if (!viewContent) {
        console.error('[Depuración] No se encontró el elemento #registro-view-content. No se pueden adjuntar listeners.');
        return;
    }
    if (viewContent.dataset.listenerAttached === 'true') {
        console.log('[Depuración] El listener ya estaba adjuntado. Omitiendo para evitar duplicados.');
        return;
    }

    viewContent.addEventListener('click', async (event) => {
        console.log('[Depuración] Clic detectado dentro de registro-view-content. Elemento clickeado:', event.target);

        const target = event.target;
        const button = target.closest('button');
        const tab = target.closest('.sub-nav-tab');
        const linkedRecordLink = target.closest('a.linked-record');

        if (linkedRecordLink) {
            event.preventDefault();
            const recordId = linkedRecordLink.dataset.recordId;
            console.log(`[Depuración] Clic en enlace de registro vinculado: ${recordId}`);
            handleRecordEdit(recordId);
            return;
        }

        if (tab) {
            console.log(`[Depuración] Clic en pestaña: ${tab.dataset.subview}`);
            currentSubview = tab.dataset.subview;
            updateViewForSubview();
            loadAndRenderRegistros();
            return;
        }
        
        if (!button) return;

        const recordId = target.closest('tr')?.dataset.id;
        if (recordId) {
            if (button.classList.contains('button-preview')) {
                const record = await getRegistroById(recordId);
                if (record && record.pdfUrl) window.open(record.pdfUrl, '_blank');
                else displayMessage('El PDF aún no ha sido generado.', 'info');
            } else if (button.classList.contains('button-pdf')) {
                handleGeneratePdf(recordId);
            } else if (button.classList.contains('button-edit')) {
                handleRecordEdit(recordId);
            } else if (button.classList.contains('button-delete')) {
                handleDeleteRecordClick(recordId);
            } else if (button.classList.contains('btn-finalizar-salida')) {
                finalizarConDocumento(recordId);
            } else if (button.classList.contains('btn-finalizar-sin-salida')) {
                finalizarSinDocumento(recordId);
            }
        } else if (button.closest('.pagination-controls')) {
            handlePaginationClick(currentSubview, button);
        } else {
            switch (button.id) {
                case 'add-entrada-btn': openEntradaForm(); break;
                case 'create-salida-btn': openRegistroModal({ direction: 'salida', callback: loadAndRenderRegistros }); break;
                case 'cancel-entrada-btn': closeEntradaForm(); break;
                case 'apply-registro-filters-btn':
                    paginationState[currentSubview] = { currentPage: 1, lastVisible: null, pageHistory: [null], hasNextPage: false };
                    loadAndRenderRegistros();
                    break;
                case 'clear-registro-filters-btn': clearFiltersAndRender(); break;
            }
        }
    });

    const entradaForm = document.getElementById('entrada-form');
    if (entradaForm) entradaForm.addEventListener('submit', handleSaveEntrada);
    
    viewContent.dataset.listenerAttached = 'true';
    console.log('[Depuración] Event listener adjuntado a registro-view-content.');
}

async function loadAndRenderRegistros() {
    console.log(`[Depuración] Iniciando loadAndRenderRegistros para la subvista: ${currentSubview}`);
    showLoading('Cargando registros...');
    try {
        const state = paginationState[currentSubview];
        const filters = collectFilters();
        filters.direction = currentSubview;
        filters.startAfterDoc = state.pageHistory[state.currentPage - 1];

        console.log('[Depuración] Llamando a getRegistros con los siguientes filtros:', JSON.stringify(filters));

        const { registros, lastVisible: newLastVisible, hasNextPage } = await getRegistros(filters);
        
        console.log(`[Depuración] Registros recibidos del backend: ${registros.length}`);

        state.lastVisible = newLastVisible;
        state.hasNextPage = hasNextPage;
        if (state.pageHistory.length === state.currentPage && hasNextPage) {
            state.pageHistory.push(newLastVisible);
        }
        
        const containerId = `${currentSubview}-list-container`;
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = generateTableHTML(registros, currentSubview);
            updatePaginationControls(currentSubview);
            if (window.feather) feather.replace();
        }
    } catch (error) {
        console.error(`ERROR en loadAndRenderRegistros:`, error);
        displayMessage('No se pudieron cargar los registros.', 'error');
    } finally {
        hideLoading();
    }
}

function handlePaginationClick(subview, button) {
    const state = paginationState[subview];
    if (button.id.includes('next-page') && state.hasNextPage) {
        state.currentPage++;
    } else if (button.id.includes('prev-page') && state.currentPage > 1) {
        state.currentPage--;
    }
    loadAndRenderRegistros();
}

function updatePaginationControls(subview) {
    const state = paginationState[subview];
    const pageInfo = document.getElementById(`${subview}-page-info`);
    const prevButton = document.getElementById(`${subview}-prev-page`);
    const nextButton = document.getElementById(`${subview}-next-page`);

    if (pageInfo) pageInfo.textContent = `Página ${state.currentPage}`;
    if (prevButton) prevButton.disabled = state.currentPage === 1;
    if (nextButton) nextButton.disabled = !state.hasNextPage;
}

function openEntradaForm() {
    document.getElementById('entrada-form-container').classList.remove('hidden');
    document.getElementById('entrada-list-container').classList.add('hidden');
}

function closeEntradaForm() {
    document.getElementById('entrada-form-container').classList.add('hidden');
    document.getElementById('entrada-list-container').classList.remove('hidden');
    document.getElementById('entrada-form').reset();
}

async function handleSaveEntrada(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    data.direction = 'entrada';
    data.estado = 'pendiente';

    // ✅ 3. Si hay un ID de tarea pendiente, lo añadimos a los datos a guardar
    if (pendingTaskId) {
        data.taskId = pendingTaskId;
    }

    showLoading('Guardando...');
    try {
        // El tipo de documento se obtiene del formulario
        const documentType = data.documentType || 'entrada_general';
        await createRegistro(documentType, data);
        
        displayMessage('Registro de entrada guardado.', 'success');
        closeEntradaForm();
        loadAndRenderRegistros();

        // Limpiamos el ID de la tarea pendiente después de usarlo
        pendingTaskId = null;
    } catch (error) {
        displayMessage(`Error: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

function handleRecordEdit(recordId) {
    if (currentSubview === 'entrada') {
        showLoading('Cargando registro...');
        getRegistroById(recordId)
            .then(registroData => openResolucionEntradaModal(registroData, loadAndRenderRegistros))
            .catch(error => displayMessage(`Error al cargar el registro: ${error.message}`, 'error'))
            .finally(hideLoading);
    } else {
        openRegistroModal({ recordId: recordId, callback: loadAndRenderRegistros });
    }
}

async function handleDeleteRecordClick(recordId) {
    const reason = prompt('Introduce el motivo de la anulación:');
    if (reason) {
        showLoading('Anulando...');
        try {
            await markRegistroAsDeleted(recordId, reason);
            displayMessage('Registro anulado.', 'success');
            loadAndRenderRegistros();
        } catch (error) {
            displayMessage(`Error: ${error.message}`, 'error');
        } finally {
            hideLoading();
        }
    }
}

async function handleGeneratePdf(recordId) {
    showLoading('Generando PDF...');
    try {
        const result = await generateRegistroPdf({ recordId });
        if (result.success && result.pdfUrl) {
            displayMessage('PDF generado con éxito. La descarga comenzará en breve.', 'success');
            window.open(result.pdfUrl, '_blank');
            loadAndRenderRegistros();
        } else {
            throw new Error(result.message || 'No se pudo generar el PDF.');
        }
    } catch (error) {
        displayMessage(`Error al generar el PDF: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

function finalizarConDocumento(recordId) {
    openRegistroModal({ parentId: recordId, direction: 'salida', callback: loadAndRenderRegistros });
}

async function finalizarSinDocumento(recordId) {
    if (!confirm('¿Finalizar este registro sin generar documento de salida?')) return;
    showLoading('Finalizando...');
    try {
        await updateRegistro(recordId, { estado: 'finalizado' });
        displayMessage('Registro finalizado.', 'success');
        loadAndRenderRegistros();
    } catch (err) {
        displayMessage('Error al finalizar.', 'error');
    } finally {
        hideLoading();
    }
}

function populateFilters() {
    const typeFilterSelect = document.getElementById('registro-filter-type');
    if (!typeFilterSelect) return;
    const tiposDeEntrada = [
        { value: 'oficio_judicial', text: 'Oficio Judicial' },
        { value: 'req_administracion', text: 'Requerimiento Administración' },
        { value: 'sol_aseguradora', text: 'Solicitud Aseguradora' },
        { value: 'instancia_general', text: 'Instancia General' },
        { value: 'comunicacion_interna', text: 'Comunicación Interna' }
    ];
    typeFilterSelect.innerHTML = '<option value="">Todos los tipos</option>';
    tiposDeEntrada.forEach(tipo => {
        const option = document.createElement('option');
        option.value = tipo.value;
        option.textContent = tipo.text;
        typeFilterSelect.appendChild(option);
    });
}

function clearFiltersAndRender() {
    const form = document.getElementById('registro-filters-form');
    if (form) form.reset();
    paginationState[currentSubview] = { currentPage: 1, lastVisible: null, pageHistory: [null], hasNextPage: false };
    loadAndRenderRegistros();
}