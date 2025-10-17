<<<<<<< HEAD
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
=======
import { displayMessage, showLoading, hideLoading } from './viewManager.js';
import { getRegistros, createRegistro, updateRegistro, getRegistroById, markRegistroAsDeleted } from '../dataController.js';
import { openRegistroModal } from './registroModal.js';
import { format } from 'date-fns';
import { currentUser } from '../state.js';

let isInitialized = false;
let currentSubview = 'entrada';

// --- ESTADO DE PAGINACIÓN PARA CADA PESTAÑA ---
const paginationState = {
  entrada: { currentPage: 1, lastVisible: null, pageHistory: [null], hasNextPage: false },
  salida: { currentPage: 1, lastVisible: null, pageHistory: [null], hasNextPage: false }
};

// --- FUNCIÓN PRINCIPAL DE RENDERIZADO ---
export function renderRegistroView(subview = 'entrada') {
  currentSubview = subview;
  if (!isInitialized) {
    setupEventListeners();
    populateFilters();
    isInitialized = true;
  }
  // Resetea el estado de ambas paginaciones al entrar a la vista
  Object.keys(paginationState).forEach(key => {
      paginationState[key] = { currentPage: 1, lastVisible: null, pageHistory: [null], hasNextPage: false };
  });
  updateViewForSubview();
  loadAndRenderRegistros();
}

export function resetRegistroView() {
  isInitialized = false;
}

// --- LÓGICA DE LA INTERFAZ (PESTAÑAS Y FORMULARIO) ---
function updateViewForSubview() {
  document.querySelectorAll('.sub-nav-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.subview === currentSubview);
  });

  // Muestra/oculta los contenedores de las pestañas
  document.getElementById('entrada-subview').classList.toggle('active', currentSubview === 'entrada');
  document.getElementById('salida-subview').classList.toggle('hidden', currentSubview !== 'salida');
  document.getElementById('entrada-subview').classList.toggle('hidden', currentSubview !== 'entrada');


  const addEntradaBtn = document.getElementById('add-entrada-btn');
  const createSalidaBtn = document.getElementById('create-salida-btn');

  if (addEntradaBtn) addEntradaBtn.classList.toggle('hidden', currentSubview !== 'entrada');
  if (createSalidaBtn) createSalidaBtn.classList.toggle('hidden', currentSubview !== 'salida');
  
  closeEntradaForm();
}

function openEntradaForm(data = null) {
  const entradaFormContainer = document.getElementById('entrada-form-container');
  const entradaForm = document.getElementById('entrada-form');
  const entradaFormTitle = document.getElementById('entrada-form-title');
  const entradaIdInput = document.getElementById('entrada-id');
  
  if (!entradaFormContainer || !entradaForm) return;

  entradaForm.reset();
  if (data) {
    entradaFormTitle.textContent = 'Editar Registro de Entrada';
    entradaIdInput.value = data.id;
    document.getElementById('entrada-numero-registro').value = data.registrationNumber || '';
    document.getElementById('entrada-fecha').value = data.fechaPresentacion ? format(data.fechaPresentacion.toDate(), 'yyyy-MM-dd') : '';
    document.getElementById('entrada-interesado').value = data.interesado || '';
    document.getElementById('entrada-tipo-documento').value = data.documentType || '';
    document.getElementById('entrada-estado').value = data.estado || 'pendiente';
    document.getElementById('entrada-asunto').value = data.subject || '';
    document.getElementById('entrada-referencia').value = data.referencia || '';
    document.getElementById('entrada-observaciones').value = data.observaciones || '';
  } else {
    entradaFormTitle.textContent = 'Nuevo Registro de Entrada';
    entradaIdInput.value = '';
    document.getElementById('entrada-fecha').value = format(new Date(), 'yyyy-MM-dd');
  }
  entradaFormContainer.classList.remove('hidden');
}

function closeEntradaForm() {
  const entradaFormContainer = document.getElementById('entrada-form-container');
  if (entradaFormContainer) {
    entradaFormContainer.classList.add('hidden');
    const entradaForm = document.getElementById('entrada-form');
    if (entradaForm) entradaForm.reset();
  }
}

