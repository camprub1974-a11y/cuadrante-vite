// EN: js/ui/resolucionEntradaModal.js (NUEVO ARCHIVO)

import { displayMessage, showLoading, hideLoading } from './viewManager.js';
import { updateRegistro } from '../dataController.js';
// Importamos la función para abrir el modal de creación de salida
import { openRegistroModal } from './registroModal.js'; 

let modalClone;
let onUpdateSuccessCallback = null;
let currentRegistroData = null;

// --- Funciones de Utilidad ---

function closeAndDestroyModal() {
  if (modalClone) {
    modalClone.classList.add('hidden');
    setTimeout(() => modalClone.remove(), 300);
  }
}

// --- Función Principal ---

export function openResolucionEntradaModal(registroData, callback) {
  onUpdateSuccessCallback = callback;
  currentRegistroData = registroData;

  const modalTemplate = document.getElementById('template-resolucion-entrada-modal');
  if (!modalTemplate) return;

  modalClone = modalTemplate.content.cloneNode(true).firstElementChild;
  document.body.appendChild(modalClone);

  const elements = {
    regNum: modalClone.querySelector('#resolucion-reg-num'),
    asunto: modalClone.querySelector('#resolucion-asunto'),
    estado: modalClone.querySelector('#resolucion-estado'),
    observaciones: modalClone.querySelector('#resolucion-observaciones'),
    recordIdInput: modalClone.querySelector('#resolucion-record-id'),
    vincularBtn: modalClone.querySelector('#vincular-salida-btn'),
    guardarBtn: modalClone.querySelector('#guardar-resolucion-btn'),
    closeBtns: modalClone.querySelectorAll('.close-button'),
  };

  // 1. Rellenar datos
  elements.regNum.textContent = registroData.registrationNumber || 'N/A';
  // Se usa el asunto guardado en el documento (que puede estar en subject o asunto)
  elements.asunto.textContent = registroData.subject || registroData.asunto || 'Sin Asunto'; 
  elements.estado.value = registroData.estado || 'pendiente';
  elements.observaciones.value = registroData.observaciones || '';
  elements.recordIdInput.value = registroData.id;

  // 2. Setup Listeners
  elements.closeBtns.forEach(btn => btn.addEventListener('click', closeAndDestroyModal));
  elements.guardarBtn.addEventListener('click', () => handleGuardar(elements));
  elements.vincularBtn.addEventListener('click', () => handleVincular(elements));

  // 3. Mostrar Modal
  setTimeout(() => {
    modalClone.classList.remove('hidden');
    if (window.feather) feather.replace();
  }, 10);
}

// --- Handlers de Acciones ---

async function handleGuardar(elements) {
  const recordId = elements.recordIdInput.value;
  const nuevoEstado = elements.estado.value;
  const observaciones = elements.observaciones.value.trim();

  showLoading('Guardando cambios...');
  try {
    const updatePayload = {
      estado: nuevoEstado,
      observaciones: observaciones,
    };
    
    await updateRegistro(recordId, updatePayload); 

    displayMessage('Registro actualizado con éxito.', 'success');
    closeAndDestroyModal();
    if (onUpdateSuccessCallback) onUpdateSuccessCallback();

  } catch (error) {
    displayMessage(`Error al guardar: ${error.message}`, 'error');
  } finally {
    hideLoading();
  }
}

function handleVincular(elements) {
  const recordId = elements.recordIdInput.value;
  
  // Cerramos este modal
  closeAndDestroyModal();

  // Abrimos el modal de registro de salida
  openRegistroModal({
    direction: 'salida',
    parentId: recordId, // <-- CLAVE: Usamos parentId para el enlace
    // La función de retorno recarga la vista principal
    callback: async () => {
      displayMessage('Documento de Salida creado y Registro de Entrada vinculado.', 'success');
      if (onUpdateSuccessCallback) onUpdateSuccessCallback();
    }
  });
}