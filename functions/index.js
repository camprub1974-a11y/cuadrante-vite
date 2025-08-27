// Archivo: functions/index.js
// Plantilla con patrón de inicialización perezosa y dinámica
// VERSIÓN COMPLETA Y CORREGIDA (21/07/2025) - Con geolocalización en checklist

// --- Dependencias Ligeras (se mantienen estáticas) ---

import functions from "firebase-functions";
import admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentUpdated } from "firebase-functions/v2/firestore"; 
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { format, parseISO, addDays, startOfMonth, endOfMonth, subMonths, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
import { Storage } from '@google-cloud/storage'; 
import { defineSecret } from "firebase-functions/params";
import puppeteer from 'puppeteer';

const BREVO_USER = defineSecret("BREVO_USER");
const BREVO_PASS = defineSecret("BREVO_PASS");
const AGENT_SENIORITY_ORDER = ['4684', '4687', '5281', '5605', '8498'];

if (!admin.apps.length) {
    admin.initializeApp();
}

let db;
const getDb = () => {
    if (!db) db = admin.firestore();
    return db;
};

let storage;
const getStorage = () => {
    if (!storage) storage = new Storage(); 
    return storage;
};

const MADRID_TIMEZONE = 'Europe/Madrid';
const BUCKET_NAME = admin.app().options.storageBucket;
const LOGO_PATH_IN_STORAGE = 'logo-ayto.png';
const EXTRA_SERVICE_TYPES = {
    'diurno': { name: 'Diurno', price: 25 },
    'nocturno': { name: 'Nocturno', price: 32 },
    'festivo': { name: 'Festivo', price: 35 },
    'festivo_nocturno': { name: 'Festivo Nocturno', price: 38 },
};



// --- Funciones de utilidad ---
function getDateStringInMadridTimezone(dateObj) {
    return formatInTimeZone(dateObj, MADRID_TIMEZONE, 'yyyy-MM-dd', { locale: es });
}

function getMonthNameInMadridTimezone(dateObj) {
    return formatInTimeZone(dateObj, MADRID_TIMEZONE, 'MMMM', { locale: es }).toLowerCase();
}

async function downloadLogoFromStorage() {
    try {
        const bucket = getStorage().bucket(BUCKET_NAME);
        const file = bucket.file(LOGO_PATH_IN_STORAGE);
        const [exists] = await file.exists();
        if (!exists) {
            logger.error(`El archivo '${LOGO_PATH_IN_STORAGE}' no existe en el bucket: ${BUCKET_NAME}`);
            return null;
        }
        const [logoBuffer] = await file.download();
        return logoBuffer;
    } catch (error) {
        logger.error("Error al descargar el logo:", error);
        return null;
    }
}

function safeConvertToDate(dateValue, docId) {
    if (!dateValue) return null;
    if (typeof dateValue.toDate === 'function') return dateValue.toDate();
    if (typeof dateValue === 'string') {
        try {
            const parsedDate = parseISO(dateValue);
            if (!isNaN(parsedDate)) return parsedDate;
        } catch (e) { /* Ignorar */ }
    }
    logger.error(`Documento ${docId} tiene un formato de fecha inválido.`, dateValue);
    return null;
}

async function updateScheduleForPermissionRequest(solicitudId) {
    const solicitudDoc = await getDb().collection('solicitudes').doc(solicitudId).get();
    if (!solicitudDoc.exists) return;
    const solicitudData = solicitudDoc.data();
    const permissionTypeDoc = await getDb().collection('permissionTypes').doc(solicitudData.typeId).get();
    if (!permissionTypeDoc.exists) return;
    const initialQuadrantSymbol = permissionTypeDoc.data().initial_quadrant;
    const agentId = String(solicitudData.agentId);
    let currentDay = solicitudData.startDate.toDate();
    const endDate = solicitudData.endDate.toDate();
    while (currentDay <= endDate) {
        const dateString = getDateStringInMadridTimezone(currentDay);
        const scheduleId = `cuadrante_${getMonthNameInMadridTimezone(currentDay)}_${formatInTimeZone(currentDay, MADRID_TIMEZONE, 'yyyy')}`;
        const scheduleRef = getDb().collection('schedules').doc(scheduleId);
        try {
            const scheduleDoc = await scheduleRef.get();
            if (!scheduleDoc.exists) { 
                logger.warn(`Documento de cuadrante ${scheduleId} no existe al intentar actualizar.`);
                return; 
            }
            const scheduleData = scheduleDoc.data();
            for (const weekKey in scheduleData.weeks) {
                for (const dayKey in scheduleData.weeks[weekKey].days) {
                    if (scheduleData.weeks[weekKey].days[dayKey]?.date === dateString) {
                        const shifts = scheduleData.weeks[weekKey].days[dayKey].shifts || {};
                        const shiftKeyToUpdate = Object.keys(shifts).find(key => String(shifts[key].agentId) === agentId);
                        const updatePath = `weeks.${weekKey}.days.${dayKey}.shifts.${shiftKeyToUpdate || `solicitud_${Date.now()}`}`;
                        await scheduleRef.update({ [updatePath]: { agentId: agentId, shiftType: initialQuadrantSymbol } });
                    }
                }
            }
        } catch (error) {
            logger.error(`Error al actualizar cuadrante ${scheduleId}:`, error);
        }
        currentDay = addDays(currentDay, 1);
    }
}

async function findAndReplaceShiftInSchedule(dateObj, agentIdToUpdate, newShiftType) {
    if (!(dateObj instanceof Date) || isNaN(dateObj)) return;
    const dateString = getDateStringInMadridTimezone(dateObj);
    const scheduleId = `cuadrante_${getMonthNameInMadridTimezone(dateObj)}_${formatInTimeZone(dateObj, MADRID_TIMEZONE, 'yyyy')}`;
    const scheduleRef = getDb().collection('schedules').doc(scheduleId);
    try {
        const scheduleDoc = await scheduleRef.get();
        if (!scheduleDoc.exists) { 
            logger.warn(`Documento de cuadrante ${scheduleId} no existe al intentar encontrar y reemplazar turno.`);
            return;
        }
        const scheduleData = scheduleDoc.data();
        for (const weekKey in scheduleData.weeks) {
            for (const dayKey in scheduleData.weeks[weekKey].days) {
                if (scheduleData.weeks[weekKey].days[dayKey]?.date === dateString) {
                    const shifts = scheduleData.weeks[weekKey].days[dayKey].shifts || {};
                    const shiftKey = Object.keys(shifts).find(k => String(shifts[k].agentId) === String(agentIdToUpdate));
                    if (newShiftType === 'N') continue;
                    const updatePath = `weeks.${weekKey}.days.${dayKey}.shifts.${shiftKey || `agente_${Date.now()}`}`;
                    await scheduleRef.update({ [updatePath]: { agentId: String(agentIdToUpdate), shiftType: newShiftType } });
                    return;
                }
            }
        }
    } catch (error) {
        logger.error(`Error al actualizar turno en ${scheduleId}:`, error);
    }
}

// [SOLUCIÓN] 'PDFDocument' se importa dinámicamente aquí para `generateReportPdfContent`
async function generateReportPdfContent(reportData, logoBuffer, userRole = 'guard') {
    const PDFDocument = (await import('pdfkit')).default;
    
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
            const buffers = [];
            doc.on("data", buffers.push.bind(buffers));
            doc.on("end", () => resolve(Buffer.concat(buffers)));
            doc.on("error", reject);

            const PADDING = 30;
            const PAGE_WIDTH = doc.page.width;
            const PAGE_HEIGHT = doc.page.height;
            const X_START = PADDING;
            const Y_START = PADDING;
            const MAX_TEXT_WIDTH = PAGE_WIDTH - 2 * PADDING;
            const FONT_NORMAL = "Helvetica";
            const FONT_BOLD = "Helvetica-Bold";

            const { servicesByAgent, periodStartDateObj, periodEndDateObj } = reportData;
            
            // --- ✅ INICIO DE LÓGICA PARA EL DESGLOSE FINAL ---
            const totalHoursByType = {
                diurno: 0,
                nocturno: 0,
                festivo: 0,
                festivo_nocturno: 0
            };
            // --- FIN DE LÓGICA ---

            // ... (El código del encabezado del PDF no cambia) ...
            let headerY = Y_START;
            if (logoBuffer) {
                try { doc.image(logoBuffer, X_START, headerY, { width: 70 }); }
                catch (imgError) { logger.error('Error al incrustar la imagen en el PDF:', imgError); }
            }
            doc.font(FONT_BOLD).fontSize(10).text("JEFATURA DE POLICIA LOCAL", X_START + 80, headerY + 10);
            doc.font(FONT_NORMAL).fontSize(8).text("e-mail: policialocal@chauchina.es", X_START + 80, headerY + 25);
            doc.text("Fax: 958 45 51 21", X_START + 80, headerY + 35);
            doc.y = Math.max(headerY + 70, doc.y);
            const monthNameStart = formatInTimeZone(periodStartDateObj, MADRID_TIMEZONE, 'MMMM', { locale: es });
            const monthNameEnd = formatInTimeZone(periodEndDateObj, MADRID_TIMEZONE, 'MMMM', { locale: es });
            const yearStart = formatInTimeZone(periodEndDateObj, MADRID_TIMEZONE, 'yyyy');
            const yearEnd = formatInTimeZone(periodEndDateObj, MADRID_TIMEZONE, 'yyyy');
            let asuntoText = ` Remuneración servicios extraordinarios `;
            if (isSameMonth(periodStartDateObj, periodEndDateObj) && yearStart === yearEnd) {
                asuntoText += `${monthNameStart} ${yearStart}`;
            } else if (yearStart === yearEnd) {
                asuntoText += `${monthNameStart}-${monthNameEnd} ${yearStart}`;
            } else {
                asuntoText += `${monthNameStart} ${yearStart} - ${monthNameEnd} ${yearEnd}`;
            }
            doc.font(FONT_BOLD).fontSize(10).text("Asunto:", X_START, doc.y, { continued: true }).font(FONT_NORMAL).text(asuntoText);
            doc.moveDown(0.5);
            doc.font(FONT_BOLD).fontSize(10).text("Destinatario:", X_START, doc.y, { continued: true }).font(FONT_NORMAL).text(" Recursos humanos");
            doc.moveDown(1);
            const introTextEndDate = formatInTimeZone(periodEndDateObj, MADRID_TIMEZONE, 'dd \'de\' MMMM \'de\' yyyy', { locale: es });
            doc.font(FONT_NORMAL).fontSize(10).text(
                `Por medio del presente oficio, se comunican los servicios extraordinarios realizados por policías de esta Jefatura de Policía Local en funciones de seguridad ciudadana y tráfico hasta el ${introTextEndDate}.`,
                { align: "justify", width: MAX_TEXT_WIDTH }
            ).moveDown(1.5);

            doc.font(FONT_BOLD).fontSize(10).text("Descripción de servicios extraordinarios", { underline: true }).moveDown();

            const sortedAgentIds = Object.keys(servicesByAgent).sort();

            for (const agentId of sortedAgentIds) {
                const agentData = servicesByAgent[agentId];
                if (!agentData || agentData.services.length === 0) continue;

                if (doc.y > PAGE_HEIGHT - 250) { doc.addPage(); }

                doc.font(FONT_BOLD).fontSize(10).text(`AGENTE Y T.I.P: ${agentData.name} (${agentId})`).moveDown(0.5);
                doc.lineWidth(0.5).moveTo(X_START, doc.y).lineTo(PAGE_WIDTH - PADDING, doc.y).stroke().moveDown(0.2);
                
                // ✅ ANCHOS DE COLUMNA AJUSTADOS
                const tableTop = doc.y;
                const col1Width = 100; // Día y Horario
                const col2Width = 230; // Evento
                const col3Width = 120; // Modalidad
                const col4Width = 50;  // Total
                
                const col1X = X_START + 5;
                const col2X = col1X + col1Width;
                const col3X = col2X + col2Width;
                const col4X = col3X + col3Width;

                // ✅ ENCABEZADOS DE TABLA ACTUALIZADOS
                doc.font(FONT_BOLD).fontSize(9);
                doc.text("DÍA", col1X, tableTop, { width: col1Width });
                doc.text("EVENTO", col2X, tableTop, { width: col2Width });
                doc.text("MODALIDAD", col3X, tableTop, { width: col3Width });
                doc.text("TOTAL", col4X, tableTop, { width: col4Width, align: 'right' });
                doc.moveTo(X_START, doc.y).lineTo(PAGE_WIDTH - PADDING, doc.y).stroke().moveDown(0.5);

                let currentRowY = doc.y;
                
                const validServices = [];
                agentData.services.forEach(s => {
                    const dateObj = safeConvertToDate(s.date, s.id);
                    if (dateObj) validServices.push({ ...s, dateObj });
                });
                validServices.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
                
                doc.font(FONT_NORMAL).fontSize(9);

                validServices.forEach(s => {
                    // ✅ Sumar horas al desglose general
                    if (totalHoursByType.hasOwnProperty(s.type)) {
                        totalHoursByType[s.type] += (s.hours || 0);
                    }

                    const hours = typeof s.hours === 'number' ? s.hours : 0;
                    const formattedDateAndTime = `${formatInTimeZone(s.dateObj, MADRID_TIMEZONE, 'dd/MM/yyyy')}${s.timeRange ? `-${s.timeRange}` : ''}`;
                    
                    // ✅ LÓGICA DE COLUMNAS ACTUALIZADA
                    const evento = s.notes && s.notes.trim() !== '' ? s.notes : 'Servicio sin descripción';
                    const modalidad = EXTRA_SERVICE_TYPES[s.type]?.name || s.type || 'Otros';
                    
                    const height1 = doc.heightOfString(formattedDateAndTime, { width: col1Width });
                    const height2 = doc.heightOfString(evento, { width: col2Width });
                    const rowHeight = Math.max(height1, height2) + 10;

                    if (currentRowY + rowHeight > PAGE_HEIGHT - 250) {
                        doc.addPage();
                        // (código para redibujar el header de la tabla en una nueva página)
                        currentRowY = Y_START;
                        doc.font(FONT_BOLD).fontSize(9);
                        doc.text("DÍA Y TRAMO HORARIO", col1X, currentRowY, { width: col1Width });
                        doc.text("EVENTO", col2X, currentRowY, { width: col2Width });
                        doc.text("MODALIDAD", col3X, currentRowY, { width: col3Width });
                        doc.text("TOTAL", col4X, currentRowY, { width: col4Width, align: 'right' });
                        doc.moveTo(X_START, doc.y).lineTo(PAGE_WIDTH - PADDING, doc.y).stroke().moveDown(0.5);
                        doc.font(FONT_NORMAL).fontSize(9);
                    }

                    doc.text(formattedDateAndTime, col1X, currentRowY, { width: col1Width });
                    doc.text(evento, col2X, currentRowY, { width: col2Width });
                    doc.text(modalidad, col3X, currentRowY, { width: col3Width });
                    doc.text(String(hours), col4X, currentRowY, { width: col4Width, align: 'right' });
                    
                    currentRowY += rowHeight;
                    doc.y = currentRowY;
                });
                
                const totalAgentHours = validServices.reduce((sum, s) => sum + (s.hours || 0), 0);
                
                if (totalAgentHours > 0) {
                    doc.moveDown(0.5);
                    const lineY = doc.y;
                    doc.lineWidth(0.5).moveTo(col4X, lineY).lineTo(col4X + col4Width, lineY).stroke();
                    doc.moveDown(0.5);
                    doc.font(FONT_BOLD).fontSize(10).text(String(totalAgentHours), col4X, doc.y, { width: col4Width, align: 'right' });
                }
                doc.moveDown(3);
            }
            
            // ✅ SECCIÓN DE DESGLOSE DE HORAS TOTALES EN FORMATO DE FILA/TABLA
            if (doc.y > PAGE_HEIGHT - 150) { doc.addPage(); }
            
            const summaryY = doc.y + 20;
            doc.font(FONT_BOLD).fontSize(11).text("Desglose Total de Horas por Modalidad", X_START, summaryY, { underline: true });

            const totalFestivo = totalHoursByType.festivo + totalHoursByType.festivo_nocturno;
            const totalOrdinario = totalHoursByType.diurno + totalHoursByType.nocturno;
            const granTotal = totalFestivo + totalOrdinario;

            const summaryTableTop = summaryY + 30;
            const summaryColWidth = 120;
            
            doc.font(FONT_BOLD).fontSize(10);
            doc.text("Ordinarias Diurnas", X_START, summaryTableTop);
            doc.text("Ordinarias Nocturnas", X_START + summaryColWidth, summaryTableTop);
            doc.text("Festivas Diurnas", X_START + summaryColWidth * 2, summaryTableTop);
            doc.text("Festivas Nocturnas", X_START + summaryColWidth * 3, summaryTableTop);

            doc.font(FONT_NORMAL).fontSize(10);
            doc.text(String(totalHoursByType.diurno), X_START, summaryTableTop + 15, { width: summaryColWidth, align: 'left' });
            doc.text(String(totalHoursByType.nocturno), X_START + summaryColWidth, summaryTableTop + 15, { width: summaryColWidth, align: 'left' });
            doc.text(String(totalHoursByType.festivo), X_START + summaryColWidth * 2, summaryTableTop + 15, { width: summaryColWidth, align: 'left' });
            doc.text(String(totalHoursByType.festivo_nocturno), X_START + summaryColWidth * 3, summaryTableTop + 15, { width: summaryColWidth, align: 'left' });
            
            doc.moveDown(3);
            doc.lineWidth(0.5).moveTo(X_START, doc.y).lineTo(PAGE_WIDTH - PADDING, doc.y).stroke();
            


            
            if (doc.y > PAGE_HEIGHT - 180) {
                doc.addPage();
            }
            doc.font(FONT_NORMAL).fontSize(10).text(
                `Lo que se extiende para su conocimiento y efectos oportunos.`,
                X_START,
                doc.y,
                { align: "left", width: MAX_TEXT_WIDTH }
            ).moveDown(2);

            if (userRole === 'admin') {
                const col1SignatureX = X_START + 50;
                const col2SignatureX = PAGE_WIDTH / 2 + 50;
                const colSignatureWidth = (PAGE_WIDTH - 2 * PADDING) / 2 - 50;
                let currentSignatureY = doc.y;
                doc.font(FONT_BOLD).fontSize(10).text("V.B°. ALCALDIA", col1SignatureX, currentSignatureY, { width: colSignatureWidth, align: 'left' });
                doc.font(FONT_NORMAL).fontSize(10).text("Jesús Fernández", col1SignatureX, doc.y + 15, { width: colSignatureWidth, align: 'left' });
                doc.text("Moreno", col1SignatureX, doc.y + 12, { width: colSignatureWidth, align: 'left' });
                doc.y = currentSignatureY;
                doc.font(FONT_BOLD).fontSize(10).text("Oficial de Policía Local", col2SignatureX, currentSignatureY, { width: colSignatureWidth, align: 'right' });
                doc.font(FONT_NORMAL).fontSize(9).text("TIP 4684", col2SignatureX, doc.y + 15, { width: colSignatureWidth, align: 'right' });
            } else {
                const agentId = sortedAgentIds[0];
                const agentData = servicesByAgent[agentId];
                doc.font(FONT_BOLD).fontSize(10).text("El Agente,", X_START, doc.y);
                doc.font(FONT_NORMAL).fontSize(10).text(`${agentData.name} (T.I.P: ${agentId})`, X_START, doc.y + 15);
            }

            doc.end();

        } catch (error) {
            logger.error("Error catastrófico durante la generación del PDF:", error);
            reject(error);
        }
    });
}

