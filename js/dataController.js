<<<<<<< HEAD
// js/dataController.js (CORREGIDO Y VALIDADO)
=======
// js/dataController.js (VERSIÓN COMPLETA, CORREGIDA Y VALIDADA)
>>>>>>> 755f45b7c267bfffa0ee6a809a10400904711786

import {
    collection,
    query,
    where,
    orderBy,
    getDocs,
    doc,
    addDoc,
    getDoc,
    serverTimestamp,
    documentId,
    Timestamp,
    setDoc,
    updateDoc,
    deleteDoc,
    limit,
<<<<<<< HEAD
    limit as limitQuery,  // <-- AÑADIR ESTO
    getCountFromServer,
    startAfter,
    writeBatch
} from 'firebase/firestore';
// 💡 IMPORTACIÓN DE AUTH AÑADIDA PARA FIABILIDAD
import { getAuth } from 'firebase/auth';
import { db, functions, app, storage } from './firebase-config.js';
import { ref, listAll, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { selectedMonthId, currentUser, setAvailableAgents, setPendingTasksCount, setPendingRequestsCount, availableAgents } from './state.js';
import { parseISO, endOfMonth, startOfMonth } from 'date-fns';
import { getMonthNumberFromName } from './utils.js';
import { toZonedTime } from 'date-fns-tz';

export { storage };

=======
    startAfter,
} from 'firebase/firestore';
import { db, app, storage } from './firebase-config.js';
import { ref, listAll, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { currentUser, setAvailableAgents, setPendingTasksCount, setPendingRequestsCount, availableAgents } from './state.js';
import { parseISO, endOfMonth } from 'date-fns';
import { getMonthNumberFromName } from './utils.js';
import { toZonedTime } from 'date-fns-tz';

const functions = getFunctions(app, 'us-central1');
>>>>>>> 755f45b7c267bfffa0ee6a809a10400904711786
const MADRID_TIMEZONE = 'Europe/Madrid';

// --- Función de ayuda interna para traducir turnos ---
/**
 * Traduce el tipo de turno de palabra completa (ej. "Mañana") a carácter (ej. "M").
 * @param {string} shiftType El tipo de turno del frontend.
 * @returns {string} El tipo de turno traducido ("M", "T") o el original si no se reconoce.
 */
function translateShiftType(shiftType) {
  if (typeof shiftType !== 'string') {
    return shiftType; // Devuelve el valor original si no es un string
  }
  
  const lowerShiftType = shiftType.toLowerCase();
  
  if (lowerShiftType.startsWith('mañana')) {
    return 'M';
  }
  if (lowerShiftType.startsWith('tarde')) {
    return 'T';
  }
  
  // Si ya es "M" o "T", o algo desconocido, lo devuelve tal cual
  return shiftType; 
}

// --- Función de ayuda interna para traducir fechas DD/MM/YYYY ---
/**
 * @param {string} dateStr - Fecha en formato "DD/MM/YYYY"
 * @returns {string} - Fecha en formato ISO "YYYY-MM-DD"
 */
function parseDateToISO(dateStr) {
  if (typeof dateStr !== 'string' || dateStr.length !== 10) {
    return dateStr; // Devuelve el original si no es el formato esperado
  }
  const parts = dateStr.split('/');
  if (parts.length !== 3) {
    return dateStr; // Formato no válido
  }
  // parts[0] = DD, parts[1] = MM, parts[2] = YYYY
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

// --- ÓRDENES Y PARTES DE SERVICIO ---

export async function countAllDocumentTemplates() {
  try {
    const templatesCol = collection(db, 'documentTemplates'); // O el nombre de tu colección
    const snapshot = await getCountFromServer(templatesCol);
    return snapshot.data().count;
  } catch (error) {
    console.error("Error contando documentos:", error);
    throw error; // Propaga el error para que lo maneje la vista
  }
}

export async function createServiceOrder(orderData) {
<<<<<<< HEAD
    const callable = httpsCallable(functions, 'createServiceOrder');
    return callable(orderData).then((result) => result.data);
}

export async function updateServiceOrder(orderId, updateData) {
    const callable = httpsCallable(functions, 'updateServiceOrder');
    return callable({ orderId, updateData }).then((result) => result.data);
=======
    const callable = httpsCallable(functions, 'createServiceOrder');
    return callable(orderData).then((result) => result.data);
}

export async function updateServiceOrder(orderId, updateData) {
    const callable = httpsCallable(functions, 'updateServiceOrder');
    return callable({ orderId, updateData }).then((result) => result.data);
}

export async function getServiceOrderById(orderId) {
    if (!orderId) throw new Error('Se requiere un ID de orden.');
    try {
        const orderRef = doc(db, 'serviceOrders', orderId);
        const docSnap = await getDoc(orderRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.service_date && typeof data.service_date.toDate === 'function') {
                data.service_date = data.service_date.toDate();
            }
            return { id: docSnap.id, ...data };
        } else {
            throw new Error('No se encontró ninguna orden de servicio con ese ID.');
        }
    } catch (error) {
        console.error('Error al obtener la orden de servicio por ID:', error);
        throw error;
    }
>>>>>>> 755f45b7c267bfffa0ee6a809a10400904711786
}

export async function getServiceOrderById(orderId) {
    if (!orderId) throw new Error('Se requiere un ID de orden.');
    try {
        const orderRef = doc(db, 'serviceOrders', orderId);
        const docSnap = await getDoc(orderRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.service_date && typeof data.service_date.toDate === 'function') {
                data.service_date = data.service_date.toDate();
            }
            return { id: docSnap.id, ...data };
        } else {
            throw new Error('No se encontró ninguna orden de servicio con ese ID.');
        }
    } catch (error) {
        console.error('Error al obtener la orden de servicio por ID:', error);
        throw error;
    }
}

/**
 * Obtiene las órdenes de servicio DIRECTAMENTE de Firestore (Cliente).
 * Esto soluciona el problema de IDs perdidos en la Cloud Function.
 */
export async function getServiceOrders(filters = {}) {
<<<<<<< HEAD
    console.log("[DataController] Obteniendo órdenes vía Firestore Directo...", filters);
    
    try {
        const { startDate, endDate, limit: limitVal, status, type } = filters;
        
        // 1. Referencia base
        const ordersRef = collection(db, 'serviceOrders');
        let constraints = [];

        // 2. Filtros de Fecha (Requeridos para que no traiga todo el historial)
        if (startDate && endDate) {
            // Aseguramos que sean fechas de inicio y fin del día
            const start = new Date(startDate);
            const end = new Date(endDate);
            // Ajuste de horas si vienen como string "YYYY-MM-DD"
            if (startDate.length === 10) start.setHours(0,0,0,0);
            if (endDate.length === 10) end.setHours(23,59,59,999);

            constraints.push(where('service_date', '>=', Timestamp.fromDate(start)));
            constraints.push(where('service_date', '<=', Timestamp.fromDate(end)));
        }

        // 3. Otros filtros
        if (status && status !== 'all') {
            constraints.push(where('status', '==', status));
        }
        
        // Filtro de turno (service_shift) - Nota: Asegúrate de que el campo en DB es 'service_shift'
        // Si filters.type viene del dropdown de "Mañana/Tarde", úsalo aquí.
        if (type && type !== 'all') {
             constraints.push(where('service_shift', '==', type));
        }

        // 4. Ordenación y Límite
        constraints.push(orderBy('service_date', 'desc'));
        
        if (limitVal) {
            constraints.push(limit(limitVal));
        } else {
            constraints.push(limit(50)); // Límite de seguridad por defecto
        }

        // 5. Ejecutar Query
        const q = query(ordersRef, ...constraints);
        const snapshot = await getDocs(q);

        // 6. Mapeo Seguro (Aquí garantizamos el ID)
        const orders = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id, // 👈 GARANTIZADO PORQUE LEEMOS EL DOC LOCALMENTE
                ...data,
                // Convertir Timestamp a String ISO para que React no falle
                service_date: data.service_date?.toDate ? data.service_date.toDate().toISOString() : data.service_date,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null
            };
        });

        console.log(`[DataController] ${orders.length} órdenes recuperadas con ID.`);
        return { success: true, orders: orders };

    } catch (error) {
        console.error("Error crítico en getServiceOrders (Directo):", error);
        // Si falla por falta de índice, Firebase te dará un link en la consola.
        // Devolvemos array vacío para no romper la página.
        return { success: false, orders: [], error: error.message };
    }
}

export async function getPendingTasksForAgents(agentIds) {
    const callable = httpsCallable(functions, 'getPendingTasksForAgents');
    try {
        const result = await callable({ agentIds });
        return result.data;
    } catch (error) {
        console.error("Error al llamar a getPendingTasksForAgents:", error);
        throw new Error('No se pudo verificar el estado de las tareas pendientes.');
    }
}

// ==========================================================
// ⭐️ INICIO DE LA CORRECCIÓN - PROBLEMA 1
// ==========================================================
export async function generateAiServiceOrder(date, shiftType) {
    const callable = httpsCallable(functions, 'generateAiServiceOrder');
    
    const translatedShiftType = translateShiftType(shiftType);
    
    // ⭐️ INICIO DE LA SOLUCIÓN
    // El 'date' que llega es "05/11/2025". El backend espera "2025-11-05".
    const isoDate = parseDateToISO(date);
    // ⭐️ FIN DE LA SOLUCIÓN

    console.log(`[generateAiServiceOrder] Solicitando sugerencia IA. Fecha (original): ${date}, Fecha (enviada): ${isoDate}, Turno (enviado): ${translatedShiftType}`);

    try {
        // ⭐️ ENVIAMOS LA FECHA CORREGIDA (isoDate)
        const result = await callable({ date: isoDate, shiftType: translatedShiftType });
        
        if (result.data.success) {
            return result.data;
        } else {
            throw new Error(result.data.message || 'La función de IA devolvió un error.');
        }
    } catch (error) {
        console.error("Error al llamar a la Cloud Function 'generateAiServiceOrder':", error);
        throw error;
    }
}
// ==========================================================
// ⭐️ FIN DE LA CORRECCIÓN - PROBLEMA 1
// ==========================================================

export async function generarInformeManualPDF(data) {
    const callable = httpsCallable(functions, 'generarInformeManualPDF');
    try {
        const result = await callable(data);
        return result.data;
    } catch (error) {
        console.error("Error al llamar a la Cloud Function 'generarInformeManualPDF':", error);
        throw error;
    }
}

export async function assignResourcesToOrder(assignmentData) {
    const callable = httpsCallable(functions, 'assignResourcesToOrder');
    return callable(assignmentData).then((result) => result.data);
}

export async function startServiceOrder(orderId) {
    const callable = httpsCallable(functions, 'startServiceOrder');
    return callable({ orderId }).then((result) => result.data);
=======
    const callable = httpsCallable(functions, 'getServiceOrders');
    return callable(filters).then((result) => result.data);
}

export async function getPendingTasksForAgents(agentIds) {
    const callable = httpsCallable(functions, 'getPendingTasksForAgents');
    try {
        const result = await callable({ agentIds });
        return result.data;
    } catch (error) {
        console.error("Error al llamar a getPendingTasksForAgents:", error);
        throw new Error('No se pudo verificar el estado de las tareas pendientes.');
    }
}

export async function generateAiServiceOrder(date, shiftType) {
    const callable = httpsCallable(functions, 'generateAiServiceOrder');
    try {
        const result = await callable({ date, shiftType });
        if (result.data.success) {
            return result.data;
        } else {
            throw new Error(result.data.message || 'La función de IA devolvió un error.');
        }
    } catch (error) {
        console.error("Error al llamar a la Cloud Function 'generateAiServiceOrder':", error);
        throw error;
    }
}

export async function generarInformeManualPDF(data) {
    const callable = httpsCallable(functions, 'generarInformeManualPDF');
    try {
        const result = await callable(data);
        return result.data;
    } catch (error) {
        console.error("Error al llamar a la Cloud Function 'generarInformeManualPDF':", error);
        throw error;
    }
}

export async function assignResourcesToOrder(assignmentData) {
    const callable = httpsCallable(functions, 'assignResourcesToOrder');
    return callable(assignmentData).then((result) => result.data);
}

export async function startServiceOrder(orderId) {
    const callable = httpsCallable(functions, 'startServiceOrder');
    return callable({ orderId }).then((result) => result.data);
>>>>>>> 755f45b7c267bfffa0ee6a809a10400904711786
}

// ============================================================
// 2. MODIFICAR: Función para añadir Entrada al Parte (El Puente)
// Detecta "urgente" y crea la novedad automáticamente
// ============================================================
export async function addReportEntry(entryData) {
    // 1. Llamada original a la Cloud Function para guardar la tarea en el parte
    const callable = httpsCallable(functions, 'addReportEntry');
<<<<<<< HEAD
    
    try {
        const result = await callable(entryData).then((res) => res.data);

        // 2. 🌉 EL PUENTE: Verificar si es urgente
        // Comprobamos si la prioridad es 'urgente' (o 'alta' según tu configuración)
        if (entryData.priority && entryData.priority.toLowerCase() === 'urgente') {
            console.log("[DataController] Tarea urgente detectada. Creando aviso en Tablón...");
            
            // Preparamos el mensaje para el tablón
            const avisoTitulo = `🔴 TAREA URGENTE - PARTE DE SERVICIO`;
            const avisoContenido = `Se ha registrado una nueva tarea urgente.\n\nDescripción: "${entryData.description}"\n\nRevisar el parte correspondiente para más detalles.`;

            // Llamamos a addNovedad(contenido, categoría, fijado, título)
            // Categoría 'urgente' hace que salga en la pestaña roja del tablón
            // isPinned = true hace que salga con la estrella arriba
            await addNovedad(avisoContenido, 'urgente', true, avisoTitulo)
                .catch(err => console.warn("Aviso: La tarea se guardó, pero falló al crear la novedad en el tablón.", err));
        }

        return result;

    } catch (error) {
        console.error("Error en addReportEntry:", error);
        throw error;
    }
}

export async function getReportForOrder(orderId) {
    const callable = httpsCallable(functions, 'getReportForOrder');
    return callable({ orderId }).then((result) => result.data);
}

export async function getServiceReportDetails(reportId) {
    const callable = httpsCallable(functions, 'getServiceReportDetails');
    try {
        const result = await callable({ reportId });
        if (result.data.success) {
            const report = result.data.report;
            if (report.order && report.order.service_date) {
                report.order.service_date = new Date(report.order.service_date);
            }
            if (report.requerimientos) {
                report.requerimientos.forEach(req => {
                    if (req.createdAt) req.createdAt = new Date(req.createdAt);
                });
            }
            if (report.specificTasks) {
                report.specificTasks.forEach(task => {
                    if (task.createdAt) task.createdAt = new Date(task.createdAt);
                    if (task.completedAt) task.completedAt = new Date(task.completedAt);
                });
            }
            // CORRECCIÓN: Devolver el objeto completo con success y report
            return {
                success: true,
                report: report,
                message: result.data.message || "Datos cargados correctamente"
            };
        } else {
            throw new Error(result.data.message || 'La función devolvió un error.');
        }
    } catch (error) {
        console.error('Error al llamar a getServiceReportDetails (Cloud Function):', error);
        throw error;
    }
=======
    return callable(entryData).then((result) => result.data);
}

export async function getReportForOrder(orderId) {
    const callable = httpsCallable(functions, 'getReportForOrder');
    return callable({ orderId }).then((result) => result.data);
}

export async function getServiceReportDetails(reportId) {
    const callable = httpsCallable(functions, 'getServiceReportDetails');
    try {
        const result = await callable({ reportId });
        if (result.data.success) {
            const report = result.data.report;
            if (report.order && report.order.service_date) {
                report.order.service_date = new Date(report.order.service_date);
            }
            if (report.requerimientos) {
                report.requerimientos.forEach(req => {
                    if (req.createdAt) req.createdAt = new Date(req.createdAt);
                });
            }
            if (report.specificTasks) {
                report.specificTasks.forEach(task => {
                    if (task.createdAt) task.createdAt = new Date(task.createdAt);
                    if (task.completedAt) task.completedAt = new Date(task.completedAt);
                });
            }
            return report;
        } else {
            throw new Error(result.data.message || 'La función devolvió un error.');
        }
    } catch (error) {
        console.error('Error al llamar a getServiceReportDetails (Cloud Function):', error);
        throw error;
    }
>>>>>>> 755f45b7c267bfffa0ee6a809a10400904711786
}

export async function submitServiceReport({ reportId }) { // 💡 AHORA ACEPTA OBJETO
    if (!reportId) {
        throw new Error("Falta el ID del parte para enviar a revisión.");
    }
    const callable = httpsCallable(functions, 'submitServiceReport');
    return callable({ reportId }).then((result) => result.data);
}

export async function validateServiceReport(validationData) {
<<<<<<< HEAD
    const callable = httpsCallable(functions, 'validateServiceReport');
    return callable(validationData).then((result) => result.data);
=======
    const callable = httpsCallable(functions, 'validateServiceReport');
    return callable(validationData).then((result) => result.data);
}

export async function getServiceReports(filters = {}) {
    const callable = httpsCallable(functions, 'getServiceReports');
    return callable(filters).then((result) => result.data);
>>>>>>> 755f45b7c267bfffa0ee6a809a10400904711786
}

// ==========================================================
// ⭐️ INICIO DE LA CORRECCIÓN - PROBLEMA 2
// ==========================================================
export async function createDefaultServiceOrders(date, templateShiftType) {
<<<<<<< HEAD
    const callable = httpsCallable(functions, 'createDefaultServiceOrders');
    
    const translatedShiftType = translateShiftType(templateShiftType);
    
    // ⭐️ APLICAMOS LA MISMA SOLUCIÓN DE FECHA AQUÍ
    const isoDate = parseDateToISO(date);

    console.log(`[createDefaultServiceOrders] Solicitando generación IA. Fecha (original): ${date}, Fecha (enviada): ${isoDate}, Turno (enviado): ${translatedShiftType}`);

    // Enviamos el valor traducido de fecha y turno
    return callable({ date: isoDate, templateShiftType: translatedShiftType }).then((result) => result.data);
=======
    const callable = httpsCallable(functions, 'createDefaultServiceOrders');
    return callable({ date, templateShiftType }).then((result) => result.data);
>>>>>>> 755f45b7c267bfffa0ee6a809a10400904711786
}
// ==========================================================
// ⭐️ FIN DE LA CORRECCIÓN - PROBLEMA 2
// ==========================================================

export async function updateChecklistItemStatus(data) {
<<<<<<< HEAD
    const callable = httpsCallable(functions, 'updateChecklistItemStatus');
    return callable(data).then((result) => result.data);
}

export async function generateNextOrderNumber(service_date) {
    const callable = httpsCallable(functions, 'generateNextOrderNumber');
    return callable({ service_date }).then((result) => result.data);
}

export async function deleteServiceOrder(orderId) {
    const callable = httpsCallable(functions, 'deleteServiceOrder');
    return callable({ orderId }).then((result) => result.data);
=======
    const callable = httpsCallable(functions, 'updateChecklistItemStatus');
    return callable(data).then((result) => result.data);
}

export async function generateNextOrderNumber(service_date) {
    const callable = httpsCallable(functions, 'generateNextOrderNumber');
    return callable({ service_date }).then((result) => result.data);
}

export async function deleteServiceOrder(orderId) {
    const callable = httpsCallable(functions, 'deleteServiceOrder');
    return callable({ orderId }).then((result) => result.data);
>>>>>>> 755f45b7c267bfffa0ee6a809a10400904711786
}

/**
 * Actualiza el resumen de un parte.
 * CORREGIDO: Ahora acepta un único objeto destructurado para coincidir con la llamada del Store.
 */
export async function updateReportSummary({ reportId, summaryData }) {
    // Validación básica antes de enviar
    if (!reportId) throw new Error("Falta el ID del parte.");
    if (!summaryData) throw new Error("Faltan los datos del resumen.");

    const callable = httpsCallable(functions, 'updateReportSummary');
<<<<<<< HEAD
    
    try {
        // Enviamos al backend la estructura correcta
        const result = await callable({ reportId, summaryData });
        return result.data;
    } catch (error) {
        console.error("Error en dataController.updateReportSummary:", error);
        throw error;
    }
}
/**
 * Añade un requerimiento a un parte.
 * CORREGIDO: Ahora acepta un único objeto con propiedades { reportId, data }
 * para ser compatible con la llamada desde reportStore.
 */
