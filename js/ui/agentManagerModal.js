// cuadrante-vite/js/ui/agentManagerModal.js

import { showLoading, hideLoading, displayMessage } from './viewManager.js';
import { availableAgents, currentUser, setAvailableAgents } from '../state.js'; // Añadido setAvailableAgents
import { addAgent, updateAgent, deleteAgent, loadInitialAgents } from '../dataController.js';
// Importamos directamente FieldPath de firestore, no del objeto global firebase
import { FieldPath } from 'firebase/firestore'; // <--- CORREGIDO

// Variables globales para elementos DOM, inicializadas a null
let agentManagerModal = null;
let agentListContainer = null;
let agentForm = null;
let agentIdInput = null;
let agentNameInput = null;
let agentActiveCheckbox = null;
let saveAgentButton = null;
let cancelAgentEditButton = null;
let addAgentButton = null;
let formTitleSpan = null;

let isEditMode = false;

// Esta función solo inicializa el modal principal y su botón de cierre
export function initializeAgentManagerModal() {
    console.log("[DEBUG - AgentManagerModal] initializeAgentManagerModal llamado.");
    agentManagerModal = document.getElementById('agent-manager-modal');
    if (!agentManagerModal) {
        console.error("ERROR - AgentManagerModal: Modal #agent-manager-modal no encontrado. ABORTANDO INICIALIZACIÓN.");
        return;
    }
    const closeButton = agentManagerModal.querySelector('.close-button'); 
    if (closeButton) {
        closeButton.addEventListener('click', hideAgentManagerModal);
    } else {
        console.warn("WARN - AgentManagerModal: Botón de cierre (.close-button) no encontrado en el modal principal.");
    }
    agentManagerModal.addEventListener('click', (event) => {
        if (event.target === agentManagerModal) hideAgentManagerModal();
    });

    console.log("[DEBUG - AgentManagerModal] Modal principal de gestión de agentes inicializado.");
}

// Inicialización de elementos internos y listeners (se llama la primera vez que se abre el modal)
async function _initializeInternalDOMElements() {
    // Si agentListContainer ya tiene un valor, significa que ya se inicializaron
    if (agentListContainer) {
        console.log("[DEBUG - AgentManagerModal] Elementos internos ya inicializados.");
        return true;
    }

    console.log("[DEBUG - AgentManagerModal] Inicializando elementos internos del modal por primera vez...");
    agentListContainer = agentManagerModal.querySelector('#agent-list-container');
    agentForm = agentManagerModal.querySelector('#agent-form');
    agentIdInput = agentManagerModal.querySelector('#agent-id-input');
    agentNameInput = agentManagerModal.querySelector('#agent-name-input');
    agentActiveCheckbox = agentManagerModal.querySelector('#agent-active-checkbox');
    saveAgentButton = agentManagerModal.querySelector('#save-agent-button');
    cancelAgentEditButton = agentManagerModal.querySelector('#cancel-agent-edit-button');
    addAgentButton = agentManagerModal.querySelector('#add-agent-button');
    formTitleSpan = agentManagerModal.querySelector('#form-title');

    // === NUEVOS LOGS DE DEPURACIÓN ESPECÍFICOS ===
    console.log("Elementos AgentManagerModal - Estado de obtención (después de querySelector):");
    console.log("  agentListContainer:", !!agentListContainer, agentListContainer);
    console.log("  agentForm:", !!agentForm, agentForm);
    console.log("  agentIdInput:", !!agentIdInput, agentIdInput);
    console.log("  agentNameInput:", !!agentNameInput, agentNameInput);
    console.log("  agentActiveCheckbox:", !!agentActiveCheckbox, agentActiveCheckbox);
    console.log("  saveAgentButton:", !!saveAgentButton, saveAgentButton);
    console.log("  cancelAgentEditButton:", !!cancelAgentEditButton, cancelAgentEditButton);
    console.log("  addAgentButton:", !!addAgentButton, addAgentButton);
    console.log("  formTitleSpan:", !!formTitleSpan, formTitleSpan);
    // === FIN NUEVOS LOGS ===

    if (!agentListContainer || !agentForm || !agentIdInput || !agentNameInput || 
        !agentActiveCheckbox || !saveAgentButton || !cancelAgentEditButton || !addAgentButton || !formTitleSpan) {
        console.error("ERROR - AgentManagerModal: Fallo al encontrar elementos DOM internos cruciales. Verifique IDs en index.html.");
        const missing = [];
        if (!agentListContainer) missing.push('agentListContainer');
        if (!agentForm) missing.push('agentForm');
        if (!agentIdInput) missing.push('agentIdInput');
        if (!agentNameInput) missing.push('agentNameInput');
        if (!agentActiveCheckbox) missing.push('agentActiveCheckbox');
        if (!saveAgentButton) missing.push('saveAgentButton');
        if (!cancelAgentEditButton) missing.push('cancelAgentEditButton');
        if (!addAgentButton) missing.push('addAgentButton');
        if (!formTitleSpan) missing.push('formTitleSpan');
        console.error("Elementos faltantes:", missing.join(', '));
        displayMessage("Error: No se pudo cargar el formulario de agentes. Recargue.", "error");
        return false;
    }

    // Adjuntar listeners (solo una vez)
    if (addAgentButton) {
        addAgentButton.addEventListener('click', () => {
            console.log("[DEBUG - AgentManagerModal] Clic en Añadir Nuevo Agente.");
            isEditMode = false;
            agentForm.reset();
            agentIdInput.value = '';
            agentIdInput.readOnly = false;
            agentActiveCheckbox.checked = true;
            agentForm.classList.remove('hidden');
            saveAgentButton.textContent = 'Añadir Agente';
            if (formTitleSpan) formTitleSpan.textContent = 'Añadir Nuevo Agente';
            console.log("[DEBUG - AgentManagerModal] Formulario de añadir agente mostrado.");
        });
    }

    if (cancelAgentEditButton) {
        cancelAgentEditButton.addEventListener('click', (event) => {
            event.preventDefault();
            console.log("[DEBUG - AgentManagerModal] Clic en Cancelar.");
            agentForm.classList.add('hidden');
        });
    }
    
    if (agentForm) {
        agentForm.addEventListener('submit', handleSaveAgent);
    }
    
    // Suscribirse a los cambios en availableAgents para refrescar la lista
    availableAgents.subscribe(() => {
        if (agentManagerModal && !agentManagerModal.classList.contains('hidden')) {
            console.log("[DEBUG - AgentManagerModal] availableAgents atom cambió y modal está visible. Refrescando lista.");
            displayAgentList(); 
        }
    });
    console.log("[DEBUG - AgentManagerModal] Elementos internos y listeners inicializados completamente.");
    return true;
}

