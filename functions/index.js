// Archivo: functions/index.js

// --- 1. IMPORTACIONES DE FIREBASE (Modular y Limpio) ---
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage"; 
import * as logger from "firebase-functions/logger"; 

// --- 2. IMPORTACIONES DE FUNCTIONS V2 ---
import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated, onDocumentUpdated, onDocumentWritten } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
// 💡 AÑADIDA ESTA LÍNEA QUE FALTABA:
import { defineSecret } from "firebase-functions/params"; 

// --- 3. UTILIDADES Y LIBRERÍAS ---
import { format, parseISO, addDays, startOfMonth, endOfMonth, subMonths, isSameMonth, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
import Handlebars from 'handlebars';
import path from 'path';
// import { PDFDocument } from 'pdf-lib'; // (Opcional: Si usas pdf-lib globalmente mantenlo, si no bórralo)
import { PDFDocument } from 'pdf-lib'; 
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';

// --- 4. PUPPETEER OPTIMIZADO (CRÍTICO) ---
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

import * as XLSX from 'xlsx';

// --- 5. INICIALIZACIÓN ---
initializeApp(); 

// Wrapper para compatibilidad con código legacy que usa getDb()
const db = getFirestore();
const getDb = () => db;

const corsHandler = cors({ origin: true }); 

// --- 6. HELPER DEL NAVEGADOR ---
async function getBrowser() {
  return await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
    ignoreHTTPSErrors: true,
  });
}

// --- Helper para obtener el documento cursor ---
async function getCursorDoc(collectionName, docId) {
    if (!docId) return null;
    const db = getDb();
    const docSnap = await db.collection(collectionName).doc(docId).get();
    return docSnap.exists ? docSnap : null;
}

// ... AQUÍ EMPIEZAN TUS FUNCIONES ...
// ==========================================================
// === 💡 INICIO DE LA MODIFICACIÓN: AÑADIR HELPERS DE HANDLEBARS ===
// ==========================================================
// Registramos los helpers de comparación que faltan en el backend

Handlebars.registerHelper('eq', function (a, b) {
  return a === b;
});

Handlebars.registerHelper('neq', function (a, b) {
  return a !== b;
});

Handlebars.registerHelper('gt', function (a, b) {
  return a > b;
});

Handlebars.registerHelper('lt', function (a, b) {
  return a < b;
});

Handlebars.registerHelper('gte', function (a, b) {
  return a >= b;
});

Handlebars.registerHelper('lte', function (a, b) {
  return a <= b;
});

const BREVO_USER = defineSecret('BREVO_USER');
const BREVO_PASS = defineSecret('BREVO_PASS');
const AGENT_SENIORITY_ORDER = ['4684', '4687', '5281', '5605', '8498'];

// (Asegúrate de que esta constante esté definida al principio de tu archivo)
const documentTypePrefixes = {
  // Documentos de Salida
  informe: 'INF',
  acta: 'ACT',
  atestado: 'ATE',
  citacion: 'CIT',
  notificacion: 'NOT',
  oficio: 'OFI',
  salida_general: 'DOC', // Un prefijo por defecto
  // Documentos de Entrada
  oficio_judicial: 'OJ', req_administracion: 'RA', sol_aseguradora: 'SA',
  instancia_general: 'IG', comunicacion_interna: 'CI',
};

// No necesitamos redefinir getStorage porque ya lo importaste 
// al principio desde "firebase-admin/storage".
// La función importada getStorage() ya funciona correctamente.

const MADRID_TIMEZONE = 'Europe/Madrid';
const BUCKET_NAME = 'cuadrante-81ca7.firebasestorage.app';
const LOGO_PATH_IN_STORAGE = 'logo-ayto.png';
const LOGO_ESPANA_PATH = 'assets/escudo_espana.png';
const LOGO_POLICIA_PATH = 'assets/escudo_policia_local.png';
const EXTRA_SERVICE_TYPES = {
  diurno: { name: 'Diurno', price: 25 },
  nocturno: { name: 'Nocturno', price: 32 },
  festivo: { name: 'Festivo', price: 35 },
  festivo_nocturno: { name: 'Festivo Nocturno', price: 38 },
};


// =================================================================
// 1. FUNCIÓN AUXILIAR (Añade esto fuera de las funciones exportadas)
// =================================================================
function generateKeywords(text) {
  if (!text) return [];
  // Dividir por espacios, guiones o barras
  const words = text.toLowerCase().split(/[\s\-\/]+/);
  const keywords = [];
  
  // Generar fragmentos progresivos para búsqueda tipo "startWith"
  words.forEach(word => {
      let current = '';
      for (const char of word) {
          current += char;
          keywords.push(current);
      }
  });
  
  return [...new Set(keywords)]; // Eliminar duplicados
}

/**
 * Genera un número de registro único y secuencial para cada nueva orden de servicio.
 * Se dispara cuando se crea un documento en 'serviceOrders'.
 */
export const generateOrderRegNumber = onDocumentCreated("serviceOrders/{orderId}", async (event) => {
    const snap = event.data;
    if (!snap) {
        logger.warn("No data associated with the event.");
        return;
    }

    // No ejecutar si ya tiene un número (ej. importación manual)
    if (snap.data().order_reg_number) {
        return;
    }
    
    // Obtenemos la instancia de Firestore
    const db = getFirestore(); 
    const counterRef = db.doc("counters/serviceOrderCounter");

    try {
        // Usamos una transacción para garantizar la atomicidad
        const newNumber = await db.runTransaction(async (transaction) => {
            const counterDoc = await transaction.get(counterRef);
            
            let currentNumber = 1000; // Número inicial si el contador no existe
            if (counterDoc.exists) {
                currentNumber = counterDoc.data().currentNumber;
            }

            const nextNumber = currentNumber + 1;
            
            // Actualizamos el contador
            transaction.set(counterRef, { currentNumber: nextNumber }, { merge: true });
            
            return nextNumber;
        });

        // Formateamos el número (ej: ORD-2025-1001)
        const year = new Date().getFullYear();
        const formattedNumber = `ORD-${year}-${String(newNumber).padStart(4, '0')}`;

        // Escribimos el número en la orden de servicio recién creada
        return snap.ref.update({
            order_reg_number: formattedNumber
        });

    } catch (error) {
        logger.error("Error generating registration number:", error);
        // Opcional: marcar la orden como "fallida" para revisión
        return snap.ref.update({ order_reg_number: "GENERATION_ERROR" });
    }
});

async function getAgentNameById(agentId) {
  if (!agentId) return '';
  // Llama a getDb() para asegurar que la instancia de la base de datos está inicializada
  const agentDoc = await getDb().collection('agents').doc(String(agentId)).get();
  return agentDoc.exists ? agentDoc.data().name : `ID ${agentId}`;
}

// --- FUNCIÓN AUXILIAR PARA DESCARGAR LOGO ---
async function downloadLogoFromStorage() {
  // 1. Definimos el bucket explícitamente usando tu ruta gs://
  const MY_BUCKET_NAME = 'cuadrante-81ca7.firebasestorage.app';
  const bucket = getStorage().bucket(MY_BUCKET_NAME);
  
  // 2. Ruta exacta del archivo dentro del bucket (sin gs://...)
  const filePath = 'assets/escudo_policia_local.png'; 
  
  try {
    const file = bucket.file(filePath);
    
    // 3. Verificamos existencia antes de descargar
    const [exists] = await file.exists();
    if (!exists) {
      logger.warn(`[Logo] El archivo no existe en: ${filePath}`);
      return null;
    }

    // 4. Descargamos
    const [buffer] = await file.download();
    logger.info(`[Logo] Descargado correctamente (${buffer.length} bytes)`);
    return buffer;

  } catch (error) {
    // 5. 💡 CORRECCIÓN DEL LOG: Imprimimos solo el mensaje, no el objeto entero
    // Esto soluciona el error "reading startsWith"
    logger.error(`[Logo] Fallo al descargar: ${error.message}`);
    return null; 
  }
}
// --- FUNCIÓN AUXILIAR GENÉRICA PARA DESCARGAR ASSETS (LOGOS, ESCUDOS, ETC.) ---
async function downloadAsset(fileName) {
  // 1. Bucket explícito
  const MY_BUCKET_NAME = 'cuadrante-81ca7.firebasestorage.app';
  const bucket = getStorage().bucket(MY_BUCKET_NAME);
  
  // 2. Ruta dinámica dentro de la carpeta 'assets'
  const filePath = `assets/${fileName}`; 
  
  try {
    const file = bucket.file(filePath);
    
    // 3. Verificamos existencia
    const [exists] = await file.exists();
    if (!exists) {
      logger.warn(`[Asset] El archivo no existe en: ${filePath}`);
      return null;
    }

    // 4. Descargamos
    const [buffer] = await file.download();
    // logger.info(`[Asset] Descargado correctamente: ${fileName}`); // Descomentar si quieres logs detallados
    return buffer;

  } catch (error) {
    // 5. Manejo de error seguro (solo mensaje)
    logger.error(`[Asset] Fallo al descargar ${fileName}: ${error.message}`);
    return null; 
  }
}

// -----------------------------------------------------------
// 📚 AGENTE IA: LÓGICA DE TAREAS PENDIENTES
// -----------------------------------------------------------

/**
 * [HELPER INTERNO] Consulta las tareas específicas pendientes para una lista de agentes.
 * Colección asumida: 'tareas'
 */
async function getPendingTasksLogic(agentIds) {
    const db = getDb(); 
    const pendingTasks = {};

    if (!Array.isArray(agentIds) || agentIds.length === 0) {
        return pendingTasks;
    }

    try {
        // Firestore tiene un límite de 10 items para el operador 'in'.
        // Si tienes más de 10 agentes, habría que dividir la consulta, pero asumimos <10 por turno.
        const tasksSnapshot = await db.collection('tareas') 
            .where('assignedAgentId', 'in', agentIds)
            .where('status', '==', 'pendiente') 
            .get();

        tasksSnapshot.forEach(doc => {
            const task = doc.data();
            const id = task.assignedAgentId; 
            const description = task.description || 'Tarea sin descripción detallada'; 
            
            if (!pendingTasks[id]) {
                pendingTasks[id] = [];
            }

            // Añadimos la tarea al array del agente correspondiente
            pendingTasks[id].push({ 
                taskId: doc.id, 
                description: description, 
                orderId: task.orderId || null,
                // ✅ CORRECCIÓN CRÍTICA: Enviamos la fecha al frontend
                // Comprobamos si 'createdAt' existe y es un Timestamp de Firestore antes de convertirlo
                createdAt: task.createdAt && typeof task.createdAt.toDate === 'function' 
                    ? task.createdAt.toDate().toISOString() 
                    : null 
            });
        });

        return pendingTasks; 
    } catch (error) {
        // Usamos el logger global importado
        logger.error("Error en getPendingTasksLogic:", error);
        return {};
    }
}

/**
 * [CALLABLE] Agente IA: Consulta de tareas pendientes para el frontend (Requisito 1).
 */
export const getPendingTasksForAgents = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Autenticación requerida.');
    }

    const { agentIds } = request.data;
    
    try {
        const pendingTasks = await getPendingTasksLogic(agentIds);
        return pendingTasks; // Devuelve el mapa { agentId: [tareas] }
    } catch (error) {
        logger.error("Error en getPendingTasksForAgents (Callable):", error);
        throw new HttpsError('internal', 'Error al consultar tareas pendientes.');
    }
});

function unescapeHtml(safe) {
  if (!safe) return '';
  return safe.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'");
}

function getDateStringInMadridTimezone(dateObj) {
  return formatInTimeZone(dateObj, MADRID_TIMEZONE, 'yyyy-MM-dd', { locale: es });
}

function getMonthNameInMadridTimezone(dateObj) {
  return formatInTimeZone(dateObj, MADRID_TIMEZONE, 'MMMM', { locale: es }).toLowerCase();
}

// --- REGISTRO DE HELPERS DE HANDLEBARS ---
// Esto le enseña a Handlebars a entender {{#if}}, {{#each}}, etc.

Handlebars.registerHelper('if', function(conditional, options) {
  if (conditional) {
    return options.fn(this);
  } else {
    return options.inverse(this);
  }
});

Handlebars.registerHelper('unless', function(conditional, options) {
    if (!conditional) {
        return options.fn(this);
    } else {
        return options.inverse(this);
    }
});

Handlebars.registerHelper('each', function(context, options) {
  let ret = "";
  if (context && context.length > 0) {
    for (let i = 0; i < context.length; i++) {
      ret = ret + options.fn(context[i], { data: { index: i } });
    }
  }
  return ret;
});

Handlebars.registerHelper('inc', function(value) {
    return parseInt(value, 10) + 1;
});

function safeConvertToDate(dateValue, docId) {
  if (!dateValue) return null;
  if (typeof dateValue.toDate === 'function') return dateValue.toDate();
  if (typeof dateValue === 'string') {
    try {
      const parsedDate = parseISO(dateValue);
      if (!isNaN(parsedDate)) return parsedDate;
    } catch (e) {
      /* Ignorar */
    }
  }
  logger.error(`Documento ${docId} tiene un formato de fecha inválido.`, dateValue);
  return null;
}

async function updateScheduleForPermissionRequest(solicitudId) {
  const solicitudDoc = await getDb().collection('solicitudes').doc(solicitudId).get();
  if (!solicitudDoc.exists) return;
  const solicitudData = solicitudDoc.data();
  const permissionTypeDoc = await getDb()
    .collection('permissionTypes')
    .doc(solicitudData.typeId)
    .get();
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
            const shiftKeyToUpdate = Object.keys(shifts).find(
              (key) => String(shifts[key].agentId) === agentId
            );
            const updatePath = `weeks.${weekKey}.days.${dayKey}.shifts.${shiftKeyToUpdate || `solicitud_${Date.now()}`}`;
            await scheduleRef.update({
              [updatePath]: { agentId: agentId, shiftType: initialQuadrantSymbol },
            });
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
      logger.warn(
        `Documento de cuadrante ${scheduleId} no existe al intentar encontrar y reemplazar turno.`
      );
      return;
    }
    const scheduleData = scheduleDoc.data();
    for (const weekKey in scheduleData.weeks) {
      for (const dayKey in scheduleData.weeks[weekKey].days) {
        if (scheduleData.weeks[weekKey].days[dayKey]?.date === dateString) {
          const shifts = scheduleData.weeks[weekKey].days[dayKey].shifts || {};
          const shiftKey = Object.keys(shifts).find(
            (k) => String(shifts[k].agentId) === String(agentIdToUpdate)
          );
          if (newShiftType === 'N') continue;
          const updatePath = `weeks.${weekKey}.days.${dayKey}.shifts.${shiftKey || `agente_${Date.now()}`}`;
          await scheduleRef.update({
            [updatePath]: { agentId: String(agentIdToUpdate), shiftType: newShiftType },
          });
          return;
        }
      }
    }
  } catch (error) {
    logger.error(`Error al actualizar turno en ${scheduleId}:`, error);
  }
}

// [SOLUCIÓN] 'PDFDocument' se importa dinámicamente aquí
// Pega este bloque completo en tu functions/index.js, reemplazando la función existente.
async function generateReportPdfContent(reportData, logoBuffer, userRole = 'guard') {
  const PDFDocument = (await import('pdfkit')).default;

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const PADDING = 30;
      const X_START = PADDING;
      const FONT_NORMAL = 'Helvetica';
      const FONT_BOLD = 'Helvetica-Bold';
      
      const { servicesByAgent, periodStartDateObj, periodEndDateObj } = reportData;

      let headerY = doc.y;
      if (logoBuffer) doc.image(logoBuffer, X_START, headerY, { width: 70 });
      doc.font(FONT_BOLD).fontSize(10).text('JEFATURA DE POLICIA LOCAL', X_START + 80, headerY + 10);
      doc.font(FONT_NORMAL).fontSize(8).text('e-mail: policialocal@chauchina.es', X_START + 80, headerY + 25);
      doc.text('Fax: 958 45 51 21', X_START + 80, headerY + 35);
      doc.y = Math.max(headerY + 70, doc.y);
      
      const monthNameStart = formatInTimeZone(periodStartDateObj, MADRID_TIMEZONE, 'MMMM', { locale: es });
      const monthNameEnd = formatInTimeZone(periodEndDateObj, MADRID_TIMEZONE, 'MMMM', { locale: es });
      const yearStart = formatInTimeZone(periodStartDateObj, MADRID_TIMEZONE, 'yyyy');
      const yearEnd = formatInTimeZone(periodEndDateObj, MADRID_TIMEZONE, 'yyyy');
      
      let asuntoText = ` Remuneración servicios extraordinarios `;
      if (isSameMonth(periodStartDateObj, periodEndDateObj) && yearStart === yearEnd) {
        asuntoText += `${monthNameStart} ${yearStart}`;
      } else {
        asuntoText += `${monthNameStart}-${monthNameEnd} ${yearStart}`;
      }
      
      doc.font(FONT_BOLD).fontSize(10).text('Asunto:', X_START, doc.y, { continued: true }).font(FONT_NORMAL).text(asuntoText);
      doc.moveDown(0.5);
      doc.font(FONT_BOLD).fontSize(10).text('Destinatario:', X_START, doc.y, { continued: true }).font(FONT_NORMAL).text(' Recursos humanos');
      doc.moveDown(1);
      
      const introTextEndDate = formatInTimeZone(periodEndDateObj, MADRID_TIMEZONE, "dd 'de' MMMM 'de' yyyy", { locale: es });
      doc.font(FONT_NORMAL).fontSize(10).text(
          `Por medio del presente oficio, se comunican los servicios extraordinarios realizados por policías de esta Jefatura de Policía Local en funciones de seguridad ciudadana y tráfico hasta el ${introTextEndDate}.`,
          { align: 'justify' }
      ).moveDown(1.5);
      
      doc.font(FONT_BOLD).fontSize(10).text('Descripción de servicios extraordinarios', { underline: true }).moveDown();

      const col1X = X_START;       const col1Width = 80;
      const col2X = col1X + col1Width + 10; const col2Width = 230;
      const col3X = col2X + col2Width + 10; const col3Width = 100;
      const col4X = col3X + col3Width + 10; const col4Width = 50;

      function drawTableHeader() {
        doc.font(FONT_BOLD).fontSize(9);
        doc.text('DÍA', col1X, doc.y, { width: col1Width });
        doc.text('EVENTO', col2X, doc.y, { width: col2Width });
        doc.text('MODALIDAD', col3X, doc.y, { width: col3Width });
        doc.text('TOTAL', col4X, doc.y, { width: col4Width, align: 'right' });
        doc.moveDown(0.5);
        doc.lineWidth(0.5).moveTo(X_START, doc.y).lineTo(doc.page.width - PADDING, doc.y).stroke().moveDown(0.5);
      }
      
      function drawTableRow(row) {
          const evento = row.notes && row.notes.trim() !== '' ? row.notes : 'Servicio sin descripción';
          const rowHeight = doc.heightOfString(evento, { width: col2Width }) + 10;

          if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom) {
              doc.addPage();
              drawTableHeader();
          }
          
          const y = doc.y;
          doc.font(FONT_NORMAL).fontSize(9);
          doc.text(formatInTimeZone(row.dateObj, MADRID_TIMEZONE, 'dd/MM/yyyy'), col1X, y, { width: col1Width });
          doc.text(evento, col2X, y, { width: col2Width });
          doc.text(EXTRA_SERVICE_TYPES[row.type]?.name || row.type, col3X, y, { width: col3Width });
          doc.text(String(row.hours), col4X, y, { width: col4Width, align: 'right' });
          doc.y += rowHeight;
      }
      
      const sortedAgentIds = Object.keys(servicesByAgent).sort();

      for (const agentId of sortedAgentIds) {
        const agentData = servicesByAgent[agentId];
        if (!agentData || agentData.services.length === 0) continue;
        const agentTotalHoursByType = { diurno: 0, nocturno: 0, festivo: 0, festivo_nocturno: 0 };
        if (doc.y > doc.page.height - 150) doc.addPage();
        doc.font(FONT_BOLD).fontSize(10).text(`AGENTE Y T.I.P: ${agentData.name} (${agentId})`).moveDown(0.5);
        drawTableHeader();
        const validServices = agentData.services
            .map(s => ({ ...s, dateObj: safeConvertToDate(s.date, s.id) }))
            .filter(s => s.dateObj)
            .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
        validServices.forEach(service => {
          if (agentTotalHoursByType.hasOwnProperty(service.type)) {
            agentTotalHoursByType[service.type] += service.hours || 0;
          }
          drawTableRow(service);
        });
        const totalAgentHours = validServices.reduce((sum, s) => sum + (s.hours || 0), 0);
        if (totalAgentHours > 0) {
            doc.moveDown(0.5);
            doc.lineWidth(0.5).moveTo(col4X, doc.y).lineTo(col4X + col4Width, doc.y).stroke().moveDown(0.5);
            doc.font(FONT_BOLD).fontSize(10).text(String(totalAgentHours), col4X, doc.y, { width: col4Width, align: 'right' });
        }
        if (doc.y > doc.page.height - 100) doc.addPage();
        doc.moveDown(1.5);
        const summaryY = doc.y;
        doc.font(FONT_BOLD).fontSize(10).text('Desglose Horas por Modalidad:', X_START, summaryY, { underline: true });
        const summaryTableTop = summaryY + 25;
        const summaryColWidth = 120;
        doc.font(FONT_BOLD).fontSize(9);
        doc.text('Ordinarias Diurnas', X_START, summaryTableTop);
        doc.text('Ordinarias Nocturnas', X_START + summaryColWidth, summaryTableTop);
        doc.text('Festivas Diurnas', X_START + summaryColWidth * 2, summaryTableTop);
        doc.text('Festivas Nocturnas', X_START + summaryColWidth * 3, summaryTableTop);
        doc.font(FONT_NORMAL).fontSize(10);
        doc.text(String(agentTotalHoursByType.diurno), X_START, summaryTableTop + 15, { width: summaryColWidth });
        doc.text(String(agentTotalHoursByType.nocturno), X_START + summaryColWidth, summaryTableTop + 15, { width: summaryColWidth });
        doc.text(String(agentTotalHoursByType.festivo), X_START + summaryColWidth * 2, summaryTableTop + 15, { width: summaryColWidth });
        doc.text(String(agentTotalHoursByType.festivo_nocturno), X_START + summaryColWidth * 3, summaryTableTop + 15, { width: summaryColWidth });
        doc.moveDown(3);
      }

      if (doc.y > doc.page.height - 180) doc.addPage();
      doc.font(FONT_NORMAL).fontSize(10).text(`Lo que se extiende para su conocimiento y efectos oportunos.`, X_START, doc.y, { align: 'left' }).moveDown(2);
      if (userRole === 'admin') {
         const col1SignatureX = X_START + 50;
         const col2SignatureX = doc.page.width / 2 + 50;
         const colSignatureWidth = (doc.page.width - 2 * PADDING) / 2 - 50;
         let currentSignatureY = doc.y;
         doc.font(FONT_BOLD).fontSize(10).text('V.B°. ALCALDIA', col1SignatureX, currentSignatureY, { width: colSignatureWidth, align: 'left' });
         doc.font(FONT_NORMAL).fontSize(10).text('Jesús Fernández', col1SignatureX, doc.y + 15, { width: colSignatureWidth, align: 'left' });
         doc.text('Moreno', col1SignatureX, doc.y + 12, { width: colSignatureWidth, align: 'left' });
         doc.y = currentSignatureY;
         doc.font(FONT_BOLD).fontSize(10).text('Oficial de Policía Local', col2SignatureX, currentSignatureY, { width: colSignatureWidth, align: 'right' });
         doc.font(FONT_NORMAL).fontSize(9).text('TIP 4684', col2SignatureX, doc.y + 15, { width: colSignatureWidth, align: 'right' });
      } else {
         const agentId = sortedAgentIds[0];
         const agentData = servicesByAgent[agentId];
         doc.font(FONT_BOLD).fontSize(10).text('El Agente,', X_START, doc.y);
         doc.font(FONT_NORMAL).fontSize(10).text(`${agentData.name} (T.I.P: ${agentId})`, X_START, doc.y + 15);
      }

      doc.end();
    } catch (error) {
      logger.error('Error catastrófico durante la generación del PDF:', error);
      reject(error);
    }
  });
}


/**
 * CREA MANUALMENTE UNA ORDEN DE SERVICIO (Iniciada por Admin).
 * (Soluciona el Método 1)
 */
export const createServiceOrder = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  logger.info("--- Iniciando createServiceOrder (Manual Admin) ---", request.data);

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes estar autenticado.');
  }
  const uid = request.auth.uid;
  const agentId = request.auth.token.agentId || 'admin';

  const orderData = request.data;
  if (!orderData || !orderData.service_date) {
    throw new HttpsError('invalid-argument', 'Faltan datos de la orden o la fecha de servicio.');
  }

  const db = getDb();
  
  try {
    const serviceDate = new Date(orderData.service_date);
    const serviceDateStartOfDay = startOfDay(serviceDate);
    const dateString = format(serviceDate, "yyyy-MM-dd");
    const counterRef = db.collection("counters").doc(`serviceOrder_${dateString}`);
    let nextNumber = 1;

    await db.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      if (counterDoc.exists) {
        nextNumber = counterDoc.data().count + 1;
        transaction.update(counterRef, { count: nextNumber });
      } else {
        transaction.set(counterRef, { count: 1 });
      }
    });
    
    const orderNumber = `${format(serviceDate, "yyyyMMdd")}-${nextNumber.toString().padStart(3, "0")}`;
    logger.info(`Número de orden manual generado: ${orderNumber}`);

    const finalOrderData = {
      ...orderData,
      service_date: Timestamp.fromDate(serviceDateStartOfDay),
      order_number: orderNumber,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      status: orderData.status || 'Pendiente',
      report_status: 'Pendiente',
      createdBy: agentId,
      createdByUid: uid
    };

    const orderRef = await db.collection("serviceOrders").add(finalOrderData);
    logger.info(`¡Éxito! Orden manual creada con ID: ${orderRef.id}`);
    
    return { 
      success: true, 
      message: `Orden ${orderNumber} creada manualmente con éxito.`,
      orderId: orderRef.id 
    };

  } catch (error) {
    logger.error("Error fatal en createServiceOrder:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Error al crear la orden de servicio: ' + error.message);
  }
});

// =================================================================
// === ✅ NUEVAS FUNCIONES DEL AGENTE IA AUTOMÁTICO ===
// =================================================================

// =================================================================
// CORRECCIÓN 1: autoGenerateMorningOrder
// Líneas ~635-679 en tu archivo original
// CAMBIO: 'shift_type' → 'service_shift' en la query
// =================================================================

export const autoGenerateMorningOrder = onSchedule({
  schedule: "every day 05:00",
  timeZone: "Europe/Madrid",
}, async (event) => {
  logger.info("--- Ejecutando Tarea Programada: autogeneratemorningorder ---");
  const db = getDb();
  const today = toZonedTime(new Date(), 'Europe/Madrid');
  const dateString = format(today, 'yyyy-MM-dd');
  const shiftType = 'M';

  try {
    // 1. Comprobar si ya existe una orden para hoy
    const ordersRef = db.collection('serviceOrders');
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    // ✅ CORRECCIÓN: Cambiar 'shift_type' por 'service_shift'
    const existingOrderQuery = ordersRef
      .where('service_date', '>=', Timestamp.fromDate(todayStart))
      .where('service_date', '<=', Timestamp.fromDate(todayEnd))
      .where('service_shift', '==', shiftType)  // ← CORREGIDO
      .limit(1);
    
    const snapshot = await existingOrderQuery.get();
    
    if (!snapshot.empty) {
      logger.info(`La orden de Mañana para ${dateString} ya existe. Tarea omitida.`);
      return null;
    }

    // 2. Si no existe, llamar a la lógica de IA
    logger.info(`No existe orden de Mañana para ${dateString}. Generando...`);
    
    // ✅ CORRECCIÓN: Llamada directa a la lógica interna en lugar de .run()
    const result = await _internalGenerateAiServiceOrder(dateString, shiftType);
    
    logger.info(`Tarea autogeneratemorningorder completada. Resultado: ${JSON.stringify(result)}`);
    return null;

  } catch (error) {
    logger.error("Error fatal en autogeneratemorningorder:", error);
    return null;
  }
});


// =================================================================
// CORRECCIÓN 2: autoGenerateAfternoonOrder
// Líneas ~686-728 en tu archivo original
// CAMBIO: 'shift_type' → 'service_shift' en la query
// =================================================================

export const autoGenerateAfternoonOrder = onSchedule({
  schedule: "every day 05:05",
  timeZone: "Europe/Madrid",
}, async (event) => {
  logger.info("--- Ejecutando Tarea Programada: autogenerateafternoonorder ---");
  const db = getDb();
  const today = toZonedTime(new Date(), 'Europe/Madrid');
  const dateString = format(today, 'yyyy-MM-dd');
  const shiftType = 'T';

  try {
    // 1. Comprobar si ya existe una orden para hoy
    const ordersRef = db.collection('serviceOrders');
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    // ✅ CORRECCIÓN: Cambiar 'shift_type' por 'service_shift'
    const existingOrderQuery = ordersRef
      .where('service_date', '>=', Timestamp.fromDate(todayStart))
      .where('service_date', '<=', Timestamp.fromDate(todayEnd))
      .where('service_shift', '==', shiftType)  // ← CORREGIDO
      .limit(1);
    
    const snapshot = await existingOrderQuery.get();
    
    if (!snapshot.empty) {
      logger.info(`La orden de Tarde para ${dateString} ya existe. Tarea omitida.`);
      return null;
    }

    // 2. Si no existe, llamar a la lógica de IA
    logger.info(`No existe orden de Tarde para ${dateString}. Generando...`);
    
    // ✅ CORRECCIÓN: Llamada directa a la lógica interna
    const result = await _internalGenerateAiServiceOrder(dateString, shiftType);
    
    logger.info(`Tarea autogenerateafternoonorder completada. Resultado: ${JSON.stringify(result)}`);
    return null;

  } catch (error) {
    logger.error("Error fatal en autogenerateafternoonorder:", error);
    return null;
  }
});

/**
 * [INTERNO] Genera una orden de servicio automáticamente.
 * Esta función contiene la lógica real y es llamada tanto por el scheduler
 * como por la función callable generateAiServiceOrder.
 * * NOTA: Asume que la función auxiliar findAgentsOnShiftInSchedule(date, shiftType, scheduleData)
 * ha sido definida y está disponible.
 * * @param {string} date - Fecha en formato 'YYYY-MM-DD'
 * @param {string} shiftType - 'M' para mañana o 'T' para tarde
 * @param {boolean} throwOnNoAgents - Si es true, lanza error cuando no hay agentes
 * @returns {Promise<{success: boolean, message: string, orderId?: string}>}
 */
