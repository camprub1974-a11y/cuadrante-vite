const admin = require('firebase-admin');
const cheerio = require('cheerio');
const serviceAccount = require('./serviceAccountKey.json'); // ⚠️ Asegúrate de tener este archivo

// 1. Inicializar Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const COLLECTION_NAME = 'documentTemplates';

async function updateTemplates() {
  console.log('🚀 Iniciando migración de plantillas...');

  try {
    // 2. Obtener todas las plantillas
    const snapshot = await db.collection(COLLECTION_NAME).get();
    
    if (snapshot.empty) {
      console.log('No se encontraron plantillas.');
      return;
    }

    let updatedCount = 0;

    // 3. Iterar sobre cada documento
    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      if (!data.content) {
        console.log(`⏩ Saltando ${doc.id} (sin contenido HTML).`);
        continue;
      }

      // Obtener la lista de campos/placeholders de la plantilla
      // Usamos 'placeholders' si existe, si no, extraemos las keys del 'schema'
      let fieldKeys = [];
      if (data.placeholders && Array.isArray(data.placeholders)) {
        fieldKeys = data.placeholders;
      } else if (data.schema) {
        fieldKeys = Object.keys(data.schema);
      } else {
        console.log(`⏩ Saltando ${doc.id} (no tiene placeholders ni schema definidos).`);
        continue;
      }

      console.log(`\n🔍 Procesando plantilla: ${data.templateName || doc.id}`);
      
      // 4. Cargar HTML en Cheerio
      // decodeEntities: false evita que se rompan caracteres especiales como tildes
      const $ = cheerio.load(data.content, { decodeEntities: false });
      let hasChanges = false;

      // 5. Buscar e inyectar data-field-id
      fieldKeys.forEach(key => {
        const placeholder = `{{${key}}}`;
        
        // Buscamos elementos que contengan el texto del placeholder
        // Filtramos para encontrar el elemento más profundo (el padre directo)
        const elements = $(`:contains('${placeholder}')`).filter((i, el) => {
            // Esta lógica asegura que seleccionamos el padre directo y no un contenedor abuelo
            // (Si el elemento tiene hijos que TAMBIÉN contienen el texto, entonces no es el padre directo)
            return $(el).children(`:contains('${placeholder}')`).length === 0;
        });

        if (elements.length > 0) {
          elements.each((i, el) => {
            const currentAttr = $(el).attr('data-field-id');
            // Solo añadir si no lo tiene ya
            if (currentAttr !== key) {
                $(el).attr('data-field-id', key);
                console.log(`   ✅ Atributo añadido para: ${key}`);
                hasChanges = true;
            }
          });
        } else {
          console.log(`   ⚠️ No se encontró en el HTML la etiqueta para: ${key}`);
        }
      });

      // 6. Guardar si hubo cambios
      if (hasChanges) {
        const newHtml = $.html(); // Recuperar el HTML completo
        await db.collection(COLLECTION_NAME).doc(doc.id).update({
          content: newHtml,
          updatedAt: admin.firestore.FieldValue.serverTimestamp() // Opcional: marcar actualización
        });
        console.log(`💾 Guardada plantilla: ${doc.id}`);
        updatedCount++;
      } else {
        console.log(`   (Sin cambios necesarios)`);
      }
    }

    console.log(`\n✨ Proceso finalizado. Plantillas actualizadas: ${updatedCount}`);

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
  }
}

// Ejecutar
updateTemplates();