// =========================================================================================
// === COMIENZO DE NUEVAS FUNCIONES PARA ÓRDENES Y PARTES DE SERVICIO ===
// =========================================================================================

/**
 * Crea una nueva Orden de Servicio.
 * Requiere rol de 'admin' o 'mando'.
 */
export const createServiceOrder = onCall({ region: 'us-central1' }, async (request) => {
    if (request.auth?.token?.role !== 'admin' && request.auth?.token?.role !== 'mando') {
        throw new HttpsError("permission-denied", "Solo los mandos o administradores pueden crear órdenes de servicio.");
    }

    const { title, service_date, service_shift, description } = request.data;
    if (!title || !service_date || !service_shift) {
        throw new HttpsError("invalid-argument", "Los campos 'título', 'fecha de servicio' y 'turno' son requeridos.");
    }

    try {
        const newOrder = {
            title,
            service_date: admin.firestore.Timestamp.fromDate(parseISO(service_date)),
            service_shift,
            description: description || '',
            status: 'draft', // Estado inicial de la orden
            created_by_user_id: request.auth.uid,
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
            assigned_agents: [], // Lista de IDs de agentes asignados
        };

        const docRef = await getDb().collection('serviceOrders').add(newOrder);
        return { success: true, message: "Orden de servicio creada con éxito.", orderId: docRef.id };
    } catch (error) {
        logger.error("Error al crear la orden de servicio:", error);
        throw new HttpsError("internal", "No se pudo crear la orden de servicio.");
    }
});

/**
 * Genera el siguiente número de registro correlativo para una orden de servicio
 * dentro de un mes y año específicos. Formato: XXX/MM/YYYY
 */
export const generateNextOrderNumber = onCall({ region: 'us-central1' }, async (request) => {
    if (request.auth?.token?.role !== 'admin' && request.auth?.token?.role !== 'supervisor') {
        throw new HttpsError("permission-denied", "Acceso denegado.");
    }

    const { service_date } = request.data;
    if (!service_date) {
        throw new HttpsError("invalid-argument", "Se requiere la fecha del servicio.");
    }
    
    // ✅ Se añade el bloque 'try' que faltaba aquí
    try {
        const date = new Date(service_date);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        const prefix = `/${month}/${year}`;

        const db = getDb();
        const ordersRef = db.collection('serviceOrders');
        
        const q = ordersRef
            .where('order_reg_number', '>=', `000${prefix}`)
            .where('order_reg_number', '<=', `999${prefix}`)
            .orderBy('order_reg_number', 'desc')
            .limit(1);

        const querySnapshot = await q.get();
        let nextNumber = 1;

        if (!querySnapshot.empty) {
            const lastOrder = querySnapshot.docs[0].data();
            const lastNumber = parseInt(lastOrder.order_reg_number.split('/')[0], 10);
            nextNumber = lastNumber + 1;
        }

        const formattedNumber = `${String(nextNumber).padStart(3, '0')}${prefix}`;
        return { success: true, order_reg_number: formattedNumber };

    } catch (error) { // Este bloque 'catch' ahora es válido
        logger.error("Error generando el número de orden:", error);
        throw new HttpsError("internal", "No se pudo generar el número de registro.");
    }
});

// =================================================================
// === ✅ NUEVAS FUNCIONES DEL AGENTE IA AUTOMÁTICO ===
// =================================================================

/**
 * AGENTE AUTOMÁTICO DE MAÑANA: Se ejecuta todos los días a las 08:00.
 * Si la función está activada, hay un turno de mañana y no se ha creado una orden,
 * la genera y asigna automáticamente.
 */
export const autoGenerateMorningOrder = onSchedule({
    schedule: "every day 08:00",
    timeZone: "Europe/Madrid"
}, async (event) => {
    const db = getDb();
    const configDoc = await db.collection('configuration').doc('automation').get();
    if (!configDoc.exists() || configDoc.data().autoGenerateOrders !== true) {
        logger.info("La generación automática de órdenes está desactivada. No se tomará ninguna acción.");
        return null;
    }

    const today = new Date();
    const shiftType = "Mañana";
    
    try {
        await processAutoGeneration(db, today, shiftType);
    } catch (error) {
        logger.error("Error en la función autoGenerateMorningOrder:", error);
    }
    return null;
});

/**
 * AGENTE AUTOMÁTICO DE TARDE: Se ejecuta todos los días a las 18:00.
 */
export const autoGenerateAfternoonOrder = onSchedule({
    schedule: "every day 18:00",
    timeZone: "Europe/Madrid"
}, async (event) => {
    const db = getDb();
    const configDoc = await db.collection('configuration').doc('automation').get();
    if (!configDoc.exists() || configDoc.data().autoGenerateOrders !== true) {
        logger.info("La generación automática de órdenes está desactivada. No se tomará ninguna acción.");
        return null;
    }
    
    const today = new Date();
    const shiftType = "Tarde";

    try {
        await processAutoGeneration(db, today, shiftType);
    } catch (error) {
        logger.error("Error en la función autoGenerateAfternoonOrder:", error);
    }
    return null;
});

// --- ✅ NUEVAS FUNCIONES DE AYUDA PARA EL AGENTE IA ---

async function processAutoGeneration(db, date, shiftType) {
    // 1. Comprobar si ya existe una orden para hoy y este turno
    const dateString = format(date, 'yyyy-MM-dd');
    const startOfDay = new Date(`${dateString}T00:00:00`);
    const endOfDay = new Date(`${dateString}T23:59:59`);

    const existingOrdersQuery = db.collection('serviceOrders')
        .where('service_date', '>=', startOfDay)
        .where('service_date', '<=', endOfDay)
        .where('service_shift', '==', shiftType);
        
    const existingOrdersSnap = await existingOrdersQuery.get();
    
    if (!existingOrdersSnap.empty) {
        logger.info(`Ya existe una orden para ${dateString} ${shiftType}. No se tomará ninguna acción.`);
        return;
    }

    // 2. Si no existe, buscar agentes de turno en el cuadrante
    const monthName = format(date, 'MMMM', { locale: es }).toLowerCase();
    const year = date.getFullYear();
    const monthId = `cuadrante_${monthName}_${year}`;
    
    const scheduleDoc = await db.collection('schedules').doc(monthId).get();
    if (!scheduleDoc.exists()) {
        logger.warn(`No se encontró cuadrante para ${monthId}. No se puede generar la orden.`);
        return;
    }
    
    const scheduleData = scheduleDoc.data();
    const agentsOnShift = findAgentsOnShiftInSchedule(date, shiftType, scheduleData);

    if (agentsOnShift.length === 0) {
        logger.info(`No hay agentes de turno de ${shiftType} para hoy. No se creará la orden.`);
        return;
    }

    // 3. Si hay agentes y no hay orden, crearla
    logger.info(`Generando orden automática para ${shiftType} con agentes: ${agentsOnShift.join(', ')}`);
    await createOrderFromTemplate(db, date, shiftType, agentsOnShift);
}

async function createOrderFromTemplate(db, date, shiftType, agentIds) {
    const templateSnap = await db.collection('defaultOrderTemplates').where('shift', '==', shiftType).limit(1).get();
    if (templateSnap.empty) throw new Error(`No se encontró plantilla para el turno ${shiftType}`);
    const templateData = templateSnap.docs[0].data();

    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const prefix = `/${month}/${year}`;
    const ordersRef = db.collection('serviceOrders');
    const q = ordersRef.where('order_reg_number', '>=', `000${prefix}`).where('order_reg_number', '<=', `999${prefix}`).orderBy('order_reg_number', 'desc').limit(1);
    const lastOrderSnap = await q.get();
    let nextNumber = 1;
    if (!lastOrderSnap.empty) {
        const lastNum = parseInt(lastOrderSnap.docs[0].data().order_reg_number.split('/')[0], 10);
        nextNumber = lastNum + 1;
    }
    const regNumber = `${String(nextNumber).padStart(3, '0')}${prefix}`;

    const seniorAgentOnShift = AGENT_SENIORITY_ORDER.find(id => agentIds.includes(id)) || agentIds[0];

    const newOrderData = {
        title: templateData.title || 'Orden Genérica',
        description: templateData.description || '',
        service_date: admin.firestore.Timestamp.fromDate(date),
        service_shift: shiftType,
        status: 'assigned',
        assigned_agents: agentIds,
        checklist: Array.isArray(templateData.checklist) ? templateData.checklist : [],
        requiresGeolocation: templateData.requiresGeolocation || false,
        created_by_user_id: 'AUTOMATIC_AGENT', // Identificador del sistema
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        order_reg_number: regNumber,
        shift_manager_id: seniorAgentOnShift,
        autoGenerated: true 
    };
    await db.collection('serviceOrders').add(newOrderData);
    logger.info(`Orden automática ${regNumber} creada y asignada con éxito.`);
}

/**
 * ✅ FUNCIÓN CORREGIDA Y MEJORADA
 * Obtiene una lista de Órdenes de Servicio, aplicando los filtros opcionales de
 * estado, mes, año y turno que se proporcionan desde la interfaz de Planificación.
 */
export const getServiceOrders = onCall({ region: 'us-central1' }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Debes estar autenticado para ver las órdenes.");
    }

    const { status, year, month, service_shift } = request.data;
    const userRole = request.auth.token.role;
    const userAgentId = request.auth.token.agentId;

    let queryRef = getDb().collection('serviceOrders'); 

    if (year != null && month != null) {
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        queryRef = queryRef.where('service_date', '>=', startDate).where('service_date', '<=', endDate);
    }
    if (status) {
        queryRef = queryRef.where('status', '==', status);
    }
    if (service_shift) {
        queryRef = queryRef.where('service_shift', '==', service_shift);
    }

    if (userRole !== 'admin' && userRole !== 'supervisor') {
        queryRef = queryRef.where('assigned_agents', 'array-contains', userAgentId);
    }
    
    queryRef = queryRef.orderBy('service_date', 'desc');

    try {
        const snapshot = await queryRef.get();
        const orders = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                service_date: data.service_date.toDate().toISOString(),
                created_at: data.created_at.toDate().toISOString(),
            };
        });

        return { success: true, orders: orders };

    } catch (error) {
        logger.error(`Error al obtener las órdenes de servicio: ${error.message}`, error);
        throw new HttpsError("internal", "No se pudieron obtener las órdenes de servicio. Revisa los logs de la función.");
    }
});