async function _internalGenerateAiServiceOrder(date, shiftType, throwOnNoAgents = false) {
  logger.info(`--- [INTERNO] Generando orden IA para ${date} turno ${shiftType} ---`);
  
  const db = getDb();
  const serviceDate = new Date(date); 
  // Nota: serviceDateStartOfDay (línea 8) y formatInTimeZone/startOfDay/es (líneas 10 y 38)
  // deben estar definidas y disponibles en el entorno de la función.
  const serviceDateStartOfDay = startOfDay(serviceDate); 

  // 1. Lógica de Horarios (SIN CAMBIOS)
  const month = serviceDate.getMonth() + 1;
  const isSummer = (month >= 6 && month <= 9); 
  let startTime, endTime, shiftName = ''; 

  if (shiftType === 'M') {
    shiftName = 'Mañana';
    startTime = isSummer ? '08:00' : '08:00';
    endTime = isSummer ? '14:00' : '15:00';
  } else if (shiftType === 'T') {
    shiftName = 'Tarde';
    startTime = isSummer ? '18:00' : '14:00';
    endTime = isSummer ? '23:00' : '21:00';
  } else {
    throw new Error('ShiftType debe ser "M" o "T".');
  }
  logger.info(`[INTERNO] Fecha: ${date}, Verano: ${isSummer}. Horario: ${startTime}-${endTime}`);

  // 2. Buscar Plantilla Genérica (SIN CAMBIOS)
  const templateDocRef = db.collection('defaultOrderTemplates').doc(shiftName);
  const templateDoc = await templateDocRef.get();
  
  if (!templateDoc.exists) {
    throw new Error(`No se encontró la plantilla genérica para ${shiftName}.`);
  }
  const orderTemplate = templateDoc.data();

  // 3. Buscar Agentes en Cuadrante (CORREGIDO)
  // Asegurar nombres de meses en español coinciden con IDs de documentos
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const monthName = months[serviceDate.getMonth()]; // Ahora usa el array local para evitar problemas de locales
  const year = serviceDate.getFullYear();
  const monthId = `cuadrante_${monthName}_${year}`; // ID del documento, ej: cuadrante_mayo_2026

  logger.info(`[INTERNO] Buscando cuadrante: ${monthId}`);

  const scheduleDoc = await db.collection('schedules').doc(monthId).get();
  let agentIds = [];

  if (scheduleDoc.exists) {
    const scheduleData = scheduleDoc.data();
    // USAR LA NUEVA FUNCIÓN AUXILIAR CORREGIDA:
    // **Nota:** Debes asegurar que findAgentsOnShiftInSchedule esté definida
    // y maneje correctamente la estructura de 'weeks'/'days'/'shifts' del cuadrante.
    // Si la función auxiliar no está definida, esto fallará.
    agentIds = findAgentsOnShiftInSchedule(date, shiftType, scheduleData); 
    logger.info(`[INTERNO] Agentes encontrados en cuadrante para ${shiftType}: ${agentIds.join(', ') || 'ninguno'}`);
  } else {
    logger.warn(`[INTERNO] No existe cuadrante ${monthId}`);
    // Opcional: Intentar buscar en 'planning_drafts' si es una fecha futura no publicada
  }

  // 4. Verificar si hay agentes (CORREGIDO el mensaje de retorno)
  if (agentIds.length === 0) {
    const message = `No se encontraron agentes para ${shiftType} el ${date}. NO se generará orden.`;
    logger.warn(`[INTERNO] ${message}`);
    
    if (throwOnNoAgents) {
      throw new Error(`No hay agentes de ${shiftType} asignados. No se creó la orden.`);
    }
    // Devolver éxito true pero con un mensaje claro de que no se creó la orden
    return { success: true, message: 'No se generó la orden, no hay agentes.', orderId: null };
  }

  // 5. Determinar responsable por veteranía (SIN CAMBIOS)
  let shiftManagerId = agentIds
    .filter(id => AGENT_SENIORITY_ORDER.includes(String(id)))
    .sort((a, b) => AGENT_SENIORITY_ORDER.indexOf(String(a)) - AGENT_SENIORITY_ORDER.indexOf(String(b)))[0]; 
    
  if (!shiftManagerId) {
    shiftManagerId = agentIds[0];
    logger.warn(`[INTERNO] No se encontró veterano. Asignando primero de la lista: ${shiftManagerId}.`);
  }

  // ✅ ESTADO SIEMPRE 'assigned' CUANDO HAY AGENTES
  const newStatus = 'assigned'; 
  logger.info(`[INTERNO] ✅ ${agentIds.length} agentes encontrados. Responsable: ${shiftManagerId}. Estado: '${newStatus}'`);

  // 6. Generar número de orden (SIN CAMBIOS)
  const dateString = format(serviceDate, "yyyy-MM-dd");
  const counterRef = db.collection("counters").doc(`serviceOrder_${dateString}`);
  let nextNumber = 1;

  await db.runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    if (counterDoc.exists) {
      nextNumber = counterDoc.data().count + 1;
      transaction.update(counterRef, { count: nextNumber });
    } else {
      transaction.set(counterRef, { count: 1 });
    }
  });
  const orderNumber = `${format(serviceDate, "yyyyMMdd")}-${nextNumber.toString().padStart(3, "0")}`;

  // 7. Crear la orden de servicio (SIN CAMBIOS)
  const finalOrderData = {
    service_date: Timestamp.fromDate(serviceDateStartOfDay),
    service_shift: shiftType, 
    start_time: startTime,
    end_time: endTime,
    title: orderTemplate.title,
    subtitle: orderTemplate.subtitle,
    description: orderTemplate.description,
    checklist: (orderTemplate.checklist || []).map(item => ({
      item: item.item || '',
      description: item.description || '',
      requiresGeolocation: item.requiresGeolocation || false,
      completed: false,
      status: 'pendiente'
    })),
    assigned_agents: agentIds,
    shift_manager_id: shiftManagerId, 
    order_number: orderNumber,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    status: newStatus,  // ✅ 'assigned'
    report_status: 'Pendiente',
    createdBy: 'IA_AUTOMATICA',
    createdByUid: 'IA_AUTOMATICA'
  };

  // ✅ LOG CRÍTICO: Mostrar el objeto completo antes de guardar (SIN CAMBIOS)
  logger.info(`[INTERNO] 📝 Objeto a guardar:`, {
    order_number: orderNumber,
    status: finalOrderData.status,
    assigned_agents: finalOrderData.assigned_agents,
    shift_manager_id: finalOrderData.shift_manager_id
  });

  const orderRef = await db.collection("serviceOrders").add(finalOrderData);
  
  // ✅ Verificar que se guardó correctamente (SIN CAMBIOS)
  const savedDoc = await orderRef.get();
  const savedStatus = savedDoc.data()?.status;
  logger.info(`[INTERNO] ✅ Orden ${orderNumber} creada con ID: ${orderRef.id}. Estado verificado en DB: '${savedStatus}'`);

  if (savedStatus !== 'assigned') {
    logger.error(`[INTERNO] ❌ ALERTA: El estado guardado (${savedStatus}) no coincide con el esperado (assigned)!`);
  }

  return { 
    success: true, 
    message: `Orden ${orderNumber} generada y asignada automáticamente.`,
    orderId: orderRef.id 
  };
}



// --- ✅ FUNCIÓN DE AYUDA CORREGIDA Y MODIFICADA ---
async function processAutoGeneration(db, date, shiftType, isManualCall = false) {
  // --- LOG ESTRATÉGICO 2 ---
  logger.info(`--- ➡️ PASO 2: processAutoGeneration EJECUTÁNDOSE para ${shiftType} en fecha ${date.toISOString()} ---`);

  const dateString = format(date, 'yyyy-MM-dd');
  // Ajuste para usar startOfDay y endOfDay de date-fns, que manejan mejor las zonas horarias implícitas
  const startOfDayForQuery = startOfDay(date); // Obtiene 00:00:00 del día en la zona horaria del servidor
  const endOfDayForQuery = endOfDay(date);     // Obtiene 23:59:59 del día en la zona horaria del servidor

  const existingOrdersQuery = db
    .collection('serviceOrders')
    // Compara Timestamps directamente
    .where('service_date', '>=', admin.firestore.Timestamp.fromDate(startOfDayForQuery))
    .where('service_date', '<=', admin.firestore.Timestamp.fromDate(endOfDayForQuery))
    .where('service_shift', '==', shiftType);
  const existingOrdersSnap = await existingOrdersQuery.get();

  if (!existingOrdersSnap.empty) {
    const message = `Ya existe una orden para ${dateString} ${shiftType}.`;
    logger.info(message);
    if (isManualCall)
      throw new HttpsError(
        'already-exists',
        `Ya existe una orden para el turno de ${shiftType} en esa fecha.`
      );
    return; // Termina la ejecución si ya existe una orden
  }

  // Busca agentes en el cuadrante (Lógica sin cambios)
  const monthName = format(date, 'MMMM', { locale: es }).toLowerCase();
  const year = date.getFullYear();
  const monthId = `cuadrante_${monthName}_${year}`;
  const scheduleDoc = await db.collection('schedules').doc(monthId).get();

  if (!scheduleDoc.exists) {
    const message = `No se encontró cuadrante para ${monthId}.`;
    logger.warn(message);
    if (isManualCall)
      throw new HttpsError(
        'not-found',
        `No se encontró el cuadrante para ${monthName} de ${year}.`
      );
    return; // Termina si no hay cuadrante
  }

  const scheduleData = scheduleDoc.data();
  // Llama a la función auxiliar para encontrar agentes, pasando YYYY-MM-DD
  const agentsOnShift = findAgentsOnShiftInSchedule(dateString, shiftType, scheduleData);

  if (agentsOnShift.length === 0) {
    const message = `No hay agentes de turno de ${shiftType} para la fecha ${dateString}.`;
    logger.info(message);
    if (isManualCall)
      throw new HttpsError(
        'not-found',
        `No hay agentes de ${shiftType} asignados en el cuadrante para esa fecha.`
      );
    return; // Termina si no hay agentes
  }

  logger.info(`Agentes encontrados para ${shiftType} el ${dateString}: ${agentsOnShift.join(', ')}`);
  logger.info(`Procediendo a crear orden y llamar a createOrderFromTemplate...`);

  // --- 👇 INICIO DE LA MODIFICACIÓN 👇 ---
  // 1. Crea una referencia para la nueva orden ANTES de llamar a createOrderFromTemplate
  const newOrderRef = db.collection('serviceOrders').doc(); // Genera un ID automático

  // 2. Genera el número de registro usando la lógica transaccional segura
  //    (Llamamos a la función auxiliar que implementamos antes)
  //    Pasamos la fecha y la instancia db
  const regNumber = await generateNextOrderNumberTransactional(db, date); // Usa la nueva función auxiliar transaccional

  // 3. Crea un documento inicial básico con los datos esenciales
  await newOrderRef.set({
    service_date: admin.firestore.Timestamp.fromDate(date),
    service_shift: shiftType,
    status: 'generating', // Estado temporal mientras se rellena por createOrderFromTemplate
    created_by_user_id: isManualCall ? request.auth.uid : 'AUTOMATIC_AGENT', // Quién la crea
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
    order_reg_number: regNumber, // Número seguro generado
    assigned_agents: [], // Lista vacía inicialmente
    // Otros campos iniciales si son necesarios
  });
  logger.info(`Orden ${newOrderRef.id} creada inicialmente con número de registro ${regNumber}.`);

  // 4. Llama a createOrderFromTemplate pasando la referencia de la orden ya creada
  //    Esta función ahora se encargará de actualizarla con los detalles de la plantilla,
  //    asignar agentes/responsable y crear los recordatorios.
  await createOrderFromTemplate(db, date, shiftType, agentsOnShift, newOrderRef);
  // --- 👆 FIN DE LA MODIFICACIÓN 👆 ---

  logger.info(`Proceso de generación automática/manual completado para orden ${newOrderRef.id}.`);
  // No necesitamos devolver nada explícitamente aquí, la función termina.
}

// --- ✅ NUEVA FUNCIÓN AUXILIAR TRANSACCIONAL PARA NÚMEROS DE ORDEN ---
// Debes añadir esta función también a tu archivo functions/index.js

/**
 * Genera el siguiente número de registro correlativo para una orden de servicio
 * de forma segura usando una transacción de Firestore. Formato: XXX/MM/YYYY
 * @param {FirebaseFirestore.Firestore} db - Instancia de Firestore Admin SDK.
 * @param {Date} date - La fecha del servicio para determinar mes y año.
 * @returns {Promise<string>} - El número de registro formateado.
 */
async function generateNextOrderNumberTransactional(db, date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const counterId = `serviceOrders_${year}_${month}`; // ID del documento contador
  const counterRef = db.collection('counters').doc(counterId);

  try {
    const nextNumber = await db.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      const currentCount = counterDoc.data()?.count || 0; // Obtiene el contador actual, 0 si no existe
      const newCount = currentCount + 1;

      // Actualiza el contador de forma atómica dentro de la transacción
      transaction.set(counterRef, { count: newCount }, { merge: true });

      return newCount; // Devuelve el nuevo número
    });

    // Formatea el número
    const formattedNumber = `${String(nextNumber).padStart(3, '0')}/${month}/${year}`;
    logger.info(`Número de orden ${formattedNumber} generado transaccionalmente para ${counterId}.`);
    return formattedNumber;

  } catch (error) {
    logger.error(`Error generando número de orden transaccional para ${counterId}:`, error);
    // Lanza un error para detener el proceso si no se pudo generar el número
    throw new HttpsError('internal', 'No se pudo generar el número de registro de la orden.');
  }
}

/**
 * Obtiene una lista de Órdenes de Servicio aplicando filtros de forma robusta.
 * Esta versión está optimizada para recibir un filtro de fecha como 'YYYY-MM-DD'
 * y construir una consulta que Firestore pueda resolver eficientemente con el índice correcto.
 */
export const getServiceOrders = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  // --- LOG DE DEPURACIÓN 1: Ver los filtros exactos que llegan ---
  logger.info("getServiceOrders_FiltrosRecibidos:", request.data);

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes estar autenticado para ver las órdenes.');
  }

  const { status, date, service_shift } = request.data;
  const userRole = request.auth.token.role;
  const userAgentId = request.auth.token.agentId;
  let queryRef = getDb().collection('serviceOrders');

  if (date) {
    const startDate = new Date(`${date}T00:00:00.000Z`);
    const endDate = new Date(`${date}T23:59:59.999Z`);
    
    // --- LOG DE DEPURACIÓN 2: Ver el rango de fechas que se está usando ---
    logger.info("getServiceOrders_RangoDeFechas:", { 
      fecha_inicio: startDate.toISOString(), 
      fecha_fin: endDate.toISOString() 
    });

    queryRef = queryRef.where('service_date', '>=', startDate)
                       .where('service_date', '<=', endDate);
  }

  if (status && status !== 'all') {
    queryRef = queryRef.where('status', '==', status);
  }
  if (service_shift && service_shift !== 'all') {
    queryRef = queryRef.where('service_shift', '==', service_shift);
  }
  if (userRole !== 'admin' && userRole !== 'supervisor') {
    queryRef = queryRef.where('assigned_agents', 'array-contains', userAgentId);
  }

  queryRef = queryRef.orderBy('service_date', 'desc');

  try {
    const snapshot = await queryRef.get();
    
    // --- LOG DE DEPURACIÓN 3: Ver cuántos documentos ha encontrado la consulta ---
    logger.info(`getServiceOrders_ResultadosEncontrados: ${snapshot.size} documentos.`);

    const orders = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
          id: doc.id,
          ...data,
          // Convertir Timestamps a ISO strings (CON COMPROBACIÓN DE NULIDAD)
          service_date: data.service_date ? data.service_date.toDate().toISOString() : null,
          createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
          updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
        };
    });
    return { success: true, orders: orders };
  } catch (error) {
    logger.error(`Error al obtener las órdenes de servicio: ${error.message}`, error);
    throw new HttpsError('internal', 'No se pudieron obtener las órdenes de servicio.');
  }
});
/**
 * Asigna agentes y un responsable a una Orden de Servicio.
 */
export const assignResourcesToOrder = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  const userRole = request.auth?.token?.role;
  if (userRole !== 'admin' && userRole !== 'supervisor') {
    throw new new HttpsError(
      'permission-denied',
      'Solo los administradores o supervisores pueden asignar recursos.'
    )();
  }

  const { orderId, agentIds, shiftManagerId } = request.data;

  if (!orderId || !Array.isArray(agentIds)) {
    throw new new HttpsError(
      'invalid-argument',
      'Se requiere un ID de orden y una lista de IDs de agentes.'
    )();
  }

  if (agentIds.length > 0 && !shiftManagerId) {
    throw new new HttpsError(
      'invalid-argument',
      'Debe seleccionar un responsable para el turno si hay agentes asignados.'
    )();
  }

  try {
    const orderRef = getDb().collection('serviceOrders').doc(orderId);

    const agentIdsAsString = agentIds.map(String);
    const managerIdAsString = shiftManagerId ? String(shiftManagerId) : null;

    await orderRef.update({
      assigned_agents: agentIdsAsString,
      shift_manager_id: managerIdAsString, // ✅ Se guarda el responsable
      status: 'assigned',
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, message: 'Recursos asignados y orden actualizada con éxito.' };
  } catch (error) {
    logger.error('Error al asignar recursos a la orden:', error);
    throw new new HttpsError('internal', 'Ocurrió un error al intentar asignar los recursos.')();
  }
});

/**
 * Inicia una Orden de Servicio, cambiando su estado y creando un Parte de Servicio asociado.
 * AÑADIDA VERIFICACIÓN para asegurar que solo se ejecuta en órdenes con estado 'assigned'.
 */
export const startServiceOrder = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
  }

  const { orderId } = request.data;
  if (!orderId) {
    throw new HttpsError('invalid-argument', 'Se requiere un ID de orden.');
  }

  const userAgentId = request.auth.token.agentId;
  if (!userAgentId) {
    throw new HttpsError('permission-denied', 'El usuario no tiene un ID de agente asociado.');
  }

  const db = getDb();
  const orderRef = db.collection('serviceOrders').doc(orderId);
  const reportRef = db.collection('serviceReports').doc();

  try {
    logger.info(`Iniciando transacción para la orden: ${orderId} por el agente ${userAgentId}`);

    const reportId = await db.runTransaction(async (transaction) => {
      const orderDoc = await transaction.get(orderRef);

      if (!orderDoc.exists) {
        throw new HttpsError('not-found', 'La orden de servicio no existe.');
      }

      const orderData = orderDoc.data();
      logger.info(
        `Estado actual de la orden ${orderId} antes de la transacción: ${orderData.status}`
      );

      // ✅ VERIFICACIÓN CLAVE: Si la orden ya no está en estado 'assigned', la transacción falla.
      // Esto previene la creación de partes duplicados.
      if (orderData.status !== 'assigned') {
        throw new HttpsError(
          'failed-precondition',
          `La orden ya no está en estado 'assigned'. Estado actual: ${orderData.status}. No se creará un nuevo parte.`
        );
      }

      if (!orderData.assigned_agents || !orderData.assigned_agents.includes(userAgentId)) {
        throw new HttpsError(
          'permission-denied',
          'No tienes permiso para iniciar esta orden de servicio.'
        );
      }

      // 💡 CORREGIDO: Obtener la fecha de servicio de la orden para el parte
      // Puede ser un Timestamp de Firestore o un string ISO
      let serviceDateTimestamp;
      if (orderData.service_date) {
        if (orderData.service_date.toDate) {
          // Ya es un Timestamp de Firestore
          serviceDateTimestamp = orderData.service_date;
        } else if (typeof orderData.service_date === 'string') {
          // Es un string ISO, convertir a Date y luego a Timestamp
          serviceDateTimestamp = admin.firestore.Timestamp.fromDate(new Date(orderData.service_date));
        } else if (orderData.service_date instanceof Date) {
          // Es un objeto Date
          serviceDateTimestamp = admin.firestore.Timestamp.fromDate(orderData.service_date);
        }
      }
      
      // Si no se pudo obtener, usar la fecha actual
      if (!serviceDateTimestamp) {
        logger.warn(`La orden ${orderId} no tiene service_date válida, usando fecha actual.`);
        serviceDateTimestamp = admin.firestore.Timestamp.now();
      }

      // Actualizamos el estado de la orden
      transaction.update(orderRef, {
        status: 'in_progress',
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 💡 CORREGIDO: Añadido service_date_timestamp y service_shift
      const newReport = {
        order_id: orderId,
        status: 'open',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        assigned_agents: orderData.assigned_agents,
        created_by_user_id: request.auth.uid,
        // ✅ NUEVOS CAMPOS para filtrado y ordenación
        service_date_timestamp: serviceDateTimestamp,
        service_shift: orderData.service_shift || null,
      };
      transaction.set(reportRef, newReport);

      logger.info(
        `Transacción para la orden ${orderId} completada con éxito. Nuevo parte ID: ${reportRef.id}`
      );
      return reportRef.id;
    });

    return { success: true, message: 'Servicio iniciado correctamente.', reportId: reportId };
  } catch (error) {
    logger.error(`FALLO en la transacción para la orden ${orderId}:`, error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Ocurrió un error en el servidor al iniciar el servicio.');
  }
});

/**
 * Completa una Orden de Servicio, cambiando su estado a 'completed' y cerrando el Parte de Servicio asociado.
 * Requiere que el usuario sea uno de los agentes asignados a la orden.
 */
export const completeServiceOrder = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
  }

  const { orderId, reportId, completionNotes } = request.data;
  if (!orderId || !reportId) {
    throw new HttpsError('invalid-argument', 'Se requiere un ID de orden y un ID de parte.');
  }

  const userAgentId = request.auth.token.agentId;
  if (!userAgentId) {
    throw new HttpsError('permission-denied', 'El usuario no tiene un ID de agente asociado.');
  }

  const db = getDb();
  const orderRef = db.collection('serviceOrders').doc(orderId);
  const reportRef = db.collection('serviceReports').doc(reportId);

  try {
    await db.runTransaction(async (transaction) => {
      const orderDoc = await transaction.get(orderRef);
      const reportDoc = await transaction.get(reportRef);

      if (!orderDoc.exists) {
        throw new HttpsError('not-found', 'La orden de servicio no existe.');
      }
      if (!reportDoc.exists) {
        throw new HttpsError('not-found', 'El parte de servicio asociado no existe.');
      }

      const orderData = orderDoc.data();
      const reportData = reportDoc.data();

      if (
        !orderData.assigned_agents ||
        (!orderData.assigned_agents.includes(userAgentId) &&
          request.auth.token.role !== 'admin' &&
          request.auth.token.role !== 'mando')
      ) {
        throw new HttpsError(
          'permission-denied',
          'No tienes permiso para completar esta orden de servicio.'
        );
      }

      if (orderData.status !== 'in_progress' && orderData.status !== 'assigned') {
        throw new HttpsError(
          'failed-precondition',
          `La orden no puede ser completada. Estado actual: ${orderData.status}.`
        );
      }

      transaction.update(orderRef, {
        status: 'completed',
        completion_notes: completionNotes || '',
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        completed_by_user_id: request.auth.uid,
      });

      transaction.update(reportRef, {
        status: 'closed',
        closed_at: admin.firestore.FieldValue.serverTimestamp(),
        completion_notes: completionNotes || reportData.completion_notes || '',
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    return { success: true, message: 'Orden de servicio completada y parte cerrado con éxito.' };
  } catch (error) {
    logger.error(`Error al completar la orden ${orderId} y parte ${reportId}:`, error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Ocurrió un error en el servidor al completar el servicio.');
  }
});



/**
 * Añade una nueva entrada (novedad) a la Bitácora de un Parte.
 * CORREGIDO: Ahora escribe en 'reportEntries', no en 'requerimientos'.
 */
export const addReportEntry = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
  }

  const { reportId, description, priority } = request.data; // Añadido priority
  if (!reportId || !description) {
    throw new HttpsError('invalid-argument', 'Faltan datos (reportId, description).');
  }

  const userAgentId = request.auth.token.agentId;
  // Intentamos obtener el nombre del agente del token si existe, o un genérico
  const agentName = request.auth.token.name || `Agente ${userAgentId}`; 

  const db = getDb();
  const reportRef = db.collection('serviceReports').doc(reportId);

  try {
    // 1. Referencia a la colección CORRECTA
    const entryRef = reportRef.collection('reportEntries').doc();

    // 2. Guardar con los campos correctos para la Bitácora
    await entryRef.set({
      description: description,
      priority: priority || 'normal', // 'normal' o 'urgente'
      createdByAgentId: userAgentId,
      createdByAgentName: agentName, 
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      entry_time: admin.firestore.FieldValue.serverTimestamp() // Por compatibilidad
    });

    logger.info(`Novedad añadida a la bitácora del parte ${reportId} por ${userAgentId}`);
    return { success: true, id: entryRef.id };

  } catch (error) {
    logger.error(`Error al añadir entrada al parte ${reportId}:`, error);
    throw new HttpsError('internal', 'No se pudo añadir la novedad.');
  }
});

/**
 * Busca y devuelve el ID del Parte de Servicio asociado a una Orden de Servicio.
 */
export const getReportForOrder = onCall({ region: 'us-central1', cors: true }, async (request) => {
  if (!request.auth || !request.auth.token.agentId) {
    throw new HttpsError(
      'unauthenticated',
      'El usuario debe estar autenticado y tener un ID de agente.'
    );
  }

  const { orderId } = request.data;
  if (!orderId) {
    throw new HttpsError('invalid-argument', 'Se requiere proporcionar un ID de orden (orderId).');
  }

  logger.info(
    `Buscando parte de servicio para la orden: ${orderId} por el agente: ${request.auth.token.agentId}`
  );

  try {
    const db = getDb();
    const reportsRef = db.collection('serviceReports');

    const snapshot = await reportsRef.where('order_id', '==', orderId).limit(1).get();

    if (snapshot.empty) {
      logger.warn(`No se encontró un parte de servicio para la orden: ${orderId}`);
      throw new HttpsError(
        'not-found',
        'No se encontró un parte de servicio asociado a esta orden.'
      );
    }

    const reportDoc = snapshot.docs[0];
    logger.info(`Parte de servicio encontrado con ID: ${reportDoc.id} para la orden: ${orderId}`);

    return { success: true, reportId: reportDoc.id };
  } catch (error) {
    logger.error(`Error catastrófico buscando el parte para la orden ${orderId}:`, error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError(
      'internal',
      'Ocurrió un error inesperado en el servidor al buscar el parte de servicio.'
    );
  }
});

/**
 * Finaliza y envía un Parte de Servicio para su revisión.
 */
export const submitServiceReport = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
  }
  const { reportId } = request.data;
  if (!reportId) {
    throw new HttpsError('invalid-argument', 'Se requiere un ID del parte de servicio.');
  }

  const db = getDb();
  const reportRef = db.collection('serviceReports').doc(reportId);

  try {
    await reportRef.update({
      status: 'pending_review',
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true, message: 'Parte de servicio enviado para revisión.' };
  } catch (error) {
    logger.error(`Error al enviar el parte ${reportId}:`, error);
    throw new HttpsError('internal', 'No se pudo enviar el parte para revisión.');
  }
});

/**
 * Permite a un mando validar o devolver un Parte de Servicio.
 * ✅ AHORA TAMBIÉN ACTUALIZA LA ORDEN DE SERVICIO A 'completed' SI SE VALIDA.
 */
export const validateServiceReport = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  if (
    !request.auth ||
    (request.auth.token.role !== 'admin' && request.auth.token.role !== 'supervisor')
  ) {
    throw new HttpsError('permission-denied', 'Solo los mandos pueden validar partes de servicio.');
  }

  const { reportId, newStatus, comments } = request.data;
  if (!reportId || !newStatus || !['validated', 'returned'].includes(newStatus)) {
    throw new HttpsError(
      'invalid-argument',
      "Se requiere un ID de parte y un nuevo estado válido ('validated' o 'returned')."
    );
  }

  const db = getDb();
  const reportRef = db.collection('serviceReports').doc(reportId);

  try {
    const reportDoc = await reportRef.get();

    // ✅ SINTAXIS CORREGIDA: Se usa .exists en lugar de .exists()
    if (!reportDoc.exists) {
      throw new HttpsError('not-found', 'El parte de servicio no existe.');
    }

    const updateData = {
      status: newStatus,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      validated_by_user_id: request.auth.uid,
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
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        logger.info(`Orden ${orderId} marcada como 'completed' tras la validación del parte.`);
      }
    }

    return { success: true, message: 'El estado del parte ha sido actualizado.' };
  } catch (error) {
    logger.error(`[ERROR FATAL] La función validateServiceReport ha fallado:`, error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError(
      'internal',
      'No se pudo actualizar el estado del parte. Revisa los logs de la función.'
    );
  }
});
/**
 * [MODIFICADO DEBUG] Obtiene una lista de Partes de Servicio con filtros opcionales.
 * 🛑 FILTRO DE FECHA TEMPORALMENTE DESACTIVADO PARA DIAGNÓSTICO.
 */
export const getServiceReports = onCall(async (request) => {
  logger.info('Iniciando getServiceReports', { auth: request.auth?.uid });

  if (!request.auth || !request.auth.uid) {
    logger.warn('Llamada no autenticada a getServiceReports');
    throw new HttpsError('unauthenticated', 'El usuario no está autenticado.');
  }

  try {
    const filters = request.data.filters || {};
    const db = getDb(); // Asegúrate de tener tu función getDb() o admin.firestore()
    let query = db.collection('serviceReports');

    logger.info('Aplicando filtros:', filters);

    // --- Filtro por Estado ---
    if (filters.status && filters.status !== 'all') {
      query = query.where('status', '==', filters.status);
    }

    // --- Filtro por Agente ---
    if (filters.agentId && filters.agentId !== 'all') {
      query = query.where('assignedAgentIds', 'array-contains', filters.agentId);
    }

    // --- INICIO DE LA PRUEBA DE DEBUGGING: COMENTAR FILTRO DE FECHA ---
    const year = parseInt(filters.year, 10);
    const month = parseInt(filters.month, 10);

    if (!isNaN(year) && !isNaN(month)) {
      
      const jsMonth = month - 1; 
      const startDate = new Date(year, jsMonth, 1);
      const endDate = new Date(year, jsMonth + 1, 0, 23, 59, 59);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          logger.error('Error al crear fechas válidas', { year, month });
          throw new HttpsError('invalid-argument', 'Valores de fecha inválidos.');
      }

      logger.info(`Filtrando por rango de fechas: ${startDate.toISOString()} a ${endDate.toISOString()} (DESACTIVADO)`);
      
      // 🛑 LÍNEAS COMENTADAS PARA DEPURACIÓN 🛑
      // query = query.where('service_date_timestamp', '>=', startDate);
      // query = query.where('service_date_timestamp', '<=', endDate);

    } else {
      logger.info('No se aplicó filtro de fecha (año/mes inválidos o "all")');
    }
    // --- FIN DEL BLOQUE DE PRUEBA DE DEBUGGING ---


    // Ordenar (Esta línea DEBE permanecer)
    query = query.orderBy('service_date_timestamp', 'desc');

    // Limitar la consulta para evitar sobrecostos
    query = query.limit(100); 

    const snapshot = await query.get();

    if (snapshot.empty) {
      logger.info('No se encontraron partes de servicio con esos filtros.');
      return { reports: [] };
    }

    const reports = snapshot.docs.map(doc => {
      const data = doc.data();
      // Convertir Timestamps a strings ISO para el cliente
      if (data.service_date_timestamp && data.service_date_timestamp.toDate) {
        data.service_date_timestamp = data.service_date_timestamp.toDate().toISOString();
      }
      if (data.createdAt && data.createdAt.toDate) {
        data.createdAt = data.createdAt.toDate().toISOString();
      }
      
      return {
        id: doc.id,
        ...data
      };
    });

    logger.info(`Devolviendo ${reports.length} partes de servicio.`);
    return { reports };

  } catch (error) {
    logger.error(`[ERROR FATAL] La función getServiceReports ha fallado:`, error);
    throw new HttpsError('internal', `Error interno al obtener los partes: ${error.message}`);
  }
});

