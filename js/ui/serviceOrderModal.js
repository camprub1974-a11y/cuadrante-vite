<<<<<<< HEAD
// js/ui/serviceOrderModal.js (VERSIÓN REVISADA Y ROBUSTA)

import { displayMessage, showLoading, hideLoading } from './viewManager.js';
import { getServiceOrderById, createServiceOrder, updateServiceOrder, createTask, getPendingTasksForAgents, loadInitialAgents } from '../dataController.js';
import { populateAgentSelector } from './selectorManager.js'; // Asumimos que esta es la función correcta de tu manager
import { formatDate } from '../utils.js';
import { currentUser } from '../state.js';
=======
// js/ui/serviceOrderModal.js (VERSIÓN FINAL CORREGIDA)

import { displayMessage, showLoading, hideLoading } from './viewManager.js';
import { getServiceOrderById, createServiceOrder, updateServiceOrder, createTask } from '../dataController.js';
import { populateAgentSelector } from './selectorManager.js';
import { formatDate } from '../utils.js';
import { currentUser } from '../state.js';
// ✅ 1. Importamos la función para abrir el modal de asignación
import { openAssignmentModal } from './assignmentModal.js';
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33

let modal, form, orderIdInput, callbackOnSave;
let isInitialized = false;

// Tareas Generales
let generalTasks = [];
let generalTaskListContainer, newGeneralTaskInput, addGeneralTaskBtn;
<<<<<<< HEAD

// Tareas Específicas
let specificTasksToCreate = [];
let specificTasksPreviewContainer, newSpecificTaskDescription, newSpecificTaskAgent, addSpecificTaskBtn;

// Elementos para el flujo de IA
let assignedAgentsInput;
let pendingTasksAlert;
let aiSuggestedTasks = [];

// --- Inicialización y Gestión del Modal ---