/**
 * Asigna agentes y un responsable a una Orden de Servicio.
 */
export const assignResourcesToOrder = onCall({ region: 'us-central1' }, async (request) => {
    const userRole = request.auth?.token?.role;
    if (userRole !== 'admin' && userRole !== 'supervisor') {
        throw new new HttpsError("permission-denied", "Solo los administradores o supervisores pueden asignar recursos.");
    }

    const { orderId, agentIds, shiftManagerId } = request.data;

    if (!orderId || !Array.isArray(agentIds)) {
        throw new new HttpsError("invalid-argument", "Se requiere un ID de orden y una lista de IDs de agentes.");
    }
    
    if (agentIds.length > 0 && !shiftManagerId) {
        throw new new HttpsError("invalid-argument", "Debe seleccionar un responsable para el turno si hay agentes asignados.");
    }

    try {
        const orderRef = getDb().collection('serviceOrders').doc(orderId);
        
        const agentIdsAsString = agentIds.map(String);
        const managerIdAsString = shiftManagerId ? String(shiftManagerId) : null;

        await orderRef.update({
            assigned_agents: agentIdsAsString,
            shift_manager_id: managerIdAsString, // ✅ Se guarda el responsable
            status: 'assigned', 
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });

        return { success: true, message: "Recursos asignados y orden actualizada con éxito." };
    } catch (error) {
        logger.error("Error al asignar recursos a la orden:", error);
        throw new new HttpsError("internal", "Ocurrió un error al intentar asignar los recursos.");
    }
});

/**
 * Inicia una Orden de Servicio, cambiando su estado y creando un Parte de Servicio asociado.
 * AÑADIDA VERIFICACIÓN para asegurar que solo se ejecuta en órdenes con estado 'assigned'.
 */
export const startServiceOrder = onCall({ region: 'us-central1' }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "El usuario debe estar autenticado.");
    }

    const { orderId } = request.data;
    if (!orderId) {
        throw new HttpsError("invalid-argument", "Se requiere un ID de orden.");
    }

    const userAgentId = request.auth.token.agentId;
    if (!userAgentId) {
        throw new HttpsError("permission-denied", "El usuario no tiene un ID de agente asociado.");
    }

    const db = getDb();
    const orderRef = db.collection('serviceOrders').doc(orderId);
    const reportRef = db.collection('serviceReports').doc();

    try {
        logger.info(`Iniciando transacción para la orden: ${orderId} por el agente ${userAgentId}`);

        const reportId = await db.runTransaction(async (transaction) => {
            const orderDoc = await transaction.get(orderRef);

            if (!orderDoc.exists) {
                throw new HttpsError("not-found", "La orden de servicio no existe.");
            }

            const orderData = orderDoc.data();
            logger.info(`Estado actual de la orden ${orderId} antes de la transacción: ${orderData.status}`);

            // ✅ VERIFICACIÓN CLAVE: Si la orden ya no está en estado 'assigned', la transacción falla.
            // Esto previene la creación de partes duplicados.
            if (orderData.status !== 'assigned') {
                throw new HttpsError("failed-precondition", `La orden ya no está en estado 'assigned'. Estado actual: ${orderData.status}. No se creará un nuevo parte.`);
            }

            if (!orderData.assigned_agents || !orderData.assigned_agents.includes(userAgentId)) {
                throw new HttpsError("permission-denied", "No tienes permiso para iniciar esta orden de servicio.");
            }

            // Actualizamos el estado de la orden
            transaction.update(orderRef, {
                status: 'in_progress',
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });

            // Creamos el nuevo parte de servicio
            const newReport = {
                order_id: orderId,
                status: 'open',
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
                assigned_agents: orderData.assigned_agents,
                created_by_user_id: request.auth.uid
            };
            transaction.set(reportRef, newReport);

            logger.info(`Transacción para la orden ${orderId} completada con éxito. Nuevo parte ID: ${reportRef.id}`);
            return reportRef.id;
        });

        return { success: true, message: "Servicio iniciado correctamente.", reportId: reportId };

    } catch (error) {
        logger.error(`FALLO en la transacción para la orden ${orderId}:`, error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", "Ocurrió un error en el servidor al iniciar el servicio.");
    }
});

/**
 * Completa una Orden de Servicio, cambiando su estado a 'completed' y cerrando el Parte de Servicio asociado.
 * Requiere que el usuario sea uno de los agentes asignados a la orden.
 */
export const completeServiceOrder = onCall({ region: 'us-central1' }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "El usuario debe estar autenticado.");
    }

    const { orderId, reportId, completionNotes } = request.data;
    if (!orderId || !reportId) {
        throw new HttpsError("invalid-argument", "Se requiere un ID de orden y un ID de parte.");
    }

    const userAgentId = request.auth.token.agentId;
    if (!userAgentId) {
        throw new HttpsError("permission-denied", "El usuario no tiene un ID de agente asociado.");
    }

    const db = getDb();
    const orderRef = db.collection('serviceOrders').doc(orderId);
    const reportRef = db.collection('serviceReports').doc(reportId);

    try {
        await db.runTransaction(async (transaction) => {
            const orderDoc = await transaction.get(orderRef);
            const reportDoc = await transaction.get(reportRef);

            if (!orderDoc.exists) {
                throw new HttpsError("not-found", "La orden de servicio no existe.");
            }
            if (!reportDoc.exists) {
                throw new HttpsError("not-found", "El parte de servicio asociado no existe.");
            }

            const orderData = orderDoc.data();
            const reportData = reportDoc.data();

            if (!orderData.assigned_agents || (!orderData.assigned_agents.includes(userAgentId) && request.auth.token.role !== 'admin' && request.auth.token.role !== 'mando')) {
                throw new HttpsError("permission-denied", "No tienes permiso para completar esta orden de servicio.");
            }

            if (orderData.status !== 'in_progress' && orderData.status !== 'assigned') {
                throw new HttpsError("failed-precondition", `La orden no puede ser completada. Estado actual: ${orderData.status}.`);
            }

            transaction.update(orderRef, {
                status: 'completed',
                completion_notes: completionNotes || '',
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
                completed_by_user_id: request.auth.uid
            });

            transaction.update(reportRef, {
                status: 'closed',
                closed_at: admin.firestore.FieldValue.serverTimestamp(),
                completion_notes: completionNotes || reportData.completion_notes || '', 
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
            });
        });

        return { success: true, message: "Orden de servicio completada y parte cerrado con éxito." };

    } catch (error) {
        logger.error(`Error al completar la orden ${orderId} y parte ${reportId}:`, error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", "Ocurrió un error en el servidor al completar el servicio.");
    }
});

/**
 * Añade una nueva entrada (novedad) a un Parte de Servicio existente.
 * Requiere que el usuario sea uno de los agentes asignados al parte.
 */
export const addReportEntry = onCall({ region: 'us-central1' }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "El usuario debe estar autenticado.");
    }

    const { reportId, description } = request.data;
    if (!reportId || !description || description.trim() === '') {
        throw new HttpsError("invalid-argument", "Se requiere un ID del parte y una descripción válida.");
    }
    
    const userAgentId = request.auth.token.agentId;
    const db = getDb();
    const reportRef = db.collection('serviceReports').doc(reportId);
    const entryRef = reportRef.collection('reportEntries').doc(); 

    try {
        // --- Verificación de Permisos ---
        const reportDoc = await reportRef.get();
        if (!reportDoc.exists) { 
            throw new HttpsError("not-found", "El parte de servicio no existe.");
        }
        const reportData = reportDoc.data();
        if (!reportData.assigned_agents || !reportData.assigned_agents.includes(userAgentId)) {
            throw new HttpsError("permission-denied", "No tienes permiso para añadir novedades a este parte.");
        }
        // --- Fin de la Verificación ---

        const newRequerimientoRef = reportRef.collection('requerimientos').doc();
        
        await newRequerimientoRef.set({
            description: description,
            isResolved: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: userAgentId,
        });

        logger.info(`Nuevo requerimiento ${newRequerimientoRef.id} añadido al parte ${reportId} por el agente ${userAgentId}`);
        return { success: true, id: newRequerimientoRef.id };

    } catch(error) {
        logger.error(`Error al añadir requerimiento al parte ${reportId}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "No se pudo añadir el requerimiento.");
    }
});

/**
 * Busca y devuelve el ID del Parte de Servicio asociado a una Orden de Servicio.
 */
export const getReportForOrder = onCall({ region: 'us-central1', cors: true }, async (request) => {
    if (!request.auth || !request.auth.token.agentId) {
        throw new HttpsError("unauthenticated", "El usuario debe estar autenticado y tener un ID de agente.");
    }

    const { orderId } = request.data;
    if (!orderId) {
        throw new HttpsError("invalid-argument", "Se requiere proporcionar un ID de orden (orderId).");
    }

    logger.info(`Buscando parte de servicio para la orden: ${orderId} por el agente: ${request.auth.token.agentId}`);

    try {
        const db = getDb();
        const reportsRef = db.collection('serviceReports');
        
        const snapshot = await reportsRef.where('order_id', '==', orderId).limit(1).get();

        if (snapshot.empty) { 
            logger.warn(`No se encontró un parte de servicio para la orden: ${orderId}`);
            throw new HttpsError("not-found", "No se encontró un parte de servicio asociado a esta orden.");
        }
        
        const reportDoc = snapshot.docs[0];
        logger.info(`Parte de servicio encontrado con ID: ${reportDoc.id} para la orden: ${orderId}`);
        
        return { success: true, reportId: reportDoc.id };

    } catch (error) {
        logger.error(`Error catastrófico buscando el parte para la orden ${orderId}:`, error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", "Ocurrió un error inesperado en el servidor al buscar el parte de servicio.");
    }
});

/**
 * Finaliza y envía un Parte de Servicio para su revisión.
 */
export const submitServiceReport = onCall({ region: 'us-central1' }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "El usuario debe estar autenticado.");
    }
    const { reportId } = request.data;
    if (!reportId) {
        throw new HttpsError("invalid-argument", "Se requiere un ID del parte de servicio.");
    }

    const db = getDb();
    const reportRef = db.collection('serviceReports').doc(reportId);
    
    try {
        await reportRef.update({
            status: 'pending_review',
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        return { success: true, message: "Parte de servicio enviado para revisión." };
    } catch (error) {
        logger.error(`Error al enviar el parte ${reportId}:`, error);
        throw new HttpsError("internal", "No se pudo enviar el parte para revisión.");
    }
});

/**
 * Permite a un mando validar o devolver un Parte de Servicio.
 * ✅ AHORA TAMBIÉN ACTUALIZA LA ORDEN DE SERVICIO A 'completed' SI SE VALIDA.
 */
export const validateServiceReport = onCall({ region: 'us-central1' }, async (request) => {
    if (!request.auth || (request.auth.token.role !== 'admin' && request.auth.token.role !== 'supervisor')) {
        throw new HttpsError("permission-denied", "Solo los mandos pueden validar partes de servicio.");
    }

    const { reportId, newStatus, comments } = request.data;
    if (!reportId || !newStatus || !['validated', 'returned'].includes(newStatus)) {
        throw new HttpsError("invalid-argument", "Se requiere un ID de parte y un nuevo estado válido ('validated' o 'returned').");
    }

    const db = getDb();
    const reportRef = db.collection('serviceReports').doc(reportId);

    try {
        const reportDoc = await reportRef.get();
        
        // ✅ SINTAXIS CORREGIDA: Se usa .exists en lugar de .exists()
        if (!reportDoc.exists) {
            throw new HttpsError("not-found", "El parte de servicio no existe.");
        }
        
        const updateData = {
            status: newStatus,
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
            validated_by_user_id: request.auth.uid
        };

        if (newStatus === 'returned' && comments) {
            updateData.validation_comments = comments;
        }
        
        await reportRef.update(updateData);

        // Si el parte se ha validado, actualizamos también la orden principal
        if (newStatus === 'validated') {
            const orderId = reportDoc.data().order_id;
            if (orderId) {
                const orderRef = db.collection('serviceOrders').doc(orderId);
                await orderRef.update({
                    status: 'completed',
                    updated_at: admin.firestore.FieldValue.serverTimestamp()
                });
                logger.info(`Orden ${orderId} marcada como 'completed' tras la validación del parte.`);
            }
        }
        
        return { success: true, message: "El estado del parte ha sido actualizado." };

    } catch (error) {
        logger.error(`[ERROR FATAL] La función validateServiceReport ha fallado:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "No se pudo actualizar el estado del parte. Revisa los logs de la función.");
    }
});

/**
 * [MODIFICADO] Obtiene una lista de Partes de Servicio con filtros opcionales.
 * Asegura que la descripción se envíe sin escapar los saltos de línea.
 */
export const getServiceReports = onCall({ region: 'us-central1', cors: true }, async (request) => { 
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "El usuario debe estar autenticado.");
    }

    const { status } = request.data;
    const userRole = request.auth.token.role;
    const userAgentId = request.auth.token.agentId;
    const db = getDb();
    let reportsQuery = db.collection('serviceReports');

    // Construir la consulta base
    if (userRole === 'admin' || userRole === 'supervisor') {
        if (status && status !== 'all') {
            reportsQuery = reportsQuery.where('status', '==', status);
        }
    } else if (userRole === 'guard') {
        reportsQuery = reportsQuery.where('assigned_agents', 'array-contains', userAgentId);
        if (status && status !== 'all') {
            reportsQuery = reportsQuery.where('status', '==', status);
        }
    } else {
        throw new HttpsError("permission-denied", "Rol no autorizado para esta consulta.");
    }
    
    reportsQuery = reportsQuery.orderBy('created_at', 'desc');

    try {
        const snapshot = await reportsQuery.get();
        
        const reports = await Promise.all(snapshot.docs.map(async (doc) => {
            const reportData = doc.data();
            const report = {
                id: doc.id,
                ...reportData,
                created_at: reportData.created_at.toDate().toISOString(),
                // Valores por defecto por si la orden no se encuentra
                order_title: 'Orden no encontrada',
                service_shift: 'N/A',
                order_reg_number: '---'
            };

            if (reportData.order_id) {
                try {
                    const orderDoc = await db.collection('serviceOrders').doc(reportData.order_id).get();
                    if (orderDoc.exists) {
                        const orderData = orderDoc.data();
                        report.order_title = orderData.title;
                        report.service_shift = orderData.service_shift;
                        report.order_reg_number = orderData.order_reg_number || '---';
                    }
                } catch (orderError) {
                    logger.warn(`No se pudo obtener la orden ${reportData.order_id} para el parte ${doc.id}`);
                }
            }
            return report;
        }));
        
        return { success: true, reports: reports };

    } catch (error) {
        logger.error("[ERROR FATAL] La función getServiceReports ha fallado:", error);
        throw new HttpsError("internal", "No se pudieron obtener los partes de servicio. Revisa los logs.");
    }
});

