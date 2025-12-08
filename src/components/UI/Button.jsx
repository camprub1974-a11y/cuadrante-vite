import React from 'react';

// Mapeo de tus variantes a tus clases CSS originales
const VARIANTS = {
  primary: 'btn-gradient-primary',
  success: 'btn-gradient-success',
  danger: 'button-danger',
  secondary: 'button-secondary',
  ghost: 'button-ghost'
};

export default function Button({ 
  children, 
  variant = 'primary', 
  icon: Icon, 
  className = '', 
  ...props 
}) {
  // Construimos la cadena de clases exacta que tenías en HTML
  const baseClass = 'button';
  const variantClass = VARIANTS[variant] || VARIANTS.primary;
  const effectClass = 'ripple-effect'; // Tu efecto de ola
  
  return (
    <button 
      className={`${baseClass} ${variantClass} ${effectClass} ${className}`} 
      {...props}
    >
      {/* Si pasas un icono (de feather), lo renderizamos con el estilo correcto */}
      {Icon && <Icon size={18} style={{ marginRight: children ? '8px' : 0 }} />}
      {children && <span>{children}</span>}
    </button>
  );
}