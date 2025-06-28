// Archivo: functions/index.js

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");

const { format, parseISO } = require('date-fns');
const { es } = require('date-fns/locale/es');
const { toZonedTime, formatInTimeZone } = require('date-fns-tz');

admin.initializeApp();
const db = admin.firestore();

const MADRID_TIMEZONE = 'Europe/Madrid';

function getDateStringInMadridTimezone(dateObj) {
    return formatInTimeZone(dateObj, MADRID_TIMEZONE, 'yyyy-MM-dd', { locale: es });
}

function getMonthNameInMadridTimezone(dateObj) {
    return formatInTimeZone(dateObj, MADRID_TIMEZONE, 'MMMM', { locale: es }).toLowerCase();
}

exports.setCustomUserClaims = onDocumentUpdated("users/{userId}", async (event) => {
    if (!event.data.after) {
        logger.log(`No hay datos después de la actualización para ${event.params.userId}, posiblemente borrado.`);
        return;
    }
    const afterData = event.data.after.data();
    const userRole = afterData.role || "guard";
    const agentId = String(afterData.agentId || "");
    try {
        await admin.auth().setCustomUserClaims(event.params.userId, { role: userRole, agentId: agentId });
        logger.log(`SUCCESS: Custom claims para ${event.params.userId} actualizados. Rol: ${userRole}, AgentId: ${agentId}`);
    } catch (error) {
        logger.error(`ERROR al establecer custom claims para ${event.params.userId}:`, error);
    }
});

exports.updateSolicitudStatus = onCall(async (request) => {
    if (request.auth?.token?.role !== 'admin') {
        throw new HttpsError("permission-denied", "Acción reservada para administradores.");
    }
    const { solicitudId, newStatus } = request.data;
    const solicitudRef = db.collection('solicitudes').doc(solicitudId);

    try {
        await solicitudRef.update({
            status: newStatus,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            reviewedByUserId: request.auth.uid
        });

        if (newStatus === 'Aprobado') {
            try {
                await updateScheduleForPermissionRequest(solicitudId);
            } catch (error) {
                logger.error(`Falló la actualización del cuadrante para la solicitud ${solicitudId}.`, error);
                throw new HttpsError("internal", "El estado se actualizó, pero hubo un error al aplicar los cambios al cuadrante.");
            }
        }
        return { success: true, message: "Estado de la solicitud actualizado." };
    } catch (error) {
        logger.error(`Error al actualizar estado de solicitud ${solicitudId}:`, error);
        throw new HttpsError("internal", `No se pudo actualizar el estado de la solicitud: ${error.message}`);
    }
});

