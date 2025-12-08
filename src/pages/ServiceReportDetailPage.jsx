// Archivo: /src/pages/ServiceReportDetailPage.jsx
// ✨ VERSIÓN FINAL: Timeline unificado en el Resumen y corrección de 'summaryTotal'

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReportStore } from '../store/reportStore';
import { useAuthStore } from '../store/authStore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Iconos
import {
    ArrowLeft, Calendar, Clock, User, CheckCircle, AlertCircle,
    List, FileText, Plus, Edit2, Send, XCircle,
    CheckSquare, Square, Phone, MapPin, Shield, MessageCircle,
    Sun, Moon, Sunset, AlertTriangle, PhoneCall, UserCheck,
    Activity, TrendingUp, Award, Coffee, BarChart2, Clipboard,
    Hash, PieChart
} from 'react-feather';

// Componentes
import ReportSummaryModal from '../components/Modals/ReportSummaryModal';
import ReportEntryModal from '../components/Modals/ReportEntryModal';
import AddRequerimientoModal from '../components/Modals/AddRequerimientoModal';
import { SUMMARY_FIELD_LABELS } from '../constants/summaryFields';

// =========================================
// CONSTANTES DE ESTILO
// =========================================
const shiftConfig = {
    'M': { bg: 'rgba(52, 211, 153, 0.2)', text: '#34d399', label: 'Mañana', icon: Sun },
    'T': { bg: 'rgba(96, 165, 250, 0.2)', text: '#60a5fa', label: 'Tarde', icon: Sunset },
    'N': { bg: 'rgba(167, 139, 250, 0.2)', text: '#a78bfa', label: 'Noche', icon: Moon }
};

const statusConfig = {
    'open': { bg: '#3b82f6', label: 'En Curso', icon: Activity },
    'pending_review': { bg: '#fbbf24', label: 'Pendiente Revisión', icon: Clock },
    'validated': { bg: '#34d399', label: 'Validado', icon: CheckCircle },
    'returned': { bg: '#ef4444', label: 'Devuelto', icon: XCircle },
    'closed': { bg: '#9ca3af', label: 'Cerrado', icon: CheckCircle }
};

// =========================================
// ESTILOS CSS-IN-JS
// =========================================
const customStyles = `
  .timeline-connector {
    position: absolute;
    left: 20px;
    top: 40px;
    bottom: 0;
    width: 2px;
    background: linear-gradient(to bottom, var(--color-accent-neon), transparent);
  }
  
  .timeline-entry {
    position: relative;
    padding-left: 50px;
    padding-bottom: 1.5rem;
    animation: slideInLeft 0.3s ease;
  }
  
  .timeline-entry::before {
    content: '';
    position: absolute;
    left: 12px;
    top: 8px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--glass-dark-bg);
    border: 3px solid var(--color-accent-neon);
    z-index: 1;
  }
  
  .timeline-entry.urgent::before {
    border-color: #ef4444;
    box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
  }
  
  .briefing-timeline-item {
    position: relative;
    padding-left: 35px;
    padding-bottom: 1rem;
  }
  
  .briefing-timeline-item::before {
    content: '';
    position: absolute;
    left: 8px;
    top: 6px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #60a5fa;
    z-index: 1;
  }
  
  .briefing-timeline-item::after {
    content: '';
    position: absolute;
    left: 12px;
    top: 20px;
    bottom: -4px;
    width: 2px;
    background: rgba(96, 165, 250, 0.3);
  }
  
  .briefing-timeline-item:last-child::after {
    display: none;
  }
  
  .progress-bar-container {
    background: rgba(255,255,255,0.1);
    border-radius: 10px;
    height: 8px;
    overflow: hidden;
  }
  
  .progress-bar-fill {
    height: 100%;
    border-radius: 10px;
    background: linear-gradient(90deg, var(--color-accent-neon), #34d399);
    transition: width 0.5s ease;
  }
  
  .task-item {
    transition: all 0.2s ease;
  }
  
  .task-item:hover {
    transform: translateX(4px);
    background: rgba(255,255,255,0.06) !important;
  }
  
  .task-item.completed {
    opacity: 0.7;
  }
  
  .req-card {
    transition: all 0.2s ease;
  }
  
  .req-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
  }
  
  .stat-card {
    transition: all 0.2s ease;
  }
  
  .stat-card:hover {
    transform: scale(1.02);
    border-color: var(--color-accent-neon) !important;
  }
  
  .tab-badge {
    background: var(--color-accent-neon);
    color: black;
    font-size: 0.65rem;
    padding: 2px 6px;
    border-radius: 10px;
    margin-left: 6px;
    font-weight: bold;
  }
  
  .summary-section {
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    padding: 1.25rem;
    margin-bottom: 1rem;
  }
  
  .summary-section-title {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  
  .resumen-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 1rem;
  }
  
  .resumen-grid .stat-card {
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.03);
    padding: 0.8rem 1rem;
  }
  
  .stat-value {
    font-size: 1.6rem;
    font-weight: 700;
    color: var(--color-accent-neon);
  }
  
  .stat-label {
    font-size: 0.75rem;
    color: rgba(255,255,255,0.75);
    margin-top: 4px;
    display: block;
  }
  
  @keyframes slideInLeft {
    from { opacity: 0; transform: translateX(-20px); }
    to { opacity: 1; transform: translateX(0); }
  }
`;

