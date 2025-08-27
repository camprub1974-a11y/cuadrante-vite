// js/ui/serviceReportView.js

import { displayMessage, showLoading, hideLoading } from './viewManager.js';
import { showScheduleView, showReportsListView } from '../main.js';
import { getServiceReportDetails, toggleRequerimientoStatus, submitServiceReport, validateServiceReport, updateChecklistItemStatus, updateRequerimientoStatus } from '../dataController.js';
import { openReportEntryModal } from './reportEntryModal.js';
import { openReportSummaryModal } from './reportSummaryModal.js';
import { openAddRequerimientoModal } from './addRequerimientoModal.js';
import { formatDate } from '../utils.js';
import { getAgentName } from './scheduleRenderer.js';
import { currentUser } from '../state.js';
import { auth } from '../firebase-config.js';


let viewContainer, titleEl, orderRefEl, entriesContainer;
let currentReport = null;
let isInitialized = false;
let backButton;
let tasksContainer, summaryContainer, requerimientosContainer;
let reportActionsFooter;

export function initializeServiceReportView() {
    if (isInitialized) return;
    viewContainer = document.getElementById('service-report-view');
    if (!viewContainer) return;

    titleEl = viewContainer.querySelector('#report-view-title');
    orderRefEl = viewContainer.querySelector('#report-order-ref');
    tasksContainer = viewContainer.querySelector('#report-tasks-container');
    summaryContainer = viewContainer.querySelector('#report-summary-container');
    requerimientosContainer = viewContainer.querySelector('#report-requerimientos-section');
    entriesContainer = viewContainer.querySelector('#report-entries-container');
    reportActionsFooter = viewContainer.querySelector('.report-actions-footer');

    if (reportActionsFooter) {
        reportActionsFooter.addEventListener('click', (event) => {
            const button = event.target.closest('button');
            if (!button) return;
            if (button.id === 'edit-summary-btn') { if (currentReport) openReportSummaryModal(currentReport); }
            if (button.id === 'add-report-entry-btn') { if (currentReport) openReportEntryModal(currentReport.id); }
            if (button.id === 'submit-report-btn') { handleSubmitReport(); }
        });
        const validationActionsContainer = document.createElement('div');
        validationActionsContainer.className = 'report-actions-mando';
        reportActionsFooter.appendChild(validationActionsContainer);
    }
    
    if (requerimientosContainer) {
        requerimientosContainer.addEventListener('click', async (event) => {
            if (event.target.id === 'add-requerimiento-btn' || event.target.closest('#add-requerimiento-btn')) {
                if (currentReport) openAddRequerimientoModal(currentReport.id);
            } 
        });

        requerimientosContainer.addEventListener('change', async (event) => {
            const target = event.target;
            if (target.type === 'radio' && target.name.startsWith('requerimiento-status-')) {
                const requerimientoId = target.dataset.id;
                const newStatus = target.value;
                const commentInput = requerimientosContainer.querySelector(`#requerimiento-comment-${requerimientoId}`);
                const comment = commentInput ? commentInput.value : '';

                if (!currentReport || !currentReport.order_id) {
                    displayMessage('Error: Faltan datos del parte de servicio o la orden.', 'error');
                    return;
                }

                try {
                    showLoading();
                    const payload = {
                        reportId: currentReport.id,
                        orderId: currentReport.order_id,
                        requerimientoId: requerimientoId,
                        newStatus: newStatus,
                        comment: comment
                    };
                    
                    if (newStatus === 'realizado') {
                        try {
                            const position = await new Promise((resolve, reject) => {
                                if (!navigator.geolocation) return reject(new Error("Geolocalización no soportada."));
                                navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
                            });
                            payload.geolocation = { latitude: position.coords.latitude, longitude: position.coords.longitude };
                            displayMessage("Geolocalización para requerimiento capturada.", "info");
                        } catch (geoError) {
                            displayMessage(`No se pudo obtener geolocalización para requerimiento: ${geoError.message}.`, "warning");
                            const continueWithoutGeo = confirm("No se pudo obtener tu ubicación. ¿Deseas marcar el requerimiento como 'Realizado' sin registrar la ubicación?");
                            if (!continueWithoutGeo) {
                                target.checked = false;
                                requerimientosContainer.querySelector(`#requerimiento-pendiente-${requerimientoId}`).checked = true;
                                hideLoading();
                                return;
                            }
                        }
                    }
                    
                    console.log("currentUser en serviceReportView:", currentUser.get());
                    await updateRequerimientoStatus(payload);
                    displayMessage('Estado de requerimiento actualizado.', 'success');
                    await renderServiceReport(currentReport.id);
                } catch (error) {
                    displayMessage(`Error al actualizar requerimiento: ${error.message}`, 'error');
                    target.checked = !target.checked;
                    requerimientosContainer.querySelector(`#requerimiento-${newStatus === 'realizado' ? 'pendiente' : 'realizado'}-${requerimientoId}`).checked = true;
                } finally {
                    hideLoading();
                }
            }
        });

        requerimientosContainer.addEventListener('blur', async (event) => {
            const target = event.target;
            if (target.classList.contains('requerimiento-comment-input') && target.dataset.id !== undefined) {
                const requerimientoId = target.dataset.id;
                const comment = target.value;
                const statusRadio = requerimientosContainer.querySelector(`input[name="requerimiento-status-${requerimientoId}"]:checked`);
                const currentStatus = statusRadio ? statusRadio.value : 'pendiente'; 

                if (!currentReport || !currentReport.order_id) {
                    displayMessage('Error: Faltan datos del parte de servicio o la orden.', 'error');
                    return;
                }
                
                try {
                    showLoading();
                    await updateRequerimientoStatus({
                        reportId: currentReport.id,
                        orderId: currentReport.order_id,
                        requerimientoId: requerimientoId,
                        newStatus: currentStatus,
                        comment: comment
                    });
                    displayMessage('Comentario de requerimiento actualizado.', 'success');
                } catch (error) {
                    displayMessage(`Error al guardar comentario de requerimiento: ${error.message}`, 'error');
                } finally {
                    hideLoading();
                }
            }
        }, true);
    }

    if (tasksContainer) {
        tasksContainer.addEventListener('change', async (event) => {
            const target = event.target;
            const itemIndex = parseInt(target.dataset.index, 10);

            if (!currentReport || !currentReport.order_id) {
                displayMessage('Error: Faltan datos del parte de servicio o la orden.', 'error');
                return;
            }

            if (target.type === 'radio' && target.name.startsWith('checklist-status-')) {
                const newStatus = target.value;
                const commentInput = tasksContainer.querySelector(`#checklist-comment-${itemIndex}`);
                const comment = commentInput ? commentInput.value : '';

                try {
                    showLoading();
                    const payload = {
                        reportId: currentReport.id,
                        orderId: currentReport.order_id,
                        itemIndex: itemIndex,
                        newStatus: newStatus,
                        comment: comment
                    };

                    if (newStatus === 'realizado') {
                        try {
                            const position = await new Promise((resolve, reject) => {
                                if (!navigator.geolocation) return reject(new Error("Geolocalización no es soportada."));
                                navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
                            });
                            payload.geolocation = { latitude: position.coords.latitude, longitude: position.coords.longitude };
                            displayMessage("Geolocalización capturada.", "info");
                        } catch (geoError) {
                            displayMessage(`No se pudo obtener la geolocalización: ${geoError.message}.`, "warning");
                            const continueWithoutGeo = confirm("No se pudo obtener tu ubicación. ¿Deseas marcar el ítem como 'Realizado' sin registrar la ubicación?");
                            if (!continueWithoutGeo) {
                                target.checked = false;
                                tasksContainer.querySelector(`#checklist-pendiente-${itemIndex}`).checked = true;
                                hideLoading();
                                return;
                            }
                        }
                    }

                    await updateChecklistItemStatus(payload);
                    displayMessage("Checklist actualizado.", "success");
                    await renderServiceReport(currentReport.id);
                } catch (error) {
                    displayMessage(`Error al actualizar: ${error.message}`, 'error');
                    target.checked = !target.checked;
                    tasksContainer.querySelector(`#checklist-${newStatus === 'realizado' ? 'pendiente' : 'realizado'}-${itemIndex}`).checked = true;
                } finally {
                    hideLoading();
                }
            }
        });

        tasksContainer.addEventListener('blur', async (event) => {
            const target = event.target;
            if (target.classList.contains('checklist-comment-input') && target.dataset.index !== undefined) {
                const itemIndex = parseInt(target.dataset.index, 10);
                const comment = target.value;
                const statusRadio = tasksContainer.querySelector(`input[name="checklist-status-${itemIndex}"]:checked`);
                const currentStatus = statusRadio ? statusRadio.value : 'pendiente'; 

                if (!currentReport || !currentReport.order_id) {
                    displayMessage('Error: Faltan datos del parte de servicio o la orden.', 'error');
                    return;
                }
                
                try {
                    showLoading();
                    await updateChecklistItemStatus({
                        reportId: currentReport.id,
                        orderId: currentReport.order_id,
                        itemIndex: itemIndex,
                        newStatus: currentStatus,
                        comment: comment
                    });
                    displayMessage('Comentario actualizado.', 'success');
                } catch (error) {
                    displayMessage(`Error al guardar comentario: ${error.message}`, 'error');
                } finally {
                    hideLoading();
                }
            }
        }, true);
    }


    backButton = document.createElement('button');
    backButton.id = 'back-to-reports-list-btn';
    backButton.className = 'button button-icon button-secondary';
    backButton.title = 'Volver a la lista de partes';
    backButton.innerHTML = '<span class="material-icons">arrow_back</span>';
    viewContainer.querySelector('.report-header')?.prepend(backButton);
    backButton.addEventListener('click', handleBackToReportsList);
    
    document.addEventListener('reportEntryAdded', () => { if (currentReport) renderServiceReport(currentReport.id); });
    document.addEventListener('reportSummaryUpdated', () => { if (currentReport) renderServiceReport(currentReport.id); });
    document.addEventListener('requerimientoAdded', () => { if (currentReport) renderServiceReport(currentReport.id); });


    isInitialized = true;
}