async function updateScheduleForPermissionRequest(solicitudId) {
    logger.info(`[CF] updateScheduleForPermissionRequest: Iniciada para solicitudId: ${solicitudId}`);
    const solicitudDoc = await db.collection('solicitudes').doc(solicitudId).get();
    if (!solicitudDoc.exists) {
        logger.warn(`[CF] Solicitud ${solicitudId} no encontrada para actualizar cuadrante.`);
        return;
    }
    const solicitudData = solicitudDoc.data();
    logger.info(`[CF] Solicitud Data para permiso: ${JSON.stringify(solicitudData)}`);

    const permissionTypeDoc = await db.collection('permissionTypes').doc(solicitudData.typeId).get();
    if (!permissionTypeDoc.exists) {
        logger.warn(`[CF] Tipo de permiso ${solicitudData.typeId} no encontrado para solicitud ${solicitudId}.`);
        return;
    }
    logger.info(`[CF] Tipo de permiso Data: ${JSON.stringify(permissionTypeDoc.data())}`);

    const initialQuadrantSymbol = permissionTypeDoc.data().initial_quadrant;
    const agentId = String(solicitudData.agentId);
    logger.info(`[CF] Símbolo inicial de cuadrante: ${initialQuadrantSymbol}, Agente ID: ${agentId}`);

    let currentDay = solicitudData.startDate.toDate(); // Fechas ya son Date objects del frontend
    const endDate = solicitudData.endDate.toDate();

    logger.info(`[CF] Procesando fechas desde ${currentDay.toISOString()} hasta ${endDate.toISOString()}`);

    while (currentDay <= endDate) {
        const dateStringForComparison = getDateStringInMadridTimezone(currentDay);
        
        const yearStr = formatInTimeZone(currentDay, MADRID_TIMEZONE, 'yyyy');
        const monthName = getMonthNameInMadridTimezone(currentDay);
        const scheduleId = `cuadrante_${monthName}_${yearStr}`;
        const scheduleRef = db.collection('schedules').doc(scheduleId);
        logger.info(`[CF] Procesando día: ${dateStringForComparison}, Schedule ID: ${scheduleId}`);

        try {
            const scheduleDoc = await scheduleRef.get();
            logger.info(`[CF] ScheduleDoc existe: ${scheduleDoc.exists} para ID: ${scheduleId}`);

            if (scheduleDoc.exists) {
                const scheduleData = scheduleDoc.data();
                // NO ACCEDER NI MANIPULAR scheduleData.people aquí. Solo necesitamos weeks.
                logger.info(`[CF] Schedule Data (parcial): Semanas presentes: ${Object.keys(scheduleData.weeks).length}`);
                
                let dayUpdatedSuccessfully = false;
                for (const weekKey in scheduleData.weeks) {
                    const week = scheduleData.weeks[weekKey];
                    if (!week || !week.days) {
                        logger.warn(`[CF] Semana ${weekKey} o sus días no son válidos en el cuadrante ${scheduleId}.`);
                        continue;
                    }

                    for (const dayKey in week.days) {
                        const dayData = week.days[dayKey];
                        if (!dayData || !dayData.date) {
                            logger.warn(`[CF] Día ${dayKey} o su fecha no son válidos en la semana ${weekKey} del cuadrante ${scheduleId}.`);
                            continue;
                        }

                        if (dayData.date === dateStringForComparison) {
                            const shifts = dayData.shifts || {};
                            const shiftKeyToUpdate = Object.keys(shifts).find(key => String(shifts[key].agentId) === agentId);
                            
                            const updatePathBase = `weeks.${weekKey}.days.${dayKey}.shifts`;
                            let fullUpdatePath;

                            if (shiftKeyToUpdate) {
                                fullUpdatePath = `${updatePathBase}.${shiftKeyToUpdate}.shiftType`;
                                await scheduleRef.update({
                                    [fullUpdatePath]: initialQuadrantSymbol
                                });
                                logger.log(`[CF] Turno existente actualizado: Agente ${agentId}, Día ${dateStringForComparison}, Nuevo Tipo: ${initialQuadrantSymbol}`);
                            } else {
                                const newUniqueShiftKey = `solicitud_shift_${agentId}_${Date.now()}`;
                                fullUpdatePath = `${updatePathBase}.${newUniqueShiftKey}`;
                                await scheduleRef.update({
                                    [fullUpdatePath]: { agentId: agentId, shiftType: initialQuadrantSymbol, originalShift: null }
                                });
                                logger.warn(`[CF] No se encontró turno existente para el agente ${agentId} en el día ${dateStringForComparison}. Se ha añadido un NUEVO turno.`);
                            }
                            
                            dayUpdatedSuccessfully = true;
                            break;
                        }
                    }
                    if(dayUpdatedSuccessfully) break;
                }
                if (!dayUpdatedSuccessfully) {
                    logger.warn(`[CF] updateScheduleForPermissionRequest: No se encontró ni actualizó el día para el agente ${agentId} en ${dateStringForComparison}.`);
                }
            } else {
                logger.warn(`[CF] Cuadrante ${scheduleId} no existe para actualizar permiso de ${agentId} en ${dateStringForComparison}.`);
            }
        } catch (error) {
            logger.error(`[CF] ERROR al actualizar cuadrante para permiso ${scheduleId} en ${dateStringForComparison}:`, error);
            throw error;
        }

        currentDay.setDate(currentDay.getDate() + 1);
    }
    logger.info(`[CF] updateScheduleForPermissionRequest: Finalizada para solicitudId: ${solicitudId}`);
}

