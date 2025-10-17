// js/ui/plantillasView.js (Versión Final, Robusta y Corregida)

import { displayMessage, showLoading, hideLoading } from './viewManager.js';
import {
  getDocumentTemplates,
  getDocumentTemplateById,
  deleteDocumentTemplate,
  duplicateDocumentTemplate,
  createDocumentTemplate,
  updateDocumentTemplate
} from '../dataController.js';

// --- VARIABLES DEL MÓDULO ---
// Estas variables son accesibles por todas las funciones en este archivo.
let formContainer, templateForm, formTitle, templateNameInput, templateTypeSelect, templateSourceTextarea;
let filterTypeSelect;
let editingTemplateId = null;
let editingTemplateData = null; // Importante para el estado de edición
let importedTemplateJson = null;

// Variables de paginación
let currentPage = 1;
let pageStartCursors = [null];
let hasNextPage = false;

// --- FUNCIONES PRINCIPALES ---

export function renderPlantillasView() {
  // Obtenemos las referencias a los elementos del DOM CADA VEZ que se renderiza la vista
  // para evitar problemas con elementos "stale" o desaparecidos.
  formContainer = document.getElementById('inline-form-container');
  templateForm = document.getElementById('template-form');
  formTitle = document.getElementById('inline-form-title');
  templateNameInput = document.getElementById('template-name');
  templateTypeSelect = document.getElementById('template-type');
  templateSourceTextarea = document.getElementById('template-html-source');
  filterTypeSelect = document.getElementById('template-filter-type');
  
  // La configuración de eventos se llama siempre, con una guarda interna para evitar duplicados.
  setupEventListeners();

  // Reseteamos la paginación y cargamos los datos.
  currentPage = 1;
  pageStartCursors = [null];
  loadAndRenderTemplates();
  closeForm(); // Nos aseguramos de que el formulario esté cerrado al entrar a la vista.
}

export function resetPlantillasView() {
  // Esta función ahora simplemente limpia el estado si es necesario.
  currentPage = 1;
  pageStartCursors = [null];
  hasNextPage = false;
  editingTemplateId = null;
  editingTemplateData = null;
  importedTemplateJson = null;
}

// --- GESTIÓN DE EVENTOS ---
function setupEventListeners() {
  const viewContainer = document.getElementById('plantillas-master-detail-container');
  
  // GUARDIA DE SEGURIDAD: Prevenimos duplicar el listener en el mismo elemento si la vista se recarga.
  if (!viewContainer || viewContainer.dataset.listenerAttached === 'true') {
    return;
  }
  viewContainer.dataset.listenerAttached = 'true';

  const previewPanel = document.getElementById('plantillas-preview-panel');
  const iframe = document.getElementById('preview-iframe');
  const previewTitle = document.getElementById('preview-panel-title');
  
  // Listener para el filtro
  filterTypeSelect.addEventListener('change', () => {
    currentPage = 1;
    pageStartCursors = [null];
    loadAndRenderTemplates();
  });

  // Delegación de eventos para toda la vista
  viewContainer.addEventListener('click', async (event) => {
    const button = event.target.closest('button');
    if (!button) return;

    // Acciones generales del formulario y paneles
    if (button.id === 'toggle-template-form-btn') openFormForCreate();
    if (button.id === 'cancel-template-form-btn') closeForm();
    if (button.id === 'close-preview-btn') previewPanel.classList.add('hidden');
    if (button.id === 'import-json-btn') {
      handleImportJsonClick();
      return;
    }

    // Acciones de la tabla que dependen de un recordId
    const recordId = event.target.closest('tr')?.dataset.id;
    if (!recordId) return;
    
    // Acciones que requieren cargar datos (Editar, Previsualizar)
    if (button.classList.contains('preview-template-btn') || button.classList.contains('button-edit')) {
        showLoading('Cargando plantilla...');
        try {
            const templateData = await getDocumentTemplateById(recordId);
            if (!templateData) throw new Error('Plantilla no encontrada.');
            
            editingTemplateData = templateData; // Guardamos la data completa en el estado
            
            if (button.classList.contains('preview-template-btn')) {
                showPreview(templateData, iframe, previewTitle, previewPanel); 
            } else if (button.classList.contains('button-edit')) {
                openFormForEdit(templateData);
            }
        } catch (error) {
            displayMessage(error.message, 'error');
        } finally {
            hideLoading();
        }
    }

    // Otras acciones de la tabla
    if (button.classList.contains('button-duplicate')) await handleDuplicateTemplateClick(recordId);
    if (button.classList.contains('button-delete')) await handleDeleteTemplateClick(recordId);

    // Lógica de paginación
    const paginationControls = event.target.closest('#plantillas-pagination-controls');
    if (paginationControls) {
        if (event.target.closest('#plantillas-next-page') && hasNextPage) {
            currentPage++;
            loadAndRenderTemplates();
        } else if (event.target.closest('#plantillas-prev-page') && currentPage > 1) {
            currentPage--;
            pageStartCursors.pop(); 
            loadAndRenderTemplates();
        }
    }
  });

  templateForm.addEventListener('submit', handleFormSubmit);
} // Fin de setupEventListeners

