// EN: js/ui/registroModal.js

import { displayMessage, showLoading, hideLoading } from './viewManager.js';
import Handlebars from 'handlebars';
import {
  createRegistro,
  updateRegistro,
  markRegistroAsDeleted,
  getTemplatesByType,
  uploadRecordImage,
  getDocumentTemplateById, // Importamos la función para obtener la plantilla completa
  getRegistroById // Importamos para el modo edición
} from '../dataController.js';
import { availableAgents, currentUser } from '../state.js';
import { resizeImage } from '../utils.js';

Handlebars.registerHelper('eq', function (a, b) {
  return a === b;
});

// --- VARIABLES GLOBALES DEL MÓDULO ---
let modalClone;
let modalTemplate;
let onSaveSuccessCallback = null;
let recordData = null;
let currentTemplate = null;
let templatesCache = [];
let editingRecordId = null;
let currentStep = 1;
let totalSteps = 0;
let fieldOrderGroups = [];
let allFields = [];
let currentTaskId = null; // Para la trazabilidad de tareas
let currentParentId = null;

// --- ESTILOS CSS ---
const wizardStyles = `
  #wizard-progress { display: flex; flex-wrap: wrap; gap: 5px; justify-content: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px solid #e0e0e0; }
  .step-indicator { padding: 6px 12px; border: 1px solid #ccc; border-radius: 20px; color: #888; background-color: #f9f9f9; font-size: 0.85em; cursor: default; transition: all 0.3s ease; }
  .step-indicator.active { border-color: #007bff; background-color: #007bff; color: white; font-weight: bold; }
  .step-indicator.completed { border-color: #28a745; background-color: #28a745; color: white; }
  #wizard-navigation { margin-top: 25px; padding-top: 15px; border-top: 1px solid #e0e0e0; display: flex; justify-content: space-between; }
  .form-group.required .form-label::after { content: " *"; color: #dc3545; font-weight: bold; margin-left: 4px; }
  .form-group input.is-invalid, .form-group textarea.is-invalid, .form-group select.is-invalid { border-color: #dc3545 !important; box-shadow: 0 0 0 1px #dc3545; }
  .repeater-item { border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; margin-bottom: 15px; background-color: #fdfdfd; }
  .repeater-item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #e0e0e0; }
  .repeater-item-header h4 { margin: 0; font-size: 1em; }
  .modal-overlay .modal-content {
    width: 90%;
    max-width: 800px;
  }
`;
const styleElementId = 'wizard-modal-styles';

// --- FUNCIONES AUXILIARES ---
function injectWizardStyles() {
  if (!document.getElementById(styleElementId)) {
    const styleEl = document.createElement('style');
    styleEl.id = styleElementId;
    styleEl.innerHTML = wizardStyles;
    document.head.appendChild(styleEl);
  }
}

function removeWizardStyles() {
  const styleEl = document.getElementById(styleElementId);
  if (styleEl) styleEl.remove();
}

function unescapeHtml(safe) {
  if (!safe) return '';
  return safe.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/'/g, "'");
}

function closeAndDestroyModal() {
  removeWizardStyles();
  if (modalClone) {
    modalClone.classList.add('hidden');
    setTimeout(() => modalClone.remove(), 300);
  }
  currentTaskId = null;
  currentParentId = null; // ✅ LIMPIEZA DEL ESTADO
}

function getFormDefinition(template) {
    if (!template) return [];
    if (template.fields && Array.isArray(template.fields) && template.fields.length > 0) return template.fields;
    if (template.schema) {
        const fieldsArray = [];
        const fieldKeys = (template.fieldOrder && Array.isArray(template.fieldOrder)) ? template.fieldOrder.flatMap(group => group.fields || []) : Object.keys(template.schema);
        for (const fieldId of fieldKeys) {
            if (template.schema[fieldId]) fieldsArray.push({ id: fieldId, ...template.schema[fieldId] });
        }
        return fieldsArray;
    }
    return [];
}


// --- Inicialización ---
export function initializeRegistroModal() {
    modalTemplate = document.getElementById('template-registro-modal');
    if (!modalTemplate) {
        console.error('Error Crítico: El <template> con id "template-registro-modal" no fue encontrado.');
    }
}