export async function addRequerimiento({ reportId, data }) {
    // Validación
    if (!reportId) {
        throw new Error('ID de parte de servicio no encontrado (reportId es null/undefined).');
    }
    if (!data) {
        throw new Error('No hay datos del requerimiento para enviar.');
    }

    const callable = httpsCallable(functions, 'addRequerimiento');
    
    try {
        // Enviamos al backend exactamente la estructura que espera: { reportId, data }
        const result = await callable({ reportId, data });
        return result.data;
    } catch (error) {
        console.error("Error en dataController.addRequerimiento:", error);
        throw error;
=======
    return callable({ reportId, summaryData }).then((result) => result.data);
}

export async function addRequerimiento(reportId, requerimientoData) {
    if (!reportId) {
        throw new Error('ID de parte de servicio no encontrado para añadir requerimiento.');
    }
    const callable = httpsCallable(functions, 'addRequerimiento');
    return callable({ reportId, data: requerimientoData }).then((result) => result.data);
}

export async function updateRequerimientoStatus(data) {
    const callable = httpsCallable(functions, 'updateRequerimientoStatus');
    return callable(data).then((result) => result.data);
}

export async function getRequerimientosForReport(reportId) {
    try {
        const reqsRef = collection(db, 'serviceReports', reportId, 'requerimientos');
        const q = query(reqsRef, orderBy('createdAt', 'asc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error al obtener los requerimientos:', error);
        throw new Error('No se pudieron cargar los requerimientos.');
>>>>>>> 755f45b7c267bfffa0ee6a809a10400904711786
    }
}

export async function updateRequerimientoStatus(data) {
    const callable = httpsCallable(functions, 'updateRequerimientoStatus');
    return callable(data).then((result) => result.data);
}

export async function getRequerimientosForReport(reportId) {
    try {
        const reqsRef = collection(db, 'serviceReports', reportId, 'requerimientos');
        const q = query(reqsRef, orderBy('createdAt', 'asc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error al obtener los requerimientos:', error);
        throw new Error('No se pudieron cargar los requerimientos.');
    }
}

export async function toggleRequerimientoStatus({ reportId, requerimientoId, isResolved }) {
    const callable = httpsCallable(functions, 'toggleRequerimientoStatus');
    try {
        // Ahora pasamos el objeto correctamente
        await callable({ reportId, requerimientoId, isResolved });
    } catch (error) {
        console.error("Error al llamar a la Cloud Function 'toggleRequerimientoStatus':", error);
        throw error;
    }
}

<<<<<<< HEAD
/**
 * Obtiene las órdenes de servicio activas para el agente actual.
 * (Versión Cliente - Firestore Directo)
 */
export async function getActiveServiceOrdersForAgent() {
    console.log("[DataController] Buscando órdenes activas (Firestore Directo)...");
    
    // 1. Obtener usuario de forma segura
    let user = currentUser.get();
    if (!user || !user.agentId) {
        const auth = getAuth();
        if (auth.currentUser) {
            // Intentar recuperar el ID si el estado global falló
            try {
                const token = await auth.currentUser.getIdTokenResult();
                user = { agentId: token.claims.agentId };
            } catch (e) {
                console.warn("No se pudo recuperar agentId del token");
            }
        }
    }

    if (!user || !user.agentId) {
        console.warn("No se puede buscar órdenes: Usuario no autenticado o sin agentId.");
        return [];
    }

    try {
        const agentIdStr = String(user.agentId);
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const ordersRef = collection(db, 'serviceOrders');
        
        // Buscamos órdenes donde el agente esté asignado
        // Nota: Firestore no permite buscar fácilmente en arrays de objetos complejos sin índices específicos.
        // Asumiendo que 'assigned_agents' es un array de IDs (strings) o que tienes un campo 'assignedAgentIds' array.
        // Si tu estructura guarda objetos completos en 'assigned_agents', necesitamos una estrategia diferente.
        
        // ESTRATEGIA: Buscar por fecha (que reduce mucho el set) y filtrar en memoria por agente.
        // Esto es eficiente porque no suele haber cientos de órdenes por día.
        
        const q = query(
            ordersRef, 
            where('service_date', '>=', Timestamp.fromDate(today)),
            where('service_date', '<=', Timestamp.fromDate(new Date(today.getTime() + 86400000))), // Final del día
            where('status', 'in', ['assigned', 'in_progress'])
        );
        
        const snapshot = await getDocs(q);
        
        // Filtrar en memoria si el agente está en la lista
        const myOrders = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(order => {
                // Comprobar si el agente está en la lista de asignados
                // Adaptar según tu estructura real:
                // Caso A: Array de strings ['123', '456']
                if (order.assignedAgentIds && order.assignedAgentIds.includes(agentIdStr)) return true;
                
                // Caso B: Array de objetos [{id: '123'}, {id: '456'}] (Tu estructura probable)
                if (order.assigned_agents && Array.isArray(order.assigned_agents)) {
                    return order.assigned_agents.some(a => String(a.id || a) === agentIdStr);
                }
                
                return false;
            })
            .map(order => ({
                ...order,
                service_date: order.service_date?.toDate ? order.service_date.toDate() : new Date(order.service_date)
            }));
            
        console.log(`[DataController] Órdenes activas encontradas: ${myOrders.length}`);
        return myOrders;

    } catch (error) {
        console.error("Error obteniendo órdenes activas:", error);
        // Devolvemos array vacío en vez de lanzar error para no romper la UI
        return []; 
=======
export async function getActiveServiceOrdersForAgent() {
    const callable = httpsCallable(functions, 'getActiveOrdersForAgentCallable');
    try {
        const result = await callable();
        if (result.data && result.data.success) {
            return result.data.orders.map(order => ({
                ...order,
                service_date: new Date(order.service_date)
            }));
        } else {
            throw new Error(result.data.message || 'La función del servidor devolvió un error.');
        }
    } catch (error) {
        console.error('Error al llamar a la Cloud Function getActiveOrdersForAgentCallable:', error);
        throw new Error('No se pudieron obtener las órdenes de servicio.');
>>>>>>> 755f45b7c267bfffa0ee6a809a10400904711786
    }
}

// --- AUTOMATIZACIÓN ---

export async function getAutomationConfig() {
    const docRef = doc(db, 'configuration', 'automation');
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : { autoGenerateOrders: false };
}

export async function setAutomationConfig(config) {
    const docRef = doc(db, 'configuration', 'automation');
    await setDoc(docRef, config, { merge: true });
}

// --- MÓDULO DE CROQUIS ---

export async function getCroquisAssets() {
<<<<<<< HEAD
    const assetsRef = ref(storage, 'croquis_assets');
    const assets = { vias: [], vehiculos: [], senales: [] };
    try {
        const folders = await listAll(assetsRef);
        for (const folderRef of folders.prefixes) {
            const category = folderRef.name;
            if (assets[category]) {
                const items = await listAll(folderRef);
                for (const itemRef of items.items) {
                    const url = await getDownloadURL(itemRef);
                    assets[category].push({
                        name: itemRef.name.split('.')[0],
                        url: url,
                    });
                }
            }
        }
        return assets;
    } catch (error) {
        console.error('Error al cargar los recursos para el croquis:', error);
        throw new Error('No se pudieron cargar los recursos del croquis.');
    }
=======
    const assetsRef = ref(storage, 'croquis_assets');
    const assets = { vias: [], vehiculos: [], senales: [] };
    try {
        const folders = await listAll(assetsRef);
        for (const folderRef of folders.prefixes) {
            const category = folderRef.name;
            if (assets[category]) {
                const items = await listAll(folderRef);
                for (const itemRef of items.items) {
                    const url = await getDownloadURL(itemRef);
                    assets[category].push({
                        name: itemRef.name.split('.')[0],
                        url: url,
                    });
                }
            }
        }
        return assets;
    } catch (error) {
        console.error('Error al cargar los recursos para el croquis:', error);
        throw new Error('No se pudieron cargar los recursos del croquis.');
    }
>>>>>>> 755f45b7c267bfffa0ee6a809a10400904711786
}

// 1. FUNCIÓN CORREGIDA: Subir Imagen
export async function uploadCroquisImage(file) {
<<<<<<< HEAD
    // --- SEGURIDAD: Obtener usuario con Fallback ---
    let user = currentUser.get();
    if (!user || !user.agentId) {
        const auth = getAuth();
        const fbUser = auth.currentUser;
        if (fbUser) {
            user = { uid: fbUser.uid, agentId: 'unknown' }; 
            try {
                const token = await fbUser.getIdTokenResult();
                if (token.claims.agentId) user.agentId = token.claims.agentId;
            } catch (e) { console.warn("No se pudo recuperar agentId para subida"); }
        }
    }

=======
    const user = currentUser.get();
>>>>>>> 755f45b7c267bfffa0ee6a809a10400904711786
    if (!user) throw new Error('Usuario no autenticado.');

    const timestamp = new Date().getTime();
    // Usamos un valor por defecto si el agentId falla, para no bloquear la subida
    const safeAgentId = user.agentId || 'agente';
    const fileName = `croquis_${safeAgentId}_${timestamp}.png`;
    const storageRef = ref(storage, `sketches/${fileName}`);

    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
}

// 2. FUNCIÓN CORREGIDA: Guardar Registro
export async function saveSketchRecord(sketchData) {
    // --- SEGURIDAD: Obtener usuario con Fallback ---
    let user = currentUser.get();
    if (!user || !user.uid || !user.agentId) {
<<<<<<< HEAD
        const auth = getAuth();
        const fbUser = auth.currentUser;
        if (fbUser) {
            user = { uid: fbUser.uid, agentId: 'unknown' };
            try {
                const token = await fbUser.getIdTokenResult();
                if (token.claims.agentId) user.agentId = token.claims.agentId;
            } catch (e) {}
        }
    }

    // Validación final
    if (!user || !user.uid) {
        throw new Error('No se pudo identificar al usuario para guardar el registro.');
=======
        throw new Error('Datos de usuario no válidos. No se puede guardar el croquis.');
>>>>>>> 755f45b7c267bfffa0ee6a809a10400904711786
    }
    const sketchPayload = {
        ...sketchData,
        createdAt: serverTimestamp(),
<<<<<<< HEAD
        createdByAgentId: user.agentId || 'unknown', // Evita fallo si es null
=======
        createdByAgentId: user.agentId,
>>>>>>> 755f45b7c267bfffa0ee6a809a10400904711786
        createdByUid: user.uid,
    };
    try {
        await addDoc(collection(db, 'sketches'), sketchPayload);
    } catch (error) {
        console.error('Error de Firestore al intentar guardar el croquis:', error);
        throw new Error('La base de datos rechazó la solicitud de guardado.');
    }
}

export async function getSketches(options = {}) {
<<<<<<< HEAD
    const { limit: queryLimit = 12, startAfterDoc, filters = {} } = options;
    
    // --- 1. SEGURIDAD ROBUSTA ---
    let user = currentUser.get();
    
    // Fallback si currentUser no está listo
    if (!user || !user.uid) {
        const auth = getAuth();
        const fbUser = auth.currentUser;
        if (fbUser) {
             // Intentamos obtener el token para saber el rol real
             try {
                const token = await fbUser.getIdTokenResult();
                user = { 
                    uid: fbUser.uid, 
                    role: token.claims.role || 'guard' 
                };
             } catch(e) {
                user = { uid: fbUser.uid, role: 'guard' };
             }
        }
    }
    
    if (!user || !user.uid) throw new Error('Usuario no autenticado.');

    const sketchesCol = collection(db, 'sketches');
    let queryConstraints = [];

    // --- 2. FILTROS ---
    
    // Filtro por Fecha
    if (filters.month) {
        const [yearStr, monthStr] = filters.month.split('-');
        const startDate = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
        const endDate = new Date(parseInt(yearStr), parseInt(monthStr), 0, 23, 59, 59, 999);
        queryConstraints.push(where('fechaSuceso', '>=', Timestamp.fromDate(startDate)));
        queryConstraints.push(where('fechaSuceso', '<=', Timestamp.fromDate(endDate)));
    } else if (filters.fecha) {
        const startDate = new Date(filters.fecha);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(filters.fecha);
        endDate.setHours(23, 59, 59, 999);
        queryConstraints.push(where('fechaSuceso', '>=', Timestamp.fromDate(startDate)));
        queryConstraints.push(where('fechaSuceso', '<=', Timestamp.fromDate(endDate)));
    }
    
    // Filtro por Tipo
    if (filters.tipo && filters.tipo !== 'all') {
        queryConstraints.push(where('documentoRealizado', '==', filters.tipo));
    }

    // 🛑 FILTRO DE SEGURIDAD ELIMINADO (CRÍTICO)
    // Anteriormente:
    /*
    const isAdmin = user.role === 'admin' || user.role === 'supervisor';
    if (!isAdmin) {
        queryConstraints.push(where('createdByUid', '==', user.uid));
=======
    const { limit: queryLimit = 15, startAfterDoc } = options;
    const user = currentUser.get();
    if (!user) throw new Error('Usuario no autenticado.');

    const sketchesCol = collection(db, 'sketches');
    let queryConstraints = [orderBy('fechaSuceso', 'desc')];

    if (user.role !== 'admin' && user.role !== 'supervisor') {
        queryConstraints.unshift(where('createdByUid', '==', user.uid));
    }
    if (startAfterDoc) {
        queryConstraints.push(startAfter(startAfterDoc));
    }
    queryConstraints.push(limit(queryLimit));

    const q = query(sketchesCol, ...queryConstraints);
    try {
        const querySnapshot = await getDocs(q);
        const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
        const sketches = querySnapshot.docs.map((doc) => {
            const data = doc.data();
            if (data.fechaSuceso && typeof data.fechaSuceso.toDate === 'function') {
                data.fechaSuceso = data.fechaSuceso.toDate();
            }
            return { id: doc.id, ...data };
        });
        return { sketches, lastVisible };
    } catch (error) {
        console.error('Error al obtener los croquis:', error);
        throw new Error('No se pudieron cargar los registros de croquis.');
>>>>>>> 755f45b7c267bfffa0ee6a809a10400904711786
    }
    */
    // Al eliminarlo, el usuario verá TODOS los croquis que cumplen los filtros de fecha/tipo.

    // Ordenación
    // NOTA: Si se usa un filtro de fecha, Firestore requerirá un índice compuesto
    // que incluya el campo 'documentoRealizado', 'createdByUid' (si se usara) y 'fechaSuceso'.
    // Si no se usa filtro de fecha, podemos simplemente ordenar por fecha.
    queryConstraints.push(orderBy('fechaSuceso', 'desc'));

    // Paginación
    if (startAfterDoc) {
        queryConstraints.push(startAfter(startAfterDoc));
    }
    queryConstraints.push(limitQuery(queryLimit + 1));

    const q = query(sketchesCol, ...queryConstraints);
    
    try {
        const querySnapshot = await getDocs(q);
        
        let sketches = querySnapshot.docs.map((doc) => {
            const data = doc.data();
            return { 
                id: doc.id, 
                ...data,
                // Normalización de fechas para la UI
                fechaSuceso: data.fechaSuceso?.toDate ? data.fechaSuceso.toDate() : new Date(data.fechaSuceso)
            };
        });

        // Filtrado en memoria para búsqueda de texto (Firestore no soporta 'contains')
        if (filters.lugar || filters.implicados) {
            const searchLower = (filters.lugar || filters.implicados).toLowerCase();
            sketches = sketches.filter(s => 
                (s.lugar && s.lugar.toLowerCase().includes(searchLower)) || 
                (s.implicados && s.implicados.toLowerCase().includes(searchLower))
            );
        }

        // Lógica de cursor para paginación
        let lastVisible = null;
        if (querySnapshot.docs.length > queryLimit) {
            lastVisible = querySnapshot.docs[queryLimit - 1];
            sketches = sketches.slice(0, queryLimit);
        }

        return { sketches, lastVisible };

    } catch (error) {
        console.error('Error getSketches:', error);
        // Si falta índice, este error ayudará a crearlo
        if (error.code === 'failed-precondition') {
            console.warn('⚠️ Falta índice compuesto en Firebase. Crea el índice sugerido en la consola.');
        }
        throw new Error('Error al cargar croquis. Verifica tu conexión.');
    }
}

export async function getSketchById(sketchId) {
<<<<<<< HEAD
    const docRef = doc(db, 'sketches', sketchId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.fechaSuceso && typeof data.fechaSuceso.toDate === 'function') {
            data.fechaSuceso = data.fechaSuceso.toDate();
        }
        return { id: docSnap.id, ...data };
    } else {
        throw new Error('El croquis no fue encontrado.');
    }
=======
    const docRef = doc(db, 'sketches', sketchId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.fechaSuceso && typeof data.fechaSuceso.toDate === 'function') {
            data.fechaSuceso = data.fechaSuceso.toDate();
        }
        return { id: docSnap.id, ...data };
    } else {
        throw new Error('El croquis no fue encontrado.');
    }
>>>>>>> 755f45b7c267bfffa0ee6a809a10400904711786
}

export async function updateSketch(sketchId, updateData) {
    const callable = httpsCallable(functions, 'updateSketch');
    const result = await callable({ sketchId, updateData });
    return result.data;
}

export async function generateSketchPdf(sketchId) {
<<<<<<< HEAD
  console.log(`[DataController] Solicitando PDF para sketch: ${sketchId}`);
  
  // 💡 CORRECCIÓN: Usar el nombre exacto del export en index.js (CamelCase)
  // Aunque la URL sea minúscula, el SDK prefiere el nombre de exportación.
  const generatePdfFn = httpsCallable(functions, 'generateSketchPdf');
  
  try {
    // Timeout alto para evitar cortes si el cold start es lento
    const result = await generatePdfFn({ sketchId }); // No pases options de timeout aquí si usas SDK v9 modular estándar, o pásalo si tu versión lo soporta
    
    console.log('[DataController] Respuesta:', result.data);
    
    if (result.data.success) {
        return result.data;
    } else {
        throw new Error("La función no devolvió success: true");
    }
  } catch (error) {
    console.error('[DataController] Error generando PDF:', error);
    // Relanzar con mensaje limpio
    throw new Error(error.message || 'Error al generar el PDF');
  }
=======
    const callable = httpsCallable(functions, 'generateSketchPdf', { timeout: 120000 });
    const result = await callable({ sketchId });
    return result.data;
>>>>>>> 755f45b7c267bfffa0ee6a809a10400904711786
}

export async function deleteSketch(sketchId) {
    const callable = httpsCallable(functions, 'deleteSketch');
    const result = await callable({ sketchId });
    return result.data;
}

// --- MÓDULO DE IDENTIFICACIONES ---

export async function getPersonas() {
    try {
        const personasRef = collection(db, 'personas');
        const q = query(personasRef, orderBy('apellidos'), orderBy('nombre'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error al obtener las personas:", error);
        throw new Error("No se pudieron cargar los datos de las personas.");
    }
}

export async function getVehiculos() {
    try {
        const vehiculosRef = collection(db, 'vehiculos');
        const q = query(vehiculosRef, orderBy(documentId()));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error al obtener los vehículos:", error);
        throw new Error("No se pudieron cargar los datos de los vehículos.");
    }
}

export async function getEstablecimientos() {
    try {
        const establecimientosRef = collection(db, 'establecimientos');
        const q = query(establecimientosRef, orderBy('nombreComercial'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error al obtener los establecimientos:", error);
        throw new Error("No se pudieron cargar los datos de los establecimientos.");
    }
}

// --- MÓDULO DE IDENTIFICACIONES ---

export async function getPersonas() {
    try {
        const personasRef = collection(db, 'personas');
        const q = query(personasRef, orderBy('apellidos'), orderBy('nombre'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error al obtener las personas:", error);
        throw new Error("No se pudieron cargar los datos de las personas.");
    }
}

export async function searchPersonas(searchTerm) {
    try {
        const personasRef = collection(db, 'personas');
        const qDni = query(personasRef, where('dni', '>=', searchTerm), where('dni', '<=', searchTerm + '\uf8ff'));
        const qNombre = query(personasRef, where('nombre', '>=', searchTerm), where('nombre', '<=', searchTerm + '\uf8ff'));
        const [dniSnapshot, nombreSnapshot] = await Promise.all([getDocs(qDni), getDocs(qNombre)]);
        const personasMap = new Map();
        dniSnapshot.forEach(doc => personasMap.set(doc.id, { id: doc.id, ...doc.data() }));
        nombreSnapshot.forEach(doc => personasMap.set(doc.id, { id: doc.id, ...doc.data() }));
        return Array.from(personasMap.values());
    } catch (error) {
        console.error("Error al buscar personas:", error);
        throw new Error("La búsqueda de personas falló.");
    }
}

export async function getVehiculos() {
    try {
        const vehiculosRef = collection(db, 'vehiculos');
        const q = query(vehiculosRef, orderBy(documentId()));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error al obtener los vehículos:", error);
        throw new Error("No se pudieron cargar los datos de los vehículos.");
    }
}

export async function getEstablecimientos() {
    try {
        const establecimientosRef = collection(db, 'establecimientos');
        const q = query(establecimientosRef, orderBy('nombreComercial'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error al obtener los establecimientos:", error);
        throw new Error("No se pudieron cargar los datos de los establecimientos.");
    }
}

// --- MÓDULO DE REGISTRO ELECTRÓNICO Y PLANTILLAS ---

export async function generateNextRegistrationNumber(data) {
<<<<<<< HEAD
    const callable = httpsCallable(functions, 'generateNextRegistrationNumber');
    return callable(data).then((result) => result.data);
}

export async function createRegistro(payload) {
    const callable = httpsCallable(functions, 'createRegistro');
    return callable(payload).then((result) => result.data);
}

export async function getRegistroById(recordId) {
    const docRef = doc(db, 'registros', recordId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
    } else {
        throw new Error('El registro no fue encontrado.');
    }
=======
    const callable = httpsCallable(functions, 'generateNextRegistrationNumber');
    return callable(data).then((result) => result.data);
}

export async function createRegistro(documentType, data) {
    const callable = httpsCallable(functions, 'createRegistro');
    return callable({ documentType, data }).then((result) => result.data);
}

export async function getRegistroById(recordId) {
    const docRef = doc(db, 'registros', recordId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
    } else {
        throw new Error('El registro no fue encontrado.');
    }
>>>>>>> 755f45b7c267bfffa0ee6a809a10400904711786
}

/**
 * Obtiene registros con filtros avanzados incluyendo tipo de documento
 * @param {Object} filters - Filtros a aplicar
 * @param {string} filters.direction - 'entrada' o 'salida'
 * @param {string|string[]} filters.status - Estado(s) a filtrar
 * @param {string} filters.documentType - Tipo de documento (opcional)
 * @param {number} filters.limit - Límite de resultados
 * @param {any} filters.startAfterDoc - Cursor para paginación
 * @returns {Promise<{success: boolean, registros: Array, lastVisible: any}>}
 */
export async function getRegistros(filters = {}) {
    const callable = httpsCallable(functions, 'getRegistros');
    try {
<<<<<<< HEAD
        // Construir objeto de filtros para enviar al backend
        const filterPayload = {
            direction: filters.direction,
            status: filters.status,
            limit: filters.limit,
            startAfterDoc: filters.startAfterDoc
        };

        // 💡 NUEVO: Incluir documentType si está presente
        if (filters.documentType) {
            filterPayload.documentType = filters.documentType;
        }

        // 💡 OPCIONAL: Incluir búsqueda si se implementa en backend
        if (filters.search) {
            filterPayload.search = filters.search;
        }

        const result = await callable(filterPayload);
        
        if (result.data && result.data.success) {
            const registrosConFechas = result.data.registros.map(reg => ({
                ...reg,
                createdAt: reg.createdAt ? new Date(reg.createdAt) : null,
                fechaPresentacion: reg.fechaPresentacion ? new Date(reg.fechaPresentacion) : null
            }));
            return {
                success: true,
                registros: registrosConFechas,
                lastVisible: result.data.lastVisible
            };
        } else {
            throw new Error(result.data.message || 'La función getRegistros del backend devolvió un error.');
        }
=======
        const result = await callable(filters);
        if (result.data && result.data.success) {
            const registrosConFechas = result.data.registros.map(reg => ({
                ...reg,
                createdAt: reg.createdAt ? new Date(reg.createdAt) : null,
                fechaPresentacion: reg.fechaPresentacion ? new Date(reg.fechaPresentacion) : null
            }));
            return {
                success: true,
                registros: registrosConFechas,
                lastVisible: result.data.lastVisible
            };
        } else {
            throw new Error(result.data.message || 'La función getRegistros del backend devolvió un error.');
        }
>>>>>>> 755f45b7c267bfffa0ee6a809a10400904711786
    } catch (error) {
        console.error("Error al llamar a la Cloud Function 'getRegistros':", error);
        throw error;
    }
}

export async function updateRegistro(recordId, data) {
<<<<<<< HEAD
    const callable = httpsCallable(functions, 'updateRegistro');
    return callable({ recordId, updateData: data }).then((result) => result.data);
}

export async function markRegistroAsDeleted(recordId, reason) {
    const callable = httpsCallable(functions, 'markRegistroAsDeleted');
    return callable({ recordId, reason }).then((result) => result.data);
}

export async function getDocumentTemplates(options = {}) {
  const { type = null, limit: queryLimit = 10, startAfter: startAfterDoc = null } = options;
  const templatesCol = collection(db, 'documentTemplates');
  let q;
  let queryConstraints = [orderBy('templateName'), limit(queryLimit + 1)];

  if (type && type !== 'all') {
    queryConstraints.unshift(where('documentType', '==', type));
  }

  if (startAfterDoc) {
    queryConstraints.push(startAfter(startAfterDoc));
  }

  q = query(templatesCol, ...queryConstraints);
  console.log(`[DEBUG - getDocumentTemplates] Query constraints:`, queryConstraints);

  try {
    const snapshot = await getDocs(q);
    const docs = snapshot.docs;
    console.log(`[DEBUG - getDocumentTemplates] Documentos recibidos (incluyendo extra): ${docs.length}`);

    let templates = [];
    let nextCursor = null;

    const hasNextPage = docs.length > queryLimit;
    console.log(`[DEBUG - getDocumentTemplates] Hay página siguiente (docs.length > queryLimit = ${docs.length} > ${queryLimit}): ${hasNextPage}`);


    if (hasNextPage) {
      templates = docs.slice(0, queryLimit).map(doc => ({ id: doc.id, ...doc.data() }));
      nextCursor = docs[queryLimit - 1];
      console.log(`[DEBUG - getDocumentTemplates] Siguiente cursor establecido al documento ID: ${nextCursor?.id}`);
    } else {
      templates = docs.map(doc => ({ id: doc.id, ...doc.data() }));
      nextCursor = null;
       console.log(`[DEBUG - getDocumentTemplates] No hay página siguiente, cursor nulo.`);
    }

    return { templates, nextCursor };

  } catch (error) {
    console.error("Error fetching document templates:", error);
    console.error("Query options:", options);
    throw new Error(`Could not fetch templates. Firestore error: ${error.message}`);
  }
}

export async function createDocumentTemplate(templateData) {
    const callable = httpsCallable(functions, 'createDocumentTemplate');
    return callable(templateData).then((result) => result.data);
}

export async function updateDocumentTemplate(templateId, updateData) {
    const callable = httpsCallable(functions, 'updateDocumentTemplate');
    return callable({ templateId, updateData }).then((result) => result.data);
}

export async function getTemplatesByType(documentType) {
    const templatesCol = collection(db, 'documentTemplates');
    
    if (documentType === 'all' || documentType === null || documentType === '') {
        const q = query(templatesCol, orderBy('templateName', 'asc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }
    
    const q = query(
        templatesCol, 
        where('documentType', '==', documentType), 
        orderBy('templateName', 'asc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function deleteDocumentTemplate(templateId) {
    const callable = httpsCallable(functions, 'deleteDocumentTemplate');
    return callable({ templateId }).then((result) => result.data);
}

export async function duplicateDocumentTemplate(templateId) {
    const callable = httpsCallable(functions, 'duplicateDocumentTemplate');
    try {
        const result = await callable({ templateId });
        if (result.data && result.data.success) {
            return result.data;
        } else {
            throw new Error(result.data.message || 'Error desconocido al duplicar la plantilla.');
        }
    } catch (error) {
        console.error('Error en dataController al llamar a duplicateDocumentTemplate:', error);
        throw error;
    }
}

export async function uploadTemplateImage(file) {
    if (!file) throw new Error('No se proporcionó ningún archivo para subir.');
    if (!file.type.startsWith('image/')) throw new Error('El archivo seleccionado no es una imagen.');
    try {
        const filePath = `template_images/${Date.now()}-${file.name}`;
        const storageRef = ref(storage, filePath);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    } catch (error) {
        console.error('Error en dataController al subir la imagen de la plantilla:', error);
        throw new Error('No se pudo subir la imagen.');
    }
=======
    const callable = httpsCallable(functions, 'updateRegistro');
    return callable({ recordId, updateData: data }).then((result) => result.data);
}

export async function markRegistroAsDeleted(recordId, reason) {
    const callable = httpsCallable(functions, 'markRegistroAsDeleted');
    return callable({ recordId, reason }).then((result) => result.data);
}

export async function getDocumentTemplates(options = {}) {
    const { limit: queryLimit = 15, startAfterDoc, documentType } = options;
    const templatesCol = collection(db, 'documentTemplates');
    let queryConstraints = [];

    if (documentType && documentType !== 'all') {
        queryConstraints.push(where('documentType', '==', documentType));
    }
    queryConstraints.push(orderBy('templateName', 'asc'));

    if (startAfterDoc) {
        queryConstraints.push(startAfter(startAfterDoc));
    }
    queryConstraints.push(limit(queryLimit));

    const q = query(templatesCol, ...queryConstraints);
    const querySnapshot = await getDocs(q);
    const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
    const templates = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { templates, lastVisible };
}

export async function createDocumentTemplate(templateData) {
    const callable = httpsCallable(functions, 'createDocumentTemplate');
    return callable(templateData).then((result) => result.data);
}

export async function updateDocumentTemplate(templateId, updateData) {
    const callable = httpsCallable(functions, 'updateDocumentTemplate');
    return callable({ templateId, updateData }).then((result) => result.data);
}

export async function getTemplatesByType(documentType) {
    const templatesCol = collection(db, 'documentTemplates');
    const q = query(templatesCol, where('documentType', '==', documentType), orderBy('templateName', 'asc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function deleteDocumentTemplate(templateId) {
    const callable = httpsCallable(functions, 'deleteDocumentTemplate');
    return callable({ templateId }).then((result) => result.data);
}

export async function duplicateDocumentTemplate(templateId) {
    const callable = httpsCallable(functions, 'duplicateDocumentTemplate');
    try {
        const result = await callable({ templateId });
        if (result.data && result.data.success) {
            return result.data;
        } else {
            throw new Error(result.data.message || 'Error desconocido al duplicar la plantilla.');
        }
    } catch (error) {
        console.error('Error en dataController al llamar a duplicateDocumentTemplate:', error);
        throw error;
    }
}

export async function uploadTemplateImage(file) {
    if (!file) throw new Error('No se proporcionó ningún archivo para subir.');
    if (!file.type.startsWith('image/')) throw new Error('El archivo seleccionado no es una imagen.');
    try {
        const filePath = `template_images/${Date.now()}-${file.name}`;
        const storageRef = ref(storage, filePath);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    } catch (error) {
        console.error('Error en dataController al subir la imagen de la plantilla:', error);
        throw new Error('No se pudo subir la imagen.');
    }
>>>>>>> 755f45b7c267bfffa0ee6a809a10400904711786
}

// --- OTRAS FUNCIONES ---

export async function loadInitialAgents() {
<<<<<<< HEAD
    const agentsCol = collection(db, 'agents');
    const q = query(agentsCol, orderBy(documentId()));
    const querySnapshot = await getDocs(q);
    const agentsList = querySnapshot.docs.map((doc) => ({ id: String(doc.id), ...doc.data() }));
    setAvailableAgents(agentsList);
    return agentsList;
}

export async function getPermissionTypes() {
    try {
        const typesCol = collection(db, 'permissionTypes');
        const q = query(typesCol, orderBy('name'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error al cargar los tipos de permiso:', error);
        throw error;
    }
}

export async function addSolicitud(requestData) {
    try {
        const userProfile = currentUser.get();
        if (!userProfile) throw new Error('Usuario no autenticado.');
        const solicitudPayload = {
            ...requestData,
            agentId: String(requestData.agentId),
            userId: userProfile.uid,
            status: 'Pendiente',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            attachments: requestData.attachments || [],
            startDate: Timestamp.fromDate(parseISO(requestData.startDate)),
            endDate: Timestamp.fromDate(requestData.endDate ? parseISO(requestData.endDate) : parseISO(requestData.startDate)),
        };
        await addDoc(collection(db, 'solicitudes'), solicitudPayload);
        return { success: true };
    } catch (error) {
        console.error('ERROR - dataController: Error añadiendo solicitud:', error);
        throw error;
    }
}

export async function uploadFile(file, path) {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);
    return new Promise((resolve, reject) => {
        uploadTask.on('state_changed', () => {}, (error) => {
            console.error('ERROR - dataController: Error al subir archivo:', error);
            reject(error);
        }, async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
        });
    });
}

export async function getSolicitudes(filters = {}) {
    // 1. Intentar obtener del estado local
    let userProfile = currentUser.get();

    // 2. Si falla, intentar obtener de Firebase Auth directo (Fallback de seguridad)
    if (!userProfile || !userProfile.uid) {
        // Asumiendo que getAuth se importa de firebase-config o es accesible
        const auth = getAuth(); 
        const fbUser = auth.currentUser;
        
        if (fbUser) {
            // Reconstruimos un perfil mínimo si hay sesión activa
            userProfile = {
                uid: fbUser.uid,
                role: 'guard', 
                agentId: 'unknown' 
            };
            
            // Intentar refrescar claims real (proceso asíncrono, puede no afectar esta ejecución)
            fbUser.getIdTokenResult().then(token => {
                currentUser.set({
                    uid: fbUser.uid,
                    role: token.claims.role || 'guard',
                    agentId: token.claims.agentId || 'unknown'
                });
            }).catch(console.error);
        }
    }

    // 3. Si sigue sin haber usuario, lanzamos error
    if (!userProfile || !userProfile.uid) {
        throw new Error('Usuario no autenticado. Por favor, recarga la página.');
    }
    
    const solicitudesRef = collection(db, 'solicitudes');
    let queryConstraints = [];

    const isAdmin = userProfile.role === 'admin' || userProfile.role === 'supervisor';

    // Lógica de filtrado de agentes y usuarios
    if (!isAdmin) {
=======
    const agentsCol = collection(db, 'agents');
    const q = query(agentsCol, orderBy(documentId()));
    const querySnapshot = await getDocs(q);
    const agentsList = querySnapshot.docs.map((doc) => ({ id: String(doc.id), ...doc.data() }));
    setAvailableAgents(agentsList);
    return agentsList;
}

export async function getPermissionTypes() {
    try {
        const typesCol = collection(db, 'permissionTypes');
        const q = query(typesCol, orderBy('name'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error al cargar los tipos de permiso:', error);
        throw error;
    }
}

export async function addSolicitud(requestData) {
    try {
        const userProfile = currentUser.get();
        if (!userProfile) throw new Error('Usuario no autenticado.');
        const solicitudPayload = {
            ...requestData,
            agentId: String(requestData.agentId),
            userId: userProfile.uid,
            status: 'Pendiente',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            attachments: requestData.attachments || [],
            startDate: Timestamp.fromDate(parseISO(requestData.startDate)),
            endDate: Timestamp.fromDate(requestData.endDate ? parseISO(requestData.endDate) : parseISO(requestData.startDate)),
        };
        await addDoc(collection(db, 'solicitudes'), solicitudPayload);
        return { success: true };
    } catch (error) {
        console.error('ERROR - dataController: Error añadiendo solicitud:', error);
        throw error;
    }
}

export async function uploadFile(file, path) {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);
    return new Promise((resolve, reject) => {
        uploadTask.on('state_changed', () => {}, (error) => {
            console.error('ERROR - dataController: Error al subir archivo:', error);
            reject(error);
        }, async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
        });
    });
}

export async function getSolicitudes(filters = {}) {
    const userProfile = currentUser.get();
    if (!userProfile || !userProfile.uid) throw new Error('Perfil de usuario o UID no disponible.');
    const solicitudesRef = collection(db, 'solicitudes');
    let queryConstraints = [];
    if (userProfile.role !== 'admin') {
>>>>>>> 755f45b7c267bfffa0ee6a809a10400904711786
        queryConstraints.push(where('userId', '==', userProfile.uid));
    } else if (filters.agentId && filters.agentId !== 'all') {
        queryConstraints.push(where('agentId', '==', String(filters.agentId)));
    }

    // Lógica de filtrado de estado
    if (filters.status && filters.status !== 'all') {
        queryConstraints.push(where('status', '==', filters.status));
    }

    // ============================================================
    // === 💡 FILTRO POR FECHA: Se hace en CLIENTE (no Firestore) ===
    // Razón: Queremos filtrar por startDate/endDate del permiso,
    // no por createdAt. Firestore no permite rangos en múltiples campos.
    // ============================================================

    queryConstraints.push(orderBy('createdAt', 'desc'));
<<<<<<< HEAD

=======
>>>>>>> 755f45b7c267bfffa0ee6a809a10400904711786
    const q = query(solicitudesRef, ...queryConstraints);
    
    try {
        const querySnapshot = await getDocs(q);
<<<<<<< HEAD
        
        // Primero mapeamos todos los documentos
        let results = querySnapshot.docs.map((doc) => {
            const data = doc.data();
            return { 
                id: doc.id, 
                ...data,
                // Conversión de Timestamps a Date objects para consumo en UI
                startDate: data.startDate?.toDate ? data.startDate.toDate() : new Date(data.startDate),
                endDate: data.endDate?.toDate ? data.endDate.toDate() : new Date(data.endDate),
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
            };
        });

        // ============================================================
        // === FILTRO POR MES/AÑO DEL PERMISO (en cliente) ===
        // Un permiso "pertenece" a un mes si:
        // 1. Su startDate está en ese mes, O
        // 2. Su endDate está en ese mes, O
        // 3. El mes está ENTRE startDate y endDate (permisos largos)
        // ============================================================
        if (filters.month !== undefined && filters.month !== 'all' && filters.year) {
            const targetMonth = parseInt(filters.month); // 0 = Enero
            const targetYear = parseInt(filters.year);
            
            // Rango del mes objetivo
            const monthStart = new Date(targetYear, targetMonth, 1);
            const monthEnd = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

            console.log(`[getSolicitudes] Filtrando permisos para: ${targetMonth + 1}/${targetYear}`);

            results = results.filter(solicitud => {
                const permStart = solicitud.startDate;
                const permEnd = solicitud.endDate;

                if (!permStart) return false; // Sin fecha, no se muestra

                // Caso 1: startDate está dentro del mes objetivo
                if (permStart >= monthStart && permStart <= monthEnd) {
                    return true;
                }

                // Caso 2: endDate está dentro del mes objetivo
                if (permEnd && permEnd >= monthStart && permEnd <= monthEnd) {
                    return true;
                }

                // Caso 3: El permiso abarca todo el mes (empieza antes, termina después)
                if (permStart < monthStart && permEnd && permEnd > monthEnd) {
                    return true;
                }

                return false;
            });

            console.log(`[getSolicitudes] Permisos encontrados tras filtro: ${results.length}`);
        }

        return results;
    } catch (error) {
        console.error('ERROR - dataController: Error cargando solicitudes:', error);
=======
        return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('ERROR - dataController: Error cargando solicitudes de permiso:', error);
>>>>>>> 755f45b7c267bfffa0ee6a809a10400904711786
        throw error;
    }
}

/**
 * Obtiene una solicitud de permiso específica por su ID.
 * @param {string} solicitudId - El ID del documento de la solicitud.
 * @returns {Promise<object>} - El objeto de la solicitud.
 */
export async function getSolicitudById(solicitudId) {
    if (!solicitudId) {
        throw new Error("Se requiere un ID de solicitud.");
    }
    
    try {
        const docRef = doc(db, 'solicitudes', solicitudId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            // Devuelve los datos de la solicitud, incluyendo el ID
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            console.warn(`[dataController] No se encontró la solicitud con ID: ${solicitudId}`);
            throw new Error("Solicitud no encontrada.");
        }
    } catch (error) {
        console.error(`[dataController] Error al obtener la solicitud ${solicitudId}:`, error);
        throw new Error("Error al consultar la base de datos.");
    }
}

export async function addShiftChangeRequest(requestData) {
<<<<<<< HEAD
    const callable = httpsCallable(functions, 'addShiftChangeRequest');
    try {
        const result = await callable(requestData);
        if (result.data?.success) return result.data;
        throw new Error(result.data?.message || 'Error desconocido al añadir solicitud de cambio.');
    } catch (error) {
        console.error('ERROR - dataController: Error al llamar a Cloud Function addShiftChangeRequest:', error);
        throw error;
    }
}

export async function getShiftChangeRequests(filters = {}) {
    // 1. Intentar obtener del estado local
    let userProfile = currentUser.get();

    // 2. Si falla, intentar obtener de Firebase Auth directo (Fallback de seguridad)
    if (!userProfile || !userProfile.uid) {
        const auth = getAuth(); 
        const fbUser = auth.currentUser;
        
        if (fbUser) {
            // 💡 Esperar a obtener los claims reales
            try {
                const tokenResult = await fbUser.getIdTokenResult();
                userProfile = {
                    uid: fbUser.uid,
                    role: tokenResult.claims.role || 'guard',
                    agentId: tokenResult.claims.agentId || 'unknown'
                };
                currentUser.set(userProfile);
            } catch (e) {
                console.warn('[getShiftChangeRequests] No se pudieron obtener claims:', e);
                // Usar perfil mínimo como último recurso
                userProfile = {
                    uid: fbUser.uid,
                    role: 'guard',
                    agentId: 'unknown'
                };
            }
        }
    }

    // 3. Si sigue sin haber usuario, lanzamos error
    if (!userProfile || !userProfile.uid) {
        throw new Error('Usuario no autenticado. Por favor, recarga la página.');
    }
    
=======
    const callable = httpsCallable(functions, 'addShiftChangeRequest');
    try {
        const result = await callable(requestData);
        if (result.data?.success) return result.data;
        throw new Error(result.data?.message || 'Error desconocido al añadir solicitud de cambio.');
    } catch (error) {
        console.error('ERROR - dataController: Error al llamar a Cloud Function addShiftChangeRequest:', error);
        throw error;
    }
}

export async function getShiftChangeRequests(filters = {}) {
    const userProfile = currentUser.get();
    if (!userProfile) throw new Error('Perfil de usuario no disponible.');
>>>>>>> 755f45b7c267bfffa0ee6a809a10400904711786
    const callable = httpsCallable(functions, 'getShiftChangeRequestsCallable');
    
    try {
        const result = await callable({
            status: filters.status || null,
            agentId: userProfile.role === 'admin' ? filters.agentId || 'all' : userProfile.agentId,
        });
        
        if (result.data?.success) {
<<<<<<< HEAD
            // 💡 HELPER PARA CONVERTIR CUALQUIER FORMATO DE FECHA
            const parseFlexibleDate = (value) => {
                if (!value) return null;
                if (value instanceof Date) return value;
                if (typeof value === 'object') {
                    const secs = value.seconds || value._seconds;
                    if (secs) return new Date(secs * 1000);
                    if (typeof value.toDate === 'function') return value.toDate();
                }
                if (typeof value === 'string') {
                    try { return parseISO(value); } catch (e) { return null; }
                }
                return null;
            };

            // Mapear y convertir las fechas
            let requests = result.data.data.map((req) => {
                req.createdAt = parseFlexibleDate(req.createdAt) || new Date(0);
                req.requesterShiftDate = parseFlexibleDate(req.requesterShiftDate);
                req.targetShiftDate = parseFlexibleDate(req.targetShiftDate);
=======
            return result.data.data.map((req) => {
                Object.keys(req).forEach((key) => {
                    if (typeof req[key] === 'string' && key.toLowerCase().includes('date')) {
                        try {
                            req[key] = parseISO(req[key]);
                        } catch (e) {
                            console.warn(`Could not parse date string: ${req[key]}`);
                        }
                    }
                });
>>>>>>> 755f45b7c267bfffa0ee6a809a10400904711786
                return req;
            });

            // DEBUG (puedes quitar esto en producción)
            console.log('[getShiftChangeRequests] Total solicitudes:', requests.length);

            // Filtro por fecha si se especifica
            if (filters.month !== undefined && filters.month !== 'all' && filters.year) {
                const targetMonth = parseInt(filters.month);
                const targetYear = parseInt(filters.year);
                
                requests = requests.filter(req => {
                    let match = false;

                    if (req.createdAt && req.createdAt.getFullYear() !== 1970) {
                         if (req.createdAt.getMonth() === targetMonth && req.createdAt.getFullYear() === targetYear) {
                             match = true;
                         }
                    }

                    if (!match && req.requesterShiftDate) {
                        if (req.requesterShiftDate.getMonth() === targetMonth && req.requesterShiftDate.getFullYear() === targetYear) {
                            match = true;
                        }
                    }

                    if (!match && req.targetShiftDate) {
                        if (req.targetShiftDate.getMonth() === targetMonth && req.targetShiftDate.getFullYear() === targetYear) {
                            match = true;
                        }
                    }

                    return match;
                });
            }

            return requests;
        } else {
            throw new Error(result.data?.message || 'Error al obtener solicitudes de cambio de turno.');
        }
    } catch (error) {
        console.error('ERROR - dataController: Error al llamar a getShiftChangeRequestsCallable:', error);
        throw error;
    }
}

export async function respondToShiftChangeRequest(requestData) {
<<<<<<< HEAD
    const callable = httpsCallable(functions, 'respondToShiftChangeRequest');
    try {
        const result = await callable(requestData);
        if (result.data?.success) return result.data;
        throw new Error(result.data?.message || 'Error en Cloud Function de respuesta.');
    } catch (error) {
        console.error('Error al enviar la respuesta:', error);
        throw error;
    }
}

export async function addAgent(agentData) {
    const callable = httpsCallable(functions, 'addAgentCallable');
    try {
        const result = await callable(agentData);
        if (result.data?.success) return result.data;
        throw new Error(result.data?.message || 'Error al añadir agente.');
    } catch (error) {
        console.error('Error al añadir agente (Cloud Function):', error);
        throw error;
    }
}

export async function updateAgent(agentId, updateData) {
    const callable = httpsCallable(functions, 'updateAgentCallable');
    try {
        const result = await callable({ agentId, updateData });
        if (result.data?.success) return result.data;
        throw new Error(result.data?.message || 'Error al actualizar agente.');
    } catch (error) {
        console.error('Error al actualizar agente:', error);
        throw error;
    }
}

export async function deleteAgent(agentId) {
    const callable = httpsCallable(functions, 'deleteAgentCallable');
    try {
        const result = await callable({ agentId });
        if (result.data?.success) return result.data;
        throw new Error(result.data?.message || 'Error al eliminar agente.');
    } catch (error) {
        console.error('Error al eliminar agente:', error);
        throw error;
    }
}

export async function updateSolicitudStatus(requestData) {
    const callable = httpsCallable(functions, 'updateSolicitudStatus');
    try {
        const result = await callable(requestData);
        if (result.data?.success) return result.data;
        throw new Error(result.data?.message || 'Error al actualizar estado de solicitud.');
    } catch (error) {
        console.error('Error al llamar a updateSolicitudStatus (Cloud Function):', error);
        throw error;
    }
}

export async function addMarkedDateCallable(markedDateData) {
    const callable = httpsCallable(functions, 'addMarkedDateCallable');
    try {
        const result = await callable(markedDateData);
        if (result.data?.success) return result.data;
        throw new Error(result.data?.message || 'Error desconocido al añadir fecha marcada.');
    } catch (error) {
        console.error('Error - dataController: Error al llamar a Cloud Function addMarkedDateCallable:', error);
        throw error;
    }
}

export async function updateNotificationCount() {
    const userProfile = currentUser.get();
    if (!userProfile || !userProfile.agentId) {
        setPendingTasksCount(0);
        setPendingRequestsCount(0);
        console.log('[updateNotificationCount] DETENIDO: Usuario no válido o sin agentId. Contadores a 0.'); 
        return;
    }

    console.log('[updateNotificationCount] Calculando notificaciones para:', { agentId: userProfile.agentId, role: userProfile.role });

    try {
        setPendingTasksCount(0);

        let requestsCount = 0;

        if (userProfile.role === 'admin' || userProfile.role === 'supervisor') {
            try {
                const solicitudesPermisoPendientes = await getSolicitudes({ status: 'Pendiente' });
                requestsCount += solicitudesPermisoPendientes.length;
                console.log(`[updateNotificationCount] Admin/Super: Encontradas ${solicitudesPermisoPendientes.length} solicitudes de permiso pendientes.`);
            } catch (permError) {
                console.error('ERROR - dataController: Fallo al contar solicitudes de permiso:', permError);
            }
        }

        try {
            const agentIdStr = String(userProfile.agentId); 
            console.log(`[updateNotificationCount] Consultando Firestore: solicitudes_cambio_turno where targetAgentId == "${agentIdStr}" AND status == "Pendiente_Target"`);
            
            const shiftChangesRef = collection(db, 'solicitudes_cambio_turno');
            const q = query(
                shiftChangesRef,
                where('targetAgentId', '==', agentIdStr),
                where('status', '==', 'Pendiente_Target')
            );
            
            console.log('[updateNotificationCount] Ejecutando consulta de cambios de turno...');
            const querySnapshot = await getDocs(q);
            const pendingShiftChanges = querySnapshot.size;

            console.log(`[updateNotificationCount] Consulta completada. Encontradas ${pendingShiftChanges} propuestas de cambio pendientes para agente ${agentIdStr}.`);

            requestsCount += pendingShiftChanges;

        } catch (shiftError) {
             console.error('ERROR - dataController: Fallo al consultar/contar propuestas de cambio:', shiftError);
        }
        
        setPendingRequestsCount(requestsCount);
        console.log(`[updateNotificationCount] FINAL: Contador total de notificaciones ('pendingRequestsCount') establecido en: ${requestsCount}`);

    } catch (error) {
        console.error('ERROR - dataController: Fallo general en updateNotificationCount:', error);
        setPendingTasksCount(0); 
        setPendingRequestsCount(0);
    }
}
export async function markShiftChangeNotificationAsSeen(changeId) {
    const callable = httpsCallable(functions, 'markShiftChangeNotificationAsSeen');
    try {
        const result = await callable({ changeId });
        await updateNotificationCount();
        return result.data;
    } catch (error) {
        console.error('ERROR - dataController: Error al marcar notificación como vista (Cloud Function):', error);
        throw error;
    }
}

export async function getMarkedDates(monthId) {
    const markedDatesRef = collection(db, 'markedDates');
    let q = query(markedDatesRef);
    if (monthId) {
        const parts = monthId.split('_');
        if (parts.length === 3) {
            const monthName = parts[1];
            const year = parseInt(parts[2]);
            const startOfMonthDate = toZonedTime(new Date(year, getMonthNumberFromName(monthName), 1), MADRID_TIMEZONE);
            const endOfMonthDate = toZonedTime(endOfMonth(startOfMonthDate), MADRID_TIMEZONE);
            endOfMonthDate.setHours(23, 59, 59, 999);
            q = query(q, where('date', '>=', Timestamp.fromDate(startOfMonthDate)), where('date', '<=', Timestamp.fromDate(endOfMonthDate)), orderBy('date', 'asc'));
        }
    } else {
        q = query(q, orderBy('date', 'asc'));
    }
    try {
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => {
            const data = doc.data();
            if (data.date && typeof data.date.toDate === 'function') {
                data.date = data.date.toDate();
            }
            return { id: doc.id, ...data };
        });
    } catch (error) {
        console.error('ERROR - dataController: Error cargando fechas marcadas:', error);
        throw error;
    }
}

export async function addExtraService(serviceData) {
    const userProfile = currentUser.get();
    if (!userProfile || !userProfile.agentId) throw new Error('Perfil de agente no válido.');
    const payload = {
        ...serviceData,
        agentId: String(userProfile.agentId),
        userId: userProfile.uid,
        date: Timestamp.fromDate(parseISO(serviceData.date)),
        createdAt: serverTimestamp(),
    };
    try {
        const docRef = await addDoc(collection(db, 'extraordinaryServices'), payload);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error al añadir servicio extraordinario:', error);
        throw error;
    }
}

export async function getExtraServices(agentId, startDate, endDate) {
    if (!agentId || !startDate || !endDate) return [];
    const servicesRef = collection(db, 'extraordinaryServices');
    const q = query(servicesRef, where('agentId', '==', String(agentId)), where('date', '>=', startDate), where('date', '<=', endDate), orderBy('date'));
    try {
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            date: doc.data().date.toDate(),
        }));
    } catch (error) {
        console.error('Error al obtener servicios extraordinarios:', error);
        throw error;
    }
}

export async function getAllExtraServices(filters = {}) {
    // 1. Intentar obtener del estado local
    let userProfile = currentUser.get();

    // 2. 💡 FALLBACK DE SEGURIDAD: Si no hay perfil, intentar leer de Auth
    if (!userProfile || !userProfile.uid) {
        const auth = getAuth();
        const fbUser = auth.currentUser;
        
        if (fbUser) {
            // Reconstrucción temporal del perfil
            userProfile = {
                uid: fbUser.uid,
                role: 'guard', // Se validará real en backend, esto es para pasar el check local
                agentId: 'unknown'
            };
            
            // Intentar refrescar datos reales
            try {
                const token = await fbUser.getIdTokenResult();
                userProfile.role = token.claims.role || 'guard';
                userProfile.agentId = token.claims.agentId || 'unknown';
                currentUser.set(userProfile); // Guardar para la próxima
            } catch (e) { console.warn("Error recuperando claims:", e); }
        }
    }

    // 3. Si sigue sin haber usuario, lanzamos error
    if (!userProfile || !userProfile.uid) {
        throw new Error('Perfil de usuario no disponible. La sesión no ha cargado aún.');
    }

    // --- RESTO DE TU LÓGICA ORIGINAL ---
    
    // 1. DETECTAR ROL
    const isAdmin = userProfile.role === 'admin' || userProfile.role === 'supervisor';

    let effectiveFilters = { ...filters };
    
    if (!isAdmin) {
        // Forzamos el ID del agente actual
        effectiveFilters.agentId = String(userProfile.agentId);
    }

    // 2. Extracción de filtros
    const { 
        agentId, 
        type, 
        startDate, 
        endDate, 
        limit: queryLimit, 
        startAfter: startAfterDoc 
    } = effectiveFilters;

    const servicesRef = collection(db, 'extraordinaryServices');
    let queryConstraints = [];

    // 3. Construcción de Query
    if (agentId && agentId !== 'all') {
        queryConstraints.push(where('agentId', '==', String(agentId)));
    }
    
    if (type && type !== 'all') {
        queryConstraints.push(where('type', '==', type));
    }
    
    if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0); 
        queryConstraints.push(where('date', '>=', Timestamp.fromDate(start)));
    }
    
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        queryConstraints.push(where('date', '<=', Timestamp.fromDate(end)));
    }
    
    queryConstraints.push(orderBy('date', 'desc')); 

    if (startAfterDoc) queryConstraints.push(startAfter(startAfterDoc));
    if (queryLimit) queryConstraints.push(limit(queryLimit));

=======
    const callable = httpsCallable(functions, 'respondToShiftChangeRequest');
    try {
        const result = await callable(requestData);
        if (result.data?.success) return result.data;
        throw new Error(result.data?.message || 'Error en Cloud Function de respuesta.');
    } catch (error) {
        console.error('Error al enviar la respuesta:', error);
        throw error;
    }
}

export async function addAgent(agentData) {
    const callable = httpsCallable(functions, 'addAgentCallable');
    try {
        const result = await callable(agentData);
        if (result.data?.success) return result.data;
        throw new Error(result.data?.message || 'Error al añadir agente.');
    } catch (error) {
        console.error('Error al añadir agente (Cloud Function):', error);
        throw error;
    }
}

export async function updateAgent(agentId, updateData) {
    const callable = httpsCallable(functions, 'updateAgentCallable');
    try {
        const result = await callable({ agentId, updateData });
        if (result.data?.success) return result.data;
        throw new Error(result.data?.message || 'Error al actualizar agente.');
    } catch (error) {
        console.error('Error al actualizar agente:', error);
        throw error;
    }
}

export async function deleteAgent(agentId) {
    const callable = httpsCallable(functions, 'deleteAgentCallable');
    try {
        const result = await callable({ agentId });
        if (result.data?.success) return result.data;
        throw new Error(result.data?.message || 'Error al eliminar agente.');
    } catch (error) {
        console.error('Error al eliminar agente:', error);
        throw error;
    }
}

export async function updateSolicitudStatus(requestData) {
    const callable = httpsCallable(functions, 'updateSolicitudStatus');
    try {
        const result = await callable(requestData);
        if (result.data?.success) return result.data;
        throw new Error(result.data?.message || 'Error al actualizar estado de solicitud.');
    } catch (error) {
        console.error('Error al llamar a updateSolicitudStatus (Cloud Function):', error);
        throw error;
    }
}

export async function addMarkedDateCallable(markedDateData) {
    const callable = httpsCallable(functions, 'addMarkedDateCallable');
    try {
        const result = await callable(markedDateData);
        if (result.data?.success) return result.data;
        throw new Error(result.data?.message || 'Error desconocido al añadir fecha marcada.');
    } catch (error) {
        console.error('Error - dataController: Error al llamar a Cloud Function addMarkedDateCallable:', error);
        throw error;
    }
}

export async function updateNotificationCount() {
    const userProfile = currentUser.get();
    if (!userProfile || !userProfile.agentId) {
        setPendingTasksCount(0);
        setPendingRequestsCount(0);
        // Log más específico
        console.log('[updateNotificationCount] DETENIDO: Usuario no válido o sin agentId. Contadores a 0.'); 
        return;
    }

    // Log del perfil de usuario que estamos usando
    console.log('[updateNotificationCount] Calculando notificaciones para:', { agentId: userProfile.agentId, role: userProfile.role });

    try {
        setPendingTasksCount(0); // Asumiendo que las tareas no son el foco ahora

        let requestsCount = 0;

        // a) Solicitudes de Permiso (solo para Admin/Super)
        if (userProfile.role === 'admin' || userProfile.role === 'supervisor') {
            try {
                const solicitudesPermisoPendientes = await getSolicitudes({ status: 'Pendiente' });
                requestsCount += solicitudesPermisoPendientes.length;
                console.log(`[updateNotificationCount] Admin/Super: Encontradas ${solicitudesPermisoPendientes.length} solicitudes de permiso pendientes.`);
            } catch (permError) {
                console.error('ERROR - dataController: Fallo al contar solicitudes de permiso:', permError);
            }
        }

        // b) Propuestas de CAMBIO DE TURNO (para el usuario actual)
        try {
            // Aseguramos conversión a string y lo logueamos
            const agentIdStr = String(userProfile.agentId); 
            console.log(`[updateNotificationCount] Consultando Firestore: solicitudes_cambio_turno where targetAgentId == "${agentIdStr}" AND status == "Pendiente_Target"`);
            
            const shiftChangesRef = collection(db, 'solicitudes_cambio_turno');
            const q = query(
                shiftChangesRef,
                where('targetAgentId', '==', agentIdStr), // Usar string explícito
                where('status', '==', 'Pendiente_Target')
            );
            
            // Log ANTES de ejecutar la consulta
            console.log('[updateNotificationCount] Ejecutando consulta de cambios de turno...');
            const querySnapshot = await getDocs(q);
            const pendingShiftChanges = querySnapshot.size; // Obtener el número de resultados

            // Log DESPUÉS de ejecutar la consulta con el resultado
            console.log(`[updateNotificationCount] Consulta completada. Encontradas ${pendingShiftChanges} propuestas de cambio pendientes para agente ${agentIdStr}.`);

            requestsCount += pendingShiftChanges; // Añadir al total

        } catch (shiftError) {
             // Loguear cualquier error durante esta consulta específica
             console.error('ERROR - dataController: Fallo al consultar/contar propuestas de cambio:', shiftError);
        }
        
        // c) Actualizar estado global y loguear el total final
        setPendingRequestsCount(requestsCount);
        console.log(`[updateNotificationCount] FINAL: Contador total de notificaciones ('pendingRequestsCount') establecido en: ${requestsCount}`);

    } catch (error) {
        // Loguear errores generales en la función
        console.error('ERROR - dataController: Fallo general en updateNotificationCount:', error);
        setPendingTasksCount(0); 
        setPendingRequestsCount(0);
    }
}
export async function markShiftChangeNotificationAsSeen(changeId) {
    const callable = httpsCallable(functions, 'markShiftChangeNotificationAsSeen');
    try {
        const result = await callable({ changeId });
        await updateNotificationCount();
        return result.data;
    } catch (error) {
        console.error('ERROR - dataController: Error al marcar notificación como vista (Cloud Function):', error);
        throw error;
    }
}

export async function getMarkedDates(monthId) {
    const markedDatesRef = collection(db, 'markedDates');
    let q = query(markedDatesRef);
    if (monthId) {
        const parts = monthId.split('_');
        if (parts.length === 3) {
            const monthName = parts[1];
            const year = parseInt(parts[2]);
            const startOfMonthDate = toZonedTime(new Date(year, getMonthNumberFromName(monthName), 1), MADRID_TIMEZONE);
            const endOfMonthDate = toZonedTime(endOfMonth(startOfMonthDate), MADRID_TIMEZONE);
            endOfMonthDate.setHours(23, 59, 59, 999);
            q = query(q, where('date', '>=', Timestamp.fromDate(startOfMonthDate)), where('date', '<=', Timestamp.fromDate(endOfMonthDate)), orderBy('date', 'asc'));
        }
    } else {
        q = query(q, orderBy('date', 'asc'));
    }
    try {
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => {
            const data = doc.data();
            if (data.date && typeof data.date.toDate === 'function') {
                data.date = data.date.toDate();
            }
            return { id: doc.id, ...data };
        });
    } catch (error) {
        console.error('ERROR - dataController: Error cargando fechas marcadas:', error);
        throw error;
    }
}

export async function addExtraService(serviceData) {
    const userProfile = currentUser.get();
    if (!userProfile || !userProfile.agentId) throw new Error('Perfil de agente no válido.');
    const payload = {
        ...serviceData,
        agentId: String(userProfile.agentId),
        userId: userProfile.uid,
        date: Timestamp.fromDate(parseISO(serviceData.date)),
        createdAt: serverTimestamp(),
    };
    try {
        const docRef = await addDoc(collection(db, 'extraordinaryServices'), payload);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error al añadir servicio extraordinario:', error);
        throw error;
    }
}

export async function getExtraServices(agentId, startDate, endDate) {
    if (!agentId || !startDate || !endDate) return [];
    const servicesRef = collection(db, 'extraordinaryServices');
    const q = query(servicesRef, where('agentId', '==', String(agentId)), where('date', '>=', startDate), where('date', '<=', endDate), orderBy('date'));
    try {
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            date: doc.data().date.toDate(),
        }));
    } catch (error) {
        console.error('Error al obtener servicios extraordinarios:', error);
        throw error;
    }
}

export async function getAllExtraServices(filters = {}) {
    const userProfile = currentUser.get();
    if (!userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'supervisor')) {
        throw new Error('Acceso no autorizado.');
    }
    const servicesRef = collection(db, 'extraordinaryServices');
    let queryConstraints = [];
    if (filters.agentId && filters.agentId !== 'all') {
        queryConstraints.push(where('agentId', '==', filters.agentId));
    }
    if (filters.type && filters.type !== 'all') {
        queryConstraints.push(where('type', '==', filters.type));
    }
    if (filters.startDate) {
        queryConstraints.push(where('date', '>=', Timestamp.fromDate(new Date(filters.startDate))));
    }
    if (filters.endDate) {
        queryConstraints.push(where('date', '<=', Timestamp.fromDate(new Date(filters.endDate))));
    }
    queryConstraints.push(orderBy('date', 'desc'));
>>>>>>> 755f45b7c267bfffa0ee6a809a10400904711786
    const q = query(servicesRef, ...queryConstraints);
    
    try {
        const querySnapshot = await getDocs(q);
<<<<<<< HEAD
        const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
        const services = querySnapshot.docs.map((doc) => ({
=======
        return querySnapshot.docs.map((doc) => ({
>>>>>>> 755f45b7c267bfffa0ee6a809a10400904711786
            id: doc.id,
            ...doc.data(),
            date: doc.data().date.toDate(),
        }));
<<<<<<< HEAD

        return { services, lastVisible };
    } catch (error) {
        console.error('Error al obtener servicios extraordinarios:', error);
        if (error.message.includes('indexes')) throw error;
        throw new Error('No se pudieron cargar los servicios.');
=======
    } catch (error) {
        console.error('Error al obtener todos los servicios extraordinarios (admin):', error);
        throw error;
>>>>>>> 755f45b7c267bfffa0ee6a809a10400904711786
    }
}

export async function updateExtraService(serviceId, updateData) {
<<<<<<< HEAD
    const serviceRef = doc(db, 'extraordinaryServices', serviceId);
    try {
        const payload = { ...updateData };
        if (typeof payload.date === 'string') {
            payload.date = Timestamp.fromDate(parseISO(payload.date));
        }
        await updateDoc(serviceRef, payload);
    } catch (error) {
        console.error('Error al actualizar servicio extraordinario:', error);
        throw error;
    }
=======
    const serviceRef = doc(db, 'extraordinaryServices', serviceId);
    try {
        const payload = { ...updateData };
        if (typeof payload.date === 'string') {
            payload.date = Timestamp.fromDate(parseISO(payload.date));
        }
        await updateDoc(serviceRef, payload);
    } catch (error) {
        console.error('Error al actualizar servicio extraordinario:', error);
        throw error;
    }
>>>>>>> 755f45b7c267bfffa0ee6a809a10400904711786
}

export async function deleteExtraService(serviceId) {
    const serviceRef = doc(db, 'extraordinaryServices', serviceId);
    try {
        await deleteDoc(serviceRef);
    } catch (error) {
        console.error('Error al eliminar servicio extraordinario:', error);
        throw error;
    }
}

export async function updateShiftV2(shiftData) {
    const callable = httpsCallable(functions, 'updateShiftV2');
    try {
        const result = await callable(shiftData);
        if (result.data.success) {
            return result.data;
        } else {
            throw new Error(result.data.message || 'Error desconocido al actualizar el turno.');
        }
    } catch (error) {
        console.error("Error al llamar a la Cloud Function 'updateShiftV2':", error);
        throw new Error('No se pudo actualizar el turno.');
    }
}

export async function getAdminDashboardStats(startDate, endDate) {
    const callable = httpsCallable(functions, 'getAdminDashboardStats');
    try {
        const result = await callable({ startDate, endDate });
        if (result.data && result.data.success) {
            return result.data.stats;
        } else {
            throw new Error(result.data.message || 'Error desconocido desde la Cloud Function.');
        }
    } catch (error) {
        console.error("Error al llamar a la Cloud Function 'getAdminDashboardStats':", error);
        throw new Error('No se pudieron cargar las estadísticas del panel de administrador.');
    }
}

export async function getScheduleForMonth(monthId) {
    console.log(`[dataController.js] 📥 Buscando datos para el mes: "${monthId}"`);
    if (!monthId) {
        console.error("[dataController.js] 🛑 ERROR: getScheduleForMonth fue llamado sin un monthId.");
        return null;
    }
    try {
        const docRef = doc(db, 'schedules', monthId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            console.log('[dataController.js] ✅ ¡Datos encontrados!', docSnap.data());
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            console.error(`[dataController.js] ❌ ERROR DE DATOS: No se encontró ningún documento con el ID: "${monthId}".`);
            return null;
        }
    } catch (error) {
        console.error("[dataController.js] 🔥 Error catastrófico al obtener los datos del cuadrante:", error);
        return null;
    }
}

export async function getLatestActivityFeed() {
    try {
        const feedRef = collection(db, 'markedDates');
        const q = query(feedRef, orderBy('date', 'desc'), limit(10));
        const querySnapshot = await getDocs(q);
        const feed = [];
        querySnapshot.forEach((doc) => {
            feed.push({ id: doc.id, ...doc.data() });
        });
        return feed;
    } catch (error) {
        console.error('Error al obtener el feed de actividad:', error);
        return [];
    }
}

export async function getLatestMarkedDates() {
    try {
        const markedDatesRef = collection(db, 'markedDates');
        const q = query(markedDatesRef, orderBy('date', 'desc'), limit(10));
        const querySnapshot = await getDocs(q);
        const dates = [];
        querySnapshot.forEach((doc) => {
            dates.push({ id: doc.id, ...doc.data() });
        });
        return dates;
    } catch (error) {
        console.error('Error al obtener las fechas marcadas:', error);
        return [];
    }
}

export async function deleteServiceReport(reportId) {
    const callable = httpsCallable(functions, 'deleteServiceReport');
    return callable({ reportId }).then((result) => result.data);
}

export async function getAllShiftTypes() {
    const workShifts = [
        { quadrant_symbol: 'M', name: 'Mañana' },
        { quadrant_symbol: 'T', name: 'Tarde' },
        { quadrant_symbol: 'N', name: 'Noche' },
        { quadrant_symbol: 'L', name: 'Libre' },
    ];
    try {
        const permissionTypes = await getPermissionTypes();
        return [...workShifts, ...permissionTypes];
    } catch (error) {
        console.error('Error al obtener todos los tipos de turno:', error);
        return workShifts;
    }
}

export async function uploadRecordImage(file) {
    if (!file) throw new Error('No se proporcionó ningún archivo.');
    const fileName = file.name || `imagen.${file.type.split('/')[1] || 'jpg'}`;
    const filePath = `record_images/${Date.now()}-${fileName}`;
    const storageRef = ref(storage, filePath);
    try {
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    } catch (error) {
        console.error('Error en dataController al subir la imagen del registro:', error);
        throw new Error('No se pudo subir la imagen del registro.');
    }
}

// --- MÓDULO DE IDENTIFICACIONES (CRUD) ---

export async function savePersona(dni, data) {
    if (!dni) throw new Error("El DNI es obligatorio para crear una ficha de persona.");
    const personaRef = doc(db, 'personas', dni);
    const finalData = { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    await setDoc(personaRef, finalData);
    return { id: personaRef.id };
}

export async function updatePersona(personaId, data) {
    if (!personaId) throw new Error("Se requiere el ID de la persona para actualizar.");
    const personaRef = doc(db, 'personas', personaId);
    const finalData = { ...data, updatedAt: serverTimestamp() };
    await updateDoc(personaRef, finalData);
    return { id: personaRef.id };
}

export async function saveVehiculo(matricula, data) {
    if (!matricula) throw new Error("La matrícula es obligatoria para crear una ficha de vehículo.");
    const vehiculoRef = doc(db, 'vehiculos', matricula);
    const finalData = { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    await setDoc(vehiculoRef, finalData);
    return { id: vehiculoRef.id };
}

export async function updateVehiculo(vehiculoId, data) {
    if (!vehiculoId) throw new Error("Se requiere el ID del vehículo para actualizar.");
    const vehiculoRef = doc(db, 'vehiculos', vehiculoId);
    const finalData = { ...data, updatedAt: serverTimestamp() };
    await updateDoc(vehiculoRef, finalData);
    return { id: vehiculoRef.id };
}

export async function getVehiculoByMatricula(matricula) {
    if (!matricula || matricula.trim() === '') {
        throw new Error("Se requiere una matrícula para la búsqueda.");
    }
    const vehiculoRef = doc(db, 'vehiculos', matricula.trim().toUpperCase());
    const docSnap = await getDoc(vehiculoRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
}

export async function saveEstablecimiento(cif, data) {
    if (!cif) throw new Error("El CIF es obligatorio para crear una ficha de establecimiento.");
    const establecimientoRef = doc(db, 'establecimientos', cif);
    const finalData = { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    await setDoc(establecimientoRef, finalData);
    return { id: establecimientoRef.id };
}

export async function updateEstablecimiento(establecimientoId, data) {
    if (!establecimientoId) throw new Error("Se requiere el ID del establecimiento para actualizar.");
    const establecimientoRef = doc(db, 'establecimientos', establecimientoId);
    const finalData = { ...data, updatedAt: serverTimestamp() };
    await updateDoc(establecimientoRef, finalData);
    return { id: establecimientoRef.id };
}

// --- MÓDULO DE GESTIÓN DE REQUERIMIENTOS (CRUD) ---

export async function deleteRequerimiento(reportId, requerimientoId) {
    if (!reportId || !requerimientoId) {
        throw new Error("Se requieren los IDs del parte y del requerimiento.");
    }
    const requerimientoRef = doc(db, 'serviceReports', reportId, 'requerimientos', requerimientoId);
    try {
        await deleteDoc(requerimientoRef);
    } catch (error) {
        console.error("Error al eliminar el requerimiento:", error);
        throw new Error("No se pudo eliminar el requerimiento de la base de datos.");
    }
}

export async function updateRequerimiento(reportId, requerimientoId, data) {
    if (!reportId || !requerimientoId || !data) {
        throw new Error("Faltan datos para actualizar el requerimiento.");
    }
    const requerimientoRef = doc(db, 'serviceReports', reportId, 'requerimientos', requerimientoId);
    const updateData = { ...data, updatedAt: serverTimestamp() };
    try {
        await updateDoc(requerimientoRef, updateData);
    } catch (error) {
        console.error("Error al actualizar el requerimiento:", error);
        throw new Error("No se pudo actualizar el requerimiento.");
    }
}

export async function getDashboardStats(startDate, endDate) {
    const callable = httpsCallable(functions, 'getDashboardStats');
    try {
        const result = await callable({ startDate, endDate });
        if (result.data.success) {
            return result.data;
        } else {
            throw new Error('La función de estadísticas devolvió un error.');
        }
    } catch (error) {
        console.error("Error al llamar a la Cloud Function 'getDashboardStats':", error);
        throw error;
    }
}

export async function getDocumentTemplateById(templateId) {
    try {
        const docRef = doc(db, "documentTemplates", templateId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            throw new Error("No se encontró la plantilla con el ID proporcionado.");
        }
    } catch (error) {
        console.error("Error al obtener el documento por ID:", error);
        throw error;
    }
}

// --- MÓDULO DE GESTIÓN DE TAREAS ---

export async function resolveTaskWithComment(data) {
    const callable = httpsCallable(functions, 'resolveTaskWithComment');
    try {
        const result = await callable(data);
        return result.data;
    } catch (error) {
        console.error('Error al llamar a la función resolveTaskWithComment:', error);
        throw new Error(error.message);
    }
}

export async function createTask(taskData) {
    const user = currentUser.get();
    if (!user) throw new Error('Usuario no autenticado.');
    const payload = {
        ...taskData,
        status: 'pendiente', // Asegúrate de que este sea el valor en español
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        completedAt: null,
        validatedAt: null
    };
    try {
        const docRef = await addDoc(collection(db, 'tareas'), payload);
        return { id: docRef.id };
    } catch (error) {
        console.error("Error al crear la tarea:", error);
        throw new Error("No se pudo crear la tarea en la base de datos.");
    }
}

export async function updateTaskStatus(taskId, newStatus) {
    if (!taskId || !newStatus) throw new Error('Faltan datos para actualizar la tarea.');
    const taskRef = doc(db, 'tareas', taskId);
    const updateData = { status: newStatus };
    if (newStatus === 'finalizada') { // Asegúrate de que este sea el valor en español
        updateData.completedAt = serverTimestamp();
    } else if (newStatus === 'validada') {
        updateData.validatedAt = serverTimestamp();
    }
    try {
        await updateDoc(taskRef, updateData);
    } catch (error) {
        console.error("Error al actualizar el estado de la tarea:", error);
        throw new Error("No se pudo actualizar la tarea.");
    }
}

export async function getPendingTasksForAgent(agentId) {
    if (!agentId) return [];
    const q = query(collection(db, 'tareas'), where('assignedAgentId', '==', agentId), where('status', '==', 'pendiente'), orderBy('createdAt', 'desc'));
    try {
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error al obtener las tareas del agente:", error);
        throw new Error("No se pudieron cargar las tareas pendientes.");
    }
}

export async function getAllTasks(options = {}) {
    const { limit: queryLimit = 15, startAfterDoc, status, agentId } = options;
    const tasksCol = collection(db, 'tareas');
    let queryConstraints = [];
    
    // Filtro por estado (debe ser "pendiente", "finalizada", etc.)
    if (status && status !== 'all') {
        queryConstraints.push(where('status', '==', status));
    }
    
    if (agentId && agentId !== 'all') {
        queryConstraints.push(where('assignedAgentId', '==', String(agentId))); 
    }

    queryConstraints.push(orderBy('createdAt', 'desc'));
    if (startAfterDoc) {
        queryConstraints.push(startAfter(startAfterDoc));
    }
    queryConstraints.push(limit(queryLimit));
    
    const q = query(tasksCol, ...queryConstraints);
    
    try {
        const querySnapshot = await getDocs(q);
        const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
        const tasks = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return { tasks, lastVisible };
    } catch (error) {
        console.error('Error al obtener todas las tareas:', error);
        throw new Error('No se pudieron cargar las tareas. Revisa si falta un índice en Firestore.');
    }
}

export async function getTasksByOrderId(orderId) {
    if (!orderId) return [];
    const tasksRef = collection(db, 'tareas');
    const q = query(tasksRef, where('orderId', '==', orderId), orderBy('createdAt', 'asc'));
    try {
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt ? data.createdAt.toDate() : null,
            };
        });
    } catch (error) {
        console.error(`Error al obtener las tareas para la orden ${orderId}:`, error);
        throw new Error('No se pudieron cargar las tareas. Revisa si falta un índice en Firestore.');
    }
}

export async function getTasksForAgent(agentId, status = 'all') {
    if (!agentId) return [];
    const tasksRef = collection(db, 'tareas');
    let queryConstraints = [where('assignedAgentId', '==', agentId), orderBy('createdAt', 'desc')];
    if (status !== 'all') {
        queryConstraints.unshift(where('status', '==', status));
    }
    const q = query(tasksRef, ...queryConstraints);
    try {
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error al obtener las tareas del agente:", error);
        throw new Error("No se pudieron cargar las tareas.");
    }
}

export async function generateRegistroPdf(data) {
    const callable = httpsCallable(functions, 'generateRegistroPdf');
    try {
        const result = await callable(data);
        return result.data;
    } catch (error) {
        console.error("Error al llamar a la Cloud Function 'generateRegistroPdf':", error);
        throw error;
    }
}

export function getAgentName(agentId) {
    const agents = availableAgents.get() || [];
    const agent = agents.find(a => a.id === agentId);
    return agent ? agent.name : 'Agente Desconocido';
}

export async function countDocumentTemplatesByType(type) {
  if (!type || type === 'all') {
    return countAllDocumentTemplates();
  }
  try {
    const templatesCol = collection(db, 'documentTemplates');
    const q = query(templatesCol, where('documentType', '==', type));
    const snapshot = await getCountFromServer(q);
    console.log(`[DEBUG - countDocumentTemplatesByType] Conteo para tipo '${type}': ${snapshot.data().count}`);
    return snapshot.data().count;
  } catch (error) {
    console.error(`Error contando documentos del tipo '${type}':`, error);
    throw error;
  }
}

export async function searchRegistrosParaAdjuntar(searchTerm) {
  if (!searchTerm || searchTerm.length < 3) {
    return [];
  }
  
  const registrosRef = collection(db, 'registros');
  const term = searchTerm.toLowerCase();
  
  const q = query(
    registrosRef,
    where('direction', '==', 'salida'),
    where('registrationNumber', '>=', searchTerm.toUpperCase()),
    where('registrationNumber', '<=', searchTerm.toUpperCase() + '\uf8ff'),
    limit(10)
  );

  try {
    const querySnapshot = await getDocs(q);
    const registros = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(reg => reg.pdfUrl);
      
    return registros;
  } catch (error) {
    console.error("Error en searchRegistrosParaAdjuntar:", error);
    return []; 
  }
}

export async function generarPdfDesdePlantilla(data) {
    const callable = httpsCallable(functions, 'generarPdfDesdePlantilla');
    try {
        const result = await callable(data);
        if (result.data.success) {
            return result.data;
        } else {
            throw new Error(result.data.message || 'Error desconocido en la generación de plantilla.');
        }
    } catch (error) {
        console.error("Error al llamar a la Cloud Function 'generarPdfDesdePlantilla':", error);
        throw error;
    }
}

/**
 * (Wrapper de Cloud Function) Obtiene novedades pendientes.
 */
export async function getUnacknowledgedNovedades() {
  const callable = httpsCallable(functions, 'getUnacknowledgedNovedades');
  try {
    const result = await callable();
    if (result.data.success) {
      return result.data.novedades;
    }
  } catch (error) {
    console.error("Error al llamar a getUnacknowledgedNovedades:", error);
    throw new Error(error.message);
  }
  return [];
}

/**
 * (Wrapper de Cloud Function) Confirma la lectura de novedades.
 */
export async function acknowledgeNovedades(novedadIds) {
  const callable = httpsCallable(functions, 'acknowledgeNovedades');
  return callable({ novedadIds });
}

/**
 * (CLIENT-SIDE) Crea una nueva novedad en Firestore.
 * Esto es rápido y gratuito (1 escritura).
 */
// ============================================================
// 1. MODIFICAR: Función para añadir Novedad (Tablón)
// Ajustada para aceptar categoría y título, compatible con el Tablón
// ============================================================
export async function addNovedad(content, category = 'general', isPinned = false, title = '') {
    const user = currentUser.get();
    if (!user || !user.agentId) throw new Error("Usuario no autenticado.");

    const agentIdStr = String(user.agentId);

    // Si no se pasa título (ej. desde el puente automático), generamos uno corto
    const finalTitle = title || (category === 'urgente' ? '⚠️ AVISO URGENTE' : 'Nuevo Aviso');

    const novedadData = {
        title: finalTitle,
        content: content.trim(),
        category: category, // 💡 IMPORTANTE: 'category' para que funcione el filtro del Tablón
        isPinned: isPinned, // Para que salga arriba si es importante
        status: 'activa',
        createdByAgentId: agentIdStr,
        createdByAgentName: user.displayName || 'Agente',
        createdAt: serverTimestamp(),
        acknowledgedBy: [agentIdStr]
    };

    try {
        await addDoc(collection(db, 'novedades'), novedadData);
        return { success: true };
    } catch (error) {
<<<<<<< HEAD
        console.error("Error al añadir novedad:", error);
        throw new Error("No se pudo guardar la novedad.");
    }
}

/**
 * Obtiene las novedades creadas SOLAMENTE en el mes actual.
 */
export async function getNovedadesCurrentMonth() {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    
    // Ajustar fin del día para incluir todas las del último día
    end.setHours(23, 59, 59, 999);

    try {
        const ref = collection(db, 'novedades');
        const q = query(
            ref, 
            where('createdAt', '>=', Timestamp.fromDate(start)),
            where('createdAt', '<=', Timestamp.fromDate(end)),
            orderBy('createdAt', 'desc')
        );
        
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            // Mapeamos 'createdAt' a 'date' para que el componente lo entienda fácil
            date: doc.data().createdAt 
        }));
    } catch (error) {
        console.error("Error fetching novedades current month:", error);
        // Si falta el índice, devolver array vacío para no romper la UI
        return [];
    }
}

/**
 * Registra un cambio aprobado en el log de auditoría 'quadrantChanges'.
 * @param {string} type - "CAMBIO_TURNO", "PERMISO_APROBADO", etc.
 * @param {string} description - Descripción legible (ej. "Agente O cambió M por T con Agente A")
 * @param {string} approverName - Nombre de quien aprueba (otro agente o un admin)
 * @param {string} approverId - UID de quien aprueba
 */
export async function logQuadrantChange(type, description, approverName, approverId) {
  const user = currentUser.get(); // Quien inicia la acción
  const monthId = selectedMonthId.get();

  if (!user || !monthId) {
    console.error("No se puede registrar el cambio: usuario o mes no definidos.");
    return;
  }

  try {
    await addDoc(collection(db, 'quadrantChanges'), {
      monthId: monthId,
      createdAt: serverTimestamp(),
      authorId: user.uid,
      authorName: user.displayName || 'Usuario',
      approverId: approverId,
      approverName: approverName,
      type: type,
      description: description,
    });
    console.log(`Cambio registrado: ${type}`);
  } catch (error) {
    console.error("Error al registrar el cambio:", error);
  }
}

/**
 * Recupera el historial de novedades creadas por un agente específico.
 * @param {string} agentId - El ID del agente (e.g., "4684").
 * @returns {Promise<Array>} Lista de objetos novedad.
 */
export async function getAgentNovedadesHistory(agentId) {
    if (!agentId || agentId === 'all') {
        console.warn("No se puede obtener el historial sin un ID de agente válido.");
        return [];
    }

    try {
        // Asumo que tienes una colección global de 'novedades' o similar. 
        // Si las tienes anidadas, la complejidad aumenta, pero esta es la solución óptima:
        const novedadesRef = collection(db, 'novedades');
        
        // Criterios de búsqueda: Filtrar por agente y ordenar por fecha (más reciente primero)
        const q = query(
            novedadesRef,
            where('createdByAgentId', '==', agentId), // Filtro de seguridad y pertenencia
            orderBy('createdAt', 'desc')             // Ordenar por fecha de creación descendente
        );

        const querySnapshot = await getDocs(q);
        
        const novedades = [];
        querySnapshot.forEach((doc) => {
            // Aseguramos que el ID del documento esté incluido
            novedades.push({ id: doc.id, ...doc.data() });
        });

        console.log(`[DataController] Historial de novedades para ${agentId} cargado.`);
        return novedades;

    } catch (error) {
        console.error("Error al obtener el historial de novedades:", error);
        throw new Error("No se pudo cargar el historial de novedades.");
    }
}

/**
 * Obtiene un listado paginado de novedades según filtros.
 * CRÍTICO: Requiere índices de Firestore para funcionar.
 */
export async function getNovedadesByFilter(filters = {}) {
    const {
        agentId,    // 'all' o un ID específico
        month,      // 'all' o 1-12
        year,       // 2024, 2025, etc.
        status,     // 'all', 'pending', 'acknowledged'
        pageSize = 15,
        startAfterDoc // El documento después del cual empezar
    } = filters;

    const novedadesRef = collection(db, 'novedades');
    let q = query(novedadesRef);

    // --- CONSTRUCCIÓN DE FILTROS 'WHERE' ---

    // 1. Filtro por Agente
    if (agentId && agentId !== 'all') {
        q = query(q, where('createdByAgentId', '==', agentId));
    }

    // 2. Filtro por Mes/Año
    if (year && month && month !== 'all') {
        const startDate = new Date(year, month - 1, 1); // Mes es 0-indexado
        const endDate = new Date(year, month, 0); // Día 0 del mes sig = último del mes actual
        endDate.setHours(23, 59, 59, 999);
        
        q = query(q, where('createdAt', '>=', startDate), where('createdAt', '<=', endDate));
    } else if (year && (!month || month === 'all')) {
        // Solo por año
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31, 23, 59, 59, 999);
        q = query(q, where('createdAt', '>=', startDate), where('createdAt', '<=', endDate));
    }

    // 3. Filtro por Estado
    if (status === 'pending') {
        // Asume que 'acknowledgedBy' es un array. Pendiente = array vacío.
        q = query(q, where('acknowledgedBy', '==', []));
    } else if (status === 'acknowledged') {
        // 'acknowledgedBy' es un array y NO está vacío ('>' funciona para "no vacío")
        q = query(q, where('acknowledgedBy', '>', []));
    }

    // --- ORDENACIÓN (Obligatorio para paginación) ---
    // El 'orderBy' debe coincidir con el primer 'where' de rango (fecha) si existe.
    // Si no, debe ser el campo del primer 'where' de igualdad (agentId)
    
    // Índice: createdByAgentId (ASC), createdAt (DESC)
    if (agentId && agentId !== 'all') {
        q = query(q, orderBy('createdAt', 'desc'));
    } 
    // Índice: createdAt (DESC)
    else {
         q = query(q, orderBy('createdAt', 'desc'));
    }
    
    // --- PAGINACIÓN ---
    q = query(q, limit(pageSize));
    if (startAfterDoc) {
        q = query(q, startAfter(startAfterDoc));
    }

    const snapshot = await getDocs(q);
    
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    return {
        data,
        lastVisibleDoc: snapshot.docs[snapshot.docs.length - 1], // El último de esta página
        isEmpty: snapshot.empty,
        totalDocsInPage: snapshot.docs.length
    };
}

// ===================================================================
// === 💡 MÓDULO DE IDENTIFICACIONES (FUNCIONES AÑADIDAS) ===
// ===================================================================

// --- Funciones de ESCRITURA (Llaman a Cloud Functions) ---

export const createIdentificacion = async (collectionName, docId, data) => {
    const createIdentificacionFunc = httpsCallable(functions, 'createIdentificacion');
    try {
        const result = await createIdentificacionFunc({ collectionName, docId, data });
        return result.data; // Devuelve { success: true, id: ... }
    } catch (error) {
        console.error("Error en createIdentificacion (dataController):", error);
        throw new Error(error.message);
    }
};

export const updateIdentificacion = async (collectionName, docId, updateData) => {
    const updateIdentificacionFunc = httpsCallable(functions, 'updateIdentificacion');
    try {
        const result = await updateIdentificacionFunc({ collectionName, docId, updateData });
        return result.data; // Devuelve { success: true, id: ... }
    } catch (error) {
        console.error("Error en updateIdentificacion (dataController):", error);
        throw new Error(error.message);
    }
};

export const deleteIdentificacion = async (collectionName, docId) => {
    // 🔔 AVISO: Asegúrate de tener 'deleteIdentificacion' en tu functions/index.js
    const deleteIdentificacionFunc = httpsCallable(functions, 'deleteIdentificacion');
    try {
        const result = await deleteIdentificacionFunc({ collectionName, docId });
        return result.data; // Devuelve { success: true }
    } catch (error) {
        console.error("Error en deleteIdentificacion (dataController):", error);
        throw new Error(error.message);
    }
};


// --- Funciones de BÚSQUEDA (Llaman a Cloud Functions) ---

export const searchPersonas = async (searchTerm, lastId = null) => {
    const searchPersonasFunc = httpsCallable(functions, 'searchPersonas');
    try {
        // Enviamos startAfterId solo si existe
        const result = await searchPersonasFunc({ searchTerm, startAfterId: lastId });
        return result.data.personas; 
    } catch (error) {
        console.error("Error en searchPersonas:", error);
        throw new Error(error.message);
    }
};

export const searchVehiculos = async (searchTerm, lastId = null) => {
    const searchVehiculosFunc = httpsCallable(functions, 'searchVehiculos');
    try {
        const result = await searchVehiculosFunc({ searchTerm, startAfterId: lastId });
        return result.data.vehicles; 
    } catch (error) {
        console.error("Error en searchVehiculos:", error);
        throw new Error(error.message);
    }
};

export const searchEstablecimientos = async (searchTerm, lastId = null) => {
    const searchEstablecimientosFunc = httpsCallable(functions, 'searchEstablecimientos');
    try {
        const result = await searchEstablecimientosFunc({ searchTerm, startAfterId: lastId });
        return result.data.establecimientos; 
    } catch (error) {
        console.error("Error en searchEstablecimientos:", error);
        throw new Error(error.message);
    }
};

// --- 💡 NUEVAS FUNCIONES PARA EL FUSIONADOR (Subcolecciones) ---

/**
 * Obtiene los componentes de un registro (portadas, actas, etc.)
 * @param {string} registroId El ID del documento base (atestado)
 * @returns {Promise<Array>} Un array de objetos de componente, ordenados.
 */
export async function getRegistroComponentes(registroId) {
  if (!registroId) throw new Error("Se requiere registroId para getRegistroComponentes");
  try {
    const componentesRef = collection(db, 'registros', registroId, 'componentes');
    // 💡 Ordenamos por el campo 'orden'
    const q = query(componentesRef, orderBy('orden', 'asc')); 
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error al obtener componentes:", error);
    throw new Error("No se pudieron cargar los componentes del documento.");
  }
}

/**
 * Añade un nuevo componente (portada, acta) a la subcolección de un registro.
 * @param {string} registroId El ID del documento base (atestado)
 * @param {object} componenteData Datos (name, pdfUrl, type, orden)
 * @returns {Promise<string>} El ID del nuevo documento de componente.
 */
export async function addRegistroComponente(registroId, componenteData) {
  if (!registroId || !componenteData) throw new Error("Datos incompletos para addRegistroComponente");
  try {
    const componentesRef = collection(db, 'registros', registroId, 'componentes');
    const docRef = await addDoc(componentesRef, {
      ...componenteData,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error al añadir componente:", error);
    throw new Error("No se pudo guardar el componente en la base de datos.");
  }
}

/**
 * Elimina un componente de la subcolección de un registro.
 * @param {string} registroId El ID del documento base (atestado)
 * @param {string} componenteId El ID del documento en la subcolección
 */
export async function deleteRegistroComponente(registroId, componenteId) {
  if (!registroId || !componenteId) throw new Error("IDs incompletos para deleteRegistroComponente");
  try {
    const componenteRef = doc(db, 'registros', registroId, 'componentes', componenteId);
    await deleteDoc(componenteRef);
  } catch (error) {
    console.error("Error al eliminar componente:", error);
    throw new Error("No se pudo eliminar el componente.");
  }
}

/**
 * Actualiza el orden de los componentes de un registro en lote.
 * @param {string} docId - ID del registro padre.
 * @param {Array} itemsToUpdate - Array de objetos [{ id: 'compID', orden: 1 }, ...]
 */
export async function updateRegistroComponentesOrden(docId, itemsToUpdate) {
  if (!docId || !itemsToUpdate || itemsToUpdate.length === 0) return;
  
  const batch = writeBatch(db); // Usa tu instancia de 'db' importada
  const componentesRef = collection(db, 'registros', docId, 'componentes');

  itemsToUpdate.forEach(item => {
    const docRef = doc(componentesRef, item.id);
    batch.update(docRef, { orden: item.orden });
  });

  await batch.commit();
  return { success: true };
}

/**
 * Obtiene las fechas marcadas (novedades) SOLAMENTE del mes actual.
 * Consulta la colección 'markedDates' filtrando por el mes en curso.
 */
export async function getMarkedDatesCurrentMonth() {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    
    // Ajustar fin del día para incluir todas las del último día
    end.setHours(23, 59, 59, 999);

    try {
        const ref = collection(db, 'markedDates');
        
        // Intentar primero con 'date' como campo de fecha
        let q = query(
            ref, 
            where('date', '>=', Timestamp.fromDate(start)),
            where('date', '<=', Timestamp.fromDate(end)),
            orderBy('date', 'desc')
        );
        
        let snapshot = await getDocs(q);
        
        // Si no hay resultados, puede que el campo sea 'createdAt'
        if (snapshot.empty) {
            q = query(
                ref, 
                where('createdAt', '>=', Timestamp.fromDate(start)),
                where('createdAt', '<=', Timestamp.fromDate(end)),
                orderBy('createdAt', 'desc')
            );
            snapshot = await getDocs(q);
        }
        
        console.log(`📅 Novedades del mes actual: ${snapshot.docs.length} encontradas`);
        
        return snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data()
        }));
    } catch (error) {
        console.error("Error fetching markedDates current month:", error);
        
        // Fallback: traer todas y filtrar en cliente
        try {
            console.log("⚠️ Fallback: filtrando en cliente...");
            const ref = collection(db, 'markedDates');
            const q = query(ref, orderBy('date', 'desc'), limit(50));
            const snapshot = await getDocs(q);
            
            const allDates = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data()
            }));
            
            // Filtrar en cliente
            const filtered = allDates.filter(item => {
                let itemDate = null;
                
                if (item.date) {
                    if (typeof item.date.toDate === 'function') {
                        itemDate = item.date.toDate();
                    } else if (item.date.seconds) {
                        itemDate = new Date(item.date.seconds * 1000);
                    } else if (typeof item.date === 'string') {
                        itemDate = new Date(item.date);
                    }
                }
                
                if (!itemDate) return false;
                
                return itemDate >= start && itemDate <= end;
            });
            
            console.log(`📅 Novedades filtradas del mes: ${filtered.length}`);
            return filtered;
            
        } catch (fallbackError) {
            console.error("Error en fallback:", fallbackError);
            return [];
        }
    }
}

/**
 * Obtiene TODAS las fechas marcadas (para el calendario/tabla).
 * Útil para mostrar indicadores en días pasados/futuros.
 */
export async function getAllMarkedDates() {
    try {
        const ref = collection(db, 'markedDates');
        const q = query(ref, orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        
        return snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data()
        }));
    } catch (error) {
        console.error("Error fetching all markedDates:", error);
        return [];
    }
}

// EN: js/dataController.js (AÑADIR AL FINAL)

/**
 * Obtiene el historial de cambios del cuadrante (Auditoría).
 * Lee de la colección 'quadrantChanges'.
 */
export async function getLatestQuadrantChanges() {
    try {
        // Asegúrate de importar collection, query, orderBy, limit, getDocs arriba
        const changesRef = collection(db, 'quadrantChanges');
        const q = query(changesRef, orderBy('createdAt', 'desc'), limit(20));
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            
            // Mapeo de tipos técnicos a títulos legibles
            const titles = {
                'CAMBIO_TURNO': 'Intercambio de Turno',
                'PERMISO_APROBADO': 'Permiso Concedido',
                'EDICION_ADMIN': 'Modificación Manual',
                'AUTO_ASIGNACION': 'Asignación Automática',
                'SOLICITUD_CREADA': 'Solicitud Recibida'
            };

            return {
                id: doc.id,
                ...data,
                // Campos estandarizados para el Sidebar
                title: titles[data.type] || data.type || 'Actualización',
                details: data.description,
                // Añadimos quién lo hizo si está disponible
                author: data.authorName ? `Por: ${data.authorName}` : null,
                date: data.createdAt,
                type: 'change' // Para usar un icono específico si quieres
            };
        });
    } catch (error) {
        console.error("Error fetching quadrant changes:", error);
        return [];
    }
}


/**
 * Importa un cuadrante completo desde un objeto JSON.
 * Sobrescribe los datos existentes para ese mes.
 */
export async function importScheduleFromJson(jsonContent) {
    // 1. Validación básica
    if (!jsonContent || !jsonContent.id || !jsonContent.weeks) {
        throw new Error("El archivo JSON no tiene el formato de cuadrante válido (falta id o weeks).");
    }

    const scheduleId = jsonContent.id; // Ej: "cuadrante_noviembre_2025"
    const docRef = doc(db, 'schedules', scheduleId);

    try {
        // 2. Limpiamos datos que no queremos sobrescribir o que son metadatos
        // (Opcional: podrías querer actualizar 'updatedAt')
        const dataToSave = {
            ...jsonContent,
            updatedAt: serverTimestamp(),
            importedAt: serverTimestamp() // Marca de que fue importado
        };

        // 3. Guardamos (Sobrescribimos el documento completo con setDoc)
        await setDoc(docRef, dataToSave);
        
        console.log(`[DataController] Cuadrante ${scheduleId} importado correctamente.`);
        return { success: true };

    } catch (error) {
        console.error("Error al importar cuadrante:", error);
        throw new Error("Fallo al escribir en la base de datos.");
    }
}

export async function addShiftToSchedule(data) {
    const callable = httpsCallable(functions, 'addShiftToSchedule');
    try {
        const result = await callable(data);
        return result.data;
    } catch (error) {
        console.error("Error en addShiftToSchedule:", error);
=======
        console.error('Error al eliminar servicio extraordinario:', error);
>>>>>>> 755f45b7c267bfffa0ee6a809a10400904711786
        throw error;
    }
}

/**
 * Obtiene la plantilla desde la colección 'defaultOrderTemplates'.
 * Mapea los campos de tu DB (cheklist, shift="Mañana") al formato de la App.
 */
export async function getDefaultOrderTemplate(shiftIdentifier) {
    try {
        // 1. Traducir el código de turno (M, T, N) al nombre completo que tienes en Firebase (Mañana, Tarde)
        let dbShiftName = shiftIdentifier;
        if (shiftIdentifier === 'M') dbShiftName = 'Mañana';
        else if (shiftIdentifier === 'T') dbShiftName = 'Tarde';
        else if (shiftIdentifier === 'N') dbShiftName = 'Noche';

        console.log(`[DataController] Buscando plantilla para turno: ${dbShiftName} en 'defaultOrderTemplates'`);

        // 2. Referencia a tu colección real
        const templatesRef = collection(db, 'defaultOrderTemplates');
        
        // 3. Consulta buscando por el campo 'shift' que tienes en tus documentos
        const q = query(templatesRef, where('shift', '==', dbShiftName), limit(1));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            const data = snapshot.docs[0].data();
            console.log("Plantilla encontrada:", data.title);

            // 4. MAPEO Y NORMALIZACIÓN DE DATOS
            // Aquí convertimos tu estructura de DB a la que espera React
            return { 
                id: snapshot.docs[0].id, 
                title: data.title,
                subtitle: data.subtitle || '', // Aseguramos que no sea null
                description: data.description || '', 
                // ⚠️ CRÍTICO: Mapeamos tu campo 'cheklist' (typo en DB) a 'checklist' (correcto en App)
                checklist: (data.cheklist || data.checklist || []).map(item => ({
                    item: item.item || "Tarea sin nombre",
                    // Si en la DB no tienes 'description' dentro del item del checklist, ponemos cadena vacía
                    description: item.description || '', 
                    // Si requiresGeolocation no está en el item, usamos false por defecto
                    requiresGeolocation: item.requiresGeolocation || false,
                    status: 'pendiente',
                    completed: false
                }))
            };
        }
        
        console.warn(`[DataController] No se encontró plantilla en DB para '${dbShiftName}'. Usando fallback local.`);
        return null; // Esto activará las plantillas hardcodeadas en ServiceOrderModal.jsx
    } catch (error) {
        console.error("Error obteniendo plantilla de la base de datos:", error);
        return null;
    }
}

