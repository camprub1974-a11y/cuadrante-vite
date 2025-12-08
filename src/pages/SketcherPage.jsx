// Archivo: /src/pages/SketcherPage.jsx
// ✨ VERSIÓN FINAL: Paginación Consistente (8 ítems/pág) y UI Premium

import React, { useEffect, useState, useCallback } from 'react';
import { useSketchStore } from '../store/sketchStore';
import { useAuthStore } from '../store/authStore';
import PaginationControls from '../components/PaginationControls'; // 💡 Importar Paginación

import { 
    Edit3, Plus, Filter, Search, Trash2, Download, Eye, Calendar, MapPin,
    X, ChevronLeft, ChevronRight, ZoomIn, FileText, AlertTriangle,
    TrendingUp, Clock, Layers, RefreshCw, ExternalLink, Printer, Edit2 // Edit2 añadido
} from 'react-feather';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

import SketchModal from '../components/Modals/SketchModal';

// =========================================
// CONSTANTES Y LÍMITE DE PAGINACIÓN
// =========================================
const PAGINATION_LIMIT = 8; // 💡 Límite requerido: 8 croquis por página

// Tipos, estilos y animaciones (El bloque premiumStyles se mantiene igual por ser extenso)
const premiumStyles = `
  /* Animaciones */
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }
  
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 20px rgba(0, 255, 136, 0.2); }
    50% { box-shadow: 0 0 40px rgba(0, 255, 136, 0.4); }
  }
  
  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  /* Stat Cards */
  .stat-card-premium {
    background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 1.25rem;
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
  }
  
  .stat-card-premium::before {
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
  
  .stat-card-premium:hover {
    transform: translateY(-4px);
    border-color: rgba(255,255,255,0.15);
  }
  
  .stat-card-premium:hover::before {
    opacity: 1;
  }
  
  .stat-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
  }
  
  /* Sketch Cards */
  .sketch-card-premium {
    background: var(--glass-dark-bg);
    border: 1px solid var(--glass-dark-border);
    border-radius: 16px;
    overflow: hidden;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    animation: fadeInUp 0.5s ease forwards;
    position: relative;
  }
  
  .sketch-card-premium:hover {
    transform: translateY(-8px) scale(1.02);
    border-color: var(--color-accent-neon);
    box-shadow: 
      0 20px 40px rgba(0, 0, 0, 0.3),
      0 0 30px rgba(0, 255, 136, 0.1);
  }
  
  .sketch-card-premium:hover .card-image-overlay {
    opacity: 1;
  }
  
  .sketch-card-premium:hover .card-image img {
    transform: scale(1.1);
  }
  
  .card-image {
    height: 180px;
    position: relative;
    overflow: hidden;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  }
  
  .card-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s ease;
  }
  
  .card-image-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 50%, rgba(0,0,0,0.3) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  .overlay-btn {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    backdrop-filter: blur(10px);
  }
  
  .overlay-btn:hover {
    transform: scale(1.15);
  }
  
  .overlay-btn.view {
    background: rgba(0, 255, 136, 0.9);
    color: black;
  }
  
  .overlay-btn.download {
    background: rgba(59, 130, 246, 0.9);
    color: white;
  }
  
  .overlay-btn.delete {
    background: rgba(239, 68, 68, 0.9);
    color: white;
  }
  
  .overlay-btn.pdf {
    background: rgba(251, 146, 60, 0.9);
    color: white;
  }
  
  /* Type Badge */
  .type-badge {
    position: absolute;
    top: 12px;
    right: 12px;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    backdrop-filter: blur(10px);
    z-index: 2;
  }
  
  .type-atestado { background: rgba(239, 68, 68, 0.9); color: white; }
  .type-estadillo { background: rgba(251, 191, 36, 0.9); color: black; }
  .type-croquis { background: rgba(0, 255, 136, 0.9); color: black; }
  .type-ninguno { background: rgba(156, 163, 175, 0.9); color: white; }
  
  /* Lightbox */
  .lightbox-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.95);
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.3s ease;
    backdrop-filter: blur(20px);
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .lightbox-content {
    max-width: 90vw;
    max-height: 85vh;
    position: relative;
    animation: zoomIn 0.3s ease;
  }
  
  @keyframes zoomIn {
    from { opacity: 0; transform: scale(0.9); }
    to { opacity: 1; transform: scale(1); }
  }
  
  .lightbox-content img {
    max-width: 100%;
    max-height: 80vh;
    border-radius: 12px;
    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5);
  }
  
  .lightbox-info {
    position: absolute;
    bottom: -60px;
    left: 0;
    right: 0;
    text-align: center;
    color: white;
  }
  
  .lightbox-close {
    position: absolute;
    top: -50px;
    right: 0;
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.2);
    color: white;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .lightbox-close:hover {
    background: rgba(239, 68, 68, 0.8);
    border-color: transparent;
  }
  
  .lightbox-nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.2);
    color: white;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .lightbox-nav:hover {
    background: rgba(0, 255, 136, 0.3);
    border-color: var(--color-accent-neon);
  }
  
  .lightbox-nav.prev { left: -70px; }
  .lightbox-nav.next { right: -70px; }
  
  /* Skeleton Loading */
  .skeleton {
    background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 8px;
  }
  
  /* Filter Chips */
  .filter-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: rgba(0, 255, 136, 0.1);
    border: 1px solid rgba(0, 255, 136, 0.3);
    border-radius: 20px;
    font-size: 0.8rem;
    color: var(--color-accent-neon);
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .filter-chip:hover {
    background: rgba(0, 255, 136, 0.2);
  }
  
  .filter-chip .remove {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: rgba(255,255,255,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  /* Delete Modal */
  .delete-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    z-index: 2100;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.2s ease;
  }
  
  .delete-modal {
    background: var(--glass-dark-bg);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 16px;
    padding: 2rem;
    max-width: 400px;
    text-align: center;
    animation: zoomIn 0.2s ease;
  }
  
  /* Pagination Premium (Estilo para PaginationControls) */
  .pagination-premium {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 2rem;
  }
  
  .pagination-btn {
    min-width: 40px;
    height: 40px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.03);
    color: rgba(255,255,255,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 500;
  }
  
  .pagination-btn:hover:not(:disabled) {
    background: rgba(0, 255, 136, 0.1);
    border-color: var(--color-accent-neon);
    color: var(--color-accent-neon);
  }
  
  .pagination-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
  
  .pagination-btn.active {
    background: var(--color-accent-neon);
    border-color: var(--color-accent-neon);
    color: black;
    font-weight: 700;
  }
`;