// Reemplaza esta función completa en tu archivo js/ui/serviceReportView.js
export async function renderServiceReport(reportId, isMandoReview = false) {
    if (!isInitialized) return;
    
    const user = currentUser.get();
    const isMando = user.role === 'admin' || user.role === 'supervisor';

    showLoading();
    try {
        const reportDetails = await getServiceReportDetails(reportId);
        currentReport = reportDetails;
        
        const reportStatus = reportDetails.status;
        const canAgentEditReport = reportStatus === 'open' || reportStatus === 'returned';

        // --- Renderizado del Encabezado ---
        titleEl.innerHTML = `<div class="title-block"><h2>Parte de Servicio</h2><p>${reportDetails.order?.title || 'Orden sin título'}</p></div>`;
        
        // --- ✅ LÓGICA DE RENDERIZADO DE LA TARJETA DE INFORMACIÓN CORREGIDA ---
        const order = reportDetails.order;
        if (order) {
            // Logs de depuración para verificar los datos
            console.log("[DEPURACIÓN] Datos de la orden recibidos:", order);
            console.log("[DEPURACIÓN] ID del responsable (shift_manager_id):", order.shift_manager_id); // ✅ Campo corregido

            // Se usa el nombre de campo correcto: shift_manager_id
            const responsibleAgent = getAgentName(order.shift_manager_id); // ✅ Campo corregido
            console.log("[DEPURACIÓN] Nombre del responsable encontrado:", responsibleAgent);

            const assignedAgentsNames = Array.isArray(order.assigned_agents) 
                ? order.assigned_agents.map(id => getAgentName(id)).join(', ') 
                : 'N/A';

            // Se actualizan los elementos del DOM
            document.getElementById('report-order-title').textContent = order.title || 'N/A';
            document.getElementById('report-order-date').textContent = formatDate(order.service_date.toDate(), 'dd/MM/yyyy') || 'N/A';
            document.getElementById('report-order-responsible').textContent = responsibleAgent || 'No Asignado';
            document.getElementById('report-order-agents').textContent = assignedAgentsNames || 'N/A';
            document.getElementById('report-order-ref').textContent = `Reg: ${order.order_reg_number || 'N/A'}`;
            document.getElementById('report-order-status').className = `status-badge status-${order.status.toLowerCase()}`;
            document.getElementById('report-order-status').textContent = order.status || 'N/A';
        }
        
        // --- El resto de la función (Novedades, Tareas, etc.) no cambia ---
        const feedItems = [];
        if (reportDetails.order?.description) {
            feedItems.push({ 
                isInstruction: true, 
                description: reportDetails.order.description, 
                timestamp: reportDetails.order.created_at 
            });
        }
        if (reportDetails.entries && reportDetails.entries.length > 0) {
            reportDetails.entries.forEach(entry => feedItems.push({
                isInstruction: false, 
                agentId: entry.created_by_agent_id, 
                description: entry.description, 
                timestamp: entry.entry_time 
            }));
        }
        feedItems.sort((a,b) => a.timestamp.toDate() - b.timestamp.toDate());

        let feedHtml = feedItems.length > 0 ? feedItems.map(item => `
            <div class="feed-item">
                <div class="feed-item-icon">
                    <span class="material-icons">${item.isInstruction ? 'list_alt' : 'person'}</span>
                </div>
                <div class="feed-item-content">
                    <div class="entry-header">
                        <span class="entry-agent">${item.isInstruction ? 'Instrucciones' : getAgentName(item.agentId || item.created_by_agent_id)}</span>
                        <span class="entry-time">${formatDate(item.timestamp.toDate(), 'dd/MM/yyyy HH:mm')}</span>
                    </div>
                    <p class="entry-description">${item.description.replace(/\\n/g, '\n')}</p>
                </div>
            </div>
        `).join('') : '<p class="info-message">No hay novedades registradas en este parte.</p>';
        entriesContainer.querySelector('.report-feed').innerHTML = feedHtml;


        document.getElementById('report-task-reg-number').textContent = `Reg: ${reportDetails.order?.order_reg_number || 'N/A'}`;
        document.getElementById('report-task-status-badge').className = `status-badge status-${reportStatus.toLowerCase()}`;
        document.getElementById('report-task-status-badge').textContent = reportStatus;
        renderChecklist(reportDetails.order, isMando);
        
        renderRequerimientos(reportDetails.requerimientos || [], canAgentEditReport);

        const manualSummary = reportDetails.summary || {};
        const requerimientos = reportDetails.requerimientos || [];
        
        const requerimientosRecibidos = requerimientos.length;
        const requerimientosResueltos = requerimientos.filter(r => r.isResolved).length;

        const combinedSummary = {
            ...manualSummary,
            requerimientos_recibidos: requerimientosRecibidos,
            requerimientos_resueltos: requerimientosResueltos,
        };
        
        const filteredSummary = Object.entries(combinedSummary).filter(([, value]) => value > 0);

        if (filteredSummary.length > 0) {
            let summaryItemsHtml = filteredSummary.map(([key, value]) => {
                const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                return `<div class="summary-item"><span class="summary-item-value">${value}</span><span class="summary-item-label">${label}</span></div>`;
            }).join('');
            summaryContainer.querySelector('.card-content .summary-grid').innerHTML = summaryItemsHtml;
        } else {
            summaryContainer.querySelector('.card-content .summary-grid').innerHTML = '<p class="info-message">No hay actuaciones registradas.</p>';
        }
        
        const validationActionsContainer = reportActionsFooter.querySelector('.report-actions-mando');
        const agentButtons = reportActionsFooter.querySelectorAll('#add-report-entry-btn, #submit-report-btn, #edit-summary-btn');

        if (isMando) {
            reportActionsFooter.style.display = 'flex';
            const isPendingReview = reportStatus === 'pending_review';
            if (isPendingReview) {
                validationActionsContainer.innerHTML = `<button id="return-report-btn" class="button button-secondary">Devolver para Corrección</button><button id="validate-report-btn" class="button button-success">Aprobar Parte</button>`;
                validationActionsContainer.querySelector('#validate-report-btn').addEventListener('click', () => handleValidation('validated'));
                validationActionsContainer.querySelector('#return-report-btn').addEventListener('click', () => handleValidation('returned'));
            } else {
                validationActionsContainer.innerHTML = `<p class="info-message">No hay acciones de validación disponibles (Estado: ${reportStatus}).</p>`;
            }
            agentButtons.forEach(btn => btn.style.display = 'none');
        } else { 
            validationActionsContainer.innerHTML = '';
            if (canAgentEditReport) {
                reportActionsFooter.style.display = 'flex';
                agentButtons.forEach(btn => btn.style.display = 'inline-flex');
            } else {
                reportActionsFooter.style.display = 'none';
            }
        }
        backButton.style.display = 'inline-flex';

    } catch (error) {
       console.error("Error detallado en renderServiceReport:", error);
       displayMessage(`Error al cargar los detalles del parte: ${error.message}`, 'error');
       if (entriesContainer) entriesContainer.querySelector('.report-feed').innerHTML = `<p class="error-message">No se pudo cargar el parte de servicio.</p>`;
       if (tasksContainer) tasksContainer.querySelector('#checklist-items-wrapper').innerHTML = '';
       if (summaryContainer) summaryContainer.querySelector('.card-content .summary-grid').innerHTML = '';
       if (requerimientosContainer) requerimientosContainer.querySelector('.card-content .requerimientos-list').innerHTML = '';
       if (reportActionsFooter) reportActionsFooter.style.display = 'none';
    } finally {
        hideLoading();
    }
}