// =========================================
// HELPER: Parsear instrucciones del briefing
// =========================================
const parseBriefingInstructions = (description) => {
  if (!description) return [];

  const timePattern = /(\d{1,2}:\d{2}\s*a\s*\d{1,2}:\d{2}\s*h\.?)/g;
  const matches = [...description.matchAll(timePattern)];

  if (matches.length === 0) {
    const parts = description.split(' - ').filter((p) => p.trim());
    if (parts.length <= 1) {
      return description
        .split('.')
        .filter((p) => p.trim())
        .map((p) => p.trim());
    }
    return parts.map((p) => p.trim());
  }

  const blocks = [];

  for (let i = 0; i < matches.length; i++) {
    const currentMatch = matches[i];
    const nextMatch = matches[i + 1];

    const startIdx = currentMatch.index;
    const endIdx = nextMatch ? nextMatch.index : description.length;

    let block = description.substring(startIdx, endIdx).trim();
    block = block.replace(/^\s*-\s*/, '').replace(/\s*-\s*$/, '').trim();

    if (block) {
      blocks.push(block);
    }
  }

  if (matches.length > 0 && matches[0].index > 0) {
    const preText = description
      .substring(0, matches[0].index)
      .trim()
      .replace(/\s*-\s*$/, '');
    if (preText) {
      blocks.unshift(preText);
    }
  }

  return blocks;
};

// =========================================
// 💡 NUEVO HELPER: Construir eventos cronológicos para el resumen
// =========================================
const buildSummaryTimelineEvents = (report) => {
    if (!report) return [];
    const events = [];
    const serviceDate = report.order?.service_date
        ? new Date(report.order.service_date)
        : new Date();
        
    // 1) Bitácora
    (report.reportEntries || []).forEach((entry) => {
        const date = entry.createdAt?.toDate
            ? entry.createdAt.toDate()
            : new Date(entry.createdAt || serviceDate);
        events.push({
            type: 'bitacora',
            time: date,
            sortKey: date.getTime(),
            data: entry
        });
    });

    // 2) Requerimientos
    (report.requerimientos || []).forEach((req) => {
        let reqDate = new Date(serviceDate);
        if (req.hora) {
            const [h, m] = req.hora.split(':').map((n) => parseInt(n, 10));
            if (!Number.isNaN(h) && !Number.isNaN(m)) {
                reqDate.setHours(h, m, 0, 0);
            }
        }
        events.push({
            type: 'requerimiento',
            time: reqDate,
            sortKey: reqDate.getTime() + 1, // +1 para que no “pisen” a la bitácora exacta
            data: req
        });
    });

    // 3) Bloque de tareas (estado final, sin tiempo exacto)
    const checklist = report.order?.checklist || [];
    if (checklist.length > 0) {
        events.push({
            type: 'tareas_resumen',
            time: new Date(serviceDate.getTime() + 23 * 60 * 60 * 1000), // final del día
            sortKey: serviceDate.getTime() + 23 * 60 * 60 * 1000,
            data: { checklist }
        });
    }

    // 4) Bloque estadísticas (summary)
    if (report.summary && Object.keys(report.summary).length > 0) {
        events.push({
            type: 'estadisticas_resumen',
            time: new Date(serviceDate.getTime() + 24 * 60 * 60 * 1000), // cierre
            sortKey: serviceDate.getTime() + 24 * 60 * 60 * 1000,
            data: {
                summary: report.summary
            }
        });
    }

    // Ordenar
    events.sort((a, b) => a.sortKey - b.sortKey);
    return events;
};


