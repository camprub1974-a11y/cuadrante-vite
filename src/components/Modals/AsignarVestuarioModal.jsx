// Archivo: /src/components/Modals/AsignarVestuarioModal.jsx
// Modal para entregar vestuario a un agente
// Basado en Decreto 250/2007 y Orden 16/02/2009

import React, { useState } from 'react';
// 💡 CAMBIO: Usamos User (para el header) y añadimos Send
import { X, User, Info, AlertTriangle, CheckCircle, RefreshCw, Send } from 'react-feather';
import { useDotacionesStore, TIPOS_VESTUARIO } from '../../store/dotacionesStore';

const styles = `
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.85);
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    backdrop-filter: blur(10px);
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal-container {
    background: linear-gradient(145deg, rgba(30,30,40,0.98), rgba(20,20,30,0.98));
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 20px;
    width: 100%;
    max-width: 650px;
    max-height: 90vh;
    overflow: hidden;
    animation: slideUp 0.3s ease;
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .modal-header {
    padding: 1.5rem;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(255,255,255,0.02);
  }

  .modal-title {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-white);
  }

  .text-accent { color: var(--color-accent-neon); }

  .close-btn {
    background: transparent;
    border: none;
    color: rgba(255,255,255,0.5);
    cursor: pointer;
    padding: 8px;
    border-radius: 50%;
    transition: all 0.2s;
  }
  .close-btn:hover { background: rgba(255,255,255,0.1); color: white; }

  .modal-body {
    padding: 2rem;
    overflow-y: auto;
    max-height: calc(90vh - 140px);
  }

  .form-group { margin-bottom: 1.5rem; }
  
  .form-group label {
    display: block;
    color: rgba(255,255,255,0.7);
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
  }

  .vestuario-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 1rem;
    margin-top: 0.5rem;
  }

  .prenda-card {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 1rem;
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;
  }

  .prenda-card:hover {
    background: rgba(255,255,255,0.1);
    transform: translateY(-2px);
  }

  .prenda-card.selected {
    border-color: var(--color-accent-neon);
    background: rgba(0, 255, 136, 0.1);
    box-shadow: 0 0 15px rgba(0, 255, 136, 0.2);
  }

  .prenda-icon {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
    display: block;
  }

  .prenda-name {
    font-weight: 600;
    color: white;
    font-size: 0.9rem;
    display: block;
  }

  .prenda-info {
    font-size: 0.75rem;
    color: rgba(255,255,255,0.5);
    margin-top: 4px;
    display: block;
  }

  .tallas-selector {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-top: 0.5rem;
  }

  .talla-chip {
    padding: 6px 12px;
    border-radius: 8px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.7);
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.9rem;
  }

  .talla-chip.selected {
    background: var(--color-accent-neon);
    color: #000;
    border-color: var(--color-accent-neon);
    font-weight: 700;
  }

  .info-box {
    background: rgba(59, 130, 246, 0.1);
    border-left: 4px solid #3b82f6;
    padding: 1rem;
    border-radius: 8px;
    margin-top: 1rem;
    display: flex;
    gap: 12px;
  }

  .info-content h4 {
    margin: 0 0 4px 0;
    color: #93c5fd;
    font-size: 0.95rem;
  }

  .info-content p {
    margin: 0;
    color: rgba(255,255,255,0.8);
    font-size: 0.85rem;
  }

  .form-textarea {
    width: 100%;
    background: rgba(0,0,0,0.3);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    padding: 0.8rem;
    color: white;
    outline: none;
    min-height: 80px;
  }

  .modal-footer {
    padding: 1.5rem;
    border-top: 1px solid rgba(255,255,255,0.1);
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    background: rgba(0,0,0,0.2);
  }

  .btn {
    padding: 10px 20px;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .btn-secondary {
    background: rgba(255,255,255,0.1);
    color: white;
  }
  .btn-secondary:hover { background: rgba(255,255,255,0.15); }

  .btn-primary {
    background: var(--color-accent-neon);
    color: #064e3b;
    box-shadow: 0 4px 15px rgba(0, 255, 136, 0.3);
  }
  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }

  .spinning { animation: spin 1s linear infinite; }
  @keyframes spin { 100% { transform: rotate(360deg); } }
`;