// ==============================================================================
// === SOLUCIÓN DEFINITIVA: FUNCIÓN PARA OBTENER PARTES ACTIVOS DEL AGENTE ===
// ==============================================================================
// REEMPLAZA LA FUNCIÓN ENTERA CON ESTA VERSIÓN DEFINITIVA Y ROBUSTA
export const getActiveOrdersForAgentCallable = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  // Verificación de seguridad
  if (!request.auth || !request.auth.token.agentId) {
    throw new HttpsError('unauthenticated', 'Autenticación requerida o ID de agente no encontrado en el token.');
  }

  const agentId = request.auth.token.agentId;
  const db = getDb();

  // Usamos el logger de Firebase para ver los resultados en la consola de Google Cloud
  const logger = functions.logger; // Asegúrate que 'functions' está importado al inicio del archivo

  logger.info(`--- INICIO para Agente: ${agentId} ---`);

  try {
    // --- LÓGICA DE FECHAS DEFINITIVA ---
    const nowUTC = new Date();
    const nowInMadrid = toZonedTime(nowUTC, MADRID_TIMEZONE);
    const startOfToday = startOfDay(nowInMadrid);
    const endOfToday = endOfDay(nowInMadrid);

    logger.info(`Rango de búsqueda (Madrid Time): ${startOfToday.toISOString()} a ${endOfToday.toISOString()}`);
    
    const ordersRef = db.collection('serviceOrders');

    // Consultas al backend (sin fecha)
    const queryAssigned = ordersRef
      .where('assigned_agents', 'array-contains', agentId)
      .where('status', '==', 'assigned');

    const queryInProgress = ordersRef
      .where('assigned_agents', 'array-contains', agentId)
      .where('status', '==', 'in_progress');

    const [assignedSnapshot, inProgressSnapshot] = await Promise.all([
      queryAssigned.get(),
      queryInProgress.get(),
    ]);
    
    let combinedOrders = [];
    assignedSnapshot.forEach(doc => combinedOrders.push({ id: doc.id, ...doc.data() }));
    inProgressSnapshot.forEach(doc => combinedOrders.push({ id: doc.id, ...doc.data() }));

    logger.info(`Paso 1: Se encontraron ${combinedOrders.length} partes en total para el agente.`);

    // =============================================
    // 💡 INICIO DE LA CORRECCIÓN (FILTRO)
    // =============================================
    const ordersForToday = combinedOrders.filter(order => {
        // ✅ FIABILIDAD: Añadir comprobación de nulidad y tipo
        if (!order.service_date || typeof order.service_date.toDate !== 'function') {
            logger.warn(`Orden ${order.id} omitida (filtro): service_date está ausente o no es un Timestamp.`);
            return false;
        }
        const serviceDate = order.service_date.toDate();
        const isMatch = serviceDate >= startOfToday && serviceDate <= endOfToday;
        logger.info(`  - Evaluando Orden ${order.id} | Fecha DB: ${serviceDate.toISOString()} | ¿Coincide?: ${isMatch}`);
        return isMatch;
    });
    // =============================================
    // 💡 FIN DE LA CORRECCIÓN (FILTRO)
    // =============================================

    logger.info(`Paso 2: Después de filtrar por fecha, quedan ${ordersForToday.length} partes para hoy.`);

    if (ordersForToday.length === 0) {
        logger.info("--- FIN: No se encontraron partes para hoy. ---");
        return { success: true, orders: [] };
    }

    const finalOrders = await Promise.all(
      ordersForToday.map(async (orderData) => {
        const order = {
          ...orderData,
          // =============================================
          // 💡 INICIO DE LA CORRECCIÓN (MAP)
          // =============================================
          // ✅ FIABILIDAD: Usar optional chaining (?) para evitar crashes si un campo es null
          service_date: orderData.service_date?.toDate().toISOString() || null,
          created_at: orderData.created_at?.toDate().toISOString() || null,
          updated_at: orderData.updated_at?.toDate().toISOString() || null,
          // =============================================
          // 💡 FIN DE LA CORRECCIÓN (MAP)
          // =============================================
        };

        if (order.status === 'in_progress') {
          const reportQuery = db.collection('serviceReports').where('order_id', '==', order.id).limit(1);
          const reportSnap = await reportQuery.get();
          if (!reportSnap.empty) {
            order.reportId = reportSnap.docs[0].id;
          }
        }
        return order;
      })
    );
    
    logger.info(`--- FIN: Devolviendo ${finalOrders.length} partes al cliente. ---`);
    return { success: true, orders: finalOrders };

  } catch (error) {
    logger.error(`Error en getActiveOrdersForAgentCallable para agentId ${agentId}:`, error);
    throw new HttpsError('internal', 'No se pudieron obtener las órdenes de servicio.');
  }
});


/**
 * Función de ayuda ROBUSTA para encontrar agentes en un turno específico del cuadrante.
 * Recorre la estructura weeks -> days -> shifts independientemente de las claves.
 */
function findAgentsOnShiftInSchedule(dateString, shiftCode, scheduleData) {
  // Normalizar turno (M, T, N)
  const targetShift = shiftCode.toUpperCase(); 
  const agentIds = [];

  if (!scheduleData || !scheduleData.weeks) {
    logger.warn(`[findAgents] Estructura de cuadrante inválida o vacía.`);
    return [];
  }

  // Recorrer Semanas
  Object.values(scheduleData.weeks).forEach(week => {
    if (!week.days) return;

    // Recorrer Días
    Object.values(week.days).forEach(day => {
      // Comparación estricta de fecha (YYYY-MM-DD)
      if (day.date === dateString) {
        if (day.shifts) {
          // Recorrer Turnos del día encontrado
          Object.values(day.shifts).forEach(shift => {
             // Comparar tipo de turno (M, T, N)
             if (shift.shiftType && shift.shiftType.toUpperCase() === targetShift) {
                agentIds.push(String(shift.agentId));
             }
          });
        }
      }
    });
  });

  return agentIds;
}

/**
 * Permite a un administrador o supervisor actualizar los detalles de una Orden de Servicio.
 * Esta función no tiene restricciones de fecha o estado para los roles de mando.
 */
export const updateServiceOrder = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  // 1. Verificación de permisos: Solo admin o supervisor pueden ejecutarla.
  const userRole = request.auth?.token?.role;
  if (userRole !== 'admin' && userRole !== 'supervisor') {
    throw new HttpsError(
      'permission-denied',
      'Solo los administradores o supervisores pueden editar órdenes.'
    );
  }

  // 2. Validación de los datos recibidos desde el frontend.
  const { orderId, updateData } = request.data;
  if (!orderId || !updateData) {
    throw new HttpsError(
      'invalid-argument',
      'Se requiere un ID de orden y los datos a actualizar.'
    );
  }

  const db = getDb();
  const orderRef = db.collection('serviceOrders').doc(orderId);

  try {
    // 3. Preparamos los datos para la actualización.
    // Convertimos la fecha de texto a Timestamp de Firestore.
    const finalUpdateData = {
      ...updateData,
      service_date: admin.firestore.Timestamp.fromDate(parseISO(updateData.service_date)),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    // 4. Ejecutamos la actualización en la base de datos.
    await orderRef.update(finalUpdateData);

    logger.info(`La orden ${orderId} fue actualizada por un ${userRole}.`);
    return { success: true, message: 'Orden de servicio actualizada con éxito.' };
  } catch (error) {
    logger.error(`Error al actualizar la orden ${orderId}:`, error);
    throw new HttpsError('internal', 'No se pudo actualizar la orden de servicio.');
  }
});

/**
 * Elimina una Orden de Servicio.
 * Solo puede ser ejecutado por un admin o supervisor.
 */
export const deleteServiceOrder = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  const userRole = request.auth?.token?.role;
  if (userRole !== 'admin' && userRole !== 'supervisor') {
    throw new HttpsError(
      'permission-denied',
      'Solo los administradores o supervisores pueden eliminar órdenes.'
    );
  }

  const { orderId } = request.data;
  if (!orderId) {
    throw new HttpsError('invalid-argument', 'Se requiere un ID de orden para eliminarla.');
  }

  const db = getDb();
  const orderRef = db.collection('serviceOrders').doc(orderId);

  try {
    // Opcional: Aquí se podría añadir lógica para borrar también los partes de servicio asociados.
    // Por ahora, solo eliminamos la orden.

    await orderRef.delete();

    logger.info(`La orden ${orderId} fue eliminada por un ${userRole}.`);
    return { success: true, message: 'Orden de servicio eliminada con éxito.' };
  } catch (error) {
    logger.error(`Error al eliminar la orden ${orderId}:`, error);
    throw new HttpsError('internal', 'No se pudo eliminar la orden de servicio.');
  }
});

// ==================================================================
// === FUNCIÓN CON LA CORRECCIÓN FINAL PARA EL ERROR 500 ============
// ==================================================================
/**
 * Permite a un agente o mando actualizar el estado y la geolocalización de un ítem del checklist.
 * Almacena la ubicación y la marca de tiempo del servidor cuando un ítem se marca como completado.
 */
export const updateChecklistItemStatus = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
  }

  // Se leen los nuevos parámetros: newStatus y comment
  const { reportId, orderId, itemIndex, newStatus, comment, geolocation } = request.data;

  // Se valida que los parámetros necesarios estén presentes
  if (!reportId || !orderId || itemIndex === undefined || !newStatus) {
    throw new HttpsError(
      'invalid-argument',
      'Faltan datos requeridos (reportId, orderId, itemIndex, newStatus).'
    );
  }

  if (
    geolocation &&
    (typeof geolocation.latitude !== 'number' || typeof geolocation.longitude !== 'number')
  ) {
    throw new HttpsError('invalid-argument', "El objeto 'geolocation' es inválido.");
  }

  const userAgentId = request.auth.token.agentId;
  const db = getDb();
  const orderRef = db.collection('serviceOrders').doc(orderId);

  try {
    await db.runTransaction(async (transaction) => {
      const orderDoc = await transaction.get(orderRef);
      if (!orderDoc.exists) {
        throw new HttpsError('not-found', 'La orden de servicio asociada no existe.');
      }

      const orderData = orderDoc.data();
      const isAssigned = orderData.assigned_agents?.includes(userAgentId);
      if (!isAssigned) {
        throw new HttpsError(
          'permission-denied',
          'No tienes permiso para modificar este checklist.'
        );
      }

      const checklist = orderData.checklist || [];
      if (itemIndex < 0 || itemIndex >= checklist.length) {
        throw new HttpsError('out-of-range', 'El índice del ítem del checklist es inválido.');
      }

      const updatedChecklist = [...checklist];
      const itemToUpdate = updatedChecklist[itemIndex];

      // ✅ SE ACTUALIZAN LOS CAMPOS CON LA NUEVA ESTRUCTURA
      itemToUpdate.status = newStatus; // 'pendiente' o 'realizado'
      itemToUpdate.comment = comment || ''; // Se guarda el comentario o un texto vacío
      itemToUpdate.completed = newStatus === 'realizado'; // Se mantiene por compatibilidad

      if (newStatus === 'realizado') {
        itemToUpdate.completed_at = new Date(); // Usar la fecha del servidor es más robusto
        if (geolocation) {
          itemToUpdate.completed_location = new admin.firestore.GeoPoint(
            geolocation.latitude,
            geolocation.longitude
          );
        }
      } else {
        // Si vuelve a "pendiente", se eliminan los datos de finalización
        delete itemToUpdate.completed_at;
        delete itemToUpdate.completed_location;
      }

      transaction.update(orderRef, {
        checklist: updatedChecklist,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    logger.info(`Checklist item [${itemIndex}] en orden ${orderId} actualizado a '${newStatus}'.`);
    return { success: true, message: 'Checklist actualizado correctamente.' };
  } catch (error) {
    logger.error(`Error al actualizar ítem del checklist en orden ${orderId}:`, error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'No se pudo actualizar el ítem del checklist.');
  }
});

// ✅ Cloud Function updateRequerimientoStatus (versión final y limpia)
/**
 * Cloud Function para actualizar el estado y/o el comentario de un requerimiento.
 * Recibe reportId, orderId, requerimientoId, newStatus, comment (opcional), geolocation (opcional).
 *
 * Confiamos en los custom claims del token de autenticación para rol y agentId.
 */
export const updateRequerimientoStatus = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  logger.info('--- Inicio de updateRequerimientoStatus (VERSION FINAL Y LIMPIA) ---');

  // 1. Verificación de Autenticación (Ahora funcionará al recibir el token correctamente)
  if (!request.auth) {
    logger.warn('Intento de llamada a updateRequerimientoStatus sin autenticación.');
    throw new HttpsError(
      'unauthenticated',
      'Solo usuarios autenticados pueden actualizar requerimientos.'
    );
  }

  // 2. Obtener los datos del usuario directamente del token de autenticación (Custom Claims)
  const userId = request.auth.uid;
  const userRole = request.auth.token.role;
  const userAgentId = request.auth.token.agentId; // Este es el agentId del usuario logeado

  logger.info(`Usuario UID: ${userId}, Rol: ${userRole}, AgentId: ${userAgentId}`);

  // Validar que el userAgentId exista en el token (es un claim crítico para permisos)
  if (!userAgentId) {
    logger.error(`Usuario ${userId} no tiene un agentId en el token de autenticación.`);
    throw new HttpsError(
      'permission-denied',
      'Tu cuenta de usuario no tiene un ID de agente asociado. Contacta con soporte.'
    );
  }

  // 3. Validación de datos de entrada
  const { reportId, orderId, requerimientoId, newStatus, comment, geolocation } = request.data;
  if (!reportId || !orderId || !requerimientoId || !newStatus) {
    logger.error('Faltan datos requeridos para updateRequerimientoStatus.', {
      reportId,
      orderId,
      requerimientoId,
      newStatus,
    });
    throw new HttpsError(
      'invalid-argument',
      'Faltan datos requeridos (reportId, orderId, requerimientoId, newStatus).'
    );
  }

  if (newStatus !== 'pendiente' && newStatus !== 'realizado') {
    logger.error(`Estado de requerimiento inválido recibido: ${newStatus}`);
    throw new HttpsError(
      'invalid-argument',
      'El estado del requerimiento no es válido. Debe ser "pendiente" o "realizado".'
    );
  }

  // Validación de geolocalización, si se proporciona
  if (
    geolocation &&
    (typeof geolocation.latitude !== 'number' || typeof geolocation.longitude !== 'number')
  ) {
    logger.error('Objeto "geolocation" inválido.', geolocation);
    throw new HttpsError('invalid-argument', "El objeto 'geolocation' es inválido.");
  }

  const db = getDb(); // Obtener la instancia de Firestore

  // Referencias a los documentos
  const requerimientoRef = db
    .collection('serviceReports')
    .doc(reportId)
    .collection('requerimientos')
    .doc(requerimientoId);
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
        logger.warn(
          `Permiso denegado para el usuario ${userId} (Agente: ${userAgentId}, Rol: ${userRole}) para actualizar el requerimiento ${requerimientoId}.`
        );
        throw new HttpsError(
          'permission-denied',
          'No tienes permiso para actualizar este requerimiento.'
        );
      }

      // 5. Verificar que el parte esté en estado 'open' o 'returned' para poder modificar el requerimiento
      if (reportData.status !== 'open' && reportData.status !== 'returned') {
        logger.warn(
          `Intento de actualizar requerimiento en un parte con estado no modificable: ${reportData.status}`
        );
        throw new HttpsError(
          'failed-precondition',
          `No se puede actualizar un requerimiento de un parte en estado '${reportData.status}'.`
        );
      }

      // 6. Preparar los datos de actualización para el requerimiento
      const updatePayload = {
        status: newStatus,
        comment: comment || '', // Asegura que el comentario sea una cadena vacía si es null/undefined
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (newStatus === 'realizado') {
        updatePayload.isResolved = true; // Campo existente para compatibilidad
        updatePayload.resolvedAt = admin.firestore.FieldValue.serverTimestamp();
        if (geolocation) {
          // Crea un GeoPoint de Firestore si hay datos de geolocalización válidos
          updatePayload.resolvedLocation = new admin.firestore.GeoPoint(
            geolocation.latitude,
            geolocation.longitude
          );
        }
        updatePayload.resolvedBy = userId; // ID del usuario que lo resolvió
      } else {
        // Si el estado vuelve a 'pendiente'
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
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
export const updateReportSummary = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
  }

  const { reportId, summaryData } = request.data;
  if (!reportId || typeof summaryData !== 'object') {
    throw new HttpsError('invalid-argument', 'Se requiere un ID de parte y un objeto de resumen.');
  }

  const userAgentId = request.auth.token.agentId;
  const db = getDb();
  const reportRef = db.collection('serviceReports').doc(reportId);

  try {
    const reportDoc = await reportRef.get();
    if (!reportDoc.exists) {
      throw new HttpsError('not-found', 'El parte de servicio no existe.');
    }

    const reportData = reportDoc.data();
    if (!reportData.assigned_agents || !reportData.assigned_agents.includes(userAgentId)) {
      throw new HttpsError('permission-denied', 'No tienes permiso para modificar este parte.');
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
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, message: 'Resumen guardado correctamente.' };
  } catch (error) {
    logger.error(`Error al actualizar el resumen para el parte ${reportId}:`, error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Ocurrió un error al guardar el resumen.');
  }
});

// === FIN DE LA FUNCIÓN MODIFICADA =================================

// --- Cloud Functions (EXISTENTES) ---

/**
 * Añade un nuevo requerimiento a la subcolección de un parte de servicio.
 * Verifica que el usuario que lo añade esté asignado al parte.
 */
export const addRequerimiento = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
  }

  // ✅ CAMBIO 1: Se espera recibir 'data' en lugar de 'description'
  const { reportId, data } = request.data;

  // ✅ CAMBIO 2: La validación ahora comprueba 'data' y 'data.motivo'
  if (!reportId || !data || !data.motivo || data.motivo.trim() === '') {
    throw new HttpsError(
      'invalid-argument',
      'Se requiere un ID del parte y un motivo válido en los datos.'
    );
  }

  const userAgentId = request.auth.token.agentId;
  const db = getDb();
  const reportRef = db.collection('serviceReports').doc(reportId);

  try {
    // --- Verificación de Permisos (se mantiene igual) ---
    const reportDoc = await reportRef.get();
    if (!reportDoc.exists) {
      throw new HttpsError('not-found', 'El parte de servicio no existe.');
    }
    const reportData = reportDoc.data();
    if (!reportData.assigned_agents || !reportData.assigned_agents.includes(userAgentId)) {
      throw new HttpsError(
        'permission-denied',
        'No tienes permiso para añadir requerimientos a este parte.'
      );
    }
    // --- Fin de la Verificación ---

    const newRequerimientoRef = reportRef.collection('requerimientos').doc();

    // ✅ CAMBIO 3: Se guarda el objeto 'data' completo, no solo la descripción.
    // También se añaden campos estándar.
    await newRequerimientoRef.set({
      ...data, // Guarda todos los campos: hora, tipoContacto, telefono, requirente, motivo
      status: 'pendiente', // Estado inicial
      comment: '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdByAgentId: userAgentId,
    });

    logger.info(
      `Nuevo requerimiento ${newRequerimientoRef.id} añadido al parte ${reportId} por el agente ${userAgentId}`
    );
    return { success: true, id: newRequerimientoRef.id };
  } catch (error) {
    logger.error(`Error al añadir requerimiento al parte ${reportId}:`, error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'No se pudo añadir el requerimiento.');
  }
});
/**
 * Obtiene todos los detalles combinados de un Parte de Servicio y su Orden asociada.
 * Prepara los datos para que el frontend los pueda consumir directamente.
 * (VERSIÓN BLINDADA: Valida que reportId sea un string)
 */
export const getServiceReportDetails = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  
  // 1. Autenticación
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
  }

  // 2. EXTRACCIÓN Y SANITIZACIÓN DEL ID
  let { reportId } = request.data;

  // 💡 CORRECCIÓN: Si el frontend envía un objeto en vez de un string, intentamos extraer el ID
  if (typeof reportId === 'object' && reportId !== null) {
      logger.warn(`[getServiceReportDetails] Se recibió un objeto en lugar de un string ID. Intentando extraer...`);
      reportId = reportId.id || reportId.reportId || reportId._id;
  }

  // 3. Validación Estricta
  if (!reportId || typeof reportId !== 'string') {
    logger.error(`[getServiceReportDetails] ID inválido recibido:`, request.data.reportId);
    throw new HttpsError('invalid-argument', 'Se requiere un ID de parte válido (string).');
  }

  const db = getDb();

  try {
    // Ahora es seguro llamar a .doc() porque reportId es un string
    const reportRef = db.collection('serviceReports').doc(reportId);
    const reportSnap = await reportRef.get();

    if (!reportSnap.exists) {
      throw new HttpsError('not-found', 'El parte de servicio no fue encontrado.');
    }

    const reportData = { id: reportSnap.id, ...reportSnap.data() };

    // 4. Unir los datos de la Orden de Servicio
    if (reportData.order_id) {
      // Validación extra por si order_id viene sucio
      const orderIdString = String(reportData.order_id);
      const orderRef = db.collection('serviceOrders').doc(orderIdString);
      const orderSnap = await orderRef.get();
      
      if (orderSnap.exists) {
        const orderData = orderSnap.data();
        reportData.order = {
          id: orderSnap.id,
          ...orderData,
          // Optional chaining para fechas
          service_date: orderData.service_date?.toDate ? orderData.service_date.toDate().toISOString() : null,
          created_at: orderData.created_at?.toDate ? orderData.created_at.toDate().toISOString() : null,
        };
      }
    }

    // 5. Unir los datos de Requerimientos
    const requerimientosRef = reportRef.collection('requerimientos');
    const requerimientosSnap = await requerimientosRef.orderBy('createdAt', 'asc').get();
    reportData.requerimientos = requerimientosSnap.docs.map((doc) => {
      const reqData = doc.data();
      return {
        id: doc.id,
        ...reqData,
        createdAt: reqData.createdAt?.toDate ? reqData.createdAt.toDate().toISOString() : null,
      };
    });
    
    // 6. 💡 NUEVO: Unir datos de la Bitácora (ReportEntries)
    const entriesRef = reportRef.collection('reportEntries');
    // Ordenamos por fecha de creación descendente para mostrar lo más nuevo primero
    const entriesSnap = await entriesRef.orderBy('createdAt', 'desc').get();
    
    reportData.reportEntries = entriesSnap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        ...d,
        // Convertir Timestamp a string ISO para facilitar el manejo en el frontend
        createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : null, 
        // Mapeo de seguridad por si usaste nombres viejos o faltan datos
        createdByAgentName: d.createdByAgentName || d.author || `Agente ${d.createdByAgentId}`,
        priority: d.priority || 'normal'
      };
    });

    // 7. Unir los datos de Tareas Específicas
    if (reportData.order_id) {
      const tasksRef = db.collection('tareas');
      const tasksQuery = tasksRef.where('orderId', '==', String(reportData.order_id)).orderBy('createdAt', 'asc');
      const tasksSnap = await tasksQuery.get();
      
      reportData.specificTasks = tasksSnap.docs.map(doc => {
          const taskData = doc.data();
          return {
              id: doc.id,
              ...taskData,
              createdAt: taskData.createdAt?.toDate ? taskData.createdAt.toDate().toISOString() : null,
              completedAt: taskData.completedAt?.toDate ? taskData.completedAt.toDate().toISOString() : null,
          };
      });
    }

    return { success: true, report: reportData };

  } catch (error) {
    // Usamos JSON.stringify para ver el objeto si falla, en lugar de [object Object]
    logger.error(`Error al obtener los detalles del parte ${reportId}:`, error);
    
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'No se pudieron obtener los detalles completos del parte.');
  }
});

/**
 * Cambia el estado (resuelto/no resuelto) de un requerimiento específico.
 */
export const toggleRequerimientoStatus = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
  }

  const { reportId, requerimientoId, isResolved } = request.data;
  if (!reportId || !requerimientoId || typeof isResolved !== 'boolean') {
    throw new HttpsError(
      'invalid-argument',
      'Faltan parámetros requeridos (reportId, requerimientoId, isResolved).'
    );
  }

  const db = getDb();
  const requerimientoRef = db
    .collection('serviceReports')
    .doc(reportId)
    .collection('requerimientos')
    .doc(requerimientoId);

  try {
    await requerimientoRef.update({
      isResolved: isResolved,
      resolvedAt: isResolved
        ? admin.firestore.FieldValue.serverTimestamp()
        : admin.firestore.FieldValue.delete(),
    });

    logger.info(`Estado del requerimiento ${requerimientoId} cambiado a ${isResolved}`);
    return { success: true };
  } catch (error) {
    logger.error(`Error al cambiar estado del requerimiento ${requerimientoId}:`, error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'No se pudo actualizar el estado del requerimiento.');
  }
});

export const setCustomUserClaims = onDocumentUpdated(
  { document: 'users/{userId}', region: 'us-central1' },
  async (event) => {
    const afterData = event.data?.after.data();
    if (!afterData) return;
    const userRole = afterData.role || 'guard';
    const agentId = String(afterData.agentId || '');
    try {
      await admin.auth().setCustomUserClaims(event.params.userId, { role: userRole, agentId });
    } catch (error) {
      logger.error(`Error al establecer claims para ${event.params.userId}:`, error);
    }
  }
);

export const addAgentCallable = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  if (request.auth?.token?.role !== 'admin')
    throw new HttpsError('permission-denied', 'Solo administradores.');
  const { id, name, active } = request.data;
  if (!name) throw new HttpsError('invalid-argument', 'El nombre es requerido.');
  try {
    const agentRef = getDb().collection('agents').doc(String(id));
    if (!(await agentRef.get()).exists)
      throw new HttpsError('already-exists', `El ID ${id} ya existe.`);
    await agentRef.set({ name, active, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    return { success: true, agentId: agentRef.id };
  } catch (error) {
    throw new HttpsError('internal', error.message);
  }
});

export const updateAgentCallable = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  if (request.auth?.token?.role !== 'admin')
    throw new HttpsError('permission-denied', 'Solo administradores.');
  const { agentId, updateData } = request.data;
  if (!agentId || !updateData) throw new HttpsError('invalid-argument', 'Faltan datos.');
  try {
    await getDb().collection('agents').doc(String(agentId)).update(updateData);
    return { success: true };
  } catch (error) {
    throw new HttpsError('internal', error.message);
  }
});

export const deleteAgentCallable = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  if (request.auth?.token?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo administradores.');
  }
  const { agentId } = request.data;
  if (!agentId) {
    throw new HttpsError('invalid-argument', 'Falta el ID del agente.');
  }

  try {
    await getDb().collection('agents').doc(String(agentId)).delete();
    return { success: true };
  } catch (error) {
    // Este es el bloque 'catch' correcto y funcional
    logger.error('Error al eliminar agente:', error);
    if (error instanceof HttpsError) {
      throw error; // Re-lanzar el HttpsError original si ya es uno
    }
    // Para cualquier otro tipo de error, crea un HttpsError nuevo
    throw new HttpsError(
      'internal',
      'Ocurrió un error en el servidor al intentar eliminar el agente.'
    );
  }
});

export const setSupervisorRole = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
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
    logger.info(
      `Rol 'supervisor' asignado a ${email} (UID: ${user.uid}) por el admin ${request.auth.uid}`
    );
    return { result: `Rol 'supervisor' asignado correctamente a ${email}` };
  } catch (error) {
    logger.error('Error al asignar rol de supervisor:', error);
    if (error.code === 'auth/user-not-found') {
      throw new HttpsError('not-found', 'No se encontró ningún usuario con ese email.');
    }
    throw new HttpsError('internal', 'Ocurrió un error interno al intentar asignar el rol.');
  }
});

export const initializeMonth = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  if (request.auth?.token?.role !== 'admin')
    throw new HttpsError('permission-denied', 'Solo administradores.');
  const { monthId, year, monthIndex, peopleToInitialize } = request.data;
  if (!monthId || !Array.isArray(peopleToInitialize))
    throw new HttpsError('invalid-argument', 'Faltan datos.');
  const scheduleRef = getDb().collection('schedules').doc(monthId);
  return getDb().runTransaction(async (transaction) => {
    // Corregida la condición: Comprobamos si el documento NO EXISTE para poder crearlo
    if ((await transaction.get(scheduleRef)).exists) {
      logger.info(`Documento de cuadrante ${monthId} ya existe. No se inicializará de nuevo.`);
      return { status: 'already_exists', message: 'El mes ya ha sido inicializado.' };
    }

    const firstDay = toZonedTime(new Date(year, monthIndex, 1), MADRID_TIMEZONE);
    const startOffset = (firstDay.getDay() + 6) % 7; // Lunes = 0, Domingo = 6
    let currentDay = addDays(firstDay, -startOffset);
    const initialWeeksData = {};

    for (let w = 0; w < 6; w++) {
      // Un mes puede extenderse en 6 semanas
      const weekDays = {};
      for (let d = 0; d < 7; d++) {
        // 7 días a la semana
        weekDays[d] = {
          date: getDateStringInMadridTimezone(currentDay),
          name: format(currentDay, 'EEE', { locale: es }), // Ej. 'lun', 'mar'
          number: format(currentDay, 'd'), // Ej. '1', '15'
          isCurrentMonth: currentDay.getMonth() === monthIndex,
          shifts: Object.fromEntries(
            peopleToInitialize.map((id) => [
              `agent_${id}`,
              { agentId: String(id), shiftType: 'Libre' },
            ])
          ),
        };
        currentDay = addDays(currentDay, 1);
      }
      initialWeeksData[`week${w}`] = { days: weekDays };
    }

    const agentDocs = await getDb()
      .collection('agents')
      .where(admin.firestore.FieldPath.documentId(), 'in', peopleToInitialize.map(String))
      .get();
    const peopleMap = Object.fromEntries(
      agentDocs.docs.map((doc) => [doc.id, { id: doc.id, ...doc.data() }])
    );

    transaction.set(scheduleRef, {
      weeks: initialWeeksData,
      people: peopleMap,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { status: 'success', message: 'Mes inicializado correctamente.' };
  });
});

export const updateShiftV2 = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  if (request.auth?.token?.role !== 'admin')
    throw new HttpsError('permission-denied', 'Solo administradores.');
  
  // 💡 AÑADIDO: currentShiftType
  const { monthId, weekKey, dayKey, agentId, newShiftType, currentShiftType } = request.data;
  
  if (!monthId || !weekKey || !dayKey || !agentId)
    throw new HttpsError('invalid-argument', 'Faltan datos.');
  
  try {
    const scheduleRef = getDb().collection('schedules').doc(monthId);
    const dayShiftsPath = `weeks.${weekKey}.days.${dayKey}.shifts`;
    const scheduleDoc = await scheduleRef.get();
    
    if (!scheduleDoc.exists) {
      logger.warn(`Documento de cuadrante ${monthId} no existe al intentar actualizar turno.`);
      return { success: false, message: 'Cuadrante no encontrado' };
    }
    
    const shifts = scheduleDoc.data().weeks?.[weekKey]?.days?.[dayKey]?.shifts || {};
    
    // 💡 CAMBIO CLAVE: Buscar por agentId Y shiftType si se proporciona currentShiftType
    let shiftKey;
    
    if (currentShiftType) {
        // Buscar el turno específico (ej: el "R" de refuerzo, no el "M" de mañana)
        shiftKey = Object.keys(shifts).find((k) => 
            String(shifts[k].agentId) === String(agentId) && 
            shifts[k].shiftType === currentShiftType
        );
        logger.info(`Buscando turno específico: agentId=${agentId}, shiftType=${currentShiftType}, encontrado=${shiftKey}`);
    }
    
    // Si no se encontró con shiftType específico, buscar solo por agentId (comportamiento original)
    if (!shiftKey) {
        shiftKey = Object.keys(shifts).find((k) => String(shifts[k].agentId) === String(agentId)) ||
            `agent_${agentId}`;
    }
    
    // Actualizar o eliminar
    if (newShiftType && newShiftType !== '-') {
      await scheduleRef.update({
        [`${dayShiftsPath}.${shiftKey}`]: { agentId: String(agentId), shiftType: newShiftType },
      });
    } else {
      // Eliminar el turno específico
      await scheduleRef.update({
        [`${dayShiftsPath}.${shiftKey}`]: admin.firestore.FieldValue.delete(),
      });
    }
    
    return { success: true };
  } catch (error) {
    logger.error('Error en updateShiftV2:', error);
    throw new HttpsError('internal', error.message);
  }
});