/**
 * Cuenta el total de registros que coinciden con los filtros actuales.
 * Usamos getCountFromServer para que sea rápido y barato en Firestore.
 */
export async function countTotalRegistros(filters = {}) {
    try {
        const { direction, fecha, tipo, interesado, status } = filters;
        // db ya está importado de firebase-config.js, no necesitas getDb()
        let q = collection(db, 'registros');

        // Aplicamos los mismos filtros que en la búsqueda
        if (direction) q = query(q, where('direction', '==', direction));
        
        // Filtro de estado (array o string)
        if (status) {
            if (Array.isArray(status)) {
                q = query(q, where('status', 'in', status));
            } else if (status !== 'all') {
                q = query(q, where('status', '==', status));
            }
        } else if (direction === 'entrada') {
             // Fallback por defecto para entrada
             q = query(q, where('status', 'in', ['pendiente', 'revisado', 'recepcionado', 'finalizado', 'finalizado_rs']));
        }

        // Filtro de fecha
        if (fecha) {
            const startDate = new Date(`${fecha}T00:00:00.000`);
            const endDate = new Date(`${fecha}T23:59:59.999`);
            q = query(q, where('createdAt', '>=', startDate), where('createdAt', '<=', endDate));
        }

        if (tipo) q = query(q, where('documentType', '==', tipo));
        if (interesado) q = query(q, where('interesado', '==', interesado));

        // Ejecutamos solo el conteo
        const snapshot = await getCountFromServer(q);
        return snapshot.data().count;
    } catch (error) {
        console.error("Error contando registros:", error);
        return 0; // Retorna 0 si hay error para no romper la UI
    }
}

