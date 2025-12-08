// Archivo: /src/components/Modals/DotacionDetalleModal.jsx
// Modal de Detalle de Dotación - Vista completa para Admin
// Muestra todos los datos técnicos de la asignación

import React, { useState } from 'react';
import {
  X, Target, Tag, Package, Calendar, User, Hash,
  AlertTriangle, Trash2, CheckCircle, FileText, 
  Shield, Clock, Award, AlertCircle, RotateCw,
  Crosshair, Radio, Eye, Edit2
} from 'react-feather';
import { useAuthStore } from '../../store/authStore';
import { useDotacionesStore, TIPOS_ARMAS, TIPOS_VESTUARIO, TIPOS_EQUIPAMIENTO } from '../../store/dotacionesStore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// =========================================
// ESTILOS
// =========================================
const styles = `
.dotacion-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 2100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  backdrop-filter: blur(8px);
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.dotacion-modal-container {
  background: linear-gradient(145deg, #1e293b, #0f172a);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  width: 100%;
  max-width: 700px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(40px); }
  to { opacity: 1; transform: translateY(0); }
}

.dotacion-modal-header {
  padding: 1.25rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.2);
}

.dotacion-modal-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: white;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
}

.dotacion-modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

/* Cabecera del item */
.dotacion-item-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.dotacion-item-icon {
  width: 60px;
  height: 60px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.dotacion-item-info h2 {
  margin: 0 0 4px 0;
  color: white;
  font-size: 1.4rem;
  font-weight: 700;
}

.dotacion-item-info p {
  margin: 0;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9rem;
  font-family: 'JetBrains Mono', monospace;
}

/* Estado Badge */
.estado-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 8px;
}

.estado-activa {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.estado-pendiente {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.estado-baja {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

/* Secciones */
.dotacion-section {
  margin-bottom: 1.5rem;
}

.dotacion-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--color-accent-neon, #00ff88);
  font-weight: 700;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.dotacion-section-title::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, rgba(0, 255, 136, 0.3), transparent);
}

/* Grid de datos técnicos */
.tech-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.tech-item {
  background: rgba(255, 255, 255, 0.03);
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.2s ease;
}

.tech-item:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

.tech-item.full-width {
  grid-column: 1 / -1;
}

.tech-item.highlight {
  background: rgba(0, 255, 136, 0.05);
  border-color: rgba(0, 255, 136, 0.2);
}

.tech-item.warning {
  background: rgba(245, 158, 11, 0.08);
  border-color: rgba(245, 158, 11, 0.2);
}

.tech-item.danger {
  background: rgba(239, 68, 68, 0.08);
  border-color: rgba(239, 68, 68, 0.2);
}

.tech-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.tech-value {
  font-size: 0.95rem;
  color: white;
  font-weight: 500;
  word-break: break-word;
}

.tech-value.mono {
  font-family: 'JetBrains Mono', monospace;
}

.tech-value.success {
  color: #34d399;
}

.tech-value.warning {
  color: #fbbf24;
}

.tech-value.danger {
  color: #f87171;
}

/* Observaciones */
.observaciones-box {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 1rem;
  margin-top: 1rem;
}

.observaciones-box p {
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  line-height: 1.6;
  font-style: italic;
}

/* Footer */
.dotacion-modal-footer {
  padding: 1.25rem 1.5rem;
  background: rgba(0, 0, 0, 0.3);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.footer-left {
  display: flex;
  gap: 10px;
}

.footer-right {
  display: flex;
  gap: 10px;
}

/* Botones */
.btn {
  padding: 10px 18px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.btn-ghost {
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-ghost:hover {
  background: rgba(255, 255, 255, 0.05);
  color: white;
  border-color: rgba(255, 255, 255, 0.2);
}

.btn-danger {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.btn-danger:hover {
  background: rgba(239, 68, 68, 0.25);
}

.btn-primary {
  background: linear-gradient(135deg, var(--color-accent-neon, #00ff88), #00cc6a);
  color: #00331a;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 15px rgba(0, 255, 136, 0.3);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Confirmación de baja */
.confirm-delete {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
}

.confirm-delete span {
  color: white;
  font-size: 0.9rem;
}

/* Responsive */
@media (max-width: 600px) {
  .tech-grid {
    grid-template-columns: 1fr;
  }
  
  .dotacion-item-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  
  .dotacion-modal-footer {
    flex-direction: column;
  }
  
  .footer-left, .footer-right {
    width: 100%;
    justify-content: center;
  }
}

/* Animación spin */
.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}
`;