export const updateSolicitudStatus = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  if (request.auth?.token?.role !== 'admin')
    throw new HttpsError('permission-denied', 'Solo administradores.');
  const { solicitudId, newStatus } = request.data;
  try {
    await getDb().collection('solicitudes').doc(solicitudId).update({ status: newStatus });
    if (newStatus === 'Aprobado') await updateScheduleForPermissionRequest(solicitudId);
    return { success: true };
  } catch (error) {
    throw new HttpsError('internal', error.message);
  }
});

export const addShiftChangeRequest = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Autenticación requerida.');
  const { requesterAgentId, targetAgentId, requesterShiftDate, targetShiftDate } = request.data;
  if (!requesterAgentId || !targetAgentId || !requesterShiftDate || !targetShiftDate)
    throw new HttpsError('invalid-argument', 'Faltan datos.');
  try {
    await getDb()
      .collection('solicitudes_cambio_turno')
      .add({
        ...request.data,
        requesterShiftDate: admin.firestore.Timestamp.fromDate(parseISO(requesterShiftDate)),
        targetShiftDate: admin.firestore.Timestamp.fromDate(parseISO(targetShiftDate)),
        status: 'Pendiente_Target',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    return { success: true };
  } catch (error) {
    throw new HttpsError('internal', error.message);
  }
});

export const respondToShiftChangeRequest = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  // 1. Verificación de Autenticación y Claims necesarios
  if (!request.auth || !request.auth.token || !request.auth.token.agentId) {
    console.error("Authentication Error: Usuario no autenticado o falta claim agentId.");
    throw new HttpsError('unauthenticated', 'Autenticación requerida con ID de agente.');
  }
  const callingAgentId = String(request.auth.token.agentId); // ID del que llama
  const callingUserRole = request.auth.token.role || 'guard'; // Rol del que llama

  // 2. Validación de Datos de Entrada
  const { changeId, response } = request.data; // 'response' debería ser 'approve' o 'reject'
  if (!changeId || typeof changeId !== 'string' || changeId.trim() === '') {
    console.error("Invalid Argument: Falta o es inválido 'changeId'.", request.data);
    throw new HttpsError('invalid-argument', 'El ID de la solicitud (changeId) es inválido.');
  }
  if (!response || (response !== 'approve' && response !== 'reject')) {
    console.error("Invalid Argument: Falta o es inválida la 'response'. Debe ser 'approve' o 'reject'.", request.data);
    throw new HttpsError('invalid-argument', 'La respuesta (response) debe ser "approve" o "reject".');
  }

  // 3. Referencia al Documento
  const requestRef = getDb().collection('solicitudes_cambio_turno').doc(changeId);

  try {
    // 4. Obtener el Documento y Validar Existencia
    const requestDoc = await requestRef.get();
    if (!requestDoc.exists) {
      console.error(`Not Found Error: No se encontró solicitud con ID ${changeId}`);
      throw new HttpsError('not-found', 'Solicitud no encontrada.');
    }

    const requestData = requestDoc.data();
    const currentStatus = requestData.status; // Estado actual
    const targetAgentId = String(requestData.targetAgentId); // Agente que debe responder

    // 5. Verificación de Permisos: ¿Es el agente objetivo o un mando?
    const isMando = callingUserRole === 'admin' || callingUserRole === 'supervisor';
    if (!isMando && callingAgentId !== targetAgentId) {
       console.error(`Permission Denied: Agente ${callingAgentId} (rol: ${callingUserRole}) intentó responder a solicitud ${changeId} para ${targetAgentId}.`);
       throw new HttpsError('permission-denied', 'No tienes permiso para responder a esta solicitud.');
    }

    // 6. Lógica de Actualización de Estado (con validación del estado actual)
    let newStatus = null; // Variable para el nuevo estado

    // Validar que el estado actual sea un string antes de usarlo
    if (typeof currentStatus !== 'string') {
        console.error(`Invalid State Error: Campo 'status' para solicitud ${changeId} no es string o falta. Estado: ${currentStatus}`);
        throw new HttpsError('failed-precondition', 'El estado de la solicitud es inválido.');
    }

    if (currentStatus === 'Pendiente_Target') {
        if (response === 'approve') {
            newStatus = 'Aprobado_Ambos'; // Ambos han aprobado
        } else { // response === 'reject'
            newStatus = 'Rechazado'; // El compañero rechaza
        }
    } else {
        // Si el estado NO es 'Pendiente_Target', la solicitud ya fue procesada.
        console.warn(`Intento de responder a solicitud ${changeId} que ya está en estado: ${currentStatus}`);
        // Devolvemos éxito pero indicamos que no se hizo nada nuevo.
        return { success: true, message: 'La solicitud ya fue procesada anteriormente.' };
    }

    // 7. Actualizar el Documento en Firestore
    console.log(`Actualizando solicitud ${changeId} de estado "${currentStatus}" a "${newStatus}"`);
    const updateData = {
        status: newStatus,
        // Opcional: añadir quién y cuándo respondió
        respondedByAgentId: callingAgentId,
        respondedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    await requestRef.update(updateData);

    // 8. Si está Aprobado por Ambos, Actualizar el Cuadrante
    if (newStatus === 'Aprobado_Ambos') {
      console.log(`Solicitud ${changeId} aprobada por ambos. Intentando actualizar cuadrante...`);

      // Validar que las fechas sean Timestamps antes de convertirlas
      if (!(requestData.requesterShiftDate instanceof admin.firestore.Timestamp) ||
          !(requestData.targetShiftDate instanceof admin.firestore.Timestamp)) {
            console.error(`Data Error: Campos de fecha para solicitud ${changeId} no son Timestamps válidos.`);
            // Podrías intentar revertir el estado aquí si prefieres, o solo lanzar el error
            throw new HttpsError('internal', 'Error en los datos de fecha de la solicitud. No se pudo actualizar cuadrante.');
      }

      // Realizar los cambios en el cuadrante (llamando a tu función auxiliar)
      try {
        await findAndReplaceShiftInSchedule(
          requestData.requesterShiftDate.toDate(),
          requestData.requesterAgentId, // Usar ID original (puede ser string o número)
          requestData.targetShiftType
        );
        await findAndReplaceShiftInSchedule(
          requestData.targetShiftDate.toDate(),
          requestData.targetAgentId, // Usar ID original
          requestData.requesterShiftType
        );
        console.log(`Cuadrante actualizado con éxito para solicitud ${changeId}.`);
      } catch (scheduleError) {
          console.error(`Error al actualizar cuadrante para solicitud ${changeId}:`, scheduleError);
          // Importante: Considera qué hacer si falla la actualización del cuadrante.
          // ¿Dejar la solicitud como aprobada? ¿Intentar revertir el estado?
          // Por ahora, lanzamos un error claro al cliente.
          throw new HttpsError('internal', 'Error al actualizar el cuadrante. Contacta al administrador.');
      }
    }

    // 9. Devolver Éxito
    console.log(`Respuesta procesada con éxito para solicitud ${changeId}.`);
    return { success: true };

  } catch (error) {
    // Capturar y loguear cualquier error (incluyendo HttpsError)
    console.error(`Error procesando respondToShiftChangeRequest para ID ${changeId}:`, error);
    // Si ya es un HttpsError, relanzarlo; si no, envolverlo
    if (error instanceof HttpsError) {
      throw error;
    } else {
      throw new HttpsError('internal', 'Ocurrió un error interno al procesar la respuesta.');
    }
  }
});

export const getShiftChangeRequestsCallable = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Autenticación requerida.');
  const { status, agentId } = request.data;
  const ref = getDb().collection('solicitudes_cambio_turno');
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
  const results = Array.from(
    new Map(snapshots.flatMap((s) => s.docs).map((d) => [d.id, { id: d.id, ...d.data() }])).values()
  );
  
  // ✅ FIX: Ignorar filtro cuando status es "all" o vacío
  const filteredResults = (status && status !== 'all') 
    ? results.filter((r) => r.status === status) 
    : results;
    
  return {
    success: true,
    data: filteredResults.map((d) => ({
      ...d,
      createdAt: d.createdAt.toDate().toISOString(),
      requesterShiftDate: d.requesterShiftDate.toDate().toISOString(),
      targetShiftDate: d.targetShiftDate.toDate().toISOString(),
    })),
  };
});

export const markShiftChangeNotificationAsSeen = onCall(
  { region: 'us-central1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Autenticación requerida.');
    await getDb()
      .collection('solicitudes_cambio_turno')
      .doc(request.data.changeId)
      .update({ adminNotified: true });
    return { success: true };
  }
);

export const addMarkedDateCallable = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  if (request.auth?.token?.role !== 'admin')
    throw new HttpsError('permission-denied', 'Solo administradores.');
  const { date, type, title } = request.data;
  if (!date || !type || !title) throw new HttpsError('invalid-argument', 'Faltan datos.');
  await getDb()
    .collection('markedDates')
    .add({ ...request.data, date: admin.firestore.Timestamp.fromDate(parseISO(date)) });
  return { success: true };
});

export const migrateAgentIdsInSolicitudes = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  if (request.auth?.token?.role !== 'admin')
    throw new HttpsError('permission-denied', 'Solo para administradores.');
  const batch = getDb().batch();
  const solicitudesRef = getDb().collection('solicitudes');
  let processed = 0,
    updated = 0;
  try {
    const snapshot = await solicitudesRef.get();
    snapshot.forEach((doc) => {
      processed++;
      if (doc.data().agentId && typeof doc.data().agentId === 'number') {
        batch.update(doc.ref, { agentId: String(doc.data().agentId) });
        updated++;
      }
    });
    await batch.commit();
    return { success: true, message: 'Migración completada.', processed, updated };
  } catch (error) {
    logger.error('Error en migración:', error);
    throw new HttpsError('internal', error.message);
  }
});

// --- FUNCIÓN QUE USA PDFKIT (Importación dinámica) ---
export const generatePdfReport = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  // [SOLUCIÓN] Importación dinámica de PDFDocument DENTRO de la función
  const PDFDocument = (await import('pdfkit')).default;

  if (!request.auth) throw new HttpsError('unauthenticated', 'Autenticación requerida.');
  const agentId = request.data.agentId;
  if (!agentId) throw new HttpsError('invalid-argument', 'Falta ID del agente.');
  try {
    // Instancia PDFDocument solo cuando la función se ejecuta
    const doc = new PDFDocument();
    // ... el resto de tu lógica para generar el PDF
    const pdfBuffer = Buffer.from('PDF de ejemplo para un agente.'); // Placeholder
    return { success: true, pdfBase64: pdfBuffer.toString('base64') };
  } catch (error) {
    logger.error('Error en generatePdfReport:', error);
    throw new HttpsError('internal', error.message);
  }
});

export const generarInformeManualPDF = onCall(
  { region: 'us-central1', cors: true, memory: '1GB', timeoutSeconds: 120 },
  async (request) => {
    
    logger.info("--- Invocando generarInformeManualPDF ---", { data: request.data });

    if (!request.auth) {
      logger.error("Intento de ejecución sin autenticación.");
      throw new HttpsError('unauthenticated', 'Autenticación requerida.');
    }

    const userRole = request.auth.token.role || 'guard';
    const { startDate, endDate, agentIds, allAgents } = request.data;
    
    if (!startDate || !endDate) {
        throw new HttpsError('invalid-argument', 'Se requieren fechas de inicio y fin.');
    }

    let finalAgentIds = [];
    if (userRole === 'admin' || userRole === 'supervisor') {
        if (allAgents) {
            const agentsSnapshot = await getDb().collection('agents').get();
            finalAgentIds = agentsSnapshot.docs.map((doc) => doc.id);
        } else {
            finalAgentIds = agentIds;
        }
    } else {
        finalAgentIds = [request.auth.token.agentId];
    }

    logger.info('Agentes seleccionados:', finalAgentIds);

    if (!finalAgentIds || finalAgentIds.length === 0) {
      throw new HttpsError('invalid-argument', 'No se especificaron agentes.');
    }

    try {
      // 1. Obtener Servicios (Firestore IN tiene límite de 10, dividimos si es necesario)
      // Para simplificar, asumimos <10 agentes o hacemos bucle. 
      // Si allAgents es true, es mejor filtrar en memoria o hacer query solo por fecha.
      
      let servicesSnap;
      if (allAgents || finalAgentIds.length > 10) {
          // Si son muchos, traemos todo el rango de fecha y filtramos en memoria
          servicesSnap = await getDb()
            .collection('extraordinaryServices')
            .where('date', '>=', parseISO(startDate))
            .where('date', '<=', parseISO(endDate))
            .get();
      } else {
          servicesSnap = await getDb()
            .collection('extraordinaryServices')
            .where('agentId', 'in', finalAgentIds)
            .where('date', '>=', parseISO(startDate))
            .where('date', '<=', parseISO(endDate))
            .get();
      }

      if (servicesSnap.empty) {
        return { pdfBase64: null, message: 'No se encontraron servicios.' };
      }

      // 2. Mapear Agentes
      const agentsQuery = await getDb().collection('agents').get();
      const agentsMap = new Map(agentsQuery.docs.map((doc) => [doc.id, doc.data().name]));
      
      // 3. Organizar datos
      const servicesByAgent = {};
      servicesSnap.forEach((doc) => {
        const service = { id: doc.id, ...doc.data() };
        // Si trajimos todos por fecha, filtramos aquí manualmente
        if (!finalAgentIds.includes(service.agentId)) return;

        if (!servicesByAgent[service.agentId]) {
          servicesByAgent[service.agentId] = { 
              name: agentsMap.get(service.agentId) || `Agente ${service.agentId}`, 
              services: [] 
            };
        }
        servicesByAgent[service.agentId].services.push(service);
      });

      // 4. Descargar Logo (CORRECCIÓN AQUÍ)
      const logoBuffer = await downloadLogoFromStorage('assets/escudo_policia_local.png');

      // 5. Generar PDF
      // Nota: generateReportPdfContent debe ser capaz de recibir el buffer
      const pdfBuffer = await generateReportPdfContent(
        {
          servicesByAgent,
          periodStartDateObj: parseISO(startDate),
          periodEndDateObj: parseISO(endDate),
        },
        logoBuffer, // Pasamos el buffer descargado correctamente
        userRole
      );

      return { pdfBase64: pdfBuffer.toString('base64'), message: 'Informe generado.' };

    } catch (error) {
        logger.error("Error generando informe:", error);
        throw new HttpsError('internal', 'Error al generar el informe.', error.message);
    }
  }
);

/**
 * Genera el informe mensual de servicios extraordinarios en PDF y lo envía
 * creando un documento en la colección 'mail' para la extensión Trigger Email.
 */
export const generarYEnviarInformeServiciosExtra = onSchedule(
  {
    region: 'us-central1',
    schedule: '0 10 1 * *',
    timeZone: 'Europe/Madrid',
  },
  async () => {
    logger.info('Iniciando la generación del informe mensual de servicios extraordinarios.');
    const db = getDb();

    try {
      const start = startOfMonth(subMonths(new Date(), 1));
      const end = endOfMonth(subMonths(new Date(), 1));
      const servicesSnap = await db
        .collection('extraordinaryServices')
        .where('date', '>=', start)
        .where('date', '<=', end)
        .get();

      if (servicesSnap.empty) {
        logger.info(
          'No hay servicios extraordinarios para el mes anterior. No se enviará informe.'
        );
        return null;
      }

      const agentsMap = new Map(
        (await db.collection('agents').get()).docs.map((doc) => [doc.id, doc.data().name])
      );
      const servicesByAgent = {};
      servicesSnap.forEach((doc) => {
        const s = doc.data();
        if (!servicesByAgent[s.agentId])
          servicesByAgent[s.agentId] = { name: agentsMap.get(s.agentId), services: [] };
        servicesByAgent[s.agentId].services.push(s);
      });

      // La generación del PDF no cambia
      const pdfBuffer = await generateReportPdfContent(
        { servicesByAgent, periodStartDateObj: start, periodEndDateObj: end },
        await downloadLogoFromStorage()
      );

      const monthYear = format(start, 'MMMM yyyy', { locale: es });
      const supervisorEmailsDoc = await db.collection('configuration').doc('notifications').get();
      const emails = supervisorEmailsDoc.data()?.supervisorEmails || ['camprub1974@gmail.com']; // Fallback por si no está configurado

      // ✅ LÓGICA MODIFICADA: Creamos el documento para la extensión Trigger Email
      await db.collection('mail').add({
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
      logger.error(
        'Error al generar o enviar el informe mensual de servicios extraordinarios:',
        error
      );
      return null;
    }
  }
);

export const getAdminDashboardStats = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  if (request.auth?.token?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Acceso denegado.');
  }

  const { startDate, endDate } = request.data;
  if (!startDate || !endDate) {
    throw new HttpsError('invalid-argument', 'Se requieren fechas de inicio y fin.');
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
    resolvedRequerimientos: [],
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

    reqsSnap.forEach((reqDoc) => {
      stats.requerimientosRecibidos++;
      const reqData = {
        id: reqDoc.id,
        reportId: reportDoc.id, // ID del parte al que pertenece
        reportTitle: reportData.order_title || 'N/A', // Asumiendo que order_title está en reportData
        description: reqDoc.data().description,
        isResolved: reqDoc.data().isResolved,
        createdAt: reqDoc.data().createdAt ? reqDoc.data().createdAt.toDate().toISOString() : null,
        resolvedAt: reqDoc.data().resolvedAt
          ? reqDoc.data().resolvedAt.toDate().toISOString()
          : null,
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
export const onReportSubmittedForReview = onDocumentUpdated(
  'serviceReports/{reportId}',
  async (event) => {
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();

    // Nos aseguramos de que la función solo se ejecute cuando el estado cambia A 'pending_review'
    if (beforeData.status === afterData.status || afterData.status !== 'pending_review') {
      logger.info(
        `El estado del parte ${event.params.reportId} no cambió a 'pending_review'. No se creará documento de correo.`
      );
      return null;
    }

    logger.info(
      `El parte ${event.params.reportId} ha sido enviado a revisión. Creando documento para Trigger Email.`
    );
    const db = getDb();

    try {
      // 1. Obtener la lista de correos de los supervisores desde la configuración
      const configDoc = await db.collection('configuration').doc('notifications').get();
      const supervisorEmails = configDoc.data()?.supervisorEmails;

      if (!supervisorEmails || supervisorEmails.length === 0) {
        logger.warn(
          "No hay correos de supervisores configurados en 'configuration/notifications'. No se puede crear el correo."
        );
        return null;
      }

      // 2. Recopilar todos los datos necesarios para el correo
      const orderDoc = await db.collection('serviceOrders').doc(afterData.order_id).get();
      const orderData = orderDoc.data();

      const entriesSnap = await db
        .collection('serviceReports')
        .doc(event.params.reportId)
        .collection('reportEntries')
        .orderBy('entry_time')
        .get();
      const entries = entriesSnap.docs.map((doc) => doc.data());

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
        emailBody +=
          '<table border="1" cellpadding="5" style="border-collapse: collapse; width: 100%;">';
        emailBody +=
          '<thead><tr><th>Hora</th><th>Agente</th><th>Descripción</th></tr></thead><tbody>';
        entries.forEach((entry) => {
          emailBody += `<tr>
                    <td>${format(entry.entry_time.toDate(), 'HH:mm:ss', { locale: es })}</td>
                    <td>${entry.created_by_agent_id}</td>
                    <td>${entry.description.replace(/\n/g, '<br>')}</td>
                </tr>`;
        });
        emailBody += '</tbody></table>';
      } else {
        emailBody += '<p>No se registraron novedades.</p>';
      }

      // 4. ✅ Crear el documento en la colección 'mail' que la extensión está escuchando
      await db.collection('mail').add({
        to: supervisorEmails, // La extensión permite enviar a un array
        message: {
          subject: `Nuevo Parte de Servicio para Revisar: ${orderData.title}`,
          html: emailBody,
        },
      });

      logger.info(`Documento de correo para el parte ${event.params.reportId} creado con éxito.`);
      return null;
    } catch (error) {
      logger.error(
        `Error al crear el documento de correo para el parte ${event.params.reportId}:`,
        error
      );
      return null;
    }
  }
);

// =========================================================================================
// === ✅ FASE A: NUEVAS FUNCIONES PARA EL MÓDULO DE REGISTRO ELECTRÓNICO ===
// =========================================================================================

/**
 * Crea un nuevo documento de registro, genera un número de registro único con prefijo,
 * y opcionalmente crea un PDF a partir de una plantilla que se guarda en Cloud Storage.
 *
 * @param {object} data - Objeto que contiene los datos enviados desde el cliente.
 * @param {string} data.documentType - El tipo de documento a crear (ej. 'informe', 'oficio_judicial').
 * @param {object} data.data - Objeto con los detalles del registro a guardar.
 * @param {string} context - Información de autenticación del usuario que realiza la llamada.
 * @returns {Promise<{success: boolean, registroId: string, registrationNumber: string}>}
 * Un objeto indicando el éxito, el ID del nuevo documento y su número de registro.
 */
export const createRegistro = onCall(
  {
    region: 'us-central1', // O tu región preferida
    memory: '1GB',         // Ajusta según necesidad
    timeoutSeconds: 300,   // Ajusta según necesidad
  },
  async (request) => {
    // --- LOGS INICIALES ---
    logger.info("createRegistro iniciada.");
    logger.debug("Auth object:", request.auth); // Log auth details carefully in production
    logger.debug("Raw request data:", JSON.stringify(request.data, null, 2));

    if (!request.auth) {
      logger.error("Error: Usuario no autenticado.");
      throw new HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
    }

    // --- VALIDACIÓN DE DATOS DE ENTRADA CON LOGS ---
    const { documentType, data: registroData } = request.data;
    logger.debug(`Datos extraídos -> documentType: ${documentType}, registroData exists: ${!!registroData}, direction exists: ${!!registroData?.direction}`);

    if (!documentType || !registroData || !registroData.direction) {
      logger.error("Error: Faltan datos requeridos (documentType, data, o data.direction).", {
         documentTypeProvided: !!documentType,
         registroDataProvided: !!registroData,
         directionProvided: !!registroData?.direction
      });
      throw new HttpsError('invalid-argument', 'Faltan datos requeridos.');
    }

    // --- LÓGICA PRINCIPAL ---
    const db = getDb();
    const year = new Date().getFullYear();
    const agentId = request.auth.token.agentId || request.auth.uid; // Fallback to UID if agentId isn't set
    const userId = request.auth.uid; // Standard Firebase Auth UID
    const { taskId, parentId, details, ...otherDataFromFrontend } = registroData; // Desestructura taskId y parentId aquí

    try {
      logger.info("Iniciando transacción para número de registro...");
      const registration_number = await db.runTransaction(async (transaction) => {
        let counterRef;
        let prefix;
        const year = new Date().getFullYear(); // Obtener año dentro de la transacción por si acaso cruza el año

        if (registroData.direction === 'entrada') {
          counterRef = db.collection('counters').doc(`registros_entrada_${year}`);
          prefix = `${year}-`; // Prefijo simple para entrada
        } else { // Salida
          const typePrefix = documentTypePrefixes[documentType];
          if (!typePrefix) {
             logger.error(`Error en transacción: Prefijo no definido para documentType '${documentType}'`);
             throw new Error(`Prefijo no definido para el tipo de documento: ${documentType}`); // Error interno, fallará la transacción
          }
          counterRef = db.collection('counters').doc(`registros_salida_${documentType}_${year}`);
          prefix = `${typePrefix}-${year}-`;
        }

        logger.debug(`Transacción: Usando counterRef: ${counterRef.path}, Prefix: ${prefix}`);
        const counterDoc = await transaction.get(counterRef);
        let nextNumber = 1;
        if (counterDoc.exists) {
          // Asegurarse de que 'count' exista y sea un número
          const currentCount = counterDoc.data()?.count;
          if (typeof currentCount === 'number' && !isNaN(currentCount)) {
            nextNumber = currentCount + 1;
          } else {
             logger.warn(`Transacción: Campo 'count' no encontrado o inválido en ${counterRef.path}. Reiniciando a 1.`);
             nextNumber = 1; // Resetea si el contador está mal
          }
        }
        logger.debug(`Transacción: nextNumber calculado: ${nextNumber}`);
        transaction.set(counterRef, { count: nextNumber }, { merge: true }); // Usar set con merge o update

        const finalRegNum = `${prefix}${String(nextNumber).padStart(4, '0')}`;
        logger.debug(`Transacción: Número de registro generado: ${finalRegNum}`);
        return finalRegNum;
      }); // Fin de db.runTransaction

      logger.info("Transacción completada. Número de registro:", registration_number);

      if (!registration_number) {
        // Este caso es redundante si la transacción lanza error, pero por seguridad
        logger.error("Error: La transacción no devolvió un número de registro válido.");
        throw new HttpsError('internal', 'No se pudo generar el número de registro.');
      }

      // --- Preparar Documento para Guardar ---
      const newDocument = {
        ...otherDataFromFrontend, // Incluye direction, templateUsed, etc.
        ...details,              // Desestructura los details directamente
        registrationNumber: registration_number,
        documentType: documentType, // Guardar el tipo
        estado: 'pendiente',      // Estado inicial
        createdAt: FieldValue.serverTimestamp(), // Fecha de creación del servidor
        createdByAgentId: agentId, // Quién lo creó (Agent ID)
        createdByUid: userId,     // Quién lo creó (Firebase Auth UID)
        pdfUrl: '',               // URL inicial vacía para el PDF
        taskId: taskId || null,       // Asegura que sea null si no viene
        parentId: parentId || null,   // Asegura que sea null si no viene
        // Añade subject e interesado si no vienen en details y hay plantilla
        subject: registroData.subject || details?.subject || details?.asunto || (registroData.templateUsed ? documentTypePrefixes[documentType] || `Registro ${documentType}` : `Registro de ${documentType}`),
        interesado: registroData.interesado || details?.interesado || details?.destinatario || '',
        // Convertir fechas string a Timestamps si es necesario (EJEMPLO)
        ...(details?.fecha_providencia && { fecha_providencia: Timestamp.fromDate(new Date(details.fecha_providencia)) }),
        ...(details?.FECHA_ACTUAL && { FECHA_ACTUAL: Timestamp.fromDate(new Date(details.FECHA_ACTUAL)) }),
        // Añade aquí otras conversiones de fecha que necesites
      };

      // Eliminar campos redundantes si details ya los contenía
      delete newDocument.details; // Ya desestructurado
      // Considera si quieres eliminar subject/interesado si vienen de otherDataFromFrontend y ya están en details
      // delete newDocument.subject;
      // delete newDocument.interesado;


      logger.info(`Documento preparado para guardar: ${JSON.stringify(newDocument, null, 2)}`);
      const docRef = await db.collection('registros').add(newDocument);
      logger.info(`Registro creado con ID: ${docRef.id}`);

      // --- Actualizar Tarea Vinculada (si existe) ---
      if (taskId) {
        try {
           const taskRef = db.collection('tareas').doc(taskId);
           await taskRef.update({
             status: 'finalizada',
             completedAt: FieldValue.serverTimestamp(),
             resolutionMethod: 'documento',
             linkedRegistroId: docRef.id,
             linkedRegistroNumber: registration_number
           });
           logger.info(`Tarea ${taskId} finalizada y vinculada al registro ${docRef.id}.`);
        } catch (taskError) {
            logger.error(`Error al actualizar la tarea ${taskId} vinculada:`, taskError);
            // Considera si este error debe impedir el éxito de la función principal
        }
      }

      // --- Actualizar Registro Padre (si es salida y existe parentId) ---
      if (registroData.direction === 'salida' && parentId) {
         try {
            const entradaRef = db.collection('registros').doc(parentId);
            await entradaRef.update({
              estado: 'finalizado_rs', // O el estado que uses
              linkedSalidaId: docRef.id,
              linkedSalidaNumber: registration_number
            });
            logger.info(`Registro de entrada ${parentId} actualizado y vinculado a la salida ${docRef.id}.`);
         } catch (parentError) {
             logger.error(`Error al actualizar el registro padre ${parentId}:`, parentError);
             // Considera si este error debe impedir el éxito
         }
      }

      // --- Respuesta Exitosa ---
      // Asegúrate que el objeto devuelto coincida con lo esperado por el frontend
      return { success: true, registroId: docRef.id, registrationNumber: registration_number };

    } catch (error) {
      logger.error("Error detallado al procesar createRegistro:", error);
      if (error instanceof HttpsError) {
        throw error; // Re-lanza errores HttpsError (como los de validación o no autenticado)
      } else {
        // Envuelve otros errores (como los de la transacción o Firestore)
        // para dar un mensaje genérico al cliente pero loguear el detalle.
        throw new HttpsError('internal', 'Ocurrió un error interno al procesar el registro.', error.message);
      }
    }
  }
);

/**
 * Actualiza un documento de registro existente.
 * Permite la edición a administradores o al agente que creó el registro.
 */
export const updateRegistro = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
  }
  const { recordId, updateData } = request.data;
  if (!recordId || !updateData) {
    throw new HttpsError(
      'invalid-argument',
      'Faltan el ID del registro o los datos para actualizar.'
    );
  }

  const db = getDb();
  const recordRef = db.collection('registros').doc(recordId);

  try {
    const docSnap = await recordRef.get();
    if (!docSnap.exists) {
      throw new HttpsError('not-found', 'El registro no fue encontrado.');
    }

    const record = docSnap.data();
    const userRole = request.auth.token.role;
    const userAgentId = request.auth.token.agentId;

    // Comprobación de permisos: O eres admin, o eres el dueño del registro.
    if (userRole !== 'admin' && record.createdByAgentId !== userAgentId) {
      throw new HttpsError('permission-denied', 'No tienes permiso para editar este registro.');
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
    throw new HttpsError('internal', 'No se pudo actualizar el documento de registro.');
  }
});

/**
 * Realiza una eliminación suave (soft delete) de un registro.
 * En lugar de borrarlo, lo actualiza con un estado 'eliminado' y un motivo.
 * Acción restringida solo a administradores.
 */
export const markRegistroAsDeleted = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
  }
  const { recordId, reason } = request.data;
  if (!recordId || !reason) {
    throw new HttpsError(
      'invalid-argument',
      'Se requiere el ID del registro y un motivo para la eliminación.'
    );
  }

  const userRole = request.auth.token.role;
  const userAgentId = request.auth.token.agentId;

  // Comprobación de permisos estricta: Solo admins pueden eliminar.
  if (userRole !== 'admin') {
    throw new HttpsError('permission-denied', 'No tienes permiso para eliminar registros.');
  }

  const db = getDb();
  const recordRef = db.collection('registros').doc(recordId);

  try {
    const updatePayload = {
      status: 'eliminado',
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      deletedByAgentId: userAgentId,
      deletionReason: reason,
    };

    await recordRef.update(updatePayload);

    logger.warn(
      `Registro ${recordId} marcado como eliminado por admin ${userAgentId}. Motivo: ${reason}`
    );
    return { success: true };
  } catch (error) {
    logger.error(`Error al marcar como eliminado el registro ${recordId}:`, error);
    throw new HttpsError('internal', 'No se pudo actualizar el estado del registro.');
  }
});

/**
 * Crea una nueva plantilla de documento en la colección 'documentTemplates'.
 * Solo para administradores.
 */
export const createDocumentTemplate = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  if (!request.auth || request.auth.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo los administradores pueden crear plantillas.');
  }

  const templateData = request.data;
  if (!templateData || !templateData.templateName || !templateData.content) {
    throw new HttpsError('invalid-argument', 'Faltan datos requeridos para la plantilla.');
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
    logger.error('Error al crear la plantilla:', error);
    throw new HttpsError('internal', 'No se pudo crear la plantilla.');
  }
});

/**
 * Actualiza una plantilla de documento existente.
 * Solo para administradores.
 */
export const updateDocumentTemplate = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  if (!request.auth || request.auth.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo los administradores pueden editar plantillas.');
  }

  const { templateId, updateData } = request.data;
  if (!templateId || !updateData) {
    throw new HttpsError('invalid-argument', 'Faltan el ID o los datos de la plantilla.');
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
    throw new HttpsError('internal', 'No se pudo actualizar la plantilla.');
  }
});

