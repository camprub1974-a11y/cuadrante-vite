// js/print.js

// Importar los átomos de Nanostores para el estado
import { selectedAgentId, selectedMonthId, scheduleData } from './state.js';
// Importar funciones de UI
import { showLoading, hideLoading, displayMessage } from './ui/viewManager.js';
// Importar la función de renderizado del cuadrante principal
import { render as renderSchedule } from './ui/scheduleRenderer.js';
// Importar la función de nota estacional (necesaria para restaurarla después de imprimir)
import { updateSeasonalNote } from './logic.js';
// Importar utilidades de fecha para el cálculo de días de la semana y formato
import { formatDate, getShiftDisplayText, weekDays } from './utils.js'; 

/**
 * Mapeo de colores directos para impresión (para máxima compatibilidad si CSS variables fallan en impresión).
 */
const PRINT_SHIFT_COLORS = {
    'M': { bg: '#3b82f6', text: '#ffffff' },   
    'T': { bg: '#f59e0b', text: '#ffffff' },   
    'N': { bg: '#1f2937', text: '#ffffff' },   
    'L': { bg: '#10b981', text: '#ffffff' },   
    'V': { bg: '#8b5cf6', text: '#ffffff' },   
    'P': { bg: '#ec4899', text: '#ffffff' },   
    'B': { bg: '#ef4444', text: '#ffffff' },   
    '-': { bg: '#e2e8f0', text: '#64748b' },
    'PermisoSolicitud': { bg: '#32CD32', text: '#ffffff' }, 
    'Lc': { bg: '#8A2BE2', text: '#ffffff' }, 
    'ESB': { bg: '#FFD700', text: '#ffffff' }, 
    'CT': { bg: '#1E90FF', text: '#ffffff' }, 
    'AP': { bg: '#008080', text: '#ffffff' } 
};

// Función auxiliar para generar el HTML de una tabla de cuadrante
function generateTableHtml(daysData, agentsData, agentColWidthPx, totalPrintableWidthMm) {
    let tableHtml = '';
    const numDayColumns = daysData.length;
    const agentColWidthMm = agentColWidthPx * 0.264583; // Convertir px a mm
    const tableWidthMm = totalPrintableWidthMm; 
    const remainingWidthMm = tableWidthMm - agentColWidthMm;
    const dayColWidthMm = numDayColumns > 0 ? (remainingWidthMm / numDayColumns).toFixed(2) : 0;

    tableHtml += '<table class="print-schedule-table">';
    tableHtml += '<colgroup>';
    tableHtml += `<col style="width: ${agentColWidthPx}px;">`; // Ancho fijo para Agente
    daysData.forEach(() => {
        tableHtml += `<col style="width: ${dayColWidthMm}mm;">`; // Ancho en mm para cada columna de día
    });
    tableHtml += '</colgroup>';
    tableHtml += '<thead>';
    
    // Fila 1 de cabecera: Días del Mes (1, 2, 3...)
    tableHtml += '<tr>';
    tableHtml += '<th rowspan="2" class="agent-name-header">Agente</th>'; 
    daysData.forEach(day => {
        tableHtml += `<th class="day-number-header day-column">${day.number}</th>`; 
    });
    tableHtml += '</tr>';

    // Fila 2 de cabecera: Nombres de Días de la Semana (L, M, X...)
    tableHtml += '<tr>';
    daysData.forEach(day => {
        const date = new Date(day.date + 'T12:00:00'); 
        const dayOfWeekIndex = date.getDay(); 
        const dayNameShort = weekDays[dayOfWeekIndex === 0 ? 6 : dayOfWeekIndex - 1]; 
        tableHtml += `<th class="day-name-header day-column">${dayNameShort}</th>`;
    });
    tableHtml += '</tr>';
    tableHtml += '</thead>';
    tableHtml += '<tbody>';

    agentsData.forEach(agent => {
        const agentId = String(agent.id);
        const agentName = agent.name || `ID ${agentId}`; 
        tableHtml += `<tr><td class="agent-name-cell">${agentName}</td>`; 

        const agentShiftsMap = {};
        Object.keys(scheduleData.get().weeks).forEach(weekKey => {
            const week = scheduleData.get().weeks[weekKey];
            Object.keys(week.days).forEach(dayKey => {
                const day = week.days[dayKey];
                if (day && day.shifts) {
                    const shiftEntry = Object.values(day.shifts).find(s => String(s.agentId) === agentId);
                    if (shiftEntry) {
                        agentShiftsMap[day.date] = shiftEntry.shiftType;
                    }
                }
            });
        });

        daysData.forEach(day => {
            const shiftType = agentShiftsMap[day.date] || '-'; 
            const displayTxt = getShiftDisplayText(shiftType);
            const colors = PRINT_SHIFT_COLORS[displayTxt] || PRINT_SHIFT_COLORS['-'];
            tableHtml += `<td class="day-column"><span class="shift-display" style="background-color: ${colors.bg}; color: ${colors.text};" title="${shiftType}">${displayTxt}</span></td>`;
        });
        tableHtml += '</tr>';
    });
    tableHtml += '</tbody></table>'; 
    return tableHtml;
}


