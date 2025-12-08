const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { logger } = require("firebase-functions");

const db = getFirestore();

/**
 * Genera un número de registro único y secuencial para cada nueva orden de servicio.
 * Se dispara cuando se crea un documento en 'serviceOrders'.
 */
exports.generateOrderRegNumber = onDocumentCreated("serviceOrders/{orderId}", async (event) => {
    const snap = event.data;
    if (!snap) {
        logger.warn("No data associated with the event.");
        return;
    }

    // No ejecutar si ya tiene un número (ej. importación manual)
    if (snap.data().order_reg_number) {
        return;
    }

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