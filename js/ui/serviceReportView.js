// js/ui/serviceReportView.js (VERSIÓN COMPLETA Y CORREGIDA)

import { displayMessage, showLoading, hideLoading } from './viewManager.js';
import { showReportsListView } from '../main.js';
import { db } from '../firebase-config.js';
import { doc, onSnapshot, getDocs, collection, getDoc } from 'firebase/firestore';
import {
  updateRequerimientoStatus,
  updateChecklistItemStatus,
  submitServiceReport,
  validateServiceReport,
  addRequerimiento,
  deleteRequerimiento,
  updateRequerimiento,
  getTasksByOrderId, // <-- Importa la función para obtener tareas
} from '../dataController.js';
import { openReportSummaryModal } from './reportSummaryModal.js';
import { formatDate } from '../utils.js';
import { getAgentName } from '../dataController.js'
import { currentUser } from '../state.js';

let currentReport = null;
let eventListenersInitialized = false;
let unsubscribe = null;

// Constantes para el resumen de actuaciones (se mantienen tus constantes)
const SUMMARY_FIELD_LABELS = {
  estacionamiento_indebido: 'Estacionamiento Indebido', denuncias_trafico: 'Denuncias Tráfico', informes_trafico: 'Informes Tráfico', delitos_trafico: 'Delitos Seg. Vial', controles_trafico: 'Controles Tráfico', regulacion_trafico: 'Regulación Tráfico', deposito_vehiculos: 'Depósito Vehículos', diligencias_prevencion: 'Diligencias Prevención', otros_trafico: 'Otros (Tráfico)', contrap_patrimonio: 'Contra el Patrimonio', salud_publica: 'Contra la Salud Pública', denuncias_seguridad: 'Denuncias Seg. Ciudadana', identificaciones: 'Identificaciones', reyertas: 'Reyertas', violencia_genero: 'Violencia de Género', minutas: 'Minutas/Diligencias', detenidos_ciudadana: 'Detenidos', solicitud_datos_gc: 'Solicitud Datos GC', anomalias_via: 'Anomalías Vía Pública', vehiculos_abandonados: 'Vehículos Abandonados', denuncias_oomm: 'Denuncias O.O.M.M.', inspecciones_locales: 'Inspecciones Locales', inspecciones_obras: 'Inspecciones Obras', notificaciones: 'Notificaciones', informes_admin: 'Informes Administrativos', certificados_convivencia: 'Cert. Convivencia', auxilio_personas: 'Auxilio a Personas', fallecimientos: 'Fallecimientos', colab_bomberos: 'Colaboración Bomberos', colaboracion_gc: 'Colaboración GC', colab_sanitarios: 'Colaboración Sanitarios', intervencion_menores: 'Intervención Menores', req_ciudadanos: 'Requerimientos Ciudadanos', recepcion_llamadas: 'Recepción Llamadas', recepcion_denuncias: 'Recepción Denuncias', citaciones: 'Citaciones', diligencias_exposicion: 'Diligencias Exposición'
};
const SUMMARY_FIELD_ICONS = {
  estacionamiento_indebido: 'minus-circle', denuncias_trafico: 'shield', informes_trafico: 'file-text', delitos_trafico: 'alert-octagon', controles_trafico: 'bar-chart-2', regulacion_trafico: 'move', deposito_vehiculos: 'truck', diligencias_prevencion: 'folder', otros_trafico: 'more-horizontal', contrap_patrimonio: 'home', salud_publica: 'activity', denuncias_seguridad: 'alert-circle', identificaciones: 'users', reyertas: 'user-x', violencia_genero: 'alert-triangle', minutas: 'edit', detenidos_ciudadana: 'user-check', solicitud_datos_gc: 'share-2', anomalias_via: 'tool', vehiculos_abandonados: 'truck', denuncias_oomm: 'slash', inspecciones_locales: 'coffee', inspecciones_obras: 'hard-hat', notificaciones: 'mail', informes_admin: 'file', certificados_convivencia: 'award', auxilio_personas: 'heart', fallecimientos: 'user-minus', colab_bomberos: 'wind', colaboracion_gc: 'user-plus', colab_sanitarios: 'plus-circle', intervencion_menores: 'user', req_ciudadanos: 'phone-call', recepcion_llamadas: 'phone', recepcion_denuncias: 'edit-3', citaciones: 'send', diligencias_exposicion: 'book-open'
};