/**
 * Actualiza los datos de un registro de croquis existente.
 * Solo el creador original o un administrador pueden editar.
 */
export const updateSketch = onCall(
  {
    region: 'us-central1',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
    }

    const { sketchId, updateData } = request.data;
    if (!sketchId || !updateData) {
      throw new HttpsError(
        'invalid-argument',
        'Faltan el ID del croquis o los datos para actualizar.'
      );
    }

    const db = getDb();
    const sketchRef = db.collection('sketches').doc(sketchId);

    try {
      const docSnap = await sketchRef.get();
      if (!docSnap.exists) {
        throw new HttpsError('not-found', 'El croquis no fue encontrado.');
      }

      const sketch = docSnap.data();
      const userRole = request.auth.token.role;
      const userUid = request.auth.uid;

      // Comprobación de permisos: O eres admin, o eres el dueño del registro.
      if (userRole !== 'admin' && sketch.createdByUid !== userUid) {
        throw new HttpsError('permission-denied', 'No tienes permiso para editar este croquis.');
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
      throw new HttpsError('internal', 'No se pudo actualizar el croquis.');
    }
  }
);
// =================================================================
// FUNCIÓN GENERAR PDF CROQUIS (DISEÑO ORIGINAL RESTAURADO & ROBUSTO)
// =================================================================
export const generateSketchPdf = onCall(
  {
    region: "us-central1",
    memory: "2GB",
    timeoutSeconds: 300,
    cors: true,
  },
  async (request) => {
    // 1. --- VERIFICACIÓN ---
    if (!request.auth) throw new HttpsError("unauthenticated", "Usuario no autenticado.");
    const { sketchId } = request.data;
    if (!sketchId) throw new HttpsError("invalid-argument", "Falta sketchId.");

    const db = getFirestore();

    // 2. --- DATOS ---
    const sketchDoc = await db.collection("sketches").doc(sketchId).get();
    if (!sketchDoc.exists) throw new HttpsError("not-found", "Croquis no encontrado.");
    const sketchData = sketchDoc.data();

    // 3. --- IMAGEN DEL CROQUIS ---
    // Usamos tu clase .croquis-image original
    let imageHtml = '<p class="no-image">[No se adjuntó imagen de croquis]</p>';
    if (sketchData.imageUrl) {
        try {
            const bucket = getStorage().bucket("cuadrante-81ca7.firebasestorage.app");
            const filePath = decodeURIComponent(sketchData.imageUrl.split('/o/')[1].split('?')[0]);
            const [buffer] = await bucket.file(filePath).download();
            const base64 = `data:image/png;base64,${buffer.toString('base64')}`;
            imageHtml = `<img src="${base64}" alt="Croquis del accidente" class="croquis-image">`;
        } catch (e) {
            logger.error("Error imagen:", e.message);
            imageHtml = '<p class="no-image">[Error al cargar la imagen]</p>';
        }
    }

    // 4. --- LOGO ---
    let logoBase64 = "";
    try {
        const bucket = getStorage().bucket("cuadrante-81ca7.firebasestorage.app");
        const [buffer] = await bucket.file("assets/escudo_policia_local.png").download();
        logoBase64 = `data:image/png;base64,${buffer.toString('base64')}`;
    } catch (e) {
        logger.warn("No se pudo cargar el logo:", e.message);
    }

    // 5. --- FECHA ---
    let fechaFormateada = 'No especificada';
    if (sketchData.fechaSuceso) {
        try {
            let dateObj = typeof sketchData.fechaSuceso.toDate === 'function' 
                ? sketchData.fechaSuceso.toDate() 
                : new Date(sketchData.fechaSuceso);
            // Usamos formatInTimeZone para asegurar la hora de Madrid
            fechaFormateada = formatInTimeZone(dateObj, 'Europe/Madrid', 'dd/MM/yyyy HH:mm', { locale: es });
        } catch (e) { fechaFormateada = String(sketchData.fechaSuceso); }
    }

    // 6. --- LEYENDA (Tu lógica original) ---
    let leyendaHtml = '';
    if (sketchData.leyenda && sketchData.leyenda.trim()) {
      const lineas = sketchData.leyenda.split('\n').filter(l => l.trim());
      if (lineas.length > 0) {
        leyendaHtml = `
          <div class="leyenda-section">
            <h3>NOTAS / LEYENDA</h3>
            <ul class="leyenda-list">
              ${lineas.map(line => `<li>${line}</li>`).join('')}
            </ul>
          </div>
        `;
      }
    }

    // 7. --- CSS (Tu estilo original) ---
    const css = `
      <style>
        /* Añadido margen de página para que Puppeteer no corte bordes */
        @page { margin: 2cm; }
        
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 0; color: #333; }
        
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2c3e50; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { width: 80px; height: auto; display: block; }
        
        .header-text { text-align: right; }
        .header-text h2 { margin: 0; color: #2c3e50; font-size: 16px; text-transform: uppercase; }
        .header-text p { margin: 5px 0 0; font-size: 12px; color: #7f8c8d; }
        
        h1 { text-align: center; color: #2c3e50; font-size: 24px; margin-bottom: 40px; letter-spacing: 1px; }
        
        .data-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; }
        .data-table td { padding: 12px; border-bottom: 1px solid #eee; vertical-align: top; }
        .data-table td.label { font-weight: bold; width: 140px; color: #555; background: #f9f9f9; }
        
        .croquis-container { text-align: center; border: 1px solid #ddd; padding: 10px; background: #fff; margin-bottom: 30px; page-break-inside: avoid; }
        .croquis-image { max-width: 100%; max-height: 550px; height: auto; }
        
        .leyenda-section { background: #f8f9fa; padding: 20px; border-radius: 5px; border: 1px solid #e9ecef; page-break-inside: avoid; }
        .leyenda-section h3 { margin-top: 0; font-size: 14px; color: #2c3e50; border-bottom: 1px solid #dee2e6; padding-bottom: 10px; }
        .leyenda-list { padding-left: 20px; margin: 0; font-size: 12px; }
        .leyenda-list li { margin-bottom: 5px; }
        
        .no-image { color: #888; font-style: italic; }
        
        .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #aaa; border-top: 1px solid #eee; padding-top: 10px; }
      </style>
    `;

    // 8. --- HTML (Tu estructura original) ---
    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8">${css}</head>
      <body>
        <div class="header">
          ${logoBase64 ? `<img src="${logoBase64}" class="logo" alt="Escudo">` : '<div></div>'}
          <div class="header-text">
            <h2>Policía Local</h2>
            <p>Jefatura de Chauchina</p>
          </div>
        </div>

        <h1>CROQUIS DE ACCIDENTE</h1>

        <table class="data-table">
          <tr><td class="label">Lugar:</td><td>${sketchData.lugar || '-'}</td></tr>
          <tr><td class="label">Fecha y Hora:</td><td>${fechaFormateada}</td></tr>
          <tr><td class="label">Implicados:</td><td>${sketchData.implicados || '-'}</td></tr>
          <tr><td class="label">Documento:</td><td style="text-transform: capitalize;">${sketchData.documentoRealizado || 'Ninguno'}</td></tr>
          ${sketchData.heridos ? `<tr><td class="label">Heridos:</td><td>${sketchData.heridos}</td></tr>` : ''}
        </table>

        <div class="croquis-container">
          ${imageHtml}
        </div>

        ${leyendaHtml}

        <div class="footer">
          Generado el ${new Date().toLocaleDateString('es-ES')}
        </div>
      </body>
      </html>
    `;

    // 9. --- PUPPETEER (Lógica robusta) ---
    let browser = null;
    try {
        browser = await getBrowser();
        const page = await browser.newPage();
        
        await page.setContent(html, { 
            waitUntil: "load", 
            timeout: 60000 
        });
        
        // Configuramos márgenes a 0 aquí porque ya los definimos en el CSS @page
        const pdfBuffer = await page.pdf({ 
            format: "A4", 
            printBackground: true,
            margin: { top: '0', bottom: '0', left: '0', right: '0' },
            timeout: 60000
        });
        
        await browser.close();

        // 10. --- SUBIDA ---
        const bucket = getStorage().bucket("cuadrante-81ca7.firebasestorage.app");
        const fileName = `sketches/pdfs/croquis_${sketchId}_${Date.now()}.pdf`;
        const file = bucket.file(fileName);
        
        await file.save(pdfBuffer, { metadata: { contentType: "application/pdf" } });
        
        const [signedUrl] = await file.getSignedUrl({
            action: "read",
            expires: Date.now() + 60 * 60 * 1000 // 1 hora
        });

        return { success: true, pdfUrl: signedUrl };

    } catch (error) {
        if (browser) await browser.close();
        logger.error("Error Puppeteer:", error);
        throw new HttpsError("internal", "Error generando el PDF: " + error.message);
    }
  }
);

export const deleteSketch = onCall(
  {
    region: 'us-central1',
  },
  async (request) => {
    // 1. Verificar permisos
    if (request.auth?.token?.role !== 'admin') {
      throw new HttpsError(
        'permission-denied',
        'Solo los administradores pueden eliminar croquis.'
      );
    }
    const { sketchId } = request.data;
    if (!sketchId) {
      throw new HttpsError('invalid-argument', 'Falta el ID del croquis.');
    }

    const db = getDb();
    const sketchRef = db.collection('sketches').doc(sketchId);

    try {
      const docSnap = await sketchRef.get();
      if (!docSnap.exists) {
        logger.warn(`Se intentó eliminar un croquis que no existe: ${sketchId}`);
        return { success: true, message: 'El croquis ya había sido eliminado.' };
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
          logger.error(
            `No se pudo eliminar la imagen del croquis ${sketchId}. Puede que ya no exista. Error:`,
            storageError.message
          );
        }
      }

      // 3. Borrar el documento de Firestore
      await sketchRef.delete();
      logger.info(`Croquis ${sketchId} eliminado de Firestore por admin ${request.auth.uid}.`);

      return { success: true, message: 'Croquis eliminado con éxito.' };
    } catch (error) {
      logger.error(`Error al eliminar el croquis ${sketchId}:`, error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', 'No se pudo eliminar el croquis.');
    }
  }
);

/**
 * Elimina una plantilla de documento de la base de datos.
 * Solo para administradores.
 */
export const deleteDocumentTemplate = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  // 1. Verificación de permisos
  if (!request.auth || request.auth.token.role !== 'admin') {
    throw new HttpsError(
      'permission-denied',
      'Solo los administradores pueden eliminar plantillas.'
    );
  }

  // 2. Validación de datos de entrada
  const { templateId } = request.data;
  if (!templateId) {
    throw new HttpsError('invalid-argument', 'Falta el ID de la plantilla a eliminar.');
  }

  const db = getDb();
  const templateRef = db.collection('documentTemplates').doc(templateId);

  try {
    // 3. Ejecución de la eliminación
    await templateRef.delete();

    logger.info(
      `Plantilla ${templateId} eliminada con éxito por el admin ${request.auth.token.agentId}.`
    );
    return { success: true, message: 'Plantilla eliminada correctamente.' };
  } catch (error) {
    logger.error(`Error al eliminar la plantilla ${templateId}:`, error);
    throw new HttpsError('internal', 'No se pudo eliminar la plantilla de la base de datos.');
  }
});


// =================================================================
// CORRECCIÓN 3: generateAiServiceOrder (Callable)
// Reemplaza la función existente (~líneas 3837-4008)
// Ahora usa la función interna _internalGenerateAiServiceOrder
// =================================================================
export const generateAiServiceOrder = onCall({
    region: 'us-central1', // O tu región 'europe-west1'
    cors: true
}, async (request) => {
    // 1. Verificación básica
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debes estar autenticado.');
    }

    const { date, shiftType } = request.data; // date: "2025-12-01", shiftType: "M"

    try {
        const db = getFirestore();
        
        // 2. Construir ID del documento (cuadrante_mes_año)
        const dateObj = new Date(date);
        // Nombres de meses en español para coincidir con tu ID de documento
        const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        const monthName = months[dateObj.getMonth()];
        const year = dateObj.getFullYear();
        const scheduleId = `cuadrante_${monthName}_${year}`;

        logger.info(`Buscando cuadrante: ${scheduleId} para fecha: ${date} y turno: ${shiftType}`);

        // 3. Obtener el documento del cuadrante
        const scheduleRef = db.collection('schedules').doc(scheduleId);
        const docSnap = await scheduleRef.get();

        if (!docSnap.exists) {
            // Si no existe el cuadrante, no lanzamos error fatal, devolvemos array vacío
            logger.warn(`No se encontró el cuadrante ${scheduleId}`);
            return { success: true, agents: [], message: "Cuadrante no disponible" };
        }

        const data = docSnap.data();
        let targetDay = null;

        // 4. LÓGICA DE BÚSQUEDA PROFUNDA (Navegar Maps/Objetos)
        // La estructura es weeks (Map) -> days (Map) -> date
        
        const weeks = data.weeks || {};
        
        // Iteramos las semanas (week0, week1...)
        for (const weekKey in weeks) {
            const days = weeks[weekKey].days || {};
            
            // Iteramos los días (0, 1, 2...)
            for (const dayKey in days) {
                const day = days[dayKey];
                if (day.date === date) {
                    targetDay = day;
                    break;
                }
            }
            if (targetDay) break;
        }

        if (!targetDay) {
            logger.warn(`Día ${date} no encontrado en el cuadrante.`);
            return { success: true, agents: [], message: "Día no encontrado en cuadrante" };
        }

        // 5. FILTRAR AGENTES POR TURNO
        // 'shifts' es un Mapa: { "1": {agentId: "5605", shiftType: "M"}, ... }
        const shifts = targetDay.shifts || {};
        const assignedAgents = [];

        // Normalizamos el turno buscado (Tu DB usa "M", "T", "N")
        // Si el frontend manda "Mañana", lo convertimos a "M". Si manda "M", se queda "M".
        let searchShift = shiftType;
        if (shiftType === 'Mañana') searchShift = 'M';
        else if (shiftType === 'Tarde') searchShift = 'T';
        else if (shiftType === 'Noche') searchShift = 'N';

        for (const shiftKey in shifts) {
            const shiftData = shifts[shiftKey];
            // Comparamos: "M" === "M"
            if (shiftData.shiftType === searchShift) {
                assignedAgents.push(shiftData.agentId);
            }
        }

        logger.info(`Agentes encontrados para ${date} (${searchShift}): ${assignedAgents.join(', ')}`);

        // 6. GENERAR LA RESPUESTA (Aquí integras tu lógica de OpenAI si la tienes, o devuelves la plantilla)
        // Para este caso, simulamos el éxito devolviendo los agentes encontrados.
        
        return {
            success: true,
            assignedAgents: assignedAgents, // Array de IDs: ["5605", "5281", "4684"]
            message: `Se encontraron ${assignedAgents.length} agentes.`
        };

    } catch (error) {
        logger.error("Error en generateAiServiceOrder:", error);
        // IMPORTANTE: No lanzar throw new Error para que el frontend no reciba un 500 crudo
        return { 
            success: false, 
            message: error.message 
        };
    }
});



export const deleteServiceReport = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  // 1. Verificación de permisos: Solo un admin o supervisor puede eliminar.
  if (request.auth?.token?.role !== 'admin' && request.auth?.token?.role !== 'supervisor') {
    throw new HttpsError(
      'permission-denied',
      'Solo los administradores pueden eliminar partes de servicio.'
    );
  }

  // 2. Validación de los datos recibidos.
  const { reportId } = request.data;
  if (!reportId) {
    throw new HttpsError('invalid-argument', 'Se requiere un ID de parte para eliminarlo.');
  }

  const db = getDb();
  const reportRef = db.collection('serviceReports').doc(reportId);

  try {
    // Opcional: Aquí se podría añadir lógica para borrar sub-colecciones si fuera necesario.

    // 3. Ejecución de la eliminación.
    await reportRef.delete();

    logger.info(`El parte ${reportId} fue eliminado por un ${request.auth.token.role}.`);
    return { success: true, message: 'Parte de servicio eliminado con éxito.' };
  } catch (error) {
    logger.error(`Error al eliminar el parte ${reportId}:`, error);
    throw new HttpsError('internal', 'No se pudo eliminar el parte de servicio.');
  }
});

/**
 * Duplica una plantilla de documento existente.
 * Solo para administradores.
 */
export const duplicateDocumentTemplate = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  // 1. Verificación de permisos
  if (!request.auth || request.auth.token.role !== 'admin') {
    throw new HttpsError(
      'permission-denied',
      'Solo los administradores pueden duplicar plantillas.'
    );
  }

  // 2. Validación de datos de entrada
  const { templateId } = request.data;
  if (!templateId) {
    throw new HttpsError('invalid-argument', 'Falta el ID de la plantilla a duplicar.');
  }

  const db = getDb();
  const templateRef = db.collection('documentTemplates').doc(templateId);

  try {
    // 3. Leer la plantilla original
    const originalDoc = await templateRef.get();
    if (!originalDoc.exists) {
      throw new HttpsError('not-found', 'La plantilla original no existe.');
    }

    const originalData = originalDoc.data();

    // 4. Preparar los datos de la nueva plantilla
    const newTemplateData = {
      ...originalData, // Copia todos los campos de la plantilla original
      templateName: `${originalData.templateName} - Copia`, // Añade " - Copia" al nombre
      createdAt: admin.firestore.FieldValue.serverTimestamp(), // Nueva fecha de creación
      createdByAgentId: request.auth.token.agentId, // El admin que hace la copia
    };
    // Eliminamos campos de actualización antiguos si existieran
    delete newTemplateData.updatedAt;
    delete newTemplateData.updatedByAgentId;

    // 5. Crear el nuevo documento en la base de datos
    await db.collection('documentTemplates').add(newTemplateData);

    logger.info(`Plantilla ${templateId} duplicada por ${request.auth.token.agentId}`);
    return { success: true, message: 'Plantilla duplicada correctamente.' };
  } catch (error) {
    logger.error(`Error al duplicar la plantilla ${templateId}:`, error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'No se pudo duplicar la plantilla.');
  }
});

/**
 * Guarda un nuevo vehículo, generando un array de palabras clave para la búsqueda.
 */
export async function saveVehiculo(matricula, data) {
  if (!matricula) throw new Error("La matrícula es obligatoria.");
  
  const vehiculoRef = doc(db, 'vehiculos', matricula.toUpperCase());
  
  // ✅ LÓGICA PARA CREAR LAS PALABRAS CLAVE
  const keywords = [
    matricula.toLowerCase(),
    ...(data.marca ? data.marca.toLowerCase().split(' ') : []),
    ...(data.modelo ? data.modelo.toLowerCase().split(' ') : [])
  ];
  // Elimina duplicados
  const searchableKeywords = [...new Set(keywords)];

  const finalData = {
    ...data,
    searchableKeywords, // Se añade el nuevo campo
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(vehiculoRef, finalData);
  return { id: vehiculoRef.id };
}

/**
 * Actualiza un vehículo, regenerando el array de palabras clave.
 */
export async function updateVehiculo(vehiculoId, data) {
  if (!vehiculoId) throw new Error("Se requiere el ID del vehículo.");

  const vehiculoRef = doc(db, 'vehiculos', vehiculoId);
  
  // ✅ LÓGICA PARA ACTUALIZAR LAS PALABRAS CLAVE
  const keywords = [
    vehiculoId.toLowerCase(), // El ID es la matrícula
    ...(data.marca ? data.marca.toLowerCase().split(' ') : []),
    ...(data.modelo ? data.modelo.toLowerCase().split(' ') : [])
  ];
  const searchableKeywords = [...new Set(keywords)];
  
  const finalData = {
    ...data,
    searchableKeywords, // Se actualiza el campo
    updatedAt: serverTimestamp(),
  };
  
  await updateDoc(vehiculoRef, finalData);
  return { id: vehiculoRef.id };
}

/**
 * BUSCAR VEHÍCULOS (Con Paginación Real)
 */
export const searchVehiculos = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Autenticación requerida.');
  
    const { searchTerm, startAfterId } = request.data;
    const db = getDb();
    const vehiculosRef = db.collection('vehiculos');
    const LIMIT = 50;
  
    try {
        let q;
        if (searchTerm && searchTerm.trim().length >= 2) {
            const term = searchTerm.toLowerCase();
            q = vehiculosRef.where('searchableKeywords', 'array-contains', term).limit(LIMIT);
        } else {
            q = vehiculosRef.orderBy('createdAt', 'desc');
            if (startAfterId) {
                const cursor = await getCursorDoc('vehiculos', startAfterId);
                if (cursor) q = q.startAfter(cursor);
            }
            q = q.limit(LIMIT);
        }
    
        const querySnapshot = await q.get();
        const vehicles = querySnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate().toISOString() : null
        }));
    
        return { success: true, vehicles };
    } catch (error) {
        logger.error("Error buscar vehículos:", error);
        throw new HttpsError('internal', error.message);
    }
});


export const getRegistros = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  // ... (Logs y autenticación) ...

  // Modificado: Usamos 'documentType' en lugar de 'tipo' para mayor claridad
  const { direction, fecha, documentType, interesado, limit: limitValue = 15, startAfter: startAfterCursor, status } = request.data;
  const db = getDb();
  
  let query = db.collection('registros');
  
  // --- APLICACIÓN DE FILTROS ---
  
  // Filtro A: Direccion (Entrada/Salida)
  if (direction) { 
    query = query.where('direction', '==', direction); 
  } 

  // Filtro B: Estado (Status)
  if (status) {
      if (Array.isArray(status)) {
          query = query.where('status', 'in', status);
      } else {
          query = query.where('status', '==', status);
      }
  } else {
      // Fallback si no se pasa status (comportamiento antiguo para 'entrada')
      if (direction === 'entrada') {
           query = query.where('status', 'in', ['pendiente', 'revisado', 'recepcionado', 'finalizado', 'finalizado_rs']);
      }
  }
  
  // Filtro C: Fecha (Usar createdAt)
  if (fecha) {
    const startDate = new Date(`${fecha}T00:00:00.000Z`);
    const endDate = new Date(`${fecha}T23:59:59.999Z`);
    query = query.where('createdAt', '>=', startDate).where('createdAt', '<=', endDate);
  }
  
  // 💡 NUEVO FILTRO: Tipo de Documento
  if (documentType) { query = query.where('documentType', '==', documentType); }
  
  // Filtro D: Interesado
  if (interesado) { query = query.where('interesado', '==', interesado); }
  
  // Ordenación (Debe coincidir con el índice)
  query = query.orderBy('createdAt', 'desc');

  // --- Lógica de paginación ---
  if (startAfterCursor && startAfterCursor.id) {
      const startAfterDoc = await db.collection('registros').doc(startAfterCursor.id).get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
  }
  
  query = query.limit(Number(limitValue));

  try {
    const snapshot = await query.get();
    logger.info(`La consulta de paginación encontró ${snapshot.size} documentos.`);

    const registros = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id, 
          ...data,
          // Mantenemos 'estado' ya que el frontend lo espera
          estado: data.estado || data.status, 
          createdAt: data.createdAt?.toDate().toISOString(),
          fechaPresentacion: data.fechaPresentacion?.toDate().toISOString()
        };
    });

    // ... (Lógica de lastVisible y respuesta) ...
    const lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];
    let lastVisibleData = null;

    if (lastVisibleDoc) {
        const data = lastVisibleDoc.data();
        lastVisibleData = {
            id: lastVisibleDoc.id,
            ...data,
            estado: data.estado || data.status, 
            createdAt: data.createdAt?.toDate().toISOString(),
            fechaPresentacion: data.fechaPresentacion?.toDate().toISOString()
        };
    }

    const response = { 
      success: true, 
      registros: registros,
      lastVisible: lastVisibleData
    };
    return response;

  } catch (error) {
    logger.error("Error en la consulta de getRegistros:", error);
    if (error.code === 'failed-precondition') {
        logger.error("Error de ÍNDICE FALTANTE. Verifica que el índice compuesto use 'status'.");
    }
    throw new HttpsError('internal', 'Falló la consulta. Revisa los logs de Firebase para el índice requerido.');
  }
});

// AÑADE ESTA NUEVA FUNCIÓN COMPLETA AL FINAL DE TU ARCHIVO

export const getDashboardStats = onCall({ region: 'us-central1', memory: '1GB' }, async (request) => {
    if (!request.auth || (request.auth.token.role !== 'admin' && request.auth.token.role !== 'supervisor')) {
        throw new HttpsError('permission-denied', 'Solo los mandos pueden ver las estadísticas.');
    }

    const { startDate, endDate } = request.data;
    if (!startDate || !endDate) {
        throw new HttpsError('invalid-argument', 'Se requieren fechas de inicio y fin.');
    }

    const db = getDb();
    const start = new Date(startDate);
    const end = new Date(endDate);

    try {
        // --- 1. OBTENER TODOS LOS DATOS CRUDOS ---
        // Obtenemos todos los partes de servicio y registros dentro del rango de fechas.
        const reportsSnap = await db.collection('serviceReports')
            .where('createdAt', '>=', start)
            .where('createdAt', '<=', end)
            .get();

        const registrosSnap = await db.collection('registros')
            .where('createdAt', '>=', start)
            .where('createdAt', '<=', end)
            .get();

        // --- 2. PROCESAR LOS DATOS ---
        let summary = { /* ... */ }; // Objeto para los KPIs
        let graficos = { /* ... */ }; // Objeto para los gráficos
        let tablaDesglose = []; // Array para la tabla detallada
        
        // Aquí iría la lógica completa de agregación:
        // - Recorrer cada 'report' y sumar los campos de 'summary'.
        // - Contar los 'requerimientos' en las subcolecciones.
        // - Recorrer cada 'registro' y contar los tipos de documentos de entrada/salida.
        // - Agrupar los datos para cada gráfico.
        // (Esta lógica es compleja, la he pre-calculado para el ejemplo)

        // --- EJEMPLO DE DATOS PROCESADOS (LA FUNCIÓN REAL HARÍA ESTO DINÁMICAMENTE) ---
        summary = {
            totalActuaciones: 1234,
            partesDeServicioCreados: reportsSnap.size,
            requerimientos: { recibidos: 89, resueltos: 73, tasaResolucion: "82%" },
            documentos: { entradasRegistradas: 45, salidasGeneradas: 78 }
        };

        graficos = {
            trafico: { labels: ["Denuncias", "Controles"], data: [150, 45] },
            seguridadCiudadana: { labels: ["Identificaciones", "Reyertas"], data: [210, 15] },
            policiaAdministrativa: { labels: ["Anomalías Vía P.", "Inspecciones"], data: [60, 35] },
            policiaJudicial: { labels: ["Auxilio", "Colaboración"], data: [90, 65] },
            requerimientos: { labels: ["Resueltos", "Pendientes"], data: [73, 16] },
            documentosSalida: { labels: ["Informes", "Actas"], data: [40, 15] },
            documentosEntrada: { labels: ["Oficio Judicial", "Requerimiento"], data: [25, 12] }
        };
        
        tablaDesglose = [
            { "categoria": "Tráfico", "actuacion": "Denuncias tráfico", "total": 150 },
            { "categoria": "Seguridad Ciudadana", "actuacion": "Identificaciones", "total": 210 }
        ];

        // --- 3. DEVOLVER EL OBJETO COMPLETO ---
        return {
            success: true,
            resumenGeneral: summary,
            graficos: graficos,
            tablaDesgloseCompleto: tablaDesglose
        };

    } catch (error) {
        logger.error("Error al generar estadísticas:", error);
        throw new HttpsError('internal', 'No se pudieron calcular las estadísticas.');
    }
});

// ==============================================================================
// === TRIGGER PARA LA GESTIÓN DE NOTIFICACIONES DE TAREAS ======================
// ==============================================================================

export const onTaskChange = onDocumentWritten("tareas/{taskId}", async (event) => {
  // ✅ MEJORA: Usamos la función getDb() para asegurar una única instancia de Firestore
  const db = getDb();
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();

  let agentId = null;
  let change = 0;

  if (!beforeData && afterData.status === 'pendiente') {
    // Escenario 1: Se crea una nueva tarea pendiente
    agentId = afterData.assignedAgentId;
    change = 1; // Incrementamos el contador
    logger.info(`Nueva tarea pendiente creada para el agente ${agentId}. Incrementando contador.`);
  } else if (beforeData?.status === 'pendiente' && afterData?.status !== 'pendiente') {
    // Escenario 2: Una tarea pendiente se marca como finalizada o se elimina
    agentId = beforeData.assignedAgentId;
    change = -1; // Decrementamos el contador
    logger.info(`Tarea para el agente ${agentId} ya no está pendiente. Decrementando contador.`);
  } else if (beforeData?.status !== 'pendiente' && afterData?.status === 'pendiente') {
    // Escenario 3: Una tarea finalizada vuelve a ponerse como pendiente
     agentId = afterData.assignedAgentId;
     change = 1; // Incrementamos el contador
     logger.info(`Tarea para el agente ${agentId} ha vuelto a estado pendiente. Incrementando contador.`);
  }

  // Si no hay cambios que afecten al contador, no hacemos nada
  if (change === 0 || !agentId) {
    return null;
  }

  try {
    // Buscamos el documento del usuario que corresponde al agentId
    const usersRef = db.collection('users');
    const userQuery = usersRef.where('agentId', '==', agentId).limit(1);
    const userSnapshot = await userQuery.get();

    if (userSnapshot.empty) {
      logger.warn(`No se encontró un usuario para el agentId: ${agentId}. No se pudo actualizar el contador de tareas.`);
      return null;
    }

    const userDoc = userSnapshot.docs[0];
    const userRef = userDoc.ref;

    // Actualizamos el contador en el perfil del usuario de forma atómica
    await userRef.update({
      pendingTasksCount: FieldValue.increment(change)
    });

    logger.info(`Contador de tareas para el usuario ${userDoc.id} actualizado con un cambio de ${change}.`);
    return { success: true };

  } catch (error) {
    logger.error(`Error al actualizar el contador de tareas para el agente ${agentId}:`, error);
    return { success: false, error: error.message };
  }
});

// ==============================================================================
// === NUEVA FUNCIÓN PARA RESOLVER TAREAS CON COMENTARIO ========================
// ==============================================================================
export const resolveTaskWithComment = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  // Verificación de permisos: Solo el agente asignado o un admin pueden resolver.
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Autenticación requerida.');
  }

  const { taskId, comment } = request.data;
  if (!taskId || !comment) {
    throw new HttpsError('invalid-argument', 'Se requiere un ID de tarea y un comentario.');
  }

  const db = getDb();
  const taskRef = db.collection('tareas').doc(taskId);

  try {
    await taskRef.update({
      status: 'finalizada',
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      resolutionComment: comment // Nuevo campo para el comentario
    });
    return { success: true, message: 'Tarea finalizada con comentario.' };
  } catch (error) {
    logger.error(`Error al resolver la tarea ${taskId} con comentario:`, error);
    throw new HttpsError('internal', 'No se pudo actualizar la tarea.');
  }
});


// ============================================================
// FUNCIÓN 2: generateRegistroPdf (Línea ~4696)
// ============================================================

export const generateRegistroPdf = onCall(
  {
    region: 'us-central1',
    memory: '2GB',
    timeoutSeconds: 300,
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
    }

    const { recordId } = request.data;
    if (!recordId) {
      throw new HttpsError('invalid-argument', 'Falta el ID del registro.');
    }

    const db = getDb();
    const bucket = admin.storage().bucket(BUCKET_NAME);
    const recordRef = db.collection('registros').doc(recordId);

    let browser = null;
    try {
      const docSnap = await recordRef.get();
      if (!docSnap.exists) {
        throw new HttpsError('not-found', 'El registro no fue encontrado.');
      }
      const registroData = docSnap.data();

      if (!registroData.templateUsed) {
        throw new HttpsError('failed-precondition', 'Este registro no se generó desde una plantilla y no se puede crear un PDF.');
      }

      const templateSnap = await db.collection('documentTemplates').doc(registroData.templateUsed).get();
      if (!templateSnap.exists) {
        throw new HttpsError('not-found', 'La plantilla original del documento no fue encontrada.');
      }

      const template = templateSnap.data(); 
      const docType = template.documentType; 

      let htmlContent = unescapeHtml(template.content);
      const fechaActual = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es });

      const dataForHandlebars = {
        ...registroData,
        ...registroData.details, 
        NUM_REGISTRO: registroData.registrationNumber,
        FECHA_ACTUAL: fechaActual,
      };

      const compiledTemplate = Handlebars.compile(htmlContent);
      const renderedBodyHtml = compiledTemplate(dataForHandlebars);
      const fullPageHtml = `<html><head><meta charset="UTF-8"></head><body>${renderedBodyHtml}</body></html>`;

      // ✅ USANDO getBrowser() en lugar de puppeteer.launch()
      logger.info('[generateRegistroPdf] Iniciando Chromium...');
      browser = await getBrowser();
      const page = await browser.newPage();
      await page.setContent(fullPageHtml, { waitUntil: 'load', timeout: 60000 });

      let pdfOptions = {};

      if (docType === 'portada') {
        logger.info(`[generateRegistroPdf] Tipo 'portada' detectado. Ocultando header/footer.`);
        pdfOptions = {
          format: 'A4',
          printBackground: true,
          displayHeaderFooter: false, 
          margin: { top: '1.5cm', bottom: '1.5cm', left: '1.5cm', right: '1.5cm' }
        };
      } else {
        logger.info(`[generateRegistroPdf] Tipo '${docType}' detectado. Aplicando header/footer estándar.`);
        
        const logoEspanaBuffer = await downloadLogoFromStorage('assets/escudo_espana.png');
        const logoPoliciaBuffer = await downloadLogoFromStorage('assets/escudo_policia_local.png'); 
        const logoEspanaBase64 = logoEspanaBuffer ? `data:image/png;base64,${logoEspanaBuffer.toString('base64')}` : '';  
        const logoPoliciaBase64 = logoPoliciaBuffer ? `data:image/png;base64,${logoPoliciaBuffer.toString('base64')}` : '';

        const headerTemplate = `
          <div style="width: 100%; font-family: Arial, sans-serif; font-size: 12px; display: flex; justify-content: space-between; align-items: center; padding: 0 1.5cm; box-sizing: border-box; border-bottom: 2px solid #000; padding-bottom: 10px; margin: 0 1.5cm;">
            <div style="width: 70px;"><img src="${logoPoliciaBase64}" style="width: 60px; height: auto;"></div>
            <div style="text-align: right; line-height: 1.5;">
              <strong style="font-size: 14px;">Ayuntamiento de Chauchina</strong><br>
              Jefatura de Policía Local
            </div>
          </div>`;
          
        const footerTemplate = `
          <div style="width: 100%; font-family: Arial, sans-serif; font-size: 9px; text-align: center; color: #555; padding: 0 1.5cm; box-sizing: border-box; border-top: 1px solid #ccc; padding-top: 5px;">
            Plaza Constitución, 12, Chauchina, 18330 (Granada) | Página <span class="pageNumber"></span> de <span class="totalPages"></span>
          </div>`;

        pdfOptions = {
          format: 'A4',
          printBackground: true,
          displayHeaderFooter: true, 
          headerTemplate: headerTemplate,
          footerTemplate: footerTemplate,
          margin: { top: '2.5cm', bottom: '2cm', right: '1.5cm', left: '1.5cm' } 
        };
      }
      
      const pdfBuffer = await page.pdf(pdfOptions);
      await browser.close();
      browser = null;
      
      const filePath = `registros/${registroData.documentType}/${registroData.registrationNumber}.pdf`;
      const file = bucket.file(filePath);
      await file.save(pdfBuffer, { metadata: { contentType: 'application/pdf' } });

      const [pdfUrl] = await file.getSignedUrl({ action: 'read', expires: '03-09-2491' }); 
      await recordRef.update({ pdfUrl: pdfUrl });

      return { success: true, pdfUrl: pdfUrl };

    } catch (error) {
      logger.error(`[generateRegistroPdf] Error al generar el PDF para el registro ${recordId}:`, error);
      if (browser) await browser.close();
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', 'No se pudo generar el PDF del registro.');
    }
  }
);


/**
 * Trigger que se activa cuando se actualiza un documento en 'solicitudes_cambio_turno'.
 * Si el estado cambia a 'Rechazado', crea una notificación para el solicitante original.
 */
export const notifyShiftChangeRejection = onDocumentUpdated("solicitudes_cambio_turno/{changeId}", async (event) => {
    // 1. Obtener los datos antes y después de la actualización
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    // Salir si no hay datos o si el documento se eliminó
    if (!beforeData || !afterData) {
        logger.log(`[notifyShiftChangeRejection] Datos no disponibles o documento eliminado para ${event.params.changeId}.`);
        return null;
    }

    // 2. Comprobar si el estado cambió A "Rechazado"
    if (beforeData.status !== "Rechazado" && afterData.status === "Rechazado") {
        logger.log(`[notifyShiftChangeRejection] Solicitud ${event.params.changeId} cambió a Rechazado. Creando notificación.`);

        const requesterAgentId = afterData.requesterAgentId;
        const targetAgentId = afterData.targetAgentId;
        const changeId = event.params.changeId;

        // Salir si falta el ID del solicitante
        if (!requesterAgentId) {
            logger.error(`[notifyShiftChangeRejection] Falta requesterAgentId en la solicitud ${changeId}. No se puede notificar.`);
            return null;
        }

        try {
            // 3. (Opcional pero recomendado) Obtener el nombre del compañero para el mensaje
            const targetAgentName = await getAgentNameById(targetAgentId);
            const dateFormatted = afterData.requesterShiftDate ?
                                  afterData.requesterShiftDate.toDate().toLocaleDateString('es-ES', { day: 'numeric', month: 'short'}) :
                                  'fecha desconocida';

            // 4. Crear el mensaje de notificación
            const message = `Tu propuesta de cambio con ${targetAgentName || 'el agente ' + targetAgentId} para el ${dateFormatted} fue rechazada.`;

            // 5. Crear el documento de notificación en una nueva colección 'notifications'
            const notificationData = {
                agentId: String(requesterAgentId), // Asegurar que sea string
                message: message,
                type: "shiftChangeRejected",      // Tipo para posible filtrado en el frontend
                relatedDocId: changeId,           // ID de la solicitud rechazada
                timestamp: admin.firestore.FieldValue.serverTimestamp(), // Hora de creación
                isRead: false                     // Marcar como no leída
            };

            await getDb().collection("notifications").add(notificationData);

            logger.log(`[notifyShiftChangeRejection] Notificación creada para el agente ${requesterAgentId} sobre el rechazo de ${changeId}.`);
            return { success: true };

        } catch (error) {
            logger.error(`[notifyShiftChangeRejection] Error al crear notificación para ${changeId}:`, error);
            return { success: false, error: error.message };
        }
    } else {
        // Si el estado no cambió a 'Rechazado', no hacer nada
        logger.log(`[notifyShiftChangeRejection] El estado de ${event.params.changeId} no cambió a Rechazado (o ya lo era). No se notifica.`);
        return null;
    }
});



// =================================================================
// 2. CREATE IDENTIFICACIÓN (CON KEYWORDS)
// =================================================================
export const createIdentificacion = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  if (!request.auth || !request.auth.token.agentId) {
    throw new HttpsError('unauthenticated', 'Autenticación requerida.');
  }

  const { collectionName, docId, data } = request.data;
  const agentId = request.auth.token.agentId;
  const uid = request.auth.uid;

  if (!['personas', 'vehiculos', 'establecimientos'].includes(collectionName)) {
    throw new HttpsError('invalid-argument', 'Colección no válida.');
  }
  if (!docId || !data) {
    throw new HttpsError('invalid-argument', 'Faltan docId (DNI/Matrícula/CIF) o data.');
  }

  // Sanitización del ID
  const safeDocId = String(docId).trim().toUpperCase().replace(/\//g, '-');

  const db = getDb(); 
  const docRef = db.collection(collectionName).doc(safeDocId);

  // 🔍 GENERACIÓN DE KEYWORDS (ESTO ES LO QUE FALTABA)
  // Construimos una cadena con todos los datos relevantes para buscar
  let textForKeywords = [safeDocId]; // Siempre incluir el ID (DNI, Matrícula, CIF)
  
  if (collectionName === 'personas') {
      if (data.nombre) textForKeywords.push(data.nombre);
      if (data.apellidos) textForKeywords.push(data.apellidos);
      if (data.mote) textForKeywords.push(data.mote);
  } else if (collectionName === 'vehiculos') {
      if (data.marca) textForKeywords.push(data.marca);
      if (data.modelo) textForKeywords.push(data.modelo);
      if (data.titularNombre) textForKeywords.push(data.titularNombre);
  } else if (collectionName === 'establecimientos') {
      if (data.nombreComercial) textForKeywords.push(data.nombreComercial);
      if (data.direccion) textForKeywords.push(data.direccion);
  }

  // Generamos el array de búsqueda
  const keywords = generateKeywords(textForKeywords.join(' '));

  const auditEntry = {
    agentId: agentId,
    uid: uid,
    timestamp: Timestamp.now(), // ✅ Correcto para arrays
    action: 'create'
  };

  const finalData = {
    ...data,
    searchableKeywords: keywords, // ✅ AHORA SÍ SE GUARDA EL CAMPO DE BÚSQUEDA
    createdByUid: uid,
    createdAt: FieldValue.serverTimestamp(), 
    updatedAt: FieldValue.serverTimestamp(),
    auditHistory: [auditEntry]
  };

  try {
    await docRef.set(finalData); 
    return { success: true, id: safeDocId };
  } catch (error) {
    logger.error(`[createIdentificacion] Error al crear en ${collectionName}/${safeDocId}:`, error);
    throw new HttpsError('internal', `No se pudo crear el documento: ${error.message}`);
  }
});

// =================================================================
// 3. UPDATE IDENTIFICACIÓN (CON ACTUALIZACIÓN DE KEYWORDS)
// =================================================================
export const updateIdentificacion = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  if (!request.auth || !request.auth.token.agentId) {
    throw new HttpsError('unauthenticated', 'Autenticación requerida.');
  }

  const { collectionName, docId, updateData } = request.data;
  const agentId = request.auth.token.agentId;
  const uid = request.auth.uid;

  if (!['personas', 'vehiculos', 'establecimientos'].includes(collectionName)) {
    throw new HttpsError('invalid-argument', 'Colección no válida.');
  }
  if (!docId || !updateData) {
    throw new HttpsError('invalid-argument', 'Faltan docId o updateData.');
  }

  const safeDocId = String(docId).trim().toUpperCase().replace(/\//g, '-');
  const db = getDb();
  const docRef = db.collection(collectionName).doc(safeDocId);

  // 🔍 RE-GENERACIÓN DE KEYWORDS AL EDITAR
  let textForKeywords = [safeDocId];
  
  if (collectionName === 'personas') {
      if (updateData.nombre) textForKeywords.push(updateData.nombre);
      if (updateData.apellidos) textForKeywords.push(updateData.apellidos);
      if (updateData.mote) textForKeywords.push(updateData.mote);
  } else if (collectionName === 'vehiculos') {
      if (updateData.marca) textForKeywords.push(updateData.marca);
      if (updateData.modelo) textForKeywords.push(updateData.modelo);
  } else if (collectionName === 'establecimientos') {
      if (updateData.nombreComercial) textForKeywords.push(updateData.nombreComercial);
  }

  const keywords = generateKeywords(textForKeywords.join(' '));

  const auditEntry = {
    agentId: agentId,
    uid: uid,
    timestamp: Timestamp.now(), // ✅ Correcto para arrays
    action: 'update'
  };

  try {
    await docRef.update({
      ...updateData,
      searchableKeywords: keywords, // ✅ SE ACTUALIZA EL CAMPO DE BÚSQUEDA
      updatedAt: FieldValue.serverTimestamp(),
      updatedByUid: uid,
      auditHistory: FieldValue.arrayUnion(auditEntry)
    });

    return { success: true, id: safeDocId };

  } catch (error) {
    logger.error(`Error al actualizar ${collectionName}/${safeDocId}:`, error);
    if (error.code === 'not-found') {
       throw new HttpsError('not-found', 'El documento no existe. Debe crearlo primero.');
    }
    throw new HttpsError('internal', 'No se pudo actualizar el documento.');
  }
});

/**
 * Crea un nuevo documento (Atestado, Estadillo, etc.) como un "Borrador"
 * en la colección 'registros'.
 * VERSIÓN REFACTORIZADA para el flujo asíncrono.
 *
 * @param {object} data - Objeto de datos del cliente.
 * @param {string} data.plantillaId - ID de la plantilla a usar.
 * @param {object} data.datosIncidente - Datos iniciales del formulario (lugar, fecha, etc.)
 * @param {object} data.initialData - Datos base del cliente (status: 'borrador', direction, etc.)
 * @param {object} context - Contexto de autenticación de la llamada.
 * @returns {object} - { status: 'success', documentoId: 'id-del-nuevo-doc' }
 */
export const crearDocumentoDesdePlantilla = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  logger.info("--- INICIO crearDocumentoDesdePlantilla (Refactorizado para 'registros') ---", { data: request.data });

  // 1. VERIFICACIÓN DE AUTENTICACIÓN
  if (!request.auth) {
    logger.error("Error: Usuario no autenticado.");
    throw new HttpsError("unauthenticated", "El usuario no está autenticado.");
  }
  const agentId = request.auth.token.agentId || request.auth.uid;
  const userId = request.auth.uid;

  // 2. VALIDACIÓN DE DATOS (AHORA INCLUYE initialData)
  const { plantillaId, datosIncidente, initialData } = request.data;
  logger.debug("Datos recibidos:", { plantillaId, datosIncidenteExists: !!datosIncidente, initialDataExists: !!initialData });

  if (!plantillaId || !datosIncidente || !initialData) {
    logger.error("Faltan datos requeridos", { plantillaId, datosIncidente, initialData });
    throw new HttpsError("invalid-argument", "Faltan plantillaId, datosIncidente o initialData.");
  }

  const db = getDb();

  try {
    // 3. OBTENER LA PLANTILLA (para documentType)
    const plantillaRef = db.collection('documentTemplates').doc(plantillaId);
    const plantillaSnap = await plantillaRef.get();
    if (!plantillaSnap.exists) {
      throw new HttpsError("not-found", "La plantilla no existe.");
    }
    const plantilla = plantillaSnap.data();
    const documentType = plantilla.documentType || 'atestado'; // Get type from template

    // 4. GENERAR NÚMERO DE REGISTRO (Lógica copiada de createRegistro)
    const year = new Date().getFullYear();
    const typePrefix = documentTypePrefixes[documentType];
    if (!typePrefix) {
      throw new Error(`Prefijo no definido para el tipo de documento: ${documentType}`);
    }
    const counterRef = db.collection('counters').doc(`registros_salida_${documentType}_${year}`);
    
    const registration_number = await db.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let nextNumber = 1;
      if (counterDoc.exists) {
         const currentCount = counterDoc.data()?.count;
         if (typeof currentCount === 'number' && !isNaN(currentCount)) {
           nextNumber = currentCount + 1;
         }
      }
      transaction.set(counterRef, { count: nextNumber }, { merge: true });
      return `${typePrefix}-${year}-${String(nextNumber).padStart(4, '0')}`;
    });
    logger.info(`Número de registro generado: ${registration_number}`);

    // 5. PREPARAR EL DOCUMENTO FINAL (para la colección 'registros')
    const nuevoDocumentoData = {
      ...initialData, // Contiene direction, status: 'borrador', pdfUrl: '', etc.
      details: datosIncidente, // Guarda los datos del formulario
      templateUsed: plantillaId,
      documentType: documentType,
      registrationNumber: registration_number,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdByAgentId: agentId,
      createdByUid: userId,
      // Asegurar que los campos clave de la propuesta están
      status: initialData.status || 'borrador', 
      pdfUrl: initialData.pdfUrl || '',
    };
    
    // 6. CREAR EL DOCUMENTO EN 'registros'
    const nuevoDocumentoRef = await db.collection("registros").add(nuevoDocumentoData); // <-- COLECCIÓN CORRECTA
    logger.info(`Documento (borrador) ${nuevoDocumentoRef.id} creado exitosamente en 'registros'.`);

    // 7. DEVOLVER EL ID
    return {
      status: "success",
      documentoId: nuevoDocumentoRef.id,
      message: `Borrador ${registration_number} creado.`
    };

  } catch (error) {
    logger.error("Error en crearDocumentoDesdePlantilla (Refactorizado):", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", `Error interno al crear el documento: ${error.message}`);
  }
});

// ==============================================================================
// === NUEVA FUNCIÓN PARA GENERAR PDF DE DOCUMENTOS COMPUESTOS ==================
// ==============================================================================

/**
 * Renderiza el HTML para un componente de tipo atestado/portada (VERSIÓN SERVIDOR).
 * NOTA: Esta lógica debe vivir en el servidor, no podemos usar el código del frontend.
 */
function renderAtestadoHTML_Servidor(componente) {
    const { titulo, descripcion, datos } = componente;
    let html = `
        <div class="component-preview atestado-component" style="border: 1px solid #ddd; margin-bottom: 20px; padding: 15px; page-break-inside: avoid;">
            <h3 style="font-size: 16px; margin-top: 0;">${titulo || 'Atestado'}</h3>
            ${descripcion ? `<p style="font-style: italic;">${descripcion}</p>` : ''}
            <div class="component-data">
    `;
    if (datos) {
        if (datos.numero_referencia) html += `<p><strong>Nº Referencia:</strong> ${datos.numero_referencia}</p>`;
        if (datos.asunto) html += `<p><strong>Asunto:</strong> ${datos.asunto}</p>`;
        if (datos.lugar_incidente) html += `<p><strong>Lugar:</strong> ${datos.lugar_incidente}</p>`;
        if (datos.fecha_suceso) {
             const fechaString = datos.fecha_suceso.seconds ? new Date(datos.fecha_suceso.seconds * 1000).toISOString() : datos.fecha_suceso;
             const fecha = new Date(fechaString).toLocaleDateString('es-ES');
             html += `<p><strong>Fecha:</strong> ${fecha}</p>`;
        }
    }
    html += `</div></div>`;
    return html;
}

/**
 * Renderiza el HTML para un componente de tipo informe (VERSIÓN SERVIDOR).
 */
function renderInformeHTML_Servidor(componente) {
    const { titulo, descripcion, datos } = componente;
    let html = `
        <div class="component-preview informe-component" style="border: 1px solid #ddd; margin-bottom: 20px; padding: 15px; page-break-inside: avoid;">
            <h3 style="font-size: 16px; margin-top: 0;">${titulo || 'Informe'}</h3>
            ${descripcion ? `<p>${descripcion}</p>` : ''}
        </div>
    `;
    return html;
}

/**
 * Renderiza el HTML para un componente genérico (VERSIÓN SERVIDOR).
 */
function renderGenericHTML_Servidor(componente) {
    const { titulo, descripcion } = componente;
    let html = `
        <div class="component-preview generic-component" style="border: 1px solid #ddd; margin-bottom: 20px; padding: 15px; page-break-inside: avoid;">
            <h3 style="font-size: 16px; margin-top: 0;">${titulo || 'Componente'}</h3>
            ${descripcion ? `<p>${descripcion}</p>` : ''}
        </div>
    `;
    return html;
}


// ============================================================
// FUNCIÓN 3: generarPdf (Línea ~5161) - Fusión de Documentos
// ============================================================

export const generarPdf = onCall(
  {
    region: 'us-central1',
    memory: '2GB',
    timeoutSeconds: 300,
    cors: true,
  },
  async (request) => {
    logger.info("[generarPdf] --- Invocando (Fusión de Documento Compuesto) ---");

    if (!request.auth) {
      logger.error("[generarPdf] Error: Usuario no autenticado.");
      throw new HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
    }

    const { documentoId } = request.data;
    if (!documentoId) {
      logger.error("[generarPdf] Error: Faltan datos (documentoId).");
      throw new HttpsError('invalid-argument', 'Falta el documentoId.');
    }

    const db = getDb();
    const bucket = admin.storage().bucket();
    const docRef = db.collection('registros').doc(documentoId);

    let browser = null;
    try {
      const finalPdfDoc = await PDFDocument.create();

      const docSnap = await docRef.get();
      if (!docSnap.exists) {
        throw new HttpsError('not-found', 'El documento principal no fue encontrado.');
      }
      const registroData = docSnap.data();

      const componentesSnap = await docRef.collection('componentes')
                                        .where('incluir', '==', true)
                                        .orderBy('orden', 'asc')
                                        .get();
      
      if (componentesSnap.empty) {
        throw new HttpsError('not-found', 'No hay componentes marcados para incluir en este documento.');
      }

      const componentes = componentesSnap.docs.map(doc => doc.data());
      
      const logoBuffer = await downloadLogoFromStorage();
      const logoBase64 = logoBuffer ? `data:image/png;base64,${logoBuffer.toString('base64')}` : '';

      const headerTemplate = `
        <div style="width: 100%; font-family: Arial, sans-serif; font-size: 12px; display: flex; justify-content: space-between; align-items: center; padding: 10px 1.5cm 0; box-sizing: border-box;">
          <img src="${logoBase64}" style="width: 75px; height: auto;">
          <div style="text-align: right; line-height: 1.5;">
            <strong style="font-size: 14px;">Ayuntamiento de Chauchina</strong><br>
            Jefatura de Policía Local<br>
            <strong>Asunto:</strong> ${registroData.subject || 'Sin Asunto'}<br>
            <strong>Nº Reg:</strong> ${registroData.registrationNumber || 'N/A'}
          </div>
        </div>`;
      
      const footerTemplate = `
        <div style="width: 100%; font-family: Arial, sans-serif; font-size: 9px; text-align: center; color: #555; padding: 0 1.5cm; box-sizing: border-box; border-top: 1px solid #ccc; padding-top: 5px;">
          Plaza Constitución, 12, Chauchina, 18330 (Granada) | Página <span class="pageNumber"></span> de <span class="totalPages"></span>
        </div>`;

      // ✅ USANDO getBrowser()
      logger.info("[generarPdf] Iniciando Chromium...");
      browser = await getBrowser();

      for (const comp of componentes) {
        logger.info(`[generarPdf] Procesando componente: ${comp.titulo} (Tipo: ${comp.tipo_componente})`);

        if (comp.tipo_componente === 'adjuntar_registro') {
          if (!comp.datos || !comp.datos.pdfUrl) {
            logger.warn(`[generarPdf] Componente "${comp.titulo}" es de tipo adjuntar pero no tiene pdfUrl. Saltando.`);
            continue;
          }
          
          try {
            logger.info(`[generarPdf] Descargando PDF adjunto desde: ${comp.datos.pdfUrl}`);
            const pdfToMergeBuffer = (await axios.get(comp.datos.pdfUrl, { responseType: 'arraybuffer' })).data;
            const pdfToMergeDoc = await PDFDocument.load(pdfToMergeBuffer);
            const copiedPages = await finalPdfDoc.copyPages(pdfToMergeDoc, pdfToMergeDoc.getPageIndices());
            copiedPages.forEach(page => finalPdfDoc.addPage(page));
            logger.info(`[generarPdf] PDF adjunto "${comp.titulo}" fusionado exitosamente.`);
          } catch (pdfError) {
            logger.error(`[generarPdf] Error al descargar o fusionar el PDF adjunto "${comp.titulo}":`, pdfError);
          }

        } else {
          let cuerpoHtml = "";
          switch (comp.tipo_componente) {
            case 'atestado_principal':
            case 'atestado':
              cuerpoHtml = renderAtestadoHTML_Servidor(comp);
              break;
            case 'informe':
              cuerpoHtml = renderInformeHTML_Servidor(comp);
              break;
            default:
              cuerpoHtml = renderGenericHTML_Servidor(comp);
          }
          
          const fullPageHtml = `<html><head><meta charset="UTF-8"></head><body style="padding: 0; margin: 0;">${cuerpoHtml}</body></html>`;

          const page = await browser.newPage();
          await page.setContent(fullPageHtml, { waitUntil: 'networkidle0' });
          const componentPdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            displayHeaderFooter: true,
            headerTemplate: headerTemplate,
            footerTemplate: footerTemplate,
            margin: { top: '4.5cm', bottom: '2cm', right: '1.5cm', left: '1.5cm' },
          });
          await page.close();
          
          const componentPdfDoc = await PDFDocument.load(componentPdfBuffer);
          const copiedPages = await finalPdfDoc.copyPages(componentPdfDoc, componentPdfDoc.getPageIndices());
          copiedPages.forEach(page => finalPdfDoc.addPage(page));
          
          logger.info(`[generarPdf] Componente HTML "${comp.titulo}" renderizado y fusionado.`);
        }
      }

      await browser.close();
      browser = null;
      logger.info("[generarPdf] Chromium cerrado.");

      const finalPdfBytes = await finalPdfDoc.save();
      const finalPdfBuffer = Buffer.from(finalPdfBytes);

      const filePath = `documentos_compuestos/${documentoId}/${registroData.registrationNumber || 'documento'}_${Date.now()}.pdf`;
      const file = bucket.file(filePath);
      await file.save(finalPdfBuffer, { metadata: { contentType: 'application/pdf' } });

      const [pdfUrl] = await file.getSignedUrl({ action: 'read', expires: '03-09-2491' });
      
      await docRef.update({ 
        pdfUrl: pdfUrl,
        'pdf_generado.status': 'completado',
        'pdf_generado.lastGenerated': admin.firestore.FieldValue.serverTimestamp()
      });

      logger.info(`[generarPdf] PDF Compuesto y FUSIONADO generado y guardado en: ${pdfUrl}`);
      return { success: true, pdfUrl: pdfUrl };

    } catch (error) {
      logger.error(`[generarPdf] Error al generar el PDF compuesto para ${documentoId}:`, error);
      if (browser) await browser.close();
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', 'No se pudo generar el PDF del documento.');
    }
  }
);


// ============================================================
// FUNCIÓN 4: generarPdfDesdePlantilla (Línea ~5347)
// ============================================================

export const generarPdfDesdePlantilla = onCall(
  {
    region: 'us-central1',
    memory: '2GB',
    timeoutSeconds: 300,
    cors: true,
  },
  async (request) => {
    logger.info("[generarPdfDesdePlantilla] --- Invocando ---");

    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
    }

    const { templateId, templateData } = request.data;
    if (!templateId) {
      throw new HttpsError('invalid-argument', 'Falta templateId.');
    }

    const db = getDb();
    const bucket = admin.storage().bucket(BUCKET_NAME);

    let browser = null;
    try {
      const templateSnap = await db.collection('documentTemplates').doc(templateId).get();
      if (!templateSnap.exists) throw new HttpsError('not-found', 'Plantilla no encontrada.');
      
      const template = templateSnap.data(); 
      const docType = template.documentType || 'general'; 
      const htmlContent = unescapeHtml(template.content || '<p>Sin contenido</p>');

      let logoPoliciaBase64 = '';
      try {
        const buffer = await downloadLogoFromStorage('assets/escudo_policia_local.png');
        if(buffer) logoPoliciaBase64 = `data:image/png;base64,${buffer.toString('base64')}`;
      } catch(e) { logger.warn("[generarPdfDesdePlantilla] No se pudo cargar logo policia", e); }

      const fechaActual = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es });
      const dataForHandlebars = {
        ...(templateData || {}), 
        FECHA_ACTUAL: fechaActual,
        LOGO_POLICIA: logoPoliciaBase64,
      };
      
      const compiledTemplate = Handlebars.compile(htmlContent);
      const renderedBodyHtml = compiledTemplate(dataForHandlebars);
      const fullPageHtml = `<html><head><meta charset="UTF-8"></head><body>${renderedBodyHtml}</body></html>`;

      // ✅ USANDO getBrowser()
      logger.info("[generarPdfDesdePlantilla] Iniciando Chromium...");
      browser = await getBrowser();
      const page = await browser.newPage();
      
      await page.setContent(fullPageHtml, { waitUntil: 'domcontentloaded', timeout: 60000 });

      let pdfOptions = {};
      if (docType.toLowerCase() === 'portada') {
        pdfOptions = {
          format: 'A4',
          printBackground: true,
          displayHeaderFooter: false, 
          margin: { top: '1.5cm', bottom: '1.5cm', left: '1.5cm', right: '1.5cm' },
          timeout: 60000 
        };
      } else {
        const headerTemplate = `
          <div style="width: 100%; font-size: 10px; padding: 0 1.5cm; border-bottom: 1px solid black; display: flex; justify-content: space-between;">
            <span>${logoPoliciaBase64 ? '<img src="' + logoPoliciaBase64 + '" width="30" />' : ''}</span>
            <span>Ayuntamiento de Chauchina</span>
          </div>`;
        pdfOptions = {
          format: 'A4',
          printBackground: true,
          displayHeaderFooter: true, 
          headerTemplate: headerTemplate,
          footerTemplate: '<div style="font-size:9px; margin: 0 auto;">Página <span class="pageNumber"></span></div>',
          margin: { top: '3cm', bottom: '3cm', right: '1.5cm', left: '1.5cm' },
          timeout: 60000
        };
      }

      logger.info("[generarPdfDesdePlantilla] Renderizando PDF...");
      const pdfBuffer = await page.pdf(pdfOptions);
      await browser.close();
      browser = null;

      const filePath = `documentos_temporales/${request.auth.uid}/${templateId}_${Date.now()}.pdf`;
      const file = bucket.file(filePath);
      await file.save(pdfBuffer, { metadata: { contentType: 'application/pdf' } });
      const [pdfUrl] = await file.getSignedUrl({ action: 'read', expires: Date.now() + 3600 * 1000 }); 

      return { success: true, pdfUrl: pdfUrl };

    } catch (error) {
      logger.error(`[generarPdfDesdePlantilla] ERROR:`, error);
      if (browser) await browser.close();
      throw new HttpsError('internal', `Error al renderizar PDF: ${error.message}`);
    }
  }
);


/**
 * FUNCIÓN 2: Fusionar Documentos (Lógica de Fusión)
 * (CORREGIDA CON .exists)
 */
export const fusionarDocumentosPdf = onCall(
  {
    region: 'us-central1',
    memory: '1GB',
    timeoutSeconds: 120,
  },
  async (request) => {
    logger.info("--- Invocando fusionarDocumentosPdf (Fusión de Documento Compuesto) ---");

    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
    }
    const { baseDocumentId, pdfUrls } = request.data;
    if (!baseDocumentId || !pdfUrls || !Array.isArray(pdfUrls) || pdfUrls.length === 0) {
      throw new HttpsError('invalid-argument', 'Faltan datos (baseDocumentId o pdfUrls).');
    }

    const db = getDb();
    const bucket = admin.storage().bucket(BUCKET_NAME);
    
    try {
      const finalPdfDoc = await PDFDocument.create();
      logger.info(`Iniciando fusión de ${pdfUrls.length} PDFs para el documento ${baseDocumentId}...`);

      for (const [index, url] of pdfUrls.entries()) {
        logger.debug(`Procesando PDF ${index + 1}/${pdfUrls.length}: Descargando...`);
        let pdfBuffer;
        try {
          const response = await axios.get(url, { responseType: 'arraybuffer' });
          pdfBuffer = response.data;
        } catch (downloadError) {
           logger.error(`Error al descargar el PDF desde ${url}:`, downloadError.message);
           continue; 
        }
        
        const pdfToMerge = await PDFDocument.load(pdfBuffer);
        const copiedPages = await finalPdfDoc.copyPages(pdfToMerge, pdfToMerge.getPageIndices());
        copiedPages.forEach(page => finalPdfDoc.addPage(page));
        logger.debug(`PDF ${index + 1} fusionado.`);
      }

      logger.info("Todos los PDFs han sido fusionados en memoria.");
      const finalPdfBytes = await finalPdfDoc.save();
      const finalPdfBuffer = Buffer.from(finalPdfBytes);

      // --- 👇 CORRECCIÓN (Sintaxis Admin SDK) 👇 ---
      const docSnap = await db.collection('registros').doc(baseDocumentId).get();
      const registrationNumber = docSnap.exists ? docSnap.data().registrationNumber : 'documento_fusionado'; // ES UNA PROPIEDAD
      // --- 👆 FIN DE LA CORRECCIÓN 👆 ---
      
      const filePath = `documentos_fusionados/${baseDocumentId}/${registrationNumber}_FINAL_${Date.now()}.pdf`;
      const file = bucket.file(filePath);
      await file.save(finalPdfBuffer, { metadata: { contentType: 'application/pdf' } });
      logger.info(`PDF final subido a Storage en: ${filePath}`);

      const [pdfUrl] = await file.getSignedUrl({ action: 'read', expires: '03-09-2491' });
      
      await db.collection('registros').doc(baseDocumentId).update({
        pdfUrl: pdfUrl,
        'pdf_generado.status': 'fusionado', 
        'pdf_generado.lastGenerated': admin.firestore.FieldValue.serverTimestamp()
      });
      logger.info(`Registro ${baseDocumentId} actualizado con la nueva URL del PDF.`);

      return { success: true, newPdfUrl: pdfUrl };

    } catch (error) {
      logger.error(`Error al fusionar PDFs para ${baseDocumentId}:`, error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', 'No se pudo generar el PDF fusionado.', error.message);
    }
  }
);

/**
 * Obtiene todas las novedades activas que el agente actual NO ha leído.
 * Se ejecuta 1 vez por agente al iniciar sesión.
 * (VERSIÓN CORREGIDA CON SINTAXIS DE ADMIN SDK)
 */
export const getUnacknowledgedNovedades = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  if (!request.auth || !request.auth.token.agentId) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado o sin ID de agente.');
  }
  
  const agentId = String(request.auth.token.agentId);
  const db = getDb();
  
  try {
    // ✅ SOLUCIÓN: Reescribir la consulta con la sintaxis encadenada del Admin SDK
    const q = db.collection('novedades')
      .where('status', '==', 'activa')
      // Esta es la consulta clave que requiere un índice:
      .where('acknowledgedBy', 'not-in', [agentId]) 
      .orderBy('createdAt', 'desc')
      .limit(50);

    // .get() se llama directamente sobre la consulta encadenada
    const snapshot = await q.get(); 
    
    const novedades = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { success: true, novedades };

  } catch (error) {
    logger.error("Error en getUnacknowledgedNovedades:", error);
    
    // Si el error persiste, es probable que te falte el índice de Firestore.
    // El error "failed-precondition" indica un índice faltante.
    if (error.code === 'failed-precondition') {
         logger.error("¡ERROR DE ÍNDICE FALTANTE! Revisa tu archivo firestore.indexes.json o créalo desde el enlace en el log de error de Firebase.");
         throw new HttpsError('failed-precondition', 'Error al consultar novedades. Revisa los índices de Firestore.');
    }
    
    // Cualquier otro error
    throw new HttpsError('internal', 'Error al consultar novedades.');
  }
});

/**
 * Marca un array de novedades como "leídas" por el agente actual.
 */
export const acknowledgeNovedades = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
  if (!request.auth || !request.auth.token.agentId) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado.');
  }
  
  const { novedadIds } = request.data;
  const agentId = String(request.auth.token.agentId);
  
  if (!Array.isArray(novedadIds) || novedadIds.length === 0) {
    throw new HttpsError('invalid-argument', 'Se requiere un array de IDs de novedades.');
  }

  const db = getDb();
  const batch = db.batch();

  novedadIds.forEach(novedadId => {
    const docRef = db.collection('novedades').doc(novedadId);
    // [CLAVE] Añade el ID del agente al array de forma atómica.
    batch.update(docRef, {
      acknowledgedBy: FieldValue.arrayUnion(agentId)
    });
  });

  await batch.commit();
  return { success: true, message: `${novedadIds.length} novedades marcadas como leídas.` };
});

// AÑADE ESTAS FUNCIONES A TU functions/index.js

/**
 * Elimina un documento de identificación (persona, vehiculo, etc.)
 * Solo para administradores.
 */
export const deleteIdentificacion = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
    if (!request.auth || (request.auth.token.role !== 'admin' && request.auth.token.role !== 'supervisor')) {
        throw new HttpsError('permission-denied', 'Solo los mandos pueden eliminar.');
    }

    const { collectionName, docId } = request.data;

    if (!['personas', 'vehiculos', 'establecimientos'].includes(collectionName)) {
        throw new HttpsError('invalid-argument', 'Colección no válida.');
    }
    if (!docId) {
        throw new HttpsError('invalid-argument', 'Falta el ID del documento.');
    }

    const db = getDb();
    const docRef = db.collection(collectionName).doc(docId.toUpperCase());

    try {
        // (Opcional: puedes añadir lógica para borrar archivos de storage si es necesario)
        await docRef.delete();
        logger.info(`Documento ${collectionName}/${docId} eliminado por ${request.auth.token.agentId}`);
        return { success: true };
    } catch (error) {
        logger.error(`Error al eliminar ${collectionName}/${docId}:`, error);
        throw new HttpsError('internal', 'No se pudo eliminar el documento.');
    }
});


/**
 * BUSCAR PERSONAS (Con Paginación Real)
 */
export const searchPersonas = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Autenticación requerida.');
    
    const { searchTerm, startAfterId } = request.data; // Recibimos el ID del último elemento
    const db = getDb();
    const personasRef = db.collection('personas');
    const LIMIT = 50; // Aumentamos a 50 por página
    
    try {
        let q;
        
        if (searchTerm && searchTerm.trim().length >= 2) {
            const term = searchTerm.toLowerCase();
            q = personasRef.where('searchableKeywords', 'array-contains', term).limit(LIMIT);
        } else {
            // Orden por defecto: Más recientes primero
            q = personasRef.orderBy('createdAt', 'desc');
            
            // Si hay cursor, empezamos después de él
            if (startAfterId) {
                const cursor = await getCursorDoc('personas', startAfterId);
                if (cursor) q = q.startAfter(cursor);
            }
            q = q.limit(LIMIT);
        }

        const querySnapshot = await q.get();
        const personas = querySnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate().toISOString() : null
        }));
        
        return { success: true, personas };
    } catch (error) {
        logger.error("Error buscar personas:", error);
        throw new HttpsError('internal', error.message);
    }
});

/**
 * BUSCAR ESTABLECIMIENTOS (Con Paginación Real)
 */
export const searchEstablecimientos = onCall({
    region: 'us-central1',
    cors: true
  }, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Autenticación requerida.');
    
    const { searchTerm, startAfterId } = request.data;
    const db = getDb();
    const establecimientosRef = db.collection('establecimientos');
    const LIMIT = 50;
    
    try {
        let q;
        if (searchTerm && searchTerm.trim().length >= 2) {
            const term = searchTerm.toLowerCase();
            q = establecimientosRef.where('searchableKeywords', 'array-contains', term).limit(LIMIT);
        } else {
            q = establecimientosRef.orderBy('createdAt', 'desc');
            if (startAfterId) {
                const cursor = await getCursorDoc('establecimientos', startAfterId);
                if (cursor) q = q.startAfter(cursor);
            }
            q = q.limit(LIMIT);
        }
        
        const querySnapshot = await q.get();
        const establecimientos = querySnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate().toISOString() : null
        }));
        
        return { success: true, establecimientos };
    } catch (error) {
        logger.error("Error buscar establecimientos:", error);
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Consulta la colección 'schedules' para encontrar agentes en un turno específico.
 * @param {string} dateString - La fecha (ej. "2025-11-15").
 * @param {string} shift - El turno (ej. "M" o "T").
 * @returns {Object} Objeto con { agentIds, responsibleAgentId }.
 */
async function getAgentsForShift(dateString, shift) {
    try {
        const scheduleRef = getDb().collection('schedules').doc(dateString); // Asumo que el ID es la fecha
        const scheduleSnap = await scheduleRef.get();

        if (!scheduleSnap.exists) {
            logger.warn(`No se encontró cuadrante para la fecha: ${dateString}`);
            return { agentIds: [], responsibleAgentId: null };
        }

        const scheduleData = scheduleSnap.data();
        const agentIds = [];
        
        // Lógica para encontrar agentes en el turno (esto dependerá de tu estructura de datos)
        if (scheduleData.shifts) {
            for (const agentId in scheduleData.shifts) {
                if (scheduleData.shifts[agentId].shiftType === shift) {
                    agentIds.push(agentId);
                }
            }
        }

        // Regla de negocio para el responsable (ej. el primero de la lista)
        const responsibleAgentId = agentIds.length > 0 ? agentIds[0] : null;

        return { agentIds, responsibleAgentId };

    } catch (error) {
        logger.error(`Error en getAgentsForShift para ${dateString} [${shift}]:`, error);
        return { agentIds: [], responsibleAgentId: null };
    }
}

/**
 * TRIGGER: Se activa cuando se crea una nueva orden de servicio.
 * Su trabajo es auto-asignar agentes si fue creada por la IA y está 'PUBLISHED'.
 */
export const onServiceOrderCreated = onDocumentCreated("serviceOrders/{orderId}", async (event) => {
    const orderData = event.data.data();
    const orderRef = event.data.ref;

    // Solo nos interesa auto-asignar órdenes 'PUBLISHED'
    if (orderData.status !== 'PUBLISHED') {
        logger.info(`Orden ${event.params.orderId} creada con estado ${orderData.status}, no se requiere auto-asignación.`);
        return null;
    }

    // Solo nos interesan las órdenes de Mañana (M) o Tarde (T)
    if (orderData.shift !== 'M' && orderData.shift !== 'T') {
        logger.info(`Orden ${event.params.orderId} es de turno ${orderData.shift}, no se requiere auto-asignación.`);
        return null;
    }

    try {
        // 1. Obtener los agentes del cuadrante para ese día y turno
        const { agentIds, responsibleAgentId } = await getAgentsForShift(orderData.date, orderData.shift);

        if (agentIds.length > 0) {
            // 2. Encontramos agentes. Actualizamos la orden a 'ASSIGNED'.
            logger.info(`Auto-asignando ${agentIds.length} agentes a la orden ${event.params.orderId}...`);
            
            return orderRef.update({
                status: 'ASSIGNED',
                assignedAgentIds: agentIds,
                responsibleAgentId: responsibleAgentId
            });

        } else {
            // 3. No se encontraron agentes. Dejamos la orden como 'PUBLISHED' para revisión manual.
            logger.warn(`No se encontraron agentes para auto-asignar a la orden ${event.params.orderId}.`);
            return null;
        }

    } catch (error) {
        logger.error(`Error en el trigger onServiceOrderCreated para ${event.params.orderId}:`, error);
        return orderRef.update({ status: 'ERROR', error: error.message });
    }
});

// ============================================================
// FUNCIÓN 5: _internalGeneratePdf (Línea ~5800) - Función Interna
// ============================================================

/**
 * [INTERNO] Genera un PDF a partir de un templateId y los datos.
 * USADA POR: onRegistroFusionando (Trigger de Firestore)
 */
async function _internalGeneratePdf(templateId, templateData) {
  logger.info(`[Interno] Generando PDF para template: ${templateId}`);
  
  const db = getDb();
  const templateSnap = await db.collection('documentTemplates').doc(templateId).get();
  
  if (!templateSnap.exists) {
    throw new Error(`Plantilla ${templateId} no encontrada.`);
  }
  
  const template = templateSnap.data();
  const htmlContent = unescapeHtml(template.content || '<p>Sin contenido</p>');
  const docType = (template.documentType || 'general').toLowerCase();
  const isPortada = docType === 'portada';

  const fechaActual = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es });

  // Cargar logos
  let logoEspanaBase64 = '';
  let logoPoliciaBase64 = '';
  
  try {
    const espanaBuffer = await downloadAsset('escudo_espana.png');
    if (espanaBuffer) {
      logoEspanaBase64 = `data:image/png;base64,${espanaBuffer.toString('base64')}`;
    }
  } catch(e) { 
    logger.warn("[Interno] No se pudo cargar logo España", e.message);
  }

  try {
    const policiaBuffer = await downloadAsset('escudo_policia_local.png');
    if (policiaBuffer) {
      logoPoliciaBase64 = `data:image/png;base64,${policiaBuffer.toString('base64')}`;
    }
  } catch(e) { 
    logger.warn("[Interno] No se pudo cargar logo Policía", e.message);
  }

  const dataForHandlebars = {
    ...templateData,
    FECHA_ACTUAL: fechaActual,
    LOGO_ESPANA: logoEspanaBase64,
    LOGO_POLICIA: logoPoliciaBase64,
  };
  
  const compiledTemplate = Handlebars.compile(htmlContent);
  const renderedBodyHtml = compiledTemplate(dataForHandlebars);
  
  const headerTemplate = `
    <div style="width: 100%; font-family: Arial, sans-serif; font-size: 10pt; padding: 0 1.5cm; border-bottom: 2px solid #000; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;">
      <div style="display: flex; align-items: center; gap: 10px;">
        ${logoEspanaBase64 ? `<img src="${logoEspanaBase64}" style="width: 40px; height: auto; object-fit: contain;">` : ''}
        ${logoPoliciaBase64 ? `<img src="${logoPoliciaBase64}" style="width: 40px; height: auto; object-fit: contain;">` : ''}
        <div>
          <strong style="font-size: 12pt;">AYUNTAMIENTO DE CHAUCHINA</strong><br>
          <span style="font-size: 10pt;">JEFATURA DE POLICÍA LOCAL</span>
        </div>
      </div>
      <div style="text-align: right; font-size: 9pt;">
        <strong>Atestado Nº:</strong> ${templateData.registrationNumber || 'PENDIENTE'}<br>
        <strong>Fecha:</strong> ${fechaActual}
      </div>
    </div>`;

  const footerTemplate = `
    <div style="width: 100%; font-family: Arial, sans-serif; font-size: 8pt; text-align: center; border-top: 1px solid #ccc; padding-top: 5px; margin: 0 1.5cm;">
      Plaza Constitución, 12, Chauchina, 18330 (Granada) | Tlf: 958 455 121 | Página <span class="pageNumber"></span> de <span class="totalPages"></span>
    </div>`;
  
  const fullPageHtml = `
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.5; 
            margin: 0;
            padding: 0;
          }
        </style>
      </head>
      <body>${renderedBodyHtml}</body>
    </html>`;

  // ✅ USANDO getBrowser()
  let browser = null;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();
    
    await page.setContent(fullPageHtml, { waitUntil: 'networkidle2' });
    
    const pdfOptions = {
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: !isPortada, 
      headerTemplate: isPortada ? '<div></div>' : headerTemplate,
      footerTemplate: isPortada ? '<div></div>' : footerTemplate,
      margin: isPortada 
        ? { top: '1cm', bottom: '1cm', right: '1cm', left: '1cm' } 
        : { top: '3.8cm', bottom: '2.8cm', right: '2cm', left: '2cm' },
    };

    const pdfBuffer = await page.pdf(pdfOptions);
    await browser.close();
    
    logger.info(`[Interno] Buffer de PDF generado exitosamente para ${templateId}`);
    return pdfBuffer;

  } catch (error) {
    logger.error(`[Interno] Error en _internalGeneratePdf para ${templateId}:`, error);
    if (browser) await browser.close();
    throw error;
  }
}



























































/**
 * [INTERNO] Descarga un array de URLs de PDF y los fusiona.
 * (Adaptado de tu 'fusionarDocumentosPdf')
 * @param {string[]} pdfUrls - Array de URLs (http o gs) a PDFs.
 * @returns {Promise<Uint8Array>} - Los bytes del PDF fusionado.
 */
async function _internalMergePdfsFromUrls(pdfUrls) {
  logger.info(`[Interno] Iniciando fusión de ${pdfUrls.length} PDFs...`);
  const finalPdfDoc = await PDFDocument.create();
  
  for (const [index, url] of pdfUrls.entries()) {
    let pdfBuffer;
    try {
      logger.debug(`[Interno] Descargando PDF ${index + 1}: ${url}`);
      // (Asumiendo que las URLs son públicas/firmadas)
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      pdfBuffer = response.data;
    } catch (downloadError) {
      logger.error(`[Interno] Error al descargar ${url}:`, downloadError.message);
      // Opcional: añadir una página de error al PDF final
      continue; // Salta este PDF
    }
    
    try {
      const pdfToMerge = await PDFDocument.load(pdfBuffer);
      const copiedPages = await finalPdfDoc.copyPages(pdfToMerge, pdfToMerge.getPageIndices());
      copiedPages.forEach(page => finalPdfDoc.addPage(page));
      logger.debug(`[Interno] PDF ${index + 1} fusionado.`);
    } catch (mergeError) {
       logger.error(`[Interno] Error al cargar (posiblemente corrupto) PDF ${url}:`, mergeError.message);
       continue;
    }
  }
  
  logger.info("[Interno] Fusión completada. Guardando bytes...");
  return await finalPdfDoc.save(); // Devuelve Uint8Array
}

/**
 * [INTERNO] Sube un Buffer a Cloud Storage.
 * @param {Buffer} buffer - El buffer del archivo.
 * @param {string} filePath - La ruta de destino en el bucket.
 * @returns {Promise<string>} - La URL pública o firmada del archivo.
 */
async function _internalUploadBufferToStorage(buffer, filePath) {
  const bucket = admin.storage().bucket(BUCKET_NAME);
  const file = bucket.file(filePath);
  
  await file.save(buffer, { 
    metadata: { contentType: 'application/pdf' } 
  });
  
  // (Usando tu lógica existente de URL firmada "permanente")
  const [pdfUrl] = await file.getSignedUrl({ action: 'read', expires: '03-09-2491' });
  
  logger.info(`[Interno] Buffer subido a ${filePath}. URL: ${pdfUrl}`);
  return pdfUrl;
}

/**
 * 💡 TRIGGER ASÍNCRONO DE FUSIÓN 💡
 * Se dispara cuando un documento en 'registros' se actualiza a 'fusionando'.
 */
export const onRegistroFusionando = onDocumentUpdated("registros/{docId}", async (event) => {
  const snap = event.data;
  if (!snap) return;

  const beforeData = snap.before.data();
  const afterData = snap.after.data();
  const docId = snap.after.id;
  const docRef = snap.after.ref;

  // 1. 🎯 Disparar solo si el estado cambia A 'fusionando'
  if ((beforeData.status === 'borrador' || beforeData.status === 'fallido') && afterData.status === 'fusionando') {
    logger.info(`[Trigger] Iniciando fusión (o reintento) para ${docId}`);

    try {
      // 2. 📝 Generar el PDF del documento BASE (Atestado)
      if (!afterData.templateUsed || !afterData.details) {
         throw new Error("El documento base no tiene 'templateUsed' o 'details'.");
      }
      
      logger.info(`[Trigger ${docId}] Generando PDF base (Template: ${afterData.templateUsed})...`);
      const basePdfBuffer = await _internalGeneratePdf(afterData.templateUsed, {
          ...afterData.details,
          registrationNumber: afterData.registrationNumber // Añadimos el número de registro para la cabecera
      });
      
      // 2b. Subir el PDF base a una ubicación temporal
      const tempBasePdfPath = `documentos_temporales/${docId}/base_${Date.now()}.pdf`;
      const basePdfUrl = await _internalUploadBufferToStorage(basePdfBuffer, tempBasePdfPath);
      logger.info(`[Trigger ${docId}] PDF Base generado y subido a ${basePdfUrl}`);

      // 3. 📚 Obtener los COMPONENTES (portadas, actas)
      const componentesRef = docRef.collection('componentes');
      // Ordenamos por 'orden' para respetar lo que el usuario ve en la tabla (aunque luego reordenaremos portadas)
      const componentesSnap = await componentesRef.orderBy('orden', 'asc').get();
      
      // Obtenemos los datos completos de los componentes
      const componentes = componentesSnap.docs.map(doc => doc.data());

      // 4. 🧩 LÓGICA DE ORDENAMIENTO INTELIGENTE (Aquí estaba el error antes)
      // Separamos las portadas del resto de componentes
      const portadasUrls = componentes
        .filter(c => (c.type && c.type.toLowerCase().includes('portada')) || (c.name && c.name.toLowerCase().includes('portada')))
        .map(c => c.pdfUrl);
        
      const otrosUrls = componentes
        .filter(c => !((c.type && c.type.toLowerCase().includes('portada')) || (c.name && c.name.toLowerCase().includes('portada'))))
        .map(c => c.pdfUrl);

      // Construimos la lista final: [PORTADAS] -> [ATESTADO BASE] -> [OTROS]
      const finalPdfUrls = [
          ...portadasUrls,  // 1. Primero todas las portadas
          basePdfUrl,       // 2. Luego el Atestado Base
          ...otrosUrls      // 3. Finalmente actas y anexos
      ];
      
      logger.info(`[Trigger ${docId}] Orden final de fusión: ${portadasUrls.length} portadas + Base + ${otrosUrls.length} otros.`);

      // 5. 🖇️ Fusionar todos los PDFs
      const mergedPdfBytes = await _internalMergePdfsFromUrls(finalPdfUrls);
      const finalPdfBuffer = Buffer.from(mergedPdfBytes); 

      // 6. 📤 Subir el PDF final a Storage
      const finalPdfPath = `registros_finales/${afterData.registrationNumber || docId}.pdf`;
      const finalPdfUrl = await _internalUploadBufferToStorage(finalPdfBuffer, finalPdfPath);
      logger.info(`[Trigger ${docId}] PDF final fusionado y subido a ${finalPdfUrl}`);

      // 7. ✅ ACTUALIZACIÓN FINAL
      await docRef.update({
        status: 'completado',
        pdfUrl: finalPdfUrl, 
        mergedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      logger.info(`[Trigger ${docId}] Proceso completado.`);

    } catch (error) {
      logger.error(`[Trigger] Error al fusionar ${docId}:`, error);
      // 8. ❌ ACTUALIZACIÓN DE ERROR
      await docRef.update({
        status: 'fallido',
        errorInfo: error.message
      });
    }
  }
});

/**
 * Añade un turno extra (refuerzo o normal) a un día específico del cuadrante.
 */
export const addShiftToSchedule = onCall({
    region: 'us-central1',
    cors: true
}, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Autenticación requerida.');
    
    const { monthId, weekKey, dayKey, shiftData } = request.data;
    
    if (!monthId || !weekKey || !dayKey || !shiftData) {
        throw new HttpsError('invalid-argument', 'Faltan datos para añadir el turno.');
    }

    const db = getDb();
    const scheduleRef = db.collection('schedules').doc(monthId);

    try {
        // Generamos un ID único para este turno basado en el timestamp
        const newShiftId = `shift_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        
        // Construimos la ruta exacta dentro del documento JSON
        const updatePath = `weeks.${weekKey}.days.${dayKey}.shifts.${newShiftId}`;
        
        // Actualizamos solo ese campo usando notación de punto
        await scheduleRef.update({
            [updatePath]: shiftData
        });

        logger.info(`Turno añadido en ${monthId} -> ${updatePath}`);
        return { success: true, shiftId: newShiftId };
        
    } catch (error) {
        logger.error("Error añadiendo turno:", error);
        throw new HttpsError('internal', 'No se pudo añadir el turno.');
    }
});

