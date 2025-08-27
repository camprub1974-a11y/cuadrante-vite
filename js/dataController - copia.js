// js/dataController.js (VERSIÓN FINAL Y CORREGIDA)

import { collection, query, where, orderBy, getDocs, doc, addDoc, getDoc, serverTimestamp, documentId, Timestamp, setDoc, updateDoc, deleteDoc, limit } from 'firebase/firestore'; 
import { db, app, storage, auth } from './firebase-config.js';
import { ref, listAll, uploadBytes, getDownloadURL } from 'firebase/storage'; 
import { getFunctions, httpsCallable } from 'firebase/functions';
import { currentUser, setAvailableAgents, setPendingNotificationsCount } from './state.js';
import { parseISO, endOfMonth, startOfMonth } from 'date-fns';
import { getMonthNumberFromName, parseDateToISO } from './utils.js';
import { toZonedTime } from 'date-fns-tz';

// Inicialización de Firebase Functions, especificando la región para evitar errores.
const functions = getFunctions(app, 'us-central1');
const MADRID_TIMEZONE = 'Europe/Madrid';

// --- ÓRDENES Y PARTES DE SERVICIO ---

export async function createServiceOrder(orderData) {
    const callable = httpsCallable(functions, 'createServiceOrder');
    return callable(orderData).then(result => result.data);
}

export async function updateServiceOrder(orderId, updateData) {
    const callable = httpsCallable(functions, 'updateServiceOrder');
    return callable({ orderId, updateData }).then(result => result.data);
}

export async function getServiceOrders(filters = {}) {
    const callable = httpsCallable(functions, 'getServiceOrders');
    return callable(filters).then(result => result.data);
}

export async function assignResourcesToOrder(assignmentData) {
    const callable = httpsCallable(functions, 'assignResourcesToOrder');
    return callable(assignmentData).then(result => result.data);
}

export async function startServiceOrder(orderId) {
    const callable = httpsCallable(functions, 'startServiceOrder');
    return callable({ orderId }).then(result => result.data);
}

export async function addReportEntry(entryData) {
    const callable = httpsCallable(functions, 'addReportEntry');
    return callable(entryData).then(result => result.data);
}

export async function getReportForOrder(orderId) {
    const callable = httpsCallable(functions, 'getReportForOrder');
    return callable({ orderId }).then(result => result.data);
}

export async function getServiceReportDetails(reportId) {
    const reportRef = doc(db, 'serviceReports', reportId);
    const reportSnap = await getDoc(reportRef);
    if (!reportSnap.exists()) throw new Error("El parte de servicio no fue encontrado.");

    const reportData = { id: reportSnap.id, ...reportSnap.data() };

    if (reportData.order_id) {
        const orderRef = doc(db, 'serviceOrders', reportData.order_id);
        const orderSnap = await getDoc(orderRef);
        if (orderSnap.exists()) {
            reportData.order = { id: orderSnap.id, ...orderSnap.data() };
        }
    }

    const requerimientosRef = collection(db, 'serviceReports', reportId, 'requerimientos');
    const qRequerimientos = query(requerimientosRef, orderBy('createdAt', 'asc'));
    const requerimientosSnap = await getDocs(qRequerimientos);
    reportData.requerimientos = requerimientosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    return reportData;
}

export async function submitServiceReport(reportId) {
    const callable = httpsCallable(functions, 'submitServiceReport');
    return callable({ reportId }).then(result => result.data);
}

export async function validateServiceReport(validationData) {
    const callable = httpsCallable(functions, 'validateServiceReport');
    return callable(validationData).then(result => result.data);
}

export async function getServiceReports(filters = {}) {
    const callable = httpsCallable(functions, 'getServiceReports');
    return callable(filters).then(result => result.data); 
}

export async function createDefaultServiceOrders(date, templateShiftType) {
    const callable = httpsCallable(functions, 'createDefaultServiceOrders');
    return callable({ date, templateShiftType }).then(result => result.data);
}

export async function updateChecklistItemStatus(data) {
    const callable = httpsCallable(functions, 'updateChecklistItemStatus');
    return callable(data).then(result => result.data);
}

export async function generateNextOrderNumber(service_date) {
    const callable = httpsCallable(functions, 'generateNextOrderNumber');
    return callable({ service_date }).then(result => result.data);
}

export async function deleteServiceOrder(orderId) {
    const callable = httpsCallable(functions, 'deleteServiceOrder');
    return callable({ orderId }).then(result => result.data);
}

export async function updateReportSummary(reportId, summaryData) {
    const callable = httpsCallable(functions, 'updateReportSummary');
    return callable({ reportId, summaryData }).then(result => result.data);
}