export default function ServiceReportDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    currentReport,
    loadingReport,
    loadReportDetails,
    submitForReview,
    validateOrReturn,
    updateChecklist,
    toggleReqStatus
  } = useReportStore();

  const [activeTab, setActiveTab] = useState('bitacora');
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isReqModalOpen, setIsReqModalOpen] = useState(false);
  const [resolvingReq, setResolvingReq] = useState(null);
  const [resolutionComment, setResolutionComment] = useState('');

  const isAdmin = user?.role === 'admin' || user?.role === 'supervisor';
  const isEditable = currentReport && (currentReport.status === 'open' || currentReport.status === 'returned');

  useEffect(() => {
    loadReportDetails(id);
  }, [id, loadReportDetails]);

  // =========================================
  // HANDLERS
  // =========================================
  const handleToggleReq = (reqId, currentStatus) => {
    const newStatus = !currentStatus;
    if (newStatus === true) {
      setResolvingReq(reqId);
      setResolutionComment('');
    } else {
      toggleReqStatus(reqId, false, '');
    }
  };

  const confirmResolveReq = () => {
    if (resolvingReq) {
      toggleReqStatus(resolvingReq, true, resolutionComment);
      setResolvingReq(null);
      setResolutionComment('');
    }
  };

  const handleSubmitForReview = () => {
    if (!currentReport) return;
    const confirmMsg =
      '¿Quieres marcar este Parte de Servicio como FINALIZADO para revisión?\n\nTras esto no se podrá editar salvo que sea devuelto.';
    if (window.confirm(confirmMsg)) {
      submitForReview(currentReport.id);
    }
  };

  const handleValidate = () => {
    if (!currentReport) return;
    const confirmMsg =
      '¿Validar definitivamente este Parte de Servicio?\n\nTras la validación ya no será editable.';
    if (window.confirm(confirmMsg)) {
      validateOrReturn(currentReport.id, true);
    }
  };

  const handleReturn = () => {
    if (!currentReport) return;
    const reason = window.prompt('Motivo de la devolución:');
    if (!reason) return;
    validateOrReturn(currentReport.id, false, reason);
  };

  // =========================================
  // HELPERS
  // =========================================
  const getShiftBadge = (shift) => {
    const config = shiftConfig[shift];
    if (!config) return null;
    const IconComponent = config.icon;
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: config.bg,
          color: config.text,
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '0.85rem',
          fontWeight: '600',
          border: `1px solid ${config.text}40`
        }}
      >
        <IconComponent size={14} />
        {config.label}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const config = statusConfig[status] || statusConfig.open;
    const IconComponent = config.icon;
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: `${config.bg}20`,
          color: config.bg,
          border: `1px solid ${config.bg}50`,
          fontSize: '0.8rem',
          padding: '6px 14px',
          borderRadius: '20px',
          fontWeight: '600'
        }}
      >
        <IconComponent size={14} />
        {config.label}
      </span>
    );
  };

  const getTaskProgress = () => {
    const tasks = currentReport?.order?.checklist || [];
    if (tasks.length === 0) return { completed: 0, total: 0, percent: 0 };
    const completed = tasks.filter((t) => t.status === 'realizado').length;
    return {
      completed,
      total: tasks.length,
      percent: Math.round((completed / tasks.length) * 100)
    };
  };

  const getReqStats = () => {
    const reqs = currentReport?.requerimientos || [];
    const resolved = reqs.filter((r) => r.isResolved).length;
    return { resolved, total: reqs.length };
  };

  const getEntriesCount = () => currentReport?.reportEntries?.length || 0;

  // 💡 CÁLCULO MOVIDO AL ÁMBITO PRINCIPAL
  const getSummaryTotal = () => {
    if (!currentReport?.summary) return 0;
    return Object.values(currentReport.summary).reduce((sum, val) => sum + (val || 0), 0);
  };

  // LOADING STATE
  if (loadingReport || !currentReport) {
    return (
      <div
        className="loading-screen"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: '1rem'
        }}
      >
        <div className="loading-spinner"></div>
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>Cargando parte de servicio...</span>
      </div>
    );
  }

  // 💡 CÁLCULO DE LA VARIABLE summaryTotal EN EL ÁMBITO PRINCIPAL
  // ESTO RESUELVE EL REFERENCERROR
  const summaryTotal = getSummaryTotal(); 
  
  const taskProgress = getTaskProgress();
  const reqStats = getReqStats();
  const shift = currentReport.order?.service_shift || currentReport.service_shift;
  const briefingItems = parseBriefingInstructions(currentReport.order?.description);

  // =========================================
  // 1. PESTAÑA BITÁCORA
  // =========================================
  const renderBitacora = () => (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0, color: 'white', fontSize: '1.1rem' }}>Bitácora de Actuaciones</h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
          Registro cronológico de intervenciones
        </p>
      </div>

      {(!currentReport.reportEntries || currentReport.reportEntries.length === 0) ? (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '12px',
            border: '1px dashed rgba(255,255,255,0.1)'
          }}
        >
          <Coffee size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>No hay novedades registradas aún.</p>
          {isEditable && (
            <button
              className="button button-secondary button-sm"
              style={{ marginTop: '1rem' }}
              onClick={() => setIsEntryModalOpen(true)}
            >
              <Plus size={14} /> Registrar primera novedad
            </button>
          )}
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: '10px' }}>
          <div className="timeline-connector"></div>

          {currentReport.reportEntries
            ?.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
            .map((entry, idx) => {
              const date = entry.createdAt?.toDate ? entry.createdAt.toDate() : new Date(entry.createdAt);
              const isUrgent = entry.priority === 'urgente';

              return (
                <div key={idx} className={`timeline-entry ${isUrgent ? 'urgent' : ''}`}>
                  <div
                    style={{
                      background: isUrgent ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.03)',
                      border: isUrgent
                        ? '1px solid rgba(239, 68, 68, 0.3)'
                        : '1px solid rgba(255,255,255,0.05)',
                      padding: '1rem',
                      borderRadius: '12px'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 'bold', color: 'white' }}>
                          {entry.createdByAgentName || 'Agente'}
                        </span>
                        {isUrgent && (
                          <span
                            style={{
                              background: '#ef4444',
                              color: 'white',
                              fontSize: '0.65rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: 'bold',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                          >
                            <AlertTriangle size={10} /> URGENTE
                          </span>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: '0.8rem',
                          color: 'rgba(255,255,255,0.5)',
                          background: 'rgba(255,255,255,0.05)',
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}
                      >
                        {format(date, 'HH:mm')}
                      </span>
                    </div>
                    <p
                      style={{
                        margin: 0,
                        color: 'rgba(255,255,255,0.85)',
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.5
                      }}
                    >
                      {entry.description}
                    </p>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );

  // =========================================
  // 2. PESTAÑA TAREAS - Con Briefing Timeline
  // =========================================
  const renderTareas = () => (
    <div>
      {/* Briefing con Timeline */}
      <div
        style={{
          marginBottom: '2rem',
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.05))',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          padding: '1.25rem',
          borderRadius: '12px'
        }}
      >
        <h4
          style={{
            margin: '0 0 15px 0',
            color: '#60a5fa',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Shield size={18} /> Instrucciones del Servicio (Briefing)
        </h4>

        {briefingItems.length > 1 ? (
          <div style={{ marginLeft: '5px' }}>
            {briefingItems.map((item, idx) => {
              const timeMatch = item.match(/^(\d{1,2}:\d{2}\s*a\s*\d{1,2}:\d{2}\s*h\.?)\s*(.*)$/);
              const timeStr = timeMatch ? timeMatch[1] : null;
              const descStr = timeMatch ? timeMatch[2] : item;

              return (
                <div key={idx} className="briefing-timeline-item">
                  <div
                    style={{
                      color: 'white',
                      fontSize: '0.9rem',
                      lineHeight: 1.5,
                      opacity: 0.9
                    }}
                  >
                    {timeStr && (
                      <span
                        style={{
                          color: '#60a5fa',
                          fontWeight: '600',
                          marginRight: '8px',
                          background: 'rgba(96, 165, 250, 0.15)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.85rem'
                        }}
                      >
                        {timeStr}
                      </span>
                    )}
                    <span>{descStr || item}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p
            style={{
              margin: 0,
              color: 'white',
              opacity: 0.9,
              lineHeight: 1.6,
              fontSize: '0.95rem'
            }}
          >
            {currentReport.order?.description || 'Sin instrucciones específicas para este turno.'}
          </p>
        )}
      </div>

      {/* Barra de Progreso */}
      {taskProgress.total > 0 && (
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1.5rem'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px'
            }}
          >
            <span
              style={{
                color: 'white',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <TrendingUp size={16} color="var(--color-accent-neon)" />
              Progreso de Tareas
            </span>
            <span
              style={{
                color: taskProgress.percent === 100 ? '#34d399' : 'var(--color-accent-neon)',
                fontWeight: 'bold',
                fontSize: '0.9rem'
              }}
            >
              {taskProgress.completed}/{taskProgress.total} completadas ({taskProgress.percent}%)
            </span>
          </div>
          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{
                width: `${taskProgress.percent}%`,
                background:
                  taskProgress.percent === 100
                    ? 'linear-gradient(90deg, #34d399, #10b981)'
                    : 'linear-gradient(90deg, var(--color-accent-neon), #34d399)'
              }}
            ></div>
          </div>
          {taskProgress.percent === 100 && (
            <div
              style={{
                marginTop: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#34d399',
                fontSize: '0.85rem'
              }}
            >
              <Award size={14} /> ¡Todas las tareas completadas!
            </div>
          )}
        </div>
      )}

      {/* Lista de Tareas */}
      <div>
        <h3 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '1rem' }}>Lista de Tareas</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {currentReport.order?.checklist?.map((task, idx) => {
            const isCompleted = task.status === 'realizado';
            return (
              <div
                key={idx}
                className={`task-item ${isCompleted ? 'completed' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  background: isCompleted ? 'rgba(52, 211, 153, 0.05)' : 'rgba(255,255,255,0.03)',
                  padding: '14px',
                  borderRadius: '10px',
                  border: isCompleted
                    ? '1px solid rgba(52, 211, 153, 0.2)'
                    : '1px solid rgba(255,255,255,0.05)',
                  cursor: isEditable ? 'pointer' : 'default'
                }}
                onClick={() =>
                  isEditable &&
                  updateChecklist(null, idx, isCompleted ? 'pendiente' : 'realizado')
                }
              >
                <div
                  style={{
                    color: isCompleted ? '#34d399' : 'rgba(255,255,255,0.3)',
                    marginTop: '2px'
                  }}
                >
                  {isCompleted ? <CheckSquare size={22} /> : <Square size={22} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontWeight: '600',
                      color: isCompleted ? '#34d399' : 'white',
                      textDecoration: isCompleted ? 'line-through' : 'none',
                      fontSize: '0.95rem'
                    }}
                  >
                    {task.item}
                  </div>
                  {task.requiresGeolocation && (
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: '#60a5fa',
                        marginTop: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'rgba(96, 165, 250, 0.1)',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        width: 'fit-content'
                      }}
                    >
                      <MapPin size={12} /> Requiere geolocalización
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {(!currentReport.order?.checklist || currentReport.order.checklist.length === 0) && (
            <div
              style={{
                textAlign: 'center',
                padding: '2rem',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '12px',
                border: '1px dashed rgba(255,255,255,0.1)'
              }}
            >
              <CheckSquare size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
              <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                Sin tareas asignadas para este turno.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // =========================================
  // 3. PESTAÑA REQUERIMIENTOS
  // =========================================
  const renderRequerimientos = () => (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0, color: 'white', fontSize: '1.1rem' }}>Requerimientos Ciudadanos</h3>
        {reqStats.total > 0 && (
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
            {reqStats.resolved} de {reqStats.total} resueltos
          </p>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {currentReport.requerimientos?.map((req) => (
          <div
            key={req.id}
            className="req-card"
            style={{
              background: req.isResolved ? 'rgba(34, 197, 94, 0.05)' : 'rgba(255,255,255,0.03)',
              border: req.isResolved
                ? '1px solid rgba(34, 197, 94, 0.2)'
                : '1px solid rgba(255,255,255,0.05)',
              borderRadius: '12px',
              padding: '1.25rem',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '4px',
                background: req.isResolved ? '#22c55e' : '#ef4444'
              }}
            ></div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontWeight: 'bold', color: 'white', fontSize: '1rem' }}>
                  {req.requirente || 'Ciudadano'}
                </span>
                <span
                  style={{
                    background:
                      req.tipoContacto === 'telefonico'
                        ? 'rgba(96, 165, 250, 0.15)'
                        : 'rgba(167, 139, 250, 0.15)',
                    color: req.tipoContacto === 'telefonico' ? '#60a5fa' : '#a78bfa',
                    fontSize: '0.7rem',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {req.tipoContacto === 'telefonico' ? (
                    <PhoneCall size={10} />
                  ) : (
                    <UserCheck size={10} />
                  )}
                  {req.tipoContacto === 'telefonico' ? 'Telefónico' : 'Presencial'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    background: req.isResolved ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: req.isResolved ? '#22c55e' : '#ef4444',
                    fontSize: '0.7rem',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontWeight: 'bold'
                  }}
                >
                  {req.isResolved ? '✓ RESUELTO' : 'PENDIENTE'}
                </span>
                <span
                  style={{
                    fontSize: '0.8rem',
                    color: 'rgba(255,255,255,0.5)',
                    background: 'rgba(255,255,255,0.05)',
                    padding: '3px 8px',
                    borderRadius: '4px'
                  }}
                >
                  {req.hora}
                </span>
              </div>
            </div>

            <div
              style={{
                fontSize: '0.95rem',
                color: 'rgba(255,255,255,0.85)',
                marginBottom: '10px',
                lineHeight: 1.5
              }}
            >
              {req.motivo}
            </div>

            {req.telefono && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(255,255,255,0.05)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  color: 'rgba(255,255,255,0.7)',
                  marginBottom: '10px'
                }}
              >
                <Phone size={12} /> {req.telefono}
              </div>
            )}

            {req.resolutionComment && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '10px',
                  background: 'rgba(34, 197, 94, 0.1)',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  color: '#34d399',
                  display: 'flex',
                  gap: '8px',
                  border: '1px solid rgba(34, 197, 94, 0.2)'
                }}
              >
                <MessageCircle size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <strong>Resolución:</strong> {req.resolutionComment}
                </div>
              </div>
            )}

            {isEditable && (
              <div
                style={{
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid rgba(255,255,255,0.05)'
                }}
              >
                <button
                  className={`button button-sm ${
                    req.isResolved ? 'button-secondary' : 'button-success'
                  }`}
                  onClick={() => handleToggleReq(req.id, req.isResolved)}
                  style={{ fontSize: '0.85rem' }}
                >
                  {req.isResolved ? (
                    <>
                      <XCircle size={14} /> Marcar Pendiente
                    </>
                  ) : (
                    <>
                      <CheckCircle size={14} /> Marcar Resuelto
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        ))}

        {(!currentReport.requerimientos || currentReport.requerimientos.length === 0) && (
          <div
            style={{
              textAlign: 'center',
              padding: '3rem',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '12px',
              border: '1px dashed rgba(255,255,255,0.1)'
            }}
          >
            <Phone size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>
              No hay requerimientos registrados.
            </p>
            {isEditable && (
              <button
                className="button button-secondary button-sm"
                style={{ marginTop: '1rem' }}
                onClick={() => setIsReqModalOpen(true)}
              >
                <Plus size={14} /> Registrar requerimiento
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // =========================================
  // 4. PESTAÑA ACTUACIONES (estadísticas)
  // =========================================
  const renderActuaciones = () => {
    const hasData = summaryTotal > 0;

    return (
      <div>
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, color: 'white', fontSize: '1.1rem' }}>Actuaciones del Turno</h3>
          {hasData && (
            <p
              style={{
                margin: '4px 0 0 0',
                fontSize: '0.85rem',
                color: 'rgba(255,255,255,0.5)'
              }}
            >
              {summaryTotal} actuaciones registradas
            </p>
          )}
        </div>

        {hasData ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: '1rem'
            }}
          >
            {Object.entries(SUMMARY_FIELD_LABELS).map(([key, label]) => {
              const value = currentReport.summary?.[key] || 0;
              if (value === 0) return null;

              return (
                <div
                  key={key}
                  className="stat-card"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    padding: '1rem',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px'
                  }}
                >
                  <span
                    style={{
                      fontSize: '1.8rem',
                      fontWeight: 'bold',
                      color: 'var(--color-accent-neon)'
                    }}
                  >
                    {value}
                  </span>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      color: 'rgba(255,255,255,0.7)',
                      lineHeight: 1.3
                    }}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: '3rem',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '12px',
              border: '1px dashed rgba(255,255,255,0.1)'
            }}
          >
            <Activity size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>
              Sin actuaciones estadísticas registradas.
            </p>
            {isEditable && (
              <button
                className="button button-secondary button-sm"
                style={{ marginTop: '1rem' }}
                onClick={() => setIsSummaryModalOpen(true)}
              >
                <Edit2 size={14} /> Añadir estadísticas
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  // =========================================
// 5. PESTAÑA RESUMEN - Vista cronológica unificada (REEMPLAZADA)
// =========================================
const renderResumenConsolidado = () => {
  const report = currentReport;
  if (!report) return null;
  
  // 💡 USAMOS EL NUEVO HELPER
  const events = buildSummaryTimelineEvents(report); 
  
  if (events.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '2rem',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '12px',
          border: '1px dashed rgba(255,255,255,0.1)'
        }}
      >
        <PieChart size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
        <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>
          No hay datos para mostrar en el resumen.
        </p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', paddingLeft: '10px' }}>
      {/* Línea vertical */}
      <div className="timeline-connector"></div>
      {events.map((event, idx) => {
        const timeLabel =
          event.type === 'tareas_resumen' || event.type === 'estadisticas_resumen'
            ? ''
            : format(event.time, 'HH:mm');
            
        // --- 1. Bitácora ---
        if (event.type === 'bitacora') {
          const entry = event.data;
          const isUrgent = entry.priority === 'urgente';
          return (
            <div
              key={`ev-${idx}`}
              className={`timeline-entry ${isUrgent ? 'urgent' : ''}`}
            >
              <div
                style={{
                  background: isUrgent ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.03)',
                  border: isUrgent
                    ? '1px solid rgba(239, 68, 68, 0.3)'
                    : '1px solid rgba(255,255,255,0.05)',
                  padding: '1rem',
                  borderRadius: '12px'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '6px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={14} color="#e5e7eb" />
                    <span style={{ fontWeight: '600', color: 'white', fontSize: '0.9rem' }}>
                      Novedad de servicio
                    </span>
                    {isUrgent && (
                      <span
                        style={{
                          background: '#ef4444',
                          color: 'white',
                          fontSize: '0.65rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        <AlertTriangle size={10} /> URGENTE
                      </span>
                    )}
                  </div>
                  {timeLabel && (
                    <span
                      style={{
                        fontSize: '0.8rem',
                        color: 'rgba(255,255,255,0.5)',
                        background: 'rgba(255,255,255,0.05)',
                        padding: '2px 8px',
                        borderRadius: '4px'
                      }}
                    >
                      {timeLabel}
                    </span>
                  )}
                </div>
                <p
                  style={{
                    margin: 0,
                    color: 'rgba(255,255,255,0.85)',
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.5,
                    fontSize: '0.9rem'
                  }}
                >
                  {entry.description}
                </p>
              </div>
            </div>
          );
        }

        // --- 2. Requerimientos ---
        if (event.type === 'requerimiento') {
          const req = event.data;
          return (
            <div key={`ev-${idx}`} className="timeline-entry">
              <div
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  padding: '1rem',
                  borderRadius: '12px'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '6px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {req.tipoContacto === 'telefonico' ? (
                      <PhoneCall size={14} color="#60a5fa" />
                    ) : (
                      <UserCheck size={14} color="#a78bfa" />
                    )}
                    <span style={{ fontWeight: '600', color: 'white', fontSize: '0.9rem' }}>
                      Requerimiento ciudadano
                    </span>
                    <span
                      style={{
                        background: req.isResolved
                          ? 'rgba(34, 197, 94, 0.2)'
                          : 'rgba(239, 68, 68, 0.2)',
                        color: req.isResolved ? '#22c55e' : '#ef4444',
                        fontSize: '0.7rem',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 'bold'
                      }}
                    >
                      {req.isResolved ? 'RESUELTO' : 'PENDIENTE'}
                    </span>
                  </div>
                  {timeLabel && (
                    <span
                      style={{
                        fontSize: '0.8rem',
                        color: 'rgba(255,255,255,0.5)',
                        background: 'rgba(255,255,255,0.05)',
                        padding: '2px 8px',
                        borderRadius: '4px'
                      }}
                    >
                      {timeLabel}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: '0.9rem',
                    color: 'rgba(255,255,255,0.85)',
                    marginBottom: '6px',
                    lineHeight: 1.5
                  }}
                >
                  {req.motivo}
                </div>
                {req.telefono && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'rgba(255,255,255,0.05)',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      color: 'rgba(255,255,255,0.7)'
                    }}
                  >
                    <Phone size={12} /> {req.telefono}
                  </div>
                )}
                {req.resolutionComment && (
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '8px',
                      background: 'rgba(34, 197, 94, 0.08)',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      color: '#34d399',
                      display: 'flex',
                      gap: '6px',
                      border: '1px solid rgba(34, 197, 94, 0.3)'
                    }}
                  >
                    <MessageCircle size={13} style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div>
                      <strong>Resolución:</strong> {req.resolutionComment}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        }

        // --- 3. Tareas Resumen ---
        if (event.type === 'tareas_resumen') {
          const { checklist } = event.data;
          const total = checklist.length;
          const completed = checklist.filter((t) => t.status === 'realizado').length;
          const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
          return (
            <div key={`ev-${idx}`} className="timeline-entry">
              <div
                style={{
                  background: 'rgba(15,23,42,0.9)',
                  border: '1px solid rgba(56,189,248,0.4)',
                  padding: '1rem',
                  borderRadius: '12px'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '6px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <List size={14} color="#38bdf8" />
                    <span style={{ fontWeight: '600', color: 'white', fontSize: '0.9rem' }}>
                      Estado final de tareas
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      color: percent === 100 ? '#34d399' : 'var(--color-accent-neon)',
                      fontWeight: '600'
                    }}
                  >
                    {completed}/{total} ({percent}%)
                  </span>
                </div>
                <div className="progress-bar-container" style={{ marginTop: '4px' }}>
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${percent}%`,
                      background:
                        percent === 100
                          ? 'linear-gradient(90deg, #34d399, #10b981)'
                          : 'linear-gradient(90deg, var(--color-accent-neon), #34d399)'
                    }}
                  ></div>
                </div>
              </div>
            </div>
          );
        }

        // --- 4. Estadísticas Resumen ---
        if (event.type === 'estadisticas_resumen') {
          const { summary } = event.data;
          const validEntries = Object.entries(summary).filter(
            ([key, value]) => value > 0 && SUMMARY_FIELD_LABELS && SUMMARY_FIELD_LABELS[key]
          );
          return (
            <div key={`ev-${idx}`} className="timeline-entry">
              <div
                style={{
                  background: 'rgba(15,23,42,0.9)',
                  border: '1px solid rgba(139, 92, 246, 0.4)',
                  padding: '1rem',
                  borderRadius: '12px'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <BarChart2 size={14} color="#a855f7" />
                    <span style={{ fontWeight: '600', color: 'white', fontSize: '0.9rem' }}>
                      Cierre estadístico del turno
                    </span>
                  </div>
                </div>
                {validEntries.length === 0 ? (
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.85rem',
                      color: 'rgba(255,255,255,0.6)'
                    }}
                  >
                    No hay actuaciones estadísticas registradas.
                  </p>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                      gap: '0.75rem',
                      marginTop: '4px'
                    }}
                  >
                    {validEntries.map(([key, value]) => {
                      const label = SUMMARY_FIELD_LABELS[key] || '';
                      return (
                        <div
                          key={key}
                          style={{
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '10px',
                            padding: '0.6rem 0.7rem',
                            border: '1px solid rgba(255,255,255,0.08)'
                          }}
                        >
                          <div
                            style={{
                              fontSize: '1.3rem',
                              fontWeight: '700',
                              color: 'var(--color-accent-neon)'
                            }}
                          >
                            {value}
                          </div>
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: 'rgba(255,255,255,0.75)',
                              lineHeight: 1.3
                            }}
                          >
                            {label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
};


  // =========================================
  // UI PRINCIPAL
  // =========================================
  return (
    <div
      className="view-container"
      style={{ padding: '1.5rem', height: 'calc(100vh - 60px)', overflowY: 'auto' }}
    >
      <style>{customStyles}</style>

      {/* CABECERA */}
      <div
        className="view-header"
        style={{
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            className="icon-button"
            onClick={() => navigate('/partes')}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              padding: '10px'
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: '1.6rem',
                fontWeight: '700',
                color: 'white'
              }}
            >
              Parte #{currentReport.order?.order_number || id.slice(-6).toUpperCase()}
            </h1>
            <div
              style={{
                display: 'flex',
                gap: '12px',
                marginTop: '8px',
                flexWrap: 'wrap',
                alignItems: 'center'
              }}
            >
              <span
                style={{
                  display: 'flex',
                  gap: '5px',
                  alignItems: 'center',
                  fontSize: '0.9rem',
                  color: 'rgba(255,255,255,0.7)',
                  background: 'rgba(255,255,255,0.05)',
                  padding: '4px 10px',
                  borderRadius: '6px'
                }}
              >
                <Calendar size={14} />
                {currentReport.order?.service_date
                  ? format(new Date(currentReport.order.service_date), 'dd MMM yyyy', {
                      locale: es
                    })
                  : format(new Date(), 'dd MMM yyyy', { locale: es })}
              </span>
              {getShiftBadge(shift)}
              <span
                style={{
                  display: 'flex',
                  gap: '5px',
                  alignItems: 'center',
                  fontSize: '0.9rem',
                  color: 'rgba(255,255,255,0.7)',
                  background: 'rgba(255,255,255,0.05)',
                  padding: '4px 10px',
                  borderRadius: '6px'
                }}
              >
                <User size={14} /> {currentReport.assigned_agents?.length || 0} Agentes
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '0.5rem'
          }}
        >
          {getStatusBadge(currentReport.status)}
          {currentReport.returnReason && (
            <div
              style={{
                marginTop: '0.5rem',
                maxWidth: '260px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '8px',
                padding: '0.5rem 0.75rem',
                fontSize: '0.8rem',
                color: '#fecaca',
                display: 'flex',
                gap: '6px',
                alignItems: 'flex-start'
              }}
            >
              <AlertCircle size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
              <span>
                <strong>Motivo devolución:</strong> {currentReport.returnReason}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* TABS */}
      <div
        className="card"
        style={{
          background: 'var(--glass-dark-bg)',
          border: '1px solid var(--glass-dark-border)',
          minHeight: '50vh'
        }}
      >
        <div
          className="registro-view__tabs"
          style={{
            padding: '0 1rem',
            borderBottom: '1px solid rgba(255,255,255,0.05)'
          }}
        >
          <button
            className={`registro-view__tab ${activeTab === 'bitacora' ? 'active' : ''}`}
            onClick={() => setActiveTab('bitacora')}
          >
            <List size={16} /> Bitácora
            {getEntriesCount() > 0 && <span className="tab-badge">{getEntriesCount()}</span>}
          </button>
          <button
            className={`registro-view__tab ${activeTab === 'tareas' ? 'active' : ''}`}
            onClick={() => setActiveTab('tareas')}
          >
            <CheckSquare size={16} /> Tareas
            {taskProgress.total > 0 && (
              <span
                className="tab-badge"
                style={{
                  background: taskProgress.percent === 100 ? '#34d399' : 'var(--color-accent-neon)'
                }}
              >
                {taskProgress.completed}/{taskProgress.total}
              </span>
            )}
          </button>
          <button
            className={`registro-view__tab ${activeTab === 'requerimientos' ? 'active' : ''}`}
            onClick={() => setActiveTab('requerimientos')}
          >
            <Phone size={16} /> Requerimientos
            {reqStats.total > 0 && (
              <span
                className="tab-badge"
                style={{
                  background: reqStats.resolved === reqStats.total ? '#34d399' : '#fbbf24'
                }}
              >
                {reqStats.resolved}/{reqStats.total}
              </span>
            )}
          </button>
          <button
            className={`registro-view__tab ${activeTab === 'actuaciones' ? 'active' : ''}`}
            onClick={() => setActiveTab('actuaciones')}
          >
            <Hash size={16} /> Actuaciones
            {summaryTotal > 0 && <span className="tab-badge">{summaryTotal}</span>}
          </button>
          <button
            className={`registro-view__tab ${activeTab === 'resumen' ? 'active' : ''}`}
            onClick={() => setActiveTab('resumen')}
          >
            <Clipboard size={16} /> Resumen
          </button>
        </div>

        {/* CONTENIDO TAB ACTIVO */}
        <div className="card-body" style={{ padding: '1.5rem' }}>
          {activeTab === 'bitacora' && renderBitacora()}
          {activeTab === 'tareas' && renderTareas()}
          {activeTab === 'requerimientos' && renderRequerimientos()}
          {activeTab === 'actuaciones' && renderActuaciones()}
          
          {/* 💡 CONTENIDO DE LA PESTAÑA RESUMEN CRONOLÓGICO */}
          {activeTab === 'resumen' && (
              <div>
                <div style={{ marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, color: 'white', fontSize: '1.1rem' }}>
                    Resumen cronológico del Parte
                  </h3>
                  <p
                    style={{
                      margin: '4px 0 0 0',
                      fontSize: '0.85rem',
                      color: 'rgba(255,255,255,0.6)'
                    }}
                  >
                    Línea temporal unificada con novedades, requerimientos, estado final de tareas y cierre
                    estadístico del turno.
                  </p>
                </div>
                {renderResumenConsolidado()}
              </div>
            )}
          </div>
      </div>

      {/* COLUMNA DERECHA: INFO Y ACCIONES */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}
      >
          {/* Tarjeta de estado y acciones */}
          <div
            style={{
              background: 'var(--glass-dark-bg)',
              borderRadius: '14px',
              padding: '1rem',
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}
          >
            <h3
              style={{
                margin: '0 0 0.75rem 0',
                color: 'white',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <CheckCircle size={16} />
              Estado y acciones
            </h3>

            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
              <p style={{ margin: 0 }}>
                Completa la bitácora, requerimientos y actuaciones estadísticas antes de finalizar el
                parte de servicio.
              </p>
            </div>

            {/* Botones de acción */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {isEditable && (
                <button
                  className="button button-primary"
                  onClick={handleSubmitForReview}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '0.9rem'
                  }}
                >
                  <Send size={16} />
                  Finalizar parte y enviar a revisión
                </button>
              )}

              {isAdmin && currentReport.status === 'pending_review' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button
                    className="button button-success"
                    onClick={handleValidate}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      fontSize: '0.9rem'
                    }}
                  >
                    <CheckCircle size={16} />
                    Validar parte de servicio
                  </button>
                  <button
                    className="button button-secondary"
                    onClick={handleReturn}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      fontSize: '0.9rem'
                    }}
                  >
                    <XCircle size={16} />
                    Devolver para corrección
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

      {/* MODALES */}
      {isEntryModalOpen && (
        <ReportEntryModal
          isOpen={isEntryModalOpen}
          onClose={() => setIsEntryModalOpen(false)}
          reportId={currentReport.id}
        />
      )}

      {isSummaryModalOpen && (
        <ReportSummaryModal
          isOpen={isSummaryModalOpen}
          onClose={() => setIsSummaryModalOpen(false)}
          reportId={currentReport.id}
          initialSummary={currentReport.summary || {}}
        />
      )}

      {isReqModalOpen && (
        <AddRequerimientoModal
          isOpen={isReqModalOpen}
          onClose={() => setIsReqModalOpen(false)}
          reportId={currentReport.id}
        />
      )}

      {/* Modal simple de resolución de requerimiento */}
      {resolvingReq && (
        <div className="modal-overlay active" style={{zIndex: 1080}}>
          <div className="modal-content" style={{maxWidth: '400px'}}>
            <div className="modal-header">
              <h3 style={{margin: 0, display: 'flex', alignItems: 'center', gap: '10px'}}>
                <CheckCircle size={20} color="#34d399"/> Resolver Requerimiento
              </h3>
            </div>
            <div className="modal-body" style={{padding: '1.5rem'}}>
              <div className="form-group">
                <label className="form-label">Comentario de resolución (opcional)</label>
                <textarea
                  className="input w-100"
                  rows="3"
                  placeholder="Describe cómo se resolvió el requerimiento..."
                  value={resolutionComment}
                  onChange={(e) => setResolutionComment(e.target.value)}
                  autoFocus
                />
              </div>
              <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '1rem'}}>
                <button 
                  className="button button-secondary" 
                  onClick={() => { setResolvingReq(null); setResolutionComment(''); }}
                >
                  Cancelar
                </button>
                <button 
                  className="button button-success" 
                  onClick={confirmResolveReq}
                >
                  <CheckCircle size={16}/> Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Icono auxiliar local
function InfoIcon(props) {
  return <AlertCircle {...props} />;
}