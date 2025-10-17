<<<<<<< HEAD
// Archivo: js/ui/identificacionesView.js (VERSIÓN ACTUALIZADA)

import { showLoading, hideLoading, displayMessage } from './viewManager.js';
=======
// Archivo: js/ui/identificacionesView.js

import { showLoading, hideLoading, displayMessage } from './viewManager.js';
// NOTA: Necesitarás crear estas funciones en tu dataController.js
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
import { getPersonas, getVehiculos, getEstablecimientos, searchPersonas, searchVehiculos } from '../dataController.js'; 
import { openPersonaModal } from './personaModal.js';
import { openVehiculoModal } from './vehiculoModal.js';
import { openEstablecimientoModal } from './establecimientoModal.js';

// --- VARIABLES DEL MÓDULO ---
let isInitialized = false;
let viewContent;
let personasContainer, vehiculosContainer, establecimientosContainer;

<<<<<<< HEAD
// --- FUNCIONES DE RENDERIZADO DE TABLAS (Sin cambios) ---
=======
// --- FUNCIONES DE RENDERIZADO DE TABLAS ---
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33

function renderPersonasTable(personas) {
    if (!personasContainer) return;
    if (personas.length === 0) {
        personasContainer.innerHTML = `<div class="empty-state"><p>No se han encontrado registros de personas.</p></div>`;
        return;
    }
<<<<<<< HEAD
    let tableHtml = `
      <table class="data-table">
        <thead><tr><th>DNI</th><th>Nombre Completo</th><th>Mote</th><th>Teléfono</th><th>Acciones</th></tr></thead>
        <tbody>
    `;
=======

    let tableHtml = `
      <table class="data-table">
        <thead>
          <tr>
            <th>DNI</th>
            <th>Nombre Completo</th>
            <th>Mote</th>
            <th>Teléfono</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
    `;

>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
    personas.forEach(persona => {
        tableHtml += `
            <tr data-id="${persona.id}">
                <td>${persona.dni || 'No especificado'}</td>
                <td>${persona.nombre || ''} ${persona.apellidos || ''}</td>
                <td>${persona.mote || '---'}</td>
                <td>${persona.telefono || '---'}</td>
                <td class="actions-cell">
                    <button class="icon-button view-persona-btn" title="Ver Ficha"><i data-feather="eye"></i></button>
                    <button class="icon-button edit-persona-btn" title="Editar Ficha"><i data-feather="edit"></i></button>
                </td>
            </tr>
        `;
    });
<<<<<<< HEAD
=======

>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
    tableHtml += '</tbody></table>';
    personasContainer.innerHTML = tableHtml;
    if (window.feather) feather.replace();
}

