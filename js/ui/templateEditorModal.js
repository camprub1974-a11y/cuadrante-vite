// js/ui/templateEditorModal.js

import { displayMessage, showLoading, hideLoading } from './viewManager.js';
// Aún no existen, pero las crearemos en el siguiente paso.
import { createDocumentTemplate, updateDocumentTemplate } from '../dataController.js'; 

// --- Variables del Módulo ---
let modal, form, modalTitle, templateNameInput, templateTypeSelect, templateIdInput;
let quill; // Variable para mantener la instancia del editor
let isInitialized = false;
let onSaveCallback = null; // Función para refrescar la tabla de plantillas
let editingTemplateId = null;

/**
 * Inicializa el modal y el editor de texto Quill.js una sola vez.
 */
export function initializeTemplateEditorModal() {
    if (isInitialized) return;

    modal = document.getElementById('template-editor-modal');
    if (!modal) return;

    // Referencias a los elementos del formulario
    form = modal.querySelector('#template-form');
    modalTitle = modal.querySelector('#template-modal-title');
    templateNameInput = modal.querySelector('#template-name');
    templateTypeSelect = modal.querySelector('#template-type');
    const closeButton = modal.querySelector('.close-button');

    // Configuración de la barra de herramientas de Quill
    const toolbarOptions = [
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'header': [1, 2, 3, 4, false] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'align': [] }],
        ['clean']
    ];

    // Inicialización de Quill en el div #quill-editor
    quill = new Quill('#quill-editor', {
        modules: {
            toolbar: toolbarOptions
        },
        theme: 'snow'
    });

    // Asignación de eventos
    form.addEventListener('submit', handleFormSubmit);
    closeButton.addEventListener('click', hideTemplateEditorModal);

    isInitialized = true;
}

/**
 * Abre el modal, ya sea para crear una nueva plantilla o para editar una existente.
 * @param {function} callback - La función a llamar después de guardar (para refrescar la lista).
 * @param {object|null} templateData - Los datos de la plantilla si se está editando.
 */
export function openTemplateEditorModal(callback, templateData = null) {
    if (!isInitialized) initializeTemplateEditorModal();
    
    onSaveCallback = callback;
    form.reset();
    quill.setText(''); // Limpia el contenido del editor

    if (templateData) {
        // --- MODO EDICIÓN ---
        editingTemplateId = templateData.id;
        modalTitle.textContent = 'Editar Plantilla';
        templateNameInput.value = templateData.templateName;
        templateTypeSelect.value = templateData.documentType;
        quill.root.innerHTML = templateData.content; // Carga el HTML en el editor
    } else {
        // --- MODO CREACIÓN ---
        editingTemplateId = null;
        modalTitle.textContent = 'Nueva Plantilla';
    }
    
    modal.classList.remove('hidden');
}

/**
 * Cierra el modal.
 */
function hideTemplateEditorModal() {
    modal.classList.add('hidden');
}

/**
 * Extrae los placeholders (ej. {{campo}}) del contenido HTML.
 * @param {string} htmlContent - El contenido del editor.
 * @returns {Array<string>} - Una lista de los placeholders encontrados.
 */
function parsePlaceholdersFromContent(htmlContent) {
    const regex = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;
    const matches = new Set(); // Usamos un Set para evitar duplicados
    let match;
    while ((match = regex.exec(htmlContent)) !== null) {
        // Excluimos los placeholders automáticos que añadiremos en el backend
        const autoPlaceholders = ['FECHA_ACTUAL', 'NUM_REGISTRO', 'AGENTES_FIRMANTES'];
        if (!autoPlaceholders.includes(match[1])) {
            matches.add(match[1]);
        }
    }
    return Array.from(matches);
}

/**
 * Gestiona el envío del formulario.
 */
async function handleFormSubmit(event) {
    event.preventDefault();
    showLoading();

    const name = templateNameInput.value.trim();
    const type = templateTypeSelect.value;
    const content = quill.root.innerHTML; // Obtenemos el contenido como HTML

    if (!name || !content || content === '<p><br></p>') {
        hideLoading();
        displayMessage("El nombre y el contenido de la plantilla son obligatorios.", "error");
        return;
    }
    
    // Generamos los placeholders y el schema automáticamente desde el contenido
    const placeholders = parsePlaceholdersFromContent(content);
    const schema = {};
    placeholders.forEach(p => {
        schema[p] = { type: 'text', label: p.charAt(0).toUpperCase() + p.slice(1), required: true };
    });

    const templateData = {
        templateName: name,
        documentType: type,
        content: content,
        placeholders: placeholders,
        schema: schema
    };

    try {
        if (editingTemplateId) {
            // Llama a la función para actualizar (la crearemos después)
            await updateDocumentTemplate(editingTemplateId, templateData);
            displayMessage("Plantilla actualizada con éxito.", "success");
        } else {
            // Llama a la función para crear (la crearemos después)
            await createDocumentTemplate(templateData);
            displayMessage("Plantilla creada con éxito.", "success");
        }
        hideTemplateEditorModal();
        if (onSaveCallback) onSaveCallback(); // Refresca la tabla
    } catch (error) {
        displayMessage(`Error al guardar la plantilla: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}