// --- GESTIÓN DE EVENTOS ---
function setupEventListeners() {
  const viewContent = document.getElementById('registro-view-content');
  if (!viewContent || viewContent.dataset.listenerAttached) return;

  viewContent.addEventListener('click', async (event) => {
    const button = event.target.closest('button');
    if (!button) return;

    if (button.matches('.sub-nav-tab')) {
      currentSubview = button.dataset.subview;
      updateViewForSubview();
      loadAndRenderRegistros();
      return;
    }
    
    // Controles de paginación
    const paginationControls = event.target.closest('.pagination-controls');
    if (paginationControls) {
      handlePaginationClick(paginationControls.id.startsWith('entrada') ? 'entrada' : 'salida', button);
      return;
    }

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
    
    const recordId = event.target.closest('tr')?.dataset.id;
    if (recordId) {
      if (button.classList.contains('button-edit')) handleRecordEdit(recordId);
      if (button.classList.contains('button-delete')) handleDeleteRecordClick(recordId);
      if (button.classList.contains('btn-finalizar-salida')) finalizarConDocumento(recordId);
      if (button.classList.contains('btn-finalizar-sin-salida')) finalizarSinDocumento(recordId);
      if (button.classList.contains('btn-adjuntar')) adjuntarArchivo(recordId);
    }
  });

  const entradaForm = document.getElementById('entrada-form');
  if (entradaForm) entradaForm.addEventListener('submit', handleSaveEntrada);
  
  viewContent.dataset.listenerAttached = 'true';
}


// --- LÓGICA DE DATOS (FILTROS, GUARDADO, CARGA CON PAGINACIÓN) ---

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

function getCurrentFilters() {
  const filters = {};
  const interesado = document.getElementById('registro-filter-interesado')?.value?.trim();
  const fecha = document.getElementById('registro-filter-date')?.value;
  const tipo = document.getElementById('registro-filter-type')?.value;

  if (interesado) filters.interesado = interesado;
  if (fecha) filters.fecha = fecha;
  if (tipo) filters.tipo = tipo;

  return filters;
}

function clearFiltersAndRender() {
  document.getElementById('registro-filter-interesado').value = '';
  document.getElementById('registro-filter-date').value = '';
  document.getElementById('registro-filter-type').value = '';
  // Al limpiar, reseteamos la paginación de la pestaña activa
  paginationState[currentSubview] = { currentPage: 1, lastVisible: null, pageHistory: [null], hasNextPage: false };
  loadAndRenderRegistros();
}

async function handleSaveEntrada(event) {
  event.preventDefault();
  const tipo = document.getElementById('entrada-tipo-documento').value;
  if (!tipo) {
    displayMessage('Debes seleccionar un tipo de documento válido.', 'error');
    return;
  }
  
  showLoading('Guardando registro...');
  try {
    const agent = currentUser.get();
    const editingId = document.getElementById('entrada-id').value;
    
    const registroData = {
      fechaPresentacion: new Date(document.getElementById('entrada-fecha').value),
      interesado: document.getElementById('entrada-interesado').value.trim(),
      referencia: document.getElementById('entrada-referencia').value.trim(),
      estado: document.getElementById('entrada-estado').value,
      subject: document.getElementById('entrada-asunto').value.trim(),
      observaciones: document.getElementById('entrada-observaciones').value.trim(),
      direction: 'entrada',
      createdByAgentId: agent?.agentId || null,
      createdByAgentName: agent?.displayName || 'Sistema'
    };

    if (editingId) {
        await updateRegistro(editingId, registroData);
        displayMessage('Registro actualizado con éxito.', 'success');
    } else {
        await createRegistro(tipo, registroData);
        displayMessage('Registro de entrada creado con éxito.', 'success');
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
    }
}

<<<<<<< HEAD
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
=======
    closeEntradaForm();
    renderRegistroView(currentSubview); // Recarga la vista desde la página 1
  } catch (error) {
    displayMessage(`Error al guardar: ${error.message}`, 'error');
  } finally {
    hideLoading();
  }
}

async function loadAndRenderRegistros() {
  showLoading('Cargando registros...');
  const state = paginationState[currentSubview];

  try {
    const filters = {
      ...getCurrentFilters(),
      direction: currentSubview,
      limit: 15,
      startAfter: state.pageHistory[state.currentPage - 1]
    };

    const result = await getRegistros(filters);
    if(!result || !result.success) throw new Error(result.message || 'Error del servidor.');

    const registros = result.registros || [];
    state.lastVisible = result.lastVisible || null;
    state.hasNextPage = !!state.lastVisible;

    if (state.hasNextPage && state.pageHistory.length === state.currentPage) {
      state.pageHistory.push(state.lastVisible);
    }

    renderRegistrosTable(registros);
    updatePaginationControls(currentSubview, registros.length);

  } catch(error) {
      console.error("ERROR en loadAndRenderRegistros:", error);
      displayMessage(`Error al cargar registros: ${error.message}`, 'error');
      renderRegistrosTable([]); // Muestra tabla vacía en caso de error
  } finally {
      hideLoading();
  }
}