// --- Apertura del Modal ---
export async function openRegistroModal(options = {}) {
    if (!modal) {
        console.error("El modal de registro no está inicializado.");
        return;
    }

    currentRecordId = options.recordId || null;
    onSaveCallback = options.callback || null;
    currentTaskId = options.taskId || null;

    if (currentRecordId) {
        // --- MODO EDICIÓN ---
        showLoading('Cargando documento...');
        try {
            const recordData = await getRegistroById(currentRecordId);
            modal.querySelector('.modal-title').textContent = `Editar Documento: ${recordData.registrationNumber || ''}`;
            
            // Rellenar campos comunes
            form.querySelector('#subject-field').value = recordData.subject || '';
            form.querySelector('#interesado-field').value = recordData.interesado || '';
            form.querySelector('#direction-field').value = recordData.direction || 'salida';
            templateSelector.value = recordData.templateUsed || '';
            
            // Renderizar y rellenar campos dinámicos
            if (recordData.templateUsed) {
                const templateData = await getDocumentTemplateById(recordData.templateUsed);
                renderDynamicFields(templateData.schema, templateData.fieldOrder);
                
                // Rellenar los valores guardados
                Object.keys(templateData.schema).forEach(key => {
                    const input = form.querySelector(`[name="${key}"]`);
                    if (input && recordData[key] !== undefined) {
                        input.value = recordData[key];
                    }
                });
            }
            
            templateSelector.disabled = true;
        } catch (error) {
            displayMessage(`Error al cargar los datos del registro: ${error.message}`, 'error');
            closeRegistroModal();
        } finally {
            hideLoading();
        }

    } else {
        // --- MODO CREACIÓN ---
        // ✅ INICIO DE LA CORRECCCIÓN
        const direction = options.direction || 'salida'; // Usamos la dirección pasada o 'salida' por defecto.

        // Cambiamos el título del modal dinámicamente
        modal.querySelector('.modal-title').textContent = direction === 'entrada' 
            ? 'Nuevo Documento de Entrada' 
            : 'Nuevo Documento de Salida';
        
        resetForm();
        
        // Populamos el selector de plantillas y el campo oculto con la dirección correcta
        await populateTemplateSelector(direction);
        form.querySelector('#direction-field').value = direction;
        // ✅ FIN DE LA CORRECCCIÓN
        
        templateSelector.disabled = false;
    }
    
    modal.classList.remove('hidden');
    feather.replace();
}

// --- SETUP DE EVENTOS ---
function setupEventListeners() {
    const form = modalClone.querySelector('#registro-form');
    if (!form || form.dataset.listenerAttached) return;

    const typeSelect = modalClone.querySelector('#registro-type-select');
    const closeButtons = modalClone.querySelectorAll('.close-button');
    const deleteBtn = modalClone.querySelector('#delete-registro-btn');
    const dynamicFormContainer = modalClone.querySelector('#registro-dynamic-form-container');

    form.addEventListener('submit', handleFormSubmit);
    typeSelect.addEventListener('change', () => handleTypeChange());
    closeButtons.forEach(btn => btn.addEventListener('click', closeAndDestroyModal));

    if (deleteBtn && currentUser.get()?.role === 'admin') {
        deleteBtn.addEventListener('click', handleDelete);
    }

    dynamicFormContainer.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (!button) return;

        if (button.id === 'back-to-type-btn') {
            const typeSelectStep = modalClone.querySelector('#type-select-step');
            const templateSelectStep = modalClone.querySelector('#template-select-step');
            
            typeSelectStep.classList.remove('hidden');
            templateSelectStep.classList.add('hidden');
            templateSelectStep.innerHTML = '';

            currentTemplate = null;
            updatePreview();
            return;
        }

        if (button.classList.contains('upload-image-btn')) {
            handleImageUpload(button);
        }

        if (button.classList.contains('add-repeater-item-btn')) {
            addRepeaterItem(button.dataset.repeaterId);
        }

        if (button.classList.contains('delete-repeater-item-btn')) {
            const itemToDelete = button.closest('.repeater-item');
            if (itemToDelete) {
                itemToDelete.remove();
                updatePreview();
            }
        }
    });

    dynamicFormContainer.addEventListener('input', updatePreview);
    form.dataset.listenerAttached = 'true';
}