<<<<<<< HEAD
// --- MÓDULO DE VADOS ---

/**
 * Obtiene la lista de vados con filtros y paginación
 */
export async function getVados(options = {}) {
  const { filters = {}, limit = 50, startAfterDoc = null } = options;
  
  try {
    let q = collection(db, 'vados');
    const constraints = [];
    
    // Filtro por situación
    if (filters.situacion && filters.situacion !== 'all') {
      constraints.push(where('expediente.situacion', '==', filters.situacion));
    }
    
    // Filtro por año
    if (filters.año) {
      constraints.push(where('expediente.año', '==', filters.año));
    }
    
    // Ordenar por calle
    constraints.push(orderBy('ubicacion.calle'));
    constraints.push(orderBy('ubicacion.numero'));
    
    // Paginación
    if (startAfterDoc) {
      constraints.push(startAfter(startAfterDoc));
    }
    constraints.push(limitQuery(limit));
    
    q = query(q, ...constraints);
    const snapshot = await getDocs(q);
    
    let vados = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Filtros del lado del cliente (búsqueda de texto)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      vados = vados.filter(v => 
        v.titular?.documento?.toLowerCase().includes(searchLower) ||
        v.titular?.nombre?.toLowerCase().includes(searchLower) ||
        v.ubicacion?.calle?.toLowerCase().includes(searchLower) ||
        v.expediente?.referencia?.toLowerCase().includes(searchLower)
      );
    }
    
    if (filters.calle) {
      const calleLower = filters.calle.toLowerCase();
      vados = vados.filter(v => 
        v.ubicacion?.calle?.toLowerCase().includes(calleLower)
      );
    }
    
    // Filtro sin inspeccionar (últimos 6 meses)
    if (filters.sinInspeccionar) {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      vados = vados.filter(v => {
        if (!v.ultimaInspeccion) return true;
        const lastInsp = v.ultimaInspeccion.toDate ? v.ultimaInspeccion.toDate() : new Date(v.ultimaInspeccion);
        return lastInsp < sixMonthsAgo;
      });
    }
    
    const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;
    
    return { vados, lastVisible };
  } catch (error) {
    console.error('[DataController] Error obteniendo vados:', error);
    throw error;
  }
}