// FUNCIÓN DE ESCUCHA EN TIEMPO REAL (CORREGIDA Y COMPLETA)
function listenToServiceReportDetails(reportId, callback) {
  const reportRef = doc(db, 'serviceReports', reportId);

  unsubscribe = onSnapshot(reportRef, async (docSnap) => {
    if (docSnap.exists()) {
      const reportData = { id: docSnap.id, ...docSnap.data() };

      // Cargamos todos los datos relacionados en paralelo para mayor eficiencia
      const [requerimientosSnap, orderSnap, specificTasks] = await Promise.all([
        getDocs(collection(db, 'serviceReports', reportId, 'requerimientos')),
        getDoc(doc(db, 'serviceOrders', reportData.order_id)),
        getTasksByOrderId(reportData.order_id),
      ]);

      // Procesamos los datos obtenidos
      reportData.requerimientos = requerimientosSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      reportData.specificTasks = specificTasks;

      if (orderSnap.exists()) {
        const orderData = orderSnap.data();
        // Corrección del error de fecha: Aseguramos que sea un objeto Date de JS
        if (orderData.service_date && typeof orderData.service_date.toDate === 'function') {
          orderData.service_date = orderData.service_date.toDate();
        }
        reportData.order = { id: orderSnap.id, ...orderData };
      }

      // Llamamos a la función que renderiza con los datos ya completos y corregidos
      callback(reportData);
    } else {
      console.error('El parte de servicio ya no existe.');
      displayMessage('El parte de servicio fue eliminado o no se encuentra.', 'error');
      if (unsubscribe) unsubscribe();
    }
  }, (error) => {
    console.error('Error escuchando cambios en el parte:', error);
    displayMessage('Se perdió la conexión con el parte de servicio.', 'error');
  });
}

// FUNCIÓN PRINCIPAL DE RENDERIZADO
export async function renderServiceReport(reportId) {
    showLoading('Cargando datos del parte...');
    if (unsubscribe) {
        unsubscribe();
    }
    try {
        await new Promise(resolve => requestAnimationFrame(resolve));
        listenToServiceReportDetails(reportId, (reportData) => {
            currentReport = reportData;
            renderHeader(currentReport);
            renderDescription(currentReport.order.description);
            const canAgentEditReport = currentReport.status === 'open' || currentReport.status === 'returned';
            renderRequerimientos(currentReport.requerimientos || [], canAgentEditReport);
            renderChecklist(currentReport.order.checklist || [], canAgentEditReport);
            renderSpecificTasks(currentReport.specificTasks || [], canAgentEditReport);
            renderSummary(currentReport.summary);
            setupActionFooter(currentReport);
            initializeServiceReportEventListeners();
            if (window.feather) {
              feather.replace();
            }
            hideLoading();
        });
    } catch (error) {
        console.error('Error al renderizar el parte de servicio:', error);
        displayMessage(`No se pudieron cargar los datos del parte: ${error.message}`, 'error');
        hideLoading();
    }
}


// --- RESTO DE FUNCIONES (SE MANTIENEN IGUAL QUE TU VERSIÓN) ---

function renderHeader(report) {
  const order = report.order || {};
  const titleEl = document.getElementById('report-title');
  const regNumberEl = document.getElementById('report-reg-number');
  const dateEl = document.getElementById('report-date');
  const shiftEl = document.getElementById('report-shift');
  const statusPill = document.getElementById('report-header-status');

  if (titleEl) titleEl.textContent = order.title || 'Parte de Servicio';
  if (regNumberEl) regNumberEl.textContent = `Nº Registro: ${order.order_reg_number || '---'}`;
  if (dateEl) dateEl.textContent = order.service_date ? formatDate(order.service_date, 'dd/MM/yyyy') : '';
  if (shiftEl) shiftEl.textContent = order.service_shift || '';
  if (statusPill) {
    statusPill.textContent = (report.status || 'open').replace(/_/g, ' ');
    statusPill.className = `status-pill status-${report.status || 'open'}`;
  }
}