exports.updateShiftV2 = onCall(async (request) => {
    logger.info("Iniciando updateShiftV2 con datos:", request.data);

    if (request.auth?.token?.role !== 'admin') {
        throw new HttpsError("permission-denied", "Solo los administradores pueden editar turnos directamente.");
    }

    const { monthId, weekKey, dayKey, agentId, newShiftType, existingShiftKey } = request.data;
    if (!monthId || !weekKey || !dayKey || !agentId) {
        throw new HttpsError("invalid-argument", "Faltan datos para actualizar el turno.");
    }

    const scheduleRef = db.collection('schedules').doc(monthId);

    try {
        const FieldValue = admin.firestore.FieldValue; // Importación correcta de FieldValue
        
        const shiftKey = existingShiftKey || `agent_shift_${agentId}`; 
        const updatePath = `weeks.${weekKey}.days.${dayKey}.shifts.${shiftKey}`;

        logger.info(`[updateShiftV2] Intentando actualizar en ${monthId}`);
        logger.info(`[updateShiftV2] Ruta de actualización: ${updatePath}`);
        logger.info(`[updateShiftV2] Nuevo tipo de turno: ${newShiftType}`);
        logger.info(`[updateShiftV2] Agente ID: ${agentId}`);
        logger.info(`[updateShiftV2] Clave de turno usada: ${shiftKey}`);


        if (newShiftType && newShiftType !== '-') {
            await scheduleRef.update({
                [updatePath]: { agentId: String(agentId), shiftType: newShiftType }
            });
            return { success: true, message: "Turno actualizado con éxito." };
        } else {
            await scheduleRef.update({ [updatePath]: FieldValue.delete() });
            return { success: true, message: "Turno eliminado con éxito." };
        }
    } catch (error) {
        // --- CAMBIO CLAVE AQUÍ: Propagar el mensaje de error original ---
        logger.error(`Error al actualizar el turno en ${monthId} (detalles):`, error); 
        throw new HttpsError("internal", `No se pudo actualizar el turno en la base de datos: ${error.message || error}`);
        // --- FIN CAMBIO CLAVE ---
    }
});

exports.initializeMonth = onCall(async (request) => {
    if (request.auth?.token?.role !== 'admin') {
        throw new HttpsError("permission-denied", "Solo los administradores pueden inicializar meses.");
    }

    const { monthId, year, monthIndex, peopleToInitialize } = request.data;

    if (!monthId || typeof year === 'undefined' || typeof monthIndex === 'undefined' || !Array.isArray(peopleToInitialize) || peopleToInitialize.length === 0) {
        throw new HttpsError("invalid-argument", "Faltan datos para inicializar el mes (monthId, year, monthIndex, peopleToInitialize).");
    }

    const scheduleRef = db.collection('schedules').doc(monthId);

    return db.runTransaction(async (transaction) => {
        const docSnap = await transaction.get(scheduleRef);
        if (docSnap.exists) {
            return { status: "already_exists", message: "El cuadrante para este mes ya existe." };
        }

        const initialWeeksData = {};
        const peopleMap = {};

        const firstDayOfMonth = new Date(year, monthIndex, 1);
        const startDayOfWeek = (firstDayOfMonth.getDay() === 0) ? 6 : firstDayOfMonth.getDay() - 1;

        let currentDayPointer = new Date(firstDayOfMonth);
        currentDayPointer.setDate(firstDayOfMonth.getDate() - startDayOfWeek);

        for (let weekNum = 0; weekNum < 6; weekNum++) {
            const weekDays = {};
            for (let dayNum = 0; dayNum < 7; dayNum++) {
                const dateString = getDateStringInMadridTimezone(currentDayPointer);
                const isCurrentMonth = currentDayPointer.getMonth() === monthIndex && currentDayPointer.getFullYear() === year;

                const dayData = {
                    date: dateString,
                    name: formatInTimeZone(currentDayPointer, MADRID_TIMEZONE, 'EEE', { locale: es }),
                    number: formatInTimeZone(currentDayPointer, MADRID_TIMEZONE, 'd', { locale: es }),
                    month: getMonthNameInMadridTimezone(currentDayPointer),
                    year: currentDayPointer.getFullYear(),
                    isCurrentMonth: isCurrentMonth,
                    shifts: {}
                };

                peopleToInitialize.forEach(agentId => {
                    dayData.shifts[`agent_shift_${agentId}`] = {
                        agentId: String(agentId),
                        shiftType: 'Libre'
                    };
                });
                weekDays[String(dayNum)] = dayData;
                currentDayPointer.setDate(currentDayPointer.getDate() + 1);
            }
            initialWeeksData[`week${weekNum}`] = { days: weekDays };
        }

        const agentDocs = await db.collection('agents').where(admin.firestore.FieldPath.documentId(), 'in', peopleToInitialize.map(String)).get();
        agentDocs.docs.forEach(doc => {
            peopleMap[doc.id] = { id: doc.id, name: doc.data().name || `Agente ${doc.id}`, active: doc.data().active || false };
        });

        transaction.set(scheduleRef, {
            id: monthId,
            year: year,
            month: monthIndex,
            weeks: initialWeeksData,
            people: peopleMap,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastInitializedBy: request.auth.uid
        });

        return { status: "success", message: `Cuadrante para ${monthId} inicializado correctamente.` };
    });
});