/**
 * Obtiene un vado por su ID
 */
export async function getVadoById(vadoId) {
  try {
    const docRef = doc(db, 'vados', vadoId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error('Vado no encontrado');
    }
    
    return { id: docSnap.id, ...docSnap.data() };
  } catch (error) {
    console.error('[DataController] Error obteniendo vado:', error);
    throw error;
  }
}

/**
 * Elimina un vado (solo admin)
 */
export async function deleteVado(vadoId) {
  try {
    const callable = httpsCallable(functions, 'deleteVado');
    const result = await callable({ vadoId });
    return result.data;
  } catch (error) {
    console.error('[DataController] Error eliminando vado:', error);
    throw error;
  }
}

/**
 * Actualiza un vado
 */
export async function updateVado(vadoId, data) {
  try {
    const callable = httpsCallable(functions, 'updateVado');
    const result = await callable({ vadoId, data });
    return result.data;
  } catch (error) {
    console.error('[DataController] Error actualizando vado:', error);
    throw error;
  }
}

/**
 * Importa vados desde un archivo Excel
 * @param {File} file - Archivo Excel (.xls o .xlsx)
 * @param {string} mode - 'merge' para añadir/actualizar, 'replace' para reemplazar todo
 */
export async function importVadosFromExcel(file, mode = 'merge') {
  try {
    // Convertir archivo a base64
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    
    const callable = httpsCallable(functions, 'importVados');
    const result = await callable({ 
      fileData: base64, 
      fileName: file.name,
      mode 
    });
    
    return result.data;
  } catch (error) {
    console.error('[DataController] Error importando vados:', error);
    throw error;
  }
}

