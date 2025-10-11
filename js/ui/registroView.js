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
    }

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
}