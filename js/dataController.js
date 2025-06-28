// js/dataController.js

import { collection, query, where, orderBy, getDocs, doc, addDoc, getDoc, serverTimestamp, documentId, Timestamp } from 'firebase/firestore'; 
import { db, app, storage } from './firebase-config.js'; 
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'; 
import { getFunctions, httpsCallable } from 'firebase/functions'; 
import { currentUser, availableAgents, setAvailableAgents, setPendingNotificationsCount, setScheduleData } from './state.js';
import { parseISO } from 'date-fns'; // <--- LÍNEA CORREGIDA: Eliminado el '='

const functions = getFunctions(app);

/**
 * Carga la lista inicial de agentes desde Firestore y la almacena en el estado global.
 * @returns {Promise<Array<Object>>} Una promesa que se resuelve con la lista de agentes.
 */
export async function loadInitialAgents() {
    console.log("[DEBUG - dataController] Iniciando loadInitialAgents...");
    try {
        const agentsCol = collection(db, 'agents');
        // Usar FieldPath.documentId() importado de 'firebase/firestore'
        const q = query(agentsCol, orderBy(documentId())); 
        const querySnapshot = await getDocs(q);
        
        const agentsList = querySnapshot.docs.map(doc => ({
            id: String(doc.id), 
            ...doc.data() 
        }));
        
        console.log("[DEBUG - dataController] Agentes cargados desde Firestore:", agentsList);
        setAvailableAgents(agentsList); // Actualiza el átomo de Nanostores
        console.log("[DEBUG - dataController] 'availableAgents' atom actualizado. Verificación:", availableAgents.get()); 

        return agentsList;
    } catch (error) {
        console.error("ERROR - dataController: Error cargando agentes iniciales:", error);
        throw error;
    }
}

/**
 * Obtiene los tipos de permisos/licencias desde Firestore.
 * @returns {Promise<Array<Object>>} Una lista de los tipos de permiso.
 */
export async function getPermissionTypes() {
    try {
        const typesCol = collection(db, 'permissionTypes');
        const q = query(typesCol, orderBy('name'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("ERROR - dataController: Error cargando tipos de permiso:", error);
        throw error;
    }
}

/**
 * Añade una nueva solicitud de permiso a Firestore.
 * @param {Object} requestData - Los datos de la solicitud.
 * @returns {Promise<{success: boolean}>}
 */
export async function addSolicitud(requestData) {
    try {
        const userProfile = currentUser.get(); // Obtener del átomo
        if (!userProfile) throw new Error("Usuario no autenticado.");

        const solicitudPayload = {
            ...requestData,
            agentId: String(requestData.agentId), // Asegurar que agentId es un string
            userId: userProfile.uid,
            status: 'Pendiente',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            attachments: requestData.attachments || [],
            startDate: Timestamp.fromDate(parseISO(requestData.startDate)),
            endDate: Timestamp.fromDate(parseISO(requestData.endDate))
        };
        await addDoc(collection(db, 'solicitudes'), solicitudPayload);
        return { success: true };
    } catch (error) {
        console.error("ERROR - dataController: Error añadiendo solicitud:", error);
        throw error;
    }
}

/**
 * Sube un archivo a Firebase Storage.
 * @param {File} file - El archivo a subir.
 * @param {string} path - La ruta de destino en el Storage.
 * @returns {Promise<string>} La URL de descarga del archivo.
 */
export async function uploadFile(file, path) {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
            () => { /* Se puede implementar un indicador de progreso aquí */ },
            (error) => {
                console.error("ERROR - dataController: Error al subir archivo:", error);
                reject(error);
            },
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(downloadURL);
            }
        );
    });
}

/**
 * Obtiene una lista de solicitudes de permisos filtrada.
 * @param {Object} [filters={}] - Filtros a aplicar (status, agentId).
 * @returns {Promise<Array<Object>>} Una lista de solicitudes.
 */
export async function getSolicitudes(filters = {}) { 
    console.log("[DEBUG - dataController] getSolicitudes llamado con filtros:", filters);
    const userProfile = currentUser.get();
    if (!userProfile) throw new Error("Perfil de usuario no disponible.");

    const solicitudesRef = collection(db, 'solicitudes');
    let q = query(solicitudesRef, orderBy('createdAt', 'desc'));

    if (filters.status && filters.status !== 'all') {
        q = query(q, where('status', '==', filters.status));
    }

    if (filters.agentId && filters.agentId !== 'all') {
        q = query(q, where('agentId', '==', String(filters.agentId))); // Asegurar comparación como string
    }

    // Si el usuario no es admin, solo puede ver sus propias solicitudes
    if (userProfile.role !== 'admin') {
        q = query(q, where('userId', '==', userProfile.uid));
    }

    try {
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("ERROR - dataController: Error cargando solicitudes de permiso:", error);
        throw error;
    }
}