<<<<<<< HEAD
=======
// 2. REEMPLAZA tu función renderVehiculosTable con esta versión mejorada
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
function renderVehiculosTable(vehiculos) {
    if (!vehiculosContainer) return;
    if (vehiculos.length === 0) {
        vehiculosContainer.innerHTML = `<div class="empty-state"><p>No se han encontrado registros de vehículos.</p></div>`;
        return;
    }
<<<<<<< HEAD
=======

    // Encuentra el vehículo con la fecha de actualización más reciente
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
    const lastUpdated = vehiculos.reduce((latest, vehiculo) => {
        const vehiculoDate = vehiculo.updatedAt?.toDate();
        if (vehiculoDate && (!latest || vehiculoDate > latest.updatedAt?.toDate())) {
            return vehiculo;
        }
        return latest;
    }, null);
<<<<<<< HEAD
    let tableHtml = `
      <table class="data-table">
        <thead><tr><th>Matrícula</th><th>Marca y Modelo</th><th>Titular</th><th>Contacto</th><th>Acciones</th></tr></thead>
        <tbody>
    `;
    vehiculos.forEach(vehiculo => {
        const isLastUpdated = lastUpdated && vehiculo.id === lastUpdated.id;
        const rowClass = isLastUpdated ? 'class="row-highlight"' : '';
        // --> MODIFICADO: Mostramos nombre y DNI si existen
        const titularInfo = [vehiculo.titularNombre, vehiculo.titularDni].filter(Boolean).join(' - ') || '---';
=======

    let tableHtml = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Matrícula</th>
            <th>Marca y Modelo</th>
            <th>Titular (DNI)</th>
            <th>Contacto</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
    `;

    vehiculos.forEach(vehiculo => {
        // Resalta la fila si es la última actualizada
        const isLastUpdated = lastUpdated && vehiculo.id === lastUpdated.id;
        const rowClass = isLastUpdated ? 'class="row-highlight"' : '';
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33

        tableHtml += `
            <tr data-id="${vehiculo.id}" ${rowClass}>
                <td><strong>${vehiculo.id}</strong></td>
                <td>${vehiculo.marca || ''} ${vehiculo.modelo || ''}</td>
<<<<<<< HEAD
                <td>${titularInfo}</td>
=======
                <td>${vehiculo.titularDni || '---'}</td>
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
                <td>${vehiculo.telefonoContacto || '---'}</td>
                <td class="actions-cell">
                    <button class="icon-button view-vehiculo-btn" title="Ver Ficha"><i data-feather="eye"></i></button>
                    <button class="icon-button edit-vehiculo-btn" title="Editar Ficha"><i data-feather="edit"></i></button>
                </td>
            </tr>
        `;
    });
<<<<<<< HEAD
=======

>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
    tableHtml += '</tbody></table>';
    vehiculosContainer.innerHTML = tableHtml;
    if (window.feather) feather.replace();
}

function renderEstablecimientosTable(establecimientos) {
    if (!establecimientosContainer) return;
    if (establecimientos.length === 0) {
        establecimientosContainer.innerHTML = `<div class="empty-state"><p>No se han encontrado registros de establecimientos.</p></div>`;
        return;
    }
<<<<<<< HEAD
    let tableHtml = `
      <table class="data-table">
        <thead><tr><th>CIF</th><th>Nombre Comercial</th><th>Dirección</th><th>Teléfono</th><th>Acciones</th></tr></thead>
        <tbody>
    `;
=======

    let tableHtml = `
      <table class="data-table">
        <thead>
          <tr>
            <th>CIF</th>
            <th>Nombre Comercial</th>
            <th>Dirección</th>
            <th>Teléfono</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
    `;

>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
    establecimientos.forEach(est => {
        tableHtml += `
            <tr data-id="${est.id}">
                <td>${est.cif || 'No especificado'}</td>
                <td>${est.nombreComercial || '---'}</td>
                <td>${est.direccion || '---'}</td>
                <td>${est.telefono || '---'}</td>
                <td class="actions-cell">
                    <button class="icon-button view-establecimiento-btn" title="Ver Ficha"><i data-feather="eye"></i></button>
                    <button class="icon-button edit-establecimiento-btn" title="Editar Ficha"><i data-feather="edit"></i></button>
                </td>
            </tr>
        `;
    });
<<<<<<< HEAD
=======

>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
    tableHtml += '</tbody></table>';
    establecimientosContainer.innerHTML = tableHtml;
    if (window.feather) feather.replace();
}

<<<<<<< HEAD
// --- FUNCIONES DE CARGA DE DATOS (Sin cambios) ---
=======

// --- FUNCIONES DE CARGA DE DATOS ---
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33

async function loadAndRenderPersonas(searchTerm = null) {
    showLoading('Cargando personas...');
    try {
<<<<<<< HEAD
        const personas = searchTerm ? await searchPersonas(searchTerm) : await getPersonas();
=======
        const personas = searchTerm 
            ? await searchPersonas(searchTerm) // Usa la función de búsqueda si hay un término
            : await getPersonas(); // Si no, carga todas
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
        renderPersonasTable(personas);
    } catch (error) {
        displayMessage(`Error al cargar personas: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

async function loadAndRenderVehiculos(searchTerm = null) {
    showLoading('Cargando vehículos...');
    try {
<<<<<<< HEAD
        const vehiculos = searchTerm ? await searchVehiculos(searchTerm) : await getVehiculos();
        renderVehiculosTable(vehiculos);
=======
        // Si hay un 'searchTerm', usa la función de búsqueda; si no, carga todo.
        const vehiculos = searchTerm 
            ? await searchVehiculos(searchTerm)
            : await getVehiculos(); 
        
        renderVehiculosTable(vehiculos); // La tabla se renderiza con los resultados
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
    } catch (error) {
        displayMessage(`Error al cargar vehículos: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

<<<<<<< HEAD
async function loadAndRenderEstablecimientos(searchTerm = null) { // --> MODIFICADO: Acepta término de búsqueda
    showLoading('Cargando establecimientos...');
    try {
        const establecimientos = searchTerm ? await searchEstablecimientos(searchTerm) : await getEstablecimientos(); 
=======
async function loadAndRenderEstablecimientos() {
    showLoading('Cargando establecimientos...');
    try {
        const establecimientos = await getEstablecimientos(); 
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
        renderEstablecimientosTable(establecimientos);
    } catch (error) {
        displayMessage(`Error al cargar establecimientos: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

// --- GESTIÓN DE LA VISTA Y EVENTOS ---

function switchSubview(subviewName) {
<<<<<<< HEAD
    viewContent.querySelectorAll('.sub-view').forEach(view => view.classList.add('hidden'));
    viewContent.querySelector(`#${subviewName}-subview`)?.classList.remove('hidden');
    viewContent.querySelectorAll('.sub-nav-tab').forEach(tab => tab.classList.remove('active'));
    viewContent.querySelector(`.sub-nav-tab[data-subview="${subviewName}"]`)?.classList.add('active');

    if (subviewName === 'personas') loadAndRenderPersonas();
    else if (subviewName === 'vehiculos') loadAndRenderVehiculos();
    else if (subviewName === 'establecimientos') loadAndRenderEstablecimientos();
=======
    // Ocultar todas las sub-vistas
    viewContent.querySelectorAll('.sub-view').forEach(view => view.classList.add('hidden'));
    // Mostrar la seleccionada
    viewContent.querySelector(`#${subviewName}-subview`)?.classList.remove('hidden');

    // Actualizar la pestaña activa
    viewContent.querySelectorAll('.sub-nav-tab').forEach(tab => tab.classList.remove('active'));
    viewContent.querySelector(`.sub-nav-tab[data-subview="${subviewName}"]`)?.classList.add('active');

    // Cargar los datos de la pestaña activa
    if (subviewName === 'personas') {
        loadAndRenderPersonas();
    } else if (subviewName === 'vehiculos') {
        loadAndRenderVehiculos();
    } else if (subviewName === 'establecimientos') {
        loadAndRenderEstablecimientos();
    }
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
}

function setupEventListeners() {
    if (!viewContent || viewContent.dataset.listenerAttached === 'true') return;

    viewContent.addEventListener('click', async (event) => {
        const button = event.target.closest('button');
        if (!button) return;

<<<<<<< HEAD
=======
        // Manejo de pestañas
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
        if (button.classList.contains('sub-nav-tab')) {
            switchSubview(button.dataset.subview);
            return;
        }

<<<<<<< HEAD
=======
        // --- Botones de "Crear Nuevo" ---
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
        if (button.id === 'create-persona-btn') openPersonaModal(loadAndRenderPersonas);
        if (button.id === 'create-vehiculo-btn') openVehiculoModal(loadAndRenderVehiculos);
        if (button.id === 'create-establecimiento-btn') openEstablecimientoModal(loadAndRenderEstablecimientos);
        
<<<<<<< HEAD
        // --> NUEVO: Listener para el botón de búsqueda de personas
=======
        // --- Botones de Búsqueda ---
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
        if (button.id === 'personas-search-btn') {
            const searchTerm = viewContent.querySelector('#personas-search-input').value;
            loadAndRenderPersonas(searchTerm);
        }
        
<<<<<<< HEAD
        // --> MODIFICADO: Lógica de búsqueda de vehículos ya presente, se mantiene
=======
        // ✅ LÓGICA AÑADIDA PARA EL BUSCADOR DE VEHÍCULOS
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
        if (button.id === 'vehiculos-search-btn') {
            const searchTerm = viewContent.querySelector('#vehiculos-search-input').value;
            loadAndRenderVehiculos(searchTerm);
        }
        
<<<<<<< HEAD
        // --> NUEVO: Listener para el botón de búsqueda de establecimientos
=======
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
        if (button.id === 'establecimientos-search-btn') {
            const searchTerm = viewContent.querySelector('#establecimientos-search-input').value;
            loadAndRenderEstablecimientos(searchTerm);
        }
<<<<<<< HEAD
    });

    // --> NUEVO: Función genérica para añadir listeners de tecla "Enter"
    const addEnterKeyListener = (inputId, callback) => {
        const input = viewContent.querySelector(`#${inputId}`);
        if (input) {
            input.addEventListener('keyup', (event) => {
                if (event.key === 'Enter') {
                    callback(event.target.value);
                }
            });
        }
    };

    addEnterKeyListener('personas-search-input', loadAndRenderPersonas);
    addEnterKeyListener('vehiculos-search-input', loadAndRenderVehiculos);
    addEnterKeyListener('establecimientos-search-input', loadAndRenderEstablecimientos);
=======

        // --- Botones de acción en las tablas (editar, etc.) ---
        // ... (el resto de tu lógica de clics no cambia)
    });

    // ✅ LÓGICA AÑADIDA PARA BUSCAR CON LA TECLA "ENTER"
    const vehiculoSearchInput = viewContent.querySelector('#vehiculos-search-input');
    if(vehiculoSearchInput) {
        vehiculoSearchInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                loadAndRenderVehiculos(event.target.value);
            }
        });
    }
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33

    viewContent.dataset.listenerAttached = 'true';
}

// --- FUNCIÓN PRINCIPAL EXPORTADA ---

export function renderIdentificacionesView() {
    if (!isInitialized) {
        viewContent = document.getElementById('identificaciones-view-content');
        personasContainer = document.getElementById('personas-list-container');
        vehiculosContainer = document.getElementById('vehiculos-list-container');
        establecimientosContainer = document.getElementById('establecimientos-list-container');
        
        setupEventListeners();
        isInitialized = true;
    }
<<<<<<< HEAD
=======
    // Cargar la vista por defecto (Personas)
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
    switchSubview('personas');
}