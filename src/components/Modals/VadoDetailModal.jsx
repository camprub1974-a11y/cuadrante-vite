// Archivo: /src/components/Modals/VadoDetailModal.jsx
// ✨ Modal de detalle de vado con historial de inspecciones

import React from 'react';
import { 
  X, User, MapPin, FileText, Calendar, Clock, CheckCircle, 
  AlertTriangle, Clipboard, Navigation, Phone, Mail, Home
} from 'react-feather';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const styles = `
  .vado-detail-overlay {
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

  .vado-detail-modal {
    background: linear-gradient(145deg, rgba(30,30,40,0.98), rgba(20,20,30,0.98));
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 20px;
    width: 100%;
    max-width: 700px;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
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
    align-items: flex-start;
  }

  .modal-title {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .modal-title-icon {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, rgba(0,255,136,0.2), rgba(0,255,136,0.05));
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-accent-neon);
  }

  .modal-title h2 {
    margin: 0;
    font-size: 1.25rem;
    color: white;
  }

  .modal-title p {
    margin: 4px 0 0;
    font-size: 0.85rem;
    color: rgba(255,255,255,0.5);
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
    flex: 1;
  }

  .detail-section {
    margin-bottom: 1.5rem;
  }

  .detail-section-title {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--color-accent-neon);
    margin-bottom: 0.75rem;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }

  .detail-item {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 10px;
    padding: 0.875rem;
  }

  .detail-item.full-width {
    grid-column: 1 / -1;
  }

  .detail-label {
    font-size: 0.75rem;
    color: rgba(255,255,255,0.5);
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .detail-value {
    color: white;
    font-size: 0.95rem;
    font-weight: 500;
  }

  .detail-value.mono {
    font-family: monospace;
    letter-spacing: 0.5px;
  }

  .estado-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .estado-badge.alta {
    background: rgba(0,255,136,0.15);
    color: #00ff88;
  }

  .estado-badge.baja {
    background: rgba(239,68,68,0.15);
    color: #ef4444;
  }

  /* Inspecciones */
  .inspecciones-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .inspeccion-item {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 10px;
    padding: 1rem;
  }

  .inspeccion-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .inspeccion-date {
    font-weight: 600;
    color: white;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .inspeccion-result {
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .inspeccion-result.ok {
    background: rgba(0,255,136,0.15);
    color: #00ff88;
  }

  .inspeccion-result.incidencia {
    background: rgba(239,68,68,0.15);
    color: #ef4444;
  }

  .inspeccion-notes {
    font-size: 0.85rem;
    color: rgba(255,255,255,0.7);
    margin-top: 0.5rem;
  }

  .inspeccion-agent {
    font-size: 0.8rem;
    color: rgba(255,255,255,0.5);
    margin-top: 0.5rem;
  }

  .empty-inspecciones {
    text-align: center;
    padding: 2rem;
    color: rgba(255,255,255,0.5);
  }

  .empty-inspecciones svg {
    margin-bottom: 0.5rem;
    opacity: 0.3;
  }

  .modal-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid rgba(255,255,255,0.1);
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }

  @media (max-width: 600px) {
    .detail-grid {
      grid-template-columns: 1fr;
    }
  }
`;