// --- LÓGICA DE FLUJO DEL FORMULARIO ---
async function handleTypeChange() {
    const typeSelect = modalClone.querySelector('#registro-type-select');
    const typeStepContainer = modalClone.querySelector('#type-select-step');
    const templateStepContainer = modalClone.querySelector('#template-select-step');
    const documentType = typeSelect.value;
    
    if (!documentType) return;

    typeStepContainer.classList.add('hidden');
    templateStepContainer.classList.remove('hidden');
    
    currentTemplate = null;
    updatePreview();

    showLoading('Cargando plantillas...');
    try {
        const templates = await getTemplatesByType(documentType);
        templatesCache = templates;
        
        let step2Html = '';
        if (templates.length > 0) {
            let opts = '<option value="">-- Elige una plantilla --</option>' + templates.map((t) => `<option value="${t.id}">${t.templateName}</option>`).join('');
            step2Html = `
                <div class="form-group">
                    <label class="form-label" for="template-select">Usar Plantilla</label>
                    <select id="template-select" class="selector">${opts}</select>
                </div>
                <div id="template-fields-container"></div>
            `;
        } else {
            step2Html = '<p class="info-message">No hay plantillas para este tipo.</p>';
        }

        step2Html += `
            <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--color-border);">
                <button type="button" id="back-to-type-btn" class="button button-secondary">
                    <i data-feather="arrow-left"></i>
                    <span>Volver a Tipo de Documento</span>
                </button>
            </div>
        `;

        templateStepContainer.innerHTML = step2Html;
        
        const templateSelect = templateStepContainer.querySelector('#template-select');
        if (templateSelect) {
            templateSelect.addEventListener('change', () => {
                currentTemplate = templatesCache.find((t) => t.id === templateSelect.value) || null;
                renderFormFromSchema();
            });
        }
    } catch (error) {
        displayMessage('Error al cargar las plantillas.', 'error');
    } finally {
        hideLoading();
        if (window.feather) feather.replace();
    }
}

function renderFormFromSchema(dataForEdit = null) {
  const container = modalClone.querySelector('#template-fields-container');
  if (!container || !currentTemplate) {
    if (container) container.innerHTML = '';
    updatePreview();
    return;
  }

  fieldOrderGroups = currentTemplate.fieldOrder || [];
  totalSteps = fieldOrderGroups.length;
  currentStep = 1;
  allFields = getFormDefinition(currentTemplate);
  const details = dataForEdit ? dataForEdit.details : {};

  let progressHtml = fieldOrderGroups.map((group, index) => 
    `<div class="step-indicator ${index === 0 ? 'active' : ''}" data-step="${index + 1}">${group.groupName}</div>`
  ).join('');

  let stepsHtml = fieldOrderGroups.map((group, index) => {
    let stepFieldsHtml = (group.fields || []).map(fieldId => {
      const field = allFields.find(f => f.id === fieldId);
      if (!field) return '';
      
      const key = field.id;
      const value = details[key] !== undefined ? details[key] : (field.default !== undefined ? field.default : '');
      const required = field.optional === false;
      let fieldHtml = '';
      
      if (field.type === 'checkbox') {
          fieldHtml = `<div class="form-group-checkbox ${required ? 'required' : ''}"><input type="checkbox" id="field-${key}" name="${key}" ${value ? 'checked' : ''}><label class="form-label" for="field-${key}">${field.label}</label></div>`;
      } else if (field.type === 'image') {
          fieldHtml = `<div class="form-group ${required ? 'required' : ''}"><label class="form-label">${field.label}</label><div class="image-upload-container"><img id="preview-${key}" src="${value || 'assets/placeholder-image.png'}" alt="Vista previa" class="image-preview"><input type="hidden" id="field-${key}" name="${key}" value="${value || ''}"><button type="button" class="button button-secondary upload-image-btn" data-target-key="${key}"><i data-feather="upload"></i><span>Subir Imagen</span></button></div></div>`;
      } else if (field.type === 'repeater') {
          fieldHtml = `<div class="form-group repeater-group ${required ? 'required' : ''}" id="repeater-${key}" data-field-id="${key}"><label class="form-label">${field.label}</label><div class="repeater-items-container"></div><button type="button" class="button button-secondary add-repeater-item-btn" data-repeater-id="${key}" data-item-label="${field.itemLabel || 'Elemento'}"><i data-feather="plus"></i><span>Añadir ${field.itemLabel || 'Elemento'}</span></button></div>`;
      } else {
          fieldHtml = `<div class="form-group ${required ? 'required' : ''}"><label class="form-label" for="field-${key}">${field.label}</label>`;
          switch (field.type) {
              case 'textarea': fieldHtml += `<textarea id="field-${key}" name="${key}" rows="4" ${required ? 'required' : ''}>${value || ''}</textarea>`; break;
              case 'select':
                  fieldHtml += `<select id="field-${key}" name="${key}" class="selector" ${required ? 'required' : ''}><option value="">-- Selecciona --</option>`;
                  (field.options || []).forEach(opt => { fieldHtml += `<option value="${opt}" ${opt === value ? 'selected' : ''}>${opt}</option>`; });
                  fieldHtml += `</select>`; break;
              case 'multiselect':
                  const agents = availableAgents.get();
                  const agentOptions = agents.map(agent => `<option value="${agent.id}">${agent.name}</option>`).join('');
                  fieldHtml += `<select id="field-${key}" name="${key}" class="selector" multiple ${required ? 'required' : ''}>${agentOptions}</select><small>Mantén pulsada la tecla Ctrl (o Cmd en Mac) para seleccionar varios agentes.</small>`; break;
              default: fieldHtml += `<input type="${field.type || 'text'}" id="field-${key}" name="${key}" value="${value || ''}" ${required ? 'required' : ''}>`; break;
          }
          fieldHtml += `</div>`;
      }
      return fieldHtml;
    }).join('');
    return `<div class="form-step" id="step-${index + 1}" data-step="${index + 1}" style="display: ${index === 0 ? 'block' : 'none'};">${stepFieldsHtml}</div>`;
  }).join('');
  
  let navHtml = `<div id="wizard-navigation"><button type="button" id="prev-step-btn" class="button button-secondary" style="display: none;">Anterior</button><div><button type="button" id="next-step-btn" class="button button-primary">Siguiente</button><button type="submit" id="save-registro-btn" class="button button-primary" style="display: none;">Guardar Registro</button></div></div>`;
  container.innerHTML = `<div id="wizard-progress">${progressHtml}</div><div id="wizard-steps">${stepsHtml}</div>${navHtml}`;

  const repeaterField = allFields.find(f => f.type === 'repeater');
  if (repeaterField && dataForEdit && details[repeaterField.id]) {
    details[repeaterField.id].forEach(itemData => {
      addRepeaterItem(repeaterField.id, itemData);
    });
  }

  modalClone.querySelector('#next-step-btn').addEventListener('click', handleNextStep);
  modalClone.querySelector('#prev-step-btn').addEventListener('click', handlePrevStep);

  updatePreview();
  if(window.feather) feather.replace();
}

