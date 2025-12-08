// Archivo: /src/components/Modals/AsignarEquipamientoModal.jsx
import React, { useState } from 'react';
// 1. CAMBIO AQUÍ: Quitamos Flashlight y añadimos Zap
// 💡 IMPORTACIÓN: Añadimos Send
import { X, Package, Shield, Radio, Zap, Info, AlertTriangle, CheckCircle, RefreshCw, Send } from 'react-feather'; 
import { useDotacionesStore, TIPOS_EQUIPAMIENTO } from '../../store/dotacionesStore';

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
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .modal-header {
    padding: 1.5rem;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(139,92,246,0.05);
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.25rem;
    color: white;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .modal-header h2 svg {
    color: #8b5cf6;
  }

  .close-btn {
    background: rgba(255,255,255,0.05);
    border: none;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    color: rgba(255,255,255,0.6);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .close-btn:hover {
    background: rgba(139,92,246,0.2);
    color: #8b5cf6;
  }

  .modal-body {
    padding: 1.5rem;
    overflow-y: auto;
    max-height: calc(90vh - 180px);
  }

  .info-box {
    background: rgba(139,92,246,0.1);
    border: 1px solid rgba(139,92,246,0.2);
    border-radius: 12px;
    padding: 1rem;
    margin-bottom: 1.5rem;
    display: flex;
    gap: 12px;
  }

  .info-box svg {
    color: #8b5cf6;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .info-box p {
    margin: 0;
    color: rgba(255,255,255,0.7);
    font-size: 0.85rem;
    line-height: 1.5;
  }

  .form-section {
    margin-bottom: 1.5rem;
  }

  .form-section-title {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: rgba(255,255,255,0.4);
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgba(255,255,255,0.1);
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    color: rgba(255,255,255,0.7);
    font-size: 0.85rem;
    margin-bottom: 8px;
    font-weight: 500;
  }

  .form-group label .required {
    color: #ef4444;
    margin-left: 4px;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .form-input,
  .form-select {
    width: 100%;
    padding: 12px 14px;
    background: rgba(0,0,0,0.3);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    color: white;
    font-size: 0.9rem;
    transition: all 0.2s;
  }

  .form-input:focus,
  .form-select:focus {
    outline: none;
    border-color: #8b5cf6;
    box-shadow: 0 0 0 3px rgba(139,92,246,0.1);
  }

  .form-select option {
    background: #1a1f2e;
    color: white;
  }

  .form-textarea {
    width: 100%;
    padding: 12px 14px;
    background: rgba(0,0,0,0.3);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    color: white;
    font-size: 0.9rem;
    min-height: 80px;
    resize: vertical;
  }

  .form-textarea:focus {
    outline: none;
    border-color: #8b5cf6;
    box-shadow: 0 0 0 3px rgba(139,92,246,0.1);
  }

  /* Tipos de equipamiento */
  .equipo-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .equipo-option {
    padding: 1.25rem;
    background: rgba(255,255,255,0.03);
    border: 2px solid rgba(255,255,255,0.1);
    border-radius: 14px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .equipo-option:hover {
    border-color: rgba(139,92,246,0.3);
    background: rgba(139,92,246,0.05);
  }

  .equipo-option.selected {
    border-color: #8b5cf6;
    background: rgba(139,92,246,0.1);
  }

  .equipo-option .icon-wrapper {
    width: 40px;
    height: 40px;
    background: rgba(139,92,246,0.15);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #8b5cf6;
  }

  .equipo-option h4 {
    margin: 0;
    color: white;
    font-size: 0.95rem;
  }

  .equipo-option p {
    margin: 0;
    color: rgba(255,255,255,0.5);
    font-size: 0.75rem;
    line-height: 1.4;
  }

  .equipo-option .vida-util {
    display: inline-block;
    padding: 3px 8px;
    background: rgba(0,255,136,0.1);
    color: #00ff88;
    border-radius: 4px;
    font-size: 0.7rem;
    margin-top: 4px;
  }

  /* Niveles de protección */
  .niveles-grid {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .nivel-btn {
    padding: 10px 20px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    color: rgba(255,255,255,0.7);
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .nivel-btn:hover {
    background: rgba(139,92,246,0.1);
    border-color: rgba(139,92,246,0.3);
  }

  .nivel-btn.selected {
    background: #8b5cf6;
    border-color: #8b5cf6;
    color: white;
  }

  .checkbox-group {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px;
    background: rgba(255,255,255,0.03);
    border-radius: 10px;
    cursor: pointer;
  }

  .checkbox-group input {
    width: 18px;
    height: 18px;
    accent-color: #8b5cf6;
  }

  .checkbox-group span {
    color: rgba(255,255,255,0.8);
    font-size: 0.9rem;
  }

  .caducidad-preview {
    padding: 1rem;
    background: rgba(251,191,36,0.1);
    border: 1px solid rgba(251,191,36,0.2);
    border-radius: 10px;
    text-align: center;
  }

  .caducidad-preview .label {
    font-size: 0.75rem;
    color: rgba(255,255,255,0.5);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .caducidad-preview .date {
    font-size: 1.25rem;
    color: #fbbf24;
    font-weight: 600;
    margin-top: 4px;
  }

  .modal-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid rgba(255,255,255,0.1);
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    background: rgba(0,0,0,0.2);
  }

  .btn {
    padding: 12px 24px;
    border-radius: 10px;
    font-size: 0.9rem;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }

  .btn-secondary {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.8);
  }

  .btn-secondary:hover {
    background: rgba(255,255,255,0.1);
  }

  .btn-primary {
    background: linear-gradient(135deg, #8b5cf6, #7c3aed);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 15px rgba(139,92,246,0.4);
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .error-msg {
    background: rgba(239,68,68,0.1);
    border: 1px solid rgba(239,68,68,0.3);
    border-radius: 8px;
    padding: 0.75rem;
    color: #ef4444;
    font-size: 0.85rem;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .spinning {
    animation: spin 1s linear infinite;
  }

  @media (max-width: 600px) {
    .form-row {
      grid-template-columns: 1fr;
    }
    
    .equipo-grid {
      grid-template-columns: 1fr;
    }
  }
`;

const NIVELES_PROTECCION = ['NIJ II', 'NIJ IIIA', 'NIJ III', 'NIJ IV'];
const TALLAS_CHALECO = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const getEquipoIcon = (tipo) => {
  switch (tipo) {
    case 'CHALECO_BALISTICO':
    case 'CASCO_ANTIDISTURBIOS':
      return Shield;
    case 'EMISORA_PORTATIL':
      return Radio;
    case 'LINTERNA':
      // 2. CAMBIO AQUÍ: Usamos Zap en lugar de Flashlight
      return Zap; 
    default:
      return Package;
  }
};

export default function AsignarEquipamientoModal({ agente, onClose }) {
  const { asignarEquipamiento, loading } = useDotacionesStore();
  
  const [formData, setFormData] = useState({
    tipo: '',
    marca: '',
    modelo: '',
    numeroSerie: '',
    nivel: 'NIJ IIIA',
    talla: '',
    proteccionArmaBlanca: true,
    observaciones: ''
  });
  
  const [error, setError] = useState(null);

  const handleSelectTipo = (tipo) => {
    setFormData(prev => ({ ...prev, tipo }));
    setError(null);
  };

  const handleSubmit = async () => {
    if (!formData.tipo) {
      setError('Selecciona un tipo de equipamiento');
      return;
    }

    const tipoEquipo = TIPOS_EQUIPAMIENTO[formData.tipo];
    
    const result = await asignarEquipamiento(agente.id, {
      ...formData,
      agenteNombre: agente.name,
      añosVidaUtil: tipoEquipo?.vidaUtil || null
    });

    if (result.success) {
      // 💡 CAMBIO DE ALERTA Y CIERRE
      alert("Solicitud de asignación de equipamiento enviada. El agente debe confirmarla en su panel.");
      onClose();
    } else {
      setError(result.error || 'Error al enviar la solicitud de asignación');
    }
  };

  const tipoSeleccionado = TIPOS_EQUIPAMIENTO[formData.tipo];
  const esChaleco = formData.tipo === 'CHALECO_BALISTICO';

  // Calcular fecha de caducidad
  const getFechaCaducidad = () => {
    if (!tipoSeleccionado?.vidaUtil) return null;
    const fecha = new Date();
    fecha.setFullYear(fecha.getFullYear() + tipoSeleccionado.vidaUtil);
    return fecha.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <style>{styles}</style>
      
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <Package size={22} />
            Asignar Equipamiento
          </h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Info */}
          <div className="info-box">
            <Info size={18} />
            <p>
              <strong>Equipamiento policial:</strong> Los chalecos balísticos deben cumplir 
              certificación NIJ IIIA mínimo. Vida útil típica: 10 años. Se recomienda revisión 
              anual del estado de conservación.
            </p>
          </div>

          {error && (
            <div className="error-msg">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          {/* Agente */}
          <div className="form-section">
            <div className="form-section-title">Agente</div>
            <div className="form-input" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <strong style={{ color: 'white' }}>{agente?.name}</strong>
              <span style={{ color: 'rgba(255,255,255,0.5)', marginLeft: '10px' }}>
                #{agente?.agentId}
              </span>
            </div>
          </div>

          {/* Tipo de equipamiento */}
          <div className="form-section">
            <div className="form-section-title">Tipo de Equipamiento</div>
            <div className="equipo-grid">
              {Object.entries(TIPOS_EQUIPAMIENTO).slice(0, 6).map(([key, equipo]) => {
                const Icon = getEquipoIcon(key);
                return (
                  <div
                    key={key}
                    className={`equipo-option ${formData.tipo === key ? 'selected' : ''}`}
                    onClick={() => handleSelectTipo(key)}
                  >
                    <div className="icon-wrapper">
                      <Icon size={20} />
                    </div>
                    <h4>{equipo.nombre}</h4>
                    <p>{equipo.descripcion}</p>
                    {equipo.vidaUtil && (
                      <span className="vida-util">Vida útil: {equipo.vidaUtil} años</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Datos específicos del equipo */}
          {formData.tipo && (
            <>
              <div className="form-section">
                <div className="form-section-title">Datos del Equipo</div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Marca</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej: NIDEC, Rabintex..."
                      value={formData.marca}
                      onChange={e => setFormData(prev => ({ ...prev, marca: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Modelo</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej: DutyGuard"
                      value={formData.modelo}
                      onChange={e => setFormData(prev => ({ ...prev, modelo: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Número de Serie</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Identificador único del equipo"
                    value={formData.numeroSerie}
                    onChange={e => setFormData(prev => ({ ...prev, numeroSerie: e.target.value.toUpperCase() }))}
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  />
                </div>
              </div>

              {/* Opciones específicas para chalecos */}
              {esChaleco && (
                <div className="form-section">
                  <div className="form-section-title">Especificaciones del Chaleco</div>
                  
                  <div className="form-group">
                    <label>Nivel de Protección<span className="required">*</span></label>
                    <div className="niveles-grid">
                      {NIVELES_PROTECCION.map(nivel => (
                        <button
                          key={nivel}
                          className={`nivel-btn ${formData.nivel === nivel ? 'selected' : ''}`}
                          onClick={() => setFormData(prev => ({ ...prev, nivel }))}
                        >
                          {nivel}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Talla</label>
                      <select
                        className="form-select"
                        value={formData.talla}
                        onChange={e => setFormData(prev => ({ ...prev, talla: e.target.value }))}
                      >
                        <option value="">Seleccionar talla</option>
                        {TALLAS_CHALECO.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>&nbsp;</label>
                      <label className="checkbox-group">
                        <input
                          type="checkbox"
                          checked={formData.proteccionArmaBlanca}
                          onChange={e => setFormData(prev => ({ 
                            ...prev, 
                            proteccionArmaBlanca: e.target.checked 
                          }))}
                        />
                        <span>Protección anti-arma blanca</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Fecha de caducidad */}
              {tipoSeleccionado?.vidaUtil && (
                <div className="form-group">
                  <label>Fecha de Caducidad Estimada</label>
                  <div className="caducidad-preview">
                    <div className="label">Caduca en</div>
                    <div className="date">{getFechaCaducidad()}</div>
                  </div>
                </div>
              )}

              {/* Observaciones */}
              <div className="form-group">
                <label>Observaciones</label>
                <textarea
                  className="form-textarea"
                  placeholder="Notas adicionales..."
                  value={formData.observaciones}
                  onChange={e => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
                />
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSubmit}
            disabled={loading || !formData.tipo}
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