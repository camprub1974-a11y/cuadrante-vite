// js/ui/serviceOrderModal.js (VERSIÓN FINAL CORREGIDA)

import { displayMessage, showLoading, hideLoading } from './viewManager.js';
import { getServiceOrderById, createServiceOrder, updateServiceOrder, createTask } from '../dataController.js';
import { populateAgentSelector } from './selectorManager.js';
import { formatDate } from '../utils.js';
import { currentUser } from '../state.js';
// ✅ 1. Importamos la función para abrir el modal de asignación
import { openAssignmentModal } from './assignmentModal.js';

let modal, form, orderIdInput, callbackOnSave;
let isInitialized = false;

// Tareas Generales
let generalTasks = [];
let generalTaskListContainer, newGeneralTaskInput, addGeneralTaskBtn;

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

  isInitialized = true;
}

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
    specificTasksPreviewContainer.innerHTML = specificTasksToCreate.map((task, index) => `
        <div class="task-preview-item" data-index="${index}">
            <p>${task.description}</p>
            <span class="agent-tag">${task.assignedAgentName}</span>
            <button type="button" class="icon-button remove-specific-task-btn" title="Quitar tarea"><i data-feather="x-circle"></i></button>
        </div>
    `).join('');
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