function goToStep(stepNumber) {
  validateStep(currentStep);
  modalClone.querySelector(`.form-step[data-step="${currentStep}"]`).style.display = 'none';
  modalClone.querySelector(`.step-indicator[data-step="${currentStep}"]`).classList.remove('active');
  if (stepNumber > currentStep)
    modalClone.querySelector(`.step-indicator[data-step="${currentStep}"]`).classList.add('completed');
  currentStep = stepNumber;
  modalClone.querySelector(`.form-step[data-step="${currentStep}"]`).style.display = 'block';
  const currentIndicator = modalClone.querySelector(`.step-indicator[data-step="${currentStep}"]`);
  currentIndicator.classList.add('active');
  currentIndicator.classList.remove('completed');
  modalClone.querySelector('#prev-step-btn').style.display = currentStep > 1 ? 'inline-block' : 'none';
  modalClone.querySelector('#next-step-btn').style.display = currentStep < totalSteps ? 'inline-block' : 'none';
  modalClone.querySelector('#save-registro-btn').style.display = currentStep === totalSteps ? 'inline-block' : 'none';
}

function handleNextStep() {
  if (!validateStep(currentStep)) {
    displayMessage('Por favor, completa todos los campos obligatorios (*).', 'error');
    return;
  }
  if (currentStep < totalSteps) goToStep(currentStep + 1);
}

function handlePrevStep() {
  if (currentStep > 1) goToStep(currentStep - 1);
}

function validateStep(stepNumber) {
  const stepContainer = modalClone.querySelector(`#step-${stepNumber}`);
  if (!stepContainer) return true;
  const requiredFields = stepContainer.querySelectorAll('[required]');
  let isStepValid = true;
  requiredFields.forEach(field => {
    const parentGroup = field.closest('.form-group, .form-group-checkbox');
    if (!field.value.trim()) {
      isStepValid = false;
      field.classList.add('is-invalid');
      if (parentGroup) parentGroup.classList.add('is-invalid');
    } else {
      field.classList.remove('is-invalid');
      if (parentGroup) parentGroup.classList.remove('is-invalid');
    }
  });
  return isStepValid;
}