export default function AsignarVestuarioModal({ isOpen, onClose, agente }) {
  const { asignarVestuario, loading } = useDotacionesStore();
  const [formData, setFormData] = useState({
    tipo: '', // ID de la prenda (ej: 'polo_mc')
    talla: '',
    observaciones: ''
  });

  if (!isOpen || !agente) return null;

  const handleSubmit = async () => {
    if (!formData.tipo || !formData.talla) return;

    const prenda = Object.values(TIPOS_VESTUARIO).find(p => p.id === formData.tipo);
    
    // Preparar datos para el envío (la lógica de estado pendiente está en la Cloud Function)
    const vestuarioData = {
      ...formData,
      agenteNombre: agente.name,
      añosRenovacion: prenda.renovacion // Enviar años para cálculo en el backend
    };

    const result = await asignarVestuario(agente.id, vestuarioData);
    
    if (result.success) {
      // 💡 CAMBIO DE ALERTA Y CIERRE
      alert("Solicitud de asignación de vestuario enviada. El agente debe confirmarla en su panel.");
      onClose();
    } else {
      alert("Error al enviar la solicitud de vestuario.");
    }
  };

  const prendaSeleccionada = formData.tipo 
    ? Object.values(TIPOS_VESTUARIO).find(p => p.id === formData.tipo) 
    : null;

  return (
    <div className="modal-overlay">
      <style>{styles}</style>
      <div className="modal-container">
        <div className="modal-header">
          <div className="modal-title">
            <User size={24} className="text-accent" /> {/* Icono User se mantiene para el header */}
            Asignación de Vestuario
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Agente</label>
            <div style={{fontSize: '1.1rem', fontWeight: 'bold', color: 'white'}}>
              {agente.name} (TIP: {agente.id})
            </div>
          </div>

          {/* Selección de Prenda */}
          <div className="form-group">
            <label>Seleccionar Prenda</label>
            <div className="vestuario-grid">
              {Object.values(TIPOS_VESTUARIO).map(prenda => (
                <div
                  key={prenda.id}
                  className={`prenda-card ${formData.tipo === prenda.id ? 'selected' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, tipo: prenda.id, talla: '' }))}
                >
                  <span className="prenda-icon">👕</span>
                  <span className="prenda-name">{prenda.nombre}</span>
                  <span className="prenda-info">Renovación: {prenda.renovacion} años</span>
                </div>
              ))}
            </div>
          </div>

          {/* Detalles de la Prenda */}
          {prendaSeleccionada && (
            <div className="animate-fade-in">
              <div className="form-group">
                <label>Talla</label>
                <div className="tallas-selector">
                  {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(talla => (
                    <div
                      key={talla}
                      className={`talla-chip ${formData.talla === talla ? 'selected' : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, talla }))}
                    >
                      {talla}
                    </div>
                  ))}
                  {/* Tallas numéricas para calzado/pantalón si fuera necesario se pueden añadir lógica aquí */}
                </div>
              </div>

              <div className="info-box">
                <Info size={20} className="text-accent" style={{marginTop: 2}} />
                <div className="info-content">
                  <h4>Información de Dotación</h4>
                  <p>
                    Esta prenda tiene una vida útil estimada de <strong>{prendaSeleccionada.renovacion} años</strong>.
                    El sistema notificará automáticamente cuando corresponda su renovación.
                  </p>
                  <div className="fecha-renovacion" style={{marginTop: 8, fontSize: '0.8rem', opacity: 0.7}}>
                    📅 Próxima renovación: {
                      new Date(
                        new Date().setFullYear(
                          new Date().getFullYear() + prendaSeleccionada.renovacion
                        )
                      ).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
                    }
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Observaciones */}
          <div className="form-group">
            <label>Observaciones</label>
            <textarea
              className="form-textarea"
              placeholder="Notas adicionales (color especial, adaptaciones, etc.)..."
              value={formData.observaciones}
              onChange={e => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSubmit}
            disabled={loading || !formData.tipo || !formData.talla}
          >
            {loading ? (
              <>
                <RefreshCw size={18} className="spinning" />
                Guardando...
              </>
            ) : (
              // 💡 CAMBIO DE ICONO Y TEXTO
              <>
                <Send size={18} /> 
                Enviar Solicitud
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}