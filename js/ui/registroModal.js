// js/ui/registroModal.js
import { displayMessage, showLoading, hideLoading } from './viewManager.js';
import { createRegistro, updateRegistro, markRegistroAsDeleted, getTemplatesByType, generateNextRegistrationNumber } from '../dataController.js';
import { availableAgents, currentUser } from '../state.js';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// --- Variables del Módulo ---
let modal, form, closeButton, typeSelect, dynamicFormContainer, modalTitle, deleteBtn;
let isInitialized = false;
let onSaveSuccessCallback = null;
let editingRecordId = null;
let currentTemplate = null;

export function initializeRegistroModal() {
    if (isInitialized) return;
    modal = document.getElementById('registro-modal');
    if (!modal) return;

    form = modal.querySelector('#registro-form');
    closeButton = modal.querySelector('.close-button');
    typeSelect = modal.querySelector('#registro-type-select');
    dynamicFormContainer = modal.querySelector('#registro-dynamic-form-container');
    modalTitle = modal.querySelector('#registro-modal-title');
    
    deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'button button-danger';
    deleteBtn.innerHTML = '<span class="material-icons">delete</span> Eliminar Registro';
    deleteBtn.style.marginRight = 'auto';
    modal.querySelector('.modal-actions').prepend(deleteBtn);

    closeButton.addEventListener('click', hideRegistroModal);
    form.addEventListener('submit', handleFormSubmit);
    typeSelect.addEventListener('change', () => renderDynamicForm());
    deleteBtn.addEventListener('click', handleDelete);
    
    isInitialized = true;
}

export function openRegistroModal(callback, recordData = null) {
    if (!isInitialized) initializeRegistroModal();
    onSaveSuccessCallback = callback;
    form.reset();
    dynamicFormContainer.innerHTML = '';
    
    const user = currentUser.get();
    const isAdmin = user && user.role === 'admin';

    if (recordData) {
        editingRecordId = recordData.id;
        modalTitle.textContent = 'Editar Registro';
        typeSelect.value = recordData.documentType;
        renderDynamicForm(recordData);
    } else {
        editingRecordId = null;
        modalTitle.textContent = 'Nuevo Registro';
        typeSelect.value = '';
        deleteBtn.classList.add('hidden');
    }
    modal.classList.remove('hidden');
}

function hideRegistroModal() {
    modal.classList.add('hidden');
}

async function renderDynamicForm(recordData = null) {
    const type = typeSelect.value;
    dynamicFormContainer.innerHTML = '';
    currentTemplate = null;

    if (!type) return;

    showLoading();
    try {
        const templates = await getTemplatesByType(type);
        hideLoading();

        if (templates.length > 0) {
            let templateOptions = '<option value="">-- Selecciona una plantilla --</option>';
            templates.forEach(t => { templateOptions += `<option value="${t.id}">${t.templateName}</option>`; });
            const templateSelectorHtml = `
                <div class="form-group">
                    <label for="template-select">Usar Plantilla</label>
                    <select id="template-select" class="selector">${templateOptions}</select>
                </div>
                <div id="template-fields-container"></div>
            `;
            dynamicFormContainer.innerHTML = templateSelectorHtml;

            const templateSelect = document.getElementById('template-select');
            templateSelect.addEventListener('change', () => {
                const selectedTemplateId = templateSelect.value;
                currentTemplate = templates.find(t => t.id === selectedTemplateId);
                if (currentTemplate) {
                    renderFormFromSchema(currentTemplate, recordData);
                } else {
                    document.getElementById('template-fields-container').innerHTML = '';
                }
            });
        } else {
            dynamicFormContainer.innerHTML = '<p class="info-message">No hay plantillas disponibles para este tipo de documento.</p>';
        }

    } catch (error) {
        hideLoading();
        displayMessage("Error al cargar las plantillas.", "error");
    }
}

/**
 * ✅ FUNCIÓN MODIFICADA: Ahora sincroniza el campo de texto con el selector múltiple.
 */