/**
 * Obtiene las inspecciones de un vado
 */
export async function getInspeccionesVado(vadoId) {
  try {
    const q = query(
      collection(db, 'vados', vadoId, 'inspecciones'),
      orderBy('fecha', 'desc')
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('[DataController] Error obteniendo inspecciones:', error);
    throw error;
  }
}

/**
 * Crea una nueva inspección para un vado
 */
export async function createInspeccion(vadoId, inspeccionData) {
  try {
    const callable = httpsCallable(functions, 'createInspeccionVado');
    const result = await callable({ vadoId, ...inspeccionData });
    return result.data;
  } catch (error) {
    console.error('[DataController] Error creando inspección:', error);
    throw error;
  }
}

/**
 * Obtiene estadísticas generales de vados
 */
export async function getVadosStats() {
  try {
    const callable = httpsCallable(functions, 'getVadosStats');
    const result = await callable();
    return result.data;
  } catch (error) {
    console.error('[DataController] Error obteniendo stats de vados:', error);
    throw error;
  }
}

/**
 * Busca vados por proximidad geográfica
 */
export async function searchVadosByLocation(lat, lng, radiusKm = 0.5) {
  try {
    const callable = httpsCallable(functions, 'searchVadosByLocation');
    const result = await callable({ lat, lng, radiusKm });
    return result.data;
  } catch (error) {
    console.error('[DataController] Error buscando vados por ubicación:', error);
    throw error;
  }
}

// ============================================================
// MÓDULO DE DOTACIONES - CÓDIGO COMPLETO CORREGIDO
// ============================================================
// COPIAR TODO ESTO AL FINAL DE dataController.js
// (Reemplaza cualquier versión anterior de estas funciones)
// ============================================================

// ============================================================
// HELPER DE SEGURIDAD - CRÍTICO: Esta función DEBE existir
// ============================================================

/**
 * Helper de seguridad: Garantiza que siempre haya un ID de usuario
 * IMPORTANTE: Esta función es usada por todas las funciones de creación
 */
function getSafeUser() {
    // Primero intentamos obtener del estado local
    let user = currentUser.get();
    
    // Si no hay usuario en el estado, intentamos obtenerlo de Firebase Auth
    if (!user || !user.uid) {
        const auth = getAuth();
        const fbUser = auth.currentUser;
        
        if (fbUser) {
            console.log("[getSafeUser] Usuario recuperado de Firebase Auth:", fbUser.uid);
            return { 
                uid: fbUser.uid, 
                email: fbUser.email, 
                role: 'unknown' 
            };
        }
        
        // Si no hay usuario en ningún lado, lanzamos error
        console.error("[getSafeUser] No hay usuario autenticado");
        throw new Error("Error de sesion: Usuario no identificado. Recarga la pagina.");
    }
    
    console.log("[getSafeUser] Usuario obtenido del estado:", user.uid);
    return user;
}

// ============================================================
// LECTURA DE DATOS - DOTACIONES
// ============================================================

/**
 * Obtiene las armas asignadas a un agente
 */
export async function getArmasByAgente(agenteId) {
    console.log("[DataController] getArmasByAgente - agenteId:", agenteId);
    if (!agenteId) {
        console.warn("[DataController] getArmasByAgente - No se proporciono agenteId");
        return [];
    }
    try {
        const armasRef = collection(db, 'dotaciones_armas');
        const q = query(
            armasRef,
            where('agenteId', '==', String(agenteId)),
            orderBy('fechaAsignacion', 'desc')
        );
        const snapshot = await getDocs(q);
        console.log("[DataController] Armas encontradas:", snapshot.size);
        return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    } catch (error) {
        console.error('[DataController] Error obteniendo armas:', error);
        // Si es error de índice, mostrar mensaje específico
        if (error.code === 'failed-precondition') {
            console.error('[DataController] FALTA ÍNDICE EN FIRESTORE para dotaciones_armas');
        }
        return [];
    }
}

/**
 * Obtiene el vestuario asignado a un agente
 */
export async function getVestuarioByAgente(agenteId) {
    console.log("[DataController] getVestuarioByAgente - agenteId:", agenteId);
    if (!agenteId) return [];
    try {
        const vestuarioRef = collection(db, 'dotaciones_vestuario');
        const q = query(
            vestuarioRef,
            where('agenteId', '==', String(agenteId)),
            orderBy('fechaEntrega', 'desc')
        );
        const snapshot = await getDocs(q);
        console.log("[DataController] Vestuario encontrado:", snapshot.size);
        return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    } catch (error) {
        console.error('[DataController] Error obteniendo vestuario:', error);
        return [];
    }
}

/**
 * Obtiene el equipamiento asignado a un agente
 */
export async function getEquipamientoByAgente(agenteId) {
    console.log("[DataController] getEquipamientoByAgente - agenteId:", agenteId);
    if (!agenteId) return [];
    try {
        const equipamientoRef = collection(db, 'dotaciones_equipamiento');
        const q = query(
            equipamientoRef,
            where('agenteId', '==', String(agenteId)),
            orderBy('fechaAsignacion', 'desc')
        );
        const snapshot = await getDocs(q);
        console.log("[DataController] Equipamiento encontrado:", snapshot.size);
        return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    } catch (error) {
        console.error('[DataController] Error obteniendo equipamiento:', error);
        return [];
    }
}

/**
 * Obtiene todas las dotaciones con filtros opcionales
 */
export async function getAllDotaciones(filters = {}) {
    console.log("[DataController] getAllDotaciones - filtros:", filters);
    const { tipo, estado, agenteId } = filters;
    
    let armas = [];
    let vestuario = [];
    let equipamiento = [];
    
    try {
        // Cargar armas
        if (!tipo || tipo === 'all' || tipo === 'armas') {
            const armasRef = collection(db, 'dotaciones_armas');
            let constraints = [];
            if (agenteId) constraints.push(where('agenteId', '==', String(agenteId)));
            if (estado && estado !== 'all') constraints.push(where('estado', '==', estado));
            const q = constraints.length > 0 ? query(armasRef, ...constraints) : armasRef;
            const snapshot = await getDocs(q);
            armas = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        }
        
        // Cargar vestuario
        if (!tipo || tipo === 'all' || tipo === 'vestuario') {
            const vestuarioRef = collection(db, 'dotaciones_vestuario');
            let constraints = [];
            if (agenteId) constraints.push(where('agenteId', '==', String(agenteId)));
            if (estado && estado !== 'all') constraints.push(where('estado', '==', estado));
            const q = constraints.length > 0 ? query(vestuarioRef, ...constraints) : vestuarioRef;
            const snapshot = await getDocs(q);
            vestuario = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        }
        
        // Cargar equipamiento
        if (!tipo || tipo === 'all' || tipo === 'equipamiento') {
            const equipamientoRef = collection(db, 'dotaciones_equipamiento');
            let constraints = [];
            if (agenteId) constraints.push(where('agenteId', '==', String(agenteId)));
            if (estado && estado !== 'all') constraints.push(where('estado', '==', estado));
            const q = constraints.length > 0 ? query(equipamientoRef, ...constraints) : equipamientoRef;
            const snapshot = await getDocs(q);
            equipamiento = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        }
        
        console.log("[DataController] Dotaciones cargadas - armas:", armas.length, "vestuario:", vestuario.length, "equipamiento:", equipamiento.length);
        return { armas, vestuario, equipamiento };
    } catch (error) {
        console.error('[DataController] Error obteniendo dotaciones:', error);
        return { armas: [], vestuario: [], equipamiento: [] };
    }
}

// ============================================================
// CREACION DE ASIGNACIONES (Escritura directa a Firestore)
// ============================================================

/**
 * Crea una nueva asignacion de arma
 * Estado inicial: pendiente_aceptacion
 */
export async function createAsignacionArma(agenteId, armaData) {
    console.log("===========================================");
    console.log("[DataController] createAsignacionArma INICIADO");
    console.log("[DataController] agenteId:", agenteId);
    console.log("[DataController] armaData:", JSON.stringify(armaData, null, 2));
    console.log("===========================================");
    
    try {
        // Obtener usuario de forma segura
        const user = getSafeUser();
        console.log("[DataController] Usuario autenticado:", user.uid);
        
        // Preparar payload
        const payload = {
            ...armaData,
            agenteId: String(agenteId),
            estado: 'pendiente_aceptacion',
            fechaAsignacion: serverTimestamp(),
            fechaAceptacion: null,
            ultimaRevista: null,
            ultimaPractica: null,
            requiereRevista: armaData.tipoArma === 'PISTOLA',
            assignedByUid: user.uid,
            createdAt: serverTimestamp()
        };
        
        console.log("[DataController] Payload preparado, escribiendo en Firestore...");

        // Escribir en Firestore
        const docRef = await addDoc(collection(db, 'dotaciones_armas'), payload);
        
        console.log("===========================================");
        console.log("[DataController] ÉXITO! Arma guardada con ID:", docRef.id);
        console.log("===========================================");
        
        return { success: true, id: docRef.id };
        
    } catch (error) {
        console.error("===========================================");
        console.error("[DataController] ERROR en createAsignacionArma");
        console.error("[DataController] Mensaje:", error.message);
        console.error("[DataController] Codigo:", error.code);
        console.error("[DataController] Error completo:", error);
        console.error("===========================================");
        throw new Error(error.message || "No se pudo asignar el arma");
    }
}

/**
 * Crea una nueva asignacion de vestuario
 */
export async function createAsignacionVestuario(agenteId, vestuarioData) {
    console.log("===========================================");
    console.log("[DataController] createAsignacionVestuario INICIADO");
    console.log("[DataController] agenteId:", agenteId);
    console.log("===========================================");
    
    try {
        const user = getSafeUser();
        console.log("[DataController] Usuario autenticado:", user.uid);
        
        // Calcular fecha de renovacion
        const fechaRenovacion = new Date();
        const anosRenovacion = vestuarioData.anosRenovacion || vestuarioData.añosRenovacion || 2;
        fechaRenovacion.setFullYear(fechaRenovacion.getFullYear() + anosRenovacion);
        
        const payload = {
            ...vestuarioData,
            agenteId: String(agenteId),
            estado: 'pendiente_aceptacion',
            fechaEntrega: serverTimestamp(),
            fechaAceptacion: null,
            fechaRenovacion: Timestamp.fromDate(fechaRenovacion),
            assignedByUid: user.uid,
            createdAt: serverTimestamp()
        };

        console.log("[DataController] Escribiendo vestuario en Firestore...");
        const docRef = await addDoc(collection(db, 'dotaciones_vestuario'), payload);
        
        console.log("[DataController] ÉXITO! Vestuario guardado con ID:", docRef.id);
        return { success: true, id: docRef.id };
        
    } catch (error) {
        console.error("[DataController] ERROR en createAsignacionVestuario:", error);
        throw new Error(error.message || "No se pudo asignar el vestuario");
    }
}

/**
 * Crea una nueva asignacion de equipamiento
 */
export async function createAsignacionEquipamiento(agenteId, equipamientoData) {
    console.log("===========================================");
    console.log("[DataController] createAsignacionEquipamiento INICIADO");
    console.log("[DataController] agenteId:", agenteId);
    console.log("===========================================");
    
    try {
        const user = getSafeUser();
        console.log("[DataController] Usuario autenticado:", user.uid);
        
        // Calcular fecha de caducidad si tiene vida util
        let fechaCaducidad = null;
        const anosVidaUtil = equipamientoData.anosVidaUtil || equipamientoData.añosVidaUtil;
        if (anosVidaUtil) {
            fechaCaducidad = new Date();
            fechaCaducidad.setFullYear(fechaCaducidad.getFullYear() + anosVidaUtil);
        }
        
        const payload = {
            ...equipamientoData,
            agenteId: String(agenteId),
            estado: 'pendiente_aceptacion',
            fechaAsignacion: serverTimestamp(),
            fechaAceptacion: null,
            fechaCaducidad: fechaCaducidad ? Timestamp.fromDate(fechaCaducidad) : null,
            ultimaRevision: null,
            assignedByUid: user.uid,
            createdAt: serverTimestamp()
        };

        console.log("[DataController] Escribiendo equipamiento en Firestore...");
        const docRef = await addDoc(collection(db, 'dotaciones_equipamiento'), payload);
        
        console.log("[DataController] ÉXITO! Equipamiento guardado con ID:", docRef.id);
        return { success: true, id: docRef.id };
        
    } catch (error) {
        console.error("[DataController] ERROR en createAsignacionEquipamiento:", error);
        throw new Error(error.message || "No se pudo asignar el equipamiento");
    }
}

// ============================================================
// ACEPTACION DE ASIGNACIONES (El agente confirma recepcion)
// ============================================================

/**
 * Acepta una asignacion pendiente (cambia estado a 'activa')
 */
export async function acceptAsignacion({ id, collectionName }) {
    console.log(`[DataController] Intentando aceptar: ID=${id}, Colección=${collectionName}`);
    
    if (!id || !collectionName) {
        throw new Error("Datos inválidos: Falta ID o Colección");
    }

    try {
        const docRef = doc(db, collectionName, id);
        
        // Solo actualizamos lo necesario
        await updateDoc(docRef, {
            estado: 'activa',
            fechaAceptacion: serverTimestamp()
        });
        
        console.log("[DataController] Aceptación registrada con éxito.");
        return { success: true };
    } catch (error) {
        console.error("Error detallado en acceptAsignacion:", error);
        // Si el error contiene 'permission', confirmamos que es cosa de reglas
        if (error.code === 'permission-denied') {
            throw new Error("No tienes permisos para aceptar esta asignación.");
        }
        throw new Error("No se pudo confirmar la recepción en la base de datos.");
    }
}

// ============================================================
// ACTUALIZACION Y BAJA
// ============================================================

/**
 * Actualiza una asignacion existente
 */
export async function updateAsignacion(tipo, asignacionId, data) {
    console.log("[DataController] updateAsignacion - tipo:", tipo, "id:", asignacionId);
    try {
        const coleccion = `dotaciones_${tipo}`;
        const docRef = doc(db, coleccion, asignacionId);
        await updateDoc(docRef, {
            ...data,
            fechaActualizacion: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error('[DataController] Error actualizando asignacion:', error);
        throw error;
    }
}

/**
 * Da de baja una asignacion (no elimina, cambia estado)
 */
export async function deleteAsignacion(tipo, asignacionId) {
    console.log("[DataController] deleteAsignacion (baja) - tipo:", tipo, "id:", asignacionId);
    try {
        const coleccion = `dotaciones_${tipo}`;
        const docRef = doc(db, coleccion, asignacionId);
        await updateDoc(docRef, {
            estado: 'baja',
            fechaBaja: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error('[DataController] Error dando de baja asignacion:', error);
        throw error;
    }
}

// ============================================================
// REVISTA Y PRACTICA DE TIRO
// ============================================================

/**
 * Registra una revista de armas
 */
export async function createRevistaArmas(agenteId, revistaData) {
    console.log("[DataController] createRevistaArmas - agenteId:", agenteId);
    try {
        const user = getSafeUser();
        
        const payload = {
            ...revistaData,
            agenteId: String(agenteId),
            registradoPorUid: user.uid,
            fecha: serverTimestamp(),
            createdAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, 'revistas_armas'), payload);
        
        // Actualizar ultima revista en las armas revisadas
        if (revistaData.armasRevisadas && revistaData.armasRevisadas.length > 0) {
            const batch = writeBatch(db);
            revistaData.armasRevisadas.forEach(armaId => {
                const armaRef = doc(db, 'dotaciones_armas', armaId);
                batch.update(armaRef, { ultimaRevista: serverTimestamp() });
            });
            await batch.commit();
        }
        
        console.log("[DataController] Revista registrada con ID:", docRef.id);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('[DataController] Error registrando revista:', error);
        throw error;
    }
}

/**
 * Registra una practica de tiro
 */
export async function createPracticaTiro(agenteId, practicaData) {
    console.log("[DataController] createPracticaTiro - agenteId:", agenteId);
    try {
        const user = getSafeUser();
        
        const payload = {
            ...practicaData,
            agenteId: String(agenteId),
            registradoPorUid: user.uid,
            fecha: serverTimestamp(),
            createdAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, 'practicas_tiro'), payload);
        
        // Actualizar ultima practica en el arma utilizada
        if (practicaData.armaId) {
            const armaRef = doc(db, 'dotaciones_armas', practicaData.armaId);
            await updateDoc(armaRef, { ultimaPractica: serverTimestamp() });
        }
        
        console.log("[DataController] Practica registrada con ID:", docRef.id);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('[DataController] Error registrando practica:', error);
        throw error;
    }
}

// ============================================================
// ESTADISTICAS
// ============================================================

/**
 * Obtiene estadisticas generales de dotaciones
 */
export async function getDotacionesStats() {
    console.log("[DataController] getDotacionesStats - Calculando estadisticas...");
    try {
        // Contamos dotaciones activas
        const [armasSnap, vestuarioSnap, equipamientoSnap] = await Promise.all([
            getDocs(query(collection(db, 'dotaciones_armas'), where('estado', '==', 'activa'))),
            getDocs(query(collection(db, 'dotaciones_vestuario'), where('estado', '==', 'activa'))),
            getDocs(query(collection(db, 'dotaciones_equipamiento'), where('estado', '==', 'activa')))
        ]);
        
        // Calcular armas pendientes de revista
        const now = new Date();
        const currentYear = now.getFullYear();
        const aprilStart = new Date(currentYear, 3, 1); // Abril
        
        let pendientesRevista = 0;
        armasSnap.docs.forEach(docSnap => {
            const data = docSnap.data();
            if (data.requiereRevista) {
                const ultimaRevista = data.ultimaRevista?.toDate ? data.ultimaRevista.toDate() : null;
                if (!ultimaRevista || ultimaRevista < aprilStart) {
                    pendientesRevista++;
                }
            }
        });
        
        const stats = {
            success: true,
            totalArmas: armasSnap.size,
            totalVestuario: vestuarioSnap.size,
            totalEquipamiento: equipamientoSnap.size,
            pendientesRevista
        };
        
        console.log("[DataController] Estadisticas calculadas:", stats);
        return stats;
    } catch (error) {
        console.error('[DataController] Error obteniendo estadisticas:', error);
        return {
            success: false,
            totalArmas: 0,
            totalVestuario: 0,
            totalEquipamiento: 0,
            pendientesRevista: 0
        };
    }
}

/**
 * Busca agentes con dotaciones pendientes
 * @param {string} tipoPendiente - 'revista', 'renovacion', 'practica'
 * @returns {Promise<Object>} Lista de agentes con pendientes
 */
export async function getAgentesPendientes(tipoPendiente) {
    console.log("[DataController] getAgentesPendientes - tipo:", tipoPendiente);
    try {
        const agentesSet = new Set();
        
        if (tipoPendiente === 'revista' || !tipoPendiente) {
            const armasSnap = await getDocs(
                query(
                    collection(db, 'dotaciones_armas'),
                    where('estado', '==', 'activa'),
                    where('requiereRevista', '==', true)
                )
            );
            
            const now = new Date();
            const currentYear = now.getFullYear();
            
            armasSnap.docs.forEach(docSnap => {
                const data = docSnap.data();
                const ultimaRevista = data.ultimaRevista?.toDate ? data.ultimaRevista.toDate() : null;
                if (!ultimaRevista || ultimaRevista.getFullYear() < currentYear) {
                    agentesSet.add(data.agenteId);
                }
            });
        }
        
        if (tipoPendiente === 'practica' || !tipoPendiente) {
            const armasSnap = await getDocs(
                query(
                    collection(db, 'dotaciones_armas'),
                    where('estado', '==', 'activa')
                )
            );
            
            const seisMesesAtras = new Date();
            seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);
            
            armasSnap.docs.forEach(docSnap => {
                const data = docSnap.data();
                const ultimaPractica = data.ultimaPractica?.toDate ? data.ultimaPractica.toDate() : null;
                if (!ultimaPractica || ultimaPractica < seisMesesAtras) {
                    agentesSet.add(data.agenteId);
                }
            });
        }
        
        const result = { agentes: Array.from(agentesSet) };
        console.log("[DataController] Agentes con pendientes:", result.agentes.length);
        return result;
    } catch (error) {
        console.error('[DataController] Error buscando pendientes:', error);
        return { agentes: [] };
    }
}

/**
 * Genera informe de dotaciones de un agente en PDF
 * @param {string} agenteId - ID del agente
 * @returns {Promise<string>} URL del PDF generado
 */
export async function generarInformeDotaciones(agenteId) {
    console.log("[DataController] generarInformeDotaciones - agenteId:", agenteId);
    try {
        const generarInforme = httpsCallable(functions, 'generarInformeDotaciones');
        const result = await generarInforme({ agenteId });
        return result.data.pdfUrl;
    } catch (error) {
        console.error('[DataController] Error generando informe:', error);
        throw error;
    }
}

// ============================================================
// FIN DEL MÓDULO DE DOTACIONES
// ============================================================

export async function getServiceReportsFiltered(filters, lastVisibleDoc = null, pageSize = 10) {
    try {
        const reportsRef = collection(db, 'serviceReports');
        let constraints = [];

        // 1. Filtro de Fecha (Mes/Año)
        // NOTA: Si filters.month es 'all', deberías decidir si filtras por todo el año o no. 
        // Aquí asumo que siempre se selecciona mes y año para simplificar índices.
        if (filters.year && filters.month !== 'all') {
            const year = parseInt(filters.year);
            const month = parseInt(filters.month); // 0 = Enero
            
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0, 23, 59, 59);

            constraints.push(where('order.service_date', '>=', Timestamp.fromDate(startDate)));
            constraints.push(where('order.service_date', '<=', Timestamp.fromDate(endDate)));
            // Firestore requiere ordenar por el mismo campo del filtro de rango
            constraints.push(orderBy('order.service_date', 'desc'));
        } else {
            // Si no hay filtro fecha, ordenamos por creación o fecha servicio general
            constraints.push(orderBy('order.service_date', 'desc'));
        }

        // 2. Filtros opcionales
        if (filters.status && filters.status !== 'all') {
            constraints.push(where('status', '==', filters.status));
        }
        
        // 3. Paginación
        if (lastVisibleDoc) {
            constraints.push(startAfter(lastVisibleDoc));
        }

        constraints.push(limit(pageSize));

        const q = query(reportsRef, ...constraints);
        const snapshot = await getDocs(q);
        
        const reports = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
        }));

        return {
            reports,
            lastVisible: snapshot.docs[snapshot.docs.length - 1] || null,
            empty: snapshot.empty
        };
    } catch (error) {
        console.error("Error fetching reports:", error);
        throw error;
    }
}


