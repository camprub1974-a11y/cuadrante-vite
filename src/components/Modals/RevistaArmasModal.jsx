// Archivo: /src/components/Modals/RevistaArmasModal.jsx
// Modal para registrar la revista anual de armas (RD 740/1983 - Abril)

import React, { useState } from 'react';
import { X, Calendar, Target, CheckCircle, AlertTriangle, RefreshCw, Check, AlertCircle } from 'react-feather';
import { useDotacionesStore, TIPOS_ARMAS } from '../../store/dotacionesStore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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
    background: rgba(251,191,36,0.05);
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
    color: #fbbf24;
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
    background: rgba(251,191,36,0.2);
    color: #fbbf24;
  }

  .modal-body {
    padding: 1.5rem;
    overflow-y: auto;
    max-height: calc(90vh - 180px);
  }

  .info-box {
    background: rgba(251,191,36,0.1);
    border: 1px solid rgba(251,191,36,0.2);
    border-radius: 12px;
    padding: 1rem;
    margin-bottom: 1.5rem;
    display: flex;
    gap: 12px;
  }

  .info-box svg {
    color: #fbbf24;
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

  /* Lista de armas */
  .armas-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .arma-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    transition: all 0.2s;
  }

  .arma-item:hover {
    background: rgba(255,255,255,0.05);
  }

  .arma-icon {
    width: 40px;
    height: 40px;
    background: rgba(239,68,68,0.15);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ef4444;
  }

  .arma-info {
    flex: 1;
  }

  .arma-info h4 {
    margin: 0 0 4px;
    color: white;
    font-size: 0.95rem;
  }

  .arma-info p {
    margin: 0;
    color: rgba(255,255,255,0.5);
    font-size: 0.8rem;
    font-family: 'JetBrains Mono', monospace;
  }

  .arma-estado {
    display: flex;
    gap: 8px;
  }

  .estado-btn {
    padding: 8px 16px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.03);
    color: rgba(255,255,255,0.6);
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .estado-btn:hover {
    background: rgba(255,255,255,0.08);
  }

  .estado-btn.ok {
    background: rgba(0,255,136,0.15);
    border-color: rgba(0,255,136,0.3);
    color: #00ff88;
  }

  .estado-btn.incidencia {
    background: rgba(239,68,68,0.15);
    border-color: rgba(239,68,68,0.3);
    color: #ef4444;
  }

  .resultado-section {
    padding: 1rem;
    background: rgba(255,255,255,0.03);
    border-radius: 12px;
    margin-bottom: 1rem;
  }

  .resultado-options {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
  }

  .resultado-option {
    flex: 1;
    padding: 1.25rem;
    border: 2px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
  }

  .resultado-option:hover {
    background: rgba(255,255,255,0.05);
  }

  .resultado-option.aprobada.selected {
    background: rgba(0,255,136,0.1);
    border-color: #00ff88;
  }

  .resultado-option.incidencias.selected {
    background: rgba(239,68,68,0.1);
    border-color: #ef4444;
  }

  .resultado-option svg {
    margin-bottom: 8px;
  }

  .resultado-option h4 {
    margin: 0;
    color: white;
    font-size: 0.95rem;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    color: rgba(255,255,255,0.7);
    font-size: 0.85rem;
    margin-bottom: 8px;
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
    border-color: #fbbf24;
    box-shadow: 0 0 0 3px rgba(251,191,36,0.1);
  }

  .empty-state {
    text-align: center;
    padding: 3rem;
    color: rgba(255,255,255,0.5);
  }

  .empty-state svg {
    opacity: 0.3;
    margin-bottom: 1rem;
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
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    color: #0a0a0a;
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 15px rgba(251,191,36,0.4);
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
`;

export default function RevistaArmasModal({ agente, armas, onClose }) {
  const { registrarRevistaArmas, loading } = useDotacionesStore();
  
  const [armasEstado, setArmasEstado] = useState(
    armas.reduce((acc, arma) => ({
      ...acc,
      [arma.id]: 'ok'
    }), {})
  );
  const [resultado, setResultado] = useState('aprobada');
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState(null);

  const handleEstadoArma = (armaId, estado) => {
    setArmasEstado(prev => ({ ...prev, [armaId]: estado }));
    
    // Si alguna tiene incidencia, cambiar resultado
    const nuevosEstados = { ...armasEstado, [armaId]: estado };
    const hayIncidencia = Object.values(nuevosEstados).some(e => e === 'incidencia');
    setResultado(hayIncidencia ? 'incidencias' : 'aprobada');
  };

  const handleSubmit = async () => {
    const armasRevisadas = armas.map(arma => ({
      armaId: arma.id,
      numeroSerie: arma.numeroSerie,
      estado: armasEstado[arma.id] || 'ok'
    }));

    const result = await registrarRevistaArmas(agente.id, {
      agenteNombre: agente.name,
      armasRevisadas,
      resultado,
      observaciones
    });

    if (result.success) {
      onClose();
    } else {
      setError(result.error || 'Error al registrar la revista');
    }
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const mesActual = format(new Date(), 'MMMM yyyy', { locale: es });
  const esAbril = new Date().getMonth() === 3;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <style>{styles}</style>
      
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <Calendar size={22} />
            Revista de Armas
          </h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Info normativa */}
          <div className="info-box">
            <AlertCircle size={18} />
            <p>
              <strong>RD 740/1983, Art. 5:</strong> Las armas pasarán revista anual 
              en el <strong>mes de abril</strong> ante los mandos de la Policía Local. 
              {!esAbril && (
                <span style={{ display: 'block', marginTop: '8px', color: '#fbbf24' }}>
                  ⚠️ Fecha actual: {mesActual} (fuera del período reglamentario)
                </span>
              )}
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

          {/* Lista de armas */}
          <div className="form-section">
            <div className="form-section-title">Armas a Revisar ({armas.length})</div>
            
            {armas.length === 0 ? (
              <div className="empty-state">
                <Target size={48} />
                <p>Este agente no tiene armas asignadas</p>
              </div>
            ) : (
              <div className="armas-list">
                {armas.map(arma => {
                  const tipoArma = TIPOS_ARMAS[arma.tipoArma?.toUpperCase()];
                  return (
                    <div key={arma.id} className="arma-item">
                      <div className="arma-icon">
                        <Target size={20} />
                      </div>
                      <div className="arma-info">
                        <h4>{tipoArma?.nombre || arma.tipoArma}</h4>
                        <p>Nº Serie: {arma.numeroSerie}</p>
                      </div>
                      <div className="arma-estado">
                        <button
                          className={`estado-btn ${armasEstado[arma.id] === 'ok' ? 'ok' : ''}`}
                          onClick={() => handleEstadoArma(arma.id, 'ok')}
                        >
                          <Check size={14} /> OK
                        </button>
                        <button
                          className={`estado-btn ${armasEstado[arma.id] === 'incidencia' ? 'incidencia' : ''}`}
                          onClick={() => handleEstadoArma(arma.id, 'incidencia')}
                        >
                          <AlertTriangle size={14} /> Incidencia
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Resultado */}
          {armas.length > 0 && (
            <div className="form-section">
              <div className="form-section-title">Resultado de la Revista</div>
              <div className="resultado-options">
                <div
                  className={`resultado-option aprobada ${resultado === 'aprobada' ? 'selected' : ''}`}
                  onClick={() => setResultado('aprobada')}
                >
                  <CheckCircle size={28} color={resultado === 'aprobada' ? '#00ff88' : 'rgba(255,255,255,0.3)'} />
                  <h4>Aprobada</h4>
                </div>
                <div
                  className={`resultado-option incidencias ${resultado === 'incidencias' ? 'selected' : ''}`}
                  onClick={() => setResultado('incidencias')}
                >
                  <AlertTriangle size={28} color={resultado === 'incidencias' ? '#ef4444' : 'rgba(255,255,255,0.3)'} />
                  <h4>Con Incidencias</h4>
                </div>
              </div>
            </div>
          )}

          {/* Observaciones */}
          <div className="form-group">
            <label>Observaciones</label>
            <textarea
              className="form-textarea"
              placeholder="Notas sobre el estado de las armas, incidencias detectadas..."
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
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
            disabled={loading || armas.length === 0}
          >
            {loading ? (
              <>
                <RefreshCw size={18} className="spinning" />
                Registrando...
              </>
            ) : (
              <>
                <CheckCircle size={18} />
                Registrar Revista
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
