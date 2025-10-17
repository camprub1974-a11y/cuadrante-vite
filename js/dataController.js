<<<<<<< HEAD
// js/dataController.js (VERSIÓN COMPLETA, CORREGIDA Y VALIDADA)

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
    startAfter,
} from 'firebase/firestore';
import { db, app, storage } from './firebase-config.js';
import { ref, listAll, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { currentUser, setAvailableAgents, setPendingTasksCount, setPendingRequestsCount, availableAgents } from './state.js';
import { parseISO, endOfMonth } from 'date-fns';
import { getMonthNumberFromName } from './utils.js';
=======
// js/dataController.js (VERSIÓN COMPLETA Y CORREGIDA)

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
  startAfter, 
} from 'firebase/firestore';
import { db, app, storage, auth } from './firebase-config.js';
import { ref, listAll, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { currentUser, setAvailableAgents, setPendingNotificationsCount } from './state.js';
import { parseISO, endOfMonth, startOfMonth, startOfDay, endOfDay } from 'date-fns';
import { getMonthNumberFromName, parseDateToISO } from './utils.js';
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
import { toZonedTime } from 'date-fns-tz';

const functions = getFunctions(app, 'us-central1');
const MADRID_TIMEZONE = 'Europe/Madrid';

// --- ÓRDENES Y PARTES DE SERVICIO ---

export async function createServiceOrder(orderData) {
<<<<<<< HEAD
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
}

export async function getServiceOrders(filters = {}) {
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
}

export async function addReportEntry(entryData) {
    const callable = httpsCallable(functions, 'addReportEntry');
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
}

export async function submitServiceReport(reportId) {
    const callable = httpsCallable(functions, 'submitServiceReport');
    return callable({ reportId }).then((result) => result.data);
}

export async function validateServiceReport(validationData) {
    const callable = httpsCallable(functions, 'validateServiceReport');
    return callable(validationData).then((result) => result.data);
}

export async function getServiceReports(filters = {}) {
    const callable = httpsCallable(functions, 'getServiceReports');
    return callable(filters).then((result) => result.data);
}

export async function createDefaultServiceOrders(date, templateShiftType) {
    const callable = httpsCallable(functions, 'createDefaultServiceOrders');
    return callable({ date, templateShiftType }).then((result) => result.data);
}

export async function updateChecklistItemStatus(data) {
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
}

export async function updateReportSummary(reportId, summaryData) {
    const callable = httpsCallable(functions, 'updateReportSummary');
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
    }
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
}

export async function getServiceOrders(filters = {}) {
  const callable = httpsCallable(functions, 'getServiceOrders');
  return callable(filters).then((result) => result.data);
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

// ✅ FUNCIÓN AÑADIDA QUE SOLUCIONA EL ERROR
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
}

export async function addReportEntry(entryData) {
  const callable = httpsCallable(functions, 'addReportEntry');
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

      // Convertimos todas las fechas de texto (ISO String) a objetos Date
      // para que el resto de la app funcione como espera.
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
}

export async function submitServiceReport(reportId) {
  const callable = httpsCallable(functions, 'submitServiceReport');
  return callable({ reportId }).then((result) => result.data);
}

export async function validateServiceReport(validationData) {
  const callable = httpsCallable(functions, 'validateServiceReport');
  return callable(validationData).then((result) => result.data);
}

export async function getServiceReports(filters = {}) {
  const callable = httpsCallable(functions, 'getServiceReports');
  return callable(filters).then((result) => result.data);
}

export async function createDefaultServiceOrders(date, templateShiftType) {
  const callable = httpsCallable(functions, 'createDefaultServiceOrders');
  return callable({ date, templateShiftType }).then((result) => result.data);
}

export async function updateChecklistItemStatus(data) {
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
}

export async function updateReportSummary(reportId, summaryData) {
  const callable = httpsCallable(functions, 'updateReportSummary');
  return callable({ reportId, summaryData }).then((result) => result.data);
}

// ✅ SOLUCIÓN 3: La función ahora acepta un objeto 'requerimientoData'.
export async function addRequerimiento(reportId, requerimientoData) {
  if (!reportId) {
    throw new Error('ID de parte de servicio no encontrado para añadir requerimiento.');
  }
  // La Cloud Function ahora recibe el objeto completo de datos.
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
  }
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
}

export async function toggleRequerimientoStatus(reportId, requerimientoId, isResolved) {
  const callable = httpsCallable(functions, 'toggleRequerimientoStatus');
  try {
    await callable({ reportId, requerimientoId, isResolved });
  } catch (error) {
    console.error("Error al llamar a la Cloud Function 'toggleRequerimientoStatus':", error);
    throw error;
  }
}