async function renderFormFromSchema(template, recordData = null) {
    const container = document.getElementById('template-fields-container');
    if (!container) return;
    
    let formHtml = '';
    const schema = template.schema || {};

    for (const key in schema) {
        const field = schema[key];
        const value = (recordData && recordData.details) ? (recordData.details[key] || '') : '';
        const required = field.required ? 'required' : '';
        formHtml += `<div class="form-group"><label for="template-field-${key}">${field.label}</label>`;
        if (field.type === 'textarea') {
            formHtml += `<textarea id="template-field-${key}" rows="${field.rows || 5}" ${required}>${value}</textarea>`;
        } else {
            formHtml += `<input type="text" id="template-field-${key}" value="${value}" ${required}>`;
        }
        formHtml += '</div>';
    }

    const agents = availableAgents.get();
    const agentOptions = agents.map(agent => `<option value="${agent.id}">${agent.name}</option>`).join('');
    formHtml += `<div class="form-group"><label for="registro-signing-agents">Agentes Firmantes</label><select id="registro-signing-agents" class="selector" multiple required>${agentOptions}</select><small>Mantén pulsada la tecla Ctrl (o Cmd en Mac) para seleccionar varios agentes.</small></div>`;
    container.innerHTML = formHtml;

    // --- LÓGICA DE AUTO-RELLENO Y SINCRONIZACIÓN ---
    const firmantesSelect = document.getElementById('registro-signing-agents');
    const numAgenteInput = document.getElementById('template-field-numero_agente');
    
    if (!recordData) { // MODO CREACIÓN
        const user = currentUser.get();
        const now = new Date();

        // ✅ INICIO DE LA MODIFICACIÓN: Simplificamos el auto-relleno
        const regNumInput = document.getElementById('template-field-numero_registro');
        if (regNumInput) {
            regNumInput.value = 'Se asignará al guardar';
            regNumInput.readOnly = true; // Hacemos el campo no editable
            regNumInput.style.fontStyle = 'italic';
            regNumInput.style.color = '#6b7280';
        }

        const fechaInput = document.getElementById('template-field-fecha');
        if (fechaInput) {
            fechaInput.value = format(now, "dd 'de' MMMM 'del' yyyy", { locale: es });
        }

        const horaInput = document.getElementById('template-field-hora');
        if (horaInput) {
            horaInput.value = format(now, "HH:mm");
        }
        
        if (user && user.agentId) {
            if (numAgenteInput) numAgenteInput.value = user.agentId;
            if (firmantesSelect) {
                const optionToSelect = firmantesSelect.querySelector(`option[value="${user.agentId}"]`);
                if (optionToSelect) optionToSelect.selected = true;
            }
        }
        // ✅ FIN DE LA MODIFICACIÓN
        
    } else { // MODO EDICIÓN
        // Rellenar con los agentes firmantes ya guardados
        if (recordData.details && recordData.details.signingAgents) {
            recordData.details.signingAgents.forEach(agentId => {
                const option = firmantesSelect.querySelector(`option[value="${agentId}"]`);
                if (option) option.selected = true;
            });
        }
        if (numAgenteInput) {
             numAgenteInput.value = recordData.details.numero_agente || (recordData.details.signingAgents || []).join(', ');
        }
    }

    if (firmantesSelect && numAgenteInput) {
        firmantesSelect.addEventListener('change', () => {
            const selectedAgents = Array.from(firmantesSelect.selectedOptions).map(opt => opt.value);
            numAgenteInput.value = selectedAgents.join(', ');
        });
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();
    if (!currentTemplate) return displayMessage("Por favor, selecciona una plantilla.", "error");

    const signingAgentsSelect = document.getElementById('registro-signing-agents');
    const selectedAgents = Array.from(signingAgentsSelect.selectedOptions).map(option => option.value);
    if (selectedAgents.length === 0) return displayMessage("Selecciona al menos un agente firmante.", "error");
    
    const details = {};
    for (const key in currentTemplate.schema) {
        const fieldElement = document.getElementById(`template-field-${key}`);
        if (fieldElement) details[key] = fieldElement.value.trim();
    }
    details.signingAgents = selectedAgents;

    const subject = details.asunto || 'Sin Asunto';
    const dataToSave = {
        subject: subject,
        details: details,
        templateUsed: currentTemplate.id
    };
    
    showLoading();
    try {
        let result;
        if (editingRecordId) {
            result = await updateRegistro(editingRecordId, dataToSave);
            displayMessage('Registro actualizado con éxito.', 'success');
        } else {
            result = await createRegistro(currentTemplate.documentType, dataToSave);
            displayMessage(`Registro guardado con Nº: ${result.registration_number}`, 'success');
        }

        if (result.success) {
            hideRegistroModal();
            if (onSaveSuccessCallback) onSaveSuccessCallback();
        }
    } catch (error) {
        displayMessage(`Error: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

async function handleDelete() {
    if (!editingRecordId) return;
    const reason = prompt("Por favor, introduce el motivo de la eliminación. Este campo es obligatorio.");
    if (!reason || reason.trim() === '') return displayMessage("La eliminación fue cancelada.", "info");
    
    showLoading();
    try {
        const result = await markRegistroAsDeleted(editingRecordId, reason.trim());
        if (result.success) {
            displayMessage('Registro marcado como eliminado con éxito.', 'success');
            hideRegistroModal();
            if (onSaveSuccessCallback) onSaveSuccessCallback();
        }
    } catch (error) {
        displayMessage(`Error al eliminar: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}