exports.addShiftChangeRequest = onCall(async (request) => {
    logger.info("Cloud Function addShiftChangeRequest: Iniciada.");
    logger.info("Cloud Function addShiftChangeRequest: Datos recibidos:", request.data);

    if (!request.auth) {
        logger.warn("Cloud Function addShiftChangeRequest: Solicitud no autenticada.");
        throw new HttpsError("unauthenticated", "Debes estar autenticado.");
    }

    const { requesterAgentId, targetAgentId, requesterShiftDate, requesterShiftType, targetShiftDate, targetShiftType } = request.data;
    const requesterComments = request.data.requesterComments || "";

    if (!requesterAgentId || !targetAgentId || !requesterShiftDate || !requesterShiftType || !targetShiftDate || !targetShiftType) {
        logger.error("Cloud Function addShiftChangeRequest: Argumentos inválidos o faltantes.", { requesterAgentId, targetAgentId, requesterShiftDate, requesterShiftType, targetShiftDate, targetShiftType });
        throw new HttpsError("invalid-argument", "Faltan datos requeridos para la solicitud de cambio de turno.");
    }
    
    let parsedRequesterShiftDate;
    let parsedTargetShiftDate;
    try {
        parsedRequesterShiftDate = admin.firestore.Timestamp.fromDate(parseISO(requesterShiftDate));
        parsedTargetShiftDate = admin.firestore.Timestamp.fromDate(parseISO(targetShiftDate));
    } catch (e) {
        logger.error("Cloud Function addShiftChangeRequest: Error al parsear fechas:", e);
        throw new HttpsError("invalid-argument", "Formato de fecha inválido.");
    }

    const newRequest = {
        requesterAgentId: String(requesterAgentId),
        targetAgentId: String(targetAgentId),
        requesterShiftDate: parsedRequesterShiftDate,
        requesterShiftType,
        targetShiftDate: parsedTargetShiftDate,
        targetShiftType,
        requesterComments,
        status: "Pendiente_Target",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        requesterUserId: request.auth.uid
    };
    logger.info("Cloud Function addShiftChangeRequest: Objeto de solicitud a guardar:", newRequest);

    try {
        const docRef = await db.collection("solicitudes_cambio_turno").add(newRequest);
        logger.info(`Cloud Function addShiftChangeRequest: Solicitud añadida con ID: ${docRef.id}`);
        return { success: true, message: "Solicitud de cambio de turno enviada con éxito.", requestId: docRef.id };
    } catch (error) {
        logger.error("Cloud Function addShiftChangeRequest: Error al añadir solicitud de cambio de turno a Firestore:", error);
        throw new HttpsError("internal", `Error al enviar la solicitud: ${error.message}`);
    } finally {
        logger.info("Cloud Function addShiftChangeRequest: Finalizada.");
    }
});

exports.respondToShiftChangeRequest = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Debes estar autenticado.");

    const { changeId, newStatus } = request.data;
    const requestRef = db.collection('solicitudes_cambio_turno').doc(changeId);

    const requestDoc = await requestRef.get();
    if (!requestDoc.exists) throw new HttpsError("not-found", "La solicitud no existe.");

    const requestData = requestDoc.data();
    const userAgentId = request.auth.token.agentId;
    const isAdmin = request.auth.token.role === 'admin';

    if (!isAdmin && String(userAgentId) !== String(requestData.targetAgentId)) {
        throw new HttpsError("permission-denied", "No tienes permiso para responder a esta solicitud.");
    }

    if (requestData.status !== "Pendiente_Target") {
         throw new HttpsError("failed-precondition", `La solicitud ya no está Pendiente. Estado actual: ${requestData.status}.`);
    }

    // Actualizar el estado de la solicitud de cambio de turno
    await requestRef.update({
        status: newStatus,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        respondedByUserId: request.auth.uid,
        // === CAMBIO CLAVE AQUÍ: Campo adminNotified ===
        adminNotified: (newStatus === 'Aprobado_Ambos' || newStatus === 'Aprobado_Admin') ? false : admin.firestore.FieldValue.delete()
        // === FIN CAMBIO CLAVE ===
    });

    if (newStatus === 'Aprobado_Ambos' || (isAdmin && newStatus === 'Aprobado_Admin')) {
        await findAndReplaceShiftInSchedule(requestData.requesterShiftDate.toDate(), requestData.requesterAgentId, requestData.targetShiftType);
        await findAndReplaceShiftInSchedule(requestData.targetShiftDate.toDate(), requestData.targetAgentId, requestData.requesterShiftType);
    }
    return { success: true, message: "Respuesta a la solicitud de cambio de turno procesada con éxito." };
});