// EN: js/dataController.js

/**
 * Obtiene partes de servicio con paginación y filtros de seguridad.
 * Soluciona el error de permisos asegurando el filtro 'assigned_agents' para agentes.
 */
export async function getServiceReports(options = {}) {
    const filters = options.filters || options || {};
    const queryLimit = options.limit || 15;
    const startAfterDoc = options.startAfterDoc || null;
    
    // 💡 CAMBIO CLAVE: Usamos el usuario que nos pasan o el del sistema antiguo
    const user = options.user || currentUser.get();
    
    if (!user) {
        console.warn("getServiceReports bloqueado: Usuario no autenticado.");
        throw new Error('Usuario no autenticado.');
    }

    const reportsRef = collection(db, 'serviceReports');
    let constraints = [];

    // --- 1. SEGURIDAD ---
    const isMando = user.role === 'admin' || user.role === 'supervisor';

    if (!isMando) {
        if (!user.agentId) throw new Error("Perfil de agente incompleto.");
        constraints.push(where('assigned_agents', 'array-contains', String(user.agentId)));
    } 
    else if (filters.agentId && filters.agentId !== 'all') {
        constraints.push(where('assigned_agents', 'array-contains', String(filters.agentId)));
    }

    // --- 2. FECHAS ---
    let start, end;
    if (filters.startDate && filters.endDate) {
        start = new Date(filters.startDate);
        end = new Date(filters.endDate);
    } else if (filters.year && filters.month) {
        start = new Date(filters.year, filters.month - 1, 1);
        end = new Date(filters.year, filters.month, 0); 
    }

    if (start && end) {
        end.setHours(23, 59, 59, 999);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            constraints.push(where('service_date_timestamp', '>=', Timestamp.fromDate(start)));
            constraints.push(where('service_date_timestamp', '<=', Timestamp.fromDate(end)));
        }
    }

    // --- 3. OTROS ---
    if (filters.status && filters.status !== 'all') {
        constraints.push(where('status', '==', filters.status));
    }

    constraints.push(orderBy('service_date_timestamp', 'desc'));

    if (startAfterDoc) constraints.push(startAfter(startAfterDoc));
    
    constraints.push(limit(queryLimit));

    // --- EJECUCIÓN ---
    try {
        const q = query(reportsRef, ...constraints);
        const querySnapshot = await getDocs(q);
        const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
        
        const data = querySnapshot.docs.map(doc => {
            const d = doc.data();
            return {
                id: doc.id,
                ...d,
                service_date_timestamp: d.service_date_timestamp?.toDate?.() || new Date(d.service_date_timestamp),
                createdAt: d.createdAt?.toDate?.() || null
            };
        });

        return { success: true, data, reports: data, lastVisible };

    } catch (error) {
        console.error("Error getServiceReports:", error);
        return { success: false, data: [], reports: [], lastVisible: null };
    }
}