// --- FUNCIONES QUE INVOCAN CLOUD FUNCTIONS ---

/**
 * Llama a una Cloud Function para añadir una solicitud de cambio de turno.
 * @param {Object} requestData - Datos de la propuesta de cambio.
 */
export async function addShiftChangeRequest(requestData) {
    console.log("[DEBUG - dataController] addShiftChangeRequest llamado. Invocando Cloud Function.");
    const callable = httpsCallable(functions, 'addShiftChangeRequest');
    try {
        const result = await callable(requestData);
        if (result.data?.success) return result.data;
        throw new Error(result.data?.message || "Error desconocido al añadir solicitud de cambio.");
    } catch (error) {
        console.error("ERROR - dataController: Error al llamar a Cloud Function addShiftChangeRequest:", error);
        throw error;
    }
}

/**
 * Llama a una Cloud Function para obtener las solicitudes de cambio de turno.
 * @param {Object} [filters={}] - Filtros a aplicar (status, agentId).
 */
export async function getShiftChangeRequests(filters = {}) {
    console.log("[DEBUG - dataController] getShiftChangeRequests llamado. Invocando Cloud Function.");
    const userProfile = currentUser.get();
    if (!userProfile) throw new Error("Perfil de usuario no disponible.");

    const callable = httpsCallable(functions, 'getShiftChangeRequestsCallable');
    
    try {
        const result = await callable({
            status: filters.status || null,
            agentId: userProfile.role === 'admin' ? (filters.agentId || 'all') : userProfile.agentId 
        });

        if (result.data?.success) {
            return result.data.data.map(req => {
                // Convierte fechas de string (ISO) a objetos Date
                Object.keys(req).forEach(key => {
                    if (typeof req[key] === 'string' && key.toLowerCase().includes('date')) {
                        try {
                            req[key] = parseISO(req[key]);
                        } catch (e) {
                            console.warn(`Could not parse date string: ${req[key]}`);
                        }
                    }
                });
                return req;
            });
        } else {
            throw new Error(result.data?.message || "Error al obtener solicitudes de cambio de turno.");
        }
    } catch (error) {
        console.error("ERROR - dataController: Error al llamar a getShiftChangeRequestsCallable:", error);
        throw error;
    }
}

/**
 * Llama a una Cloud Function para responder a una propuesta de cambio de turno.
 * @param {{changeId: string, newStatus: string}} requestData - Datos de la respuesta.
 */
export async function respondToShiftChangeRequest(requestData) {
    const callable = httpsCallable(functions, 'respondToShiftChangeRequest');
    try {
        const result = await callable(requestData);
        if (result.data?.success) return result.data;
        throw new Error(result.data?.message || "Error en Cloud Function de respuesta.");
    } catch (error) {
        console.error("ERROR - dataController: Error al enviar la respuesta:", error);
        throw error;
    }
}

/**
 * Llama a una Cloud Function para añadir un nuevo agente.
 * @param {{id: string|null, name: string, active: boolean}} agentData - Datos del nuevo agente.
 */
export async function addAgent(agentData) {
    const callable = httpsCallable(functions, 'addAgentCallable');
    try {
        const result = await callable(agentData);
        if (result.data?.success) return result.data;
        throw new Error(result.data?.message || "Error al añadir agente.");
    } catch (error) {
        console.error("ERROR - dataController: Error al añadir agente (Cloud Function):", error);
        throw error;
    }
}

/**
 * Llama a una Cloud Function para actualizar un agente existente.
 * @param {string} agentId - El ID del agente a actualizar.
 * @param {Object} updateData - Los campos a actualizar.
 */
export async function updateAgent(agentId, updateData) {
    const callable = httpsCallable(functions, 'updateAgentCallable');
    try {
        const result = await callable({ agentId, updateData });
        if (result.data?.success) return result.data;
        throw new Error(result.data?.message || "Error al actualizar agente.");
    } catch (error) {
        console.error("ERROR - dataController: Error al actualizar agente:", error);
        throw error;
    }
}