async function findAndReplaceShiftInSchedule(dateObj, agentIdToUpdate, newShiftType) {
    if (!(dateObj instanceof Date) || isNaN(dateObj)) {
        logger.error(`findAndReplaceShiftInSchedule: Fecha inválida proporcionada para el agente ${agentIdToUpdate}.`);
        return;
    }

    const dateStringForComparison = getDateStringInMadridTimezone(dateObj);
    
    const yearStr = formatInTimeZone(dateObj, MADRID_TIMEZONE, 'yyyy');
    const monthName = getMonthNameInMadridTimezone(dateObj); 
    const scheduleId = `cuadrante_${monthName}_${yearStr}`;
    const scheduleRef = db.collection('schedules').doc(scheduleId);

    try {
        const scheduleDoc = await scheduleRef.get();

        if (scheduleDoc.exists) {
            const scheduleData = scheduleDoc.data();
            let dayUpdatedSuccessfully = false;
            for (const weekKey in scheduleData.weeks) {
                const week = scheduleData.weeks[weekKey];
                if (!week || !week.days) {
                    logger.warn(`[CF] Semana ${weekKey} o sus días no son válidos en el cuadrante ${scheduleId}.`);
                    continue;
                }

                for (const dayKey in week.days) {
                    const dayData = week.days[dayKey];
                    if (!dayData || !dayData.date) {
                        logger.warn(`[CF] Día ${dayKey} o su fecha no son válidos en la semana ${weekKey} del cuadrante ${scheduleId}.`);
                        continue;
                    }

                    if (dayData.date === dateStringForComparison) {
                        const shifts = dayData.shifts || {};
                        const shiftKey = Object.keys(shifts).find(k => String(shifts[k].agentId) === String(agentIdToUpdate));

                        const updatePathBase = `weeks.${weekKey}.days.${dayKey}.shifts`;
                        let fullUpdatePath;

                        if (shiftKey) {
                            fullUpdatePath = `${updatePathBase}.${shiftKey}.shiftType`;
                            await scheduleRef.update({ [fullUpdatePath]: newShiftType });
                            logger.log(`[CF] Turno de ${agentIdToUpdate} en ${dateStringForComparison} actualizado a ${newShiftType}.`);
                        } else {
                            const newUniqueShiftKey = `agent_shift_${agentIdToUpdate}_${Date.now()}`;
                            fullUpdatePath = `${updatePathBase}.${newUniqueShiftKey}`;
                            await scheduleRef.update({
                                 [fullUpdatePath]: { agentId: String(agentIdToUpdate), shiftType: newShiftType }
                            });
                            logger.warn(`[CF] No se encontró turno existente para el agente ${agentIdToUpdate} en el día ${dateStringForComparison}. Se ha añadido un NUEVO turno.`);
                        }
                        dayUpdatedSuccessfully = true;
                        break;
                    }
                }
                if (dayUpdatedSuccessfully) break;
            }
            if (!dayUpdatedSuccessfully) {
                logger.warn(`findAndReplaceShiftInSchedule: No se encontró ni actualizó el día para el agente ${agentIdToUpdate} en ${dateStringForComparison}.`);
            }
        } else {
            logger.warn(`Cuadrante ${scheduleId} no existe para actualizar permiso de ${agentId} en ${dateStringForComparison}.`);
        }
    } catch (error) {
        logger.error(`[CF] ERROR al actualizar cuadrante para permiso ${scheduleId} en ${dateStringForComparison}:`, error);
        throw error;
    }
}

