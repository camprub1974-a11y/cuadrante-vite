// js/ui/croquisView.js (VERSIÓN CON PAGINACIÓN)

import { showLoading, hideLoading, displayMessage } from './viewManager.js';
import { initializeCroquisModal, openCroquisModal } from './croquisModal.js';
import { getSketches, deleteSketch, getSketchById } from '../dataController.js';
import { formatDate } from '../utils.js';
import { currentUser } from '../state.js';

let listContainer, filterLugar, filterFecha, filterImplicados, applyFiltersBtn, clearFiltersBtn;
let isInitialized = false;

// --- Variables de estado para la paginación ---
let currentPage = 1;
let pageStartCursors = [null]; // Guarda el cursor para el inicio de cada página. Página 1 no tiene cursor.
let hasNextPage = false;
let currentFilters = {};

export function initializeCroquisView() {
  if (isInitialized) return;
  initializeCroquisModal();

  listContainer = document.getElementById('croquis-list-container');
  const createCroquisBtn = document.getElementById('create-croquis-btn');
  filterLugar = document.getElementById('croquis-filter-lugar');
  filterFecha = document.getElementById('croquis-filter-fecha');
  filterImplicados = document.getElementById('croquis-filter-implicados');
  applyFiltersBtn = document.getElementById('apply-croquis-filters-btn');
  clearFiltersBtn = document.getElementById('clear-croquis-filters-btn');
  const paginationControls = document.getElementById('croquis-pagination-controls');

  if (!listContainer || !createCroquisBtn || !paginationControls) {
    console.error('Faltan elementos de la interfaz en la vista de Croquis.');
    return;
  }

  createCroquisBtn.addEventListener('click', () => openCroquisModal(renderCroquisView));
  listContainer.addEventListener('click', handleTableClicks);
  applyFiltersBtn.addEventListener('click', applyFiltersAndRender);
  clearFiltersBtn.addEventListener('click', clearFiltersAndRender);
  paginationControls.addEventListener('click', handlePaginationClick);

  isInitialized = true;
}

export async function renderCroquisView() {
  if (!isInitialized) {
    initializeCroquisView();
  }
  currentPage = 1;
  pageStartCursors = [null];
  currentFilters = {};
  await loadAndRenderSketches();
}

async function loadAndRenderSketches() {
  showLoading('Cargando croquis...');
  try {
    const startAfterDoc = pageStartCursors[currentPage - 1];
    const { sketches, lastVisible } = await getSketches({ startAfterDoc: startAfterDoc, limit: 15 });
    
    hasNextPage = !!lastVisible; // Hay siguiente página si Firestore nos devuelve un cursor
    if (hasNextPage && pageStartCursors.length === currentPage) {
      pageStartCursors.push(lastVisible);
    }
    
    renderSketchesTable(sketches); // Filtros se aplicarán en un futuro
    updatePaginationControls(sketches.length);

  } catch (error) {
    displayMessage(`Error al cargar croquis: ${error.message}`, 'error');
  } finally {
    hideLoading();
  }
}

function handlePaginationClick(event) {
  const targetId = event.target.id;
  if (targetId === 'croquis-next-page' && hasNextPage) {
    currentPage++;
    loadAndRenderSketches();
  } else if (targetId === 'croquis-prev-page' && currentPage > 1) {
    currentPage--;
    loadAndRenderSketches();
  }
}

function updatePaginationControls(recordCount) {
  const pageInfo = document.getElementById('croquis-page-info');
  const prevButton = document.getElementById('croquis-prev-page');
  const nextButton = document.getElementById('croquis-next-page');

  if(pageInfo) pageInfo.textContent = `Página ${currentPage}`;
  if(prevButton) prevButton.disabled = currentPage === 1;
  if(nextButton) nextButton.disabled = !hasNextPage || recordCount < 15;
}


// --- El resto de tus funciones (handleTableClicks, renderSketchesTable, etc.) no necesitan cambios ---
// (Asegúrate de que estén aquí)

function applyFiltersAndRender() { /* Lógica de filtros a implementar en el futuro */ displayMessage('Función de filtros no implementada aún.', 'info'); }
function clearFiltersAndRender() { /* Lógica de filtros a implementar en el futuro */ displayMessage('Función de filtros no implementada aún.', 'info'); }

async function handleTableClicks(event) {
  const btn = event.target.closest('button');
  if (!btn) return;
  const sketchId = btn.closest('tr')?.dataset.id;
  if (!sketchId) return;

  if (btn.classList.contains('view-sketch-btn')) {
    const sketch = (await getSketches({limit: 100})).sketches.find(s => s.id === sketchId); // Búsqueda simple, a mejorar
    if (sketch && sketch.imageUrl) window.open(sketch.imageUrl, '_blank');
  } else if (btn.classList.contains('edit-sketch-btn')) {
    const sketchToEdit = await getSketchById(sketchId);
    openCroquisModal(renderCroquisView, sketchToEdit);
  } else if (btn.classList.contains('pdf-sketch-btn')) {
    // Lógica para PDF
  } else if (btn.classList.contains('delete-sketch-btn')) {
    if (confirm('¿Seguro que quieres eliminar este croquis?')) {
      await deleteSketch(sketchId);
      displayMessage('Croquis eliminado.', 'success');
      await renderCroquisView();
    }
  }
}

function renderSketchesTable(sketches) {
  if (!listContainer) return;
  if (!sketches || sketches.length === 0) {
    listContainer.innerHTML = '<p class="info-message">No se encontraron croquis.</p>';
    return;
  }
  const user = currentUser.get();
  const tableHtml = `
      <table class="data-table">
          <thead>
              <tr><th>Lugar</th><th>Fecha Suceso</th><th>Implicados</th><th>Documento</th><th>Acciones</th></tr>
          </thead>
          <tbody>
              ${sketches.map(sketch => {
                const canDelete = user && user.role === 'admin';
                return `
                <tr data-id="${sketch.id}">
                    <td>${sketch.lugar || '---'}</td>
                    <td>${sketch.fechaSuceso ? formatDate(sketch.fechaSuceso, 'dd/MM/yyyy HH:mm') : 'Fecha Inválida'}</td>
                    <td>${sketch.implicados || '---'}</td>
                    <td style="text-transform: capitalize;">${sketch.documentoRealizado || '---'}</td>
                    <td class="actions-cell">
                      <button class="icon-button button-secondary edit-sketch-btn" title="Editar Datos"><span class="material-icons">edit</span></button>
                      <button class="icon-button button-secondary view-sketch-btn" title="Ver Imagen del Croquis"><span class="material-icons">visibility</span></button>
                      ${canDelete ? `<button class="icon-button button-danger delete-sketch-btn" title="Eliminar Croquis"><span class="material-icons">delete</span></button>` : ''}
                    </td>
                    </td>
                </tr>
              `;}).join('')}
          </tbody>
      </table>
  `;
  listContainer.innerHTML = tableHtml;
}

export function resetCroquisView() {
  isInitialized = false;
  currentSketches = [];
}