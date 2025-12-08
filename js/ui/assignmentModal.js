// js/ui/assignmentModal.js (VERSIÓN FINAL CON DRAG-AND-DROP)

import { displayMessage, showLoading, hideLoading } from './viewManager.js';
import { assignResourcesToOrder, getServiceOrderById } from '../dataController.js';
import { availableAgents } from '../state.js';
import { formatDate } from '../utils.js';
import { es } from 'date-fns/locale';

let modal, form, modalTitle;
let availableListContainer, assignedListContainer, searchInput, managerSelect;
let currentOrder = null;
let isInitialized = false;
let sortableAvailable, sortableAssigned;

function initializeAssignmentModal() {
  if (isInitialized) return;
  modal = document.getElementById('assignment-modal');
  if (!modal) return console.error("El modal #assignment-modal no fue encontrado.");

  form = modal.querySelector('#assignment-form');
  modalTitle = modal.querySelector('#assignment-modal-title');
  availableListContainer = modal.querySelector('#available-agents-list');
  assignedListContainer = modal.querySelector('#assigned-agents-list-dropzone');
  searchInput = modal.querySelector('#agent-search-input');
  managerSelect = modal.querySelector('#shift-manager-select');
  
  if (!availableListContainer || !assignedListContainer) {
    console.error("Los contenedores de listas de agentes no se encontraron en el HTML.");
    return;
  }
  
  sortableAvailable = new Sortable(availableListContainer, { group: 'agents', animation: 150, onEnd: updateAssignedAgentsState });
  sortableAssigned = new Sortable(assignedListContainer, { group: 'agents', animation: 150, onEnd: updateAssignedAgentsState });

  modal.querySelectorAll('.close-button').forEach(btn => btn.addEventListener('click', hideAssignmentModal));
  form.addEventListener('submit', handleFormSubmit);
  searchInput.addEventListener('input', () => renderAgentLists(availableAgents.get()));

  isInitialized = true;
}

export async function openAssignmentModal(order) {
  if (!isInitialized) initializeAssignmentModal();
  if (!isInitialized) return; // Detiene si la inicialización falló
  
  showLoading('Preparando asignación...');
  try {
    currentOrder = await getServiceOrderById(order.id);
    modalTitle.textContent = `Asignar Recursos a: ${currentOrder.title}`;
    
    const allAgents = availableAgents.get();
    
    // Mueve los agentes ya asignados a la columna derecha
    const assignedIds = new Set(currentOrder.assigned_agents || []);
    assignedListContainer.innerHTML = allAgents
        .filter(agent => assignedIds.has(agent.id))
        .map(agent => createAgentCard(agent))
        .join('');
    
    renderAgentLists(allAgents);
    updateManagerSelect();
    feather.replace();

    modal.classList.remove('hidden');
  } catch (error) {
    displayMessage(`Error al preparar asignación: ${error.message}`, 'error');
  } finally {
    hideLoading();
  }
}

function renderAgentLists(allAgents) {
  const assignedAgentIds = Array.from(assignedListContainer.querySelectorAll('.agent-card')).map(el => el.dataset.agentId);
  const searchTerm = searchInput.value.toLowerCase();

  const availableToRender = allAgents.filter(agent => 
    !assignedAgentIds.includes(agent.id) &&
    (agent.name.toLowerCase().includes(searchTerm) || agent.id.includes(searchTerm))
  );

  availableListContainer.innerHTML = availableToRender.map(agent => createAgentCard(agent)).join('');
  feather.replace();
}

function createAgentCard(agent) {
    return `
    <div class="agent-card" data-agent-id="${agent.id}">
        <div class="agent-card-info">
            <i data-feather="user" class="drag-handle"></i>
            <span class="agent-name">${agent.name}</span>
        </div>
        <i data-feather="move" class="drag-handle"></i>
    </div>
    `;
}

function updateAssignedAgentsState() {
  const assignedAgentCards = Array.from(assignedListContainer.querySelectorAll('.agent-card'));
  
  if (assignedAgentCards.length === 0) {
    if (!assignedListContainer.querySelector('.empty-state-text')) {
        assignedListContainer.innerHTML = '<p class="empty-state-text">Arrastra agentes aquí para asignarlos</p>';
    }
  } else if (assignedListContainer.querySelector('.empty-state-text')) {
    assignedListContainer.querySelector('.empty-state-text').remove();
  }
  
  renderAgentLists(availableAgents.get());
  updateManagerSelect();
}

function updateManagerSelect() {
  const assignedAgentIds = Array.from(assignedListContainer.querySelectorAll('.agent-card')).map(card => card.dataset.agentId);
  const allAgents = availableAgents.get();
  
  managerSelect.innerHTML = '<option value="">-- Selecciona Responsable --</option>';
  
  assignedAgentIds.forEach(id => {
    const agent = allAgents.find(a => a.id === id);
    if (agent) {
      const isSelected = currentOrder.shift_manager_id === id;
      managerSelect.innerHTML += `<option value="${id}" ${isSelected ? 'selected' : ''}>${agent.name}</option>`;
    }
  });
}

async function handleFormSubmit(event) {
  event.preventDefault();
  
  const assignedAgentIds = Array.from(assignedListContainer.querySelectorAll('.agent-card')).map(card => card.dataset.agentId);
  const shiftManagerId = managerSelect.value;

  if (assignedAgentIds.length > 0 && !shiftManagerId) {
    return displayMessage('Por favor, selecciona un responsable para el equipo.', 'warning');
  }

  showLoading('Guardando asignación...');
  try {
    await assignResourcesToOrder({
      orderId: currentOrder.id,
      agentIds: assignedAgentIds,
      shiftManagerId,
    });
    displayMessage('Asignación guardada.', 'success');
    hideAssignmentModal();
    document.dispatchEvent(new CustomEvent('serviceOrderUpdated'));
  } catch (error) {
    displayMessage(`Error: ${error.message}`, 'error');
  } finally {
    hideLoading();
  }
}

function hideAssignmentModal() {
    if (modal) modal.classList.add('hidden');
}