function renderRegistrosTable(registros) {
  const container = document.getElementById(`${currentSubview}-list-container`);
  if (!container) return;
  if (!Array.isArray(registros) || registros.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No se encontraron registros.</p></div>`;
    return;
  }
  
  container.innerHTML = `<table class="data-table"><thead>
    <tr>
      <th>Nº Registro</th><th>S. Referencia</th><th>Asunto</th>
      <th>Interesado/Dest.</th><th>Agente</th><th>Fecha</th>
      <th>Estado</th><th>Acciones</th>
    </tr>
  </thead><tbody>${registros.map(reg => {
    const fecha = reg.fechaPresentacion?.toDate ? format(reg.fechaPresentacion.toDate(), 'dd/MM/yyyy') : (reg.createdAt ? format(new Date(reg.createdAt), 'dd/MM/yyyy') : 'N/A');
    const estadoClass = (reg.estado || 'default').toLowerCase().replace(/ /g, '_');
    const estadoText = reg.estado ? reg.estado.replace(/_/g, ' ') : 'N/A';
    const interesado = reg.interesado || reg.destinatario || '';

    return `<tr data-id="${reg.id}">
      <td>${reg.registrationNumber || 'N/A'}</td>
      <td>${reg.referencia || ''}</td>
      <td>${reg.subject || ''}</td>
      <td>${interesado}</td>
      <td>${reg.createdByAgentName || 'Sistema'}</td>
      <td>${fecha}</td>
      <td><span class="status-badge status-${estadoClass}">${estadoText}</span></td>
      <td class="actions-cell">
        <button class="icon-button button-edit" title="Editar"><i data-feather="edit-2"></i></button>
        <button class="icon-button btn-finalizar-salida" title="Finalizar con documento de salida"><i data-feather="file-plus"></i></button>
        <button class="icon-button btn-finalizar-sin-salida" title="Finalizar"><i data-feather="check"></i></button>
        <button class="icon-button btn-adjuntar" title="Adjuntar archivo"><i data-feather="paperclip"></i></button>
        <button class="icon-button button-delete" title="Eliminar"><i data-feather="trash-2"></i></button>
      </td>
    </tr>`;
  }).join('')}</tbody></table>`;
  
  if (window.feather) feather.replace();
}


// --- ACCIONES DE LA TABLA Y PAGINACIÓN ---
function handlePaginationClick(tipo, button) {
    if (!button) return;
    const state = paginationState[tipo];

    if (button.id.includes('-next-page') && state.hasNextPage) {
        state.currentPage++;
        loadAndRenderRegistros();
    } else if (button.id.includes('-prev-page') && state.currentPage > 1) {
        state.currentPage--;
        state.pageHistory.pop();
        loadAndRenderRegistros();
    }
}

function updatePaginationControls(tipo, recordCount) {
    const state = paginationState[tipo];
    const pageInfo = document.getElementById(`${tipo}-page-info`);
    const prevButton = document.getElementById(`${tipo}-prev-page`);
    const nextButton = document.getElementById(`${tipo}-next-page`);

    if (pageInfo) pageInfo.textContent = `Página ${state.currentPage}`;
    if (prevButton) prevButton.disabled = state.currentPage === 1;
    if (nextButton) nextButton.disabled = !state.hasNextPage || recordCount < 15;
}

async function handleRecordEdit(recordId) {
  showLoading('Cargando datos...');
  try {
    const recordData = await getRegistroById(recordId);
    if (currentSubview === 'entrada') {
      openEntradaForm(recordData);
    } else {
      openRegistroModal({ dataForEdit: recordData, direction: 'salida', callback: loadAndRenderRegistros });
    }
  } catch(error) {
    displayMessage(error.message, 'error');
  } finally {
    hideLoading();
  }
}

async function handleDeleteRecordClick(recordId) {
  const reason = prompt('Introduce el motivo de la eliminación (obligatorio):');
  if (reason === null || reason.trim() === '') {
    displayMessage('Eliminación cancelada.', 'info');
    return;
  }
  if (confirm('¿Seguro que quieres eliminar este registro?')) {
    showLoading('Eliminando...');
    try {
      await markRegistroAsDeleted(recordId, reason);
      displayMessage('Registro eliminado con éxito.', 'success');
      renderRegistroView(currentSubview);
    } catch (error) {
      displayMessage(`Error al eliminar: ${error.message}`, 'error');
    } finally {
      hideLoading();
    }
  }
}

function finalizarConDocumento(recordId) {
  openRegistroModal({ parentId: recordId, direction: 'salida', callback: () => renderRegistroView(currentSubview) });
}

async function finalizarSinDocumento(recordId) {
  if (!confirm('¿Finalizar este registro de entrada sin generar documento de salida?')) return;
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

async function adjuntarArchivo(recordId) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = "*/*";
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    showLoading('Subiendo archivo...');
    try {
      await uploadRegistroFile(recordId, file); // Asegúrate que esta función exista en dataController
      displayMessage('Archivo adjuntado.', 'success');
    } catch (err) {
      displayMessage('Error al subir archivo.', 'error');
    } finally {
      hideLoading();
    }
  };
  input.click();
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
}