export default function VadoDetailModal({ vado, onClose, onInspect, isAdmin }) {
  if (!vado) return null;

  const formatDate = (date) => {
    if (!date) return '-';
    const d = date.toDate ? date.toDate() : new Date(date);
    return format(d, "dd/MM/yyyy HH:mm", { locale: es });
  };

  const formatDateShort = (date) => {
    if (!date) return '-';
    const d = date.toDate ? date.toDate() : new Date(date);
    return format(d, "dd/MM/yyyy", { locale: es });
  };

  return (
    <div className="vado-detail-overlay" onClick={onClose}>
      <style>{styles}</style>
      
      <div className="vado-detail-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <div className="modal-title-icon">
              <Home size={24} />
            </div>
            <div>
              <h2>{vado.titular?.nombre || 'Vado'}</h2>
              <p>{vado.ubicacion?.calle} {vado.ubicacion?.numero && `Nº ${vado.ubicacion.numero}`}</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Datos del Titular */}
          <div className="detail-section">
            <div className="detail-section-title">
              <User size={14} /> Titular
            </div>
            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-label">Nombre</div>
                <div className="detail-value">{vado.titular?.nombre || '-'}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">DNI/NIF</div>
                <div className="detail-value mono">{vado.titular?.documento || '-'}</div>
              </div>
              <div className="detail-item full-width">
                <div className="detail-label"><Mail size={12} /> Dirección de Notificación</div>
                <div className="detail-value">{vado.titular?.direccionNotificacion || '-'}</div>
              </div>
            </div>
          </div>

          {/* Ubicación del Vado */}
          <div className="detail-section">
            <div className="detail-section-title">
              <MapPin size={14} /> Ubicación
            </div>
            <div className="detail-grid">
              <div className="detail-item full-width">
                <div className="detail-label">Dirección Completa</div>
                <div className="detail-value">{vado.ubicacion?.direccionCompleta || '-'}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Calle</div>
                <div className="detail-value">{vado.ubicacion?.calle || '-'}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Número</div>
                <div className="detail-value">{vado.ubicacion?.numero || '-'}</div>
              </div>
              {vado.ubicacion?.coordenadas && (
                <div className="detail-item full-width">
                  <div className="detail-label"><Navigation size={12} /> Coordenadas GPS</div>
                  <div className="detail-value mono">
                    {vado.ubicacion.coordenadas.lat}, {vado.ubicacion.coordenadas.lng}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Datos del Expediente */}
          <div className="detail-section">
            <div className="detail-section-title">
              <FileText size={14} /> Expediente
            </div>
            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-label">Referencia</div>
                <div className="detail-value mono">{vado.expediente?.referencia || '-'}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Estado</div>
                <div className="detail-value">
                  <span className={`estado-badge ${vado.expediente?.situacion?.toLowerCase() || 'alta'}`}>
                    {vado.expediente?.situacion === 'Alta' ? <CheckCircle size={14} /> : <X size={14} />}
                    {vado.expediente?.situacion || 'Alta'}
                  </span>
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-label"><Calendar size={12} /> Fecha de Alta</div>
                <div className="detail-value">{formatDateShort(vado.expediente?.fechaAlta)}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">% Participación</div>
                <div className="detail-value">{vado.expediente?.porcentajeParticipacion || 100}%</div>
              </div>
            </div>
          </div>

          {/* Historial de Inspecciones */}
          <div className="detail-section">
            <div className="detail-section-title">
              <Clipboard size={14} /> Historial de Inspecciones
            </div>
            
            {vado.inspecciones && vado.inspecciones.length > 0 ? (
              <div className="inspecciones-list">
                {vado.inspecciones.map((insp, idx) => (
                  <div key={insp.id || idx} className="inspeccion-item">
                    <div className="inspeccion-header">
                      <span className="inspeccion-date">
                        <Calendar size={14} />
                        {formatDate(insp.fecha)}
                      </span>
                      <span className={`inspeccion-result ${insp.resultado === 'ok' ? 'ok' : 'incidencia'}`}>
                        {insp.resultado === 'ok' ? 'Conforme' : 'Incidencia'}
                      </span>
                    </div>
                    {insp.notas && (
                      <div className="inspeccion-notes">{insp.notas}</div>
                    )}
                    <div className="inspeccion-agent">
                      Realizada por: {insp.agenteNombre || insp.agenteId || 'Desconocido'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-inspecciones">
                <AlertTriangle size={32} />
                <p>Este vado no tiene inspecciones registradas</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="button button-secondary" onClick={onClose}>
            Cerrar
          </button>
          <button className="button button-primary" onClick={onInspect}>
            <Clipboard size={18} /> Nueva Inspección
          </button>
        </div>
      </div>
    </div>
  );
}
