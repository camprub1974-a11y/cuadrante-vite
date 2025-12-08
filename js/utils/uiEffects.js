/**
 * js/utils/uiEffects.js
 * * Basado en la "GUÍA DE IMPLEMENTACIÓN - EFECTOS MODERNOS"
 * Inicializa todos los efectos visuales modernos, como Ripple.
 * La lógica de View Transitions se maneja en viewManager.js.
 */

/**
 * Función principal que se llama desde main.js para activar todos los efectos.
 */
export function initAllEffects() {
  console.log('✨ Inicializando Efectos de UI Modernos...');
  initRippleEffects();
}

/**
 * Busca todos los botones y elementos con la clase 'ripple-effect'
 * y les añade el listener para el efecto de ondulación.
 */
function initRippleEffects() {
  // Aplicamos el efecto a cualquier elemento con .ripple-effect
  // o a todos los elementos .button por defecto.
  const rippleElements = document.querySelectorAll(
    '.ripple-effect, .button, .module-tab'
  );

  rippleElements.forEach(elem => {
    elem.addEventListener('mousedown', function(e) {
      // Prevenir múltiples ripples si el listener se añade por error varias veces
      if (this.querySelector('.ripple-span')) {
        this.querySelector('.ripple-span').remove();
      }

      const rect = this.getBoundingClientRect();
      const ripple = document.createElement('span');
      const size = Math.max(rect.width, rect.height) * 2;
      
      ripple.className = 'ripple-span';
      ripple.style.width = ripple.style.height = `${size}px`;
      // Calcular la posición del clic relativa al botón
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;

      this.appendChild(ripple);

      // Limpieza: eliminar el span después de que termine la animación
      ripple.addEventListener('animationend', () => {
        ripple.remove();
      });
    });
  });
}