// js/ui/croquisModal.js (VERSIÓN FINAL Y COMPATIBLE)

import { displayMessage, showLoading, hideLoading } from './viewManager.js';
// ✅ CORRECCIÓN: Nos aseguramos de importar solo las funciones que realmente se usan y existen.
import { uploadCroquisImage, saveSketchRecord, updateSketch } from '../dataController.js';

let modal, form, fileInput;
let isInitialized = false;
let onSaveCallback = null;
let editingSketchId = null;

export function initializeCroquisModal() {
  if (isInitialized) return;

  modal = document.getElementById('croquis-modal');
  form = document.getElementById('croquis-form');
  fileInput = document.getElementById('croquis-file-input');
  const innerOverlay = document.getElementById('croquis-capture-instructions');
  const prepareCaptureBtn = document.getElementById('prepare-capture-btn');
  const exitInnerOverlayBtn = document.getElementById('exit-capture-mode-btn-inner');
  
  // ✅ CORRECCIÓN: Nos aseguramos de que todos los botones de cerrar funcionen
  const closeButtons = modal.querySelectorAll('.close-button');

  if (!modal || !form || !fileInput || !innerOverlay || !prepareCaptureBtn || !exitInnerOverlayBtn || closeButtons.length === 0) {
    console.error('Error crítico: No se encontraron todos los elementos necesarios del modal del croquis.');
    return;
  }

  form.addEventListener('submit', handleSaveCroquis);
  closeButtons.forEach(btn => btn.addEventListener('click', () => hideCroquisModal()));

  prepareCaptureBtn.addEventListener('click', () => {
    innerOverlay.classList.remove('hidden');
  });

  exitInnerOverlayBtn.addEventListener('click', () => {
    innerOverlay.classList.add('hidden');
  });

  isInitialized = true;
}

export function openCroquisModal(callback, sketchData = null) {
  if (!isInitialized) initializeCroquisModal();
  onSaveCallback = callback;
  form.reset();

  if (sketchData) {
    editingSketchId = sketchData.id;
    document.getElementById('croquis-lugar').value = sketchData.lugar || '';
    // Verificación de seguridad para objetos Date de Firebase
    if (sketchData.fechaSuceso && typeof sketchData.fechaSuceso.toDate === 'function') {
      const fecha = sketchData.fechaSuceso.toDate();
      document.getElementById('croquis-fecha').value = fecha.toISOString().split('T')[0];
      document.getElementById('croquis-hora').value = fecha.toTimeString().slice(0, 5);
    }
    document.getElementById('croquis-implicados').value = sketchData.implicados || '';
    document.getElementById('croquis-documento').value = sketchData.documentoRealizado || 'ninguno';
    document.getElementById('croquis-leyenda').value = sketchData.leyenda || '';
    fileInput.required = false;
  } else {
    editingSketchId = null;
    const now = new Date();
    document.getElementById('croquis-fecha').valueAsDate = now;
    document.getElementById('croquis-hora').value = now.toTimeString().slice(0, 5);
    fileInput.required = true;
  }

  modal.classList.remove('hidden');
}

export function hideCroquisModal() {
  if (modal) {
    modal.classList.add('hidden');
  }
}

async function handleSaveCroquis(event) {
  event.preventDefault();
  const file = fileInput.files[0];

  if (!editingSketchId && !file) {
    return displayMessage('Debes seleccionar un archivo de imagen para el nuevo croquis.', 'warning');
  }

  const dataToSave = {
    lugar: document.getElementById('croquis-lugar').value.trim(),
    fechaSuceso: new Date(`${document.getElementById('croquis-fecha').value}T${document.getElementById('croquis-hora').value}`),
    implicados: document.getElementById('croquis-implicados').value.trim(),
    documentoRealizado: document.getElementById('croquis-documento').value,
    leyenda: document.getElementById('croquis-leyenda').value.trim(),
  };

  if (!dataToSave.lugar || !dataToSave.implicados) {
    return displayMessage('Por favor, completa todos los campos de datos del accidente.', 'warning');
  }

  showLoading('Guardando croquis...');
  try {
    if (file) {
      const downloadURL = await uploadCroquisImage(file);
      dataToSave.imageUrl = downloadURL;
    }

    if (editingSketchId) {
      await updateSketch(editingSketchId, dataToSave);
      displayMessage('Croquis actualizado con éxito.', 'success');
    } else {
      await saveSketchRecord(dataToSave);
      displayMessage('Croquis guardado con éxito.', 'success');
    }

    hideCroquisModal();
    if (typeof onSaveCallback === 'function') onSaveCallback();
  } catch (error) {
    displayMessage(`Error al guardar: ${error.message}`, 'error');
  } finally {
    hideLoading();
  }
}