export function showAgentManagerModal() {
    console.log("[DEBUG - AgentManagerModal] showAgentManagerModal llamado.");
    if (!agentManagerModal) {
        console.error("[ERROR - AgentManagerModal] Modal de gestión de agentes no inicializado. No se puede mostrar.");
        return;
    }
    const initialized = _initializeInternalDOMElements();
    if (!initialized) {
        console.error("[ERROR - AgentManagerModal] Falló la inicialización de elementos internos. No se muestra el modal.");
        return;
    }

    agentManagerModal.classList.remove('hidden');
    agentManagerModal.style.display = 'flex';
    agentForm.classList.add('hidden');
    displayAgentList(); // Mostrar la lista de agentes al abrir el modal
    console.log("[DEBUG - AgentManagerModal] Modal de gestión de agentes visible. (display: flex)");
}

export function hideAgentManagerModal() {
    console.log("[DEBUG - AgentManagerModal] hideAgentManagerModal llamado.");
    if (!agentManagerModal) return;
    agentManagerModal.classList.add('hidden');
    agentManagerModal.style.display = 'none';
    console.log("[DEBUG - AgentManagerModal] Modal de gestión de agentes oculto. (display: none)");
}

export async function displayAgentList() {
    console.log("[DEBUG - AgentManagerModal] displayAgentList llamado.");
    const agents = availableAgents.get(); // Obtener agentes del átomo
    if (!agentListContainer) {
        console.error("[ERROR - AgentManagerModal] agentListContainer no encontrado. No se puede renderizar la lista de agentes.");
        return;
    }

    let html = '<ul class="agent-list">';
    if (agents && agents.length > 0) {
        agents.forEach(agent => {
            html += `
                <li class="agent-list-item">
                    <span>${agent.name} (${agent.id}) - ${agent.active ? 'Activo' : 'Inactivo'}</span>
                    <div class="agent-actions">
                        <button class="button button-secondary edit-agent-btn" data-agent-id="${agent.id}">Editar</button>
                        <button class="button button-danger delete-agent-btn" data-agent-id="${agent.id}">Eliminar</button>
                    </div>
                </li>
            `;
        });
    } else {
        html += '<p>No hay agentes disponibles.</p>';
    }
    html += '</ul>';
    agentListContainer.innerHTML = html;

    agentListContainer.querySelectorAll('.edit-agent-btn').forEach(button => {
        button.addEventListener('click', (e) => handleEditAgent(e.target.dataset.agentId));
    });
    agentListContainer.querySelectorAll('.delete-agent-btn').forEach(button => {
        button.addEventListener('click', (e) => handleDeleteAgent(e.target.dataset.agentId));
    });
    console.log("[DEBUG - AgentManagerModal] Lista de agentes renderizada en modal.");
}