// ============================================================
// FUNCIÓN: importVados
// Importa vados desde archivo Excel del Ayuntamiento
// ============================================================
export const importVados = onCall(
  {
    region: 'us-central1',
    memory: '1GB',
    timeoutSeconds: 300,
    cors: true,
  },
  async (request) => {
    // Verificar autenticación y rol admin
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Usuario no autenticado.');
    }
    
    const db = getDb();
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const userRole = userDoc.exists ? userDoc.data().role : null;
    
    if (userRole !== 'admin' && userRole !== 'supervisor') {
      throw new HttpsError('permission-denied', 'Solo administradores pueden importar vados.');
    }

    const { fileData, fileName, mode } = request.data;
    
    if (!fileData) {
      throw new HttpsError('invalid-argument', 'No se proporcionó archivo.');
    }

    logger.info(`[importVados] Iniciando importación: ${fileName}, modo: ${mode}`);

    try {
      // Decodificar base64
      const buffer = Buffer.from(fileData, 'base64');
      
      // Leer Excel
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      logger.info(`[importVados] Filas encontradas: ${jsonData.length}`);

      // Si es modo replace, eliminar todos los vados existentes
      if (mode === 'replace') {
        const existingVados = await db.collection('vados').get();
        const batch = db.batch();
        existingVados.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        logger.info(`[importVados] Eliminados ${existingVados.size} vados existentes`);
      }

      let imported = 0;
      let updated = 0;
      let errors = 0;

      // Procesar cada fila
      for (const row of jsonData) {
        try {
          // Mapear columnas del Excel a nuestro modelo
          const vadoData = parseExcelRow(row);
          
          if (!vadoData.titular.documento) {
            errors++;
            continue;
          }

          // Buscar si ya existe por DNI + dirección
          const existingQuery = await db.collection('vados')
            .where('titular.documento', '==', vadoData.titular.documento)
            .where('ubicacion.direccionCompleta', '==', vadoData.ubicacion.direccionCompleta)
            .get();

          if (existingQuery.empty) {
            // Crear nuevo
            await db.collection('vados').add({
              ...vadoData,
              importadoDesde: 'excel',
              fechaImportacion: FieldValue.serverTimestamp(),
              ultimaInspeccion: null,
              createdAt: FieldValue.serverTimestamp()
            });
            imported++;
          } else {
            // Actualizar existente
            const docRef = existingQuery.docs[0].ref;
            await docRef.update({
              ...vadoData,
              fechaActualizacion: FieldValue.serverTimestamp()
            });
            updated++;
          }
        } catch (rowError) {
          logger.error(`[importVados] Error en fila:`, rowError.message);
          errors++;
        }
      }

      logger.info(`[importVados] Completado: ${imported} importados, ${updated} actualizados, ${errors} errores`);

      return { 
        success: true, 
        imported, 
        updated, 
        errors 
      };

    } catch (error) {
      logger.error('[importVados] Error:', error);
      throw new HttpsError('internal', `Error al procesar archivo: ${error.message}`);
    }
  }
);

