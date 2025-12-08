// Archivo: /src/pages/RegistroPage.jsx
// VERSIÓN MEJORADA: Con filtro de tipo de documento y UI moderna

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { 
  getRegistros, 
  markRegistroAsDeleted, 
  generateRegistroPdf,
  updateRegistro
} from "../../js/dataController";

import { displayMessage, showLoading, hideLoading } from '../../js/ui/viewManager.js';
import { 
  ChevronLeft, ChevronRight, Archive, Inbox, Send, 
  Filter, Search, Eye, Download, Edit2, Trash2, 
  CheckCircle, AlertTriangle, Clock, FileText, 
  RefreshCw, X, ChevronDown
} from 'react-feather';
import ResolucionEntradaModal from '../components/Modals/ResolucionEntradaModal';

// 💡 1. IMPORTAR NUEVO MODAL
import RegistroModal from '../components/Modals/RegistroModal';

import '../../css/views/_registro-view.css';

const PAGINATION_LIMIT = 15;

// Tipos de documento disponibles
const DOCUMENT_TYPES = [
  { value: '', label: 'Todos los tipos', prefix: '' },
  { value: 'atestado', label: 'Atestado', prefix: 'ATE' },
  { value: 'informe', label: 'Informe', prefix: 'INF' },
  { value: 'denuncia', label: 'Denuncia', prefix: 'DEN' },
  { value: 'notificacion', label: 'Notificación', prefix: 'NOT' },
  { value: 'acta', label: 'Acta', prefix: 'ACT' },
  { value: 'oficio', label: 'Oficio', prefix: 'OFI' },
  { value: 'solicitud', label: 'Solicitud', prefix: 'SOL' },
  { value: 'otros', label: 'Otros', prefix: 'OTR' }
];