function initializeServiceOrderModal() {
    if (isInitialized) return;

    modal = document.getElementById('service-order-modal');
    form = document.getElementById('service-order-form');

    // ✅ Verificación robusta de todos los elementos esenciales
    const elements = {
        modal,
        form,
        generalTaskListContainer: document.getElementById('task-list-container'),
        newGeneralTaskInput: document.getElementById('new-task-input'),
        addGeneralTaskBtn: document.getElementById('add-task-btn'),
        specificTasksPreviewContainer: document.getElementById('specific-tasks-preview-container'),
        newSpecificTaskDescription: document.getElementById('new-specific-task-description'),
        newSpecificTaskAgent: document.getElementById('new-specific-task-agent'),
        addSpecificTaskBtn: document.getElementById('add-specific-task-btn'),
        assignedAgentsInput: document.getElementById('order-assigned-agents-input'),
        pendingTasksAlert: document.getElementById('pending-tasks-alert')
    };

    // Si algún elemento no se encuentra, se detiene la inicialización y se advierte.
    for (const key in elements) {
        if (!elements[key]) {
            console.error(`Error Crítico: El elemento #${key} no fue encontrado en el HTML del modal.`);
            return;
        }
    }
    
    // Asignación a variables globales después de la verificación
    generalTaskListContainer = elements.generalTaskListContainer;
    newGeneralTaskInput = elements.newGeneralTaskInput;
    addGeneralTaskBtn = elements.addGeneralTaskBtn;
    specificTasksPreviewContainer = elements.specificTasksPreviewContainer;
    newSpecificTaskDescription = elements.newSpecificTaskDescription;
    newSpecificTaskAgent = elements.newSpecificTaskAgent;
    addSpecificTaskBtn = elements.addSpecificTaskBtn;
    assignedAgentsInput = elements.assignedAgentsInput;
    pendingTasksAlert = elements.pendingTasksAlert;

    // Creación de input oculto para el ID
    orderIdInput = document.createElement('input');
    orderIdInput.type = 'hidden';
    orderIdInput.id = 'order-id';
    form.prepend(orderIdInput);

    // Ocultar botón de asignación antiguo si existe
    const openAssignmentBtn = document.getElementById('open-assignment-modal-btn');
    if (openAssignmentBtn) openAssignmentBtn.style.display = 'none';

    // --- Listeners ---
    modal.querySelectorAll('.close-button').forEach(btn => btn.addEventListener('click', hideServiceOrderModal));
    form.addEventListener('submit', handleFormSubmit);
    addGeneralTaskBtn.addEventListener('click', handleAddGeneralTask);
    addSpecificTaskBtn.addEventListener('click', handleAddSpecificTask);

    assignedAgentsInput.addEventListener('change', () => {
        const selectedAgentIds = Array.from(assignedAgentsInput.selectedOptions).map(option => option.value);
        checkAndDisplayPendingTasks(selectedAgentIds);
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = selectedAgentIds.length === 0 && !orderIdInput.value;
    });
=======

// Tareas Específicas
let specificTasksToCreate = [];
let specificTasksPreviewContainer, newSpecificTaskDescription, newSpecificTaskAgent, addSpecificTaskBtn;

function initializeServiceOrderModal() {
  if (isInitialized) return;
  
  modal = document.getElementById('service-order-modal');
  if (!modal) return console.error("El modal de Orden de Servicio no fue encontrado.");
  
  form = document.getElementById('service-order-form');
  
  orderIdInput = document.createElement('input');
  orderIdInput.type = 'hidden';
  orderIdInput.id = 'order-id';
  form.prepend(orderIdInput);

  generalTaskListContainer = document.getElementById('task-list-container');
  newGeneralTaskInput = document.getElementById('new-task-input');
  addGeneralTaskBtn = document.getElementById('add-task-btn');

  specificTasksPreviewContainer = document.getElementById('specific-tasks-preview-container');
  newSpecificTaskDescription = document.getElementById('new-specific-task-description');
  newSpecificTaskAgent = document.getElementById('new-specific-task-agent');
  addSpecificTaskBtn = document.getElementById('add-specific-task-btn');

  // --- INICIO DE LA CORRECCIÓN ---

  // 2. Buscamos el botón de "Asignar Agentes" por su ID
  const openAssignmentBtn = document.getElementById('open-assignment-modal-btn');
  
  // 3. Le añadimos el event listener
  if (openAssignmentBtn) {
    openAssignmentBtn.addEventListener('click', () => {
        const orderId = orderIdInput.value;
        if (orderId) {
            // Llamamos a la función que abre el modal de asignación
            openAssignmentModal({ id: orderId });
        } else {
            displayMessage('Guarda la orden primero para poder asignar agentes.', 'info');
        }
    });
  }
  // --- FIN DE LA CORRECCIÓN ---

  // Eventos existentes
  modal.querySelectorAll('.close-button').forEach(btn => btn.addEventListener('click', hideServiceOrderModal));
  form.addEventListener('submit', handleFormSubmit);
  addGeneralTaskBtn.addEventListener('click', handleAddGeneralTask);
  addSpecificTaskBtn.addEventListener('click', handleAddSpecificTask);
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33

  isInitialized = true;
}

<<<<<<< HEAD
export async function openServiceOrderModal(orderId = null, callback) {
    if (!isInitialized) initializeServiceOrderModal();
    if (!modal) return; // Si la inicialización falló, no continuar.

    callbackOnSave = callback;
    form.reset();
    orderIdInput.value = orderId || '';
    generalTasks = [];
    specificTasksToCreate = [];
    aiSuggestedTasks = [];

    renderGeneralTasks();
    renderSpecificTasksPreview();
    pendingTasksAlert.classList.add('hidden');

    // Cargar y poblar selectores de agentes
    showLoading('Cargando datos...');
    await loadInitialAgents();
    populateAgentSelector(newSpecificTaskAgent, true); // Permite "Todos" para tareas
    populateAgentSelector(assignedAgentsInput, false); // No permite "Todos" para asignación principal
    hideLoading();

    if (orderId) {
        document.getElementById('service-order-modal-title').textContent = 'Editar Orden de Servicio';
        await loadOrderForEditing(orderId);
    } else {
        document.getElementById('service-order-modal-title').textContent = 'Crear Nueva Orden';
        document.getElementById('order-date').value = formatDate(new Date(), 'yyyy-MM-dd');
        document.getElementById('order-number-display').textContent = 'N/A';
        document.getElementById('order-status-display').textContent = 'Borrador';
        document.getElementById('order-status-display').className = 'status-pill status-draft';
        // Para un no-admin, preseleccionar su propio ID por defecto
        const user = currentUser.get();
        if (user && user.role !== 'admin' && user.agentId) {
            assignedAgentsInput.value = user.agentId;
        }
        form.querySelector('button[type="submit"]').disabled = assignedAgentsInput.selectedOptions.length === 0;
    }

    modal.classList.remove('hidden');
}

function hideServiceOrderModal() {
    if (modal) modal.classList.add('hidden');
}

async function loadOrderForEditing(orderId) {
    showLoading('Cargando orden...');
    try {
        const order = await getServiceOrderById(orderId);

        document.getElementById('order-number-display').textContent = order.order_reg_number || 'N/A';
        document.getElementById('order-status-display').textContent = (order.status || 'draft').replace('_', ' ');
        document.getElementById('order-status-display').className = `status-pill status-${order.status || 'draft'}`;
        document.getElementById('order-title').value = order.title || '';
        document.getElementById('order-date').value = formatDate(new Date(order.service_date), 'yyyy-MM-dd');
        document.getElementById('order-shift').value = order.service_shift || '';
        document.getElementById('order-description').value = order.description || '';

        // ✅ CORRECCIÓN: Seleccionar agentes asignados iterando sobre las opciones
        const assignedAgentIds = order.assigned_agents || [];
        Array.from(assignedAgentsInput.options).forEach(option => {
            if (assignedAgentIds.includes(option.value)) {
                option.selected = true;
            }
        });

        generalTasks = order.checklist || [];
        renderGeneralTasks();
        
        checkAndDisplayPendingTasks(assignedAgentIds);

    } catch (error) {
        displayMessage(error.message, 'error');
        hideServiceOrderModal();
    } finally {
        hideLoading();
    }
}


// --- Lógica de Tareas (Generales, Específicas y Sugeridas por IA) ---

function handleAddGeneralTask() {
    const description = newGeneralTaskInput.value.trim();
    if (description) {
        generalTasks.push({ item: description, status: 'pendiente' });
        newGeneralTaskInput.value = '';
        renderGeneralTasks();
    }
}

function renderGeneralTasks() {
    if (generalTasks.length === 0) {
        generalTaskListContainer.innerHTML = '<div class="no-tasks">No hay tareas generales.</div>';
        return;
    }
    generalTaskListContainer.innerHTML = generalTasks.map((task, index) => `
        <div class="task-item" data-index="${index}">
            <span>${task.item}</span>
            <button type="button" class="icon-button delete-task-btn" title="Eliminar Tarea"><i data-feather="trash-2"></i></button>
        </div>`).join('');
    
    generalTaskListContainer.querySelectorAll('.delete-task-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const index = e.target.closest('.task-item').dataset.index;
            generalTasks.splice(index, 1);
            renderGeneralTasks();
        });
    });
    if (window.feather) feather.replace();
}

