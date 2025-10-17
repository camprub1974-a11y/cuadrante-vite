<<<<<<< HEAD
// js/ui/viewOrderModal.js (VERSIÓN FINAL CON DEPURACIÓN MEJORADA)
=======
// js/ui/viewOrderModal.js (VERSIÓN CORREGIDA PARA MOSTRAR TAREAS)
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33

import { getServiceOrderById, getTasksByOrderId } from '../dataController.js';
import { displayMessage, showLoading, hideLoading } from './viewManager.js';
import { formatDate } from '../utils.js';
<<<<<<< HEAD
import { availableAgents } from '../state.js';

// --- VARIABLES DEL MÓDULO ---
let modal, closeButtons;
let orderNumberElem, orderDateElem, orderShiftElem, orderStatusElem, orderDescriptionElem;
let assignedAgentsListElem, generalTasksListElem, specificTasksListElem;
let isInitialized = false;

// --- INICIALIZACIÓN ---
=======
import { availableAgents } from '../state.js'; // Necesario para mostrar nombres de agentes

let modal, closeButtons;
let orderNumberElem, orderDateElem, orderShiftElem, orderStatusElem, orderDescriptionElem;
let assignedAgentsListElem, generalTasksListElem, specificTasksListElem; // Nuevas referencias
let isInitialized = false;

>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
function initializeViewOrderModal() {
  if (isInitialized) return;

  modal = document.getElementById('view-order-modal');
<<<<<<< HEAD
  if (!modal) return console.error("FATAL: El modal #view-order-modal no fue encontrado en el DOM.");
=======
  if (!modal) return console.error("El modal de visualización de orden no fue encontrado.");
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33

  closeButtons = modal.querySelectorAll('.close-button');
  orderNumberElem = document.getElementById('view-order-number');
  orderDateElem = document.getElementById('view-order-date');
  orderShiftElem = document.getElementById('view-order-shift');
  orderStatusElem = document.getElementById('view-order-status');
  orderDescriptionElem = document.getElementById('view-order-description');
  assignedAgentsListElem = document.getElementById('view-assigned-agents-list');
<<<<<<< HEAD
=======
  
  // ✅ Nuevas referencias a los contenedores de tareas
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
  generalTasksListElem = document.getElementById('view-general-tasks-list');
  specificTasksListElem = document.getElementById('view-specific-tasks-list');

  closeButtons.forEach(button => {
    button.addEventListener('click', () => modal.classList.add('hidden'));
  });

  isInitialized = true;
}

