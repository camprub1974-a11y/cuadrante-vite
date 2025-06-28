// js/logic.js

// Importar los átomos de Nanostores para el estado
import { selectedMonthId, scheduleData, availableAgents, currentUser, selectedAgentId, setScheduleData } from './state.js'; 
import { generateMonthsForYear, getMonthNumberFromName, formatDate } from './utils.js'; 
import { showLoading, hideLoading, displayMessage } from './ui/viewManager.js'; 
import { db, auth, app } from './firebase-config.js'; 
import { getFunctions, httpsCallable } from 'firebase/functions'; 
import { render as renderSchedule } from './ui/scheduleRenderer.js'; 
import { collection, doc, getDoc as firestoreGetDoc } from 'firebase/firestore'; 

const functions = getFunctions(app); 

async function initializeNewMonthData(monthId) {
    console.log(`[DEBUG - logic] Creando/Reinicializando cuadrante para: ${monthId}`); 
    const initialWeeksData = {}; 
    const parts = monthId.split('_'); 
    const year = parseInt(parts[2]); 
    const monthNameFromId = parts[1]; 

    const monthIndexJS = getMonthNumberFromName(monthNameFromId); 

    const startDate = new Date(year, monthIndexJS, 1); 
    const startDateISOString = startDate.toISOString(); 

    for (let i = 0; i < 6; i++) { 
        const weekDays = {}; 
        for (let j = 0; j < 7; j++) { 
            const d = new Date(startDate); 
            d.setDate(startDate.getDate() + (i * 7) + j); 
            weekDays[String(j)] = { date: d.toISOString().split('T')[0], shifts: {} }; 
        }
        initialWeeksData[String(i)] = { days: weekDays }; 
    }

    try {
        const currentAvailableAgents = availableAgents.get(); 
        const peopleToInitialize = currentAvailableAgents.map(agent => agent.id); 

        const user = auth.currentUser; 
        if (!user) { 
            displayMessage("Error: Inicia sesión para inicializar el cuadrante.", "error"); 
            throw new Error("Usuario no autenticado."); 
        }
        const idToken = await user.getIdToken(); 
        const initializeMonthCallable = httpsCallable(functions, 'initializeMonth'); 

        const payload = {
            monthId,
            year, 
            monthIndex: monthIndexJS, 
            peopleToInitialize,
        };

        const result = await initializeMonthCallable(payload); 
        const data = result.data; 

        if (data.status === 'success' || data.status === 'already_exists') { 
            displayMessage(data.message || "Cuadrante inicializado correctamente.", "success"); 
        } else {
            displayMessage(data.message || `Error: ${data.error?.message || "Error al inicializar el cuadrante."}`, "error"); 
            throw new Error(data.message || "Error en la función de inicialización."); 
        }
    } catch (e) {
        displayMessage(`Error inicializando ${monthId}: ${e.message}`, "error"); 
        console.error("Excepción al inicializar el mes:", e); 
        throw e; 
    }
}

