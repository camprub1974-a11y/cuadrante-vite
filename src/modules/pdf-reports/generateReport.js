// Archivo: functions/src/modules/pdf-reports/generateReport.js

const admin = require('firebase-admin');
const PDFDocument = require('pdfkit');
const { format } = require('date-fns');
const { es } = require('date-fns/locale');
const { getStorage } = require('firebase-admin/storage'); // 💡 Importar Storage

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Función auxiliar para descargar el logo desde Storage a un Buffer
 */
async function downloadLogoBuffer() {
    try {
        const bucket = getStorage().bucket();
        // 💡 RUTA HARDCODEADA CORRECTA (Verifica en tu consola de Firebase Storage que existe)
        const filePath = 'assets/escudo_policia_local.png'; 
        console.log(`[PDF] Intentando descargar logo desde: ${filePath}`);
        
        const file = bucket.file(filePath);
        const [exists] = await file.exists();
        
        if (!exists) {
            console.warn(`[PDF] El archivo ${filePath} NO existe en el bucket.`);
            return null;
        }

        const [buffer] = await file.download();
        console.log(`[PDF] Logo descargado correctamente (${buffer.length} bytes)`);
        return buffer;
    } catch (error) {
        console.error("[PDF] Error descargando el logo:", error);
        return null; 
    }
}

/**
 * Genera un informe PDF de servicios extraordinarios.
 * @param {string} agentId - El ID del agente para filtrar los servicios.
 * @param {string} [startDateStr] - Fecha de inicio (YYYY-MM-DD).
 * @param {string} [endDateStr] - Fecha de fin (YYYY-MM-DD).
 * @param {Array} [agentIds] - Lista de IDs para informe múltiple.
 * @param {boolean} [allAgents] - Si es true, ignora agentIds.
 */
async function generateExtraordinaryServicesPdfReport(agentId, startDateStr, endDateStr, agentIds = [], allAgents = false) {
  
  console.log("[PDF] Iniciando generación de informe...");
  const logoBuffer = await downloadLogoBuffer();

  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
    });

    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });

    try {
      // --- LOGO DE CABECERA ---
      if (logoBuffer) {
          // Ajusta coordenadas (x, y) y tamaño (width) según necesites
          doc.image(logoBuffer, 50, 45, { width: 50 });
      }

      // --- TEXTO CABECERA (Alineado para dejar hueco al logo) ---
      doc.font('Helvetica-Bold').fontSize(16).text('AYUNTAMIENTO DE CHAUCHINA', 110, 50);
      doc.fontSize(12).text('JEFATURA DE POLICÍA LOCAL', 110, 70);
      doc.moveDown(2);

      // Título del Informe
      doc.font('Helvetica-Bold').fontSize(14).text('INFORME DE SERVICIOS EXTRAORDINARIOS', { align: 'center' });
      doc.moveDown(0.5);

      // Rango de Fechas
      if (startDateStr && endDateStr) {
        const start = format(new Date(startDateStr), 'dd/MM/yyyy');
        const end = format(new Date(endDateStr), 'dd/MM/yyyy');
        doc.font('Helvetica').fontSize(10).text(`Periodo: ${start} - ${end}`, { align: 'center' });
      }
      doc.moveDown(1.5);

      // --- CONSULTA DE DATOS ---
      let query = db.collection('extraordinaryServices');

      if (startDateStr) {
        const start = new Date(startDateStr);
        start.setHours(0, 0, 0, 0);
        query = query.where('date', '>=', admin.firestore.Timestamp.fromDate(start));
      }
      
      if (endDateStr) {
        const end = new Date(endDateStr);
        end.setHours(23, 59, 59, 999);
        query = query.where('date', '<=', admin.firestore.Timestamp.fromDate(end));
      }

      const snapshot = await query.orderBy('date', 'asc').get();
      let services = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Filtrado por Agente(s) en memoria (Firestore 'in' tiene límites)
      if (!allAgents) {
          const targetAgents = agentId ? [String(agentId)] : agentIds.map(String);
          if (targetAgents.length > 0) {
              services = services.filter(s => targetAgents.includes(String(s.agentId)));
          }
      }

      if (services.length === 0) {
        doc.fontSize(12).text('No se encontraron servicios extraordinarios en este periodo.', { align: 'center' });
        doc.end();
        return;
      }

      // --- TABLA DE DATOS ---
      // Agrupar por Agente para mayor claridad
      const servicesByAgent = services.reduce((acc, curr) => {
          const id = curr.agentId;
          if (!acc[id]) acc[id] = { name: curr.agentName || `Agente ${id}`, items: [] };
          acc[id].items.push(curr);
          return acc;
      }, {});

      let granTotal = 0;

      Object.values(servicesByAgent).forEach((agentGroup, index) => {
          if (index > 0) doc.moveDown(1.5); // Espacio entre agentes

          // Cabecera de Agente
          doc.font('Helvetica-Bold').fontSize(12).fillColor('#000').text(`Agente: ${agentGroup.name}`);
          doc.moveDown(0.5);

          // Cabecera de Tabla
          const startY = doc.y;
          doc.font('Helvetica-Bold').fontSize(9);
          doc.text('Fecha', 50, startY, { width: 80 });
          doc.text('Concepto / Tipo', 130, startY, { width: 200 });
          doc.text('Horas', 340, startY, { width: 50, align: 'right' });
          doc.text('Precio', 400, startY, { width: 60, align: 'right' });
          doc.text('Total', 470, startY, { width: 70, align: 'right' });

          doc.moveTo(50, doc.y + 2).lineTo(550, doc.y + 2).stroke();
          doc.moveDown(0.5);

          let subTotal = 0;

          // Filas
          doc.font('Helvetica').fontSize(9);
          agentGroup.items.forEach(s => {
              const date = s.date.toDate ? s.date.toDate() : new Date(s.date);
              const dateStr = format(date, 'dd/MM/yyyy');
              const totalRow = (s.hours || 0) * (s.price || 0);
              subTotal += totalRow;

              const y = doc.y;
              doc.text(dateStr, 50, y, { width: 80 });
              doc.text(s.type + (s.notes ? ` (${s.notes})` : ''), 130, y, { width: 200 });
              doc.text(s.hours, 340, y, { width: 50, align: 'right' });
              doc.text(`${s.price.toFixed(2)}€`, 400, y, { width: 60, align: 'right' });
              doc.text(`${totalRow.toFixed(2)}€`, 470, y, { width: 70, align: 'right' });
              
              doc.moveDown(0.8);
          });

          // Subtotal Agente
          doc.font('Helvetica-Bold');
          doc.text(`Total Agente: ${subTotal.toFixed(2)} €`, 350, doc.y, { align: 'right', width: 190 });
          
          granTotal += subTotal;
      });

      // --- GRAN TOTAL ---
      doc.moveDown(2);
      doc.fontSize(12).text(`IMPORTE TOTAL PERIODO: ${granTotal.toFixed(2)} €`, { align: 'right' });

      doc.end();

    } catch (error) {
      console.error('Error generando PDF:', error);
      reject(error);
    }
  });
}

module.exports = { generateExtraordinaryServicesPdfReport };