function renderDescription(description) {
  const container = document.getElementById('report-description-content');
  if (!container) return;

  if (description && description.trim() !== '') {
    const timelineItems = description.split('\n').filter(line => line.trim() !== '');
    container.innerHTML = `
      <div class="timeline">
        ${timelineItems.map(item => {
          const timeMatch = item.match(/^(\d{2}:\d{2} a \d{2}:\d{2} h(oras)?\.?)\s*-\s*(.*)/);
          if (timeMatch) {
            const time = timeMatch[1];
            const text = timeMatch[3];
            return `
              <div class="timeline-item">
                <div class="timeline-icon"><i data-feather="clock"></i></div>
                <div class="timeline-content">
                  <p class="timeline-time">${time}</p>
                  <p class="timeline-text">${text}</p>
                </div>
              </div>`;
          } else {
            return `
              <div class="timeline-item">
                <div class="timeline-icon"><i data-feather="info"></i></div>
                <div class="timeline-content"><p class="timeline-text">${item}</p></div>
              </div>`;
          }
        }).join('')}
      </div>`;
  } else {
    container.innerHTML = '<p class="empty-state-text">No hay descripción o instrucciones para esta orden.</p>';
  }
}

function renderRequerimientos(requerimientos, isEditable) {
  const container = document.querySelector('#requerimientos-list-container');
  if (!container) return;
  if (!requerimientos || requerimientos.length === 0) {
    container.innerHTML = `<div class="empty-state compact"><p>No hay requerimientos registrados.</p></div>`;
    return;
  }
  container.innerHTML = requerimientos.map(req => {
    const isRealizado = req.status === 'realizado';
    const hora = req.hora || '--:--';
    const requirente = req.requirente || 'No especificado';
    const motivo = req.motivo || req.description || 'Sin descripción';
    const comentario = req.comment || '';
    return `
      <div class="requerimiento-item-row" data-id="${req.id}">
        <div class="req-main-content">
          <div class="view-mode-content">
            <div class="req-info-header">
              <span class="req-time">${hora}</span>
              <span class="req-requerente">Requirente: <strong>${requirente}</strong></span>
            </div>
            <p class="req-motivo">${motivo}</p>
            ${comentario ? `<p class="req-comentario"><strong>Resolución:</strong> ${comentario}</p>` : `<p class="req-comentario-empty"><em>(No hay comentarios de resolución)</em></p>`}
          </div>
          <div class="edit-mode-content" style="display: none;">
            <div class="form-grid-2-col" style="margin-bottom: 0.75rem;">
              <div class="form-group"><label class="form-label">Hora</label><input type="time" class="form-control" name="hora" value="${hora}" /></div>
              <div class="form-group"><label class="form-label">Requirente</label><input type="text" class="form-control" name="requirente" value="${requirente}" /></div>
            </div>
            <div class="form-group"><label class="form-label">Motivo</label><textarea class="form-control" name="motivo" rows="3">${motivo}</textarea></div>
            <div class="form-group"><label class="form-label">Comentario</label><textarea class="form-control" name="comentario" rows="3">${comentario}</textarea></div>
            <div class="inline-edit-actions">
              <button class="button button-secondary" data-action="cancel-edit-req">Cancelar</button>
              <button class="button button-primary" data-action="save-edit-req">Guardar</button>
            </div>
          </div>
        </div>
        <div class="req-actions-group">
          <div class="requerimiento-status-toggle">
            <input type="radio" id="req-pen-${req.id}" name="req-status-${req.id}" value="pendiente" data-id="${req.id}" ${!isRealizado ? 'checked' : ''} ${!isEditable ? 'disabled' : ''}>
            <label for="req-pen-${req.id}" class="status-label status-pendiente"><i data-feather="clock"></i><span>Pendiente</span></label>
            <input type="radio" id="req-rea-${req.id}" name="req-status-${req.id}" value="realizado" data-id="${req.id}" ${isRealizado ? 'checked' : ''} ${!isEditable ? 'disabled' : ''}>
            <label for="req-rea-${req.id}" class="status-label status-realizado"><i data-feather="check-circle"></i><span>Realizado</span></label>
          </div>
          ${isEditable ? `
          <div class="requerimiento-actions">
            <button class="icon-button" data-action="edit-req" title="Editar"><i data-feather="edit-2"></i></button>
            <button class="icon-button req-delete-btn" data-id="${req.id}" title="Borrar"><i data-feather="trash-2"></i></button>
          </div>` : ''}
        </div>
      </div>`;
  }).join('');
}