function addRepeaterItem(repeaterId, data = {}) {
  const repeaterGroup = allFields.find(f => f.id === repeaterId);
  if (!repeaterGroup) return;

  const container = modalClone.querySelector(`#repeater-${repeaterId} .repeater-items-container`);
  const itemIndex = container.children.length;
  const itemDiv = document.createElement('div');
  itemDiv.className = 'repeater-item';
  itemDiv.dataset.index = itemIndex;
  itemDiv.dataset.fieldId = repeaterId; // Importante para la recolección de datos

  let itemHtml = `<div class="repeater-item-header"><h4>${repeaterGroup.itemLabel || 'Elemento'} #${itemIndex + 1}</h4><button type="button" class="icon-button delete-repeater-item-btn"><i data-feather="trash-2"></i></button></div>`;

  (repeaterGroup.itemFields || []).forEach(field => {
    const key = field.id;
    const value = data[key] !== undefined ? data[key] : (field.default !== undefined ? field.default : '');
    const required = field.optional === false;
    const inputName = `${repeaterId}_${key}`; // Nombre único para el input
    
    itemHtml += `<div class="form-group ${required ? 'required' : ''}">`;
    itemHtml += `<label class="form-label">${field.label}</label>`;

    switch (field.type) {
      case 'select':
        itemHtml += `<select name="${inputName}" class="selector" ${required ? 'required' : ''}>`;
        itemHtml += '<option value="">-- Selecciona --</option>';
        (field.options || []).forEach(opt => {
          itemHtml += `<option value="${opt}" ${opt === value ? 'selected' : ''}>${opt}</option>`;
        });
        itemHtml += `</select>`;
        break;
      case 'image':
        const uniqueIdPrefix = `${repeaterId}-${itemIndex}-${key}`;
        itemHtml += `<div class="image-upload-container"><img id="preview-${uniqueIdPrefix}" src="${value || 'assets/placeholder-image.png'}" class="image-preview"><input type="hidden" name="${inputName}" id="field-${uniqueIdPrefix}" value="${value || ''}"><button type="button" class="button button-secondary upload-image-btn" data-target-prefix="${uniqueIdPrefix}"><i data-feather="upload"></i><span>Subir Imagen</span></button></div>`;
        break;
      default:
        itemHtml += `<input type="${field.type || 'text'}" name="${inputName}" value="${value || ''}" ${required ? 'required' : ''}>`;
        break;
    }
    itemHtml += `</div>`;
  });

  itemDiv.innerHTML = itemHtml;
  container.appendChild(itemDiv);
  if (window.feather) feather.replace();
}

// --- ✅ NUEVA FUNCIÓN DE RECOLECCIÓN DE DATOS ---
function collectWizardData() {
    const data = {};
    const form = modalClone.querySelector('form');

    allFields.forEach(field => {
        const fieldId = field.id;
        const fieldSchema = currentTemplate.schema[fieldId];
        if (!fieldSchema) return;

        // Lógica para campos repetidores (repeater)
        if (fieldSchema.type === 'repeater') {
            data[fieldId] = [];
            const repeaterItems = form.querySelectorAll(`.repeater-item[data-field-id="${fieldId}"]`);
            repeaterItems.forEach(item => {
                const itemData = {};
                fieldSchema.itemFields.forEach(subField => {
                    const input = item.querySelector(`[name="${fieldId}_${subField.id}"]`);
                    if (input) {
                        itemData[subField.id] = input.value;
                    }
                });
                data[fieldId].push(itemData);
            });
            return; // Pasamos al siguiente campo
        }

        // Lógica para campos normales (text, select, checkbox, etc.)
        const input = form.querySelector(`[name="${fieldId}"]`);
        if (input) {
            switch (input.type) {
                case 'checkbox':
                    data[fieldId] = input.checked;
                    break;
                case 'select-multiple':
                    data[fieldId] = Array.from(input.selectedOptions).map(option => option.value);
                    break;
                default:
                    data[fieldId] = input.value;
                    break;
            }
        }
    });

    return data;
}