/**
 * Crea órdenes desde una plantilla, buscando los agentes de turno en el cuadrante,
 * asignándolos automáticamente y estableciendo al más veterano como responsable.
 */
export const createDefaultServiceOrders = onCall({ region: 'us-central1' }, async (request) => {
    // 1. Verificación de permisos
    if (!request.auth || (request.auth.token.role !== 'admin' && request.auth.token.role !== 'supervisor')) {
        throw new HttpsError("permission-denied", "Solo los administradores o supervisores pueden realizar esta acción.");
    }

    const { date, templateShiftType } = request.data; 
    if (!date || !templateShiftType) {
        throw new HttpsError("invalid-argument", "Se requiere una fecha y un tipo de turno.");
    }
    
    const db = getDb();
    // AGENT_SENIORITY_ORDER ya está definido en el ámbito global del archivo.

    try {
        // --- Paso 1: Obtener la plantilla ---
        const templateSnapshot = await db.collection('defaultOrderTemplates')
                                       .where('shift', '==', templateShiftType)
                                       .limit(1)
                                       .get();

        if (templateSnapshot.empty) {
            throw new HttpsError("not-found", `No se encontró una plantilla para el turno: ${templateShiftType}.`);
        }
        const templateData = templateSnapshot.docs[0].data();

        // --- Paso 2: Buscar agentes de turno en el cuadrante ---
        const serviceDate = new Date(date + 'T12:00:00'); // Usar mediodía para evitar problemas de UTC
        const monthName = format(serviceDate, 'MMMM', { locale: es }).toLowerCase();
        const year = serviceDate.getFullYear();
        const monthId = `cuadrante_${monthName}_${year}`;
        
        const scheduleDoc = await db.collection('schedules').doc(monthId).get();
        if (!scheduleDoc.exists) {
            throw new HttpsError("not-found", `No se encontró el cuadrante para ${monthName} de ${year}. Asigna los turnos primero.`);
        }
        
        const scheduleData = scheduleDoc.data();
        // Se pasa el texto de la fecha (YYYY-MM-DD) a la función de búsqueda para evitar errores de zona horaria
        const agentsOnShift = findAgentsOnShiftInSchedule(date, templateShiftType, scheduleData);

        if (agentsOnShift.length === 0) {
            // Si no hay agentes, se devuelve un mensaje claro y no se crea la orden.
            return { success: false, message: `No se generó la orden porque no hay agentes de ${templateShiftType} para el ${date}.` };
        }

        // --- Paso 3: Determinar el responsable por antigüedad ---
        // Busca el primer ID en el orden de antigüedad que también esté en la lista de agentes de turno.
        // Si no encuentra ninguno (caso raro), asigna al primer agente de la lista.
        const seniorAgentOnShift = AGENT_SENIORITY_ORDER.find(id => agentsOnShift.includes(id)) || agentsOnShift[0];

        // --- Paso 4: Generar el número de registro ---
        const month = (serviceDate.getMonth() + 1).toString().padStart(2, '0');
        const prefix = `/${month}/${year}`;
        
        const ordersRef = db.collection('serviceOrders');
        // ✅ CORREGIDO: Usar los métodos directamente desde la referencia de la colección
        const q = ordersRef
            .where('order_reg_number', '>=', `000${prefix}`)
            .where('order_reg_number', '<=', `999${prefix}`)
            .orderBy('order_reg_number', 'desc')
            .limit(1);
        
        const querySnapshot = await q.get(); // ✅ CORREGIDO: get() se llama directamente sobre el objeto query 'q'
        let nextNumber = 1;

        if (!querySnapshot.empty) {
            const lastOrder = querySnapshot.docs[0].data();
            const lastNumber = parseInt(lastOrder.order_reg_number.split('/')[0], 10);
            nextNumber = lastNumber + 1;
        }
        const formattedNumber = `${String(nextNumber).padStart(3, '0')}${prefix}`;

        // --- Paso 5: Crear el nuevo objeto de la orden con todos los datos ---
        const serviceDateTimestamp = admin.firestore.Timestamp.fromDate(parseISO(date));
        const newOrderData = {
            title: templateData.title || 'Orden Genérica', 
            description: templateData.description || '', 
            service_date: serviceDateTimestamp,
            service_shift: templateData.shift,
            status: 'assigned', // Se crea directamente como 'assigned'
            assigned_agents: agentsOnShift, // Se asignan los agentes de turno
            checklist: Array.isArray(templateData.checklist) ? templateData.checklist : [], 
            requiresGeolocation: templateData.requiresGeolocation || false, 
            created_by_user_id: request.auth.uid,
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
            order_reg_number: formattedNumber,
            shift_manager_id: seniorAgentOnShift, // Se asigna el responsable
        };
        
        // Logs de depuración movidos aquí, dentro de la función y después de la definición
        logger.info(`Senior Agent On Shift (Responsable): ${seniorAgentOnShift}`);
        logger.info(`New Order Data being added, shift_manager_id: ${newOrderData.shift_manager_id}`);

        await db.collection('serviceOrders').add(newOrderData);
        
        return { success: true, message: `Se creó y asignó 1 orden genérica para ${templateShiftType}.` };

    } catch (error) {
        logger.error(`[ERROR FATAL] La función createDefaultServiceOrders ha fallado:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "No se pudieron crear las órdenes por defecto. Revisa los logs de la función.");
    }
});

// ✅ FUNCIÓN DE AYUDA CORREGIDA: AHORA ACEPTA LA FECHA COMO TEXTO
function findAgentsOnShiftInSchedule(dateString, shiftFullName, schedule) {
    const shiftNameMap = { 'mañana': 'M', 'tarde': 'T', 'noche': 'N' };
    const shiftShortCode = shiftNameMap[shiftFullName.toLowerCase()];
    if (!shiftShortCode || !schedule || !schedule.weeks) return [];
    
    // ya no es necesario formatear la fecha, usamos la que viene directamente
    // const dateString = format(date, 'yyyy-MM-dd');
    
    const agentIds = [];
    for (const weekKey in schedule.weeks) {
        for (const dayKey in schedule.weeks[weekKey].days) {
            const day = schedule.weeks[weekKey].days[dayKey];
            if (day.date === dateString) {
                for (const shiftKey in day.shifts) {
                    const shiftInfo = day.shifts[shiftKey];
                    if (shiftInfo.shiftType?.toUpperCase() === shiftShortCode.toUpperCase()) {
                        agentIds.push(String(shiftInfo.agentId));
                    }
                }
                return agentIds;
            }
        }
    }
    return agentIds;
}

/**
 * Permite a un administrador o supervisor actualizar los detalles de una Orden de Servicio.
 * Esta función no tiene restricciones de fecha o estado para los roles de mando.
 */
export const updateServiceOrder = onCall({ region: 'us-central1' }, async (request) => {
    // 1. Verificación de permisos: Solo admin o supervisor pueden ejecutarla.
    const userRole = request.auth?.token?.role;
    if (userRole !== 'admin' && userRole !== 'supervisor') {
        throw new HttpsError("permission-denied", "Solo los administradores o supervisores pueden editar órdenes.");
    }

    // 2. Validación de los datos recibidos desde el frontend.
    const { orderId, updateData } = request.data;
    if (!orderId || !updateData) {
        throw new HttpsError("invalid-argument", "Se requiere un ID de orden y los datos a actualizar.");
    }
    
    const db = getDb();
    const orderRef = db.collection('serviceOrders').doc(orderId);

    try {
        // 3. Preparamos los datos para la actualización.
        // Convertimos la fecha de texto a Timestamp de Firestore.
        const finalUpdateData = {
            ...updateData,
            service_date: admin.firestore.Timestamp.fromDate(parseISO(updateData.service_date)),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        };

        // 4. Ejecutamos la actualización en la base de datos.
        await orderRef.update(finalUpdateData);
        
        logger.info(`La orden ${orderId} fue actualizada por un ${userRole}.`);
        return { success: true, message: "Orden de servicio actualizada con éxito." };

    } catch (error) {
        logger.error(`Error al actualizar la orden ${orderId}:`, error);
        throw new HttpsError("internal", "No se pudo actualizar la orden de servicio.");
    }
});

/**
 * Elimina una Orden de Servicio.
 * Solo puede ser ejecutado por un admin o supervisor.
 */
export const deleteServiceOrder = onCall({ region: 'us-central1' }, async (request) => {
    const userRole = request.auth?.token?.role;
    if (userRole !== 'admin' && userRole !== 'supervisor') {
        throw new HttpsError("permission-denied", "Solo los administradores o supervisores pueden eliminar órdenes.");
    }

    const { orderId } = request.data;
    if (!orderId) {
        throw new HttpsError("invalid-argument", "Se requiere un ID de orden para eliminarla.");
    }

    const db = getDb();
    const orderRef = db.collection('serviceOrders').doc(orderId);

    try {
        // Opcional: Aquí se podría añadir lógica para borrar también los partes de servicio asociados.
        // Por ahora, solo eliminamos la orden.

        await orderRef.delete();
        
        logger.info(`La orden ${orderId} fue eliminada por un ${userRole}.`);
        return { success: true, message: "Orden de servicio eliminada con éxito." };

    } catch (error) {
        logger.error(`Error al eliminar la orden ${orderId}:`, error);
        throw new HttpsError("internal", "No se pudo eliminar la orden de servicio.");
    }
});

// ==================================================================
// === FUNCIÓN CON LA CORRECCIÓN FINAL PARA EL ERROR 500 ============
// ==================================================================
/**
 * Permite a un agente o mando actualizar el estado y la geolocalización de un ítem del checklist.
 * Almacena la ubicación y la marca de tiempo del servidor cuando un ítem se marca como completado.
 */
export const updateChecklistItemStatus = onCall({ region: 'us-central1' }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "El usuario debe estar autenticado.");
    }

    // Se leen los nuevos parámetros: newStatus y comment
    const { reportId, orderId, itemIndex, newStatus, comment, geolocation } = request.data;
    
    // Se valida que los parámetros necesarios estén presentes
    if (!reportId || !orderId || itemIndex === undefined || !newStatus) {
        throw new HttpsError("invalid-argument", "Faltan datos requeridos (reportId, orderId, itemIndex, newStatus).");
    }
    
    if (geolocation && (typeof geolocation.latitude !== 'number' || typeof geolocation.longitude !== 'number')) {
        throw new HttpsError("invalid-argument", "El objeto 'geolocation' es inválido.");
    }

    const userAgentId = request.auth.token.agentId;
    const db = getDb();
    const orderRef = db.collection('serviceOrders').doc(orderId);

    try {
        await db.runTransaction(async (transaction) => {
            const orderDoc = await transaction.get(orderRef);
            if (!orderDoc.exists) {
                throw new HttpsError("not-found", "La orden de servicio asociada no existe.");
            }
            
            const orderData = orderDoc.data();
            const isAssigned = orderData.assigned_agents?.includes(userAgentId);
            if (!isAssigned) {
                throw new HttpsError("permission-denied", "No tienes permiso para modificar este checklist.");
            }

            const checklist = orderData.checklist || [];
            if (itemIndex < 0 || itemIndex >= checklist.length) {
                throw new HttpsError("out-of-range", "El índice del ítem del checklist es inválido.");
            }

            const updatedChecklist = [...checklist];
            const itemToUpdate = updatedChecklist[itemIndex];

            // ✅ SE ACTUALIZAN LOS CAMPOS CON LA NUEVA ESTRUCTURA
            itemToUpdate.status = newStatus; // 'pendiente' o 'realizado'
            itemToUpdate.comment = comment || ""; // Se guarda el comentario o un texto vacío
            itemToUpdate.completed = (newStatus === 'realizado'); // Se mantiene por compatibilidad

            if (newStatus === 'realizado') {
                itemToUpdate.completed_at = new Date(); // Usar la fecha del servidor es más robusto
                if (geolocation) {
                    itemToUpdate.completed_location = new admin.firestore.GeoPoint(geolocation.latitude, geolocation.longitude);
                }
            } else {
                // Si vuelve a "pendiente", se eliminan los datos de finalización
                delete itemToUpdate.completed_at;
                delete itemToUpdate.completed_location;
            }

            transaction.update(orderRef, { 
                checklist: updatedChecklist,
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
        });

        logger.info(`Checklist item [${itemIndex}] en orden ${orderId} actualizado a '${newStatus}'.`);
        return { success: true, message: "Checklist actualizado correctamente." };

    } catch (error) {
        logger.error(`Error al actualizar ítem del checklist en orden ${orderId}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "No se pudo actualizar el ítem del checklist.");
    }
});

// ✅ Cloud Function updateRequerimientoStatus (versión final y limpia)
/**
 * Cloud Function para actualizar el estado y/o el comentario de un requerimiento.
 * Recibe reportId, orderId, requerimientoId, newStatus, comment (opcional), geolocation (opcional).
 *
 * Confiamos en los custom claims del token de autenticación para rol y agentId.
 */