function renderChecklist(checklist, isEditable) {
  const container = document.getElementById('checklist-items-container');
  if (!container) return;
  if (!checklist || checklist.length === 0) {
    container.innerHTML = `<div class="empty-state-card"><i data-feather="list"></i><p>Esta orden no tiene un checklist asociado.</p></div>`;
    if (window.feather) feather.replace();
    return;
  }
  container.innerHTML = checklist.map((item, index) => {
    const isRealizado = item.status === 'realizado';
    return `
      <div class="requerimiento-item-row" data-index="${index}">
        <div class="req-main-content"><p class="req-motivo">${item.item || '(Tarea sin descripción)'}</p></div>
        <div class="req-actions-group">
          <div class="requerimiento-status-toggle">
            <input type="radio" id="chk-pen-${index}" name="chk-status-${index}" value="pendiente" data-index="${index}" ${!isRealizado ? 'checked' : ''} ${!isEditable ? 'disabled' : ''}>
            <label for="chk-pen-${index}" class="status-label status-pendiente"><i data-feather="clock"></i><span>Pendiente</span></label>
            <input type="radio" id="chk-rea-${index}" name="chk-status-${index}" value="realizado" data-index="${index}" ${isRealizado ? 'checked' : ''} ${!isEditable ? 'disabled' : ''}>
            <label for="chk-rea-${index}" class="status-label status-realizado"><i data-feather="check-circle"></i><span>Realizado</span></label>
          </div>
        </div>
      </div>`;
  }).join('');
}

function renderSpecificTasks(tasks, isEditable) {
  const container = document.getElementById('specific-tasks-container');
  if (!container) return;

  if (!tasks || tasks.length === 0) {
    container.innerHTML = `<div class="empty-state-card"><i data-feather="target"></i><p>No hay tareas específicas asignadas.</p></div>`;
    if (window.feather) feather.replace();
    return;
  }

  container.innerHTML = tasks.map(task => {
    // ✅ 1. Usamos 'finalizada' para la comprobación
    const isFinalizada = task.status === 'finalizada';
    // ✅ 2. Añadimos una clase CSS dinámica basada en el estado
    const statusClass = `status-${task.status}`; // Ej: status-pendiente o status-finalizada

    return `
      <div class="requerimiento-item-row ${statusClass}" data-id="${task.id}">
        <div class="req-main-content">
          <p class="req-motivo">${task.description}</p>
          <p class="req-comentario">Asignado a: <strong>${task.assignedAgentName || task.assignedAgentId}</strong></p>
        </div>
        <div class="req-actions-group">
          <div class="requerimiento-status-toggle">
            <input type="radio" id="task-pen-${task.id}" name="task-status-${task.id}" value="pendiente" ${!isFinalizada ? 'checked' : ''} disabled>
            <label for="task-pen-${task.id}" class="status-label status-pendiente">
              <i data-feather="clock"></i> <span>Pendiente</span>
            </label>
            <input type="radio" id="task-fin-${task.id}" name="task-status-${task.id}" value="finalizada" ${isFinalizada ? 'checked' : ''} disabled>
            <label for="task-fin-${task.id}" class="status-label status-realizado">
              <i data-feather="check-circle"></i> <span>Finalizado</span>
            </label>
          </div>
        </div>
      </div>
    `;
  }).join('');
  if (window.feather) feather.replace();
}


function renderSummary(summaryData) {
  const container = document.getElementById('summary-view-container');
  if (!container) return;
  const entries = Object.entries(summaryData || {}).filter(([key, value]) => typeof value === 'number' && value > 0 && SUMMARY_FIELD_LABELS[key]);
  if (entries.length === 0) {
    container.innerHTML = '<p class="empty-state-text">No hay actuaciones registradas en el resumen.</p>';
    return;
  }
  container.innerHTML = entries.map(([key, value]) => {
    const iconName = SUMMARY_FIELD_ICONS[key] || 'list';
    return `
      <div class="stat-card compact">
        <i data-feather="${iconName}" class="stat-icon"></i>
        <span class="stat-value">${value}</span>
        <span class="stat-label">${SUMMARY_FIELD_LABELS[key]}</span>
      </div>`;
  }).join('');
}

