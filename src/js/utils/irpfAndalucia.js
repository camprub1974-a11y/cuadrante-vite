// src/js/utils/irpfAndalucia.js

/**
 * TABLA DE RETENCIONES IRPF 2025 (Estimación Agregada Estado + Andalucía)
 * Basada en la escala general y la escala autonómica de Andalucía vigente.
 * * Nota: Esto calcula el TIPO MARGINAL (cuánto pagas por el último euro ganado),
 * no el tipo medio exacto (que depende de hijos, discapacidad, etc.), 
 * pero es el indicador clave para saber si te "pasas de tramo".
 */
export const TRAMOS_IRPF_2025 = [
    { limite: 0, hasta: 12450, tipo: 19.0, label: "Tramo 1 (Mínimo)" },
    { limite: 12450, hasta: 20200, tipo: 24.0, label: "Tramo 2" },
    { limite: 20200, hasta: 28000, tipo: 30.0, label: "Tramo 3 (Salto Medio)" }, // Andalucía tiene un corte aquí
    { limite: 28000, hasta: 35200, tipo: 30.0, label: "Tramo 3b (Continuación)" },
    { limite: 35200, hasta: 60000, tipo: 37.0, label: "Tramo 4 (Alto)" },
    { limite: 60000, hasta: 300000, tipo: 45.0, label: "Tramo 5 (Muy Alto)" },
    { limite: 300000, hasta: Infinity, tipo: 47.0, label: "Tramo 6 (Máximo)" }
];

export function calcularSituacionIRPF(datos) {
    const { sueldoFijo, extras, seguridadSocialPct = 4.7, reducciones = 0 } = datos;

    // 1. Calcular Bruto Anual Total
    const totalExtras = extras.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0);
    const brutoAnual = parseFloat(sueldoFijo) + totalExtras;

    // 2. Calcular Gastos Deducibles (Seguridad Social)
    // Funcionarios suelen ser Clases Pasivas (MUFACE) o Régimen General (4.7% aprox)
    const gastosSS = (brutoAnual * seguridadSocialPct) / 100;

    // 3. Base Liquidable (Aprox)
    // Restamos SS y el mínimo por descendientes/situación (simplificado en 'reducciones')
    // En un sistema real, se calcula el mínimo personal (5.550€) + hijos, y se resta la cuota, no la base.
    // PARA ESTA HERRAMIENTA DE "ALERTA DE TRAMO", usamos la Base Imponible General.
    const baseImponible = brutoAnual - gastosSS - 2000; // 2000€ es la reducción general por rendimientos del trabajo

    // 4. Encontrar Tramo Actual
    let tramoActual = TRAMOS_IRPF_2025[0];
    let tramoSiguiente = null;
    let distanciaSiguiente = 0;

    for (let i = 0; i < TRAMOS_IRPF_2025.length; i++) {
        const tramo = TRAMOS_IRPF_2025[i];
        if (baseImponible > tramo.limite && baseImponible <= tramo.hasta) {
            tramoActual = tramo;
            tramoSiguiente = TRAMOS_IRPF_2025[i+1] || null;
            
            if (tramoSiguiente) {
                distanciaSiguiente = tramo.hasta - baseImponible;
            }
            break;
        }
    }

    return {
        brutoAnual,
        totalExtras,
        baseImponible,
        tramoActual,
        tramoSiguiente,
        distanciaSiguiente, // Cuánto dinero falta para saltar de tramo
        alertaSalto: distanciaSiguiente > 0 && distanciaSiguiente < 1000 // Alerta si estás a menos de 1000€ del salto
    };
}