// ... (Resto de configuración)
const typeConfig = {
    atestado: { label: 'Atestado', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
    estadillo: { label: 'Estadillo', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)' },
    croquis: { label: 'Croquis', color: '#00ff88', bg: 'rgba(0, 255, 136, 0.15)' },
    ninguno: { label: 'Otros', color: '#9ca3af', bg: 'rgba(156, 163, 175, 0.15)' }
};

// =========================================
// COMPONENTE PRINCIPAL
// =========================================
export default function SketcherPage() {
    const { 
        // 💡 Modificación para recibir el estado de paginación
        sketches, loading, filters, stats, 
        pagination, // Objeto de paginación del store
        loadSketches, removeSketch, clearFilters,
        // Funciones de navegación del store (asumidas)
        nextPage, prevPage, goToPage 
    } = useSketchStore();
    const { user } = useAuthStore();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSketch, setEditingSketch] = useState(null);
    const [lightboxData, setLightboxData] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // --- FUNCIÓN DE CARGA CENTRALIZADA ---
    // Usamos useCallback para que el efecto no se dispare a menos que cambien las dependencias.
    const fetchSketches = useCallback((page = 1, cursor = null, limit = PAGINATION_LIMIT) => {
        // 💡 Pasamos filtros y límite a loadSketches (la función del store)
        // La tienda se encargará de resetear el cursor si page=1.
        loadSketches({
            page,
            cursor,
            limit,
            filters: { ...filters, searchTerm: searchTerm } // Pasamos el filtro de búsqueda local
        });
    }, [filters, searchTerm, loadSketches]); 
    
    // 💡 EFECTO DE CARGA INICIAL Y CAMBIO DE FILTROS/BÚSQUEDA
    useEffect(() => {
        // Siempre cargamos la primera página (reseteando el cursor en el store)
        fetchSketches(1, null, PAGINATION_LIMIT);
    }, [filters.tipo, filters.month, searchTerm, fetchSketches]); // Depende de los filtros y el término de búsqueda

    // El filtrado local `filteredSketches` YA NO es necesario, ya que `sketches` del store 
    // ahora solo contiene los 8 croquis de la página actual y la búsqueda se realiza en la BD.
    const paginatedSketches = sketches; // Los sketches ya vienen paginados y filtrados

    // --- Handlers de Paginación ---
    const handleNextPage = () => {
        // Llama a la función del store para avanzar a la siguiente página.
        // La tienda debe manejar si debe usar el cursor almacenado o el último visible.
        nextPage(PAGINATION_LIMIT); 
    };

    const handlePrevPage = () => {
        // Llama a la función del store para retroceder.
        prevPage(PAGINATION_LIMIT);
    };

    const handlePageClick = (page) => {
        // Llama a la función del store para ir a una página específica.
        goToPage(page, PAGINATION_LIMIT);
    };

    const handleEdit = (sketch) => {
        setEditingSketch(sketch);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setEditingSketch(null);
        setIsModalOpen(true);
    };

    const handleDelete = async () => {
        if (deleteConfirm) {
            await removeSketch(deleteConfirm.id);
            setDeleteConfirm(null);
            // Recargar la página actual para asegurar que se rellene el espacio
            fetchSketches(pagination.currentPage, pagination.pageHistory[pagination.currentPage - 1]);
        }
    };

    const openLightbox = (sketch, index) => {
        setLightboxData({ sketch, index });
    };

    const navigateLightbox = (direction) => {
        if (!lightboxData) return;
        
        // 💡 NOTA: La navegación del Lightbox es local, por lo que necesita el array completo.
        // Mantenemos el índice sobre el array actual (paginatedSketches)
        
        const currentIndex = lightboxData.index;
        const newIndex = direction === 'next' 
            ? Math.min(currentIndex + 1, paginatedSketches.length - 1)
            : Math.max(currentIndex - 1, 0);
        
        setLightboxData({ sketch: paginatedSketches[newIndex], index: newIndex });
    };

    // ... (El resto de handlers de PDF y descargas se mantienen igual) ...

    const downloadImage = (url, filename) => {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'croquis.png';
        a.click();
    };

    const generatePDF = async (sketch) => {
        try {
            // Mostrar loading
            const loadingMsg = document.createElement('div');
            loadingMsg.id = 'pdf-loading';
            loadingMsg.innerHTML = `
                <div style="
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(0,0,0,0.9);
                    padding: 2rem 3rem;
                    border-radius: 16px;
                    z-index: 10000;
                    text-align: center;
                    border: 1px solid rgba(0,255,136,0.3);
                ">
                    <div style="
                        width: 40px;
                        height: 40px;
                        border: 3px solid rgba(255,255,255,0.1);
                        border-top-color: #00ff88;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 1rem;
                    "></div>
                    <p style="color: white; margin: 0; font-size: 1rem;">Generando PDF...</p>
                    <p style="color: rgba(255,255,255,0.5); margin: 0.5rem 0 0; font-size: 0.85rem;">Esto puede tardar unos segundos</p>
                </div>
                <style>
                    @keyframes spin { to { transform: rotate(360deg); } }
                </style>
            `;
            document.body.appendChild(loadingMsg);

            // ✅ Usar la función centralizada de dataController
            const { generateSketchPdf } = await import('../../js/dataController');
            const result = await generateSketchPdf(sketch.id);

            // Quitar loading
            document.getElementById('pdf-loading')?.remove();

            // Abrir el PDF
            if (result?.success && result?.pdfUrl) {
                window.open(result.pdfUrl, '_blank');
            } else if (result?.pdfUrl) {
                window.open(result.pdfUrl, '_blank');
            } else {
                throw new Error('La función no devolvió un PDF válido');
            }

        } catch (err) {
            console.error('Error generando PDF:', err);
            document.getElementById('pdf-loading')?.remove();
            
            // Mostrar error
            const errorDiv = document.createElement('div');
            errorDiv.innerHTML = `
                <div style="
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: rgba(239, 68, 68, 0.95);
                    color: white;
                    padding: 1rem 1.5rem;
                    border-radius: 10px;
                    z-index: 10000;
                    max-width: 400px;
                    animation: slideIn 0.3s ease;
                ">
                    <strong>Error al generar PDF</strong>
                    <p style="margin: 0.5rem 0 0; font-size: 0.85rem; opacity: 0.9;">${err.message || 'Error desconocido'}</p>
                </div>
                <style>
                    @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
                </style>
            `;
            document.body.appendChild(errorDiv);
            setTimeout(() => errorDiv.remove(), 5000);
        }
    };


    const getTypeBadge = (type) => {
        const config = typeConfig[type] || typeConfig.ninguno;
        return (
            <span className={`type-badge type-${type || 'ninguno'}`}>
                {config.label}
            </span>
        );
    };

    const canDelete = (sketch) => {
        if (user?.role === 'admin' || user?.role === 'supervisor') return true;
        return sketch.createdByUid === user?.uid;
    };

    // Renderizado de skeleton loading
    const renderSkeletons = () => (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {[1,2,3,4,5,6].map(i => (
                <div key={i} className="sketch-card-premium" style={{ opacity: 0.5 }}>
                    <div className="skeleton" style={{ height: '180px' }}></div>
                    <div style={{ padding: '1rem' }}>
                        <div className="skeleton" style={{ height: '20px', marginBottom: '10px', width: '70%' }}></div>
                        <div className="skeleton" style={{ height: '14px', marginBottom: '8px', width: '50%' }}></div>
                        <div className="skeleton" style={{ height: '40px', width: '100%' }}></div>
                    </div>
                </div>
            ))}
        </div>
    );
    
    // Calculamos el índice total para el Lightbox (si se filtrara, este índice sería local)
    // Ya que la búsqueda ahora se hace en la BD, la paginación es precisa.
    const totalItems = pagination.totalItems || 0;


    return (
        <div className="view-container" style={{ padding: '1.5rem', height: 'calc(100vh - 60px)', overflowY: 'auto' }}>
            
            <style>{premiumStyles}</style>

            {/* HEADER */}
            {/* ... (Header se mantiene igual) ... */}
            <div className="view-header" style={{ 
                marginBottom: '2rem', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '1rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ 
                        background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.2), rgba(0, 200, 100, 0.1))',
                        padding: '14px', 
                        borderRadius: '16px',
                        border: '1px solid rgba(0, 255, 136, 0.3)',
                        animation: 'float 3s ease-in-out infinite'
                    }}>
                        <Edit3 size={32} style={{ color: 'var(--color-accent-neon)' }} />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '700', color: 'white' }}>
                            Croquis de Accidentes
                        </h1>
                        <p style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                            Archivo gráfico de intervenciones de tráfico
                        </p>
                    </div>
                </div>
                
                <button 
                    className="button btn-gradient-primary ripple-effect" 
                    onClick={handleCreate}
                    style={{ 
                        padding: '12px 24px',
                        borderRadius: '12px',
                        fontSize: '0.95rem'
                    }}
                >
                    <Plus size={20} style={{ marginRight: 8 }}/> Nuevo Croquis
                </button>
            </div>


            {/* STATS CARDS */}
            {/* ... (Stats Cards se mantienen igual) ... */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                gap: '1rem', 
                marginBottom: '1.5rem' 
            }}>
                <div className="stat-card-premium" style={{ '--accent-color': 'var(--color-accent-neon)' }}>
                    <div className="stat-icon" style={{ background: 'rgba(0, 255, 136, 0.15)' }}>
                        <Layers size={24} color="var(--color-accent-neon)" />
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: 'white' }}>{stats.total}</div>
                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>Total Croquis</div>
                </div>
                
                <div className="stat-card-premium" style={{ '--accent-color': '#60a5fa' }}>
                    <div className="stat-icon" style={{ background: 'rgba(96, 165, 250, 0.15)' }}>
                        <Clock size={24} color="#60a5fa" />
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: 'white' }}>{stats.thisMonth}</div>
                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>Este Mes</div>
                </div>
                
                <div className="stat-card-premium" style={{ '--accent-color': '#ef4444' }}>
                    <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
                        <FileText size={24} color="#ef4444" />
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: 'white' }}>{stats.types?.atestado || 0}</div>
                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>Atestados</div>
                </div>
                
                <div className="stat-card-premium" style={{ '--accent-color': '#fbbf24' }}>
                    <div className="stat-icon" style={{ background: 'rgba(251, 191, 36, 0.15)' }}>
                        <TrendingUp size={24} color="#fbbf24" />
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: 'white' }}>{stats.types?.estadillo || 0}</div>
                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>Estadillos</div>
                </div>
            </div>

            {/* FILTROS */}
            <div className="card" style={{ 
                marginBottom: '1.5rem', 
                background: 'var(--glass-dark-bg)', 
                border: '1px solid var(--glass-dark-border)',
                borderRadius: '16px'
            }}>
                <div className="card-body" style={{ 
                    padding: '1rem 1.25rem', 
                    display: 'flex', 
                    gap: '1rem', 
                    alignItems: 'center', 
                    flexWrap: 'wrap' 
                }}>
                    {/* Búsqueda */}
                    <div style={{ position: 'relative', flex: '1', minWidth: '250px' }}>
                        <Search size={18} style={{ 
                            position: 'absolute', left: '14px', top: '50%', 
                            transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' 
                        }}/>
                        <input
                            type="text"
                            className="input"
                            placeholder="Buscar por lugar o implicados..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ 
                                paddingLeft: '44px', height: '44px', width: '100%',
                                borderRadius: '12px', background: 'rgba(255,255,255,0.05)'
                            }}
                        />
                    </div>

                    {/* Filtro por tipo */}
                    <select 
                        className="selector"
                        value={filters.tipo}
                        onChange={(e) => setFilter('tipo', e.target.value)}
                        style={{ 
                            height: '44px', minWidth: '150px',
                            borderRadius: '12px', background: 'rgba(255,255,255,0.05)'
                        }}
                    >
                        <option value="all">Todos los tipos</option>
                        <option value="croquis">Solo Croquis</option>
                        <option value="atestado">Atestados</option>
                        <option value="estadillo">Estadillos</option>
                        <option value="ninguno">Otros</option>
                    </select>

                    {/* Filtro por mes (Premium UI - Custom Placeholder) */}
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        {/* Icono */}
                        <Calendar 
                            size={18} 
                            style={{
                                position: 'absolute', left: '14px', zIndex: 10,
                                color: filters.month ? 'var(--color-accent-neon)' : 'rgba(255,255,255,0.4)',
                                pointerEvents: 'none', transition: 'color 0.3s ease'
                            }} 
                        />

                        {/* Texto Personalizado (Placeholder falso) */}
                        {!filters.month && (
                            <span style={{
                                position: 'absolute', left: '44px', top: '50%',
                                transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)',
                                fontSize: '0.9rem', fontWeight: '500', pointerEvents: 'none', zIndex: 5
                            }}>
                                Mes / Año
                            </span>
                        )}

                        {/* Input Real */}
                        <input
                            type="month"
                            value={filters.month}
                            onChange={(e) => setFilter('month', e.target.value)}
                            style={{
                                height: '44px', paddingLeft: '44px', paddingRight: '16px',
                                borderRadius: '12px', 
                                border: filters.month ? '1px solid var(--color-accent-neon)' : '1px solid rgba(255,255,255,0.1)',
                                background: filters.month ? 'rgba(0, 255, 136, 0.05)' : 'rgba(15, 23, 42, 0.6)',
                                color: filters.month ? 'white' : 'transparent', 
                                fontSize: '0.9rem', fontFamily: 'inherit', fontWeight: '500', 
                                outline: 'none', cursor: 'pointer', colorScheme: 'dark', 
                                transition: 'all 0.3s ease', minWidth: '170px', position: 'relative',
                                zIndex: 1, 
                                boxShadow: filters.month ? '0 0 15px rgba(0, 255, 136, 0.1)' : 'none'
                            }}
                            onMouseEnter={(e) => {
                                if (!filters.month) {
                                    e.target.style.borderColor = 'rgba(255,255,255,0.3)';
                                    e.target.style.background = 'rgba(255,255,255,0.08)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!filters.month) {
                                    e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                                    e.target.style.background = 'rgba(15, 23, 42, 0.6)';
                                }
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = 'var(--color-accent-neon)';
                                e.target.style.boxShadow = '0 0 0 2px rgba(0, 255, 136, 0.2)';
                            }}
                            onBlur={(e) => {
                                if (!filters.month) {
                                    e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                                    e.target.style.boxShadow = 'none';
                                }
                            }}
                        />
                    </div>

                    {/* Botón limpiar */}
                    <button 
                        className="button button-secondary" 
                        onClick={() => { clearFilters(); setSearchTerm(''); }}
                        style={{ height: '44px', borderRadius: '12px' }}
                    >
                        <RefreshCw size={16} style={{ marginRight: 6 }}/> Limpiar
                    </button>
                </div>

                {/* Chips de filtros activos */}
                {(filters.tipo !== 'all' || filters.month || searchTerm) && (
                    <div style={{ 
                        padding: '0 1.25rem 1rem', display: 'flex', gap: '8px', flexWrap: 'wrap' 
                    }}>
                        {searchTerm && (
                            <span className="filter-chip" onClick={() => setSearchTerm('')}>
                                Búsqueda: "{searchTerm}"
                                <span className="remove"><X size={10}/></span>
                            </span>
                        )}
                        {filters.tipo !== 'all' && (
                            <span className="filter-chip" onClick={() => setFilter('tipo', 'all')}>
                                Tipo: {typeConfig[filters.tipo]?.label}
                                <span className="remove"><X size={10}/></span>
                            </span>
                        )}
                        {filters.month && (
                            <span className="filter-chip" onClick={() => setFilter('month', '')}>
                                Mes: {filters.month}
                                <span className="remove"><X size={10}/></span>
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* ========== GALERÍA ========== */}
            {loading && paginatedSketches.length === 0 ? (
                renderSkeletons()
            ) : paginatedSketches.length === 0 ? (
                <div style={{ 
                    textAlign: 'center', padding: '5rem 2rem',
                    background: 'var(--glass-dark-bg)', borderRadius: '20px',
                    border: '1px dashed rgba(255,255,255,0.1)'
                }}>
                    <div style={{
                        width: '100px', height: '100px', margin: '0 auto 1.5rem',
                        background: 'rgba(255,255,255,0.03)', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Edit3 size={48} style={{ opacity: 0.3 }}/>
                    </div>
                    <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>No hay croquis</h3>
                    <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem' }}>
                        {searchTerm || filters.tipo !== 'all' || filters.month 
                            ? 'No se encontraron resultados con los filtros actuales.'
                            : 'Comienza creando tu primer croquis de accidente.'
                        }
                    </p>
                    <button className="button btn-gradient-primary" onClick={handleCreate}>
                        <Plus size={18} style={{ marginRight: 8 }}/> Crear Croquis
                    </button>
                </div>
            ) : (
                <>
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                        gap: '1.5rem' 
                    }}>
                        {paginatedSketches.map((sketch, index) => (
                            <div 
                                key={sketch.id} 
                                className="sketch-card-premium"
                                style={{ animationDelay: `${index * 0.05}s` }}
                            >
                                {/* Imagen */}
                                <div className="card-image">
                                    {getTypeBadge(sketch.documentoRealizado)}
                                    
                                    {sketch.imageUrl ? (
                                        <img src={sketch.imageUrl} alt="Croquis" loading="lazy" />
                                    ) : (
                                        <div style={{ 
                                            width: '100%', height: '100%', display: 'flex', 
                                            flexDirection: 'column', alignItems: 'center', 
                                            justifyContent: 'center', color: 'rgba(255,255,255,0.3)'
                                        }}>
                                            <Edit3 size={40}/>
                                            <span style={{ fontSize: '0.8rem', marginTop: '8px' }}>Sin imagen</span>
                                        </div>
                                    )}
                                    
                                    {/* Overlay con botones */}
                                    <div className="card-image-overlay">
                                        <button 
                                            className="overlay-btn view" 
                                            onClick={(e) => { e.stopPropagation(); openLightbox(sketch, index); }}
                                            title="Ver ampliado"
                                        >
                                            <ZoomIn size={20}/>
                                        </button>
                                        <button 
                                            className="overlay-btn pdf" 
                                            onClick={(e) => { e.stopPropagation(); generatePDF(sketch); }}
                                            title="Generar PDF"
                                        >
                                            <Printer size={20}/>
                                        </button>
                                        {sketch.imageUrl && (
                                            <button 
                                                className="overlay-btn download" 
                                                onClick={(e) => { e.stopPropagation(); downloadImage(sketch.imageUrl, `croquis-${sketch.id}.png`); }}
                                                title="Descargar imagen"
                                            >
                                                <Download size={20}/>
                                            </button>
                                        )}
                                        {canDelete(sketch) && (
                                            <button 
                                                className="overlay-btn delete" 
                                                onClick={(e) => { e.stopPropagation(); setDeleteConfirm(sketch); }}
                                                title="Eliminar"
                                            >
                                                <Trash2 size={18}/>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Info */}
                                <div 
                                    style={{ padding: '1.25rem', cursor: 'pointer' }}
                                    onClick={() => handleEdit(sketch)}
                                >
                                    <h4 style={{ 
                                        margin: '0 0 8px 0', color: 'white', fontSize: '1.05rem',
                                        whiteSpace: 'nowrap', overflow: 'hidden', 
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {sketch.lugar}
                                    </h4>
                                    
                                    <div style={{ 
                                        display: 'flex', gap: '12px', fontSize: '0.8rem', 
                                        color: 'rgba(255,255,255,0.5)', marginBottom: '10px' 
                                    }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Calendar size={13}/> 
                                            {sketch.fechaSuceso ? format(new Date(sketch.fechaSuceso), 'dd/MM/yyyy') : '-'}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.7 }}>
                                            {sketch.fechaSuceso && formatDistanceToNow(new Date(sketch.fechaSuceso), { locale: es, addSuffix: true })}
                                        </span>
                                    </div>

                                    <p style={{ 
                                        fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', margin: 0,
                                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden', lineHeight: 1.5
                                    }}>
                                        {sketch.implicados}
                                    </p>

                                    {sketch.heridos && (
                                        <div style={{
                                            marginTop: '10px', padding: '6px 10px',
                                            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
                                            borderRadius: '6px', fontSize: '0.75rem', color: '#ef4444',
                                            display: 'flex', alignItems: 'center', gap: '6px'
                                        }}>
                                            <AlertTriangle size={12}/> {sketch.heridos}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Paginación */}
                    <div className="pagination-premium">
                        <PaginationControls
                            currentPage={pagination.currentPage}
                            pageHistory={pagination.pageHistory}
                            hasNextPage={pagination.hasNextPage}
                            loading={loading}
                            itemsCount={paginatedSketches.length} // Items en la página actual
                            onNextPage={handleNextPage}
                            onPrevPage={handlePrevPage}
                            onPageClick={handlePageClick}
                        />
                    </div>
                </>
            )}

            {/* LIGHTBOX (Se mantiene igual) */}
            {/* ... */}
            {lightboxData && (
                <div className="lightbox-overlay" onClick={() => setLightboxData(null)}>
                    <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
                        <button className="lightbox-close" onClick={() => setLightboxData(null)}>
                            <X size={20}/>
                        </button>
                        
                        {lightboxData.index > 0 && (
                            <button className="lightbox-nav prev" onClick={() => navigateLightbox('prev')}>
                                <ChevronLeft size={24}/>
                            </button>
                        )}
                        
                        {lightboxData.index < paginatedSketches.length - 1 && (
                            <button className="lightbox-nav next" onClick={() => navigateLightbox('next')}>
                                <ChevronRight size={24}/>
                            </button>
                        )}
                        
                        {lightboxData.sketch.imageUrl ? (
                            <img src={lightboxData.sketch.imageUrl} alt="Croquis ampliado"/>
                        ) : (
                            <div style={{ 
                                width: '400px', height: '300px', background: 'rgba(255,255,255,0.05)',
                                borderRadius: '12px', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', color: 'rgba(255,255,255,0.3)'
                            }}>
                                <Edit3 size={60}/>
                            </div>
                        )}
                        
                        <div className="lightbox-info">
                            <h3 style={{ margin: '0 0 4px 0' }}>{lightboxData.sketch.lugar}</h3>
                            <p style={{ margin: 0, opacity: 0.7, fontSize: '0.9rem' }}>
                                {lightboxData.sketch.fechaSuceso && format(new Date(lightboxData.sketch.fechaSuceso), 'dd MMMM yyyy', { locale: es })}
                            </p>
                        </div>
                    </div>
                </div>
            )}


            {/* MODAL CONFIRMAR ELIMINAR (Se mantiene igual) */}
            {/* ... */}
            {deleteConfirm && (
                <div className="delete-modal-overlay" onClick={() => setDeleteConfirm(null)}>
                    <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
                        <div style={{
                            width: '60px', height: '60px', margin: '0 auto 1rem',
                            background: 'rgba(239, 68, 68, 0.15)', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Trash2 size={28} color="#ef4444"/>
                        </div>
                        <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>¿Eliminar croquis?</h3>
                        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                            Se eliminará permanentemente el croquis de <strong style={{ color: 'white' }}>{deleteConfirm.lugar}</strong>
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


            {/* MODAL CREAR/EDITAR (Se mantiene igual) */}
            <SketchModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                initialData={editingSketch}
            />

        </div>
    );
}