export const updateRequerimientoStatus = onCall({ region: 'us-central1' }, async (request) => {
    logger.info('--- Inicio de updateRequerimientoStatus (VERSION FINAL Y LIMPIA) ---');

    // 1. Verificación de Autenticación (Ahora funcionará al recibir el token correctamente)
    if (!request.auth) {
        logger.warn('Intento de llamada a updateRequerimientoStatus sin autenticación.');
        throw new HttpsError('unauthenticated', 'Solo usuarios autenticados pueden actualizar requerimientos.');
    }

    // 2. Obtener los datos del usuario directamente del token de autenticación (Custom Claims)
    const userId = request.auth.uid;
    const userRole = request.auth.token.role;
    const userAgentId = request.auth.token.agentId; // Este es el agentId del usuario logeado

    logger.info(`Usuario UID: ${userId}, Rol: ${userRole}, AgentId: ${userAgentId}`);

    // Validar que el userAgentId exista en el token (es un claim crítico para permisos)
    if (!userAgentId) {
        logger.error(`Usuario ${userId} no tiene un agentId en el token de autenticación.`);
        throw new HttpsError('permission-denied', 'Tu cuenta de usuario no tiene un ID de agente asociado. Contacta con soporte.');
    }
    
    // 3. Validación de datos de entrada
    const { reportId, orderId, requerimientoId, newStatus, comment, geolocation } = request.data;
    if (!reportId || !orderId || !requerimientoId || !newStatus) {
        logger.error('Faltan datos requeridos para updateRequerimientoStatus.', { reportId, orderId, requerimientoId, newStatus });
        throw new HttpsError('invalid-argument', 'Faltan datos requeridos (reportId, orderId, requerimientoId, newStatus).');
    }

    if (newStatus !== 'pendiente' && newStatus !== 'realizado') {
        logger.error(`Estado de requerimiento inválido recibido: ${newStatus}`);
        throw new HttpsError('invalid-argument', 'El estado del requerimiento no es válido. Debe ser "pendiente" o "realizado".');
    }

    // Validación de geolocalización, si se proporciona
    if (geolocation && (typeof geolocation.latitude !== 'number' || typeof geolocation.longitude !== 'number')) {
        logger.error('Objeto "geolocation" inválido.', geolocation);
        throw new HttpsError("invalid-argument", "El objeto 'geolocation' es inválido.");
    }

    const db = getDb(); // Obtener la instancia de Firestore

    // Referencias a los documentos
    const requerimientoRef = db.collection('serviceReports').doc(reportId).collection('requerimientos').doc(requerimientoId);
    const orderRef = db.collection('serviceOrders').doc(orderId);
    const reportRef = db.collection('serviceReports').doc(reportId);

    try {
        await db.runTransaction(async (transaction) => {
            // Obtener los documentos de la orden y el parte dentro de la transacción
            const orderSnap = await transaction.get(orderRef);
            const reportSnap = await transaction.get(reportRef);

            // Verificar si los documentos existen
            if (!orderSnap.exists) {
                logger.error(`Orden de servicio no encontrada: ${orderId}`);
                throw new HttpsError('not-found', 'Orden de servicio asociada no encontrada.');
            }
            if (!reportSnap.exists) {
                logger.error(`Parte de servicio no encontrado: ${reportId}`);
                throw new HttpsError('not-found', 'Parte de servicio no encontrado.');
            }

            const orderData = orderSnap.data();
            const reportData = reportSnap.data();
            
            // 4. Verificación de permisos y roles:
            // Usamos userAgentId y userRole directamente del token.
            const isResponsibleAgent = orderData.shift_manager_id === userAgentId; // Revisa si es el responsable del turno de la orden
            const isAssignedAgent = orderData.assigned_agents?.includes(userAgentId); // Revisa si es un agente asignado a la orden
            const isAdminOrSupervisor = userRole === 'admin' || userRole === 'supervisor';

            if (!isResponsibleAgent && !isAssignedAgent && !isAdminOrSupervisor) {
                logger.warn(`Permiso denegado para el usuario ${userId} (Agente: ${userAgentId}, Rol: ${userRole}) para actualizar el requerimiento ${requerimientoId}.`);
                throw new HttpsError('permission-denied', 'No tienes permiso para actualizar este requerimiento.');
            }

            // 5. Verificar que el parte esté en estado 'open' o 'returned' para poder modificar el requerimiento
            if (reportData.status !== 'open' && reportData.status !== 'returned') {
                logger.warn(`Intento de actualizar requerimiento en un parte con estado no modificable: ${reportData.status}`);
                throw new HttpsError('failed-precondition', `No se puede actualizar un requerimiento de un parte en estado '${reportData.status}'.`);
            }

            // 6. Preparar los datos de actualización para el requerimiento
            const updatePayload = {
                status: newStatus,
                comment: comment || '', // Asegura que el comentario sea una cadena vacía si es null/undefined
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            if (newStatus === 'realizado') {
                updatePayload.isResolved = true; // Campo existente para compatibilidad
                updatePayload.resolvedAt = admin.firestore.FieldValue.serverTimestamp();
                if (geolocation) {
                    // Crea un GeoPoint de Firestore si hay datos de geolocalización válidos
                    updatePayload.resolvedLocation = new admin.firestore.GeoPoint(geolocation.latitude, geolocation.longitude);
                }
                updatePayload.resolvedBy = userId; // ID del usuario que lo resolvió
            } else { // Si el estado vuelve a 'pendiente'
                updatePayload.isResolved = false;
                // Eliminar campos relacionados con la resolución si se vuelve a pendiente
                updatePayload.resolvedAt = admin.firestore.FieldValue.delete();
                updatePayload.resolvedLocation = admin.firestore.FieldValue.delete();
                updatePayload.resolvedBy = admin.firestore.FieldValue.delete();
            }

            // 7. Ejecutar la actualización del requerimiento dentro de la transacción
            transaction.update(requerimientoRef, updatePayload);
            logger.info(`Requerimiento ${requerimientoId} actualizado a estado '${newStatus}'.`);

            // 8. Actualizar el campo 'updatedAt' del parte principal para reflejar el cambio
            transaction.update(reportRef, {
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            logger.info(`Parte ${reportId} updatedAt actualizado.`);
        });

        logger.info('Transacción de actualización de requerimiento completada con éxito.');
        return { success: true, message: 'Estado del requerimiento actualizado correctamente.' };

    } catch (error) {
        logger.error("Error en la Cloud Function 'updateRequerimientoStatus':", error);
        // Re-lanzar HttpsError si ya es una instancia de HttpsError
        if (error instanceof HttpsError) {
            throw error;
        }
        // Para cualquier otro error, lanzar un HttpsError genérico 'internal'
        throw new HttpsError('internal', 'Error al actualizar el requerimiento.', error.message);
    }
});

/**
 * Actualiza el objeto de resumen de actuaciones de un parte de servicio.
 * Requiere que el usuario sea uno de los agentes asignados.
 */
export const updateReportSummary = onCall({ region: 'us-central1' }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "El usuario debe estar autenticado.");
    }

    const { reportId, summaryData } = request.data;
    if (!reportId || typeof summaryData !== 'object') {
        throw new HttpsError("invalid-argument", "Se requiere un ID de parte y un objeto de resumen.");
    }

    const userAgentId = request.auth.token.agentId;
    const db = getDb();
    const reportRef = db.collection('serviceReports').doc(reportId);

    try {
        const reportDoc = await reportRef.get();
        if (!reportDoc.exists) {
            throw new HttpsError("not-found", "El parte de servicio no existe.");
        }

        const reportData = reportDoc.data();
        if (!reportData.assigned_agents || !reportData.assigned_agents.includes(userAgentId)) {
            throw new HttpsError("permission-denied", "No tienes permiso para modificar este parte.");
        }

        // Limpieza de datos: Asegurarse de que solo guardamos números
        const cleanSummary = {};
        for (const key in summaryData) {
            const value = Number(summaryData[key]);
            if (typeof value === 'number' && !isNaN(value) && value >= 0) {
                cleanSummary[key] = value;
            }
        }

        await reportRef.update({
            summary: cleanSummary,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });

        return { success: true, message: "Resumen guardado correctamente." };

    } catch (error) {
        logger.error(`Error al actualizar el resumen para el parte ${reportId}:`, error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", "Ocurrió un error al guardar el resumen.");
    }
});

// === FIN DE LA FUNCIÓN MODIFICADA =================================


// --- Cloud Functions (EXISTENTES) ---

/**
 * Añade un nuevo requerimiento a la subcolección de un parte de servicio.
 * Verifica que el usuario que lo añade esté asignado al parte.
 */
export const addRequerimiento = onCall({ region: 'us-central1' }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "El usuario debe estar autenticado.");
    }

    const { reportId, description } = request.data;
    if (!reportId || !description || description.trim() === '') {
        throw new HttpsError("invalid-argument", "Se requiere un ID del parte y una descripción válida.");
    }
    
    const userAgentId = request.auth.token.agentId;
    const db = getDb();
    const reportRef = db.collection('serviceReports').doc(reportId);
    
    try {
        // --- Verificación de Permisos ---
        const reportDoc = await reportRef.get();
        if (!reportDoc.exists) { 
            throw new HttpsError("not-found", "El parte de servicio no existe.");
        }
        const reportData = reportDoc.data();
        if (!reportData.assigned_agents || !reportData.assigned_agents.includes(userAgentId)) {
            throw new HttpsError("permission-denied", "No tienes permiso para añadir requerimientos a este parte.");
        }
        // --- Fin de la Verificación ---

        const newRequerimientoRef = reportRef.collection('requerimientos').doc();
        
        await newRequerimientoRef.set({
            description: description,
            isResolved: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: userAgentId,
        });

        logger.info(`Nuevo requerimiento ${newRequerimientoRef.id} añadido al parte ${reportId} por el agente ${userAgentId}`);
        return { success: true, id: newRequerimientoRef.id };

    } catch(error) {
        logger.error(`Error al añadir requerimiento al parte ${reportId}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "No se pudo añadir el requerimiento.");
    }
});

/**
 * Cambia el estado (resuelto/no resuelto) de un requerimiento específico.
 */
export const toggleRequerimientoStatus = onCall({ region: 'us-central1' }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "El usuario debe estar autenticado.");
    }
    
    const { reportId, requerimientoId, isResolved } = request.data;
    if (!reportId || !requerimientoId || typeof isResolved !== 'boolean') {
        throw new HttpsError("invalid-argument", "Faltan parámetros requeridos (reportId, requerimientoId, isResolved).");
    }

    const db = getDb();
    const requerimientoRef = db.collection('serviceReports').doc(reportId).collection('requerimientos').doc(requerimientoId);

    try {
        await requerimientoRef.update({
            isResolved: isResolved,
            resolvedAt: isResolved ? admin.firestore.FieldValue.serverTimestamp() : admin.firestore.FieldValue.delete()
        });
        
        logger.info(`Estado del requerimiento ${requerimientoId} cambiado a ${isResolved}`);
        return { success: true };

    } catch(error) {
        logger.error(`Error al cambiar estado del requerimiento ${requerimientoId}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "No se pudo actualizar el estado del requerimiento.");
    }
});

export const setCustomUserClaims = onDocumentUpdated({ document: "users/{userId}", region: 'us-central1' }, async (event) => {
    const afterData = event.data?.after.data();
    if (!afterData) return;
    const userRole = afterData.role || "guard";
    const agentId = String(afterData.agentId || "");
    try {
        await admin.auth().setCustomUserClaims(event.params.userId, { role: userRole, agentId });
    } catch (error) {
        logger.error(`Error al establecer claims para ${event.params.userId}:`, error);
    }
});

export const addAgentCallable = onCall({ region: 'us-central1' }, async (request) => {
    if (request.auth?.token?.role !== 'admin') throw new HttpsError("permission-denied", "Solo administradores.");
    const { id, name, active } = request.data;
    if (!name) throw new HttpsError("invalid-argument", "El nombre es requerido.");
    try {
        const agentRef = getDb().collection('agents').doc(String(id));
        if (! (await agentRef.get()).exists) throw new HttpsError("already-exists", `El ID ${id} ya existe.`); 
        await agentRef.set({ name, active, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        return { success: true, agentId: agentRef.id };
    } catch (error) {
        throw new HttpsError("internal", error.message);
    }
});

export const updateAgentCallable = onCall({ region: 'us-central1' }, async (request) => {
    if (request.auth?.token?.role !== 'admin') throw new HttpsError("permission-denied", "Solo administradores.");
    const { agentId, updateData } = request.data;
    if (!agentId || !updateData) throw new HttpsError("invalid-argument", "Faltan datos.");
    try {
        await getDb().collection('agents').doc(String(agentId)).update(updateData);
        return { success: true };
    } catch (error) {
        throw new HttpsError("internal", error.message);
    }
});

export const deleteAgentCallable = onCall({ region: 'us-central1' }, async (request) => {
    if (request.auth?.token?.role !== 'admin') throw new HttpsError("permission-denied", "Solo administradores.");
    const { agentId } = request.data;
    if (!agentId) throw new HttpsError("invalid-argument", "Falta el ID del agente.");
    try {
        await getDb().collection('agents').doc(String(agentId)).delete();
        return { success: true };
    } /* catch (error) {
        // No volver a lanzar HttpsError si ya se ha lanzado uno, o se ocultaría el mensaje original.
        // Solo lanzar un HttpsError si es un error inesperado.
        throw new HttpsError("internal", error.message);
    } */
    catch (error) { // Corrección para evitar lanzar HttpsError de Firebase si el error ya es HttpsError
        logger.error("Error al eliminar agente:", error);
        if (error instanceof HttpsError) {
            throw error; // Re-lanzar el HttpsError original
        }
        throw new HttpsError("internal", "Ocurrió un error en el servidor al intentar eliminar el agente.");
    }
});

export const setSupervisorRole = onCall({ region: 'us-central1' }, async (request) => {
    if (request.auth?.token?.role !== 'admin') {
        throw new HttpsError('permission-denied', 'Solo un administrador puede asignar roles.');
    }
    const email = request.data.email;
    if (!email) {
        throw new HttpsError('invalid-argument', 'El email es requerido.');
    }
    try {
        const user = await admin.auth().getUserByEmail(email);
        await admin.auth().setCustomUserClaims(user.uid, { role: 'supervisor' });
        logger.info(`Rol 'supervisor' asignado a ${email} (UID: ${user.uid}) por el admin ${request.auth.uid}`);
        return { result: `Rol 'supervisor' asignado correctamente a ${email}` };
    } catch (error) {
        logger.error("Error al asignar rol de supervisor:", error);
        if (error.code === 'auth/user-not-found') {
             throw new HttpsError('not-found', 'No se encontró ningún usuario con ese email.');
        }
        throw new HttpsError('internal', 'Ocurrió un error interno al intentar asignar el rol.');
    }
});

export const initializeMonth = onCall({ region: 'us-central1' }, async (request) => {
    if (request.auth?.token?.role !== 'admin') throw new HttpsError("permission-denied", "Solo administradores.");
    const { monthId, year, monthIndex, peopleToInitialize } = request.data;
    if (!monthId || !Array.isArray(peopleToInitialize)) throw new HttpsError("invalid-argument", "Faltan datos.");
    const scheduleRef = getDb().collection('schedules').doc(monthId);
    return getDb().runTransaction(async (transaction) => {
        // Corregida la condición: Comprobamos si el documento NO EXISTE para poder crearlo
        if ((await transaction.get(scheduleRef)).exists) {
            logger.info(`Documento de cuadrante ${monthId} ya existe. No se inicializará de nuevo.`);
            return { status: "already_exists", message: "El mes ya ha sido inicializado." };
        } 
        
        const firstDay = toZonedTime(new Date(year, monthIndex, 1), MADRID_TIMEZONE);
        const startOffset = (firstDay.getDay() + 6) % 7; // Lunes = 0, Domingo = 6
        let currentDay = addDays(firstDay, -startOffset); 
        const initialWeeksData = {};

        for (let w = 0; w < 6; w++) { // Un mes puede extenderse en 6 semanas
            const weekDays = {};
            for (let d = 0; d < 7; d++) { // 7 días a la semana
                weekDays[d] = {
                    date: getDateStringInMadridTimezone(currentDay),
                    name: format(currentDay, 'EEE', { locale: es }), // Ej. 'lun', 'mar'
                    number: format(currentDay, 'd'), // Ej. '1', '15'
                    isCurrentMonth: currentDay.getMonth() === monthIndex,
                    shifts: Object.fromEntries(peopleToInitialize.map(id => [`agent_${id}`, { agentId: String(id), shiftType: 'Libre' }]))
                };
                currentDay = addDays(currentDay, 1);
            }
            initialWeeksData[`week${w}`] = { days: weekDays };
        }
        
        const agentDocs = await getDb().collection('agents').where(admin.firestore.FieldPath.documentId(), 'in', peopleToInitialize.map(String)).get();
        const peopleMap = Object.fromEntries(agentDocs.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() }]));

        transaction.set(scheduleRef, { 
            weeks: initialWeeksData, 
            people: peopleMap, 
            createdAt: admin.firestore.FieldValue.serverTimestamp() 
        });

        return { status: "success", message: "Mes inicializado correctamente." };
    });
});