function handleAddSpecificTask() {
    const description = newSpecificTaskDescription.value.trim();
    const agentId = newSpecificTaskAgent.value;
    if (!description || !agentId) {
        return displayMessage('Descripción y agente son obligatorios.', 'warning');
    }
    const agentName = newSpecificTaskAgent.options[newSpecificTaskAgent.selectedIndex].text;
    specificTasksToCreate.push({ description, assignedAgentId: agentId, assignedAgentName: agentName });
    newSpecificTaskDescription.value = '';
    newSpecificTaskAgent.value = '';
    renderSpecificTasksPreview();
}

function renderSpecificTasksPreview() {
    if (specificTasksToCreate.length === 0) {
        specificTasksPreviewContainer.innerHTML = '<p class="empty-state-text">No hay tareas específicas añadidas.</p>';
        return;
    }
=======
export function openServiceOrderModal(orderId = null, callback) {
  callbackOnSave = callback;
  if (!isInitialized) initializeServiceOrderModal();
  
  form.reset();
  orderIdInput.value = orderId || '';
  generalTasks = [];
  specificTasksToCreate = [];
  
  renderGeneralTasks();
  renderSpecificTasksPreview();
  document.getElementById('assigned-agents-list').innerHTML = '<p class="empty-state-text">No hay agentes asignados.</p>';

  populateAgentSelector(document.getElementById('new-specific-task-agent'), true);
  
  if (orderId) {
    document.getElementById('service-order-modal-title').textContent = 'Editar Orden de Servicio';
    loadOrderForEditing(orderId);
  } else {
    document.getElementById('service-order-modal-title').textContent = 'Crear Nueva Orden';
    document.getElementById('order-date').value = formatDate(new Date(), 'yyyy-MM-dd');
    document.getElementById('order-number-display').textContent = 'N/A';
    document.getElementById('order-status-display').textContent = 'Borrador';
    document.getElementById('order-status-display').className = 'status-pill status-draft';
  }
  
  modal.classList.remove('hidden');
}

async function loadOrderForEditing(orderId) {
  showLoading('Cargando orden...');
  try {
    const order = await getServiceOrderById(orderId);
    
    document.getElementById('order-number-display').textContent = order.order_reg_number || 'N/A';
    document.getElementById('order-status-display').textContent = (order.status || 'draft').replace('_', ' ');
    document.getElementById('order-status-display').className = `status-pill status-${order.status || 'draft'}`;
    document.getElementById('order-title').value = order.title || '';
    document.getElementById('order-date').value = formatDate(new Date(order.service_date), 'yyyy-MM-dd');
    document.getElementById('order-shift').value = order.service_shift || '';
    document.getElementById('order-description').value = order.description || '';

    renderAssignedAgents(order.assigned_agents || []);

    generalTasks = order.checklist || [];
    renderGeneralTasks();
    
  } catch (error) {
    displayMessage(error.message, 'error');
    hideServiceOrderModal();
  } finally {
    hideLoading();
  }
}

function renderAssignedAgents(agents) {
    const container = document.getElementById('assigned-agents-list');
    if (!agents || agents.length === 0) {
        container.innerHTML = '<p class="empty-state-text">No hay agentes asignados.</p>';
        return;
    }
    container.innerHTML = agents.map(agentId => `<div class="resource-item"><span>Agente ${agentId}</span></div>`).join('');
}

function hideServiceOrderModal() {
  if (modal) modal.classList.add('hidden');
}

function handleAddGeneralTask() {
  const description = newGeneralTaskInput.value.trim();
  if (description) {
    generalTasks.push({ item: description, status: 'pendiente' });
    newGeneralTaskInput.value = '';
    renderGeneralTasks();
  }
}

function renderGeneralTasks() {
  if (!generalTaskListContainer) return;
  if (generalTasks.length === 0) {
    generalTaskListContainer.innerHTML = '<div class="no-tasks">No hay tareas generales.</div>';
    return;
  }
  generalTaskListContainer.innerHTML = generalTasks.map((task, index) => `
    <div class="task-item" data-index="${index}">
      <span>${task.item}</span>
      <button type="button" class="icon-button delete-task-btn" title="Eliminar Tarea"><i data-feather="trash-2"></i></button>
    </div>`).join('');
  feather.replace();
  
  generalTaskListContainer.querySelectorAll('.delete-task-btn').forEach(btn => {
      btn.addEventListener('click', e => {
          const index = e.target.closest('.task-item').dataset.index;
          generalTasks.splice(index, 1);
          renderGeneralTasks();
      });
  });
}

function handleAddSpecificTask() {
  const description = newSpecificTaskDescription.value.trim();
  const agentId = newSpecificTaskAgent.value;
  const agentName = newSpecificTaskAgent.options[newSpecificTaskAgent.selectedIndex].text;
  if (!description || !agentId) {
    return displayMessage('Descripción y agente son obligatorios.', 'warning');
  }
  specificTasksToCreate.push({ description, assignedAgentId: agentId, assignedAgentName: agentName });
  newSpecificTaskDescription.value = '';
  newSpecificTaskAgent.value = '';
  renderSpecificTasksPreview();
}

function renderSpecificTasksPreview() {
    if (!specificTasksPreviewContainer) return;
    if (specificTasksToCreate.length === 0) {
        specificTasksPreviewContainer.innerHTML = '<p class="empty-state-text">No hay tareas específicas.</p>';
        return;
    }
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
    specificTasksPreviewContainer.innerHTML = specificTasksToCreate.map((task, index) => `
        <div class="task-preview-item" data-index="${index}">
            <p>${task.description}</p>
            <span class="agent-tag">${task.assignedAgentName}</span>
            <button type="button" class="icon-button remove-specific-task-btn" title="Quitar tarea"><i data-feather="x-circle"></i></button>
        </div>
    `).join('');
<<<<<<< HEAD
    
    specificTasksPreviewContainer.querySelectorAll('.remove-specific-task-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const index = e.target.closest('.task-preview-item').dataset.index;
            specificTasksToCreate.splice(index, 1);
            renderSpecificTasksPreview();
        });
    });
    if (window.feather) feather.replace();
}

