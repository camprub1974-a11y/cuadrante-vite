// Archivo: /src/components/Modals/PracticaTiroModal.jsx
// Modal para registrar prácticas de tiro (recomendado semestral)

import React, { useState } from 'react';
import { X, Crosshair, Target, CheckCircle, AlertTriangle, RefreshCw, Award, MapPin, Info } from 'react-feather';
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
    max-width: 550px;
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
    background: rgba(0,255,136,0.05);
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
    color: #00ff88;
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
    background: rgba(0,255,136,0.2);
    color: #00ff88;
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
    border-color: #00ff88;
    box-shadow: 0 0 0 3px rgba(0,255,136,0.1);
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
    border-color: #00ff88;
    box-shadow: 0 0 0 3px rgba(0,255,136,0.1);
  }

  /* Agente card */
  .agente-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 1rem;
    background: rgba(255,255,255,0.03);
    border-radius: 10px;
  }

  .agente-avatar {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: 1.1rem;
  }

  .agente-info h3 {
    margin: 0 0 4px;
    color: white;
    font-size: 1rem;
  }

  .agente-info p {
    margin: 0;
    color: rgba(255,255,255,0.5);
    font-size: 0.85rem;
  }

  /* Puntuación visual */
  .puntuacion-wrapper {
    text-align: center;
    padding: 1.5rem;
    background: rgba(0,0,0,0.2);
    border-radius: 16px;
    margin-bottom: 1rem;
  }

  .puntuacion-circle {
    width: 120px;
    height: 120px;
    margin: 0 auto 1rem;
    position: relative;
  }

  .puntuacion-circle svg {
    transform: rotate(-90deg);
    width: 120px;
    height: 120px;
  }

  .puntuacion-circle .bg {
    fill: none;
    stroke: rgba(255,255,255,0.1);
    stroke-width: 8;
  }

  .puntuacion-circle .progress {
    fill: none;
    stroke-width: 8;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.5s ease;
  }

  .puntuacion-circle .value {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    font-weight: 700;
    color: white;
    font-family: 'JetBrains Mono', monospace;
  }

  .puntuacion-label {
    color: rgba(255,255,255,0.6);
    font-size: 0.85rem;
  }

  /* Resultado selector */
  .resultado-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }

  .resultado-option {
    padding: 1rem;
    border: 2px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
  }

  .resultado-option:hover {
    background: rgba(255,255,255,0.05);
  }

  .resultado-option.apto.selected {
    background: rgba(0,255,136,0.1);
    border-color: #00ff88;
  }

  .resultado-option.no_apto.selected {
    background: rgba(239,68,68,0.1);
    border-color: #ef4444;
  }

  .resultado-option.repetir.selected {
    background: rgba(251,191,36,0.1);
    border-color: #fbbf24;
  }

  .resultado-option svg {
    margin-bottom: 6px;
  }

  .resultado-option span {
    display: block;
    color: white;
    font-size: 0.85rem;
    font-weight: 500;
  }

  /* Arma selector */
  .arma-option {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 1rem;
    background: rgba(255,255,255,0.03);
    border: 2px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 8px;
  }

  .arma-option:hover {
    border-color: rgba(0,255,136,0.3);
  }

  .arma-option.selected {
    border-color: #00ff88;
    background: rgba(0,255,136,0.05);
  }

  .arma-option .icon {
    width: 36px;
    height: 36px;
    background: rgba(239,68,68,0.15);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ef4444;
  }

  .arma-option .info h4 {
    margin: 0 0 2px;
    color: white;
    font-size: 0.9rem;
  }

  .arma-option .info p {
    margin: 0;
    color: rgba(255,255,255,0.5);
    font-size: 0.75rem;
    font-family: 'JetBrains Mono', monospace;
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
    background: linear-gradient(135deg, #00ff88, #00cc6a);
    color: #0a0a0a;
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 15px rgba(0,255,136,0.4);
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

  @media (max-width: 500px) {
    .form-row {
      grid-template-columns: 1fr;
    }
    
    .resultado-grid {
      grid-template-columns: 1fr;
    }
  }
`;

export default function PracticaTiroModal({ agente, armas, onClose }) {
  const { registrarPracticaTiro, loading } = useDotacionesStore();
  
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    lugar: '',
    disparosRealizados: 50,
    puntuacion: 75,
    resultado: 'apto',
    armaUtilizada: armas.find(a => a.tipoArma?.toUpperCase() === 'PISTOLA')?.id || armas[0]?.id || '',
    municionUtilizada: 50,
    observaciones: ''
  });
  
  const [error, setError] = useState(null);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async () => {
    if (!formData.disparosRealizados || formData.disparosRealizados < 1) {
      setError('Indica el número de disparos realizados');
      return;
    }

    const armaSeleccionada = armas.find(a => a.id === formData.armaUtilizada);

    const result = await registrarPracticaTiro(agente.id, {
      ...formData,
      agenteNombre: agente.name,
      armaUtilizada: armaSeleccionada ? {
        id: armaSeleccionada.id,
        numeroSerie: armaSeleccionada.numeroSerie
      } : null
    });

    if (result.success) {
      onClose();
    } else {
      setError(result.error || 'Error al registrar la práctica');
    }
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  // Calcular color según puntuación
  const getPuntuacionColor = (puntuacion) => {
    if (puntuacion >= 80) return '#00ff88';
    if (puntuacion >= 60) return '#fbbf24';
    return '#ef4444';
  };

  const circumference = 2 * Math.PI * 52;
  const strokeDashoffset = circumference - (formData.puntuacion / 100) * circumference;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <style>{styles}</style>
      
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <Crosshair size={22} />
            Práctica de Tiro
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
              Se recomienda realizar prácticas de tiro con periodicidad <strong>semestral</strong>. 
              Mínimo recomendado: 25 disparos por sesión para mantener la destreza.
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
            <div className="agente-card">
              <div className="agente-avatar">{getInitials(agente?.name)}</div>
              <div className="agente-info">
                <h3>{agente?.name}</h3>
                <p>Agente #{agente?.agentId}</p>
              </div>
            </div>
          </div>

          {/* Datos de la práctica */}
          <div className="form-section">
            <div className="form-section-title">Datos de la Práctica</div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Fecha<span className="required">*</span></label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.fecha}
                  onChange={e => handleChange('fecha', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>
                  <MapPin size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                  Lugar
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Galería de tiro..."
                  value={formData.lugar}
                  onChange={e => handleChange('lugar', e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Disparos Realizados<span className="required">*</span></label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  max="500"
                  value={formData.disparosRealizados}
                  onChange={e => handleChange('disparosRealizados', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="form-group">
                <label>Munición Utilizada</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  value={formData.municionUtilizada}
                  onChange={e => handleChange('municionUtilizada', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          {/* Arma utilizada */}
          {armas.length > 0 && (
            <div className="form-section">
              <div className="form-section-title">Arma Utilizada</div>
              {armas.filter(a => a.tipoArma?.toUpperCase() === 'PISTOLA').map(arma => (
                <div
                  key={arma.id}
                  className={`arma-option ${formData.armaUtilizada === arma.id ? 'selected' : ''}`}
                  onClick={() => handleChange('armaUtilizada', arma.id)}
                >
                  <div className="icon">
                    <Target size={18} />
                  </div>
                  <div className="info">
                    <h4>{arma.marca} {arma.modelo}</h4>
                    <p>Nº Serie: {arma.numeroSerie}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Puntuación */}
          <div className="form-section">
            <div className="form-section-title">Puntuación</div>
            
            <div className="puntuacion-wrapper">
              <div className="puntuacion-circle">
                <svg viewBox="0 0 120 120">
                  <circle className="bg" cx="60" cy="60" r="52" />
                  <circle
                    className="progress"
                    cx="60"
                    cy="60"
                    r="52"
                    stroke={getPuntuacionColor(formData.puntuacion)}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                  />
                </svg>
                <div className="value">{formData.puntuacion}%</div>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={formData.puntuacion}
                onChange={e => handleChange('puntuacion', parseInt(e.target.value))}
                style={{ width: '100%', marginBottom: '8px' }}
              />
              <div className="puntuacion-label">Porcentaje de aciertos</div>
            </div>
          </div>

          {/* Resultado */}
          <div className="form-section">
            <div className="form-section-title">Resultado</div>
            <div className="resultado-grid">
              <div
                className={`resultado-option apto ${formData.resultado === 'apto' ? 'selected' : ''}`}
                onClick={() => handleChange('resultado', 'apto')}
              >
                <Award size={24} color={formData.resultado === 'apto' ? '#00ff88' : 'rgba(255,255,255,0.3)'} />
                <span>Apto</span>
              </div>
              <div
                className={`resultado-option repetir ${formData.resultado === 'repetir' ? 'selected' : ''}`}
                onClick={() => handleChange('resultado', 'repetir')}
              >
                <RefreshCw size={24} color={formData.resultado === 'repetir' ? '#fbbf24' : 'rgba(255,255,255,0.3)'} />
                <span>Repetir</span>
              </div>
              <div
                className={`resultado-option no_apto ${formData.resultado === 'no_apto' ? 'selected' : ''}`}
                onClick={() => handleChange('resultado', 'no_apto')}
              >
                <X size={24} color={formData.resultado === 'no_apto' ? '#ef4444' : 'rgba(255,255,255,0.3)'} />
                <span>No Apto</span>
              </div>
            </div>
          </div>

          {/* Observaciones */}
          <div className="form-group">
            <label>Observaciones</label>
            <textarea
              className="form-textarea"
              placeholder="Notas sobre el rendimiento, aspectos a mejorar..."
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
                Registrando...
              </>
            ) : (
              <>
                <CheckCircle size={18} />
                Registrar Práctica
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
