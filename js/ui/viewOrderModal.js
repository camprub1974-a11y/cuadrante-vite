// js/ui/viewOrderModal.js (VERSIÓN CORREGIDA PARA MOSTRAR TAREAS)

import { getServiceOrderById, getTasksByOrderId } from '../dataController.js';
import { displayMessage, showLoading, hideLoading } from './viewManager.js';
import { formatDate } from '../utils.js';
import { availableAgents } from '../state.js'; // Necesario para mostrar nombres de agentes

let modal, closeButtons;
let orderNumberElem, orderDateElem, orderShiftElem, orderStatusElem, orderDescriptionElem;
let assignedAgentsListElem, generalTasksListElem, specificTasksListElem; // Nuevas referencias
let isInitialized = false;

function initializeViewOrderModal() {
  if (isInitialized) return;

  modal = document.getElementById('view-order-modal');
  if (!modal) return console.error("El modal de visualización de orden no fue encontrado.");

  closeButtons = modal.querySelectorAll('.close-button');
  orderNumberElem = document.getElementById('view-order-number');
  orderDateElem = document.getElementById('view-order-date');
  orderShiftElem = document.getElementById('view-order-shift');
  orderStatusElem = document.getElementById('view-order-status');
  orderDescriptionElem = document.getElementById('view-order-description');
  assignedAgentsListElem = document.getElementById('view-assigned-agents-list');
  
  // ✅ Nuevas referencias a los contenedores de tareas
  generalTasksListElem = document.getElementById('view-general-tasks-list');
  specificTasksListElem = document.getElementById('view-specific-tasks-list');

  closeButtons.forEach(button => {
    button.addEventListener('click', () => modal.classList.add('hidden'));
  });

  isInitialized = true;
}

export async function openViewOrderModal(order) {
  if (!isInitialized) initializeViewOrderModal();
  
  showLoading('Cargando detalles de la orden...');
  try {
    const fullOrder = await getServiceOrderById(order.id);
    const specificTasks = await getTasksByOrderId(order.id); // Obtener tareas específicas

    orderNumberElem.textContent = fullOrder.order_reg_number || 'N/A';
    orderDateElem.textContent = formatDate(new Date(fullOrder.service_date), 'dd/MM/yyyy');
    orderShiftElem.textContent = fullOrder.service_shift || '';
    orderStatusElem.textContent = (fullOrder.status || 'draft').replace('_', ' ');
    orderStatusElem.className = `status-pill status-${fullOrder.status || 'draft'}`;
    orderDescriptionElem.textContent = fullOrder.description || 'Sin descripción.';

    renderViewAssignedAgents(fullOrder.assigned_agents || []);
    renderViewGeneralTasks(fullOrder.checklist || []); // ✅ Renderizar tareas generales
    renderViewSpecificTasks(specificTasks || []);     // ✅ Renderizar tareas específicas

    modal.classList.remove('hidden');
    feather.replace(); // Para asegurar que los nuevos iconos se muestren
  } catch (error) {
    console.error("Error al cargar la orden para visualización:", error);
    displayMessage(`Error al cargar la orden: ${error.message}`, 'error');
    modal.classList.add('hidden');
  } finally {
    hideLoading();
  }
}

function renderViewAssignedAgents(agentIds) {
  if (!assignedAgentsListElem) return;

  if (!agentIds || agentIds.length === 0) {
    assignedAgentsListElem.innerHTML = '<p class="empty-state-text">No hay agentes asignados.</p>';
    return;
  }

  const agentNames = agentIds.map(id => {
    const agent = availableAgents.get().find(a => a.id === id);
    return agent ? agent.name : `Agente ${id}`;
  });

  assignedAgentsListElem.innerHTML = `<ul>${agentNames.map(name => `<li>${name}</li>`).join('')}</ul>`;
}

// ✅ Función para renderizar tareas generales en el modal de visualización
function renderViewGeneralTasks(tasks) {
    if (!generalTasksListElem) return;

    if (!tasks || tasks.length === 0) {
        generalTasksListElem.innerHTML = '<p class="empty-state-text">No hay tareas generales.</p>';
        return;
    }

    generalTasksListElem.innerHTML = `
        <ul class="task-checklist-display">
            ${tasks.map(task => `
                <li class="${task.status === 'completado' ? 'completed' : 'pending'}">
                    <i data-feather="${task.status === 'completado' ? 'check-circle' : 'circle'}"></i>
                    <span>${task.item}</span>
                </li>
            `).join('')}
        </ul>
    `;
    feather.replace();
}

// ✅ Función para renderizar tareas específicas en el modal de visualización
async function renderViewSpecificTasks(tasks) {
    if (!specificTasksListElem) return;

    if (!tasks || tasks.length === 0) {
        specificTasksListElem.innerHTML = '<p class="empty-state-text">No hay tareas específicas.</p>';
        return;
    }

    const allAgents = availableAgents.get();
    
    specificTasksListElem.innerHTML = `
        <div class="specific-tasks-display">
            ${tasks.map(task => {
                const agent = allAgents.find(a => a.id === task.assignedAgentId);
                const agentName = agent ? agent.name : `Agente ${task.assignedAgentId}`;
                return `
                    <div class="specific-task-item ${task.status === 'completado' ? 'completed' : 'pending'}">
                        <div class="task-info">
                            <i data-feather="${task.status === 'completado' ? 'check-square' : 'square'}"></i>
                            <p>${task.description}</p>
                        </div>
                        <span class="agent-tag">Asignado a: ${agentName}</span>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    feather.replace();
}