// --- FUNCIÓN DE IMPORTAR JSON (CORREGIDA) ---
function handleImportJsonClick() {
    const jsonString = prompt("Pega el JSON completo de la plantilla aquí:\n(Incluyendo templateName, documentType, fieldOrder, schema y content)");
    if (!jsonString) return;

    try {
        const jsonContent = JSON.parse(jsonString);

        if (!jsonContent.templateName || !jsonContent.documentType || !jsonContent.schema || !jsonContent.content) {
            throw new Error('El JSON debe contener las claves esenciales: templateName, documentType, schema y content.');
        }

        // 1. Almacenamos el objeto completo para usarlo al guardar.
        importedTemplateJson = jsonContent;

        // 2. HACEMOS UNA APERTURA MANUAL DEL FORMULARIO para no llamar a openFormForCreate()
        // y evitar que se borre nuestro estado 'importedTemplateJson'.
        editingTemplateId = null;
        editingTemplateData = null;
        templateForm.reset();
        formTitle.textContent = 'Crear Plantilla desde JSON';
        
        // 3. Rellenamos la UI y mostramos el formulario.
        templateNameInput.value = jsonContent.templateName;
        templateTypeSelect.value = jsonContent.documentType;
        templateSourceTextarea.value = jsonContent.content;
        formContainer.classList.remove('hidden');
        templateNameInput.focus();
        
        displayMessage(`Plantilla '${jsonContent.templateName}' cargada desde JSON. Pulsa GUARDAR para finalizar.`, 'success', 8000);

    } catch (error) {
        displayMessage(`Error al importar JSON: ${error.message}`, 'error');
        importedTemplateJson = null; // Si hay error, limpiamos el estado.
    }
}

// --- LÓGICA DE CARGA Y RENDERIZADO ---
async function loadAndRenderTemplates() {
  showLoading('Cargando plantillas...');
  const container = document.getElementById('plantillas-list-container');
  try {
    const startAfterDoc = pageStartCursors[currentPage - 1];
    const documentType = filterTypeSelect.value === 'all' ? null : filterTypeSelect.value;
    
    const { templates, lastVisible } = await getDocumentTemplates({ startAfterDoc, limit: 15, documentType });

    if (!Array.isArray(templates)) {
        throw new Error('El servidor devolvió un formato de datos de plantillas inesperado.');
    }

    hasNextPage = !!lastVisible;
    if (hasNextPage && pageStartCursors.length === currentPage) {
      pageStartCursors.push(lastVisible);
    }
    
    renderTemplatesList(templates);
    updatePaginationControls();

  } catch (error) {
    displayMessage(`Error al cargar plantillas: ${error.message}`, 'error');
    renderTemplatesList([]);
  } finally {
    hideLoading();
  }
}

function updatePaginationControls() {
  const pageInfo = document.getElementById('plantillas-page-info');
  const prevButton = document.getElementById('plantillas-prev-page');
  const nextButton = document.getElementById('plantillas-next-page');

  if(pageInfo) pageInfo.textContent = `Página ${currentPage}`;
  if(prevButton) prevButton.disabled = currentPage === 1;
  if(nextButton) nextButton.disabled = !hasNextPage; 
}