export const updateShiftV2 = onCall({ region: 'us-central1' }, async (request) => {
    if (request.auth?.token?.role !== 'admin') throw new HttpsError("permission-denied", "Solo administradores.");
    const { monthId, weekKey, dayKey, agentId, newShiftType } = request.data;
    if (!monthId || !weekKey || !dayKey || !agentId) throw new HttpsError("invalid-argument", "Faltan datos.");
    try {
        const scheduleRef = getDb().collection('schedules').doc(monthId);
        const dayShiftsPath = `weeks.${weekKey}.days.${dayKey}.shifts`;
        const scheduleDoc = await scheduleRef.get();
        if (!scheduleDoc.exists) { 
            logger.warn(`Documento de cuadrante ${monthId} no existe al intentar actualizar turno.`);
            return;
        }
        const shifts = scheduleDoc.data().weeks[weekKey].days[dayKey].shifts || {};
        const shiftKey = Object.keys(shifts).find(k => String(shifts[k].agentId) === String(agentId)) || `agent_${agentId}`;
        if (newShiftType && newShiftType !== '-') {
            await scheduleRef.update({ [`${dayShiftsPath}.${shiftKey}`]: { agentId: String(agentId), shiftType: newShiftType } });
        } else {
            await scheduleRef.update({ [`${dayShiftsPath}.${shiftKey}`]: admin.firestore.FieldValue.delete() });
        }
        return { success: true };
    } catch (error) {
        throw new HttpsError("internal", error.message);
    }
});

export const updateSolicitudStatus = onCall({ region: 'us-central1' }, async (request) => {
    if (request.auth?.token?.role !== 'admin') throw new HttpsError("permission-denied", "Solo administradores.");
    const { solicitudId, newStatus } = request.data;
    try {
        await getDb().collection('solicitudes').doc(solicitudId).update({ status: newStatus });
        if (newStatus === 'Aprobado') await updateScheduleForPermissionRequest(solicitudId);
        return { success: true };
    } catch (error) {
        throw new HttpsError("internal", error.message);
    }
});

export const addShiftChangeRequest = onCall({ region: 'us-central1' }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticación requerida.");
    const { requesterAgentId, targetAgentId, requesterShiftDate, targetShiftDate } = request.data;
    if (!requesterAgentId || !targetAgentId || !requesterShiftDate || !targetShiftDate) throw new HttpsError("invalid-argument", "Faltan datos.");
    try {
        await getDb().collection("solicitudes_cambio_turno").add({
            ...request.data,
            requesterShiftDate: admin.firestore.Timestamp.fromDate(parseISO(requesterShiftDate)),
            targetShiftDate: admin.firestore.Timestamp.fromDate(parseISO(targetShiftDate)),
            status: "Pendiente_Target",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true };
    } catch (error) {
        throw new HttpsError("internal", error.message);
    }
});

export const respondToShiftChangeRequest = onCall({ region: 'us-central1' }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticación requerida.");
    const { changeId, newStatus } = request.data;
    const requestRef = getDb().collection('solicitudes_cambio_turno').doc(changeId);
    const requestDoc = await requestRef.get();
    if (!requestDoc.exists) throw new HttpsError("not-found", "Solicitud no encontrada."); 
    await requestRef.update({ status: newStatus, adminNotified: newStatus.startsWith('Aprobado') ? false : admin.firestore.FieldValue.delete() });
    if (newStatus === 'Aprobado_Ambos') {
        const d = requestDoc.data();
        await findAndReplaceShiftInSchedule(d.requesterShiftDate.toDate(), d.requesterAgentId, d.targetShiftType);
        await findAndReplaceShiftInSchedule(d.targetShiftDate.toDate(), d.targetAgentId, d.requesterShiftType);
    }
    return { success: true };
});

export const getShiftChangeRequestsCallable = onCall({ region: 'us-central1' }, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Autenticación requerida.');
    const { status, agentId } = request.data;
    const ref = getDb().collection("solicitudes_cambio_turno");
    let queries = [];
    if (request.auth.token.role === 'admin' && agentId && agentId !== 'all') {
        queries.push(ref.where('requesterAgentId', '==', String(agentId)).get());
        queries.push(ref.where('targetAgentId', '==', String(agentId)).get());
    } else if (request.auth.token.role === 'admin') {
        queries.push(ref.orderBy('createdAt', 'desc').get());
    } else {
        queries.push(ref.where('requesterAgentId', '==', String(request.auth.token.agentId)).get());
        queries.push(ref.where('targetAgentId', '==', String(request.auth.token.agentId)).get());
    }
    const snapshots = await Promise.all(queries);
    const results = Array.from(new Map(snapshots.flatMap(s => s.docs).map(d => [d.id, { id: d.id, ...d.data() }])).values());
    const filteredResults = status ? results.filter(r => r.status === status) : results;
    return { success: true, data: filteredResults.map(d => ({ ...d, createdAt: d.createdAt.toDate().toISOString(), requesterShiftDate: d.requesterShiftDate.toDate().toISOString(), targetShiftDate: d.targetShiftDate.toDate().toISOString() })) };
});

export const markShiftChangeNotificationAsSeen = onCall({ region: 'us-central1' }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticación requerida.");
    await getDb().collection('solicitudes_cambio_turno').doc(request.data.changeId).update({ adminNotified: true });
    return { success: true };
});

export const addMarkedDateCallable = onCall({ region: 'us-central1' }, async (request) => {
    if (request.auth?.token?.role !== 'admin') throw new HttpsError("permission-denied", "Solo administradores.");
    const { date, type, title } = request.data;
    if (!date || !type || !title) throw new HttpsError("invalid-argument", "Faltan datos.");
    await getDb().collection('markedDates').add({ ...request.data, date: admin.firestore.Timestamp.fromDate(parseISO(date)) });
    return { success: true };
});

export const migrateAgentIdsInSolicitudes = onCall({ region: 'us-central1' }, async (request) => {
    if (request.auth?.token?.role !== "admin") throw new HttpsError("permission-denied", "Solo para administradores.");
    const batch = getDb().batch();
    const solicitudesRef = getDb().collection("solicitudes");
    let processed = 0, updated = 0;
    try {
        const snapshot = await solicitudesRef.get();
        snapshot.forEach((doc) => {
            processed++;
            if (doc.data().agentId && typeof doc.data().agentId === "number") {
                batch.update(doc.ref, { agentId: String(doc.data().agentId) });
                updated++;
            }
        });
        await batch.commit();
        return { success: true, message: "Migración completada.", processed, updated };
    } catch (error) {
        logger.error("Error en migración:", error);
        throw new HttpsError("internal", error.message);
    }
});

// --- FUNCIÓN QUE USA PDFKIT (Importación dinámica) ---
export const generatePdfReport = onCall({ region: 'us-central1' }, async (request) => {
   // [SOLUCIÓN] Importación dinámica de PDFDocument DENTRO de la función
   const PDFDocument = (await import('pdfkit')).default;

   if (!request.auth) throw new HttpsError('unauthenticated', 'Autenticación requerida.');
   const agentId = request.data.agentId;
   if (!agentId) throw new HttpsError('invalid-argument', 'Falta ID del agente.');
   try {
       // Instancia PDFDocument solo cuando la función se ejecuta
       const doc = new PDFDocument();
       // ... el resto de tu lógica para generar el PDF
       const pdfBuffer = Buffer.from("PDF de ejemplo para un agente."); // Placeholder
       return { success: true, pdfBase64: pdfBuffer.toString('base64') };
   } catch (error) {
       logger.error('Error en generatePdfReport:', error);
       throw new HttpsError('internal', error.message);
   }
});


export const generarInformeManualPDF = onCall({ region: 'us-central1', cors: true }, async (request) => {
    // [SOLUCIÓN] Importación dinámica de PDFDocument DENTRO de la función
    const PDFDocument = (await import('pdfkit')).default;

    if (!request.auth) throw new HttpsError('unauthenticated', 'Autenticación requerida.');
    
    const userRole = request.auth.token.role || 'guard';

    const { startDate, endDate, agentIds, allAgents } = request.data;
    const finalAgentIds = userRole === 'admin' ? (allAgents ? (await getDb().collection('agents').get()).docs.map(doc => doc.id) : agentIds) : [request.auth.token.agentId]; 
    
    if (!finalAgentIds?.length) throw new HttpsError("invalid-argument", "No se especificaron agentes."); 
    
    const servicesSnap = await getDb().collection("extraordinaryServices").where("agentId", "in", finalAgentIds).where("date", ">=", parseISO(startDate)).where("date", "<=", parseISO(endDate)).get();
    if(servicesSnap.empty) return { pdfBase64: null, message: 'No se encontraron servicios.' };
    
    const agentsMap = new Map((await getDb().collection("agents").get()).docs.map(doc => [doc.id, doc.data().name]));
    const servicesByAgent = {};
    servicesSnap.forEach(doc => {
        const s = doc.data();
        if (!servicesByAgent[s.agentId]) servicesByAgent[s.agentId] = { name: agentsMap.get(s.agentId), services: [] };
        servicesByAgent[s.agentId].services.push(s);
    });

    const pdfBuffer = await generateReportPdfContent({ servicesByAgent, periodStartDateObj: parseISO(startDate), periodEndDateObj: parseISO(endDate) }, await downloadLogoFromStorage(), userRole);
    
    return { pdfBase64: pdfBuffer.toString('base64'), message: 'Informe generado.' };
});

/**
 * Genera el informe mensual de servicios extraordinarios en PDF y lo envía
 * creando un documento en la colección 'mail' para la extensión Trigger Email.
 */
export const generarYEnviarInformeServiciosExtra = onSchedule({ 
    region: 'us-central1', 
    schedule: '0 10 1 * *', 
    timeZone: 'Europe/Madrid',
}, async () => {
    logger.info("Iniciando la generación del informe mensual de servicios extraordinarios.");
    const db = getDb();

    try {
        const start = startOfMonth(subMonths(new Date(), 1));
        const end = endOfMonth(subMonths(new Date(), 1));
        const servicesSnap = await db.collection("extraordinaryServices").where("date", ">=", start).where("date", "<=", end).get();

        if (servicesSnap.empty) {
            logger.info("No hay servicios extraordinarios para el mes anterior. No se enviará informe.");
            return null;
        }
        
        const agentsMap = new Map((await db.collection("agents").get()).docs.map(doc => [doc.id, doc.data().name]));
        const servicesByAgent = {};
        servicesSnap.forEach(doc => {
            const s = doc.data();
            if (!servicesByAgent[s.agentId]) servicesByAgent[s.agentId] = { name: agentsMap.get(s.agentId), services: [] };
            servicesByAgent[s.agentId].services.push(s);
        });

        // La generación del PDF no cambia
        const pdfBuffer = await generateReportPdfContent({ servicesByAgent, periodStartDateObj: start, periodEndDateObj: end }, await downloadLogoFromStorage());
        
        const monthYear = format(start, 'MMMM yyyy', { locale: es });
        const supervisorEmailsDoc = await db.collection('configuration').doc('notifications').get();
        const emails = supervisorEmailsDoc.data()?.supervisorEmails || ["camprub1974@gmail.com"]; // Fallback por si no está configurado

        // ✅ LÓGICA MODIFICADA: Creamos el documento para la extensión Trigger Email
        await db.collection("mail").add({
            to: emails, // La extensión permite enviar a un array
            message: {
              subject: `Informe de Servicios Extraordinarios - ${monthYear}`,
              html: `<p>Adjunto se encuentra el informe mensual de servicios extraordinarios para ${monthYear}.</p><p>Este correo ha sido generado automáticamente.</p>`,
              attachments: [
                {
                    filename: `informe_servicios_extra_${monthYear}.pdf`,
                    content: pdfBuffer.toString('base64'), // El PDF se envía como base64
                    encoding: 'base64',
                },
              ],
            },
        });

        logger.info(`Documento de correo para el informe mensual de ${monthYear} creado con éxito.`);
        return null;

    } catch (error) {
        logger.error("Error al generar o enviar el informe mensual de servicios extraordinarios:", error);
        return null;
    }
});

