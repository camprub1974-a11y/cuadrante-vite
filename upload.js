import admin from 'firebase-admin';
import serviceAccount from './serviceAccountKey.json' with { type: 'json' };
import docData from './documentTemplate.json' with { type: 'json' };

// Inicializar el SDK de Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Función para subir el documento
async function uploadTemplate() {
  try {
<<<<<<< HEAD
    const docRef = db.doc('documentTemplates/AIvwJzCCaqV6sNa34zFy');
=======
    const docRef = db.doc('documentTemplates/JzYC4UwYQliihn9TweBJ');
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
    await docRef.set(docData, { merge: true });
    console.log('Documento subido con éxito.');
  } catch (err) {
    console.error('Error subiendo documento:', err);
  }
}

// Ejecutar la función
uploadTemplate();