export async function loadAndDisplaySchedule(monthId, personIdToDisplay, scheduleContent, currentMonthTitle, printButton, agentSelect, seasonalShiftNote) {
    if (typeof personIdToDisplay === 'undefined' || personIdToDisplay === null) {
        const user = currentUser.get(); 
        personIdToDisplay = (user?.role !== 'admin') ? user?.agentId : 'all'; 
    }

    console.log(`[DEBUG - logic] loadAndDisplaySchedule llamado con: monthId='${monthId}', personIdToDisplay='${personIdToDisplay}'`); 

    if (!scheduleContent || !currentMonthTitle || !printButton || !agentSelect || !seasonalShiftNote) {
        console.error("[ERROR - logic] Elementos del DOM esenciales no encontrados para loadAndDisplaySchedule. Algunos argumentos son null/undefined."); 
        console.error("scheduleContent:", scheduleContent, "currentMonthTitle:", currentMonthTitle, "printButton:", printButton, "agentSelect:", agentSelect, "seasonalShiftNote:", seasonalShiftNote); 
        hideLoading(); 
        return; 
    }

    printButton.disabled = true; 
    showLoading(); 

    if (!monthId) { 
        hideLoading(); 
        currentMonthTitle.textContent = "Error: Mes no especificado"; 
        scheduleContent.innerHTML = "<p>Error al cargar: Mes no especificado.</p>"; 
        if (agentSelect) agentSelect.innerHTML = ""; 
        console.warn("[DEBUG - logic] monthId no especificado. Abortando loadAndDisplaySchedule."); 
        return; 
    }

    const yearOfSelectedMonth = parseInt(monthId.split('_')[2]); 
    scheduleContent.innerHTML = '<p>Cargando cuadrante...</p>'; 
    console.log(`[DEBUG - logic] Intentando obtener documento del cuadrante: schedules/${monthId}`); 

    try {
        const scheduleDocRef = doc(db, 'schedules', monthId); 
        const docSnap = await firestoreGetDoc(scheduleDocRef); 

        if (docSnap.exists()) { 
            const data = docSnap.data(); 
            console.log("[DEBUG - logic] Cuadrante encontrado. Datos:", data); 
            
            if (!data.people || Object.keys(data.people).length === 0) { 
                console.warn("[DEBUG - logic] Cuadrante sin datos 'people' o vacío en Firestore. Usando availableAgents del estado."); 
                const currentAvailableAgentsMap = {}; 
                availableAgents.get().forEach(agent => { 
                    currentAvailableAgentsMap[String(agent.id)] = { id: String(agent.id), name: agent.name, active: agent.active }; 
                });
                data.people = currentAvailableAgentsMap; 
            } else {
                console.log("[DEBUG - logic] Cuadrante con datos 'people' existentes."); 
            }

            setScheduleData(data); 
            console.log("[DEBUG - logic] 'scheduleData' atom actualizado. Disparando renderizado."); 

            const user = auth.currentUser; 
            if (user) { 
                updateSeasonalNote(monthId, seasonalShiftNote); 
                printButton.disabled = false; 
            }
        } else {
            console.warn("[DEBUG - logic] Cuadrante NO encontrado en Firestore al cargar (docSnap.exists es false)."); 
            const user = currentUser.get(); 
            if (user?.role === 'admin') { 
                displayMessage("El cuadrante para este mes no existe. Se intentará inicializarlo.", "info"); 
                try {
                    await initializeNewMonthData(monthId); 
                    await loadAndDisplaySchedule(monthId, personIdToDisplay, scheduleContent, currentMonthTitle, printButton, agentSelect, seasonalShiftNote); 
                } catch (initError) {
                    displayMessage(`Error al inicializar: ${initError.message}`, "error"); 
                    console.error("ERROR - logic: Fallo en el reintento de inicialización:", initError); 
                }
            } else {
                displayMessage("El cuadrante para este mes aún no ha sido inicializado por un administrador. No disponible.", "error"); 
                scheduleContent.innerHTML = "<p class='clarification-note'>Cuadrante no disponible para este mes.</p>"; 
                if (agentSelect) agentSelect.innerHTML = ""; 
            }
        }
    } catch (e) {
        console.error("ERROR - logic: Error al cargar el cuadrante:", e); 
        scheduleContent.innerHTML = `<p class="clarification-note">Error al cargar el cuadrante o los agentes: ${e.message}</p>`; 
        if (agentSelect) agentSelect.innerHTML = ""; 
        scheduleData.set(null); 
        displayMessage(`Error: ${e.message}`, "error"); 
    } finally {
        hideLoading(); 
    }
}

// <--- FUNCIÓN EXPORTADA CORRECTAMENTE FUERA DE OTRA FUNCIÓN --->
export function updateSeasonalNote(monthId, noteElement) { 
    console.log("[DEBUG - logic] updateSeasonalNote llamado."); 
    console.log("[DEBUG - logic] monthId para nota estacional:", monthId); 
    console.log("[DEBUG - logic] Elemento de nota estacional (recibido como arg):", noteElement); 

    if (!noteElement) { 
        console.warn("[DEBUG - logic] Elemento 'seasonal-shift-note' no proporcionado a updateSeasonalNote o es nulo."); 
        return; 
    }

    const summerMonths = ['junio', 'julio', 'agosto', 'septiembre']; 
    const currentMonthName = monthId.split('_')[1].toLowerCase(); 
    
    console.log("[DEBUG - logic] Nombre del mes para nota estacional:", currentMonthName); 
    console.log("[DEBUG - logic] Es un mes de verano?", summerMonths.includes(currentMonthName)); 

    if (summerMonths.includes(currentMonthName)) { 
        noteElement.innerHTML = '<b>Nota de Temporada:</b> Turno de Mañana: 07:00 a 15:00H. Turno de Tarde: 15:00 a 23:00H.'; 
        noteElement.classList.remove('hidden'); 
        noteElement.style.display = 'block'; 
        console.log("[DEBUG - logic] Nota estacional: Mostrando para mes de verano."); 
    } else {
        noteElement.classList.add('hidden'); 
        noteElement.style.display = 'none'; 
        console.log("[DEBUG - logic] Nota estacional: Ocultando para mes que no es de verano."); 
    }
}