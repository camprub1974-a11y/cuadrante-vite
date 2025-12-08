// Archivo: /src/components/Modals/ManagementModal.jsx

import React from 'react';
// 💡 1. IMPORTAR EL NUEVO ICONO UploadCloud (y limpiar otros no usados si aplica)
import { X, Users, Calendar, Settings, Shield, UploadCloud } from 'react-feather';

export default function ManagementModal({ isOpen, onClose, onAction }) {
  if (!isOpen) return null;

  // Definimos las opciones de gestión disponibles
  const options = [
    { 
      id: 'manage_agents', 
      label: 'Gestionar Agentes', 
      desc: 'Alta, baja y edición de personal',
      icon: Users, 
      color: 'var(--color-accent-neon)',
      bg: 'rgba(16, 185, 129, 0.1)'
    },
    { 
      id: 'manage_dates', 
      label: 'Fechas Señaladas', 
      desc: 'Festivos y eventos del calendario',
      icon: Calendar, 
      color: '#fbbf24',
      bg: 'rgba(251, 191, 36, 0.1)'
    },
    // ========================================================
    // === 💡 2. NUEVA OPCIÓN: IMPORTAR CUADRANTE ===
    // ========================================================
    { 
      id: 'import_json', 
      label: 'Importar Cuadrante', 
      desc: 'Subir respaldo JSON de mes completo',
      icon: UploadCloud, // Usamos el nuevo icono importado
      color: '#3b82f6', // Azul
      bg: 'rgba(59, 130, 246, 0.1)'
    },
    // ========================================================
    { 
      id: 'config', 
      label: 'Configuración Global', 
      desc: 'Ajustes del sistema y permisos',
      icon: Settings, 
      color: '#9ca3af',
      bg: 'rgba(156, 163, 175, 0.1)'
    }
  ];

  return (
    <div className="modal-overlay active" style={{zIndex: 1050}}>
      <div className="modal-content" style={{maxWidth: '500px'}}>
        
        {/* Cabecera */}
        <div className="modal-header">
          <h3 style={{margin: 0, display: 'flex', alignItems: 'center', gap: '10px'}}>
             <Shield size={20} />
             Panel de Gestión
          </h3>
          <button className="icon-button close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Cuerpo: Grid de Opciones */}
        <div className="modal-body" style={{padding: '1.5rem'}}>
            <div style={{display: 'grid', gap: '1rem'}}>
                {options.map(opt => (
                    <button 
                        key={opt.id}
                        className="card-hover"
                        onClick={() => {
                            onAction(opt.id);
                            onClose();
                        }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '1rem',
                            padding: '1rem',
                            background: 'var(--glass-dark-bg)',
                            border: '1px solid var(--glass-dark-border)',
                            borderRadius: 'var(--radius-lg)',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.2s'
                        }}
                    >
                        {/* Icono */}
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '12px',
                            background: opt.bg, color: opt.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <opt.icon size={24} />
                        </div>

                        {/* Texto */}
                        <div>
                            <h4 style={{margin: '0 0 4px 0', color: 'white', fontSize: '1rem'}}>{opt.label}</h4>
                            <p style={{margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.85rem'}}>
                                {opt.desc}
                            </p>
                        </div>
                    </button>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
}