async function handleEditAgent(agentId) {
    console.log(`[DEBUG - AgentManagerModal] handleEditAgent llamado para ID: ${agentId}`);
    const agents = availableAgents.get(); // Obtener agentes del átomo
    const agent = agents.find(a => String(a.id) === String(agentId));
    
    if (agent) {
        isEditMode = true;
        agentIdInput.value = agent.id;
        agentNameInput.value = agent.name;
        agentActiveCheckbox.checked = agent.active;
        agentIdInput.readOnly = true; // No permitir cambiar el ID al editar
        
        agentForm.classList.remove('hidden');
        saveAgentButton.textContent = 'Guardar Cambios';
        if (formTitleSpan) formTitleSpan.textContent = 'Editar Agente';
        console.log("[DEBUG - AgentManagerModal] Formulario de edición de agente mostrado.");
    } else {
        displayMessage('Agente no encontrado para editar.', 'error');
        console.error(`[ERROR - AgentManagerModal] Agente ${agentId} no encontrado para editar.`);
    }
}

async function handleDeleteAgent(agentId) {
    console.log(`[DEBUG - AgentManagerModal] handleDeleteAgent llamado para ID: ${agentId}`);
    if (!confirm(`¿Estás seguro de que quieres eliminar al agente ${agentId}? Esta acción es irreversible.`)) return;

    showLoading();
    try {
        await deleteAgent(String(agentId)); // Usa la función del dataController
        await loadInitialAgents(); // Recarga los agentes en el estado de Nanostores
        displayMessage('Agente eliminado con éxito.', 'success');
        console.log(`[DEBUG - AgentManagerModal] Agente ${agentId} eliminado.`);
    } catch (error) {
        displayMessage('Error al eliminar agente.', 'error');
        console.error(`[ERROR - AgentManagerModal] Error al eliminar agente ${agentId}:`, error);
    } finally {
        hideLoading();
    }
}

async function handleSaveAgent(event) {
    event.preventDefault();
    console.log("[DEBUG - AgentManagerModal] handleSaveAgent llamado.");
    const name = agentNameInput.value.trim();
    const active = agentActiveCheckbox.checked;
    const agentId = agentIdInput.value.trim(); 

    if (!name) {
        displayMessage('El nombre del agente no puede estar vacío.', 'warning');
        return;
    }
    // Si no es modo edición, el ID puede estar vacío para que la CF lo autogenere
    if (!isEditMode && agentId && isNaN(parseInt(agentId))) {
        displayMessage('El ID del agente debe ser un número o dejar vacío para autogenerar.', 'warning');
        return;
    }

    showLoading();
    try {
        if (isEditMode) {
            await updateAgent(String(agentId), { name, active });
            displayMessage('Agente actualizado con éxito.', 'success');
            console.log(`[DEBUG - AgentManagerModal] Agente ${agentId} actualizado.`);
        } else {
            // Comprobar si el ID ya existe antes de añadir
            const existingAgents = availableAgents.get();
            if (agentId && existingAgents.some(a => String(a.id) === String(agentId))) {
                 displayMessage(`El agente con ID ${agentId} ya existe.`, "error");
                 hideLoading();
                 return;
            }
            await addAgent({ id: agentId || null, name, active }); // Pasa null si el ID es vacío para autogenerar
            displayMessage(`Agente añadido con éxito.`, 'success');
            console.log(`[DEBUG - AgentManagerModal] Agente ${agentId || '(autogenerado)'} añadido.`);
        }
        await loadInitialAgents(); // Recarga los agentes en el estado de Nanostores
        agentForm.classList.add('hidden');
    }
    catch (error) {
        displayMessage(`Error al guardar agente: ${error.message}`, 'error');
        console.error("[ERROR - AgentManagerModal] Error al guardar agente:", error);
    } finally {
        hideLoading();
    }
}