export const getAdminDashboardStats = onCall({ region: 'us-central1' }, async (request) => {
    if (request.auth?.token?.role !== 'admin') {
        throw new HttpsError("permission-denied", "Acceso denegado.");
    }

    const { startDate, endDate } = request.data;
    if (!startDate || !endDate) {
        throw new HttpsError("invalid-argument", "Se requieren fechas de inicio y fin.");
    }

    const db = getDb();
    const reportsRef = db.collection('serviceReports');
    
    // Ajustado para el SDK de Admin: usar Timestamp.fromDate para las fechas
    const querySnapshot = await reportsRef
        .where('created_at', '>=', admin.firestore.Timestamp.fromDate(new Date(startDate)))
        .where('created_at', '<=', admin.firestore.Timestamp.fromDate(new Date(endDate)))
        .get();

    let stats = {
        totalReports: querySnapshot.size,
        requerimientosRecibidos: 0,
        requerimientosResueltos: 0,
        actuaciones: {},
        // ✅ AÑADIMOS LAS NUEVAS LISTAS
        pendingRequerimientos: [],
        resolvedRequerimientos: []
    };

    for (const reportDoc of querySnapshot.docs) {
        const reportData = reportDoc.data();
        
        // 1. Sumamos las actuaciones del campo "summary"
        if (reportData.summary) {
            for (const [key, value] of Object.entries(reportData.summary)) {
                stats.actuaciones[key] = (stats.actuaciones[key] || 0) + value;
            }
        }

        // 2. Contamos los requerimientos de la subcolección y los clasificamos
        const reqsRef = reportDoc.ref.collection('requerimientos');
        const reqsSnap = await reqsRef.get(); 
        
        reqsSnap.forEach(reqDoc => {
            stats.requerimientosRecibidos++;
            const reqData = {
                id: reqDoc.id,
                reportId: reportDoc.id, // ID del parte al que pertenece
                reportTitle: reportData.order_title || 'N/A', // Asumiendo que order_title está en reportData
                description: reqDoc.data().description,
                isResolved: reqDoc.data().isResolved,
                createdAt: reqDoc.data().createdAt ? reqDoc.data().createdAt.toDate().toISOString() : null,
                resolvedAt: reqDoc.data().resolvedAt ? reqDoc.data().resolvedAt.toDate().toISOString() : null
            };

            if (reqData.isResolved) {
                stats.requerimientosResueltos++;
                stats.resolvedRequerimientos.push(reqData); 
            } else {
                stats.pendingRequerimientos.push(reqData); 
            }
        });
    }
    
    return { success: true, stats };
});

/**
 * Se activa cuando un parte de servicio se actualiza. Si el estado cambia a 'pending_review',
 * recopila los datos y CREA UN DOCUMENTO en la colección 'mail' para la extensión
 * "Trigger Email".
 */
export const onReportSubmittedForReview = onDocumentUpdated("serviceReports/{reportId}", async (event) => {
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();

    // Nos aseguramos de que la función solo se ejecute cuando el estado cambia A 'pending_review'
    if (beforeData.status === afterData.status || afterData.status !== 'pending_review') {
        logger.info(`El estado del parte ${event.params.reportId} no cambió a 'pending_review'. No se creará documento de correo.`);
        return null;
    }

    logger.info(`El parte ${event.params.reportId} ha sido enviado a revisión. Creando documento para Trigger Email.`);
    const db = getDb();

    try {
        // 1. Obtener la lista de correos de los supervisores desde la configuración
        const configDoc = await db.collection('configuration').doc('notifications').get();
        const supervisorEmails = configDoc.data()?.supervisorEmails;

        if (!supervisorEmails || supervisorEmails.length === 0) {
            logger.warn("No hay correos de supervisores configurados en 'configuration/notifications'. No se puede crear el correo.");
            return null;
        }

        // 2. Recopilar todos los datos necesarios para el correo
        const orderDoc = await db.collection('serviceOrders').doc(afterData.order_id).get();
        const orderData = orderDoc.data();

        const entriesSnap = await db.collection('serviceReports').doc(event.params.reportId).collection('reportEntries').orderBy('entry_time').get();
        const entries = entriesSnap.docs.map(doc => doc.data());
        
        // 3. Formatear el cuerpo del correo en HTML
        let emailBody = `
            <h1>Revisión de Parte de Servicio</h1>
            <p>El siguiente parte de servicio ha sido completado y requiere su validación.</p>
            <h2>Detalles de la Orden</h2>
            <ul>
                <li><strong>Nº Registro:</strong> ${orderData.order_reg_number || 'N/A'}</li>
                <li><strong>Título:</strong> ${orderData.title}</li>
                <li><strong>Fecha del Servicio:</strong> ${format(orderData.service_date.toDate(), 'dd/MM/yyyy', { locale: es })}</li>
                <li><strong>Turno:</strong> ${orderData.service_shift}</li>
            </ul>
            <h2>Novedades Registradas</h2>
        `;

        if (entries.length > 0) {
            emailBody += '<table border="1" cellpadding="5" style="border-collapse: collapse; width: 100%;">';
            emailBody += '<thead><tr><th>Hora</th><th>Agente</th><th>Descripción</th></tr></thead><tbody>';
            entries.forEach(entry => {
                emailBody += `<tr>
                    <td>${format(entry.entry_time.toDate(), 'HH:mm:ss', { locale: es })}</td>
                    <td>${entry.created_by_agent_id}</td>
                    <td>${entry.description.replace(/\n/g, "<br>")}</td>
                </tr>`;
            });
            emailBody += '</tbody></table>';
        } else {
            emailBody += '<p>No se registraron novedades.</p>';
        }

        // 4. ✅ Crear el documento en la colección 'mail' que la extensión está escuchando
        await db.collection("mail").add({
            to: supervisorEmails, // La extensión permite enviar a un array
            message: {
              subject: `Nuevo Parte de Servicio para Revisar: ${orderData.title}`,
              html: emailBody,
            },
        });

        logger.info(`Documento de correo para el parte ${event.params.reportId} creado con éxito.`);
        return null;

    } catch (error) {
        logger.error(`Error al crear el documento de correo para el parte ${event.params.reportId}:`, error);
        return null;
    }
});

// =========================================================================================
// === ✅ FASE A: NUEVAS FUNCIONES PARA EL MÓDULO DE REGISTRO ELECTRÓNICO ===
// =========================================================================================

/**
 * Genera el siguiente número de registro correlativo para un tipo de documento específico.
 * El formato es AÑO-XXXX (ej. 2025-0001).
 * @param {string} documentType - El nombre de la colección (ej. 'informes', 'actas').
 */
export const generateNextRegistrationNumber = onCall({ region: 'us-central1' }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "El usuario debe estar autenticado.");
    }
    const { documentType } = request.data;
    if (!documentType) {
        throw new HttpsError("invalid-argument", "Se requiere el tipo de documento.");
    }

    const db = getDb();
    const collectionRef = db.collection(documentType);
    const year = new Date().getFullYear();
    const prefix = `${year}-`;

    // Consulta para encontrar el último registro del año actual para este tipo de documento
    const q = collectionRef
        .where('registration_number', '>=', `${prefix}0000`)
        .where('registration_number', '<=', `${prefix}9999`)
        .orderBy('registration_number', 'desc')
        .limit(1);
    
    try {
        const querySnapshot = await q.get();
        let nextNumber = 1;

        if (!querySnapshot.empty) {
            const lastDoc = querySnapshot.docs[0].data();
            const lastRegNumber = lastDoc.registration_number;
            const lastSequential = parseInt(lastRegNumber.split('-')[1], 10);
            nextNumber = lastSequential + 1;
        }

        const formattedNumber = `${year}-${String(nextNumber).padStart(4, '0')}`;
        return { success: true, registration_number: formattedNumber };
    } catch (error) {
        logger.error(`Error al generar el número de registro para '${documentType}':`, error);
        throw new HttpsError("internal", "No se pudo generar el número de registro.");
    }
});

/**
 * Crea un nuevo documento de registro en la colección correspondiente.
 * @param {string} documentType - La colección donde se guardará (ej. 'informes').
 * @param {object} data - Los datos del documento, incluyendo el 'subject' y los 'details'.
 */
export const createRegistro = onCall({ 
    region: 'us-central1',
    memory: '1GB',
    timeoutSeconds: 300 
}, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "El usuario debe estar autenticado.");
    
    const { documentType, data: registroData } = request.data;
    if (!documentType || !registroData) throw new HttpsError("invalid-argument", "Faltan datos requeridos.");

    const cssTemplate = `
        html, body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            font-size: 11px;
            -webkit-print-color-adjust: exact;
        }
        .page {
            padding: 1.5cm;
            position: relative;
            min-height: 25cm;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .header img { width: 60px; }
        .header-info { text-align: center; font-size: 14px; font-weight: bold; }
        .content-header { margin-top: 1.5cm; border-top: 1px solid black; border-bottom: 1px solid black; padding: 10px 0; }
        .title { text-align: center; font-size: 16px; margin: 1.5cm 0; font-weight: bold; }
        .content-body p { text-align: justify; line-height: 1.6; margin-bottom: 1em; }
        .report-body-content { margin-top: 20px; white-space: pre-wrap; text-align: justify; line-height: 1.6; }
        .field { font-weight: bold; }
        .conste-text { margin-top: 30px; }
        .signature { margin-top: 40px; }
        .footer {
            position: absolute;
            bottom: 1cm;
            left: 1.5cm;
            right: 1.5cm;
            text-align: center;
            font-size: 10px;
        }
        .footer hr { margin-top: 10px; border: 0; border-top: 1px solid #000; }
    `;

    const db = getDb();
    const storage = admin.storage();
    const bucket = storage.bucket();
    const year = new Date().getFullYear();
    const agentId = request.auth.token.agentId;
    
    try {
        const registration_number = await db.runTransaction(async t => {
            const q = db.collection('registros').where('documentType', '==', documentType).where('registration_number', '>=', `${year}-0000`).orderBy('registration_number', 'desc').limit(1);
            const snapshot = await t.get(q);
            let nextNum = 1; if (!snapshot.empty) { const lastNum = parseInt(snapshot.docs[0].data().registration_number.split('-')[1]); nextNum = lastNum + 1; }
            return `${year}-${String(nextNum).padStart(4, '0')}`;
        });

        const newDocument = {
            ...registroData, registration_number, documentType, status: 'activo',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdByAgentId: agentId, createdByUid: request.auth.uid, pdfUrl: ''
        };
        const docRef = await db.collection('registros').add(newDocument);

        const templateSnap = await db.collection('documentTemplates').doc(registroData.templateUsed).get();
        if (!templateSnap.exists) throw new HttpsError("not-found", "La plantilla no fue encontrada.");
        
        let bodyHtml = templateSnap.data().content;
        
        const unescapeHtml = (safe) => safe.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#039;/g, "'");
        bodyHtml = unescapeHtml(bodyHtml);
        
        // ✅ INICIO DE LA LÓGICA DE REEMPLAZO CORREGIDA
        
        // 1. Reemplazamos los placeholders automáticos
        const fechaActual = format(new Date(), "dd 'de' MMMM 'del' yyyy", { locale: es });
        const agentesFirmantes = (registroData.details.signingAgents || []).join(', ');
        
        // Usamos el número de registro generado por la transacción, no el que viene del cliente.
        bodyHtml = bodyHtml.replace(/{{numero_registro}}/g, registration_number);
        bodyHtml = bodyHtml.replace(/{{fecha}}/g, fechaActual); // Asumiendo que quieres la fecha actual
        bodyHtml = bodyHtml.replace(/{{AGENTES_FIRMANTES}}/g, agentesFirmantes);
        
        // 2. Reemplazamos el resto de placeholders que vienen del formulario
        for (const key in registroData.details) {
            // Saltamos los campos que ya hemos manejado o no son placeholders directos
            if (Object.prototype.hasOwnProperty.call(registroData.details, key) && !['numero_registro', 'fecha', 'signingAgents'].includes(key)) {
                const value = String(registroData.details[key] || '').replace(/\n/g, '<br>');
                const regex = new RegExp(`{{${key}}}`, 'g');
                bodyHtml = bodyHtml.replace(regex, value);
            }
        }
        // ✅ FIN DE LA LÓGICA DE REEMPLAZO CORREGIDA

        const finalHtml = `<html><head><style>${cssTemplate}</style></head><body><div class="page">${bodyHtml}</div></body></html>`;

        const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
        const page = await browser.newPage();
        
        await page.setContent(finalHtml, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();

        const filePath = `registros/${documentType}/${registration_number}.pdf`;
        const file = bucket.file(filePath);
        const downloadFileName = `croquis_${sketchId}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;

        await file.save(pdfBuffer, {
            metadata: { 
                contentType: 'application/pdf',
        // ✅ AÑADE ESTA LÍNEA:
                contentDisposition: `attachment; filename="${downloadFileName}"`
             }
        });

        const pdfUrl = await file.getSignedUrl({ action: 'read', expires: '03-09-2491' });
        await docRef.update({ pdfUrl: pdfUrl[0] });

        return { success: true, id: docRef.id, registration_number };

    } catch (error) {
        console.error(`Error al crear el registro y PDF:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "No se pudo crear el documento de registro.");
    }
});

/**
 * Actualiza un documento de registro existente.
 * Permite la edición a administradores o al agente que creó el registro.
 */