async function checkAndDisplayPendingTasks(selectedAgentIds) {
    pendingTasksAlert.classList.add('hidden');
    aiSuggestedTasks = [];
    if (!selectedAgentIds || selectedAgentIds.length === 0) return;

    try {
        const pendingTasksByAgent = await getPendingTasksForAgents(selectedAgentIds);
        let message = "<strong>Tareas pendientes detectadas:</strong><br>";
        let hasPending = false;
        let totalTasks = 0;

        for (const agentId in pendingTasksByAgent) {
            const tasks = pendingTasksByAgent[agentId];
            if (tasks.length > 0) {
                hasPending = true;
                const agentName = assignedAgentsInput.querySelector(`option[value="${agentId}"]`)?.textContent || `ID ${agentId}`;
                message += `<strong>${agentName}:</strong><ul>`;
                tasks.forEach(task => {
                    message += `<li>${task.description}</li>`;
                    aiSuggestedTasks.push({
                        description: `[PENDIENTE] ${task.description}`,
                        assignedAgentId: agentId,
                        assignedAgentName: agentName
                    });
                });
                message += "</ul>";
                totalTasks += tasks.length;
            }
        }

        if (hasPending) {
            pendingTasksAlert.innerHTML = `
                <div>${message}</div>
                <button type="button" id="copy-suggested-tasks-btn" class="button button-secondary button-small mt-2">
                    <i data-feather="copy"></i> Copiar ${totalTasks} Tarea(s) a la Orden
                </button>`;
            pendingTasksAlert.classList.remove('hidden');
            document.getElementById('copy-suggested-tasks-btn')?.addEventListener('click', copySuggestedTasksToSpecific);
            if (window.feather) feather.replace();
        }
    } catch (error) {
        console.error("Error al verificar tareas pendientes:", error);
        displayMessage("No se pudieron verificar las tareas pendientes.", "error");
    }
}