function renderTemplatesList(templates) {
  const container = document.getElementById('plantillas-list-container');
  if (!container) return;
  
  if (templates.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No se encontraron plantillas con los filtros seleccionados.</p></div>`;
    return;
  }
  
  container.innerHTML = `
    <table class="data-table">
      <thead><tr><th>Nombre</th><th>Tipo</th><th>Acciones</th></tr></thead>
      <tbody>
        ${templates.map(template => `
          <tr data-id="${template.id}">
            <td>${template.templateName}</td>
            <td style="text-transform: capitalize;">${template.documentType}</td>
            <td class="actions-cell">
              <button class="icon-button preview-template-btn" title="Previsualizar"><i data-feather="eye"></i></button>
              <button class="icon-button button-edit" title="Editar"><i data-feather="edit-2"></i></button>
              <button class="icon-button button-duplicate" title="Duplicar"><i data-feather="copy"></i></button>
              <button class="icon-button button-delete" title="Eliminar"><i data-feather="trash-2"></i></button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
  if(window.feather) feather.replace();
}

// --- LÓGICA DE GESTIÓN DE FORMULARIO ---
function openFormForCreate() {
  editingTemplateId = null;
  editingTemplateData = null;
  importedTemplateJson = null;
  templateForm.reset();
  formTitle.textContent = 'Crear Nueva Plantilla';
  formContainer.classList.remove('hidden');
  templateNameInput.focus();
}

async function openFormForEdit(templateData) {
  editingTemplateId = templateData.id;
  editingTemplateData = templateData;
  // Al editar, también usamos importedTemplateJson para unificar la lógica de guardado.
  importedTemplateJson = templateData; 

  formTitle.textContent = 'Editar Plantilla';
  templateNameInput.value = templateData.templateName || '';
  templateTypeSelect.value = templateData.documentType || 'informe';
  templateSourceTextarea.value = templateData.content || '';
  
  formContainer.classList.remove('hidden');
  templateNameInput.focus();
}

function closeForm() {
  if (formContainer) {
    formContainer.classList.add('hidden');
  }
  if (templateForm) {
    templateForm.reset();
  }
  editingTemplateId = null;
  editingTemplateData = null;
  importedTemplateJson = null;
}

// --- UTILIDAD: Obtiene placeholders del HTML ---
function parsePlaceholdersFromContent(htmlContent) {
    const regex = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;
    const matches = new Set();
    let match;
    while ((match = regex.exec(htmlContent)) !== null) {
        const autoPlaceholders = ['FECHA_ACTUAL', 'NUM_REGISTRO', 'AGENTES_FIRMANTES', 'hora_actual'];
        if (!autoPlaceholders.includes(match[1])) {
            matches.add(match[1]);
        }
    }
    return Array.from(matches);
}

// --- MANEJADOR DE ENVÍO DE FORMULARIO ---
async function handleFormSubmit(event) {
    event.preventDefault();
    showLoading('Guardando plantilla...');

    const name = templateNameInput.value.trim();
    const type = templateTypeSelect.value;
    const content = templateSourceTextarea.value;

    if (!name || !content.trim()) {
        hideLoading();
        displayMessage('El nombre y el contenido de la plantilla son obligatorios.', 'error');
        return;
    }

    let templateData;

    // CASO 1 & 2: Usar la estructura COMPLEJA importada o de una edición existente.
    if (importedTemplateJson) {
        templateData = {
            ...importedTemplateJson,
            // Sobrescribimos con los datos actuales del formulario por si se modificaron.
            templateName: name, 
            documentType: type, 
            content: content, 
            placeholders: parsePlaceholdersFromContent(content),
        };
        
    } else {
        // CASO 3: Creación nueva sin importación (Generar esquema simple).
        const placeholders = parsePlaceholdersFromContent(content);
        const schema = {};
        const fieldOrderFields = [];
        placeholders.forEach((p) => {
            schema[p] = { type: 'text', label: p.charAt(0).toUpperCase() + p.slice(1), optional: false };
            fieldOrderFields.push(p);
        });
        templateData = {
            templateName: name,
            documentType: type,
            content: content,
            placeholders: placeholders,
            schema: schema,
            fieldOrder: [{ groupName: "Datos del Documento", fields: fieldOrderFields }]
        };
    }
    
    try {
        if (editingTemplateId) {
            await updateDocumentTemplate(editingTemplateId, templateData);
            displayMessage('Plantilla actualizada con éxito.', 'success');
        } else {
            await createDocumentTemplate(templateData);
            displayMessage('Plantilla creada con éxito.', 'success');
        }
        closeForm();
        await loadAndRenderTemplates(); // Solo recargamos la lista, no toda la vista
    } catch (error) {
        displayMessage(`Error al guardar la plantilla: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

// --- RESTO DE MANEJADORES ---
async function showPreview(templateData, iframe, previewTitle, previewPanel) {
    const previewDocument = iframe.contentDocument || iframe.contentWindow.document;
    let content = templateData.content || '';
    
    previewDocument.open();
    previewDocument.write(content);
    previewDocument.close();
    previewTitle.textContent = `Vista Previa: ${templateData.templateName}`;
    previewPanel.classList.remove('hidden');
}

async function handleDeleteTemplateClick(templateId) {
    if (confirm('¿Seguro que quieres eliminar esta plantilla?')) {
        showLoading('Eliminando...');
        try {
            await deleteDocumentTemplate(templateId);
            await loadAndRenderTemplates(); // Recargamos la lista
        } catch (error) {
            displayMessage(`Error: ${error.message}`, 'error');
        } finally {
            hideLoading();
        }
    }
}

async function handleDuplicateTemplateClick(templateId) {
    showLoading('Duplicando...');
    try {
        await duplicateDocumentTemplate(templateId);
        displayMessage('Plantilla duplicada con éxito. Actualiza el nombre.', 'success');
        await loadAndRenderTemplates(); // Recargamos la lista
    } catch (error) {
        displayMessage(`Error al duplicar: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}