export const updateRegistro = onCall({ region: 'us-central1' }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "El usuario debe estar autenticado.");
    }
    const { recordId, updateData } = request.data;
    if (!recordId || !updateData) {
        throw new HttpsError("invalid-argument", "Faltan el ID del registro o los datos para actualizar.");
    }

    const db = getDb();
    const recordRef = db.collection('registros').doc(recordId);
    
    try {
        const docSnap = await recordRef.get();
        if (!docSnap.exists) {
            throw new HttpsError("not-found", "El registro no fue encontrado.");
        }

        const record = docSnap.data();
        const userRole = request.auth.token.role;
        const userAgentId = request.auth.token.agentId;

        // Comprobación de permisos: O eres admin, o eres el dueño del registro.
        if (userRole !== 'admin' && record.createdByAgentId !== userAgentId) {
            throw new HttpsError("permission-denied", "No tienes permiso para editar este registro.");
        }

        // Añadimos campos de auditoría
        const finalUpdateData = {
            ...updateData,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedByAgentId: userAgentId,
        };

        await recordRef.update(finalUpdateData);
        logger.info(`Registro ${recordId} actualizado por agente ${userAgentId}.`);
        return { success: true, id: recordId };

    } catch (error) {
        logger.error(`Error al actualizar el registro ${recordId}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "No se pudo actualizar el documento de registro.");
    }
});

/**
 * Realiza una eliminación suave (soft delete) de un registro.
 * En lugar de borrarlo, lo actualiza con un estado 'eliminado' y un motivo.
 * Acción restringida solo a administradores.
 */
export const markRegistroAsDeleted = onCall({ region: 'us-central1' }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "El usuario debe estar autenticado.");
    }
    const { recordId, reason } = request.data;
    if (!recordId || !reason) {
        throw new HttpsError("invalid-argument", "Se requiere el ID del registro y un motivo para la eliminación.");
    }

    const userRole = request.auth.token.role;
    const userAgentId = request.auth.token.agentId;

    // Comprobación de permisos estricta: Solo admins pueden eliminar.
    if (userRole !== 'admin') {
        throw new HttpsError("permission-denied", "No tienes permiso para eliminar registros.");
    }

    const db = getDb();
    const recordRef = db.collection('registros').doc(recordId);

    try {
        const updatePayload = {
            status: 'eliminado',
            deletedAt: admin.firestore.FieldValue.serverTimestamp(),
            deletedByAgentId: userAgentId,
            deletionReason: reason
        };

        await recordRef.update(updatePayload);
        
        logger.warn(`Registro ${recordId} marcado como eliminado por admin ${userAgentId}. Motivo: ${reason}`);
        return { success: true };
    } catch (error) {
        logger.error(`Error al marcar como eliminado el registro ${recordId}:`, error);
        throw new HttpsError("internal", "No se pudo actualizar el estado del registro.");
    }
});

/**
 * Crea una nueva plantilla de documento en la colección 'documentTemplates'.
 * Solo para administradores.
 */
export const createDocumentTemplate = onCall({ region: 'us-central1' }, async (request) => {
    if (!request.auth || request.auth.token.role !== 'admin') {
        throw new HttpsError("permission-denied", "Solo los administradores pueden crear plantillas.");
    }
    
    const templateData = request.data;
    if (!templateData || !templateData.templateName || !templateData.content) {
        throw new HttpsError("invalid-argument", "Faltan datos requeridos para la plantilla.");
    }

    const db = getDb();
    try {
        const newTemplate = {
            ...templateData,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdByAgentId: request.auth.token.agentId,
        };
        const docRef = await db.collection('documentTemplates').add(newTemplate);
        logger.info(`Nueva plantilla creada por ${request.auth.token.agentId} con ID: ${docRef.id}`);
        return { success: true, id: docRef.id };
    } catch (error) {
        logger.error("Error al crear la plantilla:", error);
        throw new HttpsError("internal", "No se pudo crear la plantilla.");
    }
});

/**
 * Actualiza una plantilla de documento existente.
 * Solo para administradores.
 */
export const updateDocumentTemplate = onCall({ region: 'us-central1' }, async (request) => {
    if (!request.auth || request.auth.token.role !== 'admin') {
        throw new HttpsError("permission-denied", "Solo los administradores pueden editar plantillas.");
    }

    const { templateId, updateData } = request.data;
    if (!templateId || !updateData) {
        throw new HttpsError("invalid-argument", "Faltan el ID o los datos de la plantilla.");
    }

    const db = getDb();
    const templateRef = db.collection('documentTemplates').doc(templateId);

    try {
        const finalUpdateData = {
            ...updateData,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedByAgentId: request.auth.token.agentId,
        };
        await templateRef.update(finalUpdateData);
        logger.info(`Plantilla ${templateId} actualizada por ${request.auth.token.agentId}`);
        return { success: true, id: templateId };
    } catch (error) {
        logger.error(`Error al actualizar la plantilla ${templateId}:`, error);
        throw new HttpsError("internal", "No se pudo actualizar la plantilla.");
    }
});

/**
 * Actualiza los datos de un registro de croquis existente.
 * Solo el creador original o un administrador pueden editar.
 */
export const updateSketch = onCall({ 
    region: 'us-central1' 
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "El usuario debe estar autenticado.");
    }
    
    const { sketchId, updateData } = request.data;
    if (!sketchId || !updateData) {
        throw new HttpsError("invalid-argument", "Faltan el ID del croquis o los datos para actualizar.");
    }

    const db = getDb();
    const sketchRef = db.collection('sketches').doc(sketchId);
    
    try {
        const docSnap = await sketchRef.get();
        if (!docSnap.exists) {
            throw new HttpsError("not-found", "El croquis no fue encontrado.");
        }

        const sketch = docSnap.data();
        const userRole = request.auth.token.role;
        const userUid = request.auth.uid;

        // Comprobación de permisos: O eres admin, o eres el dueño del registro.
        if (userRole !== 'admin' && sketch.createdByUid !== userUid) {
            throw new HttpsError("permission-denied", "No tienes permiso para editar este croquis.");
        }

        // --- ✅ INICIO DE LA CORRECCIÓN ---
        
        // Copiamos los datos para poder modificarlos de forma segura.
        const finalUpdateData = { ...updateData };

        // Si 'fechaSuceso' viene como texto (string), la convertimos a un objeto Date.
        // El SDK de Admin de Firestore se encargará de convertir el objeto Date a Timestamp al guardar.
        if (finalUpdateData.fechaSuceso && typeof finalUpdateData.fechaSuceso === 'string') {
            finalUpdateData.fechaSuceso = new Date(finalUpdateData.fechaSuceso);
        }
        
        // Añadimos los campos de auditoría.
        finalUpdateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        finalUpdateData.updatedByUid = userUid;
        
        // --- FIN DE LA CORRECCIÓN ---

        await sketchRef.update(finalUpdateData);
        return { success: true, id: sketchId };

    } catch (error) {
        console.error(`Error al actualizar el croquis ${sketchId}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "No se pudo actualizar el croquis.");
    }
});

export const generateSketchPdf = onCall({
    region: 'us-central1',
    memory: '1GB',
    timeoutSeconds: 120
}, async (request) => {
    // 1. --- VERIFICACIÓN DE PERMISOS Y DATOS DE ENTRADA ---
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "El usuario debe estar autenticado para generar el PDF.");
    }
    const { sketchId } = request.data;
    if (!sketchId) {
        throw new HttpsError("invalid-argument", "Falta el ID del croquis (sketchId) en la solicitud.");
    }

    logger.info(`Iniciando generación de PDF para el croquis: ${sketchId}`);
    const db = getDb();

    // 2. --- OBTENCIÓN DE DATOS DEL CROQUIS ---
    const sketchDoc = await db.collection('sketches').doc(sketchId).get();
    if (!sketchDoc.exists) {
        throw new HttpsError("not-found", "El croquis solicitado no fue encontrado en la base de datos.");
    }
    const sketchData = sketchDoc.data();

    // 3. --- PREPARACIÓN DE ACTIVOS (IMAGEN DEL CROQUIS Y LOGO) ---
    let imageHtml = '<p class="no-image">[No se adjuntó imagen de croquis]</p>';
    if (sketchData.imageUrl) {
        try {
            const bucket = getStorage().bucket(BUCKET_NAME);
            const filePath = decodeURIComponent(sketchData.imageUrl.split('/o/')[1].split('?')[0]);
            logger.info(`Descargando imagen del croquis desde: ${filePath}`);

            const file = bucket.file(filePath);
            const [imageBuffer] = await file.download();
            const imageBase64 = `data:image/png;base64,${imageBuffer.toString('base64')}`;
            imageHtml = `<img src="${imageBase64}" alt="Croquis del accidente" class="croquis-image">`;
        } catch (imgError) {
            logger.error(`Fallo al descargar la imagen del croquis ${sketchId}:`, imgError.message);
            imageHtml = '<p class="no-image">[Error al cargar la imagen del croquis. Verifique los permisos del bucket.]</p>';
        }
    }

    const logoBuffer = await downloadLogoFromStorage();
    const logoBase64 = logoBuffer ? `data:image/png;base64,${logoBuffer.toString('base64')}` : '';

    // 4. --- FORMATEO DE DATOS PARA EL HTML ---
    let fechaFormateada = 'No especificada';
    if (sketchData.fechaSuceso && typeof sketchData.fechaSuceso.toDate === 'function') {
        const dateInMadrid = toZonedTime(sketchData.fechaSuceso.toDate(), MADRID_TIMEZONE);
        fechaFormateada = format(dateInMadrid, 'dd/MM/yyyy HH:mm', { locale: es });
    }

    let leyendaHtml = '';
    if (sketchData.leyenda && sketchData.leyenda.trim().length > 0) {
        const leyendaItems = sketchData.leyenda.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        if (leyendaItems.length > 0) {
            leyendaHtml = `
                <div class="leyenda-section">
                    <h3>LEYENDA</h3>
                    <div class="leyenda-grid">
                        ${leyendaItems.map(item => `<div class="leyenda-item">${item}</div>`).join('')}
                    </div>
                </div>
            `;
        }
    }

    // 5. --- DEFINICIÓN DEL CSS Y LA PLANTILLA HTML ---
    const css = `<style>
        body { font-family: Arial, Helvetica, sans-serif; margin: 0; font-size: 12px; color: #333; }
        .page-container { margin: 2cm; }
        .header { display: flex; align-items: flex-start; justify-content: space-between; padding-bottom: 15px; border-bottom: 2px solid #000; }
        .header img { width: 80px; }
        .header-info { text-align: right; font-size: 10px; color: #555; }
        h1 { text-align: center; margin: 40px 0; font-size: 18px; text-transform: uppercase; }
        .info-grid { display: grid; grid-template-columns: 150px auto; gap: 8px 10px; margin-bottom: 30px; font-size: 13px; }
        .info-grid p { margin: 0; }
        .info-grid strong { font-weight: bold; color: #000; }
        .croquis-section { margin-top: 20px; page-break-inside: avoid; }
        .croquis-image { max-width: 100%; height: auto; border: 1px solid #ddd; margin-top: 10px; }
        .leyenda-section { margin-top: 30px; border-top: 1px solid #ccc; padding-top: 15px; page-break-inside: avoid; }
        .leyenda-section h3 { text-align: center; margin-bottom: 15px; font-size: 14px; }
        .leyenda-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 5px 20px; }
        .leyenda-item { padding: 2px 0; }
        .no-image { color: #888; text-align: center; margin-top: 20px; font-style: italic; }
    </style>`;

    const html = `
        <html><head><meta charset="UTF-8">${css}</head><body>
            <div class="page-container">
                <div class="header">
                    ${logoBase64 ? `<img src="${logoBase64}" alt="Logo del Ayuntamiento">` : ''}
                    <div class="header-info">
                        <strong>POLICÍA LOCAL</strong><br>
                        Jefatura de Chauchina
                    </div>
                </div>
                <h1>Croquis de Accidente de Tráfico</h1>
                <div class="info-grid">
                    <p><strong>Lugar del suceso:</strong></p> <p>${sketchData.lugar || 'No especificado'}</p>
                    <p><strong>Fecha y Hora:</strong></p> <p>${fechaFormateada}</p>
                    <p><strong>Vehículos / Implicados:</strong></p> <p>${sketchData.implicados || 'No especificados'}</p>
                    <p><strong>Diligencias / Documento:</strong></p> <p>${sketchData.documentoRealizado || 'Ninguno'}</p>
                </div>
                <div class="croquis-section">
                    ${imageHtml}
                </div>
                ${leyendaHtml}
            </div>
            
        </body>
        </html>
    `;

    // 6. --- RENDERIZADO Y GUARDADO DEL PDF ---
    try {
        logger.info(`[Paso 1] Preparando para iniciar Puppeteer...`);
        const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
        
        logger.info(`[Paso 2] Puppeteer iniciado. Creando nueva página...`);
        const page = await browser.newPage();
        
        logger.info(`[Paso 3] Página creada. Estableciendo contenido HTML...`);
        await page.setContent(html, { waitUntil: 'domcontentloaded' });
        
        logger.info(`[Paso 4] Contenido establecido. Generando buffer del PDF...`);
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        
        logger.info(`[Paso 5] Buffer del PDF generado. Cerrando Puppeteer...`);
        await browser.close();

        if (pdfBuffer.length === 0) {
            throw new HttpsError("internal", "El PDF generado por el servidor estaba vacío.");
        }
        
        logger.info(`[Paso 6] Puppeteer cerrado. Guardando PDF en Storage...`);
        const bucket = getStorage().bucket(BUCKET_NAME);
        const fileName = `sketches/pdfs/croquis_${sketchId}_${Date.now()}.pdf`;
        const file = bucket.file(fileName);
        await file.save(pdfBuffer, { metadata: { contentType: 'application/pdf' } });

        logger.info(`[Paso 7] PDF guardado. Generando URL firmada...`);
        const options = { version: 'v4', action: 'read', expires: Date.now() + 15 * 60 * 1000 }; // 15 minutos de validez
        const [signedUrl] = await file.getSignedUrl(options);

        logger.info(`[Paso 8] URL generada. Proceso completado con éxito.`);
        return { success: true, pdfUrl: signedUrl };
        
    } catch (error) {
        logger.error(`Error al renderizar o guardar el PDF para el croquis ${sketchId}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "No se pudo procesar el PDF.");
    }
});

export const deleteSketch = onCall({
    region: 'us-central1'
}, async (request) => {
    // 1. Verificar permisos
    if (request.auth?.token?.role !== 'admin') {
        throw new HttpsError("permission-denied", "Solo los administradores pueden eliminar croquis.");
    }
    const { sketchId } = request.data;
    if (!sketchId) {
        throw new HttpsError("invalid-argument", "Falta el ID del croquis.");
    }

    const db = getDb();
    const sketchRef = db.collection('sketches').doc(sketchId);

    try {
        const docSnap = await sketchRef.get();
        if (!docSnap.exists) {
            logger.warn(`Se intentó eliminar un croquis que no existe: ${sketchId}`);
            return { success: true, message: "El croquis ya había sido eliminado." };
        }
        const sketchData = docSnap.data();

        // 2. Borrar la imagen de Storage si existe
        if (sketchData.imageUrl) {
            try {
                const bucket = getStorage().bucket(BUCKET_NAME);
                const filePath = decodeURIComponent(sketchData.imageUrl.split('/o/')[1].split('?')[0]);
                await bucket.file(filePath).delete();
                logger.info(`Imagen del croquis ${sketchId} eliminada de Storage: ${filePath}`);
            } catch (storageError) {
                logger.error(`No se pudo eliminar la imagen del croquis ${sketchId}. Puede que ya no exista. Error:`, storageError.message);
            }
        }

        // 3. Borrar el documento de Firestore
        await sketchRef.delete();
        logger.info(`Croquis ${sketchId} eliminado de Firestore por admin ${request.auth.uid}.`);

        return { success: true, message: "Croquis eliminado con éxito." };

    } catch (error) {
        logger.error(`Error al eliminar el croquis ${sketchId}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "No se pudo eliminar el croquis.");
    }
});

/**
 * Elimina una plantilla de documento de la base de datos.
 * Solo para administradores.
 */
export const deleteDocumentTemplate = onCall({ region: 'us-central1' }, async (request) => {
    // 1. Verificación de permisos
    if (!request.auth || request.auth.token.role !== 'admin') {
        throw new HttpsError("permission-denied", "Solo los administradores pueden eliminar plantillas.");
    }
    
    // 2. Validación de datos de entrada
    const { templateId } = request.data;
    if (!templateId) {
        throw new HttpsError("invalid-argument", "Falta el ID de la plantilla a eliminar.");
    }

    const db = getDb();
    const templateRef = db.collection('documentTemplates').doc(templateId);

    try {
        // 3. Ejecución de la eliminación
        await templateRef.delete();
        
        logger.info(`Plantilla ${templateId} eliminada con éxito por el admin ${request.auth.token.agentId}.`);
        return { success: true, message: "Plantilla eliminada correctamente." };

    } catch (error) {
        logger.error(`Error al eliminar la plantilla ${templateId}:`, error);
        throw new HttpsError("internal", "No se pudo eliminar la plantilla de la base de datos.");
    }
});