<<<<<<< HEAD
// RUTA: js/ui/vehiculoModal.js (VERSIÓN ACTUALIZADA)
=======
// RUTA: js/ui/vehiculoModal.js (NUEVO ARCHIVO)
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33

import { displayMessage, showLoading, hideLoading } from './viewManager.js';
import { saveVehiculo, updateVehiculo } from '../dataController.js';

<<<<<<< HEAD
// 1. DECLARAMOS la nueva variable para el input del nombre
let modal, form, modalTitle, vehiculoIdInput, matriculaInput, marcaInput, modeloInput, colorInput, titularDniInput, titularNombreInput, telefonoInput, observacionesInput;
=======
let modal, form, modalTitle, vehiculoIdInput, matriculaInput, marcaInput, modeloInput, colorInput, titularDniInput, telefonoInput, observacionesInput;
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
let onSaveCallback = null;

function initializeVehiculoModal() {
    modal = document.getElementById('vehiculo-modal');
    form = document.getElementById('vehiculo-form');
    modalTitle = document.getElementById('vehiculo-modal-title');
    vehiculoIdInput = document.getElementById('vehiculo-id');
    matriculaInput = document.getElementById('vehiculo-matricula');
    marcaInput = document.getElementById('vehiculo-marca');
    modeloInput = document.getElementById('vehiculo-modelo');
    colorInput = document.getElementById('vehiculo-color');
    titularDniInput = document.getElementById('vehiculo-titular-dni');
<<<<<<< HEAD
    // 2. INICIALIZAMOS el nuevo elemento del DOM
    titularNombreInput = document.getElementById('vehiculo-titular-nombre');
=======
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
    telefonoInput = document.getElementById('vehiculo-telefono');
    observacionesInput = document.getElementById('vehiculo-observaciones');

    form.addEventListener('submit', handleFormSubmit);
    modal.querySelectorAll('.close-button').forEach(btn => btn.addEventListener('click', () => modal.classList.add('hidden')));
}

export function openVehiculoModal(callback, vehiculoData = null) {
    if (!modal) initializeVehiculoModal();

    onSaveCallback = callback;
    form.reset();
    vehiculoIdInput.value = '';
    matriculaInput.readOnly = false;

    if (vehiculoData) {
        modalTitle.textContent = 'Editar Vehículo';
        vehiculoIdInput.value = vehiculoData.id;
        matriculaInput.value = vehiculoData.id || '';
        matriculaInput.readOnly = true; // La matrícula (ID) no se puede editar
        marcaInput.value = vehiculoData.marca || '';
        modeloInput.value = vehiculoData.modelo || '';
        colorInput.value = vehiculoData.color || '';
        titularDniInput.value = vehiculoData.titularDni || '';
<<<<<<< HEAD
        // 4. RELLENAMOS el campo de nombre al editar
        titularNombreInput.value = vehiculoData.titularNombre || '';
=======
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
        telefonoInput.value = vehiculoData.telefonoContacto || '';
        observacionesInput.value = vehiculoData.observaciones || '';
    } else {
        modalTitle.textContent = 'Nuevo Vehículo';
    }

    modal.classList.remove('hidden');
    if(window.feather) feather.replace();
}

async function handleFormSubmit(event) {
    event.preventDefault();
    showLoading('Guardando...');

    const vehiculoId = vehiculoIdInput.value;
    const data = {
        marca: marcaInput.value.trim(),
        modelo: modeloInput.value.trim(),
        color: colorInput.value.trim(),
        titularDni: titularDniInput.value.trim().toUpperCase(),
<<<<<<< HEAD
        // 3. AÑADIMOS el nuevo campo al objeto de datos a guardar
        titularNombre: titularNombreInput.value.trim(),
=======
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
        telefonoContacto: telefonoInput.value.trim(),
        observaciones: observacionesInput.value.trim()
    };

    try {
        if (vehiculoId) {
            // Editando un vehículo existente
            await updateVehiculo(vehiculoId, data);
            displayMessage('Vehículo actualizado con éxito.', 'success');
        } else {
            // Creando un nuevo vehículo (el ID será la matrícula)
            const matricula = matriculaInput.value.trim().toUpperCase();
            if (!matricula) {
                throw new Error('La matrícula es obligatoria.');
            }
            await saveVehiculo(matricula, data);
            displayMessage('Vehículo creado con éxito.', 'success');
        }
        modal.classList.add('hidden');
        if (onSaveCallback) onSaveCallback();
    } catch (error) {
        displayMessage(`Error al guardar: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}