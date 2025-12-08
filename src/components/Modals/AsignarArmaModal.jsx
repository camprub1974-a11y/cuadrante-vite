// Archivo: /src/components/Modals/AsignarArmaModal.jsx
// Modal para asignar armamento a un agente
// Basado en Orden 15/04/2009 Junta de Andalucia y RD 740/1983
// VERSION CORREGIDA - UTF-8 limpio

import React, { useState } from 'react';
import { X, Target, Info, AlertTriangle, RefreshCw, Send } from 'react-feather'; 
import { useDotacionesStore, TIPOS_ARMAS } from '../../store/dotacionesStore';

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
    max-width: 600px;
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
    background: rgba(239,68,68,0.05);
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
    color: #ef4444;
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
    background: rgba(239,68,68,0.2);
    color: #ef4444;
  }

  .modal-body {
    padding: 1.5rem;
    overflow-y: auto;
    max-height: calc(90vh - 180px);
  }

  .info-box {
    background: rgba(59,130,246,0.1);
    border: 1px solid rgba(59,130,246,0.2);
    border-radius: 12px;
    padding: 1rem;
    margin-bottom: 1.5rem;
    display: flex;
    gap: 12px;
  }

  .info-box svg {
    color: #3b82f6;
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
    border-color: #ef4444;
    box-shadow: 0 0 0 3px rgba(239,68,68,0.1);
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
    border-color: #ef4444;
    box-shadow: 0 0 0 3px rgba(239,68,68,0.1);
  }

  .tipo-arma-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .tipo-arma-option {
    padding: 1rem;
    background: rgba(255,255,255,0.03);
    border: 2px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;
  }

  .tipo-arma-option:hover {
    border-color: rgba(239,68,68,0.3);
    background: rgba(239,68,68,0.05);
  }

  .tipo-arma-option.selected {
    border-color: #ef4444;
    background: rgba(239,68,68,0.1);
  }

  .tipo-arma-option h4 {
    margin: 0 0 4px;
    color: white;
    font-size: 0.9rem;
  }

  .tipo-arma-option p {
    margin: 0;
    color: rgba(255,255,255,0.5);
    font-size: 0.75rem;
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
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 15px rgba(239,68,68,0.4);
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
    .tipo-arma-grid {
      grid-template-columns: 1fr;
    }
  }
`;

export default function AsignarArmaModal({ agente, onClose }) {
  const { asignarArma, loading } = useDotacionesStore();
  
  const [formData, setFormData] = useState({
    tipoArma: 'PISTOLA',
    marca: '',
    modelo: '',
    calibre: '9mm Parabellum',
    numeroSerie: '',
    guiaPertenencia: '',
    fechaGuia: '',
    cargadores: 2,
    municionAsignada: 30,
    observaciones: ''
  });
  
  const [error, setError] = useState(null);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async () => {
    // Validaciones locales
    if (!formData.tipoArma) {
      setError('Selecciona un tipo de arma');
      return;
    }
    if (!formData.numeroSerie.trim()) {
      setError('El numero de serie es obligatorio');
      return;
    }

    // Llamada al store
    const result = await asignarArma(agente.id, {
      ...formData,
      agenteNombre: agente.name
    });

    if (result.success) {
      alert("Solicitud de asignacion enviada. El agente debe confirmarla en su panel.");
      onClose();
    } else {
      setError(result.error || 'Error al enviar la solicitud');
    }
  };

  const tiposArmaArray = Object.entries(TIPOS_ARMAS).filter(([key]) => 
    ['PISTOLA', 'DEFENSA_CORTA', 'DEFENSA_EXTENSIBLE', 'GRILLETES'].includes(key)
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <style>{styles}</style>
      
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <Target size={22} />
            Asignar Armamento
          </h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Info normativa */}
          <div className="info-box">
            <Info size={18} />
            <p>
              <strong>Normativa aplicable:</strong> Orden 15/04/2009 (medios tecnicos), 
              RD 740/1983 (licencia armas). La pistola reglamentaria es calibre 9mm Parabellum, 
              1a categoria, con guia de pertenencia.
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

          {/* Tipo de arma */}
          <div className="form-section">
            <div className="form-section-title">Tipo de Arma</div>
            <div className="tipo-arma-grid">
              {tiposArmaArray.map(([key, tipo]) => (
                <div
                  key={key}
                  className={`tipo-arma-option ${formData.tipoArma === key ? 'selected' : ''}`}
                  onClick={() => handleChange('tipoArma', key)}
                >
                  <h4>{tipo.nombre}</h4>
                  <p>{tipo.requiereRevista ? 'Requiere revista anual' : 'Sin revista'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Datos del arma */}
          <div className="form-section">
            <div className="form-section-title">Datos del Arma</div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Marca</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej: HK, Beretta, Glock..."
                  value={formData.marca}
                  onChange={e => handleChange('marca', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Modelo</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej: USP Compact"
                  value={formData.modelo}
                  onChange={e => handleChange('modelo', e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>
                  Numero de Serie<span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Numero unico del arma"
                  value={formData.numeroSerie}
                  onChange={e => handleChange('numeroSerie', e.target.value.toUpperCase())}
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                />
              </div>
              <div className="form-group">
                <label>Calibre</label>
                <select
                  className="form-select"
                  value={formData.calibre}
                  onChange={e => handleChange('calibre', e.target.value)}
                >
                  <option value="9mm Parabellum">9mm Parabellum</option>
                  <option value="9mm corto">9mm Corto</option>
                  <option value=".40 S&W">.40 S&W</option>
                  <option value="N/A">No aplica</option>
                </select>
              </div>
            </div>
          </div>

          {/* Documentacion (solo para pistola) */}
          {formData.tipoArma === 'PISTOLA' && (
            <div className="form-section">
              <div className="form-section-title">Documentacion</div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Guia de Pertenencia</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="PL-XXXXX-XXX"
                    value={formData.guiaPertenencia}
                    onChange={e => handleChange('guiaPertenencia', e.target.value.toUpperCase())}
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  />
                </div>
                <div className="form-group">
                  <label>Fecha de Guia</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.fechaGuia}
                    onChange={e => handleChange('fechaGuia', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Cargadores</label>
                  <input
                    type="number"
                    className="form-input"
                    min="1"
                    max="5"
                    value={formData.cargadores}
                    onChange={e => handleChange('cargadores', parseInt(e.target.value) || 2)}
                  />
                </div>
                <div className="form-group">
                  <label>Municion Asignada</label>
                  <input
                    type="number"
                    className="form-input"
                    min="0"
                    step="10"
                    value={formData.municionAsignada}
                    onChange={e => handleChange('municionAsignada', parseInt(e.target.value) || 0)}
                  />
                </div>
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
              onChange={e => handleChange('observaciones', e.target.value)}
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
            disabled={loading}
          >
            {loading ? (
              <>
                <RefreshCw size={18} className="spinning" />
                Guardando...
              </>
            ) : (
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