// FUNCIÓN RENDERCHECKLIST (ahora para Tareas)
function renderChecklist(orderData, isMando) {
    const checklistWrapper = document.getElementById('checklist-items-wrapper');
    if (!checklistWrapper || !orderData) return;

    const checklist = orderData.checklist || [];
    const isEditable = !isMando && (orderData.status === 'in_progress' || orderData.status === 'assigned');

    if (checklist.length === 0) {
        checklistWrapper.innerHTML = '<p class="info-message">Esta orden no tiene un checklist asociado.</p>';
        return;
    }

    checklistWrapper.innerHTML = checklist.map((item, index) => {
        const status = item.status || (item.completed ? 'realizado' : 'pendiente');
        const isRealizado = status === 'realizado';
        const isPendiente = status === 'pendiente';

        let completionDetailsHtml = '';
        if (isRealizado && item.completed_at) {
            const time = formatDate(item.completed_at.toDate(), 'HH:mm:ss');
            let locationInfo = 'Ubicación no registrada';
            if (item.completed_location && item.completed_location.latitude !== undefined && item.completed_location.longitude !== undefined) {
                locationInfo = `Lat: ${item.completed_location.latitude.toFixed(4)}, Lon: ${item.completed_location.longitude.toFixed(4)}`;
            }
            completionDetailsHtml = `<span class="completion-details" title="Completado a las ${time} - ${locationInfo}"><span class="material-icons">where_to_vote</span></span>`;
        }

        return `
            <div class="checklist-item ${isRealizado ? 'is-realizado' : ''}">
                <div class="checklist-item-header">
                    <label>${index + 1}. ${item.item}</label> <div class="checklist-status-options">
                        <div class="radio-group">
                            <input type="radio" id="checklist-pendiente-${index}" name="checklist-status-${index}" value="pendiente" ${isPendiente ? 'checked' : ''} ${!isEditable ? 'disabled' : ''} data-index="${index}">
                            <label for="checklist-pendiente-${index}">Pendiente</label>
                        </div>
                        <div class="radio-group">
                            <input type="radio" id="checklist-realizado-${index}" name="checklist-status-${index}" value="realizado" ${isRealizado ? 'checked' : ''} ${!isEditable ? 'disabled' : ''} data-index="${index}">
                            <label for="checklist-realizado-${index}">Realizado</label>
                        </div>
                        ${completionDetailsHtml} </div>
                </div>
                <textarea class="checklist-comment-input" id="checklist-comment-${index}" data-index="${index}" placeholder="Añadir comentario (opcional)..." ${!isEditable ? 'disabled' : ''}>${item.comment || ''}</textarea>
            </div>
        `;
    }).join('');
}