<<<<<<< HEAD
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
=======
// REEMPLAZA LA FUNCIÓN ANTIGUA CON ESTA NUEVA VERSIÓN
export async function getActiveServiceOrdersForAgent() {
  // No necesitamos el 'agentId' como parámetro, la Cloud Function lo obtiene del token.
  
  const functions = getFunctions(app, 'us-central1');
  const callable = httpsCallable(functions, 'getActiveOrdersForAgentCallable');

  try {
    const result = await callable();
    
    if (result.data && result.data.success) {
      // La Cloud Function devuelve las fechas como texto (ISO String).
      // Las convertimos de nuevo a objetos Date para que el resto de la app funcione igual.
      return result.data.orders.map(order => ({
        ...order,
        service_date: new Date(order.service_date)
      }));
    } else {
      throw new Error(result.data.message || 'La función del servidor devolvió un error.');
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
    }
  } catch (error) {
    console.error('Error al llamar a la Cloud Function getActiveOrdersForAgentCallable:', error);
    // Propagamos el error para que la vista lo muestre.
    throw new Error('No se pudieron obtener las órdenes de servicio.');
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
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
    }
    return assets;
  } catch (error) {
    console.error('Error al cargar los recursos para el croquis:', error);
    throw new Error('No se pudieron cargar los recursos del croquis.');
  }
}

export async function uploadCroquisImage(file) {
<<<<<<< HEAD
    const user = currentUser.get();
    if (!user) throw new Error('Usuario no autenticado.');
=======
  const user = currentUser.get();
  if (!user) throw new Error('Usuario no autenticado.');
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33

  const timestamp = new Date().getTime();
  const fileName = `croquis_${user.agentId}_${timestamp}.png`;
  const storageRef = ref(storage, `sketches/${fileName}`);

<<<<<<< HEAD
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
}

export async function saveSketchRecord(sketchData) {
    const user = currentUser.get();
    if (!user || !user.uid || !user.agentId) {
        throw new Error('Datos de usuario no válidos. No se puede guardar el croquis.');
    }
    const sketchPayload = {
        ...sketchData,
        createdAt: serverTimestamp(),
        createdByAgentId: user.agentId,
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
        throw new Error('El croquis no fue encontrado.');
=======
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
}

export async function saveSketchRecord(sketchData) {
  const user = currentUser.get();
  if (!user || !user.uid || !user.agentId) {
    throw new Error('Datos de usuario no válidos. No se puede guardar el croquis.');
  }

  const sketchPayload = {
    ...sketchData,
    createdAt: serverTimestamp(),
    createdByAgentId: user.agentId,
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
  const { limit: queryLimit = 15, startAfterDoc } = options;

  const user = currentUser.get();
  if (!user) {
    throw new Error('Usuario no autenticado.');
  }

  const sketchesCol = collection(db, 'sketches');
  let queryConstraints = [orderBy('fechaSuceso', 'desc')];

  // Filtra por usuario si no es admin/supervisor
  if (user.role !== 'admin' && user.role !== 'supervisor') {
    queryConstraints.unshift(where('createdByUid', '==', user.uid));
  }
  
  // Aplica el cursor para la paginación (empezar después del último documento de la página anterior)
  if (startAfterDoc) {
    queryConstraints.push(startAfter(startAfterDoc));
  }

  // Aplica el límite de 15 registros por página
  queryConstraints.push(limit(queryLimit));

  const q = query(sketchesCol, ...queryConstraints);

  try {
    const querySnapshot = await getDocs(q);
    
    // Obtenemos el último documento visible para usarlo como cursor en la siguiente página
    const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
    
    const sketches = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      if (data.fechaSuceso && typeof data.fechaSuceso.toDate === 'function') {
        data.fechaSuceso = data.fechaSuceso.toDate();
      }
      return { id: doc.id, ...data };
    });

    // Devolvemos tanto los croquis como el cursor del último documento
    return { sketches, lastVisible };

  } catch (error) {
    console.error('Error al obtener los croquis:', error);
    throw new Error('No se pudieron cargar los registros de croquis.');
  }
}

export async function getSketchById(sketchId) {
  const docRef = doc(db, 'sketches', sketchId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    if (data.fechaSuceso && typeof data.fechaSuceso.toDate === 'function') {
      data.fechaSuceso = data.fechaSuceso.toDate();
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
    }
    return { id: docSnap.id, ...data };
  } else {
    throw new Error('El croquis no fue encontrado.');
  }
}

export async function updateSketch(sketchId, updateData) {
  const callable = httpsCallable(functions, 'updateSketch');
  const result = await callable({ sketchId, updateData });
  return result.data;
}

export async function generateSketchPdf(sketchId) {
<<<<<<< HEAD
    const callable = httpsCallable(functions, 'generateSketchPdf', { timeout: 120000 });
    const result = await callable({ sketchId });
    return result.data;
=======
  // ✅ ESTA ES LA SINTAXIS CORRECTA Y LA SOLUCIÓN AL PROBLEMA
  // Se define la función con un tiempo de espera de 2 minutos (120,000 ms)
  const callable = httpsCallable(functions, 'generateSketchPdf', { timeout: 120000 });

  // Se llama a la función con sus parámetros
  const result = await callable({ sketchId });
  return result.data;
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
}

export async function deleteSketch(sketchId) {
  const callable = httpsCallable(functions, 'deleteSketch');
  const result = await callable({ sketchId });
  return result.data;
}

<<<<<<< HEAD
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
}

export async function getRegistros(filters = {}) {
    const callable = httpsCallable(functions, 'getRegistros');
    try {
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
    } catch (error) {
        console.error("Error al llamar a la Cloud Function 'getRegistros':", error);
        throw error;
    }
}

