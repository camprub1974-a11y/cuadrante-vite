// Archivo: js/ui/templateManagerView.js

import { getDocumentTemplates, deleteDocumentTemplate } from '../dataController.js'; // ✅ Importamos la nueva función
import { showLoading, hideLoading, displayMessage } from './viewManager.js';
import { openTemplateEditorModal, initializeTemplateEditorModal } from './templateEditorModal.js';
import { renderTemplateManagerView as refreshTemplates } from './templateManagerView.js';

let listContainer;
let isInitialized = false;
let currentTemplates = [];

export function initializeTemplateManagerView() {
    if (isInitialized) return;

    listContainer = document.getElementById('templates-list-container');
    const createTemplateBtn = document.getElementById('create-template-btn');

    if (!listContainer || !createTemplateBtn) return;
    
    initializeTemplateEditorModal();

    createTemplateBtn.addEventListener('click', () => {
        openTemplateEditorModal(refreshTemplates);
    });
    
    // ✅ Listener actualizado para manejar tanto la edición como la eliminación
    listContainer.addEventListener('click', async (event) => {
        const button = event.target.closest('button');
        if (!button) return;

        const row = button.closest('tr');
        const templateId = row.dataset.id;

        // Lógica para el botón de editar
        if (button.classList.contains('button-edit')) {
            const templateToEdit = currentTemplates.find(t => t.id === templateId);
            if (templateToEdit) {
                openTemplateEditorModal(refreshTemplates, templateToEdit);
            }
        }

        // ✅ Lógica para el nuevo botón de eliminar
        if (button.classList.contains('button-delete')) {
            if (confirm('¿Estás seguro de que quieres eliminar esta plantilla? Esta acción no se puede deshacer.')) {
                showLoading('Eliminando plantilla...');
                try {
                    await deleteDocumentTemplate(templateId);
                    displayMessage('Plantilla eliminada con éxito.', 'success');
                    await refreshTemplates(); // Refrescamos la vista para que desaparezca de la lista
                } catch (error) {
                    displayMessage(`Error al eliminar la plantilla: ${error.message}`, 'error');
                } finally {
                    hideLoading();
                }
            }
        }
    });
    
    isInitialized = true;
}

function renderTemplatesTable(templates) {
    if (templates.length === 0) {
        listContainer.innerHTML = '<p class="info-message">No se han encontrado plantillas.</p>';
        return;
    }

    let tableHtml = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Nombre de la Plantilla</th>
                    <th>Tipo de Documento</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;

    templates.forEach(template => {
        tableHtml += `
            <tr data-id="${template.id}">
                <td>${template.templateName}</td>
                <td>${template.documentType}</td>
                <td class="actions-cell">
                    <button class="button button-icon button-edit" title="Editar Plantilla">
                        <span class="material-icons">edit</span>
                    </button>
                    <!-- ✅ Botón de eliminar añadido -->
                    <button class="button button-icon button-danger button-delete" title="Eliminar Plantilla">
                        <span class="material-icons">delete</span>
                    </button>
                </td>
            </tr>
        `;
    });

    tableHtml += '</tbody></table>';
    listContainer.innerHTML = tableHtml;
}

export async function renderTemplateManagerView() {
    if (!isInitialized) initializeTemplateManagerView();
    
    showLoading();
    if (listContainer) {
        listContainer.innerHTML = '<p class="info-message">Cargando plantillas...</p>';
    }
    
    try {
        const templates = await getDocumentTemplates();
        currentTemplates = templates;
        renderTemplatesTable(templates);
    } catch (error) {
        displayMessage(`Error al cargar las plantillas: ${error.message}`, 'error');
        if (listContainer) {
            listContainer.innerHTML = `<p class="error-message">No se pudieron cargar las plantillas.</p>`;
        }
    } finally {
        hideLoading();
    }
}