<<<<<<< HEAD
// --- LÓGICA DE APERTURA Y CARGA DE DATOS ---
export async function openViewOrderModal(order) {
  if (!isInitialized) initializeViewOrderModal();
  
  // --> INICIO DE DEPURACIÓN: Log del objeto de entrada
  console.log("Abriendo modal de vista para la orden:", order);
  if (!order || !order.id) {
      displayMessage("Error: ID de la orden no válido.", "error");
      return;
  }
  // --> FIN DE DEPURACIÓN

  showLoading('Cargando detalles de la orden...');
  try {
    const [fullOrder, specificTasks] = await Promise.all([
        getServiceOrderById(order.id),
        getTasksByOrderId(order.id)
    ]);
    
    // --> INICIO DE DEPURACIÓN: Log de los datos recibidos
    console.log("Datos de la orden cargados:", fullOrder);
    console.log(`Tareas específicas encontradas para la orden ${order.id}:`, specificTasks);
    // --> FIN DE DEPURACIÓN
=======
export async function openViewOrderModal(order) {
  if (!isInitialized) initializeViewOrderModal();
  
  showLoading('Cargando detalles de la orden...');
  try {
    const fullOrder = await getServiceOrderById(order.id);
    const specificTasks = await getTasksByOrderId(order.id); // Obtener tareas específicas
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33

    orderNumberElem.textContent = fullOrder.order_reg_number || 'N/A';
    orderDateElem.textContent = formatDate(new Date(fullOrder.service_date), 'dd/MM/yyyy');
    orderShiftElem.textContent = fullOrder.service_shift || '';
<<<<<<< HEAD
    orderStatusElem.textContent = (fullOrder.status || 'draft').replace(/_/g, ' ');
=======
    orderStatusElem.textContent = (fullOrder.status || 'draft').replace('_', ' ');
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
    orderStatusElem.className = `status-pill status-${fullOrder.status || 'draft'}`;
    orderDescriptionElem.textContent = fullOrder.description || 'Sin descripción.';

    renderViewAssignedAgents(fullOrder.assigned_agents || []);
<<<<<<< HEAD
    renderViewGeneralTasks(fullOrder.checklist || []);
    renderViewSpecificTasks(specificTasks || []);

    modal.classList.remove('hidden');
    if (window.feather) feather.replace();

  } catch (error) {
    console.error("Error crítico al cargar la orden para visualización:", error);
=======
    renderViewGeneralTasks(fullOrder.checklist || []); // ✅ Renderizar tareas generales
    renderViewSpecificTasks(specificTasks || []);     // ✅ Renderizar tareas específicas

    modal.classList.remove('hidden');
    feather.replace(); // Para asegurar que los nuevos iconos se muestren
  } catch (error) {
    console.error("Error al cargar la orden para visualización:", error);
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
    displayMessage(`Error al cargar la orden: ${error.message}`, 'error');
    modal.classList.add('hidden');
  } finally {
    hideLoading();
  }
}

<<<<<<< HEAD
// --- FUNCIONES DE RENDERIZADO ---

function renderViewAssignedAgents(agentIds) {
  if (!assignedAgentsListElem) return;
=======
function renderViewAssignedAgents(agentIds) {
  if (!assignedAgentsListElem) return;

>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
  if (!agentIds || agentIds.length === 0) {
    assignedAgentsListElem.innerHTML = '<p class="empty-state-text">No hay agentes asignados.</p>';
    return;
  }
<<<<<<< HEAD
  const agentNames = agentIds.map(id => {
    const agent = availableAgents.get().find(a => String(a.id) === String(id));
    return agent ? agent.name : `Agente ${id}`;
  });
  assignedAgentsListElem.innerHTML = `<ul>${agentNames.map(name => `<li>${name}</li>`).join('')}</ul>`;
}

function renderViewGeneralTasks(tasks) {
  if (!generalTasksListElem) return;
  if (!tasks || tasks.length === 0) {
    generalTasksListElem.innerHTML = '<p class="empty-state-text">No hay tareas generales.</p>';
    return;
  }
  generalTasksListElem.innerHTML = `
    <ul class="task-checklist-display">
      ${tasks.map(task => `
        <li class="${task.status === 'realizado' ? 'completed' : 'pending'}">
          <i data-feather="${task.status === 'realizado' ? 'check-circle' : 'circle'}"></i>
          <span>${task.item}</span>
        </li>
      `).join('')}
    </ul>
  `;
}

function renderViewSpecificTasks(tasks) {
    if (!specificTasksListElem) return;

    if (!tasks || tasks.length === 0) {
        specificTasksListElem.innerHTML = '<p class="empty-state-text">No hay tareas específicas asignadas.</p>';
=======

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
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
        return;
    }

    const allAgents = availableAgents.get();
    
    specificTasksListElem.innerHTML = `
        <div class="specific-tasks-display">
            ${tasks.map(task => {
<<<<<<< HEAD
                const agent = allAgents.find(a => String(a.id) === String(task.assignedAgentId));
                const agentName = agent ? agent.name : `Agente ${task.assignedAgentId || 'N/A'}`;
                const statusText = (task.status || 'pendiente').replace(/_/g, ' ');
                return `
                    <div class="specific-task-item status-${task.status || 'pending'}">
                        <div class="task-info">
                            <i data-feather="${task.status === 'realizado' ? 'check-square' : 'square'}"></i>
                            <p>${task.description}</p>
                        </div>
                        <div class="task-meta">
                          <span class="agent-tag">Asignado a: ${agentName}</span>
                          <span class="status-tag">${statusText}</span>
                        </div>
=======
                const agent = allAgents.find(a => a.id === task.assignedAgentId);
                const agentName = agent ? agent.name : `Agente ${task.assignedAgentId}`;
                return `
                    <div class="specific-task-item ${task.status === 'completado' ? 'completed' : 'pending'}">
                        <div class="task-info">
                            <i data-feather="${task.status === 'completado' ? 'check-square' : 'square'}"></i>
                            <p>${task.description}</p>
                        </div>
                        <span class="agent-tag">Asignado a: ${agentName}</span>
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
                    </div>
                `;
            }).join('')}
        </div>
    `;
<<<<<<< HEAD
=======
    feather.replace();
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
}