// FUNCIÓN renderRequerimientos
function renderRequerimientos(requerimientos, canAgentEditReport) {
    const requerimientosListWrapper = requerimientosContainer.querySelector('.requerimientos-list');
    if (!requerimientosListWrapper) return;

    if (requerimientos.length === 0) {
        requerimientosListWrapper.innerHTML = '<p class="info-message">No hay requerimientos registrados.</p>';
        return;
    }

    requerimientosListWrapper.innerHTML = requerimientos.map(req => {
        const isRealizado = req.isResolved;
        const isPendiente = !isRealizado;
        const disabled = canAgentEditReport ? '' : 'disabled';
        const uniqueId = req.id;
        
        let completionDetailsHtml = '';
        if (isRealizado && req.resolvedAt) {
            const time = formatDate(req.resolvedAt.toDate(), 'HH:mm:ss');
            let locationInfo = 'Ubicación no registrada';
            if (req.resolvedLocation && req.resolvedLocation.latitude !== undefined && req.resolvedLocation.longitude !== undefined) {
                locationInfo = `Lat: ${req.resolvedLocation.latitude.toFixed(4)}, Lon: ${req.resolvedLocation.longitude.toFixed(4)}`;
            }
            completionDetailsHtml = `<span class="completion-details" title="Resuelto a las ${time} - ${locationInfo}"><span class="material-icons">where_to_vote</span></span>`;
        }

        return `
            <div class="requerimiento-item ${isRealizado ? 'is-realizado' : ''}">
                <div class="requerimiento-item-header">
                    <label>${req.description}</label>
                    <div class="requerimiento-status-options">
                        <div class="radio-group">
                            <input type="radio" id="requerimiento-pendiente-${uniqueId}" name="requerimiento-status-${uniqueId}" value="pendiente" ${isPendiente ? 'checked' : ''} ${disabled} data-id="${uniqueId}">
                            <label for="requerimiento-pendiente-${uniqueId}">Pendiente</label>
                        </div>
                        <div class="radio-group">
                            <input type="radio" id="requerimiento-realizado-${uniqueId}" name="requerimiento-status-${uniqueId}" value="realizado" ${isRealizado ? 'checked' : ''} ${disabled} data-id="${uniqueId}">
                            <label for="requerimiento-realizado-${uniqueId}">Realizado</label>
                        </div>
                        ${completionDetailsHtml}
                    </div>
                </div>
                <textarea class="requerimiento-comment-input" id="requerimiento-comment-${uniqueId}" data-id="${uniqueId}" placeholder="Añadir comentario (opcional)..." ${disabled}>${req.comment || ''}</textarea>
            </div>
        `;
    }).join('');

    const addRequerimientoBtn = requerimientosContainer.querySelector('#add-requerimiento-btn');
    if (addRequerimientoBtn) {
        addRequerimientoBtn.style.display = canAgentEditReport ? 'inline-flex' : 'none';
    }
}