export async function updateRegistro(recordId, data) {
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
=======
// ... (todo tu código existente hasta la sección de Registro Electrónico)


// ==============================================================================
// === INICIO DEL NUEVO MÓDULO DE IDENTIFICACIONES ===
// ==============================================================================

/**
 * Obtiene una lista de todas las personas de la colección.
 * @returns {Promise<Array>} Una lista de personas.
 */
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

/**
 * Busca personas por DNI, nombre o mote.
 * @param {string} searchTerm - El término de búsqueda.
 * @returns {Promise<Array>} Una lista de personas que coinciden con la búsqueda.
 */
export async function searchPersonas(searchTerm) {
  // Esta es una búsqueda simple. Para búsquedas más complejas, se recomienda
  // usar un servicio de terceros como Algolia o ElasticSearch.
  try {
    const personasRef = collection(db, 'personas');
    
    // Como Firestore no permite múltiples 'orderBy' con desigualdades,
    // haremos varias consultas y uniremos los resultados.
    const qDni = query(personasRef, where('dni', '>=', searchTerm), where('dni', '<=', searchTerm + '\uf8ff'));
    const qNombre = query(personasRef, where('nombre', '>=', searchTerm), where('nombre', '<=', searchTerm + '\uf8ff'));
    
    const [dniSnapshot, nombreSnapshot] = await Promise.all([
        getDocs(qDni),
        getDocs(qNombre)
    ]);
    
    const personasMap = new Map();
    dniSnapshot.forEach(doc => personasMap.set(doc.id, { id: doc.id, ...doc.data() }));
    nombreSnapshot.forEach(doc => personasMap.set(doc.id, { id: doc.id, ...doc.data() }));

    return Array.from(personasMap.values());
  } catch (error) {
    console.error("Error al buscar personas:", error);
    throw new Error("La búsqueda de personas falló.");
  }
}


/**
 * Obtiene una lista de todos los vehículos de la colección.
 * @returns {Promise<Array>} Una lista de vehículos.
 */
export async function getVehiculos() {
  try {
    const vehiculosRef = collection(db, 'vehiculos');
    const q = query(vehiculosRef, orderBy(documentId())); // Ordena por matrícula (ID)
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error al obtener los vehículos:", error);
    throw new Error("No se pudieron cargar los datos de los vehículos.");
  }
}

/**
 * Obtiene una lista de todos los establecimientos de la colección.
 * @returns {Promise<Array>} Una lista de establecimientos.
 */
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

// ==============================================================================
// === FIN DEL NUEVO MÓDULO DE IDENTIFICACIONES ===
// ==============================================================================

// --- MÓDULO DE REGISTRO ELECTRÓNICO Y PLANTILLAS ---

export async function generateNextRegistrationNumber(data) {
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
}

export async function getRegistros(filters = {}) {
  // Apuntamos a la Cloud Function 'getRegistros' del backend
  const callable = httpsCallable(functions, 'getRegistros');
  try {
    const result = await callable(filters);

    if (result.data && result.data.success) {
      // --- INICIO DE LA CORRECCIÓN ---
      
      // 1. Convertimos las fechas en la lista de registros
      const registrosConFechas = result.data.registros.map(reg => ({
        ...reg,
        createdAt: reg.createdAt ? new Date(reg.createdAt) : null,
        fechaPresentacion: reg.fechaPresentacion ? new Date(reg.fechaPresentacion) : null
      }));

      // 2. Devolvemos el OBJETO COMPLETO, incluyendo el cursor 'lastVisible'
      return {
        success: true,
        registros: registrosConFechas,
        lastVisible: result.data.lastVisible // Mantenemos el cursor
      };
      
      // --- FIN DE LA CORRECCIÓN ---

    } else {
      // Si el backend devuelve un error, lo lanza para que la vista lo capture.
      throw new Error(result.data.message || 'La función getRegistros del backend devolvió un error.');
    }
  } catch (error) {
    console.error("Error al llamar a la Cloud Function 'getRegistros':", error);
    throw error; // Re-lanza el error para que la UI lo pueda manejar.
  }
}

export async function updateRegistro(recordId, data) {
  const callable = httpsCallable(functions, 'updateRegistro');
  return callable({ recordId, updateData: data }).then((result) => result.data);
}

export async function markRegistroAsDeleted(recordId, reason) {
  const callable = httpsCallable(functions, 'markRegistroAsDeleted');
  return callable({ recordId, reason }).then((result) => result.data);
}

export async function getDocumentTemplates(options = {}) {
  // Desestructuramos los filtros de paginación Y el nuevo filtro de tipo
  const { limit: queryLimit = 15, startAfterDoc, documentType } = options;
  const templatesCol = collection(db, 'documentTemplates');
  
  // Usamos un array para construir la consulta dinámicamente
  let queryConstraints = [];

  // Añadimos el filtro por tipo de documento si se proporciona
  if (documentType && documentType !== 'all') {
    queryConstraints.push(where('documentType', '==', documentType));
  }

  // Siempre ordenamos por nombre para que la paginación sea consistente
  queryConstraints.push(orderBy('templateName', 'asc'));

  // Aplicamos la paginación
  if (startAfterDoc) {
    queryConstraints.push(startAfter(startAfterDoc));
  }
  queryConstraints.push(limit(queryLimit));

  // Construimos la consulta final
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

/**
 * Llama a la Cloud Function para duplicar una plantilla de documento existente.
 * @param {string} templateId - El ID de la plantilla que se va a duplicar.
 * @returns {Promise<object>} - La respuesta de la Cloud Function.
 */
export async function duplicateDocumentTemplate(templateId) {
  // 1. Apunta a la Cloud Function que creamos en el backend.
  const callable = httpsCallable(functions, 'duplicateDocumentTemplate');

  try {
    // 2. Llama a la función pasándole el ID de la plantilla.
    const result = await callable({ templateId });

    // 3. Comprueba si la operación fue exitosa y devuelve el resultado.
    if (result.data && result.data.success) {
      return result.data;
    } else {
      // Si el backend devuelve un error, lo lanza para que la vista lo capture.
      throw new Error(result.data.message || 'Error desconocido al duplicar la plantilla.');
    }
  } catch (error) {
    // 4. Captura cualquier error de red o de la propia función y lo muestra en consola.
    console.error('Error en dataController al llamar a duplicateDocumentTemplate:', error);
    throw error; // Vuelve a lanzar el error para que la UI lo pueda manejar.
  }
}

/**
 * Sube una imagen a la carpeta 'template_images' en Firebase Storage y devuelve su URL pública.
 * @param {File} file - El archivo de imagen seleccionado por el usuario desde su PC.
 * @returns {Promise<string>} - La URL de descarga pública de la imagen subida.
 */
export async function uploadTemplateImage(file) {
  if (!file) {
    throw new Error('No se proporcionó ningún archivo para subir.');
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo seleccionado no es una imagen.');
  }

  try {
    // Crea un nombre de archivo único para evitar que se sobrescriban.
    // Ej: template_images/1678886400000-sello.png
    const filePath = `template_images/${Date.now()}-${file.name}`;
    const storageRef = ref(storage, filePath);

    // Sube el archivo a Firebase Storage
    console.log(`Subiendo imagen a: ${filePath}`);
    await uploadBytes(storageRef, file);

    // Obtiene la URL pública de descarga
    const downloadURL = await getDownloadURL(storageRef);

    console.log('Imagen subida con éxito:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('Error en dataController al subir la imagen de la plantilla:', error);
    throw new Error('No se pudo subir la imagen.');
  }
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
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
    const userProfile = currentUser.get();
    if (!userProfile || !userProfile.uid) throw new Error('Perfil de usuario o UID no disponible.');
    const solicitudesRef = collection(db, 'solicitudes');
    let queryConstraints = [];
    if (userProfile.role !== 'admin') {
        queryConstraints.push(where('userId', '==', userProfile.uid));
    } else if (filters.agentId && filters.agentId !== 'all') {
        queryConstraints.push(where('agentId', '==', String(filters.agentId)));
    }
    if (filters.status && filters.status !== 'all') {
        queryConstraints.push(where('status', '==', filters.status));
    }
    queryConstraints.push(orderBy('createdAt', 'desc'));
    const q = query(solicitudesRef, ...queryConstraints);
    try {
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('ERROR - dataController: Error cargando solicitudes de permiso:', error);
        throw error;
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
    const q = query(typesCol, orderBy('name')); // Ordena los permisos alfabéticamente
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
      endDate: Timestamp.fromDate(
        requestData.endDate ? parseISO(requestData.endDate) : parseISO(requestData.startDate)
      ),
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
    uploadTask.on(
      'state_changed',
      () => {},
      (error) => {
        console.error('ERROR - dataController: Error al subir archivo:', error);
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
  if (!userProfile || !userProfile.uid) throw new Error('Perfil de usuario o UID no disponible.');

  const solicitudesRef = collection(db, 'solicitudes');
  let queryConstraints = [];

  if (userProfile.role !== 'admin') {
    queryConstraints.push(where('userId', '==', userProfile.uid));
  } else {
    if (filters.agentId && filters.agentId !== 'all') {
      queryConstraints.push(where('agentId', '==', String(filters.agentId)));
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
    }
  }
  if (filters.status && filters.status !== 'all') {
    queryConstraints.push(where('status', '==', filters.status));
  }
  queryConstraints.push(orderBy('createdAt', 'desc'));

  const q = query(solicitudesRef, ...queryConstraints);
  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('ERROR - dataController: Error cargando solicitudes de permiso:', error);
    throw error;
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
    const userProfile = currentUser.get();
    if (!userProfile) throw new Error('Perfil de usuario no disponible.');
    const callable = httpsCallable(functions, 'getShiftChangeRequestsCallable');
    try {
        const result = await callable({
            status: filters.status || null,
            agentId: userProfile.role === 'admin' ? filters.agentId || 'all' : userProfile.agentId,
        });
        if (result.data?.success) {
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
                return req;
            });
        } else {
            throw new Error(result.data?.message || 'Error al obtener solicitudes de cambio de turno.');
        }
    } catch (error) {
        console.error('ERROR - dataController: Error al llamar a getShiftChangeRequestsCallable:', error);
        throw error;
=======
  const callable = httpsCallable(functions, 'addShiftChangeRequest');
  try {
    const result = await callable(requestData);
    if (result.data?.success) return result.data;
    throw new Error(result.data?.message || 'Error desconocido al añadir solicitud de cambio.');
  } catch (error) {
    console.error(
      'ERROR - dataController: Error al llamar a Cloud Function addShiftChangeRequest:',
      error
    );
    throw error;
  }
}

export async function getShiftChangeRequests(filters = {}) {
  const userProfile = currentUser.get();
  if (!userProfile) throw new Error('Perfil de usuario no disponible.');
  const callable = httpsCallable(functions, 'getShiftChangeRequestsCallable');
  try {
    const result = await callable({
      status: filters.status || null,
      agentId: userProfile.role === 'admin' ? filters.agentId || 'all' : userProfile.agentId,
    });
    if (result.data?.success) {
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
        return req;
      });
    } else {
      throw new Error(result.data?.message || 'Error al obtener solicitudes de cambio de turno.');
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
    }
  } catch (error) {
    console.error(
      'ERROR - dataController: Error al llamar a getShiftChangeRequestsCallable:',
      error
    );
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
    if (!userProfile) {
        setPendingTasksCount(0);
        setPendingRequestsCount(0);
        return;
    }
    try {
        const tasks = await getPendingTasksForAgent(userProfile.agentId);
        setPendingTasksCount(tasks.length);
        let requestsCount = 0;
        if (userProfile.role === 'admin' || userProfile.role === 'supervisor') {
            const solicitudesPendientes = await getSolicitudes({ status: 'Pendiente' });
            requestsCount += solicitudesPendientes.length;
        }
        setPendingRequestsCount(requestsCount);
    } catch (error) {
        console.error('ERROR - dataController: Fallo al calcular notificaciones:', error);
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
    console.error(
      'Error - dataController: Error al llamar a Cloud Function addMarkedDateCallable:',
      error
    );
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
    // --- LÓGICA DE NOTIFICACIONES EXISTENTE (se mantiene) ---
    if (userProfile.role === 'admin') {
      // ... tu lógica para notificaciones de admin
    } else if (userProfile.role === 'guard') {
      // ... tu lógica para notificaciones de agente
    }

    // --- INICIO DE LA MODIFICACIÓN ---
    // 1. Obtenemos el perfil completo del usuario desde Firestore para leer el nuevo campo
    const userDocRef = doc(db, 'users', userProfile.uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
        const fullUserProfile = userDocSnap.data();
        // 2. Sumamos el contador de tareas pendientes al total de notificaciones
        totalNotifications += fullUserProfile.pendingTasksCount || 0;
    }
    // --- FIN DE LA MODIFICACIÓN ---

  } catch (error) {
    console.error('ERROR - dataController: Fallo al calcular notificaciones:', error);
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
    console.error(
      'ERROR - dataController: Error al marcar notificación como vista (Cloud Function):',
      error
    );
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
      const startOfMonthDate = toZonedTime(
        new Date(year, getMonthNumberFromName(monthName), 1),
        MADRID_TIMEZONE
      );
      const endOfMonthDate = toZonedTime(endOfMonth(startOfMonthDate), MADRID_TIMEZONE);
      endOfMonthDate.setHours(23, 59, 59, 999);
      q = query(
        q,
        where('date', '>=', Timestamp.fromDate(startOfMonthDate)),
        where('date', '<=', Timestamp.fromDate(endOfMonthDate)),
        orderBy('date', 'asc')
      );
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
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
<<<<<<< HEAD
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
    const q = query(servicesRef, ...queryConstraints);
    try {
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            date: doc.data().date.toDate(),
        }));
    } catch (error) {
        console.error('Error al obtener todos los servicios extraordinarios (admin):', error);
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
        console.error('Error al actualizar servicio extraordinario:', error);
        throw error;
=======
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
  const q = query(
    servicesRef,
    where('agentId', '==', String(agentId)),
    where('date', '>=', startDate),
    where('date', '<=', endDate),
    orderBy('date')
  );
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
  // ✅ LÓGICA DE FECHA CORREGIDA Y SIMPLIFICADA
  if (filters.startDate) {
    queryConstraints.push(where('date', '>=', Timestamp.fromDate(new Date(filters.startDate))));
  }
  if (filters.endDate) {
    queryConstraints.push(where('date', '<=', Timestamp.fromDate(new Date(filters.endDate))));
  }

  queryConstraints.push(orderBy('date', 'desc'));

  const q = query(servicesRef, ...queryConstraints);
  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date.toDate(),
    }));
  } catch (error) {
    console.error('Error al obtener todos los servicios extraordinarios (admin):', error);
    throw error;
  }
}