exports.getShiftChangeRequestsCallable = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debes estar autenticado para obtener solicitudes.');
    }

    const userAgentId = request.auth.token.agentId;
    const isAdmin = request.auth.token.role === 'admin';
    const statusFilter = request.data.status || null;
    const specificAgentIdFilter = request.data.agentId ? String(request.data.agentId) : null;

    const baseRef = db.collection("solicitudes_cambio_turno");
    let results = [];

    try {
        if (isAdmin) {
            let queryRef = baseRef;
            if (statusFilter) {
                queryRef = queryRef.where('status', '==', statusFilter);
            }
            if (specificAgentIdFilter && specificAgentIdFilter !== 'all') {
                const reqSnap = await queryRef.where('requesterAgentId', '==', specificAgentIdFilter).orderBy('createdAt', 'desc').get();
                const tarSnap = await queryRef.where('targetAgentId', '==', specificAgentIdFilter).orderBy('createdAt', 'desc').get();

                const tempMap = new Map();
                reqSnap.forEach(doc => tempMap.set(doc.id, { id: doc.id, ...doc.data() }));
                tarSnap.forEach(doc => tempMap.set(doc.id, { id: doc.id, ...doc.data() }));
                results = Array.from(tempMap.values());
            } else {
                const snapshot = await queryRef.orderBy('createdAt', 'desc').get();
                results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            }
        } else if (userAgentId) {
            const requesterQuerySnapshot = await baseRef
                .where("requesterAgentId", "==", String(userAgentId))
                .orderBy("createdAt", "desc")
                .get();

            const targetQuerySnapshot = await baseRef
                .where("targetAgentId", "==", String(userAgentId))
                .orderBy("createdAt", "desc")
                .get();

            const tempMap = new Map();
            requesterQuerySnapshot.forEach(doc => tempMap.set(doc.id, { id: doc.id, ...doc.data() }));
            targetQuerySnapshot.forEach(doc => tempMap.set(doc.id, { id: doc.id, ...doc.data() }));
            
            results = Array.from(tempMap.values());

            if (statusFilter) {
                results = results.filter(req => req.status === statusFilter);
            }

        } else {
            throw new HttpsError('permission-denied', 'No se pudo determinar el agente del usuario.');
        }

        results = results.map(doc => {
            if (doc.createdAt instanceof admin.firestore.Timestamp) doc.createdAt = doc.createdAt.toDate().toISOString();
            if (doc.updatedAt instanceof admin.firestore.Timestamp) doc.updatedAt = doc.updatedAt.toDate().toISOString();
            if (doc.requesterShiftDate instanceof admin.firestore.Timestamp) doc.requesterShiftDate = doc.requesterShiftDate.toDate().toISOString();
            if (doc.targetShiftDate instanceof admin.firestore.Timestamp) doc.targetShiftDate = doc.targetShiftDate.toDate().toISOString();
            return doc;
        });

        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return { success: true, data: results };

    } catch (error) {
        logger.error("Error al obtener solicitudes de cambio de turno:", error);
        throw new HttpsError('internal', 'Error al procesar la solicitud de cambios de turno.', error.message);
    }
});