function updatePreview() {
    const previewContainer = modalClone.querySelector('#registro-preview-container iframe');
    if (!previewContainer) return;

    const previewDocument = previewContainer.contentDocument || previewContainer.contentWindow.document;
    if (!currentTemplate || !currentTemplate.content) {
        previewDocument.open();
        previewDocument.write('<html><head></head><body></body></html>');
        previewDocument.close();
        return;
    }

    let fullHtml = unescapeHtml(currentTemplate.content);
    const details = collectWizardData(); // Usamos la nueva función para obtener datos para la preview
    
    try {
        const compiledTemplate = Handlebars.compile(fullHtml);
        const renderedHtml = compiledTemplate(details);

        const zoomStyle = `body { transform: scale(0.8); transform-origin: top left; width: 125%; }`;
        
        previewDocument.open();
        previewDocument.write(`<!DOCTYPE html><html><head><title>Vista Previa</title><style>${zoomStyle}</style></head><body>${renderedHtml}</body></html>`);
        previewDocument.close();

    } catch (error) {
        console.error("Error al compilar la plantilla con Handlebars:", error);
        previewDocument.open();
        previewDocument.write(`Error en la plantilla: ${error.message}`);
        previewDocument.close();
    }
}

async function handleImageUpload(uploadButton) {
  const targetPrefix = uploadButton.dataset.targetPrefix || `field-${uploadButton.dataset.targetKey}`;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;

    showLoading('Procesando imagen...');
    try {
      const resizedFile = await resizeImage(file, { width: 800, height: 600, quality: 0.8 });
      showLoading('Subiendo imagen...');
      const imageUrl = await uploadRecordImage(resizedFile);

      const previewEl = modalClone.querySelector(`#preview-${targetPrefix.replace('field-','')}`);
      const fieldEl = modalClone.querySelector(`#${targetPrefix}`);

      if (previewEl) previewEl.src = imageUrl;
      if (fieldEl) fieldEl.value = imageUrl;
      
      updatePreview();
    } catch (error) {
      displayMessage(`Error al subir la imagen: ${error.message}`, 'error');
    } finally {
      hideLoading();
    }
  };
  input.click();
}

async function handleFormSubmit(event) {
    event.preventDefault();

    if (totalSteps > 0 && !validateStep(currentStep)) {
        displayMessage('Por favor, completa todos los campos obligatorios (*).', 'error');
        return;
    }

    showLoading('Guardando registro...');
    try {
        const direction = modalClone.querySelector('#registro-direction')?.value || 'salida';
        const documentType = modalClone.querySelector('#registro-type-select')?.value;
        
        if (!documentType) {
            throw new Error('El Tipo de Documento es obligatorio.');
        }

        let dataToSave = {
            direction: direction,
        };

        if (currentTaskId) {
            dataToSave.taskId = currentTaskId;
        }

        // ✅ AÑADIR parentId si estamos vinculando una respuesta
        if (currentParentId) {
            dataToSave.parentId = currentParentId;
        }

        if (currentTemplate && allFields.length > 0) {
            // ✅ USAMOS LA NUEVA FUNCIÓN MEJORADA
            const dynamicDetails = collectWizardData();
            dataToSave.details = dynamicDetails;

            // AÑADE ESTA LÍNEA PARA DEPURAR
console.log("Datos que se van a enviar:", dataToSave); 

            dataToSave.templateUsed = currentTemplate.id;
            dataToSave.subject = currentTemplate.templateName;
        } else {
            throw new Error('No se ha seleccionado ninguna plantilla válida.');
        }

        if (editingRecordId) {
            await updateRegistro(editingRecordId, dataToSave);
            displayMessage('Registro actualizado con éxito.', 'success');
        } else {
            await createRegistro(documentType, dataToSave);
            displayMessage('Registro guardado con éxito.', 'success');
        }
        
        closeAndDestroyModal();
        if (onSaveSuccessCallback) onSaveSuccessCallback();

    } catch (error) {
        displayMessage(`Error al guardar: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

async function handleDelete() {
  if (!editingRecordId) return;
  const reason = prompt('Introduce el motivo de la eliminación (obligatorio):');
  if (reason === null || reason.trim() === '') {
    displayMessage('La eliminación fue cancelada.', 'info');
    return;
  }
  if (confirm('¿Estás seguro de que quieres eliminar este registro? Esta acción lo marcará como eliminado.')) {
    showLoading('Eliminando registro...');
    try {
      await markRegistroAsDeleted(editingRecordId, reason.trim());
      displayMessage('Registro eliminado con éxito.', 'success');
      closeAndDestroyModal();
      if (onSaveSuccessCallback) onSaveSuccessCallback();
    } catch (error) {
      displayMessage(`Error al eliminar: ${error.message}`, 'error');
    } finally {
      hideLoading();
    }
  }
}