// =========================================
// HELPER: Formatear fecha de forma segura
// =========================================
const formatDateSafe = (val) => {
  if (!val) return '---';
  try {
    const d = val.toDate ? val.toDate() : new Date(val);
    if (isNaN(d.getTime())) return '---';
    return format(d, "dd 'de' MMMM, yyyy", { locale: es });
  } catch {
    return '---';
  }
};

const formatDateShort = (val) => {
  if (!val) return '---';
  try {
    const d = val.toDate ? val.toDate() : new Date(val);
    if (isNaN(d.getTime())) return '---';
    return format(d, 'dd/MM/yyyy', { locale: es });
  } catch {
    return '---';
  }
};

// =========================================
// COMPONENTE PRINCIPAL
// =========================================
export default function DotacionDetalleModal({ dotacion, tipo, onClose }) {
  const { user } = useAuthStore();
  const { eliminarAsignacion, loading, necesitaRevista, necesitaPracticaTiro } = useDotacionesStore();
  const [showConfirm, setShowConfirm] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'supervisor';

  if (!dotacion) return null;

  // Configuración visual según tipo
  const getConfig = () => {
    switch (tipo) {
      case 'armas':
        return { 
          icon: Target, 
          color: '#ef4444', 
          bgColor: 'rgba(239, 68, 68, 0.15)',
          label: 'Armamento',
          tipoNombre: TIPOS_ARMAS[dotacion.tipoArma]?.nombre || dotacion.tipoArma
        };
      case 'vestuario':
        return { 
          icon: Tag, 
          color: '#3b82f6', 
          bgColor: 'rgba(59, 130, 246, 0.15)',
          label: 'Vestuario',
          tipoNombre: TIPOS_VESTUARIO[dotacion.tipo]?.nombre || dotacion.tipo
        };
      case 'equipamiento':
        return { 
          icon: Package, 
          color: '#8b5cf6', 
          bgColor: 'rgba(139, 92, 246, 0.15)',
          label: 'Equipamiento',
          tipoNombre: TIPOS_EQUIPAMIENTO[dotacion.tipo]?.nombre || dotacion.tipo
        };
      default:
        return { 
          icon: Package, 
          color: '#64748b', 
          bgColor: 'rgba(100, 116, 139, 0.15)',
          label: 'Dotación',
          tipoNombre: 'Desconocido'
        };
    }
  };

  const config = getConfig();
  const IconComponent = config.icon;

  // Estado del item
  const getEstadoClass = () => {
    switch (dotacion.estado) {
      case 'activa': return 'estado-activa';
      case 'pendiente_aceptacion': return 'estado-pendiente';
      case 'baja': return 'estado-baja';
      default: return 'estado-pendiente';
    }
  };

  const getEstadoLabel = () => {
    switch (dotacion.estado) {
      case 'activa': return 'Activa';
      case 'pendiente_aceptacion': return 'Pendiente Aceptación';
      case 'baja': return 'Baja';
      default: return dotacion.estado;
    }
  };

  // Handler para dar de baja
  const handleDelete = async () => {
    const res = await eliminarAsignacion(tipo, dotacion.id);
    if (res.success) {
      onClose();
    } else {
      alert('Error: ' + (res.error || 'No se pudo dar de baja'));
    }
  };

  // Verificaciones de estado
  const revistaRequerida = tipo === 'armas' && dotacion.requiereRevista;
  const revistaPendiente = revistaRequerida && necesitaRevista && necesitaRevista(dotacion.ultimaRevista);
  const practicaPendiente = tipo === 'armas' && necesitaPracticaTiro && necesitaPracticaTiro(dotacion.ultimaPractica);

  return (
    <div className="dotacion-modal-overlay" onClick={onClose}>
      <style>{styles}</style>

      <div className="dotacion-modal-container" onClick={e => e.stopPropagation()}>
        
        {/* ========== HEADER ========== */}
        <div className="dotacion-modal-header">
          <h3 className="dotacion-modal-title">
            <IconComponent size={20} style={{ color: config.color }} />
            Ficha de {config.label}
          </h3>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: 8 }}>
            <X size={20} />
          </button>
        </div>

        {/* ========== BODY ========== */}
        <div className="dotacion-modal-body">
          
          {/* Cabecera del Item */}
          <div className="dotacion-item-header">
            <div 
              className="dotacion-item-icon" 
              style={{ background: config.bgColor, color: config.color }}
            >
              <IconComponent size={28} />
            </div>
            <div className="dotacion-item-info">
              <h2>
                {dotacion.marca && dotacion.modelo 
                  ? `${dotacion.marca} ${dotacion.modelo}`
                  : config.tipoNombre
                }
              </h2>
              <p>
                {tipo === 'armas' && dotacion.numeroSerie 
                  ? `Nº Serie: ${dotacion.numeroSerie}`
                  : `ID: ${dotacion.id?.slice(0, 12)}...`
                }
              </p>
              <span className={`estado-badge ${getEstadoClass()}`}>
                <CheckCircle size={12} />
                {getEstadoLabel()}
              </span>
            </div>
          </div>

          {/* ========== INFORMACIÓN GENERAL (Visible para todos) ========== */}
          <div className="dotacion-section">
            <div className="dotacion-section-title">
              <Calendar size={14} />
              Información General
            </div>
            <div className="tech-grid">
              <div className="tech-item">
                <div className="tech-label">Tipo</div>
                <div className="tech-value">{config.tipoNombre}</div>
              </div>
              <div className="tech-item">
                <div className="tech-label">Fecha Asignación</div>
                <div className="tech-value">
                  {formatDateSafe(dotacion.fechaAsignacion || dotacion.fechaEntrega)}
                </div>
              </div>
              {dotacion.fechaAceptacion && (
                <div className="tech-item">
                  <div className="tech-label">Fecha Aceptación</div>
                  <div className="tech-value success">
                    {formatDateSafe(dotacion.fechaAceptacion)}
                  </div>
                </div>
              )}
              <div className="tech-item">
                <div className="tech-label">Estado</div>
                <div className={`tech-value ${dotacion.estado === 'activa' ? 'success' : 'warning'}`}>
                  {getEstadoLabel()}
                </div>
              </div>
            </div>
          </div>

          {/* ========== DATOS TÉCNICOS - ARMAS (Solo Admin) ========== */}
          {isAdmin && tipo === 'armas' && (
            <div className="dotacion-section">
              <div className="dotacion-section-title">
                <Target size={14} />
                Datos Técnicos del Arma
              </div>
              <div className="tech-grid">
                <div className="tech-item">
                  <div className="tech-label">Tipo de Arma</div>
                  <div className="tech-value">{dotacion.tipoArma || '---'}</div>
                </div>
                <div className="tech-item">
                  <div className="tech-label">Calibre</div>
                  <div className="tech-value">{dotacion.calibre || '---'}</div>
                </div>
                <div className="tech-item">
                  <div className="tech-label">Marca</div>
                  <div className="tech-value">{dotacion.marca || '---'}</div>
                </div>
                <div className="tech-item">
                  <div className="tech-label">Modelo</div>
                  <div className="tech-value">{dotacion.modelo || '---'}</div>
                </div>
                <div className="tech-item highlight">
                  <div className="tech-label"><Hash size={12} /> Número de Serie</div>
                  <div className="tech-value mono">{dotacion.numeroSerie || '---'}</div>
                </div>
                <div className="tech-item highlight">
                  <div className="tech-label"><FileText size={12} /> Guía de Pertenencia</div>
                  <div className="tech-value mono">{dotacion.guiaPertenencia || '---'}</div>
                </div>
                <div className="tech-item">
                  <div className="tech-label">Fecha de Guía</div>
                  <div className="tech-value">{formatDateShort(dotacion.fechaGuia)}</div>
                </div>
                <div className="tech-item">
                  <div className="tech-label">Cargadores</div>
                  <div className="tech-value">{dotacion.cargadores || 0} unidades</div>
                </div>
                <div className="tech-item">
                  <div className="tech-label">Munición Asignada</div>
                  <div className="tech-value">{dotacion.municionAsignada || 0} cartuchos</div>
                </div>
                <div className="tech-item">
                  <div className="tech-label">Requiere Revista</div>
                  <div className={`tech-value ${dotacion.requiereRevista ? 'warning' : ''}`}>
                    {dotacion.requiereRevista ? 'Sí (Anual)' : 'No'}
                  </div>
                </div>
              </div>

              {/* Estado de Revista y Práctica */}
              {revistaRequerida && (
                <div className="tech-grid" style={{ marginTop: '12px' }}>
                  <div className={`tech-item ${revistaPendiente ? 'warning' : ''}`}>
                    <div className="tech-label"><Eye size={12} /> Última Revista</div>
                    <div className={`tech-value ${revistaPendiente ? 'warning' : 'success'}`}>
                      {dotacion.ultimaRevista 
                        ? formatDateShort(dotacion.ultimaRevista)
                        : 'Sin registros'
                      }
                      {revistaPendiente && ' - PENDIENTE'}
                    </div>
                  </div>
                  <div className={`tech-item ${practicaPendiente ? 'warning' : ''}`}>
                    <div className="tech-label"><Crosshair size={12} /> Última Práctica Tiro</div>
                    <div className={`tech-value ${practicaPendiente ? 'warning' : 'success'}`}>
                      {dotacion.ultimaPractica 
                        ? formatDateShort(dotacion.ultimaPractica)
                        : 'Sin registros'
                      }
                      {practicaPendiente && ' - PENDIENTE'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========== DATOS TÉCNICOS - VESTUARIO (Solo Admin) ========== */}
          {isAdmin && tipo === 'vestuario' && (
            <div className="dotacion-section">
              <div className="dotacion-section-title">
                <Tag size={14} />
                Datos del Vestuario
              </div>
              <div className="tech-grid">
                <div className="tech-item">
                  <div className="tech-label">Categoría</div>
                  <div className="tech-value">{dotacion.categoria || 'General'}</div>
                </div>
                <div className="tech-item">
                  <div className="tech-label">Prenda</div>
                  <div className="tech-value">{config.tipoNombre}</div>
                </div>
                <div className="tech-item highlight">
                  <div className="tech-label">Talla</div>
                  <div className="tech-value">{dotacion.talla || '---'}</div>
                </div>
                <div className="tech-item">
                  <div className="tech-label">Cantidad</div>
                  <div className="tech-value">{dotacion.cantidad || 1} unidad(es)</div>
                </div>
                <div className="tech-item">
                  <div className="tech-label">Fecha Entrega</div>
                  <div className="tech-value">{formatDateShort(dotacion.fechaEntrega)}</div>
                </div>
                <div className="tech-item warning">
                  <div className="tech-label"><Calendar size={12} /> Próxima Renovación</div>
                  <div className="tech-value warning">
                    {formatDateShort(dotacion.fechaRenovacion)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========== DATOS TÉCNICOS - EQUIPAMIENTO (Solo Admin) ========== */}
          {isAdmin && tipo === 'equipamiento' && (
            <div className="dotacion-section">
              <div className="dotacion-section-title">
                <Package size={14} />
                Datos del Equipamiento
              </div>
              <div className="tech-grid">
                <div className="tech-item">
                  <div className="tech-label">Tipo</div>
                  <div className="tech-value">{config.tipoNombre}</div>
                </div>
                <div className="tech-item">
                  <div className="tech-label">Marca</div>
                  <div className="tech-value">{dotacion.marca || '---'}</div>
                </div>
                <div className="tech-item">
                  <div className="tech-label">Modelo</div>
                  <div className="tech-value">{dotacion.modelo || '---'}</div>
                </div>
                {dotacion.talla && (
                  <div className="tech-item highlight">
                    <div className="tech-label">Talla</div>
                    <div className="tech-value">{dotacion.talla}</div>
                  </div>
                )}
                {dotacion.nivel && (
                  <div className="tech-item highlight">
                    <div className="tech-label"><Shield size={12} /> Nivel Protección</div>
                    <div className="tech-value">{dotacion.nivel}</div>
                  </div>
                )}
                {dotacion.proteccionArmaBlanca !== undefined && (
                  <div className="tech-item">
                    <div className="tech-label">Anti-Trauma / Arma Blanca</div>
                    <div className="tech-value">
                      {dotacion.proteccionArmaBlanca ? 'Sí' : 'No'}
                    </div>
                  </div>
                )}
                {dotacion.numeroSerie && (
                  <div className="tech-item">
                    <div className="tech-label"><Hash size={12} /> Número de Serie</div>
                    <div className="tech-value mono">{dotacion.numeroSerie}</div>
                  </div>
                )}
                <div className="tech-item">
                  <div className="tech-label">Fecha Asignación</div>
                  <div className="tech-value">{formatDateShort(dotacion.fechaAsignacion)}</div>
                </div>
                {dotacion.fechaCaducidad && (
                  <div className="tech-item danger">
                    <div className="tech-label"><AlertTriangle size={12} /> Fecha Caducidad</div>
                    <div className="tech-value danger">
                      {formatDateShort(dotacion.fechaCaducidad)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========== AUDITORÍA (Solo Admin) ========== */}
          {isAdmin && (
            <div className="dotacion-section">
              <div className="dotacion-section-title">
                <User size={14} />
                Auditoría
              </div>
              <div className="tech-grid">
                <div className="tech-item">
                  <div className="tech-label">Asignado por</div>
                  <div className="tech-value mono" style={{ fontSize: '0.8rem' }}>
                    {dotacion.assignedByUid || '---'}
                  </div>
                </div>
                <div className="tech-item">
                  <div className="tech-label">ID Documento</div>
                  <div className="tech-value mono" style={{ fontSize: '0.8rem' }}>
                    {dotacion.id || '---'}
                  </div>
                </div>
                <div className="tech-item">
                  <div className="tech-label">Creado</div>
                  <div className="tech-value">{formatDateShort(dotacion.createdAt)}</div>
                </div>
                {dotacion.fechaActualizacion && (
                  <div className="tech-item">
                    <div className="tech-label">Última Actualización</div>
                    <div className="tech-value">{formatDateShort(dotacion.fechaActualizacion)}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========== OBSERVACIONES ========== */}
          {dotacion.observaciones && (
            <div className="dotacion-section">
              <div className="dotacion-section-title">
                <FileText size={14} />
                Observaciones
              </div>
              <div className="observaciones-box">
                <p>{dotacion.observaciones}</p>
              </div>
            </div>
          )}

        </div>

        {/* ========== FOOTER ========== */}
        <div className="dotacion-modal-footer">
          {showConfirm ? (
            <div className="confirm-delete">
              <AlertTriangle size={20} style={{ color: '#ef4444' }} />
              <span>¿Confirmar baja de este elemento?</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
                <button className="btn btn-ghost" onClick={() => setShowConfirm(false)}>
                  Cancelar
                </button>
                <button className="btn btn-danger" onClick={handleDelete} disabled={loading}>
                  {loading ? <RotateCw size={16} className="spin" /> : <Trash2 size={16} />}
                  Confirmar Baja
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="footer-left">
                {isAdmin && dotacion.estado !== 'baja' && (
                  <button className="btn btn-danger" onClick={() => setShowConfirm(true)}>
                    <Trash2 size={16} />
                    Dar de Baja
                  </button>
                )}
              </div>
              <div className="footer-right">
                <button className="btn btn-primary" onClick={onClose}>
                  <CheckCircle size={16} />
                  Cerrar Ficha
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}