exports.addAgentCallable = onCall(async (request) => {
    logger.info("Cloud Function addAgentCallable: Iniciada.", request.data);
    if (request.auth?.token?.role !== 'admin') {
        throw new HttpsError("permission-denied", "Solo los administradores pueden añadir agentes.");
    }
    const { id, name, active } = request.data;
    if (!name) {
        throw new HttpsError("invalid-argument", "El nombre del agente es requerido.");
    }

    try {
        let agentRef;
        if (id) {
            const agentDoc = await db.collection('agents').doc(String(id)).get();
            if (agentDoc.exists) {
                throw new HttpsError("already-exists", `El agente con ID ${id} ya existe.`);
            }
            agentRef = db.collection('agents').doc(String(id));
            await agentRef.set({ name, active, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        } else {
            agentRef = await db.collection('agents').add({ name, active, createdAt: admin.firestore.FieldValue.serverTimestamp() });
            logger.info(`Agente '${name}' añadido con ID autogenerado: ${agentRef.id}`);
            return { success: true, message: `Agente '${name}' añadido correctamente.`, agentId: agentRef.id };
        }
        logger.info(`Agente '${name}' añadido/establecido con ID: ${agentRef.id}`);
        return { success: true, message: `Agente '${name}' añadido correctamente.` };
    } catch (error) {
        logger.error("Error al añadir agente:", error);
        throw new HttpsError("internal", `Error al añadir agente: ${error.message}`);
    }
});

exports.updateAgentCallable = onCall(async (request) => {
    logger.info("Cloud Function updateAgentCallable: Iniciada.", request.data);
    if (request.auth?.token?.role !== 'admin') {
        throw new HttpsError("permission-denied", "Solo los administradores pueden actualizar agentes.");
    }
    const { agentId, updateData } = request.data;
    if (!agentId || !updateData) {
        throw new HttpsError("invalid-argument", "Faltan datos para actualizar el agente.");
    }

    try {
        const agentRef = db.collection('agents').doc(String(agentId));
        await agentRef.update(updateData);
        logger.info(`Agente ${agentId} actualizado con datos: ${JSON.stringify(updateData)}`);
        return { success: true, message: `Agente ${agentId} actualizado correctamente.` };
    } catch (error) {
        logger.error("Error al actualizar agente:", error);
        throw new HttpsError("internal", `Error al actualizar agente: ${error.message}`);
    }
});

exports.deleteAgentCallable = onCall(async (request) => {
    logger.info("Cloud Function deleteAgentCallable: Iniciada.", request.data);
    if (request.auth?.token?.role !== 'admin') {
        throw new HttpsError("permission-denied", "Solo los administradores pueden eliminar agentes.");
    }
    const { agentId } = request.data;
    if (!agentId) {
        throw new HttpsError("invalid-argument", "Falta el ID del agente a eliminar.");
    }

    try {
        await db.collection('agents').doc(String(agentId)).delete();
        logger.info(`Agente ${agentId} eliminado.`);
        return { success: true, message: `Agente ${agentId} eliminado correctamente.` };
    } catch (error) {
        logger.error("Error al eliminar agente:", error);
        throw new HttpsError("internal", `Error al eliminar agente: ${error.message}`);
    }
});

exports.markShiftChangeNotificationAsSeen = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Debes estar autenticado.");
    const { changeId } = request.data;
    const userAgentId = request.auth.token.agentId;
    const isAdmin = request.auth.token.role === 'admin';

    if (!changeId) throw new HttpsError("invalid-argument", "Falta el ID de la notificación.");

    try {
        const requestDoc = await db.collection('solicitudes_cambio_turno').doc(changeId).get();
        if (!requestDoc.exists) throw new HttpsError("not-found", "La solicitud no existe.");

        const requestData = requestDoc.data();
        // Solo el admin o el targetAgent pueden marcar como visto
        if (!isAdmin && String(userAgentId) !== String(requestData.targetAgentId)) {
            throw new HttpsError("permission-denied", "No tienes permiso para marcar esta notificación.");
        }

        await db.collection('solicitudes_cambio_turno').doc(changeId).update({
            adminNotified: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        logger.info(`Notificación de cambio de turno ${changeId} marcada como vista.`);
        return { success: true, message: "Notificación marcada como vista." };
    } catch (error) {
        logger.error(`Error al marcar notificación ${changeId} como vista:`, error);
        throw new HttpsError("internal", `Error al marcar notificación como vista: ${error.message}`);
    }
});


exports.migrateAgentIdsInSolicitudes = onCall(async (request) => {
    if (request.auth?.token?.role !== "admin") {
      throw new HttpsError(
        "permission-denied",
        "Solo los administradores pueden ejecutar la migración de datos.",
      );
    }

    const batch = db.batch();
    const solicitudesRef = db.collection("solicitudes");
    let documentsProcessed = 0;
    let documentsUpdated = 0;

    try {
      const snapshot = await solicitudesRef.get();

      if (snapshot.empty) {
        return {
          success: true,
          message: "No se encontraron documentos en la colección 'solicitudes'.",
          processed: 0,
          updated: 0,
        };
      }

      snapshot.forEach((doc) => {
        documentsProcessed++;
        const docData = doc.data();

        if (docData.agentId && typeof docData.agentId === "number") {
          logger.log(`Migrando documento ${doc.id}: agentId ${docData.agentId} (number) -> "${String(docData.agentId)}" (string)`);
          
          batch.update(doc.ref, { agentId: String(docData.agentId) });
          documentsUpdated++;
        }
      });

      await batch.commit();

      return {
        success: true,
        message: "Migración completada con éxito.",
        processed: documentsProcessed,
        updated: documentsUpdated,
      };
    } catch (error) {
      logger.error("Error durante la migración de datos:", error);
      throw new HttpsError(
        "internal",
        "Ocurrió un error al procesar la migración.",
        error,
      );
    }
});