function copySuggestedTasksToSpecific() {
    if (aiSuggestedTasks.length === 0) return;
    specificTasksToCreate.push(...aiSuggestedTasks);
    aiSuggestedTasks = [];
    pendingTasksAlert.classList.add('hidden');
    renderSpecificTasksPreview();
    displayMessage('Tareas pendientes añadidas a la orden.', 'success');
}


// --- Lógica de Envío del Formulario ---

async function handleFormSubmit(event) {
    event.preventDefault();
    const orderId = orderIdInput.value;
    
    const assignedAgentIds = Array.from(assignedAgentsInput.selectedOptions).map(option => option.value);

    const orderData = {
        title: document.getElementById('order-title').value.trim(),
        service_date: document.getElementById('order-date').value,
        service_shift: document.getElementById('order-shift').value,
        description: document.getElementById('order-description').value.trim(),
        checklist: generalTasks,
        assigned_agents: assignedAgentIds,
        // En modo creación, si hay agentes, pasa a 'asignado'. En edición, no se cambia el estado aquí.
        status: !orderId ? (assignedAgentIds.length > 0 ? 'assigned' : 'draft') : undefined,
    };

    if (!orderData.title || !orderData.service_date || !orderData.service_shift) {
        return displayMessage("Título, Fecha y Turno son obligatorios.", 'warning');
    }

    showLoading('Guardando orden...');
    try {
        let savedOrderId = orderId;
        if (orderId) {
            await updateServiceOrder(orderId, orderData);
        } else {
            const result = await createServiceOrder(orderData);
            savedOrderId = result.orderId;
        }
        
        if (savedOrderId && specificTasksToCreate.length > 0) {
            for (const task of specificTasksToCreate) {
                await createTask({
                    description: task.description,
                    assignedAgentId: task.assignedAgentId,
                    orderId: savedOrderId,
                    status: 'pendiente',
                    // otros campos necesarios para la tarea...
                });
            }
        }

        displayMessage('Orden guardada con éxito.', 'success');
        hideServiceOrderModal();
        if (callbackOnSave) callbackOnSave();

    } catch (error) {
        displayMessage(`Error al guardar la orden: ${error.message}`, 'error');
    } finally {
        hideLoading();
=======
    feather.replace();

    specificTasksPreviewContainer.querySelectorAll('.remove-specific-task-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const index = e.target.closest('.task-preview-item').dataset.index;
            specificTasksToCreate.splice(index, 1);
            renderSpecificTasksPreview();
        });
    });
}

async function handleFormSubmit(event) {
  event.preventDefault();
  const orderId = orderIdInput.value;
  
  const orderData = {
    title: document.getElementById('order-title').value,
    service_date: document.getElementById('order-date').value,
    service_shift: document.getElementById('order-shift').value,
    description: document.getElementById('order-description').value,
    checklist: generalTasks,
  };

  if (!orderData.title || !orderData.service_date || !orderData.service_shift) {
    return displayMessage("Los campos 'título', 'fecha de servicio' y 'turno' son requeridos.", 'warning');
  }

  showLoading('Guardando...');
  try {
    let savedOrderId = orderId;
    if (orderId) {
      await updateServiceOrder(orderId, orderData);
    } else {
      const result = await createServiceOrder(orderData);
      savedOrderId = result.orderId;
    }
    
    if (savedOrderId && specificTasksToCreate.length > 0) {
      for (const task of specificTasksToCreate) {
        await createTask({ ...task, orderId: savedOrderId });
      }
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
    }

    displayMessage('Orden guardada.', 'success');
    hideServiceOrderModal();
    if (callbackOnSave) callbackOnSave();

  } catch (error) {
    displayMessage(`Error: ${error.message}`, 'error');
  } finally {
    hideLoading();
  }
}