export async function updateExtraService(serviceId, updateData) {
  const serviceRef = doc(db, 'extraordinaryServices', serviceId);
  try {
    const payload = { ...updateData };
    if (typeof payload.date === 'string') {
      payload.date = Timestamp.fromDate(parseISO(payload.date));
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
    }
    await updateDoc(serviceRef, payload);
  } catch (error) {
    console.error('Error al actualizar servicio extraordinario:', error);
    throw error;
  }
}

export async function deleteExtraService(serviceId) {
<<<<<<< HEAD
    const serviceRef = doc(db, 'extraordinaryServices', serviceId);
    try {
        await deleteDoc(serviceRef);
    } catch (error) {
        console.error('Error al eliminar servicio extraordinario:', error);
        throw error;
    }
=======
  const serviceRef = doc(db, 'extraordinaryServices', serviceId);
  try {
    await deleteDoc(serviceRef);
  } catch (error) {
    console.error('Error al eliminar servicio extraordinario:', error);
    throw error;
  }
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
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
<<<<<<< HEAD
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

=======
  try {
    const scheduleRef = doc(db, 'schedules', monthId);
    const scheduleSnap = await getDoc(scheduleRef);
    return scheduleSnap.exists() ? scheduleSnap.data() : null;
  } catch (error) {
    console.error(`Error al obtener el cuadrante para ${monthId}:`, error);
    throw new Error('No se pudo cargar el cuadrante.');
  }
}