/**
 * Genera y muestra el cuadrante en formato de tabla para impresión.
 * @param {string|null} printPersonIdToFilter El TIP del agente a filtrar para la impresión,
 * o 'all' para todos los agentes, o null/undefined
 * para usar el filtro actual si no es 'all'.
 * @param {boolean} forceAllAgentsForPrint Si es true, ignora printPersonIdToFilter y imprime todos los agentes.
 */
function displayPrintScheduleView(printPersonIdToFilter, forceAllAgentsForPrint = false) {
    console.log("[DEBUG print.js] displayPrintScheduleView: Generando vista para impresión.");
    console.log(`[DEBUG print.js] printPersonIdToFilter: ${printPersonIdToFilter}, forceAllAgentsForPrint: ${forceAllAgentsForPrint}`);

    const printViewContainer = document.getElementById('print-view-container');
    
    if (!printViewContainer) { 
        console.error("ERROR: Contenedor de vista de impresión (#print-view-container) no encontrado. Asegúrate de que existe en index.html.");
        return; 
    }
    
    const currentScheduleData = scheduleData.get();
    if (!currentScheduleData || !currentScheduleData.weeks || !currentScheduleData.people) { 
        printViewContainer.innerHTML = '<p>No hay datos del cuadrante para imprimir.</p>';
        console.warn("WARN: No hay datos de cuadrante disponibles para impresión.");
        return;
    }

    // === INICIO: Recopilación y preparación de allDaysInPrintTable (MOVIDO AQUÍ) ===
    // Declarar selectedMonth aquí, ya que se usa en este ámbito y en el encabezado HTML
    const selectedMonth = selectedMonthId.get(); 
    const [_, monthNameFromId, yearFromId] = selectedMonth.split('_');
    const currentMonthNumber = new Date(Date.parse(monthNameFromId + ' 1, ' + yearFromId)).getMonth();


    const allDaysInPrintTable = []; 
    const datesProcessed = new Set(); 

    Object.keys(currentScheduleData.weeks)
        .sort((a, b) => parseInt(a.replace('week', '')) - parseInt(b.replace('week', '')))
        .forEach(weekKey => {
            const week = currentScheduleData.weeks[weekKey];
            Object.keys(week.days)
                .sort((a, b) => parseInt(a) - parseInt(b))
                .forEach(dayKey => {
                    const dayData = week.days[dayKey];
                    const dayDate = new Date(dayData.date + 'T12:00:00');
                    const dayMonthNumber = dayDate.getMonth();

                    if (dayData && dayMonthNumber === currentMonthNumber && !datesProcessed.has(dayData.date)) { 
                        allDaysInPrintTable.push(dayData);
                        datesProcessed.add(dayData.date);
                    }
                });
        });
    
    allDaysInPrintTable.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    // === FIN: Recopilación y preparación de allDaysInPrintTable ===


    let agentsToRender = Object.values(currentScheduleData.people);

    if (!forceAllAgentsForPrint) { 
        agentsToRender = agentsToRender.filter(agent => String(agent.id) === String(printPersonIdToFilter));
        console.log(`[DEBUG print.js] Filtrando para agente individual seleccionado: ${printPersonIdToFilter}`);
    } else { 
        console.log("[DEBUG print.js] Imprimiendo todos los agentes.");
    }
    
    if (agentsToRender.length === 0) {
        printViewContainer.innerHTML = '<p>No se encontraron agentes para la impresión según el filtro.</p>';
        console.warn("WARN: La lista de agentes para renderizar está vacía.");
        return;
    }

    agentsToRender.sort((a, b) => (a.name || String(a.id)).localeCompare(b.name || String(b.id)));
    console.log("[DEBUG print.js] Agentes a renderizar:", agentsToRender.map(a => a.name || a.id));

    let printHtml = '<div class="print-page-wrapper">'; 
    
    // Inyectar estilos de impresión directamente en el HTML generado
    printHtml += `
        <style>
            @media print {
                html, body {
                    margin: 0; 
                    padding: 0; 
                    font-family: sans-serif;
                    color: #000;
                    background-color: #fff;
                    -webkit-print-color-adjust: exact; 
                    print-color-adjust: exact;
                }
                body > *:not(#print-view-container) {
                    display: none !important;
                    height: 0 !important;
                    overflow: hidden !important;
                    visibility: hidden !important;
                }

                #print-view-container {
                    display: block !important; 
                    width: 100% !important; 
                    height: auto !important; 
                    margin: 0 auto !important; 
                    padding: 5mm !important; 
                    visibility: visible !important;
                    overflow: visible !important; 
                }

                .no-print { display: none !important; }


                .print-page-wrapper { 
                    padding: 0; 
                    box-sizing: border-box; 
                    display: flex; 
                    flex-direction: column;
                    justify-content: flex-start;
                    align-items: center;
                    width: 100%; 
                }

                .print-schedule-title { 
                    text-align: center; 
                    font-size: 1.5em; 
                    margin-bottom: 5px; 
                    color: #333;
                }
                .print-month-title { 
                    font-size: 1.1em; 
                    text-align: center; 
                    margin-bottom: 15px; 
                    color: #555;
                }
                
                /* Contenedor para las dos tablas (apilar verticalmente) */
                .print-tables-container {
                    display: flex; 
                    flex-direction: column; /* APILAR TABLAS VERTICALMENTE */
                    justify-content: flex-start;
                    width: 100%; 
                    gap: 10mm; 
                }

                .print-schedule-table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    table-layout: fixed; 
                    font-size: 0.7em; 
                    page-break-inside: avoid; 
                    margin-bottom: 0; 
                } 
                .print-schedule-table th, 
                .print-schedule-table td { 
                    border: 1px solid #e0e0e0; 
                    padding: 0.5px 0px; 
                    text-align: center; 
                    vertical-align: middle;
                    white-space: nowrap; 
                    overflow: hidden; 
                    text-overflow: ellipsis; 
                } 
                .print-schedule-table th { 
                    background-color: #f0f0f0; 
                    font-weight: bold;
                    color: #333;
                } 
                .print-schedule-table .agent-name-header {
                    width: 60px; 
                    min-width: 60px;
                    max-width: 60px;
                    text-align: left;
                    padding-left: 2px; 
                }
                .print-schedule-table .day-column {
                    /* El ancho se calculará dinámicamente */
                }
                .print-schedule-table .shift-display { 
                    display: inline-flex; 
                    justify-content: center;
                    align-items: center;
                    width: 18px; 
                    height: 18px; 
                    border-radius: 50%; 
                    font-size: 0.65em; 
                    font-weight: bold; 
                    line-height: 1; 
                    box-shadow: none; 
                    color: white; 
                }
            }
        </style>`;

    printHtml += `<h2 class="print-schedule-title">Cuadrante de Servicio</h2>`;
    // La variable selectedMonth ya está definida al inicio de la función para allDaysInPrintTable
    // const selectedMonth = selectedMonthId.get(); // ESTA LÍNEA ES LA QUE SE REMUEVE PARA EVITAR REDECLARACIÓN
    const fullMonthTitle = `${monthNameFromId.charAt(0).toUpperCase() + monthNameFromId.slice(1)} ${yearFromId}`;
    printHtml += `<h3 class="print-month-title">Mes de ${fullMonthTitle}</h3>`;

    // Dividir los días en dos mitades para las dos tablas
    const midPoint = Math.ceil(allDaysInPrintTable.length / 2);
    const firstHalfDays = allDaysInPrintTable.slice(0, midPoint);
    const secondHalfDays = allDaysInPrintTable.slice(midPoint);

    // Contenedor FLEX para las dos tablas (se apilarán verticalmente)
    printHtml += '<div class="print-tables-container">';

    // Generar la primera tabla
    // El ancho total disponible de la página A4 horizontal es 297mm. El padding de print-page-wrapper es 5mm*2=10mm.
    // Ancho útil = 297mm - 10mm = 287mm. Cada tabla usará 100% de este ancho.
    printHtml += generateTableHtml(firstHalfDays, agentsToRender, 60, 287); 
    
    // Generar la segunda tabla
    printHtml += generateTableHtml(secondHalfDays, agentsToRender, 60, 287);

    printHtml += '</div>'; // Cierre de print-tables-container
    printHtml += '</div>'; // Cierre de print-page-wrapper

    printViewContainer.innerHTML = printHtml;
    console.log("[DEBUG print.js] displayPrintScheduleView: HTML de impresión generado y adjuntado a printViewContainer.");
}


