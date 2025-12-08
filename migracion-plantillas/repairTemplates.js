// Archivo: fixCorruptedTemplates.js
// Script para corregir el HTML corrompido por Cheerio en las plantillas

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const COLLECTION_NAME = 'documentTemplates';

async function fixTemplates() {
  console.log('🔧 Iniciando corrección de plantillas corrompidas...\n');

  try {
    const snapshot = await db.collection(COLLECTION_NAME).get();
    
    if (snapshot.empty) {
      console.log('No se encontraron plantillas.');
      return;
    }

    let fixedCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      if (!data.content) {
        continue;
      }

      let content = data.content;
      let hasChanges = false;

      // =====================================================
      // CORRECCIONES DE SINTAXIS HANDLEBARS CORROMPIDA
      // =====================================================

      // Patrón 1: {{#if variable}}checked{{="" if}}="" → {{#if variable}}checked{{/if}}
      const pattern1 = /\{\{#if\s+(\w+)\}\}checked\{\{=""\s*if\}\}=""/g;
      if (pattern1.test(content)) {
        content = content.replace(pattern1, '{{#if $1}}checked{{/if}}');
        hasChanges = true;
        console.log(`   ✅ Corregido patrón {{#if}}checked{{/if}} en: ${doc.id}`);
      }

      // Patrón 2: {{/if}} corrompido como {{="" if}}=""
      const pattern2 = /\{\{=""\s*if\}\}=""/g;
      if (pattern2.test(content)) {
        content = content.replace(pattern2, '{{/if}}');
        hasChanges = true;
        console.log(`   ✅ Corregido {{/if}} corrompido en: ${doc.id}`);
      }

      // Patrón 3: disabled="" → disabled
      const pattern3 = /disabled=""/g;
      if (pattern3.test(content)) {
        content = content.replace(pattern3, 'disabled');
        hasChanges = true;
        console.log(`   ✅ Corregido disabled="" en: ${doc.id}`);
      }

      // Patrón 4: Cualquier {{="" algo}}="" residual
      const pattern4 = /\{\{=""\s*(\w+)\}\}=""/g;
      if (pattern4.test(content)) {
        content = content.replace(pattern4, '{{/$1}}');
        hasChanges = true;
        console.log(`   ✅ Corregido sintaxis residual en: ${doc.id}`);
      }

      // Patrón 5: checked{{="" → checked{{/
      const pattern5 = /checked\{\{=""/g;
      if (pattern5.test(content)) {
        content = content.replace(pattern5, 'checked{{/');
        hasChanges = true;
      }

      // Guardar si hubo cambios
      if (hasChanges) {
        await db.collection(COLLECTION_NAME).doc(doc.id).update({
          content: content,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`💾 Guardada plantilla corregida: ${data.templateName || doc.id}\n`);
        fixedCount++;
      }
    }

    console.log(`\n✨ Proceso finalizado. Plantillas corregidas: ${fixedCount}`);

  } catch (error) {
    console.error('❌ Error durante la corrección:', error);
  }
}

fixTemplates();