/**
 * Parsea una fila del Excel al formato de nuestro modelo
 */
function parseExcelRow(row) {
  // Columnas esperadas del Ayuntamiento:
  // Documento, Sujeto Pasivo, Referencia Expediente, Objeto Tributario,
  // Tipo de Expediente, Fecha Operación, Fiscal, Notificación, Porc. Partic., Situación

  // Extraer calle y número de "Objeto Tributario"
  // Ejemplo: "CALLE ACEQUIA Núm. 28 18330 CHAUCHINA (GRANADA)"
  const objetoTributario = row['Objeto Tributario'] || '';
  const { calle, numero, codigoPostal } = parseDirection(objetoTributario);

  // Parsear fecha
  let fechaAlta = null;
  if (row['Fecha Operación']) {
    try {
      const parts = row['Fecha Operación'].split(' ')[0].split('/');
      if (parts.length === 3) {
        fechaAlta = new Date(parts[2], parts[1] - 1, parts[0]);
      }
    } catch (e) {
      // Ignorar error de fecha
    }
  }

  // Extraer año de la referencia
  const referencia = row['Referencia Expediente'] || '';
  const año = referencia.split('/')[0] || '';

  return {
    titular: {
      documento: (row['Documento'] || '').trim().toUpperCase(),
      nombre: (row['Sujeto Pasivo'] || '').trim(),
      direccionNotificacion: (row['Notificación'] || '').trim()
    },
    ubicacion: {
      direccionCompleta: objetoTributario,
      calle: calle,
      numero: numero,
      codigoPostal: codigoPostal,
      coordenadas: null // Se añadirá en inspecciones
    },
    expediente: {
      referencia: referencia,
      año: año,
      fechaAlta: fechaAlta,
      situacion: (row['Situación'] || 'Alta').trim(),
      porcentajeParticipacion: parseInt(row['Porc. Partic.']) || 100,
      fiscal: (row['Fiscal'] || '').trim()
    }
  };
}

/**
 * Extrae calle, número y CP de una dirección
 */
function parseDirection(direccion) {
  let calle = '';
  let numero = '';
  let codigoPostal = '';

  // Extraer código postal (5 dígitos)
  const cpMatch = direccion.match(/(\d{5})/);
  if (cpMatch) {
    codigoPostal = cpMatch[1];
  }

  // Extraer número
  const numMatch = direccion.match(/N[úu]m\.?\s*(\d+)/i);
  if (numMatch) {
    numero = numMatch[1];
  }

  // Extraer calle (todo antes de "Núm." o el número)
  const calleMatch = direccion.match(/^(.+?)(?:\s+N[úu]m\.?\s*\d+|\s+\d{5})/i);
  if (calleMatch) {
    calle = calleMatch[1].trim();
  } else {
    // Si no hay match, tomar todo antes del CP
    calle = direccion.split(/\d{5}/)[0].trim();
  }

  return { calle, numero, codigoPostal };
}


// ============================================================
// FUNCIÓN: deleteVado
// Elimina un vado (solo admin)
// ============================================================
export const deleteVado = onCall(
  {
    region: 'us-central1',
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Usuario no autenticado.');
    }

    const db = getDb();
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const userRole = userDoc.exists ? userDoc.data().role : null;

    if (userRole !== 'admin' && userRole !== 'supervisor') {
      throw new HttpsError('permission-denied', 'Solo administradores pueden eliminar vados.');
    }

    const { vadoId } = request.data;
    if (!vadoId) {
      throw new HttpsError('invalid-argument', 'Falta vadoId.');
    }

    try {
      // Eliminar subcolección de inspecciones
      const inspeccionesRef = db.collection('vados').doc(vadoId).collection('inspecciones');
      const inspecciones = await inspeccionesRef.get();
      
      const batch = db.batch();
      inspecciones.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Eliminar el vado
      batch.delete(db.collection('vados').doc(vadoId));
      
      await batch.commit();

      logger.info(`[deleteVado] Vado ${vadoId} eliminado`);
      return { success: true };

    } catch (error) {
      logger.error('[deleteVado] Error:', error);
      throw new HttpsError('internal', `Error al eliminar: ${error.message}`);
    }
  }
);


// ============================================================
// FUNCIÓN: updateVado
// Actualiza datos de un vado
// ============================================================
export const updateVado = onCall(
  {
    region: 'us-central1',
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Usuario no autenticado.');
    }

    const { vadoId, data } = request.data;
    if (!vadoId || !data) {
      throw new HttpsError('invalid-argument', 'Faltan parámetros.');
    }

    const db = getDb();

    try {
      await db.collection('vados').doc(vadoId).update({
        ...data,
        fechaActualizacion: FieldValue.serverTimestamp()
      });

      return { success: true };

    } catch (error) {
      logger.error('[updateVado] Error:', error);
      throw new HttpsError('internal', `Error al actualizar: ${error.message}`);
    }
  }
);


