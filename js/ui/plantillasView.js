// js/ui/plantillasView.js (VERSIÓN CON FILTRO DE TIPO)

import { displayMessage, showLoading, hideLoading } from './viewManager.js';
import { getDocumentTemplates, getDocumentTemplateById, deleteDocumentTemplate, duplicateDocumentTemplate, createDocumentTemplate, updateDocumentTemplate } from '../dataController.js';
import { formatDate } from '../utils.js';
import { currentUser } from '../state.js';

let isInitialized = false;
let formContainer, templateForm, formTitle, templateNameInput, templateTypeSelect, templateSourceTextarea;
let filterTypeSelect; // Variable para el nuevo filtro
let editingTemplateId = null;

let currentPage = 1;
let pageStartCursors = [null];
let hasNextPage = false;

export function renderPlantillasView() {
  if (!isInitialized) {
    // Referencias a elementos
    formContainer = document.getElementById('inline-form-container');
    templateForm = document.getElementById('template-form');
    formTitle = document.getElementById('inline-form-title');
    templateNameInput = document.getElementById('template-name');
    templateTypeSelect = document.getElementById('template-type');
    templateSourceTextarea = document.getElementById('template-html-source');
    filterTypeSelect = document.getElementById('template-filter-type'); // Nuevo filtro
    
    setupEventListeners();
    isInitialized = true;
  }
  currentPage = 1;
  pageStartCursors = [null];
  loadAndRenderTemplates();
}

export function resetPlantillasView() {
  isInitialized = false;
}

function setupEventListeners() {
    const viewContainer = document.getElementById('plantillas-master-detail-container');
    const previewPanel = document.getElementById('plantillas-preview-panel');
    const iframe = document.getElementById('preview-iframe');
    const previewTitle = document.getElementById('preview-panel-title');
    
    // Listener para el filtro
    filterTypeSelect.addEventListener('change', () => {
        currentPage = 1;
        pageStartCursors = [null];
        loadAndRenderTemplates();
    });

    viewContainer.addEventListener('click', async (event) => {
        const button = event.target.closest('button');
        if (!button) return;

        if (button.id === 'toggle-template-form-btn') openFormForCreate();
        if (button.id === 'cancel-template-form-btn') closeForm();
        if (button.id === 'close-preview-btn') previewPanel.classList.add('hidden');

        const previewButton = event.target.closest('.preview-template-btn');
        if (previewButton) await showPreview(event.target.closest('tr').dataset.id, iframe, previewTitle, previewPanel);

        const editButton = event.target.closest('.button-edit');
        if(editButton) await openFormForEdit(event.target.closest('tr').dataset.id);

        const duplicateButton = event.target.closest('.button-duplicate');
        if(duplicateButton) await handleDuplicateTemplateClick(event.target.closest('tr').dataset.id);

        const deleteButton = event.target.closest('.button-delete');
        if(deleteButton) await handleDeleteTemplateClick(event.target.closest('tr').dataset.id);

        const paginationControls = event.target.closest('#plantillas-pagination-controls');
        if (paginationControls) {
            if (event.target.closest('#plantillas-next-page') && hasNextPage) {
                currentPage++;
                loadAndRenderTemplates();
            } else if (event.target.closest('#plantillas-prev-page') && currentPage > 1) {
                currentPage--;
                loadAndRenderTemplates();
            }
        }
    });

    templateForm.addEventListener('submit', handleFormSubmit);
}

async function loadAndRenderTemplates() {
  showLoading('Cargando plantillas...');
  const container = document.getElementById('plantillas-list-container');
  try {
    const startAfterDoc = pageStartCursors[currentPage - 1];
    const documentType = filterTypeSelect.value; // Leemos el valor del filtro
    
    const { templates, lastVisible } = await getDocumentTemplates({ startAfterDoc, limit: 15, documentType });

    hasNextPage = !!lastVisible;
    if (hasNextPage && pageStartCursors.length === currentPage) {
      pageStartCursors.push(lastVisible);
    }
    
    renderTemplatesList(templates);
    updatePaginationControls(templates.length);

  } catch (error) {
    displayMessage(`Error al cargar plantillas: ${error.message}`, 'error');
  } finally {
    hideLoading();
  }
}

function updatePaginationControls(recordCount) {
  const pageInfo = document.getElementById('plantillas-page-info');
  const prevButton = document.getElementById('plantillas-prev-page');
  const nextButton = document.getElementById('plantillas-next-page');

  if(pageInfo) pageInfo.textContent = `Página ${currentPage}`;
  if(prevButton) prevButton.disabled = currentPage === 1;
  if(nextButton) nextButton.disabled = !hasNextPage || recordCount < 15;
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

// --- Resto de funciones (openForm, closeForm, handleFormSubmit, etc.) sin cambios ---
// ... (pega aquí el resto de tus funciones auxiliares)

function openFormForCreate() {
    editingTemplateId = null;
    templateForm.reset();
    formTitle.textContent = 'Crear Nueva Plantilla';
    formContainer.classList.remove('hidden');
    templateNameInput.focus();
}

async function openFormForEdit(templateId) {
    showLoading('Cargando plantilla...');
    try {
        const templateData = await getDocumentTemplateById(templateId);
        if (!templateData) throw new Error('Plantilla no encontrada.');
        editingTemplateId = templateData.id;
        formTitle.textContent = 'Editar Plantilla';
        templateNameInput.value = templateData.templateName || '';
        templateTypeSelect.value = templateData.documentType || 'informe';
        templateSourceTextarea.value = templateData.content || '';
        formContainer.classList.remove('hidden');
        templateNameInput.focus();
    } catch (error) {
        displayMessage(error.message, 'error');
    } finally {
        hideLoading();
    }
}

function closeForm() {
    formContainer.classList.add('hidden');
    templateForm.reset();
    editingTemplateId = null;
}

async function handleFormSubmit(event) {
    event.preventDefault();
    showLoading('Guardando plantilla...');
    const templateData = {
        templateName: templateNameInput.value.trim(),
        documentType: templateTypeSelect.value,
        content: templateSourceTextarea.value
    };
    try {
        if (editingTemplateId) {
            await updateDocumentTemplate(editingTemplateId, templateData);
            displayMessage('Plantilla actualizada.', 'success');
        } else {
            await createDocumentTemplate(templateData);
            displayMessage('Plantilla creada.', 'success');
        }
        closeForm();
        await renderPlantillasView();
    } catch (error) {
        displayMessage(`Error al guardar: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

async function showPreview(recordId, iframe, previewTitle, previewPanel) {
    showLoading('Cargando previsualización...');
    try {
        const templateData = await getDocumentTemplateById(recordId);
        const previewDocument = iframe.contentDocument || iframe.contentWindow.document;
        previewDocument.open();
        previewDocument.write(templateData.content || '');
        previewDocument.close();
        previewTitle.textContent = `Vista Previa: ${templateData.templateName}`;
        previewPanel.classList.remove('hidden');
    } catch (error) {
        displayMessage(error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function handleDeleteTemplateClick(templateId) {
    if (confirm('¿Seguro que quieres eliminar esta plantilla?')) {
        showLoading('Eliminando...');
        try {
            await deleteDocumentTemplate(templateId);
            await renderPlantillasView();
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
        await renderPlantillasView();
    } catch (error) {
        displayMessage(`Error al duplicar: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}