export async function getLatestActivityFeed() {
  try {
    // Apunta a la colección 'markedDates'
    const feedRef = collection(db, 'markedDates');
    const q = query(feedRef, orderBy('date', 'desc'), limit(10));
    const querySnapshot = await getDocs(q);
    const feed = [];
    querySnapshot.forEach((doc) => {
      feed.push({ id: doc.id, ...doc.data() });
    });
    return feed;
  } catch (error) {
    console.error('Error al obtener el feed de actividad:', error);100
    return [];
  }
}

export async function getLatestMarkedDates() {
  try {
    const markedDatesRef = collection(db, 'markedDates');
    const q = query(markedDatesRef, orderBy('date', 'desc'), limit(10)); // Limita a 10 para no sobrecargar
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
  // 1. Define los turnos de trabajo estándar
  const workShifts = [
    { quadrant_symbol: 'M', name: 'Mañana' },
    { quadrant_symbol: 'T', name: 'Tarde' },
    { quadrant_symbol: 'N', name: 'Noche' },
    { quadrant_symbol: 'L', name: 'Libre' },
  ];

  try {
    // 2. Obtiene los tipos de permiso desde la base de datos
    const permissionTypes = await getPermissionTypes(); // Esta función ya la tienes

    // 3. Une ambas listas y devuelve el resultado
    return [...workShifts, ...permissionTypes];
  } catch (error) {
    console.error('Error al obtener todos los tipos de turno:', error);
    // Si falla la carga de permisos, devuelve al menos los básicos
    return workShifts;
  }
}

/**
 * Sube una imagen para un registro específico y devuelve su URL pública.
 * Esta versión es robusta y funciona aunque el archivo haya sido redimensionado (y perdido su nombre).
 * @param {File|Blob} file - El archivo de imagen seleccionado por el usuario.
 * @returns {Promise<string>} - La URL de descarga pública de la imagen.
 */
export async function uploadRecordImage(file) {
  if (!file) throw new Error('No se proporcionó ningún archivo.');

  // --- INICIO DE LA CORRECCIÓN ---
  // Si el archivo es un Blob (porque fue redimensionado) no tendrá nombre.
  // Le asignamos un nombre genérico basado en la extensión.
  const fileName = file.name || `imagen.${file.type.split('/')[1] || 'jpg'}`;

  // Creamos un nombre de archivo único para evitar que se sobrescriban.
  const filePath = `record_images/${Date.now()}-${fileName}`;
  // --- FIN DE LA CORRECCIÓN ---

  const storageRef = ref(storage, filePath);

  try {
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error('Error en dataController al subir la imagen del registro:', error);
    throw new Error('No se pudo subir la imagen del registro.');
  }
}

// ==============================================================================
// === INICIO DE LAS NUEVAS FUNCIONES PARA EL MÓDULO DE IDENTIFICACIONES ===
// ==============================================================================

/**
 * Guarda un nuevo documento de persona en Firestore.
 * El ID del documento será el DNI para evitar duplicados.
 * @param {string} dni - El DNI de la persona, que se usará como ID.
 * @param {object} data - El objeto con los datos de la persona.
 */
export async function savePersona(dni, data) {
  if (!dni) throw new Error("El DNI es obligatorio para crear una ficha de persona.");
  
  const personaRef = doc(db, 'personas', dni);
  
  // Añadimos campos de auditoría
  const finalData = {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(personaRef, finalData);
  return { id: personaRef.id };
}

/**
 * Actualiza los datos de una persona existente en Firestore.
 * @param {string} personaId - El ID del documento de la persona (su DNI).
 * @param {object} data - El objeto con los campos a actualizar.
 */
export async function updatePersona(personaId, data) {
  if (!personaId) throw new Error("Se requiere el ID de la persona para actualizar.");

  const personaRef = doc(db, 'personas', personaId);
  
  // Añadimos la fecha de actualización
  const finalData = {
    ...data,
    updatedAt: serverTimestamp(),
  };
  
  await updateDoc(personaRef, finalData);
  return { id: personaRef.id };
}

/**
 * Guarda un nuevo documento de vehículo en Firestore.
 * El ID del documento será la matrícula para evitar duplicados.
 * @param {string} matricula - La matrícula del vehículo, que se usará como ID.
 * @param {object} data - El objeto con los datos del vehículo.
 */
export async function saveVehiculo(matricula, data) {
  if (!matricula) throw new Error("La matrícula es obligatoria para crear una ficha de vehículo.");
  
  const vehiculoRef = doc(db, 'vehiculos', matricula);
  
  const finalData = {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(vehiculoRef, finalData);
  return { id: vehiculoRef.id };
}

/**
 * Actualiza los datos de un vehículo existente en Firestore.
 * @param {string} vehiculoId - El ID del documento del vehículo (su matrícula).
 * @param {object} data - El objeto con los campos a actualizar.
 */
export async function updateVehiculo(vehiculoId, data) {
  if (!vehiculoId) throw new Error("Se requiere el ID del vehículo para actualizar.");

  const vehiculoRef = doc(db, 'vehiculos', vehiculoId);
  
  const finalData = {
    ...data,
    updatedAt: serverTimestamp(),
  };
  
  await updateDoc(vehiculoRef, finalData);
  return { id: vehiculoRef.id };
}

/**
 * Busca un vehículo por su matrícula (que es el ID del documento).
 * @param {string} matricula - La matrícula a buscar.
 * @returns {Promise<object|null>} El objeto del vehículo si se encuentra, o null si no existe.
 */
export async function getVehiculoByMatricula(matricula) {
  if (!matricula || matricula.trim() === '') {
    throw new Error("Se requiere una matrícula para la búsqueda.");
  }

  // La matrícula se usa como ID, por lo que la búsqueda es una lectura directa y muy rápida.
  // Usamos toUpperCase() para asegurar consistencia, ya que las matrículas se guardan en mayúsculas.
  const vehiculoRef = doc(db, 'vehiculos', matricula.trim().toUpperCase());
  const docSnap = await getDoc(vehiculoRef);

  if (docSnap.exists()) {
    // Si el documento existe, devuelve sus datos junto con el ID.
    return { id: docSnap.id, ...docSnap.data() };
  } else {
    // Si no se encuentra, devuelve null.
    return null;
  }
}

/**
 * Llama a la Cloud Function para buscar vehículos.
 */
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

/**
 * Guarda un nuevo documento de establecimiento en Firestore.
 * El ID del documento será el CIF para evitar duplicados.
 * @param {string} cif - El CIF del establecimiento, que se usará como ID.
 * @param {object} data - El objeto con los datos del establecimiento.
 */
export async function saveEstablecimiento(cif, data) {
  if (!cif) throw new Error("El CIF es obligatorio para crear una ficha de establecimiento.");
  
  const establecimientoRef = doc(db, 'establecimientos', cif);
  
  const finalData = {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(establecimientoRef, finalData);
  return { id: establecimientoRef.id };
}

/**
 * Actualiza los datos de un establecimiento existente en Firestore.
 * @param {string} establecimientoId - El ID del documento del establecimiento (su CIF).
 * @param {object} data - El objeto con los campos a actualizar.
 */
export async function updateEstablecimiento(establecimientoId, data) {
  if (!establecimientoId) throw new Error("Se requiere el ID del establecimiento para actualizar.");

  const establecimientoRef = doc(db, 'establecimientos', establecimientoId);
  
  const finalData = {
    ...data,
    updatedAt: serverTimestamp(),
  };
  
  await updateDoc(establecimientoRef, finalData);
  return { id: establecimientoRef.id };
}

/**
 * Busca establecimientos por nombre comercial, CIF o titular.
 * @param {string} searchTerm - El término de búsqueda.
 * @returns {Promise<Array>} Una lista de establecimientos que coinciden con la búsqueda.
 */
export async function searchEstablecimientos(searchTerm) {
  try {
    const establecimientosRef = collection(db, 'establecimientos');
    
    // Para simplificar, haremos una búsqueda por nombre comercial.
    // Para búsquedas más robustas por múltiples campos, necesitarías índices
    // compuestos en Firestore o una solución de búsqueda externa como Algolia.
    const qNombre = query(
      establecimientosRef, 
      where('nombreComercial', '>=', searchTerm), 
      where('nombreComercial', '<=', searchTerm + '\uf8ff')
    );
    
    const querySnapshot = await getDocs(qNombre);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error al buscar establecimientos:", error);
    throw new Error("La búsqueda de establecimientos falló.");
  }
}

// ==============================================================================
// === NUEVAS FUNCIONES PARA LA GESTIÓN DE REQUERIMIENTOS ===
// ==============================================================================

/**
 * Elimina un requerimiento específico de un parte de servicio.
 * @param {string} reportId - El ID del parte de servicio.
 * @param {string} requerimientoId - El ID del requerimiento a eliminar.
 */
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

/**
 * Actualiza los datos de un requerimiento específico.
 * @param {string} reportId - El ID del parte de servicio.
 * @param {string} requerimientoId - El ID del requerimiento a actualizar.
 * @param {object} data - El objeto con los nuevos datos para el requerimiento.
 */
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
export async function updateRequerimiento(reportId, requerimientoId, data) {
    if (!reportId || !requerimientoId || !data) {
        throw new Error("Faltan datos para actualizar el requerimiento.");
    }
    const requerimientoRef = doc(db, 'serviceReports', reportId, 'requerimientos', requerimientoId);
<<<<<<< HEAD
    const updateData = { ...data, updatedAt: serverTimestamp() };
=======
    const updateData = {
        ...data,
        updatedAt: serverTimestamp() // Asegura que se actualice la marca de tiempo
    };
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
    try {
        await updateDoc(requerimientoRef, updateData);
    } catch (error) {
        console.error("Error al actualizar el requerimiento:", error);
        throw new Error("No se pudo actualizar el requerimiento.");
    }
}

export async function getDashboardStats(startDate, endDate) {
<<<<<<< HEAD
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
=======
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


// 👇 AÑADE ESTA NUEVA FUNCIÓN Y EXPORTALA 👇
export async function getDocumentTemplateById(templateId) {
  try {
    // Creamos una referencia directa al documento que queremos
    const docRef = doc(db, "documentTemplates", templateId);
    
    // Obtenemos los datos de ese único documento
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      // Si el documento existe, lo devolvemos junto con su ID
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      // Si no se encuentra, lanzamos un error claro
      throw new Error("No se encontró la plantilla con el ID proporcionado.");
    }
  } catch (error) {
    console.error("Error al obtener el documento por ID:", error);
    throw error; // Re-lanzamos el error para que la vista pueda manejarlo
  }
}

// ==============================================================================
// === MÓDULO DE GESTIÓN DE TAREAS ===
// ==============================================================================

/**
 * Crea una nueva tarea específica en la colección 'tareas'.
 * @param {object} taskData - Datos de la tarea { orderId, description, assignedAgentId, assignedAgentName }.
 */
export async function createTask(taskData) {
  const user = currentUser.get();
  if (!user) throw new Error('Usuario no autenticado.');

  const payload = {
    ...taskData,
    status: 'pendiente', // Las tareas siempre se crean como pendientes
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

/**
 * Actualiza el estado de una tarea.
 * @param {string} taskId - ID de la tarea a actualizar.
 * @param {string} newStatus - El nuevo estado ('finalizada' o 'validada').
 */
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

/**
 * Obtiene todas las tareas pendientes para un agente específico.
 * @param {string} agentId - ID del agente.
 * @returns {Promise<Array>} Una lista de las tareas pendientes del agente.
 */
/**
 * Obtiene todas las tareas pendientes para un agente específico.
 */
export async function getPendingTasksForAgent(agentId) {
  if (!agentId) return [];
  
  const q = query(
    collection(db, 'tareas'), 
    where('assignedAgentId', '==', agentId), 
    where('status', '==', 'pendiente'),
    orderBy('createdAt', 'desc')
  );
  
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error al obtener las tareas del agente:", error);
    throw new Error("No se pudieron cargar las tareas pendientes.");
  }
}

/**
 * Obtiene todas las tareas para el panel de administrador (con paginación y filtros).
 * @param {object} options - Opciones de paginación y filtros { limit, startAfterDoc, status, agentId }.
 */
export async function getAllTasks(options = {}) {
  const { limit: queryLimit = 15, startAfterDoc, status, agentId } = options;
  const tasksCol = collection(db, 'tareas');
  
  let queryConstraints = [];

  // Aplicar filtros
  if (status && status !== 'all') {
    queryConstraints.push(where('status', '==', status));
  }
  if (agentId && agentId !== 'all') {
    queryConstraints.push(where('assignedAgentId', '==', agentId));
  }
  
  // Ordenación (necesaria para paginación)
  queryConstraints.push(orderBy('createdAt', 'desc'));
  
  // Paginación
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
    // Este error a menudo indica que falta un índice compuesto en Firestore.
    // La consola de Firebase debería proporcionar un enlace para crearlo.
    throw new Error('No se pudieron cargar las tareas. Revisa si falta un índice en Firestore.');
  }
}

/**
 * Obtiene todas las tareas específicas asociadas a una Orden de Servicio.
 * @param {string} orderId - El ID de la Orden de Servicio.
 * @returns {Promise<Array>} Una lista de tareas.
 */
export async function getTasksByOrderId(orderId) {
  if (!orderId) return [];
  
  // Apunta a la colección 'tareas'
  const tasksRef = collection(db, 'tareas');
  // Crea una consulta para encontrar todas las tareas donde 'orderId' coincida
  const q = query(tasksRef, where('orderId', '==', orderId), orderBy('createdAt', 'asc'));
  
  try {
    const querySnapshot = await getDocs(q);
    // Devuelve un array con los datos de cada tarea encontrada
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return { 
            id: doc.id, 
            ...data,
            // Convierte los Timestamps de Firebase a objetos Date de JavaScript
            createdAt: data.createdAt ? data.createdAt.toDate() : null,
            completedAt: data.completedAt ? data.completedAt.toDate() : null,
            validatedAt: data.validatedAt ? data.validatedAt.toDate() : null,
        };
    });
  } catch (error) {
    console.error(`Error al obtener las tareas para la orden ${orderId}:`, error);
    // Este error a menudo indica que falta un índice compuesto en Firestore.
    throw new Error('No se pudieron cargar las tareas. Revisa si falta un índice en Firestore.');
  }
}

>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
