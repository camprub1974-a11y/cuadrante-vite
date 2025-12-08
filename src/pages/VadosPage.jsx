// Archivo: /src/pages/VadosPage.jsx
// ✨ Módulo de Gestión de Vados - Vista Premium con Listado y Mapa

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useVadoStore } from '../store/vadoStore';
import { useAuthStore } from '../store/authStore';
import { 
  Map, List, Search, Filter, Upload, Trash2, Eye, Calendar, MapPin,
  X, RefreshCw, AlertTriangle, CheckCircle, Clock, FileText,
  ChevronDown, Download, Clipboard, Navigation, Home, User
} from 'react-feather';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

import VadoDetailModal from '../components/Modals/VadoDetailModal';
import VadoImportModal from '../components/Modals/VadoImportModal';
import VadoInspectionModal from '../components/Modals/VadoInspectionModal';

// =========================================
// ESTILOS CSS-IN-JS PREMIUM
// =========================================
const styles = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 20px rgba(0, 255, 136, 0.2); }
    50% { box-shadow: 0 0 40px rgba(0, 255, 136, 0.4); }
  }
  
  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .vados-page {
    padding: 1.5rem;
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* Header */
  .vados-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .vados-title {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .vados-title h1 {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 700;
    color: white;
  }

  .vados-title-icon {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, rgba(0,255,136,0.2), rgba(0,255,136,0.05));
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-accent-neon);
  }

  .header-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  /* Stats Cards */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .stat-card {
    background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 1.25rem;
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
  }

  .stat-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--accent-color, var(--color-accent-neon));
    opacity: 0;
    transition: opacity 0.3s;
  }

  .stat-card:hover {
    transform: translateY(-4px);
    border-color: rgba(255,255,255,0.15);
  }

  .stat-card:hover::before {
    opacity: 1;
  }

  .stat-icon {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 10px;
  }

  .stat-value {
    font-size: 1.75rem;
    font-weight: 700;
    color: white;
    margin-bottom: 4px;
  }

  .stat-label {
    font-size: 0.85rem;
    color: rgba(255,255,255,0.6);
  }

  /* Filtros */
  .filters-bar {
    background: var(--glass-dark-bg);
    border: 1px solid var(--glass-dark-border);
    border-radius: 12px;
    padding: 1rem;
    margin-bottom: 1.5rem;
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
  }

  .search-box {
    flex: 1;
    min-width: 250px;
    position: relative;
  }

  .search-box input {
    width: 100%;
    padding: 10px 12px 10px 40px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    color: white;
    font-size: 0.9rem;
  }

  .search-box input:focus {
    outline: none;
    border-color: var(--color-accent-neon);
    box-shadow: 0 0 0 3px rgba(0,255,136,0.1);
  }

  .search-box .search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: rgba(255,255,255,0.4);
  }

  .filter-select {
    padding: 10px 12px;
    background: rgba(30,30,40,0.95);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    color: white;
    font-size: 0.9rem;
    min-width: 150px;
    cursor: pointer;
  }

  .filter-select option {
    background: #1e1e28;
    color: white;
    padding: 10px;
  }

  .filter-select:focus {
    outline: none;
    border-color: var(--color-accent-neon);
  }

  .view-toggle {
    display: flex;
    background: rgba(255,255,255,0.05);
    border-radius: 8px;
    overflow: hidden;
  }

  .view-toggle button {
    padding: 10px 16px;
    background: transparent;
    border: none;
    color: rgba(255,255,255,0.5);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;
  }

  .view-toggle button.active {
    background: var(--color-accent-neon);
    color: black;
  }

  .view-toggle button:hover:not(.active) {
    background: rgba(255,255,255,0.1);
    color: white;
  }

  /* Contenedor con scroll */
  .vados-content {
    flex: 1;
    overflow-y: auto;
    padding-bottom: 2rem;
  }

  /* Lista de Vados */
  .vados-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .vado-row {
    background: var(--glass-dark-bg);
    border: 1px solid var(--glass-dark-border);
    border-radius: 10px;
    padding: 1rem 1.25rem;
    display: grid;
    grid-template-columns: 1fr 1.5fr 1fr auto;
    gap: 1rem;
    align-items: center;
    transition: all 0.2s ease;
    cursor: pointer;
    animation: fadeInUp 0.3s ease forwards;
  }

  .vado-row:hover {
    border-color: var(--color-accent-neon);
    transform: translateX(4px);
    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
  }

  .vado-titular {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .vado-titular-nombre {
    font-weight: 600;
    color: white;
    font-size: 0.95rem;
  }

  .vado-titular-dni {
    font-size: 0.8rem;
    color: rgba(255,255,255,0.5);
    font-family: monospace;
  }

  .vado-direccion {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .vado-calle {
    color: white;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .vado-expediente {
    font-size: 0.8rem;
    color: rgba(255,255,255,0.5);
  }

  .vado-estado {
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: flex-start;
  }

  .estado-badge {
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .estado-badge.alta {
    background: rgba(0,255,136,0.15);
    color: #00ff88;
  }

  .estado-badge.baja {
    background: rgba(239,68,68,0.15);
    color: #ef4444;
  }

  .inspeccion-info {
    font-size: 0.75rem;
    color: rgba(255,255,255,0.5);
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .inspeccion-info.warning {
    color: #fbbf24;
  }

  .vado-actions {
    display: flex;
    gap: 8px;
  }

  .action-btn {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
  }

  .action-btn.view {
    background: rgba(59,130,246,0.15);
    color: #3b82f6;
  }

  .action-btn.inspect {
    background: rgba(0,255,136,0.15);
    color: #00ff88;
  }

  .action-btn.delete {
    background: rgba(239,68,68,0.15);
    color: #ef4444;
  }

  .action-btn:hover {
    transform: scale(1.1);
  }

  /* Mapa */
  .map-container {
    background: var(--glass-dark-bg);
    border: 1px solid var(--glass-dark-border);
    border-radius: 16px;
    overflow: hidden;
    height: calc(100vh - 400px);
    min-height: 400px;
  }

  .map-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: rgba(255,255,255,0.5);
    gap: 1rem;
  }

  .map-placeholder svg {
    opacity: 0.3;
  }

  /* Empty State */
  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
    color: rgba(255,255,255,0.5);
  }

  .empty-state svg {
    margin-bottom: 1rem;
    opacity: 0.3;
  }

  .empty-state h3 {
    color: white;
    margin-bottom: 0.5rem;
  }

  /* Loading */
  .loading-spinner {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    color: var(--color-accent-neon);
  }

  .loading-spinner svg {
    animation: rotate 1s linear infinite;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .vado-row {
      grid-template-columns: 1fr;
      gap: 0.75rem;
    }

    .vado-actions {
      justify-content: flex-end;
    }

    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  /* Delete Confirmation Modal */
  .delete-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.8);
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(10px);
  }

  .delete-modal {
    background: var(--glass-dark-bg);
    border: 1px solid var(--glass-dark-border);
    border-radius: 16px;
    padding: 2rem;
    max-width: 400px;
    text-align: center;
  }
`;

export default function VadosPage() {
  // =========================================
  // ESTADO Y STORES
  // =========================================
  const { user } = useAuthStore();
  const {
    vados,
    loading,
    importing,
    error,
    stats,
    filters,
    viewMode,
    pagination,
    setFilter,
    clearFilters,
    setViewMode,
    loadVados,
    removeVado,
    fetchVadoDetail,
    selectedVado,
    setSelectedVado
  } = useVadoStore();

  const isAdmin = user?.role === 'admin' || user?.role === 'supervisor';

  // Estados locales
  const [searchInput, setSearchInput] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [inspectingVado, setInspectingVado] = useState(null);

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        setFilter('search', searchInput);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Cargar datos al montar
  useEffect(() => {
    loadVados(true);
  }, []);

  // =========================================
  // HANDLERS
  // =========================================
  const handleViewDetail = async (vado) => {
    await fetchVadoDetail(vado.id);
    setShowDetailModal(true);
  };

  const handleInspect = (vado) => {
    setInspectingVado(vado);
    setShowInspectionModal(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    
    const result = await removeVado(deleteConfirm.id);
    if (result.success) {
      setDeleteConfirm(null);
    }
  };

  const handleLoadMore = () => {
    if (pagination.hasMore && !loading) {
      loadVados(false);
    }
  };

  // Lista de calles únicas para el filtro
  const callesUnicas = useMemo(() => {
    const calles = [...new Set(vados.map(v => v.ubicacion?.calle).filter(Boolean))];
    return calles.sort();
  }, [vados]);

  // Años únicos para el filtro
  const añosUnicos = useMemo(() => {
    const años = [...new Set(vados.map(v => v.expediente?.referencia?.split('/')[0]).filter(Boolean))];
    return años.sort().reverse();
  }, [vados]);

  // =========================================
  // RENDER
  // =========================================
  return (
    <div className="vados-page">
      <style>{styles}</style>

      {/* ========== HEADER ========== */}
      <div className="vados-header">
        <div className="vados-title">
          <div className="vados-title-icon">
            <Home size={24} />
          </div>
          <div>
            <h1>Gestión de Vados</h1>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
              Control e inspección de vados municipales
            </p>
          </div>
        </div>

        <div className="header-actions">
          {isAdmin && (
            <button 
              className="button button-primary"
              onClick={() => setShowImportModal(true)}
              disabled={importing}
            >
              <Upload size={18} />
              {importing ? 'Importando...' : 'Importar Excel'}
            </button>
          )}
          <button 
            className="button button-secondary"
            onClick={() => loadVados(true)}
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? 'spinning' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      {/* ========== STATS ========== */}
      <div className="stats-grid">
        <div className="stat-card" style={{ '--accent-color': '#00ff88' }}>
          <div className="stat-icon" style={{ background: 'rgba(0,255,136,0.15)', color: '#00ff88' }}>
            <Home size={22} />
          </div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Vados</div>
        </div>

        <div className="stat-card" style={{ '--accent-color': '#3b82f6' }}>
          <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>
            <CheckCircle size={22} />
          </div>
          <div className="stat-value">{stats.activos}</div>
          <div className="stat-label">Activos</div>
        </div>

        <div className="stat-card" style={{ '--accent-color': '#8b5cf6' }}>
          <div className="stat-icon" style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}>
            <Calendar size={22} />
          </div>
          <div className="stat-value">{stats.thisYear}</div>
          <div className="stat-label">Este Año</div>
        </div>

        <div className="stat-card" style={{ '--accent-color': '#fbbf24' }}>
          <div className="stat-icon" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
            <AlertTriangle size={22} />
          </div>
          <div className="stat-value">{stats.sinInspeccionar}</div>
          <div className="stat-label">Sin Inspeccionar</div>
        </div>
      </div>

      {/* ========== FILTROS ========== */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por DNI, nombre, calle o expediente..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <select 
          className="filter-select"
          value={filters.calle}
          onChange={(e) => setFilter('calle', e.target.value)}
        >
          <option value="">Todas las calles</option>
          {callesUnicas.map(calle => (
            <option key={calle} value={calle}>{calle}</option>
          ))}
        </select>

        <select 
          className="filter-select"
          value={filters.año}
          onChange={(e) => setFilter('año', e.target.value)}
        >
          <option value="">Todos los años</option>
          {añosUnicos.map(año => (
            <option key={año} value={año}>{año}</option>
          ))}
        </select>

        <select 
          className="filter-select"
          value={filters.situacion}
          onChange={(e) => setFilter('situacion', e.target.value)}
        >
          <option value="all">Todos los estados</option>
          <option value="Alta">Activos</option>
          <option value="Baja">Baja</option>
        </select>

        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          color: 'rgba(255,255,255,0.7)',
          cursor: 'pointer',
          fontSize: '0.85rem'
        }}>
          <input
            type="checkbox"
            checked={filters.sinInspeccionar}
            onChange={(e) => setFilter('sinInspeccionar', e.target.checked)}
            style={{ accentColor: 'var(--color-accent-neon)' }}
          />
          Solo sin inspeccionar
        </label>

        {(filters.search || filters.calle || filters.año || filters.situacion !== 'all' || filters.sinInspeccionar) && (
          <button 
            onClick={clearFilters}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: '#ef4444', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.85rem'
            }}
          >
            <X size={16} /> Limpiar
          </button>
        )}

        <div className="view-toggle">
          <button 
            className={viewMode === 'lista' ? 'active' : ''}
            onClick={() => setViewMode('lista')}
          >
            <List size={18} /> Lista
          </button>
          <button 
            className={viewMode === 'mapa' ? 'active' : ''}
            onClick={() => setViewMode('mapa')}
          >
            <Map size={18} /> Mapa
          </button>
        </div>
      </div>

      {/* ========== CONTENIDO PRINCIPAL ========== */}
      <div className="vados-content">
        {loading && vados.length === 0 ? (
          <div className="loading-spinner">
            <RefreshCw size={32} />
          </div>
        ) : vados.length === 0 ? (
          <div className="empty-state">
            <Home size={64} />
            <h3>No hay vados registrados</h3>
            <p>Importa un archivo Excel del Ayuntamiento para comenzar</p>
            {isAdmin && (
              <button 
                className="button button-primary"
                onClick={() => setShowImportModal(true)}
                style={{ marginTop: '1rem' }}
              >
                <Upload size={18} /> Importar Excel
              </button>
          )}
        </div>
      ) : viewMode === 'lista' ? (
        <>
          {/* Vista Lista */}
          <div className="vados-list">
            {vados.map((vado, index) => (
              <div 
                key={vado.id} 
                className="vado-row"
                style={{ animationDelay: `${index * 0.02}s` }}
                onClick={() => handleViewDetail(vado)}
              >
                {/* Titular */}
                <div className="vado-titular">
                  <span className="vado-titular-nombre">
                    <User size={14} style={{ marginRight: '6px', opacity: 0.5 }} />
                    {vado.titular?.nombre || 'Sin nombre'}
                  </span>
                  <span className="vado-titular-dni">{vado.titular?.documento || '-'}</span>
                </div>

                {/* Dirección */}
                <div className="vado-direccion">
                  <span className="vado-calle">
                    <MapPin size={14} style={{ color: 'var(--color-accent-neon)' }} />
                    {vado.ubicacion?.calle} {vado.ubicacion?.numero && `Nº ${vado.ubicacion.numero}`}
                  </span>
                  <span className="vado-expediente">
                    Exp: {vado.expediente?.referencia || '-'}
                  </span>
                </div>

                {/* Estado */}
                <div className="vado-estado">
                  <span className={`estado-badge ${vado.expediente?.situacion?.toLowerCase() || 'alta'}`}>
                    {vado.expediente?.situacion || 'Alta'}
                  </span>
                  {vado.ultimaInspeccion ? (
                    <span className={`inspeccion-info ${
                      new Date(vado.ultimaInspeccion.toDate ? vado.ultimaInspeccion.toDate() : vado.ultimaInspeccion) < 
                      new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) ? 'warning' : ''
                    }`}>
                      <Clock size={12} />
                      Insp: {formatDistanceToNow(
                        vado.ultimaInspeccion.toDate ? vado.ultimaInspeccion.toDate() : new Date(vado.ultimaInspeccion),
                        { locale: es, addSuffix: true }
                      )}
                    </span>
                  ) : (
                    <span className="inspeccion-info warning">
                      <AlertTriangle size={12} />
                      Sin inspeccionar
                    </span>
                  )}
                </div>

                {/* Acciones */}
                <div className="vado-actions" onClick={(e) => e.stopPropagation()}>
                  <button 
                    className="action-btn view" 
                    title="Ver detalle"
                    onClick={() => handleViewDetail(vado)}
                  >
                    <Eye size={16} />
                  </button>
                  <button 
                    className="action-btn inspect" 
                    title="Nueva inspección"
                    onClick={() => handleInspect(vado)}
                  >
                    <Clipboard size={16} />
                  </button>
                  {isAdmin && (
                    <button 
                      className="action-btn delete" 
                      title="Eliminar"
                      onClick={() => setDeleteConfirm(vado)}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Load More */}
          {pagination.hasMore && (
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <button 
                className="button button-secondary"
                onClick={handleLoadMore}
                disabled={loading}
              >
                {loading ? (
                  <RefreshCw size={18} style={{ animation: 'rotate 1s linear infinite' }} />
                ) : (
                  'Cargar más'
                )}
              </button>
            </div>
          )}
        </>
      ) : (
        /* Vista Mapa */
        <div className="map-container">
          <div className="map-placeholder">
            <Map size={64} />
            <h3>Mapa Interactivo</h3>
            <p>Próximamente: Visualización de vados con Google Maps</p>
            <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>
              Los vados necesitan coordenadas GPS para mostrarse en el mapa.
              <br />
              Puedes añadirlas durante las inspecciones.
            </p>
          </div>
        </div>
      )}
      </div> {/* Cierre de vados-content */}

      {/* ========== MODAL CONFIRMAR ELIMINAR ========== */}
      {deleteConfirm && (
        <div className="delete-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{
              width: '60px',
              height: '60px',
              margin: '0 auto 1rem',
              background: 'rgba(239, 68, 68, 0.15)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Trash2 size={28} color="#ef4444"/>
            </div>
            <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>¿Eliminar vado?</h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Se eliminará permanentemente el vado de <strong style={{ color: 'white' }}>
                {deleteConfirm.titular?.nombre}
              </strong> en <strong style={{ color: 'white' }}>
                {deleteConfirm.ubicacion?.calle}
              </strong>
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button 
                className="button button-secondary" 
                onClick={() => setDeleteConfirm(null)}
              >
                Cancelar
              </button>
              <button 
                className="button button-danger" 
                onClick={handleDelete}
              >
                <Trash2 size={16} style={{ marginRight: 6 }}/> Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODALES ========== */}
      {showDetailModal && selectedVado && (
        <VadoDetailModal 
          vado={selectedVado}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedVado(null);
          }}
          onInspect={() => {
            setShowDetailModal(false);
            handleInspect(selectedVado);
          }}
          isAdmin={isAdmin}
        />
      )}

      {showImportModal && (
        <VadoImportModal 
          onClose={() => setShowImportModal(false)}
        />
      )}

      {showInspectionModal && inspectingVado && (
        <VadoInspectionModal 
          vado={inspectingVado}
          onClose={() => {
            setShowInspectionModal(false);
            setInspectingVado(null);
          }}
        />
      )}
    </div>
  );
}