function setupActionFooter(reportDetails) {
  const footer = document.getElementById('report-actions-footer');
  if (!footer) return;
  const user = currentUser.get();
  const isMando = user.role === 'admin' || user.role === 'supervisor';
  const canAgentEdit = reportDetails.status === 'open' || reportDetails.status === 'returned';
  let content = '';
  if (isMando) {
    if (reportDetails.status === 'pending_review') {
      content = `<button id="return-report-btn" class="button button-secondary">Devolver</button>
                 <button id="validate-report-btn" class="button button-success">Aprobar</button>`;
    }
  } else {
    if (canAgentEdit) {
       content = `<button id="edit-summary-btn" class="button button-secondary"><i data-feather="edit"></i> Resumen</button>
                  <button id="submit-report-btn" class="button button-primary"><i data-feather="send"></i> Enviar</button>`;
    }
  }
  footer.innerHTML = content;
}

function initializeServiceReportEventListeners() {
    if (eventListenersInitialized) return;

    const viewContainer = document.getElementById('service-report-view');
    if (!viewContainer) return;

    viewContainer.addEventListener('click', async (event) => {
        const button = event.target.closest('button');
        if (!button) return;
        const action = button.dataset.action;
        const itemRow = button.closest('.requerimiento-item-row');
        if (action === 'edit-req' && itemRow) {
            itemRow.classList.add('is-editing');
            itemRow.querySelector('.view-mode-content').style.display = 'none';
            itemRow.querySelector('.edit-mode-content').style.display = 'block';
        } else if (action === 'cancel-edit-req' && itemRow) {
            if (!itemRow.dataset.id) itemRow.remove();
            else {
                itemRow.classList.remove('is-editing');
                itemRow.querySelector('.view-mode-content').style.display = 'block';
                itemRow.querySelector('.edit-mode-content').style.display = 'none';
            }
        } else if (action === 'save-edit-req' && itemRow) {
            handleSaveRequerimiento(itemRow);
        } else if (button.classList.contains('req-delete-btn')) {
            handleDeleteRequerimiento(button.dataset.id);
        } else {
            switch (button.id) {
                case 'back-to-reports-list-btn': showReportsListView(); break;
                case 'edit-summary-btn': openReportSummaryModal(currentReport); break;
                case 'submit-report-btn': handleSubmitReport(); break;
                case 'add-requerimiento-btn': handleAddNewRequerimiento(); break;
                case 'return-report-btn': handleValidation('returned'); break;
                case 'validate-report-btn': handleValidation('validated'); break;
            }
        }
    });
    viewContainer.addEventListener('change', (event) => {
        const radio = event.target.closest('input[type="radio"]');
        if (!radio) return;
        if (radio.name.startsWith('req-status-')) handleRequerimientoChange(event);
        else if (radio.name.startsWith('chk-status-')) handleChecklistChange(event);
    });
    document.addEventListener('reportSummaryUpdated', async () => {
        if (document.getElementById('service-report-view') && currentReport?.id) {
            showLoading('Actualizando...');
            await renderServiceReport(currentReport.id);
            hideLoading();
        }
    });
    eventListenersInitialized = true;
}