/**
 * Llama a una Cloud Function para eliminar un agente.
 * @param {string} agentId - El ID del agente a eliminar.
 */
export async function deleteAgent(agentId) {
    const callable = httpsCallable(functions, 'deleteAgentCallable');
    try {
        const result = await callable({ agentId });
        if (result.data?.success) return result.data;
        throw new Error(result.data?.message || "Error al eliminar agente.");
    } catch (error) {
        console.error("ERROR - dataController: Error al eliminar agente:", error);
        throw error;
    }
}

/**
 * Llama a una Cloud Function para aprobar o rechazar una solicitud de permiso.
 * @param {{solicitudId: string, newStatus: string}} requestData - Datos de la acción.
 */
export async function updateSolicitudStatus(requestData) {
    const callable = httpsCallable(functions, 'updateSolicitudStatus');
    try {
        const result = await callable(requestData);
        if (result.data?.success) return result.data;
        throw new Error(result.data?.message || "Error al actualizar estado de solicitud.");
    } catch (error) {
        console.error("ERROR - dataController: Error al llamar a updateSolicitudStatus (Cloud Function):", error);
        throw error;
    }
}


// === LÓGICA DE NOTIFICACIONES ===

/**
 * Calcula y actualiza el número total de notificaciones pendientes para el usuario actual.
 */
export async function updateNotificationCount() {
    console.log("[DEBUG - dataController] updateNotificationCount llamado.");
    const userProfile = currentUser.get();
    if (!userProfile) {
        setPendingNotificationsCount(0);
        console.log("[DEBUG - dataController] No hay usuario logueado. Contador de notificaciones: 0");
        return;
    }

    let totalNotifications = 0;

    try {
        // Para ADMIN: Contar solicitudes de permisos pendientes y cambios de turno pendientes/aprobados.
        if (userProfile.role === 'admin') {
            const permissionRequests = await getSolicitudes({ status: 'Pendiente' });
            totalNotifications += permissionRequests.length;
            console.log(`[DEBUG - dataController] Admin: Permisos Pendientes: ${permissionRequests.length}`);

            const shiftChangeRequests = await getShiftChangeRequests();
            const approvedButNotNotified = shiftChangeRequests.filter(req => req.status === 'Aprobado_Ambos' && req.adminNotified === false);
            const pendingForAdminReview = shiftChangeRequests.filter(req => req.status === 'Pendiente_Target');
            
            totalNotifications += approvedButNotNotified.length;
            totalNotifications += pendingForAdminReview.length; 
            
            console.log(`[DEBUG - dataController] Admin: Cambios Aprobados no vistos: ${approvedButNotNotified.length}`);
            console.log(`[DEBUG - dataController] Admin: Cambios Pendientes de otros: ${pendingForAdminReview.length}`);
        }
        // Para GUARDIAS: Contar solo propuestas de cambio de turno dirigidas a ellos.
        else if (userProfile.role === 'guard') {
            const shiftChangeRequests = await getShiftChangeRequests({ status: 'Pendiente_Target' });
            const pendingForGuard = shiftChangeRequests.filter(req => String(req.targetAgentId) === String(userProfile.agentId));
            totalNotifications += pendingForGuard.length;
            console.log(`[DEBUG - dataController] Guard: Cambios de Turno Pendientes (para mí): ${pendingForGuard.length}`);
        }
    } catch (error) {
        console.error("ERROR - dataController: Fallo al calcular notificaciones:", error);
    }
    
    setPendingNotificationsCount(totalNotifications);
    console.log("[DEBUG - dataController] Total de notificaciones pendientes actualizado a:", totalNotifications);
}

/**
 * Llama a una Cloud Function para marcar una notificación de cambio de turno como vista por el admin.
 * @param {string} changeId - El ID de la solicitud de cambio de turno.
 */
export async function markShiftChangeNotificationAsSeen(changeId) {
    const callable = httpsCallable(functions, 'markShiftChangeNotificationAsSeen');
    try {
        const result = await callable({ changeId });
        console.log("[DEBUG - dataController] Notificación marcada como vista:", changeId, result.data);
        await updateNotificationCount();
        return result.data;
    } catch (error) {
        console.error("ERROR - dataController: Error al marcar notificación como vista (Cloud Function):", error);
        throw error;
    }
}