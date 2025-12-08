// js/ui/addMarkedDateModal.js

import { showLoading, hideLoading, displayMessage } from './viewManager.js';
import { addMarkedDateCallable } from '../dataController.js';
import { currentUser } from '../state.js'; // Para obtener el UID del creador

let modal = null;
let form = null;
let closeButton = null;
let dateInput = null;
let typeSelect = null;
let titleInput = null;
let descriptionTextarea = null;
let appliesToSelect = null;

export function initializeAddMarkedDateModal() {
  modal = document.getElementById('add-marked-date-modal');
  if (!modal) {
    console.error('Modal #add-marked-date-modal no encontrado.');
    return;
  }

  closeButton = modal.querySelector('.close-button');
  if (closeButton) {
    closeButton.addEventListener('click', hideAddMarkedDateModal);
  } else {
    console.warn(
      'Botón de cierre (.close-button) no encontrado en el modal de añadir fecha marcada.'
    );
  }

  form = modal.querySelector('#add-marked-date-form');
  if (!form) {
    console.error('Formulario #add-marked-date-form no encontrado.');
    return;
  }

  dateInput = form.querySelector('#marked-date-input');
  typeSelect = form.querySelector('#marked-date-type-select');
  titleInput = form.querySelector('#marked-date-title-input');
  descriptionTextarea = form.querySelector('#marked-date-description-textarea');

  if (!dateInput || !typeSelect || !titleInput || !descriptionTextarea) {
    console.error('Uno o más elementos del formulario de fecha marcada no encontrados.');
    return;
  }

  form.addEventListener('submit', handleFormSubmit);
}

export function showAddMarkedDateModal() {
  if (!modal) return;
  form.reset(); // Limpiar el formulario
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
}

function hideAddMarkedDateModal() {
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
}

async function handleFormSubmit(event) {
  event.preventDefault();
  showLoading();

  const userProfile = currentUser.get();
  if (!userProfile || userProfile.role !== 'admin') {
    displayMessage('Acceso denegado. Solo administradores pueden añadir fechas.', 'error');
    hideLoading();
    return;
  }

  const markedDateData = {
    date: dateInput.value,
    type: typeSelect.value,
    title: titleInput.value.trim(),
    description: descriptionTextarea.value.trim(),
    appliesTo: 'all_agents', // Campo presente en tu lógica
  };

  try {
    const result = await addMarkedDateCallable(markedDateData);
    if (result.success) {
      displayMessage('Fecha señalada añadida con éxito.', 'success');
      hideAddMarkedDateModal();
      
      // ✅ ¡ESTA ES LA LÍNEA CLAVE!
      // Disparamos un evento global para que otras partes de la app
      // (como main.js) sepan que deben refrescarse.
      document.dispatchEvent(new CustomEvent('dataShouldRefresh'));

    } else {
      throw new Error(result.message || 'Error desconocido al añadir fecha.');
    }
  } catch (error) {
    displayMessage(`Error al añadir fecha señalada: ${error.message}`, 'error');
    console.error('Error al añadir fecha señalada:', error);
  } finally {
    hideLoading();
  }
}