async function handleSaveRequerimiento(itemRow) {
    const requerimientoId = itemRow.dataset.id;
    const data = {
        hora: itemRow.querySelector('input[name="hora"]').value,
        requirente: itemRow.querySelector('input[name="requirente"]').value.trim(),
        motivo: itemRow.querySelector('textarea[name="motivo"]').value.trim(),
        comment: itemRow.querySelector('textarea[name="comentario"]').value.trim(),
    };
    if (!data.hora || !data.requirente || !data.motivo) {
        displayMessage('Los campos Hora, Requirente y Motivo son obligatorios.', 'warning');
        return;
    }
    showLoading('Guardando...');
    try {
        if (requerimientoId) {
            await updateRequerimiento(currentReport.id, requerimientoId, data);
        } else {
            await addRequerimiento(currentReport.id, data);
        }
        displayMessage('Requerimiento guardado.', 'success');
        // El listener onSnapshot se encargará de re-renderizar, no es necesario llamar a renderServiceReport
    } catch (error) {
        displayMessage(`Error: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}


function handleAddNewRequerimiento() {
  const container = document.getElementById('requerimientos-list-container');
  if (!container) return;
  if (container.querySelector('.requerimiento-item-row:not([data-id])')) {
    displayMessage('Ya hay un nuevo requerimiento en proceso.', 'info');
    return;
  }
  const newRowHtml = `
    <div class="requerimiento-item-row is-editing">
      <div class="req-main-content">
        <div class="view-mode-content" style="display: none;"></div>
        <div class="edit-mode-content" style="display: block;">
          <div class="form-grid-2-col" style="margin-bottom: 0.75rem;">
            <div class="form-group"><label class="form-label">Hora</label><input type="time" class="form-control" name="hora" /></div>
            <div class="form-group"><label class="form-label">Requirente</label><input type="text" class="form-control" name="requirente" /></div>
          </div>
          <div class="form-group"><label class="form-label">Motivo</label><textarea class="form-control" name="motivo" rows="3"></textarea></div>
          <div class="form-group"><label class="form-label">Comentario</label><textarea class="form-control" name="comentario" rows="3"></textarea></div>
          <div class="inline-edit-actions">
            <button class="button button-secondary" data-action="cancel-edit-req">Cancelar</button>
            <button class="button button-primary" data-action="save-edit-req">Guardar</button>
          </div>
        </div>
      </div>
      <div class="req-actions-group"></div>
    </div>`;
  container.insertAdjacentHTML('afterbegin', newRowHtml);
  if(window.feather) feather.replace();
  container.querySelector('textarea[name="motivo"]').focus();
}

async function handleDeleteRequerimiento(requerimientoId) {
  if (!currentReport || !requerimientoId) return;
  if (confirm('¿Seguro que quieres eliminar este requerimiento?')) {
    showLoading('Eliminando...');
    try {
      await deleteRequerimiento(currentReport.id, requerimientoId);
      displayMessage('Requerimiento eliminado.', 'success');
      // onSnapshot se encargará de actualizar la UI
    } catch (error) {
      displayMessage(`Error: ${error.message}`, 'error');
    } finally {
      hideLoading();
    }
  }
}

async function handleRequerimientoChange(event) {
    const radio = event.target;
    const requerimientoId = radio.dataset.id;
    const newStatus = radio.value;
    showLoading('Actualizando...');
    try {
        await updateRequerimientoStatus({
            reportId: currentReport.id,
            requerimientoId: requerimientoId,
            newStatus: newStatus
        });
        displayMessage('Estado actualizado.', 'success');
    } catch (error) {
        displayMessage(`Error: ${error.message}`, 'error');
        // Revertir el cambio en la UI si falla
        const oldStatus = newStatus === 'realizado' ? 'pendiente' : 'realizado';
        document.querySelector(`input[name="req-status-${requerimientoId}"][value="${oldStatus}"]`).checked = true;
    } finally {
        hideLoading();
    }
}

async function handleChecklistChange(event) {
  const radio = event.target;
  const itemIndex = parseInt(radio.dataset.index, 10);
  const newStatus = radio.value;
  showLoading('Actualizando...');
  try {
    await updateChecklistItemStatus({
      reportId: currentReport.id,
      itemIndex: itemIndex,
      newStatus: newStatus
    });
    displayMessage('Tarea actualizada.', 'success');
  } catch (error) {
    displayMessage(`Error: ${error.message}`, 'error');
  } finally {
    hideLoading();
  }
}

async function handleSubmitReport() {
  if (!currentReport || !confirm('¿Enviar este parte para revisión?')) return;
  showLoading('Enviando...');
  try {
    await submitServiceReport(currentReport.id);
    displayMessage('Parte enviado para revisión.', 'success');
    showReportsListView();
  } catch (error) {
    displayMessage(`Error: ${error.message}`, 'error');
  } finally {
    hideLoading();
  }
}

async function handleValidation(newStatus) {
  if (!currentReport) return;
  let comments = '';
  if (newStatus === 'returned') {
    comments = prompt('Introduce los motivos para la devolución:');
    if (comments === null) return;
  }
  showLoading('Procesando...');
  try {
    await validateServiceReport({
      reportId: currentReport.id,
      newStatus: newStatus,
      comments: comments,
    });
    displayMessage(`Parte marcado como '${newStatus}'.`, 'success');
    if (newStatus === 'validated') {
      showReportsListView();
    }
  } catch (error) {
    displayMessage(`Error: ${error.message}`, 'error');
  } finally {
    hideLoading();
  }
}