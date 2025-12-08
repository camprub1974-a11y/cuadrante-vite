// Archivo: /src/pages/ServiceReportsPage.jsx
// ✨ VERSIÓN FINAL: Texto a la Izquierda + Botones Neón + Paginación Cursor-Based + Botón PDF

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReportStore } from '../store/reportStore';
import { useAuthStore } from '../store/authStore';
import { useGlobalStore } from '../store/globalStore';
import {
  FileText, Filter, Search, Eye, Edit, Calendar, ChevronDown,
  PlayCircle, AlertCircle, Clock, Shield, CheckCircle, RotateCcw,
  Sun, Moon, Sunset, XCircle, User, ChevronLeft, ChevronRight,
  Printer
} from 'react-feather';
import { format } from 'date-fns';

// Imports de controladores y UI
import {
  getActiveServiceOrdersForAgent,
  startServiceOrder,
  getReportsWithCursor,
  generateServiceReportPdf
} from '../../js/dataController';
import { displayMessage, showLoading, hideLoading } from '../../js/ui/viewManager';

// =========================================
// CONSTANTES Y CONFIGURACIÓN
// =========================================
const PAGINATION_LIMIT = 15;

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const shiftConfig = {
  M: { bg: 'rgba(52, 211, 153, 0.2)', text: '#34d399', label: 'Mañana', icon: Sun },
  T: { bg: 'rgba(96, 165, 250, 0.2)', text: '#60a5fa', label: 'Tarde', icon: Sunset },
  N: { bg: 'rgba(167, 139, 250, 0.2)', text: '#a78bfa', label: 'Noche', icon: Moon }
};

const statusConfig = {
  open: { bg: '#3b82f6', label: 'Abierto', icon: Clock },
  pending_review: { bg: '#fbbf24', label: 'Revisión', icon: AlertCircle },
  validated: { bg: '#34d399', label: 'Validado', icon: CheckCircle },
  returned: { bg: '#ef4444', label: 'Devuelto', icon: RotateCcw },
  closed: { bg: '#9ca3af', label: 'Cerrado', icon: XCircle }
};

// 🎨 ESTILOS DE CONTROL (Consistente con Registro)
const controlStyle = {
  height: '42px',
  width: '100%',
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.05)',
  color: 'white',
  fontSize: '0.9rem',
  outline: 'none',
  appearance: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center'
};

// 💅 ESTILOS CSS REVISADOS (Texto izq + botones neón agrupados dcha)
const styles = `
  .reports-table tbody tr {
    transition: all 0.2s ease;
    cursor: pointer;
  }
  .reports-table tbody tr:hover {
    background: rgba(0, 255, 136, 0.05) !important;
    transform: translateX(4px);
  }
  .reports-table tbody tr:hover td:first-child {
    border-left: 3px solid var(--color-accent-neon);
  }

  /* --- PAGINACIÓN --- */
  .pagination-container {
    padding: 1rem 1.5rem;
    display: flex;
    justify-content: space-between; /* Texto a izq, grupo a der */
    align-items: center;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    background: transparent;
  }

  .pagination-info {
    font-size: 0.9rem;
    color: rgba(255,255,255,0.5);
    font-weight: 500;
  }

  .pagination-group {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(0, 0, 0, 0.2);
    padding: 6px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.05);
  }

  .pagination-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: white;
    padding: 8px 14px;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.2s;
    height: 36px;
  }
  .pagination-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
  }
  .pagination-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    border-color: transparent;
  }

  .page-number-btn {
    min-width: 36px;
    height: 36px;
    padding: 0 12px;
    display: flex;
    justify-content: center;
    align-items: center;
    background: linear-gradient(135deg, #00ff88 0%, #00cc6a 100%);
    color: #064e3b;
    border-radius: 8px;
    border: none;
    font-weight: 800;
    font-size: 1rem;
    box-shadow: 0 0 15px rgba(0, 255, 136, 0.4);
    cursor: default;
    user-select: none;
  }

  /* Grid de Filtros */
  .filters-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
    align-items: end;
    width: 100%;
  }

  .filter-label {
    display: block;
    color: rgba(255,255,255,0.5);
    font-size: 0.8rem;
    margin-bottom: 6px;
    font-weight: 500;
  }

  .filters-grid select option {
    background: #1a1a2e;
    color: #ffffff !important;
  }
  .filters-grid select:focus {
    border: 1px solid var(--color-accent-neon) !important;
    box-shadow: 0 0 0 2px rgba(0, 255, 136, 0.3) !important;
  }
`;