async function handleSubmitReport() {
    if (!currentReport) return;
    if (!confirm("¿Estás seguro de que quieres finalizar y enviar este parte de servicio? No podrás añadir más novedades.")) return;
    showLoading();
    try {
        await submitServiceReport(currentReport.id);
        displayMessage("Parte de servicio enviado para revisión.", "success");
        document.dispatchEvent(new CustomEvent('serviceReportSubmitted', { detail: { reportId: currentReport.id } }));
        showScheduleView(); 
    }
    catch (error) {
        displayMessage(`Error al enviar el parte: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

async function handleValidation(newStatus) {
    if (!currentReport) return;
    let comments = '';
    if (newStatus === 'returned') {
        comments = prompt("Por favor, introduce los motivos para la devolución del parte:");
        if (comments === null || comments.trim() === '') {
            displayMessage("La devolución fue cancelada.", "info");
            return;
        }
    }
    showLoading();
    try {
        await validateServiceReport({ reportId: currentReport.id, newStatus, comments });
        displayMessage(`El parte ha sido marcado como '${newStatus}'.`, 'success');
        document.dispatchEvent(new CustomEvent('reportValidated'));
        renderServiceReport(currentReport.id, true); 
    } catch (error) {
        displayMessage(`Error al actualizar el parte: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

function handleBackToReportsList() {
    showReportsListView(); 
}