function RegistroPage() {
  const [currentSubview, setCurrentSubview] = useState('entrada');
  const [currentSalidaFilter, setCurrentSalidaFilter] = useState('completado');
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtro
  const [documentTypeFilter, setDocumentTypeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Estados Modales de Resolución
  const [isResolucionOpen, setIsResolucionOpen] = useState(false);
  const [registroToResolve, setRegistroToResolve] = useState(null);

  // 💡 2. NUEVO ESTADO: Modal de creación de Entrada
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);

  // Estado de paginación
  const [pagination, setPagination] = useState({
    entrada: { currentPage: 1, lastVisible: null, pageHistory: [null], hasNextPage: true },
    salida: { currentPage: 1, lastVisible: null, pageHistory: [null], hasNextPage: true }
  });

  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  // --- FUNCIÓN DE CARGA ---
  const fetchRegistros = useCallback(async (view, status, page, cursor) => {
    setLoading(true);
    try {
      let statusFilter = [];
      if (view === 'salida') statusFilter = status;
      else statusFilter = ['pendiente', 'revisado', 'recepcionado', 'finalizado', 'finalizado_rs'];

      const filters = {
        direction: view,
        status: statusFilter,
        limit: PAGINATION_LIMIT,
        startAfterDoc: cursor
      };

      if (documentTypeFilter) {
        filters.documentType = documentTypeFilter;
      }

      const { registros: nuevosRegistros, lastVisible } = await getRegistros(filters);

      if (nuevosRegistros.length === 0 && page > 1) {
        setPagination(prev => {
          const newState = { ...prev };
          newState[view].hasNextPage = false;
          return newState;
        });
        displayMessage("No hay más registros.", "info");
        return;
      }

      setRegistros(nuevosRegistros);
      const isPageFull = nuevosRegistros.length === PAGINATION_LIMIT;

      setPagination(prev => {
        const newState = { ...prev };
        const subState = { ...newState[view] };
        
        subState.currentPage = page;
        subState.lastVisible = lastVisible;
        subState.hasNextPage = isPageFull;

        if (page === subState.pageHistory.length && isPageFull) {
          subState.pageHistory.push(lastVisible);
        }
        
        if (!isPageFull && subState.pageHistory.length > page) {
          subState.pageHistory = subState.pageHistory.slice(0, page);
        }
        
        newState[view] = subState;
        return newState;
      });

    } catch (error) {
      console.error("Error al cargar registros:", error);
      displayMessage('Error cargando registros.', 'error');
    } finally {
      setLoading(false);
    }
  }, [documentTypeFilter, currentSalidaFilter, PAGINATION_LIMIT, getRegistros]);

  // Efecto de carga inicial
  useEffect(() => {
    setPagination(prev => ({
      ...prev,
      [currentSubview]: { currentPage: 1, lastVisible: null, pageHistory: [null], hasNextPage: true }
    }));
    fetchRegistros(currentSubview, currentSalidaFilter, 1, null);
  }, [currentSubview, currentSalidaFilter, documentTypeFilter, fetchRegistros]);

  // --- HANDLERS DE PAGINACIÓN ---
  const handleNextPage = () => {
    const current = pagination[currentSubview];
    if (current.hasNextPage && !loading) {
      const nextPage = current.currentPage + 1;
      const cursor = current.pageHistory[nextPage - 1] || current.lastVisible;
      fetchRegistros(currentSubview, currentSalidaFilter, nextPage, cursor);
    }
  };

  const handlePrevPage = () => {
    const current = pagination[currentSubview];
    if (current.currentPage > 1 && !loading) {
      const prevPage = current.currentPage - 1;
      const cursor = current.pageHistory[prevPage - 1];
      fetchRegistros(currentSubview, currentSalidaFilter, prevPage, cursor);
    }
  };

  const handlePageClick = (pageNumber) => {
    const current = pagination[currentSubview];
    if (pageNumber === current.currentPage || loading) return;
    
    if (pageNumber <= current.pageHistory.length) {
      const cursor = current.pageHistory[pageNumber - 1];
      fetchRegistros(currentSubview, currentSalidaFilter, pageNumber, cursor);
    }
  };

  // --- HANDLERS UI ---
  const handleTabClick = (subview) => {
    if (subview !== currentSubview) {
      setCurrentSubview(subview);
      if (subview === 'salida') setCurrentSalidaFilter('completado');
    }
  };

  const handleSubTabClick = (status) => {
    if (status !== currentSalidaFilter) {
      setCurrentSalidaFilter(status);
    }
  };

  // 💡 Nuevo Handler para cambio de tipo de documento
  const handleDocumentTypeChange = (type) => {
    setDocumentTypeFilter(type);
  };

  const handleRefresh = () => {
    // Resetear a la página 1 para recargar datos con los filtros actuales
    setPagination(prev => ({
      ...prev,
      [currentSubview]: { currentPage: 1, lastVisible: null, pageHistory: [null], hasNextPage: true }
    }));
    fetchRegistros(currentSubview, currentSalidaFilter, 1, null);
  };

  const clearFilters = () => {
    setDocumentTypeFilter('');
    setSearchTerm('');
  };

  const handleCreateSalida = () => navigate('/registros/crear');
  
  // 💡 3. CAMBIAR ESTE HANDLER: AHORA ABRE MODAL
  const handleCreateEntrada = () => {
    setIsEntryModalOpen(true);
  };

  const handleCompletarClick = (id) => navigate(`/registros/fusionar/${id}`);

  const handleOpenResolucion = (registro) => {
    setRegistroToResolve(registro);
    setIsResolucionOpen(true);
  };

  // 💡 4. HANDLER PARA CUANDO SE GUARDA UN REGISTRO
  const handleEntrySaved = () => {
    setIsEntryModalOpen(false); // Cierra el modal de creación

    // Resetear paginación y recargar la primera página de Entradas
    setPagination(prev => ({
        ...prev,
        entrada: { currentPage: 1, lastVisible: null, pageHistory: [null], hasNextPage: true }
    }));
    // Forzar la recarga
    fetchRegistros('entrada', currentSalidaFilter, 1, null);
    
    // Aseguramos que la vista esté en 'entrada' para ver el nuevo registro
    setCurrentSubview('entrada');
  };

  const handleSavedResolucion = () => {
    const current = pagination[currentSubview];
    const cursor = current.pageHistory[current.currentPage - 1];
    fetchRegistros(currentSubview, currentSalidaFilter, current.currentPage, cursor);
  };

  const handleFinalizarSinSalida = async (id) => {
    const comentario = prompt("Observación para finalizar:");
    if (comentario === null) return;
    showLoading('Finalizando...');
    try {
      await updateRegistro(id, {
        estado: 'finalizado',
        comentario: comentario || 'Finalizado sin documento de salida',
        fechaResolucion: new Date()
      });
      displayMessage('Registro finalizado.', 'success');
      handleRefresh();
    } catch (error) {
      displayMessage(`Error: ${error.message}`, 'error');
    } finally {
      hideLoading();
    }
  };

  const handleDeleteClick = async (id) => {
    const reason = prompt('Motivo de anulación:');
    if (reason) {
      showLoading('Anulando...');
      try {
        await markRegistroAsDeleted(id, reason);
        displayMessage('Registro anulado.', 'success');
        handleRefresh();
      } catch (error) {
        displayMessage(`Error: ${error.message}`, 'error');
      } finally {
        hideLoading();
      }
    }
  };

  const handleGeneratePdfClick = async (id) => {
    showLoading('Generando PDF...');
    try {
      const result = await generateRegistroPdf({ recordId: id });
      if (result.success && result.pdfUrl) {
        window.open(result.pdfUrl, '_blank');
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      displayMessage(`Error: ${error.message}`, 'error');
    } finally {
      hideLoading();
    }
  };

  // Filtrar registros localmente por búsqueda
  const filteredRegistros = searchTerm
    ? registros.filter(reg => 
        (reg.registrationNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (reg.subject || reg.asunto || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (reg.interesado || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    : registros;

  // --- ESTILOS DE PESTAÑAS (CSS-in-JS) ---
  const tabButtonStyles = (isActive, type) => ({
    flex: 1,
    padding: '1rem 1.5rem',
    background: isActive 
      ? (type === 'entrada' 
          ? 'linear-gradient(180deg, rgba(52, 211, 153, 0.1) 0%, rgba(52, 211, 153, 0) 100%)' // Verde suave para entrada (#34d399)
          : 'linear-gradient(180deg, rgba(96, 165, 250, 0.1) 0%, rgba(96, 165, 250, 0) 100%)') // Azul suave para salida (#60a5fa)
      : 'transparent',
    border: 'none',
    borderBottom: isActive 
      ? (type === 'entrada' ? '3px solid #34d399' : '3px solid #60a5fa') 
      : '3px solid transparent',
    color: isActive ? 'white' : 'rgba(255,255,255,0.6)',
    fontWeight: isActive ? '700' : '500',
    fontSize: '1rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    transition: 'all 0.3s ease',
    outline: 'none', // Quitar borde de foco por defecto
    // Asegurar que el padding sea responsivo o consistente
    minHeight: '60px',
  });


  // --- RENDERIZADO DE CONTROLES DE PAGINACIÓN ---
  const renderPaginationControls = () => {
    const current = pagination[currentSubview];
    const totalKnownPages = current.pageHistory.length;

    return (
      <div style={{
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '1rem 1.5rem',
        borderTop: '1px solid var(--glass-dark-border)',
        background: 'rgba(0,0,0,0.1)'
      }}>
        <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
          Página <strong style={{ color: 'var(--color-accent-neon)' }}>{current.currentPage}</strong>
          {filteredRegistros.length > 0 && (
            <> • Mostrando <strong>{filteredRegistros.length}</strong> registros</>
          )}
        </span>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button
            className="button button-sm button-ghost"
            onClick={handlePrevPage}
            disabled={current.currentPage === 1 || loading}
            style={{ padding: '6px 10px' }}
          >
            <ChevronLeft size={16} />
          </button>

          {current.pageHistory.map((_, idx) => {
            const p = idx + 1;
            // Lógica de paginación básica (sin puntos suspensivos complejos)
            if (Math.abs(current.currentPage - p) > 2 && p !== 1 && p !== totalKnownPages) return null;

            return (
              <button
                key={p}
                className={`button button-sm ${current.currentPage === p ? 'btn-gradient-primary' : 'button-ghost'}`}
                onClick={() => handlePageClick(p)}
                disabled={loading}
                style={{
                  minWidth: '36px',
                  padding: '6px',
                  fontWeight: current.currentPage === p ? 'bold' : 'normal'
                }}
              >
                {p}
              </button>
            );
          })}

          <button
            className="button button-sm button-ghost"
            onClick={handleNextPage}
            disabled={!current.hasNextPage || loading}
            style={{ padding: '6px 10px' }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  const getQuickStats = () => {
    const completados = registros.filter(r => r.estado === 'completado' || r.status === 'completado').length;
    const pendientes = registros.filter(r => r.estado === 'pendiente' || r.status === 'pendiente').length;
    return { completados, pendientes, total: registros.length };
  };

  const stats = getQuickStats();

  return (
    <div className="view-container" style={{ padding: '1.5rem', height: 'calc(100vh - 60px)', overflowY: 'auto' }}>
      
      {/* ========== HEADER MEJORADO ========== */}
      <div className="view-header" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="view-title" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(0,255,136,0.2), rgba(0,180,100,0.1))',
              padding: '14px',
              borderRadius: '16px',
              border: '1px solid rgba(0,255,136,0.2)'
            }}>
              <Archive size={28} color="var(--color-accent-neon)" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '700', color: 'white' }}>
                Registro Electrónico
              </h1>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                Gestión de entradas y salidas documentales
              </p>
            </div>
          </div>

          {/* Botón de acción principal (Actualizado) */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="button button-secondary"
              onClick={handleRefresh}
              disabled={loading}
              style={{ padding: '10px 16px' }}
            >
              <RefreshCw size={16} className={loading ? 'spin' : ''} />
            </button>
            {currentSubview === 'entrada' ? (
              <button 
                className="button btn-gradient-primary ripple-effect" 
                onClick={handleCreateEntrada} // 💡 Clic ahora abre el modal
              >
                <Inbox size={18} style={{ marginRight: 8 }} />
                <span>Nueva Entrada</span>
              </button>
            ) : (
              <button className="button btn-gradient-primary ripple-effect" onClick={handleCreateSalida}>
                <Send size={18} style={{ marginRight: 8 }} />
                <span>Crear Salida</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========== CARD PRINCIPAL ========== */}
      <div className="card" style={{
        background: 'var(--glass-dark-bg)',
        border: '1px solid var(--glass-dark-border)',
        borderRadius: '16px',
        overflow: 'hidden'
      }}>
        
        {/* TABS PRINCIPALES - IMPLEMENTACIÓN ACTUALIZADA */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--glass-dark-border)',
          background: 'rgba(0,0,0,0.2)'
        }}>
          
          {/* Botón de Entrada */}
          <button
            onClick={() => handleTabClick('entrada')}
            style={tabButtonStyles(currentSubview === 'entrada', 'entrada')}
            onMouseEnter={(e) => {
                if (currentSubview !== 'entrada') e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
                if (currentSubview !== 'entrada') e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
            }}
          >
            <Inbox size={20} color={currentSubview === 'entrada' ? '#34d399' : 'currentColor'} />
            Registros de Entrada
            {/* Opcional: Badge con contador si lo tienes disponible */}
            {/* <span style={{background: '#34d399', color: '#064e3b', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '10px', marginLeft: '5px'}}>12</span> */}
          </button>

          {/* Botón de Salida */}
          <button
            onClick={() => handleTabClick('salida')}
            style={tabButtonStyles(currentSubview === 'salida', 'salida')}
            onMouseEnter={(e) => {
                if (currentSubview !== 'salida') e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
                if (currentSubview !== 'salida') e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
            }}
          >
            <Send size={20} color={currentSubview === 'salida' ? '#60a5fa' : 'currentColor'} /> 
            Registros de Salida
          </button>

        </div>
        {/* FIN TABS PRINCIPALES */}

        {/* BARRA DE FILTROS */}
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid var(--glass-dark-border)',
          background: 'rgba(0,0,0,0.1)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            {/* Sub-tabs para Salida o Filtros de estado para Entrada */}
            {currentSubview === 'salida' ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { key: 'completado', label: 'Completados', icon: CheckCircle, color: '#34d399' },
                  { key: 'borrador', label: 'Borradores', icon: Edit2, color: '#fbbf24' },
                  { key: 'fallido', label: 'Fallidos', icon: AlertTriangle, color: '#ef4444' }
                ].map(({ key, label, icon: Icon, color }) => (
                  <button
                    key={key}
                    onClick={() => handleSubTabClick(key)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '25px',
                      border: currentSalidaFilter === key ? 'none' : '1px solid rgba(255,255,255,0.15)',
                      background: currentSalidaFilter === key
                        ? `linear-gradient(135deg, ${color}30, ${color}10)`
                        : 'rgba(255,255,255,0.05)',
                      color: currentSalidaFilter === key ? color : 'rgba(255,255,255,0.6)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.85rem',
                      fontWeight: currentSalidaFilter === key ? '600' : '400',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                  Filtrar por estado:
                </span>
                <span style={{
                  background: 'rgba(52, 211, 153, 0.2)',
                  color: '#34d399',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: '600'
                }}>
                  Todos los estados
                </span>
              </div>
            )}

            {/* Controles de filtro derecho */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {/* 💡 Selector de tipo de documento */}
              <div style={{ position: 'relative' }}>
                <select
                  value={documentTypeFilter}
                  onChange={(e) => handleDocumentTypeChange(e.target.value)}
                  style={{
                    padding: '8px 35px 8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--glass-dark-border)',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'white',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    appearance: 'none',
                    minWidth: '180px'
                  }}
                >
                  {DOCUMENT_TYPES.map(type => (
                    <option key={type.value} value={type.value} style={{ background: '#1a1a2e' }}>
                      {type.label}
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

              {/* Búsqueda rápida */}
              <div style={{ position: 'relative' }}>
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'rgba(255,255,255,0.4)'
                  }}
                />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    padding: '8px 12px 8px 36px',
                    borderRadius: '8px',
                    border: '1px solid var(--glass-dark-border)',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'white',
                    fontSize: '0.85rem',
                    width: '200px'
                  }}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255,255,255,0.5)',
                      cursor: 'pointer',
                      padding: '2px'
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Botón limpiar filtros */}
              {(documentTypeFilter || searchTerm) && (
                <button
                  onClick={clearFilters}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <X size={14} /> Limpiar
                </button>
              )}
            </div>
          </div>

          {/* Indicador de filtro activo */}
          {documentTypeFilter && (
            <div style={{
              marginTop: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                Filtrado por:
              </span>
              <span style={{
                background: 'rgba(99, 102, 241, 0.2)',
                color: '#818cf8',
                padding: '4px 10px',
                borderRadius: '15px',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <FileText size={12} />
                {DOCUMENT_TYPES.find(t => t.value === documentTypeFilter)?.label || documentTypeFilter}
              </span>
            </div>
          )}
        </div>

        {/* TABLA DE REGISTROS */}
        <div className="table-container" style={{ overflowX: 'auto' }}>
          <RenderRegistrosTabla
            registros={filteredRegistros}
            isLoading={loading}
            subview={currentSubview}
            statusFilter={currentSubview === 'entrada' ? 'N/A' : currentSalidaFilter}
            onCompletar={handleCompletarClick}
            onDelete={handleDeleteClick}
            onGeneratePdf={handleGeneratePdfClick}
            onFinalizarSinSalida={handleFinalizarSinSalida}
            onResolver={handleOpenResolucion}
            navigate={navigate}
          />
        </div>

        {/* PAGINACIÓN */}
        {renderPaginationControls()}
      </div>

      {/* MODAL RESOLUCION (existente) */}
      <ResolucionEntradaModal
        isOpen={isResolucionOpen}
        onClose={() => setIsResolucionOpen(false)}
        registro={registroToResolve}
        onSaved={handleSavedResolucion}
        onLinkSalida={(id) => navigate('/registros/crear', { state: { parentId: id } })}
      />

      {/* 💡 5. RENDERIZAR EL NUEVO MODAL AQUÍ */}
      <RegistroModal 
        isOpen={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        onSaved={handleEntrySaved}
      />
    </div>
  );
}

// =========================================
// COMPONENTE: Tabla de Registros (MEJORADA)
// =========================================
function RenderRegistrosTabla({
  registros,
  isLoading,
  subview,
  statusFilter,
  onCompletar,
  onDelete,
  onGeneratePdf,
  onFinalizarSinSalida,
  onResolver,
  navigate
}) {
  useEffect(() => {
    if (window.feather) window.feather.replace();
  });

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem',
        gap: '1rem'
      }}>
        <div className="loading-spinner"></div>
        <span style={{ color: 'rgba(255,255,255,0.5)' }}>Cargando registros...</span>
      </div>
    );
  }

  if (registros.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem',
        gap: '1rem'
      }}>
        <FileText size={48} style={{ color: 'rgba(255,255,255,0.2)' }} />
        <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>No se encontraron registros</p>
      </div>
    );
  }

  const isEntrada = subview === 'entrada';

  const getStatusStyle = (status) => {
    const statusKey = (status || 'default').toLowerCase();
    const styles = {
      'completado': { bg: 'rgba(52, 211, 153, 0.15)', color: '#34d399', border: 'rgba(52, 211, 153, 0.3)' },
      'pendiente': { bg: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', border: 'rgba(251, 191, 36, 0.3)' },
      'borrador': { bg: 'rgba(156, 163, 175, 0.15)', color: '#9ca3af', border: 'rgba(156, 163, 175, 0.3)' },
      'fallido': { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' },
      'finalizado': { bg: 'rgba(52, 211, 153, 0.15)', color: '#34d399', border: 'rgba(52, 211, 153, 0.3)' },
      'finalizado_rs': { bg: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: 'rgba(99, 102, 241, 0.3)' },
      'revisado': { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' },
      'default': { bg: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', border: 'rgba(255,255,255,0.1)' }
    };
    return styles[statusKey] || styles['default'];
  };

  return (
    <table className="data-table" style={{ width: '100%' }}>
      <thead>
        <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
          <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nº Reg.</th>
          <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fecha</th>
          <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Asunto</th>
          <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Interesado</th>
          <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estado</th>
          {isEntrada && <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Comentario</th>}
          <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {registros.map((reg, idx) => {
          const createdAtDate = reg.createdAt?.seconds
            ? new Date(reg.createdAt.seconds * 1000)
            : (reg.createdAt ? new Date(reg.createdAt) : null);
          const statusKey = (reg.estado || reg.status || 'default').toLowerCase();
          const statusText = statusKey.replace(/_/g, ' ');
          const statusStyle = getStatusStyle(statusKey);

          return (
            <tr
              key={reg.id}
              style={{
                background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'}
            >
              <td style={{ padding: '1rem', fontFamily: 'monospace', fontWeight: '600', color: 'var(--color-accent-neon)' }}>
                {reg.registrationNumber || '---'}
              </td>
              <td style={{ padding: '1rem', color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
                {createdAtDate
                  ? createdAtDate.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
                  : '---'}
              </td>
              <td style={{ padding: '1rem', color: 'white', maxWidth: '250px' }}>
                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {reg.subject || reg.asunto || '---'}
                </div>
              </td>
              <td style={{ padding: '1rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
                {reg.interesado || '---'}
              </td>
              <td style={{ padding: '1rem', textAlign: 'center' }}>
                <span style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  background: statusStyle.bg,
                  color: statusStyle.color,
                  border: `1px solid ${statusStyle.border}`
                }}>
                  {statusText}
                </span>
              </td>
              {isEntrada && (
                <td style={{ padding: '1rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', maxWidth: '150px' }}>
                  {reg.estado === 'finalizado_rs' && reg.linkedSalidaNumber ? (
                    <span style={{ color: '#818cf8', cursor: 'pointer' }}>
                      {reg.linkedSalidaNumber}
                    </span>
                  ) : (
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                      {reg.comentario || '-'}
                    </span>
                  )}
                </td>
              )}
              <td style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                  {isEntrada ? (
                    <>
                      {reg.pdfUrl && (
                        <button
                          className="icon-button"
                          onClick={() => window.open(reg.pdfUrl, '_blank')}
                          title="Ver PDF"
                          style={{ padding: '6px', borderRadius: '6px' }}
                        >
                          <Eye size={16} />
                        </button>
                      )}
                      <button
                        className="icon-button"
                        onClick={() => onGeneratePdf(reg.id)}
                        title="Descargar PDF"
                        style={{ padding: '6px', borderRadius: '6px' }}
                      >
                        <Download size={16} />
                      </button>
                      <button
                        className="icon-button"
                        onClick={() => onResolver(reg)}
                        title="Editar/Resolver"
                        style={{ padding: '6px', borderRadius: '6px' }}
                      >
                        <Edit2 size={16} />
                      </button>
                      {(reg.estado === 'pendiente' || reg.estado === 'revisado') && (
                        <>
                          <button
                            className="icon-button"
                            onClick={() => navigate('/registros/crear', { state: { parentId: reg.id } })}
                            title="Crear Salida vinculada"
                            style={{ padding: '6px', borderRadius: '6px', color: '#60a5fa' }}
                          >
                            <Send size={16} />
                          </button>
                          <button
                            className="icon-button"
                            onClick={() => onFinalizarSinSalida(reg.id)}
                            title="Finalizar sin salida"
                            style={{ padding: '6px', borderRadius: '6px', color: '#34d399' }}
                          >
                            <CheckCircle size={16} />
                          </button>
                        </>
                      )}
                      <button
                        className="icon-button button-danger"
                        onClick={() => onDelete(reg.id)}
                        title="Eliminar"
                        style={{ padding: '6px', borderRadius: '6px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      {statusFilter === 'borrador' && (
                        <button
                          className="button button-primary button-sm"
                          onClick={() => onCompletar(reg.id)}
                        >
                          <Edit2 size={14} style={{ marginRight: 4 }} /> Completar
                        </button>
                      )}
                      {statusFilter === 'completado' && (
                        <>
                          {reg.pdfUrl && (
                            <button
                              className="icon-button"
                              onClick={() => window.open(reg.pdfUrl, '_blank')}
                              title="Ver PDF"
                              style={{ padding: '6px', borderRadius: '6px' }}
                            >
                              <Eye size={16} />
                            </button>
                          )}
                          <button
                            className="icon-button"
                            onClick={() => onGeneratePdf(reg.id)}
                            title="Descargar PDF"
                            style={{ padding: '6px', borderRadius: '6px' }}
                          >
                            <Download size={16} />
                          </button>
                          <button
                            className="icon-button"
                            onClick={() => navigate(`/registros/editar/${reg.id}`)}
                            title="Editar"
                            style={{ padding: '6px', borderRadius: '6px' }}
                          >
                            <Edit2 size={16} />
                          </button>
                        </>
                      )}
                      {statusFilter === 'fallido' && (
                        <button
                          className="button button-danger button-sm"
                          onClick={() => onCompletar(reg.id)}
                        >
                          <RefreshCw size={14} style={{ marginRight: 4 }} /> Reintentar
                        </button>
                      )}
                      <button
                        className="icon-button button-danger"
                        onClick={() => onDelete(reg.id)}
                        title="Eliminar"
                        style={{ padding: '6px', borderRadius: '6px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default RegistroPage;