/**
 * Gestiona el evento de clic en el botón de imprimir.
 * Ahora muestra un modal de opciones de impresión.
 */
export function handlePrintButtonClick() {
    console.log("[DEBUG print.js] handlePrintButtonClick: Función de impresión iniciada.");

    showLoading(); 
    console.log("[DEBUG print.js] handlePrintButtonClick: showLoading() llamado."); 

    const printButton = document.getElementById('printButton');
    if (printButton) { 
        printButton.disabled = true; 
        console.log("[DEBUG print.js] handlePrintButtonClick: Botón de imprimir deshabilitado."); 
    }

    const printOptionsModal = document.createElement('div');
    printOptionsModal.className = 'modal print-options-modal';
    printOptionsModal.innerHTML = `
        <div class="modal-content">
            <h3>Opciones de Impresión</h3>
            <p>Selecciona el contenido a imprimir:</p>
            <div style="display:flex; flex-direction:column; gap:10px; margin-bottom: 20px;">
                <label>
                    <input type="radio" name="printScope" value="current" checked> Cuadrante actual (agente/vista seleccionada)
                </label>
                <label>
                    <input type="radio" name="printScope" value="all_agents"> Todos los agentes del mes
                </label>
            </div>
            <button id="confirmPrintOptions" class="button">Imprimir</button>
            <button id="cancelPrintOptions" class="button button-secondary">Cancelar</button>
        </div>
    `;
    document.body.appendChild(printOptionsModal);
    
    printOptionsModal.classList.remove('hidden'); 
    console.log("[DEBUG print.js] handlePrintButtonClick: Modal de opciones de impresión creado, adjuntado y clase 'hidden' eliminada."); 

    hideLoading(); 
    console.log("[DEBUG print.js] handlePrintButtonClick: hideLoading() llamado."); 

    const confirmButton = document.getElementById('confirmPrintOptions');
    const cancelButton = document.getElementById('cancelPrintOptions');

    if (confirmButton) {
        confirmButton.addEventListener('click', () => {
            const selectedScope = document.querySelector('input[name="printScope"]:checked').value;
            printOptionsModal.remove(); 

            showLoading(); 

            const appContent = document.getElementById('app-content');
            const printViewContainer = document.getElementById('print-view-container');
            const controlsPanel = document.getElementById('controls-panel');
            const seasonalShiftNote = document.getElementById('seasonal-shift-note');
            const appHeader = document.getElementById('app-header'); 


            // Ocultar la UI principal: Añadir la clase 'no-print' a los elementos.
            if(appContent) appContent.classList.add('no-print'); 
            if(controlsPanel) controlsPanel.classList.add('no-print'); 
            if(seasonalShiftNote) seasonalShiftNote.classList.add('no-print'); 
            if(appHeader) appHeader.classList.add('no-print'); 

            // Asegurar que el contenedor de impresión está visible y tiene la clase correcta para el CSS
            if(printViewContainer) {
                printViewContainer.classList.remove('hidden-initial'); 
                printViewContainer.classList.add('is-printing-active'); 
            }

            const currentSelectedAgentId = selectedAgentId.get();
            const currentSelectedMonthId = selectedMonthId.get();

            displayPrintScheduleView(currentSelectedAgentId, selectedScope === 'all_agents');

            setTimeout(() => {
                window.print(); 

                console.log("[DEBUG print.js] *** ESTADO DEL printViewContainer DESPUÉS DE IMPRIMIR ***");
                const currentPrintViewContainer = document.getElementById('print-view-container'); 
                if (currentPrintViewContainer) {
                    console.log(currentPrintViewContainer.innerHTML); 
                } else {
                    console.error("ERROR: printViewContainer no existe después de la impresión.");
                }
                console.log("[DEBUG print.js] *** FIN ESTADO printViewContainer DESPUÉS DE IMPRIMIR ***");

                // Restaurar la visibilidad de la UI principal
                if(printViewContainer) {
                    printViewContainer.classList.add('hidden-initial'); 
                    printViewContainer.classList.remove('is-printing-active'); 
                }
                if(appContent) appContent.classList.remove('no-print'); 
                if(controlsPanel) controlsPanel.classList.remove('no-print'); 
                if(seasonalShiftNote) seasonalShiftNote.classList.remove('no-print'); 
                if(appHeader) appHeader.classList.remove('no-print'); 

                const printButtonAfterPrint = document.getElementById('printButton');
                if (printButtonAfterPrint) { printButtonAfterPrint.disabled = false; } 
                
                renderSchedule(); 
                
                if (seasonalShiftNote) {
                    updateSeasonalNote(currentSelectedMonthId, seasonalShiftNote);
                }

                hideLoading();
            }, 500); 
        });
    } else {
        console.error("Error: Botón 'confirmPrintOptions' no encontrado.");
    }

    if (cancelButton) {
        cancelButton.addEventListener('click', () => {
            printOptionsModal.remove();
            if (printButton) { printButton.disabled = false; } 
        });
    } else {
        console.error("Error: Botón 'cancelPrintOptions' no encontrado.");
    }
}