export default function ServiceReportsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { agents } = useGlobalStore();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const { filters, setFilter } = useReportStore();

  // Estado Paginación
  const [pagination, setPagination] = useState({
    currentPage: 1,
    lastVisible: null,
    pageHistory: [null],
    hasNextPage: true
  });

  const [activeOrder, setActiveOrder] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const isAdmin = user?.role === 'admin' || user?.role === 'supervisor';

  // --- FETCH DATA ---
  const fetchReportsWithCursor = useCallback(
    async (page, cursor) => {
      if (!user) return;

      setLoading(true);
      try {
        const { data: newData, lastVisible } = await getReportsWithCursor({
          filters,
          limit: PAGINATION_LIMIT,
          startAfterDoc: cursor,
          user
        });

        setReports(newData);

        setPagination((prev) => {
          const newState = { ...prev };
          newState.currentPage = page;
          newState.lastVisible = lastVisible;
          const isPageFull = newData.length === PAGINATION_LIMIT;
          newState.hasNextPage = isPageFull;

          if (page === prev.pageHistory.length && lastVisible && isPageFull) {
            newState.pageHistory.push(lastVisible);
          }
          if (page < prev.pageHistory.length) {
            newState.hasNextPage = true;
          } else if (page === prev.pageHistory.length) {
            newState.hasNextPage = isPageFull;
          }
          return newState;
        });
      } catch (error) {
        console.error('Error al cargar reportes:', error);
        displayMessage('Error cargando reportes.', 'error');
        setReports([]);
      } finally {
        setLoading(false);
      }
    },
    [filters, user]
  );

  // MANEJADOR DE IMPRESIÓN (PDF)
  const handlePrintReport = async (e, reportId) => {
    e.stopPropagation();
    if (!window.confirm('¿Generar PDF con el resumen de este parte?')) return;

    showLoading('Generando PDF...');
    try {
      const result = await generateServiceReportPdf(reportId);

      if (result.success && result.pdfBase64) {
        const byteCharacters = atob(result.pdfBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } else {
        displayMessage('Error al generar el PDF.', 'error');
      }
    } catch (error) {
      console.error(error);
      displayMessage('Error de conexión al generar PDF.', 'error');
    } finally {
      hideLoading();
    }
  };

  // --- HANDLERS PAGINACIÓN ---
  const handleNextPage = () => {
    const nextPage = pagination.currentPage + 1;
    const cursorToUse = pagination.lastVisible;
    const storedCursor = pagination.pageHistory[nextPage - 1];

    if (storedCursor !== undefined || pagination.hasNextPage) {
      fetchReportsWithCursor(nextPage, storedCursor || cursorToUse);
    }
  };

  const handlePrevPage = () => {
    const prevPage = pagination.currentPage - 1;
    if (prevPage >= 1) {
      const prevCursor = pagination.pageHistory[prevPage - 1];
      fetchReportsWithCursor(prevPage, prevCursor);
    }
  };

  // --- EFECTOS ---
  useEffect(() => {
    const startDate = new Date(selectedYear, selectedMonth, 1);
    const endDate = new Date(selectedYear, selectedMonth + 1, 0);

    const newStartStr = format(startDate, 'yyyy-MM-dd');
    const newEndStr = format(endDate, 'yyyy-MM-dd');

    if (filters.startDate !== newStartStr || filters.endDate !== newEndStr) {
      setFilter('startDate', newStartStr);
      setFilter('endDate', newEndStr);
    }
  }, [selectedYear, selectedMonth, setFilter, filters.startDate, filters.endDate]);

  useEffect(() => {
    setPagination({
      currentPage: 1,
      lastVisible: null,
      pageHistory: [null],
      hasNextPage: true
    });

    fetchReportsWithCursor(1, null);

    if (!isAdmin && user?.agentId) {
      checkActiveOrders();
    }
  }, [filters, user, isAdmin, fetchReportsWithCursor]);

  // --- HELPERS ---
  const checkActiveOrders = async () => {
    try {
      const result = await getActiveServiceOrdersForAgent();
      const order =
        result.find((o) => o.status === 'in_progress') ||
        result.find((o) => o.status === 'assigned');
      setActiveOrder(order || null);
    } catch (error) {
      console.error('Error buscando órdenes activas:', error);
    }
  };

  const handleStartService = async () => {
    if (!activeOrder) return;
    if (activeOrder.status === 'in_progress' && activeOrder.reportId) {
      navigate(`/partes/${activeOrder.reportId}`);
      return;
    }
    if (!window.confirm(`¿Iniciar servicio para la orden "${activeOrder.title}"?`)) return;

    showLoading('Iniciando turno...');
    try {
      const result = await startServiceOrder(activeOrder.id);
      displayMessage('¡Servicio iniciado!', 'success');
      navigate(`/partes/${result.reportId}`);
    } catch (error) {
      displayMessage(`Error: ${error.message}`, 'error');
    } finally {
      hideLoading();
    }
  };

  const getShiftBadge = (shift) => {
    const normalizedShift = shift ? String(shift).toUpperCase() : 'M';
    const shiftCode =
      normalizedShift === 'MAÑANA'
        ? 'M'
        : normalizedShift === 'TARDE'
        ? 'T'
        : normalizedShift === 'NOCHE'
        ? 'N'
        : normalizedShift;
    const config = shiftConfig[shiftCode] || shiftConfig.M;
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
          fontSize: '0.8rem',
          fontWeight: '600',
          border: `1px solid ${config.text}40`
        }}
      >
        <IconComponent size={14} /> {config.label}
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
          gap: '5px',
          backgroundColor: `${config.bg}20`,
          color: config.bg,
          border: `1px solid ${config.bg}40`,
          fontSize: '0.75rem',
          padding: '4px 10px',
          borderRadius: '20px',
          fontWeight: '600',
          textTransform: 'uppercase'
        }}
      >
        <IconComponent size={12} /> {config.label}
      </span>
    );
  };

  return (
    <div
      className="view-container"
      style={{ padding: '1.5rem', height: 'calc(100vh - 60px)', overflowY: 'auto' }}
    >
      <style>{styles}</style>

      {/* HEADER */}
      <div
        className="view-header"
        style={{
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div
          className="view-title"
          style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}
        >
          <div
            style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '10px',
              borderRadius: '12px'
            }}
          >
            <FileText
              size={28}
              className="text-accent"
              style={{ color: 'var(--color-accent-neon)' }}
            />
          </div>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: '1.8rem',
                fontWeight: '700',
                color: 'white'
              }}
            >
              Partes de Servicio
            </h1>
            <p
              style={{
                margin: 0,
                color: 'rgba(255,255,255,0.5)',
                fontSize: '0.9rem'
              }}
            >
              Registro de actividad diaria y novedades
            </p>
          </div>
        </div>
      </div>

      {/* TARJETA AGENTE */}
      {activeOrder && !isAdmin && (
        <div
          className="card"
          style={{
            marginBottom: '2rem',
            background:
              'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(37, 99, 235, 0.05))',
            border: '1px solid rgba(59, 130, 246, 0.3)'
          }}
        >
          <div
            className="card-body"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '5px'
                }}
              >
                <span
                  style={{
                    background:
                      activeOrder.status === 'in_progress' ? '#3b82f6' : '#fbbf24',
                    color: 'black',
                    fontWeight: 'bold',
                    fontSize: '0.7rem',
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}
                >
                  {activeOrder.status === 'in_progress' ? 'EN CURSO' : 'ASIGNADO HOY'}
                </span>
                <h3
                  style={{
                    margin: 0,
                    color: 'white',
                    fontSize: '1.2rem'
                  }}
                >
                  {activeOrder.title}
                </h3>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '15px',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '0.9rem'
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Shield size={14} /> Turno {activeOrder.service_shift}
                </span>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Clock size={14} />{' '}
                  {format(new Date(activeOrder.service_date), 'dd/MM/yyyy')}
                </span>
              </div>
            </div>
            <button
              className="button btn-gradient-success ripple-effect"
              onClick={handleStartService}
              style={{ padding: '10px 20px', fontSize: '1rem' }}
            >
              {activeOrder.status === 'in_progress' ? (
                <>
                  <FileText size={18} style={{ marginRight: 8 }} /> Ir al Parte
                </>
              ) : (
                <>
                  <PlayCircle size={18} style={{ marginRight: 8 }} /> Iniciar Servicio
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* TARJETA DE FILTROS */}
      <div
        className="card"
        style={{
          marginBottom: '1.5rem',
          background: 'var(--glass-dark-bg)',
          border: '1px solid var(--glass-dark-border)'
        }}
      >
        <div className="card-body">
          <div className="filters-grid">
            {/* 1. Mes */}
            <div>
              <span className="filter-label">
                <Calendar size={12} /> Mes
              </span>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  style={{ ...controlStyle, padding: '8px 35px 8px 12px' }}
                >
                  {MESES.map((mes, index) => (
                    <option key={index} value={index}>
                      {mes}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: 'rgba(255,255,255,0.5)'
                  }}
                />
              </div>
            </div>

            {/* 2. Año */}
            <div>
              <span className="filter-label">
                <Calendar size={12} /> Año
              </span>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  style={{ ...controlStyle, padding: '8px 35px 8px 12px' }}
                >
                  {[...Array(5)].map((_, i) => {
                    const year = new Date().getFullYear() - 2 + i;
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    );
                  })}
                </select>
                <ChevronDown
                  size={16}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: 'rgba(255,255,255,0.5)'
                  }}
                />
              </div>
            </div>

            {/* 3. Agente (solo admin) */}
            {isAdmin && (
              <div>
                <span className="filter-label">
                  <User size={12} /> Agente
                </span>
                <div style={{ position: 'relative' }}>
                  <select
                    value={filters.agentId}
                    onChange={(e) => setFilter('agentId', e.target.value)}
                    style={{ ...controlStyle, padding: '8px 35px 8px 12px' }}
                  >
                    <option value="all" style={{ color: 'black' }}>
                      Todos los Agentes
                    </option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id} style={{ color: 'black' }}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      color: 'rgba(255,255,255,0.5)'
                    }}
                  />
                </div>
              </div>
            )}

            {/* 4. Estado (solo admin) */}
            {isAdmin && (
              <div>
                <span className="filter-label">
                  <Filter size={12} /> Estado
                </span>
                <div style={{ position: 'relative' }}>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilter('status', e.target.value)}
                    style={{ ...controlStyle, padding: '8px 35px 8px 12px' }}
                  >
                    <option value="all" style={{ color: 'black' }}>
                      Todos los Estados
                    </option>
                    <option value="open" style={{ color: 'black' }}>
                      Abiertos
                    </option>
                    <option value="pending_review" style={{ color: 'black' }}>
                      Pendiente Revisión
                    </option>
                    <option value="validated" style={{ color: 'black' }}>
                      Validados
                    </option>
                    <option value="returned" style={{ color: 'black' }}>
                      Devueltos
                    </option>
                  </select>
                  <ChevronDown
                    size={16}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      color: 'rgba(255,255,255,0.5)'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Botón Buscar */}
            <div>
              <button
                className="button button-secondary"
                onClick={() => fetchReportsWithCursor(1, null)}
                style={{
                  height: '42px',
                  width: '100%',
                  justifyContent: 'center'
                }}
              >
                <Search size={16} />{' '}
                <span style={{ marginLeft: '6px' }}>Buscar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TABLA LISTADO */}
      <div
        className="card"
        style={{
          background: 'var(--glass-dark-bg)',
          border: '1px solid var(--glass-dark-border)'
        }}
      >
        <div className="table-container">
          {loading ? (
            <div
              className="loading-spinner-container"
              style={{ padding: '3rem' }}
            >
              <div className="loading-spinner"></div>
            </div>
          ) : reports.length === 0 ? (
            <div
              className="empty-state"
              style={{ padding: '3rem', textAlign: 'center', opacity: 0.6 }}
            >
              <FileText
                size={48}
                style={{ marginBottom: '1rem', opacity: 0.5 }}
              />
              <p>No se encontraron partes para la selección actual.</p>
            </div>
          ) : (
            <table className="data-table reports-table">
              <thead>
                <tr>
                  <th style={{ width: '120px' }}>Fecha</th>
                  <th style={{ width: '130px' }}>Turno</th>
                  <th style={{ width: '140px' }}>Estado</th>
                  <th>Agentes</th>
                  <th style={{ textAlign: 'right', width: '160px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => {
                  const dateObj =
                    report.service_date_timestamp?.toDate?.() ||
                    new Date(
                      report.service_date_timestamp || report.createdAt
                    );
                  const shift = report.service_shift || report.shift;

                  return (
                    <tr
                      key={report.id}
                      onClick={() => navigate(`/partes/${report.id}`)}
                      style={{
                        borderLeft: '3px solid transparent',
                        cursor: 'pointer'
                      }}
                    >
                      <td
                        style={{
                          fontWeight: 'bold',
                          color: 'white'
                        }}
                      >
                        {format(dateObj, 'dd/MM/yyyy')}
                      </td>
                      <td>{getShiftBadge(shift)}</td>
                      <td>{getStatusBadge(report.status)}</td>
                      <td>
                        <div
                          style={{
                            display: 'flex',
                            gap: '6px',
                            flexWrap: 'wrap'
                          }}
                        >
                          {(report.assigned_agents || report.assignedAgentIds)?.map(
                            (id) => (
                              <span
                                key={id}
                                className="agent-badge"
                                style={{
                                  width: 'auto',
                                  padding: '3px 10px',
                                  fontSize: '0.8rem',
                                  background: 'rgba(99, 102, 241, 0.2)',
                                  color: '#818cf8',
                                  border:
                                    '1px solid rgba(99, 102, 241, 0.3)',
                                  borderRadius: '6px',
                                  fontWeight: '600'
                                }}
                              >
                                {id}
                              </span>
                            )
                          )}
                        </div>
                      </td>
                      <td
                        style={{ textAlign: 'right' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '5px'
                          }}
                        >
                          {/* Botón imprimir PDF */}
                          <button
                            className="button button-sm button-secondary"
                            onClick={(e) => handlePrintReport(e, report.id)}
                            title="Imprimir Resumen"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Printer size={14} />
                          </button>

                          {/* Botón Ver/Revisar */}
                          <button
                            className="button button-sm button-primary"
                            onClick={() => navigate(`/partes/${report.id}`)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              background:
                                isAdmin &&
                                report.status === 'pending_review'
                                  ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                                  : undefined
                            }}
                          >
                            {isAdmin && report.status === 'pending_review' ? (
                              <>
                                <Edit size={14} /> Revisar
                              </>
                            ) : (
                              <>
                                <Eye size={14} /> Ver
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* PAGINACIÓN */}
        {reports.length > 0 && (
          <div className="pagination-container">
            <span className="pagination-info">
              Página {pagination.currentPage} - Mostrando {reports.length} registros
            </span>

            <div className="pagination-group">
              <button
                className="pagination-btn"
                onClick={handlePrevPage}
                disabled={pagination.currentPage === 1 || loading}
              >
                <ChevronLeft size={16} /> Anterior
              </button>

              <div className="page-number-btn">{pagination.currentPage}</div>

              <button
                className="pagination-btn"
                onClick={handleNextPage}
                disabled={!pagination.hasNextPage || loading}
              >
                Siguiente <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
