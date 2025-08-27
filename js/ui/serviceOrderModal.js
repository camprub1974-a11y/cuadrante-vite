// js/ui/serviceOrderModal.js

import { displayMessage, showLoading, hideLoading } from './viewManager.js';
import { createServiceOrder, updateServiceOrder, getServiceOrders } from '../dataController.js'; // Asumiendo getServiceOrders puede buscar por ID
import { formatDate } from '../utils.js';
import { availableAgents } from '../state.js';

let modal, form, modalTitle, titleInput, dateInput, shiftSelect, descriptionInput, saveButton;
let taskListContainer, newTaskInput, addTaskBtn;
let currentOrderId = null;
let tasks = [];
let onSaveCallback = null; // Para refrescar la vista anterior
let isInitialized = false;

export function initializeServiceOrderModal(onSave) {
    if (isInitialized) return;
    
    modal = document.getElementById('service-order-modal');
    if (!modal) {
        console.error("Error Crítico: El modal #service-order-modal no fue encontrado en el HTML.");
        return;
    }

    form = modal.querySelector('#service-order-form');
    modalTitle = modal.querySelector('#service-order-modal-title');
    titleInput = modal.querySelector('#order-title');
    dateInput = modal.querySelector('#order-date');
    shiftSelect = modal.querySelector('#order-shift');
    descriptionInput = modal.querySelector('#order-description');
    saveButton = modal.querySelector('#save-order-btn');
    taskListContainer = modal.querySelector('#task-list-container');
    newTaskInput = modal.querySelector('#new-task-input');
    addTaskBtn = modal.querySelector('#add-task-btn');
    
    onSaveCallback = onSave;

    const elements = { form, modalTitle, titleInput, dateInput, shiftSelect, descriptionInput, saveButton, taskListContainer, newTaskInput, addTaskBtn };
    for (const key in elements) {
        if (!elements[key]) {
            console.error(`Error de inicialización: El elemento del modal '${key}' no fue encontrado.`);
            return;
        }
    }

    const closeButtons = modal.querySelectorAll('.close-button');
    closeButtons.forEach(btn => btn.addEventListener('click', hideServiceOrderModal));
    
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            hideServiceOrderModal();
        }
    });

    form.addEventListener('submit', handleFormSubmit);
    addTaskBtn.addEventListener('click', handleAddTask);
    
    taskListContainer.addEventListener('click', (event) => {
        // ✅ SELECTOR ACTUALIZADO: Buscamos el botón por su clase, no por el icono.
        const deleteBtn = event.target.closest('.delete-task-btn');
        if (deleteBtn) {
            const taskIndex = deleteBtn.closest('.task-item').dataset.index;
            handleDeleteTask(parseInt(taskIndex, 10));
        }
    });

    isInitialized = true;
}

export async function openServiceOrderModal(orderId = null, callback) {
    if (!isInitialized) initializeServiceOrderModal(callback);
    if (!isInitialized) return;

    form.reset();
    tasks = [];
    currentOrderId = orderId;
    
    if (onSaveCallback === null && callback) {
        onSaveCallback = callback;
    }

    if (orderId) {
        modalTitle.textContent = 'Editar Orden de Servicio';
        saveButton.textContent = 'Guardar Cambios';
        showLoading("Cargando orden...");
        try {
            // Aquí necesitarías una función en dataController que obtenga una orden por ID
            // const orderData = await getServiceOrderById(orderId); 
            // titleInput.value = orderData.title;
            // ... rellenar otros campos
            // tasks = orderData.checklist || [];
            console.warn("La carga de datos para editar una orden aún no está implementada.");
        } catch(error) {
            displayMessage(`Error al cargar la orden: ${error.message}`, 'error');
            hideServiceOrderModal();
        } finally {
            hideLoading();
        }
    } else {
        modalTitle.textContent = 'Crear Nueva Orden de Servicio';
        saveButton.textContent = 'Guardar Orden';
    }
    
    renderTasks();
    modal.classList.remove('hidden');

    // ✅ ACTIVACIÓN DE ICONOS: Es crucial llamar a esto DESPUÉS de mostrar el modal.
    if (window.feather) {
        feather.replace();
    }
}

function hideServiceOrderModal() {
    if (modal) {
        modal.classList.add('hidden');
    }
}

function renderTasks() {
    if (tasks.length === 0) {
        taskListContainer.innerHTML = '<div class="no-tasks">No hay tareas añadidas</div>';
        return;
    }
    
    taskListContainer.innerHTML = tasks.map((task, index) => `
        <div class="task-item" data-index="${index}">
            <span>${task.item}</span>
            <button type="button" class="icon-button delete-task-btn" title="Eliminar Tarea">
                <i data-feather="trash-2"></i>
            </button>
        </div>
    `).join('');

    // Activamos los iconos Feather que acabamos de añadir a la lista
    if (window.feather) {
        feather.replace();
    }
}

function handleAddTask() {
    const taskDescription = newTaskInput.value.trim();
    if (taskDescription) {
        tasks.push({ item: taskDescription, completed: false });
        newTaskInput.value = '';
        renderTasks();
    }
}

function handleDeleteTask(index) {
    tasks.splice(index, 1);
    renderTasks();
}

async function handleFormSubmit(event) {
    event.preventDefault();
    const orderData = {
        title: titleInput.value.trim(),
        service_date: dateInput.value,
        service_shift: shiftSelect.value,
        description: descriptionInput.value.trim(),
        checklist: tasks
    };
    if (!orderData.title || !orderData.service_date || !orderData.service_shift) {
        displayMessage("Los campos Título, Fecha y Turno son obligatorios.", "warning");
        return;
    }
    showLoading("Guardando...");
    try {
        let result;
        if (currentOrderId) {
            result = await updateServiceOrder(currentOrderId, orderData);
        } else {
            result = await createServiceOrder(orderData);
        }
        
        displayMessage(result.message || 'Operación realizada con éxito.', 'success');
        hideServiceOrderModal();
        if (onSaveCallback) {
            onSaveCallback();
        }
    } catch (error) {
        displayMessage(`Error al guardar: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}