export async function addRequerimiento(reportId, description) {
    const callable = httpsCallable(functions, 'addRequerimiento');
    return callable({ reportId, description }).then(result => result.data);
}

export async function updateRequerimientoStatus(data) {
    const callable = httpsCallable(functions, 'updateRequerimientoStatus');
    return callable(data).then(result => result.data);
}

// --- MÓDULO DE CROQUIS ---

export async function getCroquisAssets() {
    const assetsRef = ref(storage, 'croquis_assets');
    const assets = { vias: [], vehiculos: [], senales: [] };
    const folders = await listAll(assetsRef);
    for (const folderRef of folders.prefixes) {
        const category = folderRef.name;
        if (assets[category]) {
            const items = await listAll(folderRef);
            for (const itemRef of items.items) {
                const url = await getDownloadURL(itemRef);
                assets[category].push({ name: itemRef.name.split('.')[0], url: url });
            }
        }
    }
    return assets;
}

export async function uploadCroquisImage(file) {
    const user = currentUser.get();
    if (!user) throw new Error("Usuario no autenticado.");
    const timestamp = new Date().getTime();
    const fileName = `croquis_${user.agentId}_${timestamp}.png`;
    const storageRef = ref(storage, `sketches/${fileName}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
}

export async function saveSketchRecord(sketchData) {
    const user = currentUser.get();
    if (!user || !user.uid || !user.agentId) throw new Error("Datos de usuario no válidos.");
    const sketchPayload = {
        ...sketchData,
        createdAt: serverTimestamp(),
        createdByAgentId: user.agentId,
        createdByUid: user.uid
    };
    return addDoc(collection(db, "sketches"), sketchPayload);
}

export async function getSketches() {
    const user = currentUser.get();
    if (!user) throw new Error("Usuario no autenticado.");

    const sketchesCol = collection(db, 'sketches');
    let q;
    if (user.role === 'admin' || user.role === 'supervisor') {
        q = query(sketchesCol, orderBy('fechaSuceso', 'desc'));
    } else {
        q = query(sketchesCol, where('createdByUid', '==', user.uid), orderBy('fechaSuceso', 'desc'));
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        if (data.fechaSuceso?.toDate) {
            data.fechaSuceso = data.fechaSuceso.toDate();
        }
        return { id: doc.id, ...data };
    });
}

export async function getSketchById(sketchId) {
    const docRef = doc(db, 'sketches', sketchId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.fechaSuceso?.toDate) {
            data.fechaSuceso = data.fechaSuceso.toDate();
        }
        return { id: docSnap.id, ...data };
    } else {
        throw new Error("El croquis no fue encontrado.");
    }
}

export async function updateSketch(sketchId, updateData) {
    const callable = httpsCallable(functions, 'updateSketch');
    return callable({ sketchId, updateData }).then(result => result.data);
}

// ✅ 1. TIMEOUT DEL CLIENTE AÑADIDO
export async function generateSketchPdf(sketchId) {
    const callable = httpsCallable(functions, 'generateSketchPdf', { timeout: 120000 }); // 120 segundos de espera
    return callable({ sketchId }).then(result => result.data);
}

export async function deleteSketch(sketchId) {
    const callable = httpsCallable(functions, 'deleteSketch');
    return callable({ sketchId }).then(result => result.data);
}

// --- MÓDULO DE REGISTRO ELECTRÓNICO ---

export async function generateNextRegistrationNumber(documentType) {
    const callable = httpsCallable(functions, 'generateNextRegistrationNumber');
    return callable({ documentType }).then(result => result.data);
}

export async function createRegistro(documentType, data) {
    const callable = httpsCallable(functions, 'createRegistro');
    return callable({ documentType, data }).then(result => result.data);
}

export async function getRegistroById(recordId) {
    const docRef = doc(db, 'registros', recordId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
    } else {
        throw new Error("El registro no fue encontrado.");
    }
}

export async function getRegistros(filters = {}) {
    const registrosCol = collection(db, 'registros');
    let queryConstraints = [where('status', '!=', 'eliminado')];
    
    if (filters.type && filters.type !== 'all') {
        queryConstraints.push(where('documentType', '==', filters.type));
    }
    if (filters.destinatario) {
        queryConstraints.push(where('details.destinatario', '==', filters.destinatario));
    }
    if (filters.year && filters.year !== 'all') {
        const yearInt = parseInt(filters.year);
        const monthInt = filters.month && filters.month !== 'all' ? parseInt(filters.month) - 1 : null;
        let startDate, endDate;
        if (monthInt !== null) {
            startDate = new Date(yearInt, monthInt, 1);
            endDate = new Date(yearInt, monthInt + 1, 0, 23, 59, 59, 999);
        } else {
            startDate = new Date(yearInt, 0, 1);
            endDate = new Date(yearInt, 11, 31, 23, 59, 59, 999);
        }
        queryConstraints.push(where('createdAt', '>=', startDate), where('createdAt', '<=', endDate));
    }
    
    queryConstraints.push(orderBy('createdAt', 'desc'));
    const q = query(registrosCol, ...queryConstraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function updateRegistro(recordId, data) {
    const callable = httpsCallable(functions, 'updateRegistro');
    return callable({ recordId, updateData: data }).then(result => result.data);
}

export async function markRegistroAsDeleted(recordId, reason) {
    const callable = httpsCallable(functions, 'markRegistroAsDeleted');
    return callable({ recordId, reason }).then(result => result.data);
}

// --- MÓDULO DE PLANTILLAS DE DOCUMENTOS ---

export async function getDocumentTemplates() {
    const templatesCol = collection(db, 'documentTemplates');
    const q = query(templatesCol, orderBy('templateName', 'asc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function createDocumentTemplate(templateData) {
    const callable = httpsCallable(functions, 'createDocumentTemplate');
    return callable(templateData).then(result => result.data);
}

export async function updateDocumentTemplate(templateId, updateData) {
    const callable = httpsCallable(functions, 'updateDocumentTemplate');
    return callable({ templateId, updateData }).then(result => result.data);
}

export async function getTemplatesByType(documentType) {
    const templatesCol = collection(db, 'documentTemplates');
    const q = query(templatesCol, where('documentType', '==', documentType), orderBy('templateName', 'asc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function deleteDocumentTemplate(templateId) {
    const callable = httpsCallable(functions, 'deleteDocumentTemplate');
    return callable({ templateId }).then(result => result.data);
}

// --- OTRAS FUNCIONES ---

export async function loadInitialAgents() {
    const agentsCol = collection(db, 'agents');
    const q = query(agentsCol, orderBy(documentId())); 
    const querySnapshot = await getDocs(q);
    const agentsList = querySnapshot.docs.map(doc => ({ id: String(doc.id), ...doc.data() }));
    setAvailableAgents(agentsList);
    return agentsList;
}

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

export async function addSolicitud(requestData) {
    try {
        const userProfile = currentUser.get();
        if (!userProfile) throw new Error("Usuario no autenticado.");

        const solicitudPayload = {
            ...requestData,
            agentId: String(requestData.agentId),
            userId: userProfile.uid,
            status: 'Pendiente',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            attachments: requestData.attachments || [],
            startDate: Timestamp.fromDate(parseISO(requestData.startDate)),
            endDate: Timestamp.fromDate(requestData.endDate ? parseISO(requestData.endDate) : parseISO(requestData.startDate))
        };
        await addDoc(collection(db, 'solicitudes'), solicitudPayload);
        return { success: true };
    } catch (error) {
        console.error("ERROR - dataController: Error añadiendo solicitud:", error);
        throw error;
    }
}

export async function uploadFile(file, path) {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
            () => {},
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

export async function getSolicitudes(filters = {}) {
    const userProfile = currentUser.get();
    if (!userProfile || !userProfile.uid) throw new Error("Perfil de usuario o UID no disponible.");

    const solicitudesRef = collection(db, 'solicitudes');
    let queryConstraints = []; 

    if (userProfile.role !== 'admin') {
        queryConstraints.push(where('userId', '==', userProfile.uid));
    } else {
        if (filters.agentId && filters.agentId !== 'all') {
            queryConstraints.push(where('agentId', '==', String(filters.agentId)));
        }
    }
    if (filters.status && filters.status !== 'all') {
        queryConstraints.push(where('status', '==', filters.status));
    }
    queryConstraints.push(orderBy('createdAt', 'desc'));
    
    const q = query(solicitudesRef, ...queryConstraints);
    try {
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    catch (error) {
        console.error("ERROR - dataController: Error cargando solicitudes de permiso:", error);
        throw error;
    }
}

export async function addShiftChangeRequest(requestData) {
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

export async function getShiftChangeRequests(filters = {}) {
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
                Object.keys(req).forEach(key => {
                    if (typeof req[key] === 'string' && key.toLowerCase().includes('date')) {
                        try { req[key] = parseISO(req[key]); } catch (e) { console.warn(`Could not parse date string: ${req[key]}`); }
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

export async function respondToShiftChangeRequest(requestData) {
    const callable = httpsCallable(functions, 'respondToShiftChangeRequest');
    try {
        const result = await callable(requestData);
        if (result.data?.success) return result.data;
        throw new Error(result.data?.message || "Error en Cloud Function de respuesta.");
    } catch (error) {
        console.error("Error al enviar la respuesta:", error);
        throw error;
    }
}

export async function addAgent(agentData) {
    const callable = httpsCallable(functions, 'addAgentCallable');
    try {
        const result = await callable(agentData);
        if (result.data?.success) return result.data;
        throw new Error(result.data?.message || "Error al añadir agente.");
    } catch (error) {
        console.error("Error al añadir agente (Cloud Function):", error);
        throw error;
    }
}

export async function updateAgent(agentId, updateData) {
    const callable = httpsCallable(functions, 'updateAgentCallable');
    try {
        const result = await callable({ agentId, updateData });
        if (result.data?.success) return result.data;
        throw new Error(result.data?.message || "Error al actualizar agente.");
    } catch (error) {
        console.error("Error al actualizar agente:", error);
        throw error;
    }
}

export async function deleteAgent(agentId) {
    const callable = httpsCallable(functions, 'deleteAgentCallable');
    try {
        const result = await callable({ agentId });
        if (result.data?.success) return result.data;
        throw new Error(result.data?.message || "Error al eliminar agente.");
    } catch (error) {
        console.error("Error al eliminar agente:", error);
        throw error;
    }
}

export async function updateSolicitudStatus(requestData) {
    const callable = httpsCallable(functions, 'updateSolicitudStatus');
    try {
        const result = await callable(requestData);
        if (result.data?.success) return result.data;
        throw new Error(result.data?.message || "Error al actualizar estado de solicitud.");
    } catch (error) {
        console.error("Error al llamar a updateSolicitudStatus (Cloud Function):", error);
        throw error;
    }
}

export async function addMarkedDateCallable(markedDateData) {
    const callable = httpsCallable(functions, 'addMarkedDateCallable');
    try {
        const result = await callable(markedDateData);
        if (result.data?.success) return result.data;
        throw new Error(result.data?.message || "Error desconocido al añadir fecha marcada.");
    } catch (error)
    {
        console.error("Error - dataController: Error al llamar a Cloud Function addMarkedDateCallable:", error);
        throw error;
    }
}

export async function updateNotificationCount() {
    const userProfile = currentUser.get();
    if (!userProfile) {
        setPendingNotificationsCount(0);
        return;
    }
    let totalNotifications = 0;
    try {
        if (userProfile.role === 'admin') {
            const permissionRequests = await getSolicitudes({ status: 'Pendiente' });
            totalNotifications += permissionRequests.length;
            const shiftChangeRequests = await getShiftChangeRequests();
            const approvedButNotifiedCount = shiftChangeRequests.filter(req => req.status === 'Aprobado_Ambos' && req.adminNotified === false).length;
            const pendingForAdminReviewCount = shiftChangeRequests.filter(req => req.status === 'Pendiente_Target').length;
            totalNotifications += approvedButNotifiedCount;
            totalNotifications += pendingForAdminReviewCount; 
        } else if (userProfile.role === 'guard') {
            const shiftChangeRequests = await getShiftChangeRequests({ status: 'Pendiente_Target' });
            const pendingForGuard = shiftChangeRequests.filter(req => String(req.targetAgentId) === String(userProfile.agentId));
            totalNotifications += pendingForGuard.length;
        }
    } catch (error) {
        console.error("ERROR - dataController: Fallo al calcular notificaciones:", error);
    }
    setPendingNotificationsCount(totalNotifications);
}

export async function markShiftChangeNotificationAsSeen(changeId) {
    const callable = httpsCallable(functions, 'markShiftChangeNotificationAsSeen');
    try {
        const result = await callable({ changeId });
        await updateNotificationCount();
        return result.data;
    } catch (error) {
        console.error("ERROR - dataController: Error al marcar notificación como vista (Cloud Function):", error);
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
            q = query(q, 
                where('date', '>=', Timestamp.fromDate(startOfMonthDate)),
                where('date', '<=', Timestamp.fromDate(endOfMonthDate)),
                orderBy('date', 'asc')
            );
        }
    } else {
        q = query(q, orderBy('date', 'asc'));
    }
    try {
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            if (data.date && typeof data.date.toDate === 'function') {
                data.date = data.date.toDate();
            }
            return { id: doc.id, ...data };
        });
    } catch (error) {
        console.error("ERROR - dataController: Error cargando fechas marcadas:", error);
        throw error;
    }
}

export async function addExtraService(serviceData) {
    const userProfile = currentUser.get();
    if (!userProfile || !userProfile.agentId) throw new Error("Perfil de agente no válido.");
    const payload = { ...serviceData, agentId: String(userProfile.agentId), userId: userProfile.uid, date: Timestamp.fromDate(parseISO(serviceData.date)), createdAt: serverTimestamp() };
    try {
        const docRef = await addDoc(collection(db, 'extraordinaryServices'), payload);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error("Error al añadir servicio extraordinario:", error);
        throw error;
    }
}

export async function getExtraServices(agentId, startDate, endDate) {
    if (!agentId || !startDate || !endDate) return [];
    const servicesRef = collection(db, 'extraordinaryServices');
    const q = query( servicesRef, where('agentId', '==', String(agentId)), where('date', '>=', startDate), where('date', '<=', endDate), orderBy('date') );
    try {
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), date: doc.data().date.toDate() }));
    }
    catch (error) {
        console.error("Error al obtener servicios extraordinarios:", error);
        throw error;
    }
}

export async function getAllExtraServices(filters = {}) {
    const userProfile = currentUser.get();
    if (!userProfile || userProfile.role !== 'admin') throw new Error("Acceso no autorizado.");
    const servicesRef = collection(db, 'extraordinaryServices');
    let queryConstraints = [];
    if (filters.agentId && filters.agentId !== 'all') queryConstraints.push(where('agentId', '==', filters.agentId));
    if (filters.type && filters.type !== 'all') queryConstraints.push(where('type', '==', filters.type));
    if (filters.startDate) queryConstraints.push(where('date', '>=', Timestamp.fromDate(startOfMonth(parseISO(filters.startDate)))));
    if (filters.endDate) queryConstraints.push(where('date', '<=', Timestamp.fromDate(endOfMonth(parseISO(filters.endDate)))));
    queryConstraints.push(orderBy('date', 'desc'));
    const q = query(servicesRef, ...queryConstraints);
    try {
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), date: doc.data().date.toDate() }));
    } catch (error) {
        console.error("Error al obtener todos los servicios extraordinarios (admin):", error);
        throw error;
    }
}

export async function updateExtraService(serviceId, updateData) {
    const serviceRef = doc(db, 'extraordinaryServices', serviceId);
    try {
        const payload = { ...updateData };
        if (typeof payload.date === 'string') {
            payload.date = Timestamp.fromDate(parseISO(payload.date));
        }
        await updateDoc(serviceRef, payload);
    } catch (error) {
        console.error("Error al actualizar servicio extraordinario:", error);
        throw error;
    }
}

export async function deleteExtraService(serviceId) {
    const serviceRef = doc(db, 'extraordinaryServices', serviceId);
    try {
        await deleteDoc(serviceRef);
    } catch (error) {
        console.error("Error al eliminar servicio extraordinario:", error);
        throw error;
    }
}

/**
 * ✅ FUNCIÓN CORREGIDA: Asegura que service_date siempre se convierta a un objeto Date.
 * Obtiene las órdenes de servicio activas ('assigned' o 'in_progress') para un agente.
 * @param {string} agentId - El ID del agente.
 * @returns {Promise<Array<object>>} Una lista de las órdenes de servicio activas.
 */
export async function getActiveServiceOrdersForAgent(agentId) {
    if (!agentId) {
        console.error("Se requiere un agentId para buscar órdenes de servicio.");
        return [];
    }

    try {
        const ordersRef = collection(db, 'serviceOrders');
        const q = query(ordersRef, where('assigned_agents', 'array-contains', agentId));
        const querySnapshot = await getDocs(q);

        const allAssignedOrders = [];
        await Promise.all(querySnapshot.docs.map(async (doc) => {
            const rawData = doc.data();
            const orderData = {
                id: doc.id,
                ...rawData,
                // Conversión clave: Firestore Timestamp a objeto Date de JavaScript
                service_date: rawData.service_date.toDate() 
            };
            
            if (orderData.status === 'in_progress') {
                const reportsQuery = query(collection(db, 'serviceReports'), where('order_id', '==', orderData.id), orderBy('created_at', 'desc'));
                const reportsSnapshot = await getDocs(reportsQuery);
                if (!reportsSnapshot.empty) {
                    const reportDoc = reportsSnapshot.docs[0];
                    orderData.reportId = reportDoc.id;
                    orderData.reportStatus = reportDoc.data().status;
                }
            }
            allAssignedOrders.push(orderData);
        }));

        const activeOrders = allAssignedOrders.filter(order => 
            order.status === 'assigned' || 
            (order.status === 'in_progress' && order.reportStatus !== 'pending_review' && order.reportStatus !== 'validated' && order.reportStatus !== 'closed')
        );

        return activeOrders;

    } catch (error) {
        console.error("Error al obtener las órdenes de servicio activas para el agente:", error);
        throw new Error("No se pudieron obtener las órdenes de servicio.");
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

export async function generateNextOrderNumber(service_date) {
    const callable = httpsCallable(functions, 'generateNextOrderNumber');
    try {
        const result = await callable({ service_date });
        return result.data;
    } catch (error) {
        console.error("Error al llamar a la Cloud Function 'generateNextOrderNumber':", error);
        throw error;
    }
}

/**
 * Obtiene los datos de un cuadrante específico desde Firestore.
 * @param {string} monthId - El ID del mes a cargar (ej. 'cuadrante_julio_2025').
 * @returns {Promise<object|null>} Los datos del cuadrante, o null si no existe.
 */
export async function getScheduleForMonth(monthId) {
    try {
        const scheduleRef = doc(db, 'schedules', monthId);
        const scheduleSnap = await getDoc(scheduleRef);
        return scheduleSnap.exists() ? scheduleSnap.data() : null;
    } catch (error) {
        console.error(`Error al obtener el cuadrante para ${monthId}:`, error);
        throw new Error("No se pudo cargar el cuadrante.");
    }
}

/**
 * Llama a la Cloud Function para eliminar una Orden de Servicio.
 * @param {string} orderId - El ID de la orden a eliminar.
 * @returns {Promise<object>} El resultado de la operación.
 */
export async function deleteServiceOrder(orderId) {
    const callable = httpsCallable(functions, 'deleteServiceOrder');
    try {
        const result = await callable({ orderId });
        if (result.data.success) {
            return result.data;
        } else {
            throw new Error(result.data.message || 'Error desconocido al eliminar la orden.');
        }
    } catch (error) {
        console.error("Error al llamar a la Cloud Function 'deleteServiceOrder':", error);
        throw new Error('No se pudo eliminar la orden de servicio.');
    }
}

/**
 * Llama a la Cloud Function para actualizar el resumen de actuaciones de un parte.
 * @param {string} reportId - El ID del parte de servicio a actualizar.
 * @param {object} summaryData - El objeto con los datos del resumen.
 * @returns {Promise<object>} El resultado de la operación.
 */
export async function updateReportSummary(reportId, summaryData) {
    const callable = httpsCallable(functions, 'updateReportSummary');
    try {
        const result = await callable({ reportId, summaryData });
        if (result.data.success) {
            return result.data;
        } else {
            throw new Error(result.data.message || 'Error desconocido al actualizar el resumen.');
        }
    } catch (error) {
        console.error("Error al llamar a la Cloud Function 'updateReportSummary':", error);
        throw new Error('No se pudo conectar con el servidor para actualizar el resumen.');
    }
}

/**
 * Llama a la Cloud Function para obtener los requerimientos de un parte de servicio.
 * @param {string} reportId El ID del parte de servicio.
 * @returns {Promise<Array<object>>} Una lista de los requerimientos.
 */
export async function getRequerimientosForReport(reportId) {
    try {
        const reqsRef = collection(db, 'serviceReports', reportId, 'requerimientos');
        const q = query(reqsRef, orderBy('createdAt', 'asc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error al obtener los requerimientos:", error);
        throw new Error("No se pudieron cargar los requerimientos.");
    }
}

/**
 * Llama a la Cloud Function para añadir un nuevo requerimiento.
 * @param {string} reportId - El ID del parte de servicio.
 * @param {string} description - La descripción del requerimiento.
 */
export async function addRequerimiento(reportId, description) {
    const callable = httpsCallable(functions, 'addRequerimiento');
    try {
        await callable({ reportId, description });
    } catch (error) {
        console.error("Error al llamar a la Cloud Function 'addRequerimiento':", error);
        throw error;
    }
}

/**
 * Llama a la Cloud Function para cambiar el estado de un requerimiento.
 * @param {string} reportId - El ID del parte de servicio.
 * @param {string} requerimientoId - El ID del requerimiento a cambiar.
 * @param {boolean} isResolved - El nuevo estado.
 */
export async function toggleRequerimientoStatus(reportId, requerimientoId, isResolved) {
    const callable = httpsCallable(functions, 'toggleRequerimientoStatus');
    try {
        await callable({ reportId, requerimientoId, isResolved });
    } catch (error) {
        console.error("Error al llamar a la Cloud Function 'toggleRequerimientoStatus':", error);
        throw error;
    }
}

// ✅ FUNCIÓN updateRequerimientoStatus FINAL Y CORRECTA (sin la línea duplicada)
export async function updateRequerimientoStatus(data) {
    const user = currentUser.get();
    if (!user || !user.uid) {
        throw new Error("Usuario no autenticado. Por favor, inicia sesión de nuevo.");
    }
    // Opcional: Si realmente quieres forzar el refresco del token en cada llamada.
    // await auth.currentUser.getIdToken(true); 

    const callable = httpsCallable(functions, 'updateRequerimientoStatus');
    try {
        const result = await callable(data);
        if (result.data.success) {
            return result.data;
        } else {
            throw new Error(result.data.message || 'Error desconocido al actualizar el requerimiento.');
        }
    } catch (error) {
        console.error("Error al llamar a la Cloud Function 'updateRequerimientoStatus':", error);
        if (error.code === 'functions/unauthenticated' || (error.message && error.message.includes('autenticados pueden actualizar requerimientos'))) {
            throw new Error("Error de autenticación: Por favor, inicia sesión de nuevo.");
        }
        throw error;
    }
}

export async function getAutomationConfig() {
    const docRef = doc(db, 'configuration', 'automation');
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : { autoGenerateOrders: false };
}

export async function setAutomationConfig(config) {
    const docRef = doc(db, 'configuration', 'automation');
    await setDoc(docRef, config, { merge: true });
}

export async function generateNextRegistrationNumber(documentType) {
    const callable = httpsCallable(functions, 'generateNextRegistrationNumber');
    const result = await callable({ documentType });
    return result.data;
}

export async function createRegistro(documentType, data) {
    const callable = httpsCallable(functions, 'createRegistro');
    const result = await callable({ documentType, data });
    return result.data;
}

// ✅ AÑADE ESTA NUEVA FUNCIÓN
/**
 * Obtiene un único documento de registro por su ID.
 * @param {string} recordId - El ID del documento a buscar.
 * @returns {Promise<object>} El objeto con los datos del registro.
 */
export async function getRegistroById(recordId) {
    const docRef = doc(db, 'registros', recordId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
    } else {
        throw new Error("El registro no fue encontrado.");
    }
}

// js/dataController.js
// ... (resto de imports y funciones)

export async function getRegistros({ year, month, type, destinatario } = {}) {
    try {
        const registrosCol = collection(db, 'registros');
        
        // La consulta se construye paso a paso
        let queryConstraints = [];
        queryConstraints.push(where('status', '!=', 'eliminado'));
        
        if (type && type !== 'all') {
            queryConstraints.push(where('documentType', '==', type));
        }
        if (destinatario) {
            queryConstraints.push(where('details.destinatario', '==', destinatario));
        }

        // Se construye el filtro de fecha
        if (year && year !== 'all') {
            const yearInt = parseInt(year);
            const monthInt = month && month !== 'all' ? parseInt(month) - 1 : null;
            
            let startDate, endDate;
            if (monthInt !== null) {
                startDate = new Date(yearInt, monthInt, 1);
                endDate = new Date(yearInt, monthInt + 1, 0, 23, 59, 59, 999);
            } else {
                startDate = new Date(yearInt, 0, 1);
                endDate = new Date(yearInt, 11, 31, 23, 59, 59, 999);
            }
            queryConstraints.push(where('createdAt', '>=', startDate));
            queryConstraints.push(where('createdAt', '<=', endDate));
        }
        
        // El 'orderBy' debe ser siempre el último en la consulta
        queryConstraints.push(orderBy('createdAt', 'desc'));

        const q = query(registrosCol, ...queryConstraints);
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    } catch (error) {
        console.error("ERROR en dataController - getRegistros:", error);
        throw new Error("No se pudieron cargar los registros. Es posible que falte algún índice en Firestore.");
    }
}

export async function updateRegistro(recordId, data) {
    const callable = httpsCallable(functions, 'updateRegistro');
    const result = await callable({ recordId, updateData: data });
    return result.data;
}

// ✅ REEMPLAZA tu antigua función 'deleteRegistro' por esta:

export async function markRegistroAsDeleted(recordId, reason) {
    const callable = httpsCallable(functions, 'markRegistroAsDeleted');
    const result = await callable({ recordId, reason });
    return result.data;
}

// ✅ FUNCIÓN AÑADIDA para obtener las plantillas
export async function getDocumentTemplates() {
    const templatesCol = collection(db, 'documentTemplates');
    const q = query(templatesCol, orderBy('templateName', 'asc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// ✅ FUNCIONES AÑADIDAS
export async function createDocumentTemplate(templateData) {
    const callable = httpsCallable(functions, 'createDocumentTemplate');
    const result = await callable(templateData);
    return result.data;
}

export async function updateDocumentTemplate(templateId, updateData) {
    const callable = httpsCallable(functions, 'updateDocumentTemplate');
    const result = await callable({ templateId, updateData });
    return result.data;
}

// ✅ FUNCIÓN AÑADIDA para obtener plantillas por su tipo
export async function getTemplatesByType(documentType) {
    const templatesCol = collection(db, 'documentTemplates');
    const q = query(templatesCol, where('documentType', '==', documentType), orderBy('templateName', 'asc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// ✅ FUNCIÓN AÑADIDA para obtener los recursos del croquis
export async function getCroquisAssets() {
    const assetsRef = ref(storage, 'croquis_assets');
    const assets = {
        vias: [],
        vehiculos: [],
        senales: []
    };

    try {
        const folders = await listAll(assetsRef);
        
        for (const folderRef of folders.prefixes) {
            const category = folderRef.name; // 'vias', 'vehiculos', 'senales'
            if (assets[category]) {
                const items = await listAll(folderRef);
                for (const itemRef of items.items) {
                    const url = await getDownloadURL(itemRef);
                    assets[category].push({
                        name: itemRef.name.split('.')[0], // ej. 'coche'
                        url: url
                    });
                }
            }
        }
        return assets;
    } catch (error) {
        console.error("Error al cargar los recursos para el croquis:", error);
        throw new Error("No se pudieron cargar los recursos del croquis.");
    }
}

// ✅ FUNCIÓN AÑADIDA para subir la imagen del croquis
export async function uploadCroquisImage(file) {
    const user = currentUser.get();
    if (!user) throw new Error("Usuario no autenticado.");

    // Creamos un nombre de archivo único con la fecha y el ID del agente
    const timestamp = new Date().getTime();
    const fileName = `croquis_${user.agentId}_${timestamp}.png`;
    const storageRef = ref(storage, `sketches/${fileName}`);

    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
}

// ✅ FUNCIÓN MODIFICADA: Añade validación de los datos del usuario.
export async function saveSketchRecord(sketchData) {
    const user = currentUser.get();
    if (!user || !user.uid || !user.agentId) {
        throw new Error("Datos de usuario no válidos. No se puede guardar el croquis.");
    }

    // ✅ CORRECCIÓN: El objeto sketchData ya contiene la propiedad 'fechaSuceso'
    // como un objeto Date válido desde el modal. No necesitamos reconstruirlo.
    // Simplemente le añadimos los metadatos de creación.
    const sketchPayload = {
        ...sketchData,
        createdAt: serverTimestamp(),
        createdByAgentId: user.agentId,
        createdByUid: user.uid
    };

    // Ya no son necesarios los 'delete' porque no existen las propiedades .fecha y .hora

    try {
        await addDoc(collection(db, "sketches"), sketchPayload);
    } catch (error) {
        console.error("Error de Firestore al intentar guardar el croquis:", error);
        throw new Error("La base de datos rechazó la solicitud de guardado.");
    }
}

// ✅ FUNCIÓN AÑADIDA para obtener todos los croquis guardados
export async function getSketches() {
    const user = currentUser.get();
    if (!user) {
        throw new Error("Usuario no autenticado.");
    }

    const sketchesCol = collection(db, 'sketches');
    let q; // La consulta se definirá según el rol del usuario

    // Si el usuario es admin o supervisor, puede ver todos los croquis.
    if (user.role === 'admin' || user.role === 'supervisor') {
        q = query(sketchesCol, orderBy('fechaSuceso', 'desc'));
    } else {
        // Si es un agente normal, solo puede ver los croquis que ha creado.
        q = query(
            sketchesCol, 
            where('createdByUid', '==', user.uid), 
            orderBy('fechaSuceso', 'desc')
        );
    }
    
    try {
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            if (data.fechaSuceso && typeof data.fechaSuceso.toDate === 'function') {
                data.fechaSuceso = data.fechaSuceso.toDate();
            }
            return { id: doc.id, ...data };
        });
    } catch (error) {
        console.error("Error al obtener los croquis:", error);
        // Este error ahora podría indicar que falta un índice compuesto.
        throw new Error("No se pudieron cargar los registros de croquis. Revisa la consola para crear un índice si es necesario.");
    }
}

export async function getSketchById(sketchId) {
    const docRef = doc(db, 'sketches', sketchId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.fechaSuceso && typeof data.fechaSuceso.toDate === 'function') {
            data.fechaSuceso = data.fechaSuceso.toDate();
        }
        return { id: docSnap.id, ...data };
    } else {
        throw new Error("El croquis no fue encontrado.");
    }
}

export async function updateSketch(sketchId, updateData) {
    const callable = httpsCallable(functions, 'updateSketch');
    const result = await callable({ sketchId, updateData });
    return result.data;
}

export async function generateSketchPdf(sketchId) {
    const callable = httpsCallable(functions, 'generateSketchPdf');
    // ✅ CORRECCIÓN CLAVE: Pasamos un objeto con el sketchId
    const result = await callable({ sketchId });
    return result.data;
}

export async function deleteSketch(sketchId) {
    const callable = httpsCallable(functions, 'deleteSketch');
    const result = await callable({ sketchId });
    return result.data;
}

// ✅ FUNCIÓN AÑADIDA para eliminar una plantilla de documento
export async function deleteDocumentTemplate(templateId) {
    const callable = httpsCallable(functions, 'deleteDocumentTemplate');
    const result = await callable({ templateId });
    return result.data;
}