export async function generateServiceReportPdf(reportId) {
    const callable = httpsCallable(functions, 'generateServiceReportPdf');
    try {
        const result = await callable({ reportId });
        return result.data;
    } catch (error) {
        console.error("Error al llamar a generateServiceReportPdf:", error);
        throw error;
    }
}

// 💡 IMPORTANTE: Exportamos el alias AL FINAL para evitar duplicados
// y asegurar que ServiceReportsPage.jsx funcione sin cambios
export const getReportsWithCursor = getServiceReports;

// Obtener incidencias con filtros
export async function getIncidencias(filters = {}) {
    try {
        const { status, limit: limitVal = 50 } = filters;
        let q = collection(db, 'incidencias_via_publica');
        const constraints = [orderBy('createdAt', 'desc')];

        if (status && status !== 'all') {
            constraints.push(where('status', '==', status));
        }
        
        constraints.push(limitQuery(limitVal));

        q = query(q, ...constraints);
        const snapshot = await getDocs(q);
        
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            // Convertir fechas para evitar errores en React
            createdAt: doc.data().createdAt?.toDate(),
            communicatedAt: doc.data().communicatedAt?.toDate(),
            resolvedAt: doc.data().resolvedAt?.toDate()
        }));
    } catch (error) {
        console.error("Error obteniendo incidencias:", error);
        throw error;
    }
}

// Crear incidencia (Agente)
export async function createIncidencia(data) {
    const user = getSafeUser(); // Usamos tu helper seguro
    try {
        const payload = {
            ...data,
            status: 'pendiente', // pendiente -> tramitada -> resuelta
            createdByUid: user.uid,
            createdAt: serverTimestamp(),
            agentName: user.displayName || 'Agente', // Asumiendo que user tiene displayName
            agentId: user.agentId || 'N/A'
        };
        const docRef = await addDoc(collection(db, 'incidencias_via_publica'), payload);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error("Error creando incidencia:", error);
        throw error;
    }
}

// Actualizar estado (Admin: Tramitar o Resolver)
export async function updateIncidenciaStatus(id, updateData) {
    try {
        const docRef = doc(db, 'incidencias_via_publica', id);
        
        // Si se tramita, guardamos fecha comunicación
        if (updateData.status === 'tramitada') {
            updateData.communicatedAt = serverTimestamp();
        }
        // Si se resuelve, guardamos fecha resolución
        if (updateData.status === 'resuelta') {
            updateData.resolvedAt = serverTimestamp();
        }

        await updateDoc(docRef, updateData);
        return { success: true };
    } catch (error) {
        console.error("Error actualizando incidencia:", error);
        throw error;
=======
export async function getScheduleForMonth(monthId) {
    console.log(`[dataController.js] 📥 Buscando datos para el mes: "${monthId}"`);
    if (!monthId) {
        console.error("[dataController.js] 🛑 ERROR: getScheduleForMonth fue llamado sin un monthId.");
        return null;
>>>>>>> 755f45b7c267bfffa0ee6a809a10400904711786
    }
    try {
        const docRef = doc(db, 'schedules', monthId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            console.log('[dataController.js] ✅ ¡Datos encontrados!', docSnap.data());
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            console.error(`[dataController.js] ❌ ERROR DE DATOS: No se encontró ningún documento con el ID: "${monthId}".`);
            return null;
        }
    } catch (error) {
        console.error("[dataController.js] 🔥 Error catastrófico al obtener los datos del cuadrante:", error);
        return null;
    }
}

export async function getLatestActivityFeed() {
    try {
        const feedRef = collection(db, 'markedDates');
        const q = query(feedRef, orderBy('date', 'desc'), limit(10));
        const querySnapshot = await getDocs(q);
        const feed = [];
        querySnapshot.forEach((doc) => {
            feed.push({ id: doc.id, ...doc.data() });
        });
        return feed;
    } catch (error) {
        console.error('Error al obtener el feed de actividad:', error);
        return [];
    }
}

export async function getLatestMarkedDates() {
    try {
        const markedDatesRef = collection(db, 'markedDates');
        const q = query(markedDatesRef, orderBy('date', 'desc'), limit(10));
        const querySnapshot = await getDocs(q);
        const dates = [];
        querySnapshot.forEach((doc) => {
            dates.push({ id: doc.id, ...doc.data() });
        });
        return dates;
    } catch (error) {
        console.error('Error al obtener las fechas marcadas:', error);
        return [];
    }
}

export async function deleteServiceReport(reportId) {
    const callable = httpsCallable(functions, 'deleteServiceReport');
    return callable({ reportId }).then((result) => result.data);
}

export async function getAllShiftTypes() {
    const workShifts = [
        { quadrant_symbol: 'M', name: 'Mañana' },
        { quadrant_symbol: 'T', name: 'Tarde' },
        { quadrant_symbol: 'N', name: 'Noche' },
        { quadrant_symbol: 'L', name: 'Libre' },
    ];
    try {
        const permissionTypes = await getPermissionTypes();
        return [...workShifts, ...permissionTypes];
    } catch (error) {
        console.error('Error al obtener todos los tipos de turno:', error);
        return workShifts;
    }
}

export async function uploadRecordImage(file) {
    if (!file) throw new Error('No se proporcionó ningún archivo.');
    const fileName = file.name || `imagen.${file.type.split('/')[1] || 'jpg'}`;
    const filePath = `record_images/${Date.now()}-${fileName}`;
    const storageRef = ref(storage, filePath);
    try {
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    } catch (error) {
        console.error('Error en dataController al subir la imagen del registro:', error);
        throw new Error('No se pudo subir la imagen del registro.');
    }
}

// --- MÓDULO DE IDENTIFICACIONES (CRUD) ---

export async function savePersona(dni, data) {
    if (!dni) throw new Error("El DNI es obligatorio para crear una ficha de persona.");
    const personaRef = doc(db, 'personas', dni);
    const finalData = { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    await setDoc(personaRef, finalData);
    return { id: personaRef.id };
}

export async function updatePersona(personaId, data) {
    if (!personaId) throw new Error("Se requiere el ID de la persona para actualizar.");
    const personaRef = doc(db, 'personas', personaId);
    const finalData = { ...data, updatedAt: serverTimestamp() };
    await updateDoc(personaRef, finalData);
    return { id: personaRef.id };
}

export async function saveVehiculo(matricula, data) {
    if (!matricula) throw new Error("La matrícula es obligatoria para crear una ficha de vehículo.");
    const vehiculoRef = doc(db, 'vehiculos', matricula);
    const finalData = { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    await setDoc(vehiculoRef, finalData);
    return { id: vehiculoRef.id };
}

export async function updateVehiculo(vehiculoId, data) {
    if (!vehiculoId) throw new Error("Se requiere el ID del vehículo para actualizar.");
    const vehiculoRef = doc(db, 'vehiculos', vehiculoId);
    const finalData = { ...data, updatedAt: serverTimestamp() };
    await updateDoc(vehiculoRef, finalData);
    return { id: vehiculoRef.id };
}

export async function getVehiculoByMatricula(matricula) {
    if (!matricula || matricula.trim() === '') {
        throw new Error("Se requiere una matrícula para la búsqueda.");
    }
    const vehiculoRef = doc(db, 'vehiculos', matricula.trim().toUpperCase());
    const docSnap = await getDoc(vehiculoRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
}

export async function searchVehiculos(searchTerm) {
    const callable = httpsCallable(functions, 'searchVehiculos');
    try {
        const result = await callable({ searchTerm });
        if (result.data.success) {
            return result.data.vehicles;
        } else {
            throw new Error('La búsqueda en el servidor no tuvo éxito.');
        }
    } catch (error) {
        console.error("Error en dataController al llamar a searchVehiculos:", error);
        throw error;
    }
}

export async function saveEstablecimiento(cif, data) {
    if (!cif) throw new Error("El CIF es obligatorio para crear una ficha de establecimiento.");
    const establecimientoRef = doc(db, 'establecimientos', cif);
    const finalData = { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    await setDoc(establecimientoRef, finalData);
    return { id: establecimientoRef.id };
}

export async function updateEstablecimiento(establecimientoId, data) {
    if (!establecimientoId) throw new Error("Se requiere el ID del establecimiento para actualizar.");
    const establecimientoRef = doc(db, 'establecimientos', establecimientoId);
    const finalData = { ...data, updatedAt: serverTimestamp() };
    await updateDoc(establecimientoRef, finalData);
    return { id: establecimientoRef.id };
}

export async function searchEstablecimientos(searchTerm) {
    try {
        const establecimientosRef = collection(db, 'establecimientos');
        const qNombre = query(establecimientosRef, where('nombreComercial', '>=', searchTerm), where('nombreComercial', '<=', searchTerm + '\uf8ff'));
        const querySnapshot = await getDocs(qNombre);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error al buscar establecimientos:", error);
        throw new Error("La búsqueda de establecimientos falló.");
    }
}

// --- MÓDULO DE GESTIÓN DE REQUERIMIENTOS (CRUD) ---

export async function deleteRequerimiento(reportId, requerimientoId) {
    if (!reportId || !requerimientoId) {
        throw new Error("Se requieren los IDs del parte y del requerimiento.");
    }
    const requerimientoRef = doc(db, 'serviceReports', reportId, 'requerimientos', requerimientoId);
    try {
        await deleteDoc(requerimientoRef);
    } catch (error) {
        console.error("Error al eliminar el requerimiento:", error);
        throw new Error("No se pudo eliminar el requerimiento de la base de datos.");
    }
}

export async function updateRequerimiento(reportId, requerimientoId, data) {
    if (!reportId || !requerimientoId || !data) {
        throw new Error("Faltan datos para actualizar el requerimiento.");
    }
    const requerimientoRef = doc(db, 'serviceReports', reportId, 'requerimientos', requerimientoId);
    const updateData = { ...data, updatedAt: serverTimestamp() };
    try {
        await updateDoc(requerimientoRef, updateData);
    } catch (error) {
        console.error("Error al actualizar el requerimiento:", error);
        throw new Error("No se pudo actualizar el requerimiento.");
    }
}

export async function getDashboardStats(startDate, endDate) {
    const callable = httpsCallable(functions, 'getDashboardStats');
    try {
        const result = await callable({ startDate, endDate });
        if (result.data.success) {
            return result.data;
        } else {
            throw new Error('La función de estadísticas devolvió un error.');
        }
    } catch (error) {
        console.error("Error al llamar a la Cloud Function 'getDashboardStats':", error);
        throw error;
    }
}

export async function getDocumentTemplateById(templateId) {
    try {
        const docRef = doc(db, "documentTemplates", templateId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            throw new Error("No se encontró la plantilla con el ID proporcionado.");
        }
    } catch (error) {
        console.error("Error al obtener el documento por ID:", error);
        throw error;
    }
}

// --- MÓDULO DE GESTIÓN DE TAREAS ---

export async function resolveTaskWithComment(data) {
    const callable = httpsCallable(functions, 'resolveTaskWithComment');
    try {
        const result = await callable(data);
        return result.data;
    } catch (error) {
        console.error('Error al llamar a la función resolveTaskWithComment:', error);
        throw new Error(error.message);
    }
}

export async function createTask(taskData) {
    const user = currentUser.get();
    if (!user) throw new Error('Usuario no autenticado.');
    const payload = {
        ...taskData,
        status: 'pendiente',
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        completedAt: null,
        validatedAt: null
    };
    try {
        const docRef = await addDoc(collection(db, 'tareas'), payload);
        return { id: docRef.id };
    } catch (error) {
        console.error("Error al crear la tarea:", error);
        throw new Error("No se pudo crear la tarea en la base de datos.");
    }
}

export async function updateTaskStatus(taskId, newStatus) {
    if (!taskId || !newStatus) throw new Error('Faltan datos para actualizar la tarea.');
    const taskRef = doc(db, 'tareas', taskId);
    const updateData = { status: newStatus };
    if (newStatus === 'finalizada') {
        updateData.completedAt = serverTimestamp();
    } else if (newStatus === 'validada') {
        updateData.validatedAt = serverTimestamp();
    }
    try {
        await updateDoc(taskRef, updateData);
    } catch (error) {
        console.error("Error al actualizar el estado de la tarea:", error);
        throw new Error("No se pudo actualizar la tarea.");
    }
}

export async function getPendingTasksForAgent(agentId) {
    if (!agentId) return [];
    const q = query(collection(db, 'tareas'), where('assignedAgentId', '==', agentId), where('status', '==', 'pendiente'), orderBy('createdAt', 'desc'));
    try {
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error al obtener las tareas del agente:", error);
        throw new Error("No se pudieron cargar las tareas pendientes.");
    }
}

export async function getAllTasks(options = {}) {
    const { limit: queryLimit = 15, startAfterDoc, status, agentId } = options;
    const tasksCol = collection(db, 'tareas');
    let queryConstraints = [];
    if (status && status !== 'all') {
        queryConstraints.push(where('status', '==', status));
    }
    if (agentId && agentId !== 'all') {
        queryConstraints.push(where('assignedAgentId', '==', agentId));
    }
    queryConstraints.push(orderBy('createdAt', 'desc'));
    if (startAfterDoc) {
        queryConstraints.push(startAfter(startAfterDoc));
    }
    queryConstraints.push(limit(queryLimit));
    const q = query(tasksCol, ...queryConstraints);
    try {
        const querySnapshot = await getDocs(q);
        const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
        const tasks = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return { tasks, lastVisible };
    } catch (error) {
        console.error('Error al obtener todas las tareas:', error);
        throw new Error('No se pudieron cargar las tareas. Revisa si falta un índice en Firestore.');
    }
}

export async function getTasksByOrderId(orderId) {
    if (!orderId) return [];
    const tasksRef = collection(db, 'tareas');
    const q = query(tasksRef, where('orderId', '==', orderId), orderBy('createdAt', 'asc'));
    try {
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt ? data.createdAt.toDate() : null,
            };
        });
    } catch (error) {
        console.error(`Error al obtener las tareas para la orden ${orderId}:`, error);
        throw new Error('No se pudieron cargar las tareas. Revisa si falta un índice en Firestore.');
    }
}

export async function getTasksForAgent(agentId, status = 'all') {
    if (!agentId) return [];
    const tasksRef = collection(db, 'tareas');
    let queryConstraints = [where('assignedAgentId', '==', agentId), orderBy('createdAt', 'desc')];
    if (status !== 'all') {
        queryConstraints.unshift(where('status', '==', status));
    }
    const q = query(tasksRef, ...queryConstraints);
    try {
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error al obtener las tareas del agente:", error);
        throw new Error("No se pudieron cargar las tareas.");
    }
}

export async function generateRegistroPdf(data) {
    const callable = httpsCallable(functions, 'generateRegistroPdf');
    try {
        const result = await callable(data);
        return result.data;
    } catch (error) {
        console.error("Error al llamar a la Cloud Function 'generateRegistroPdf':", error);
        throw error;
    }
}

export function getAgentName(agentId) {
    const agents = availableAgents.get();
    const agent = agents.find(a => a.id === agentId);
    return agent ? agent.name : 'Agente Desconocido';
}