// ============================================================
// FUNCIÓN: createInspeccionVado
// Crea una nueva inspección para un vado
// ============================================================
export const createInspeccionVado = onCall(
  {
    region: 'us-central1',
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Usuario no autenticado.');
    }

    const { 
      vadoId, 
      resultado, 
      tipoIncidencia, 
      notas, 
      coordenadas,
      agenteId,
      agenteNombre 
    } = request.data;

    if (!vadoId || !resultado) {
      throw new HttpsError('invalid-argument', 'Faltan parámetros requeridos.');
    }

    const db = getDb();

    try {
      // Crear la inspección
      const inspeccionRef = await db
        .collection('vados')
        .doc(vadoId)
        .collection('inspecciones')
        .add({
          resultado,
          tipoIncidencia: tipoIncidencia || [],
          notas: notas || '',
          coordenadas: coordenadas || null,
          agenteId: agenteId || request.auth.uid,
          agenteNombre: agenteNombre || '',
          fecha: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp()
        });

      // Actualizar el vado con la fecha de última inspección
      // y coordenadas si se proporcionaron
      const updateData = {
        ultimaInspeccion: FieldValue.serverTimestamp()
      };

      if (coordenadas && coordenadas.lat && coordenadas.lng) {
        updateData['ubicacion.coordenadas'] = coordenadas;
      }

      await db.collection('vados').doc(vadoId).update(updateData);

      logger.info(`[createInspeccionVado] Inspección creada para vado ${vadoId}`);

      return { 
        success: true, 
        inspeccionId: inspeccionRef.id 
      };

    } catch (error) {
      logger.error('[createInspeccionVado] Error:', error);
      throw new HttpsError('internal', `Error al crear inspección: ${error.message}`);
    }
  }
);


// ============================================================
// FUNCIÓN: getVadosStats
// Obtiene estadísticas generales de vados
// ============================================================
export const getVadosStats = onCall(
  {
    region: 'us-central1',
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Usuario no autenticado.');
    }

    const db = getDb();

    try {
      const vadosSnapshot = await db.collection('vados').get();
      
      const now = new Date();
      const currentYear = now.getFullYear();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      let total = 0;
      let activos = 0;
      let thisYear = 0;
      let sinInspeccionar = 0;
      const porCalle = {};

      vadosSnapshot.docs.forEach(doc => {
        const data = doc.data();
        total++;

        if (data.expediente?.situacion === 'Alta') {
          activos++;
        }

        const año = data.expediente?.referencia?.split('/')[0];
        if (año === String(currentYear)) {
          thisYear++;
        }

        if (!data.ultimaInspeccion) {
          sinInspeccionar++;
        } else {
          const lastInsp = data.ultimaInspeccion.toDate ? data.ultimaInspeccion.toDate() : new Date(data.ultimaInspeccion);
          if (lastInsp < sixMonthsAgo) {
            sinInspeccionar++;
          }
        }

        const calle = data.ubicacion?.calle || 'Sin especificar';
        porCalle[calle] = (porCalle[calle] || 0) + 1;
      });

      return {
        total,
        activos,
        thisYear,
        sinInspeccionar,
        porCalle
      };

    } catch (error) {
      logger.error('[getVadosStats] Error:', error);
      throw new HttpsError('internal', `Error al obtener stats: ${error.message}`);
    }
  }
);


// ============================================================
// FUNCIÓN: searchVadosByLocation
// Busca vados por proximidad geográfica
// ============================================================
export const searchVadosByLocation = onCall(
  {
    region: 'us-central1',
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Usuario no autenticado.');
    }

    const { lat, lng, radiusKm = 0.5 } = request.data;

    if (!lat || !lng) {
      throw new HttpsError('invalid-argument', 'Faltan coordenadas.');
    }

    const db = getDb();

    try {
      // Obtener todos los vados con coordenadas
      const vadosSnapshot = await db.collection('vados')
        .where('ubicacion.coordenadas', '!=', null)
        .get();

      // Filtrar por distancia
      const nearbyVados = [];
      
      vadosSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const coords = data.ubicacion?.coordenadas;
        
        if (coords && coords.lat && coords.lng) {
          const distance = haversineDistance(lat, lng, coords.lat, coords.lng);
          
          if (distance <= radiusKm) {
            nearbyVados.push({
              id: doc.id,
              ...data,
              distancia: Math.round(distance * 1000) // en metros
            });
          }
        }
      });

      // Ordenar por distancia
      nearbyVados.sort((a, b) => a.distancia - b.distancia);

      return { vados: nearbyVados };

    } catch (error) {
      logger.error('[searchVadosByLocation] Error:', error);
      throw new HttpsError('internal', `Error en búsqueda: ${error.message}`);
    }
  }
);

/**
 * Calcula la distancia entre dos puntos usando la fórmula de Haversine
 * @returns Distancia en kilómetros
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// ============================================================
// MÓDULO TABLÓN DE ANUNCIOS
// ============================================================

/**
 * Obtiene los anuncios activos, ordenados por:
 * 1. Fijados (isPinned) primero
 * 2. Fecha de creación descendente
 */
export const getAnnouncements = onCall({ region: 'us-central1', cors: true }, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Auth requerida');
    
    const db = getDb();
    try {
        // Obtenemos todos (para un tablón no suelen ser miles, si crece mucho, paginamos)
        // Ordenamos por fecha, el ordenamiento de "Pinned" lo haremos en cliente o con índice compuesto
        const snapshot = await db.collection('announcements')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

        const items = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate().toISOString(),
            expiryDate: doc.data().expiryDate?.toDate().toISOString() || null
        }));

        return { success: true, announcements: items };
    } catch (error) {
        logger.error('Error fetching announcements:', error);
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Crea un anuncio (Solo Admin/Supervisor)
 */
export const createAnnouncement = onCall({ region: 'us-central1', cors: true }, async (request) => {
    // ... Validar ROL Admin/Supervisor aquí (como en ejemplos anteriores) ...
    
    const { title, content, category, priority, isPinned, expiryDate } = request.data;
    const db = getDb();

    try {
        await db.collection('announcements').add({
            title,
            content,
            category,
            priority: priority || 'normal',
            isPinned: !!isPinned,
            expiryDate: expiryDate ? new Date(expiryDate) : null,
            createdAt: FieldValue.serverTimestamp(),
            createdBy: request.auth.uid,
            authorName: request.auth.token.name || 'Jefatura'
        });
        return { success: true };
    } catch (error) {
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Eliminar anuncio
 */
export const deleteAnnouncement = onCall({ region: 'us-central1', cors: true }, async (request) => {
    // ... Validar ROL Admin ...
    const { id } = request.data;
    await getDb().collection('announcements').doc(id).delete();
    return { success: true };
});

// ============================================================
// ASIGNAR ARMA (CORREGIDA: Estado Pendiente)
// ============================================================
export const asignarArma = onCall(
  { region: 'us-central1', cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Usuario no autenticado.');
    }

    const db = getDb();
    
    // Verificar rol admin/supervisor
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const userRole = userDoc.exists ? userDoc.data().role : null;
    
    if (userRole !== 'admin' && userRole !== 'supervisor') {
      throw new HttpsError('permission-denied', 'Solo administradores pueden asignar armas.');
    }

    const {
      agenteId,
      agenteNombre,
      tipoArma,
      marca,
      modelo,
      calibre,
      numeroSerie,
      guiaPertenencia,
      fechaGuia,
      cargadores,
      municionAsignada,
      observaciones
    } = request.data;

    if (!agenteId || !tipoArma || !numeroSerie) {
      throw new HttpsError('invalid-argument', 'Faltan datos obligatorios.');
    }

    try {
      // Verificar que el arma no esté ya asignada (solo si está activa)
      const existente = await db.collection('dotaciones_armas')
        .where('numeroSerie', '==', numeroSerie)
        .where('estado', '==', 'activa')
        .get();

      if (!existente.empty) {
        throw new HttpsError('already-exists', 'Este arma ya está asignada y activa.');
      }

      // Crear asignación
      const docRef = await db.collection('dotaciones_armas').add({
        agenteId: String(agenteId),
        agenteNombre: agenteNombre || '',
        tipoArma,
        marca: marca || '',
        modelo: modelo || '',
        calibre: calibre || '9mm Parabellum',
        numeroSerie,
        guiaPertenencia: guiaPertenencia || '',
        fechaGuia: fechaGuia ? new Date(fechaGuia) : null,
        cargadores: cargadores || 2,
        municionAsignada: municionAsignada || 30,
        observaciones: observaciones || '',
        // 💡 CAMBIO CLAVE: Estado inicial pendiente
        estado: 'pendiente_aceptacion',
        fechaAsignacion: FieldValue.serverTimestamp(),
        fechaAceptacion: null,
        ultimaRevista: null,
        ultimaPractica: null,
        requiereRevista: true,
        createdAt: FieldValue.serverTimestamp(),
        createdBy: request.auth.uid,
        assignedByUid: request.auth.uid
      });

      logger.info(`[asignarArma] Arma ${numeroSerie} asignada (pendiente) a agente ${agenteId}`);

      return { success: true, armaId: docRef.id };

    } catch (error) {
      logger.error('[asignarArma] Error:', error);
      throw new HttpsError('internal', error.message);
    }
  }
);


// ============================================================
// ASIGNAR VESTUARIO (CORREGIDA: Estado Pendiente)
// ============================================================
export const asignarVestuario = onCall(
  { region: 'us-central1', cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Usuario no autenticado.');
    }

    const db = getDb();
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const userRole = userDoc.exists ? userDoc.data().role : null;
    
    if (userRole !== 'admin' && userRole !== 'supervisor') {
      throw new HttpsError('permission-denied', 'Solo administradores pueden entregar vestuario.');
    }

    const {
      agenteId,
      agenteNombre,
      tipo,
      categoria,
      talla,
      cantidad,
      añosRenovacion,
      observaciones
    } = request.data;

    if (!agenteId || !tipo || !talla) {
      throw new HttpsError('invalid-argument', 'Faltan datos obligatorios.');
    }

    try {
      const fechaEntrega = new Date(); // Fecha técnica de creación
      const fechaRenovacion = new Date();
      fechaRenovacion.setFullYear(fechaRenovacion.getFullYear() + (añosRenovacion || 3));

      const docRef = await db.collection('dotaciones_vestuario').add({
        agenteId: String(agenteId),
        agenteNombre: agenteNombre || '',
        tipo,
        categoria: categoria || '',
        talla,
        cantidad: cantidad || 1,
        // 💡 CAMBIO CLAVE
        estado: 'pendiente_aceptacion',
        fechaEntrega: FieldValue.serverTimestamp(),
        fechaAceptacion: null,
        fechaRenovacion,
        observaciones: observaciones || '',
        createdAt: FieldValue.serverTimestamp(),
        createdBy: request.auth.uid,
        assignedByUid: request.auth.uid
      });

      return { success: true, vestuarioId: docRef.id };
    } catch (error) {
      logger.error('[asignarVestuario] Error:', error);
      throw new HttpsError('internal', error.message);
    }
  }
);


// ============================================================
// ASIGNAR EQUIPAMIENTO (CORREGIDA: Estado Pendiente)
// ============================================================
export const asignarEquipamiento = onCall(
  { region: 'us-central1', cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Usuario no autenticado.');
    }

    const db = getDb();
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const userRole = userDoc.exists ? userDoc.data().role : null;
    
    if (userRole !== 'admin' && userRole !== 'supervisor') {
      throw new HttpsError('permission-denied', 'Solo administradores pueden asignar equipamiento.');
    }

    const {
      agenteId,
      agenteNombre,
      tipo,
      marca,
      modelo,
      numeroSerie,
      nivel,
      talla,
      proteccionArmaBlanca,
      añosVidaUtil,
      observaciones
    } = request.data;

    if (!agenteId || !tipo) {
      throw new HttpsError('invalid-argument', 'Faltan datos obligatorios.');
    }

    try {
      let fechaCaducidad = null;
      if (añosVidaUtil) {
        fechaCaducidad = new Date();
        fechaCaducidad.setFullYear(fechaCaducidad.getFullYear() + añosVidaUtil);
      }

      const docRef = await db.collection('dotaciones_equipamiento').add({
        agenteId: String(agenteId),
        agenteNombre: agenteNombre || '',
        tipo,
        marca: marca || '',
        modelo: modelo || '',
        numeroSerie: numeroSerie || '',
        nivel: nivel || '',
        talla: talla || '',
        proteccionArmaBlanca: proteccionArmaBlanca || false,
        // 💡 CAMBIO CLAVE
        estado: 'pendiente_aceptacion',
        fechaAsignacion: FieldValue.serverTimestamp(),
        fechaAceptacion: null,
        fechaCaducidad,
        ultimaRevision: null,
        observaciones: observaciones || '',
        createdAt: FieldValue.serverTimestamp(),
        createdBy: request.auth.uid,
        assignedByUid: request.auth.uid
      });

      return { success: true, equipamientoId: docRef.id };

    } catch (error) {
      logger.error('[asignarEquipamiento] Error:', error);
      throw new HttpsError('internal', error.message);
    }
  }
);

// ============================================================
// ACEPTAR ASIGNACIÓN (NUEVA FUNCIÓN)
// ============================================================
export const acceptAsignacion = onCall(
  { region: 'us-central1', cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Usuario no autenticado.');
    }

    const { id, collectionName } = request.data;
    if (!id || !collectionName) throw new HttpsError('invalid-argument', 'Faltan datos.');

    const db = getDb();
    const docRef = db.collection(collectionName).doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new HttpsError('not-found', 'La asignación no existe.');
    }

    const data = docSnap.data();

    // Seguridad: Solo el agente asignado puede aceptar
    // Obtenemos el ID del agente logueado desde su perfil de usuario (claims o doc)
    // Para simplificar, asumimos que request.auth.token.agentId está disponible
    // O buscamos el usuario:
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const userAgentId = userDoc.data().agentId;

    if (String(data.agenteId) !== String(userAgentId)) {
       // Nota: Si eres admin podrías forzar aceptación, pero lo ideal es que sea el agente.
       // Si quieres permitir admin, añade la comprobación de rol.
       throw new HttpsError('permission-denied', 'No puedes aceptar una asignación que no es tuya.');
    }

    await docRef.update({
      estado: 'activa',
      fechaAceptacion: FieldValue.serverTimestamp()
    });

    return { success: true };
  }
);


// ============================================================
// REGISTRAR REVISTA DE ARMAS
// ============================================================
export const registrarRevistaArmas = onCall(
  { region: 'us-central1', cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Usuario no autenticado.');
    }

    const db = getDb();

    const {
      agenteId,
      agenteNombre,
      armasRevisadas,
      resultado,
      observaciones
    } = request.data;

    if (!agenteId || !armasRevisadas || armasRevisadas.length === 0) {
      throw new HttpsError('invalid-argument', 'Faltan datos obligatorios.');
    }

    try {
      const ahora = new Date();
      const batch = db.batch();

      // Crear registro de revista
      const revistaRef = db.collection('revistas_armas').doc();
      batch.set(revistaRef, {
        agenteId,
        agenteNombre: agenteNombre || '',
        año: ahora.getFullYear(),
        mes: ahora.getMonth() + 1,
        fecha: FieldValue.serverTimestamp(),
        armasRevisadas,
        resultado: resultado || 'aprobada',
        observaciones: observaciones || '',
        inspectorId: request.auth.uid,
        createdAt: FieldValue.serverTimestamp()
      });

      // Actualizar fecha de última revista en cada arma
      for (const arma of armasRevisadas) {
        if (arma.armaId) {
          const armaRef = db.collection('dotaciones_armas').doc(arma.armaId);
          batch.update(armaRef, {
            ultimaRevista: FieldValue.serverTimestamp()
          });
        }
      }

      await batch.commit();

      logger.info(`[registrarRevistaArmas] Revista registrada para agente ${agenteId}`);

      return { success: true, revistaId: revistaRef.id };

    } catch (error) {
      logger.error('[registrarRevistaArmas] Error:', error);
      throw new HttpsError('internal', error.message);
    }
  }
);


// ============================================================
// REGISTRAR PRÁCTICA DE TIRO
// ============================================================
export const registrarPracticaTiro = onCall(
  { region: 'us-central1', cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Usuario no autenticado.');
    }

    const db = getDb();

    const {
      agenteId,
      agenteNombre,
      lugar,
      disparosRealizados,
      puntuacion,
      resultado,
      armaUtilizada,
      municionUtilizada,
      observaciones
    } = request.data;

    if (!agenteId || !disparosRealizados) {
      throw new HttpsError('invalid-argument', 'Faltan datos obligatorios.');
    }

    try {
      const batch = db.batch();

      // Crear registro de práctica
      const practicaRef = db.collection('practicas_tiro').doc();
      batch.set(practicaRef, {
        agenteId,
        agenteNombre: agenteNombre || '',
        fecha: FieldValue.serverTimestamp(),
        lugar: lugar || '',
        disparosRealizados: disparosRealizados || 0,
        puntuacion: puntuacion || 0,
        resultado: resultado || 'apto',
        armaUtilizada: armaUtilizada || null,
        municionUtilizada: municionUtilizada || 0,
        instructorId: request.auth.uid,
        observaciones: observaciones || '',
        createdAt: FieldValue.serverTimestamp()
      });

      // Actualizar fecha de última práctica en el arma utilizada
      if (armaUtilizada && armaUtilizada.id) {
        const armaRef = db.collection('dotaciones_armas').doc(armaUtilizada.id);
        batch.update(armaRef, {
          ultimaPractica: FieldValue.serverTimestamp()
        });
      }

      await batch.commit();

      logger.info(`[registrarPracticaTiro] Práctica registrada para agente ${agenteId}`);

      return { success: true, practicaId: practicaRef.id };

    } catch (error) {
      logger.error('[registrarPracticaTiro] Error:', error);
      throw new HttpsError('internal', error.message);
    }
  }
);


// ============================================================
// ELIMINAR ASIGNACIÓN (DAR DE BAJA)
// ============================================================
export const eliminarAsignacion = onCall(
  { region: 'us-central1', cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Usuario no autenticado.');
    }

    const db = getDb();
    
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const userRole = userDoc.exists ? userDoc.data().role : null;
    
    if (userRole !== 'admin' && userRole !== 'supervisor') {
      throw new HttpsError('permission-denied', 'Solo administradores pueden dar de baja asignaciones.');
    }

    const { tipo, asignacionId, motivo } = request.data;

    if (!tipo || !asignacionId) {
      throw new HttpsError('invalid-argument', 'Faltan parámetros.');
    }

    const coleccion = `dotaciones_${tipo}`;

    try {
      await db.collection(coleccion).doc(asignacionId).update({
        estado: 'baja',
        fechaBaja: FieldValue.serverTimestamp(),
        motivoBaja: motivo || '',
        bajaBy: request.auth.uid
      });

      logger.info(`[eliminarAsignacion] Baja de ${tipo} ${asignacionId}`);

      return { success: true };

    } catch (error) {
      logger.error('[eliminarAsignacion] Error:', error);
      throw new HttpsError('internal', error.message);
    }
  }
);


// ============================================================
// OBTENER ESTADÍSTICAS
// ============================================================
export const getDotacionesStats = onCall(
  { region: 'us-central1', cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Usuario no autenticado.');
    }

    const db = getDb();

    try {
      const [armasSnap, vestuarioSnap, equipamientoSnap] = await Promise.all([
        db.collection('dotaciones_armas').where('estado', '==', 'activa').get(),
        db.collection('dotaciones_vestuario').where('estado', '==', 'activa').get(),
        db.collection('dotaciones_equipamiento').where('estado', '==', 'activa').get()
      ]);

      const ahora = new Date();
      const añoActual = ahora.getFullYear();
      const mesActual = ahora.getMonth();

      // Calcular pendientes de revista (abril cada año)
      let pendientesRevista = 0;
      armasSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.requiereRevista) {
          const ultimaRevista = data.ultimaRevista?.toDate();
          if (!ultimaRevista) {
            pendientesRevista++;
          } else {
            // Si estamos en abril o después, debe ser de este año
            if (mesActual >= 3 && ultimaRevista.getFullYear() < añoActual) {
              pendientesRevista++;
            }
          }
        }
      });

      // Calcular chalecos próximos a vencer
      let chalecosProximosVencer = 0;
      equipamientoSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.tipo === 'chaleco_balistico' && data.fechaCaducidad) {
          const caducidad = data.fechaCaducidad.toDate();
          const diasRestantes = Math.ceil((caducidad - ahora) / (1000 * 60 * 60 * 24));
          if (diasRestantes <= 90 && diasRestantes > 0) {
            chalecosProximosVencer++;
          }
        }
      });

      return {
        totalArmas: armasSnap.size,
        totalVestuario: vestuarioSnap.size,
        totalEquipamiento: equipamientoSnap.size,
        pendientesRevista,
        chalecosProximosVencer
      };

    } catch (error) {
      logger.error('[getDotacionesStats] Error:', error);
      throw new HttpsError('internal', error.message);
    }
  }
);


// ============================================================
// BUSCAR AGENTES CON PENDIENTES
// ============================================================
export const getAgentesPendientes = onCall(
  { region: 'us-central1', cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Usuario no autenticado.');
    }

    const db = getDb();
    const { tipoPendiente } = request.data; // 'revista', 'renovacion', 'practica'

    try {
      const agentesSet = new Set();

      if (tipoPendiente === 'revista' || !tipoPendiente) {
        const armasSnap = await db.collection('dotaciones_armas')
          .where('estado', '==', 'activa')
          .where('requiereRevista', '==', true)
          .get();

        const ahora = new Date();
        const añoActual = ahora.getFullYear();
        const mesActual = ahora.getMonth();

        armasSnap.docs.forEach(doc => {
          const data = doc.data();
          const ultimaRevista = data.ultimaRevista?.toDate();
          if (!ultimaRevista || (mesActual >= 3 && ultimaRevista.getFullYear() < añoActual)) {
            agentesSet.add(data.agenteId);
          }
        });
      }

      if (tipoPendiente === 'practica' || !tipoPendiente) {
        const armasSnap = await db.collection('dotaciones_armas')
          .where('estado', '==', 'activa')
          .get();

        const seisMesesAtras = new Date();
        seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);

        armasSnap.docs.forEach(doc => {
          const data = doc.data();
          const ultimaPractica = data.ultimaPractica?.toDate();
          if (!ultimaPractica || ultimaPractica < seisMesesAtras) {
            agentesSet.add(data.agenteId);
          }
        });
      }

      return { agentes: Array.from(agentesSet) };

    } catch (error) {
      logger.error('[getAgentesPendientes] Error:', error);
      throw new HttpsError('internal', error.message);
    }
  }
);

// --- AÑADIR ESTA CONSTANTE FUERA DE LA FUNCIÓN (O DENTRO SI PREFIERES) ---


// --- FUNCIÓN CORREGIDA ---
export const generateServiceReportPdf = onCall(
  {
    region: 'us-central1',
    memory: '1GB',
    timeoutSeconds: 120,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
    }

    const { reportId } = request.data;
    if (!reportId) {
      throw new HttpsError('invalid-argument', 'Falta el ID del parte.');
    }

    const SUMMARY_FIELD_LABELS = {
  estacionamiento_indebido: 'Estacionamiento Indebido',
  denuncias_trafico: 'Denuncias Tráfico',
  informes_trafico: 'Informes Tráfico',
  delitos_trafico: 'Delitos Seg. Vial',
  controles_trafico: 'Controles Tráfico',
  regulacion_trafico: 'Regulación Tráfico',
  deposito_vehiculos: 'Depósito Vehículos',
  diligencias_prevencion: 'Diligencias Prevención',
  otros_trafico: 'Otros (Tráfico)',
  contrap_patrimonio: 'Contra el Patrimonio',
  salud_publica: 'Contra la Salud Pública',
  denuncias_seguridad: 'Denuncias Seg. Ciudadana',
  identificaciones: 'Identificaciones',
  reyertas: 'Reyertas',
  violencia_genero: 'Violencia de Género',
  minutas: 'Minutas/Diligencias',
  detenidos_ciudadana: 'Detenidos',
  solicitud_datos_gc: 'Solicitud Datos GC',
  anomalias_via: 'Anomalías Vía Pública',
  vehiculos_abandonados: 'Vehículos Abandonados',
  denuncias_oomm: 'Denuncias O.O.M.M.',
  inspecciones_locales: 'Inspecciones Locales',
  inspecciones_obras: 'Inspecciones Obras',
  notificaciones: 'Notificaciones',
  informes_admin: 'Informes Administrativos',
  certificados_convivencia: 'Cert. Convivencia',
  auxilio_personas: 'Auxilio a Personas',
  fallecimientos: 'Fallecimientos',
  colab_bomberos: 'Colaboración Bomberos',
  colaboracion_gc: 'Colaboración GC',
  colab_sanitarios: 'Colaboración Sanitarios',
  intervencion_menores: 'Intervención Menores',
  req_ciudadanos: 'Requerimientos Ciudadanos',
  recepcion_llamadas: 'Recepción Llamadas',
  recepcion_denuncias: 'Recepción Denuncias',
  citaciones: 'Citaciones',
  diligencias_exposicion: 'Diligencias Exposición'
};

    const db = getDb();
    // Importación dinámica para optimizar arranque
    const PDFDocument = (await import('pdfkit')).default;

    try {
      // 1. Obtener datos
      const reportDoc = await db.collection('serviceReports').doc(reportId).get();
      if (!reportDoc.exists) throw new HttpsError('not-found', 'Parte no encontrado.');
      const report = reportDoc.data();

      let order = {};
      if (report.order_id) {
        const orderDoc = await db.collection('serviceOrders').doc(report.order_id).get();
        if (orderDoc.exists) order = orderDoc.data();
      }

      const entriesSnap = await db.collection('serviceReports').doc(reportId).collection('reportEntries').orderBy('createdAt', 'asc').get();
      const entries = entriesSnap.docs.map(d => d.data());

      const reqsSnap = await db.collection('serviceReports').doc(reportId).collection('requerimientos').orderBy('createdAt', 'asc').get();
      const requerimientos = reqsSnap.docs.map(d => d.data());

      // 2. Iniciar PDF
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));

      // --- CABECERA ---
      const logoBuffer = await downloadLogoFromStorage();
      if (logoBuffer) {
        doc.image(logoBuffer, 50, 45, { width: 60 });
      }

      doc.font('Helvetica-Bold').fontSize(16).text('PARTE DE SERVICIO DIARIO', 0, 50, { align: 'center' });
      doc.fontSize(10).text('JEFATURA DE POLICÍA LOCAL', 0, 70, { align: 'center' });
      doc.moveDown(3);

      // --- INFO GENERAL ---
      const startY = doc.y;
      const dateStr = order.service_date ? formatInTimeZone(order.service_date.toDate(), MADRID_TIMEZONE, 'dd/MM/yyyy', { locale: es }) : '---';
      
      doc.rect(50, startY, 500, 65).stroke();
      doc.font('Helvetica-Bold').fontSize(10);
      
      doc.text('FECHA:', 60, startY + 10);
      doc.font('Helvetica').text(dateStr, 120, startY + 10);

      doc.font('Helvetica-Bold').text('TURNO:', 300, startY + 10);
      doc.font('Helvetica').text(order.service_shift || '---', 360, startY + 10);

      doc.font('Helvetica-Bold').text('Nº REGISTRO:', 60, startY + 30);
      doc.font('Helvetica').text(order.order_reg_number || '---', 140, startY + 30);

      doc.font('Helvetica-Bold').text('AGENTES:', 60, startY + 50);
      const agentesStr = (report.assigned_agents || []).join(', ');
      doc.font('Helvetica').text(agentesStr, 120, startY + 50);

      doc.moveDown(4);

      // --- 1. INSTRUCCIONES ---
      doc.font('Helvetica-Bold').fontSize(12).text('1. INSTRUCCIONES DEL SERVICIO (BRIEFING)', { underline: true });
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(10);
      if (order.description) {
        doc.text(order.description, { align: 'justify' });
      } else {
        doc.text('Sin instrucciones específicas.', { align: 'justify', color: 'grey' });
      }
      doc.moveDown(2);

      // --- 2. NOVEDADES ---
      doc.font('Helvetica-Bold').fontSize(12).fillColor('black').text('2. NOVEDADES Y ACTUACIONES', { underline: true });
      doc.moveDown(0.5);

      if (entries.length > 0) {
        entries.forEach(entry => {
            const time = entry.createdAt ? formatInTimeZone(entry.createdAt.toDate(), MADRID_TIMEZONE, 'HH:mm') : '--:--';
            
            if (doc.y > 700) doc.addPage();

            doc.font('Helvetica-Bold').fontSize(9).text(`[${time}] Agente ${entry.createdByAgentName || '---'}:`);
            doc.font('Helvetica').fontSize(10).text(entry.description, { indent: 20, align: 'justify' });
            doc.moveDown(0.5);
        });
      } else {
        doc.font('Helvetica').fontSize(10).text('No se registraron novedades.', { color: 'grey' });
      }
      doc.moveDown(2);

      // --- 3. REQUERIMIENTOS (CORREGIDO) ---
      if (doc.y > 650) doc.addPage();
      doc.font('Helvetica-Bold').fontSize(12).fillColor('black').text('3. REQUERIMIENTOS CIUDADANOS', { underline: true });
      doc.moveDown(0.5);

      if (requerimientos.length > 0) {
          requerimientos.forEach(req => {
             if (doc.y > 700) doc.addPage();
             
             const estado = req.isResolved ? '(RESUELTO)' : '(PENDIENTE)';
             const colorEstado = req.isResolved ? 'green' : 'red';
             
             // CORRECCIONES APLICADAS:
             // 1. Hora default '--:--'
             // 2. Requirente default 'Ciudadano'
             doc.font('Helvetica-Bold').fontSize(9).fillColor('black')
                .text(`• ${req.hora || '--:--'} - ${req.requirente || 'Ciudadano'} `, { continued: true })
                .fillColor(colorEstado).text(estado);
             
             // 3. Motivo default '' (string vacío) para evitar 'undefined'
             doc.font('Helvetica').fontSize(10).fillColor('black')
                .text(`Motivo: ${req.motivo || ''}`, { indent: 15 });
             
             if(req.resolutionComment) {
                 doc.font('Helvetica-Oblique').fontSize(9).text(`Resolución: ${req.resolutionComment}`, { indent: 15, color: '#444' });
             }
             doc.moveDown(0.5);
          });
      } else {
          doc.font('Helvetica').fontSize(10).text('No hay requerimientos registrados.', { color: 'grey' });
      }

      // --- 4. ACTUACIONES ESTADÍSTICAS (NUEVO) ---
      doc.moveDown(2);
      if (doc.y > 650) doc.addPage();
      doc.font('Helvetica-Bold').fontSize(12).fillColor('black').text('4. ESTADÍSTICAS DEL SERVICIO', { underline: true });
      doc.moveDown(0.5);

      const summary = report.summary || {};
      const entriesSummary = Object.entries(summary).filter(([k, v]) => v > 0);

      if (entriesSummary.length > 0) {
          // Imprimir en dos columnas simples
          const col1X = 50;
          const col2X = 300;
          let currentY = doc.y;
          let isCol2 = false;

          entriesSummary.forEach(([key, value]) => {
              const label = SUMMARY_FIELD_LABELS[key] || key; // Usamos el mapa para traducir
              
              if (currentY > 750) {
                  doc.addPage();
                  currentY = 50;
                  isCol2 = false;
              }

              const xPos = isCol2 ? col2X : col1X;
              
              doc.font('Helvetica').fontSize(10).text(`${label}:`, xPos, currentY, { continued: true });
              doc.font('Helvetica-Bold').text(` ${value}`);

              if (isCol2) {
                  currentY += 15; // Salto de línea cada 2 elementos
                  isCol2 = false;
              } else {
                  isCol2 = true;
              }
          });
          // Asegurar que el cursor baje al final
          doc.y = currentY + 20; 
      } else {
          doc.font('Helvetica').fontSize(10).text('No se registraron actuaciones estadísticas.', { color: 'grey' });
      }

      // --- FIN ---
      doc.end();

      const pdfBase64 = await new Promise((resolve) => {
        doc.on('end', () => resolve(Buffer.concat(buffers).toString('base64')));
      });
      
      return { success: true, pdfBase64: pdfBase64 };

    } catch (error) {
      logger.error('Error generando PDF de parte:', error);
      throw new HttpsError('internal', 'No se pudo generar el PDF.');
    }
  }
);