// src/pages/CollectionsPage.jsx
// ✨ VERSIÓN FINAL: Paginación Local (Index-Based)

import React, { useState, useEffect } from 'react';
import { useCollectionStore } from '../store/collectionStore';
import { 
    Users, Truck, Briefcase, Search, Plus, 
    Edit2, Trash2, ChevronLeft, ChevronRight,
    RefreshCw
} from 'react-feather';

// Importar Modales
import PersonModal from '../components/Modals/Collections/PersonModal';
import VehicleModal from '../components/Modals/Collections/VehicleModal';
import EstablishmentModal from '../components/Modals/Collections/EstablishmentModal';

// =========================================
// CONSTANTES Y ESTILOS
// =========================================
const styles = {
    pageContainer: {
        padding: '2rem',
        height: '100%',
        overflowY: 'auto',
        color: '#e2e8f0'
    },
    header: {
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    title: {
        fontSize: '1.8rem',
        fontWeight: '700',
        background: 'linear-gradient(90deg, #fff, #a0aec0)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        margin: 0
    },
    subtitle: {
        color: '#718096',
        fontSize: '0.9rem',
        marginTop: '0.5rem'
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
    },
    statCard: {
        background: 'rgba(30, 41, 59, 0.7)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        transition: 'transform 0.2s',
        cursor: 'pointer'
    },
    statIcon: (color) => ({
        background: `rgba(${color}, 0.2)`,
        color: `rgb(${color})`,
        padding: '12px',
        borderRadius: '12px',
        display: 'flex'
    }),
    toolbar: {
        background: 'rgba(30, 41, 59, 0.7)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '1rem',
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap'
    },
    searchInput: {
        background: 'rgba(0, 0, 0, 0.2)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        padding: '0.75rem 1rem 0.75rem 2.5rem',
        color: 'white',
        width: '100%',
        minWidth: '300px',
        outline: 'none'
    },
    searchIcon: {
        position: 'absolute',
        left: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: '#718096',
        pointerEvents: 'none'
    },
    tableContainer: {
        background: 'rgba(30, 41, 59, 0.7)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        overflow: 'hidden'
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
    },
    th: {
        padding: '1rem 1.5rem',
        textAlign: 'left',
        color: '#a0aec0',
        fontSize: '0.85rem',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        background: 'rgba(0, 0, 0, 0.2)'
    },
    td: {
        padding: '1rem 1.5rem',
        color: '#e2e8f0',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        fontSize: '0.95rem'
    },
    badge: (color) => ({
        padding: '4px 8px',
        borderRadius: '6px',
        fontSize: '0.75rem',
        fontWeight: '600',
        background: `rgba(${color}, 0.2)`,
        color: `rgb(${color})`,
        display: 'inline-block'
    }),
    actionBtn: {
        background: 'transparent',
        border: 'none',
        color: '#a0aec0',
        cursor: 'pointer',
        padding: '6px',
        borderRadius: '6px',
        transition: 'all 0.2s'
    },
    // Estilos de Paginación
    pagination: {
        padding: '1rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        color: '#a0aec0',
        fontSize: '0.9rem'
    },
    pageBtn: {
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: 'white',
        padding: '6px 12px',
        borderRadius: '6px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        minWidth: '32px',
        justifyContent: 'center'
    }
};

export default function CollectionsPage() {
    const { 
        activeTab, setActiveTab, searchTerm, setSearchTerm, search,
        // 💡 Aseguramos arrays vacíos por defecto
        personas = [], vehiculos = [], establecimientos = [], 
        loading, deleteItem 
    } = useCollectionStore();

    // --- Estado para Modales ---
    const [modalConfig, setModalConfig] = useState({ 
        type: null, 
        isOpen: false, 
        data: null 
    });

    // --- Estado para Paginación Local ---
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Resetear página al cambiar de pestaña o búsqueda
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchTerm]);

    // Carga inicial de datos al cambiar pestaña
    useEffect(() => {
        search(); 
    }, [activeTab, search]);

    // Handlers
    const handleSearch = (e) => {
        e.preventDefault();
        search();
    };

    const handleDelete = async (collection, id) => {
        if(window.confirm(`¿Eliminar registro ${id}?`)) {
            await deleteItem(collection, id);
        }
    };

    const openModal = (type, data = null) => {
        setModalConfig({ type, isOpen: true, data });
    };

    const closeModal = () => {
        setModalConfig({ ...modalConfig, isOpen: false, data: null });
    };

    // --- Lógica de Datos y Paginación ---
    const getCurrentData = () => {
        let data = [];
        if (activeTab === 'personas') data = personas;
        else if (activeTab === 'vehiculos') data = vehiculos;
        else data = establecimientos;
        return data;
    };

    const currentData = getCurrentData();
    const totalPages = Math.ceil(currentData.length / itemsPerPage);
    
    // Slice de datos para la página actual
    const paginatedData = currentData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // --- Renderizado de Tabla ---
    const renderTable = () => {
        if (loading) return (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#a0aec0' }}>
                <RefreshCw className="spin" size={32} />
                <p style={{ marginTop: '1rem' }}>Cargando datos...</p>
            </div>
        );

        if (currentData.length === 0) return (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#a0aec0' }}>
                <Search size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                <p>No se encontraron registros. Intenta una nueva búsqueda.</p>
            </div>
        );

        // Definición de columnas según tipo
        let columns = [];
        if (activeTab === 'personas') {
            columns = [
                { header: 'DNI / NIE', key: 'id', render: r => <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{r.id}</span> },
                { header: 'Nombre Completo', render: r => <div style={{fontWeight: 500}}>{r.nombre} {r.apellidos}</div> },
                { header: 'Alias', key: 'mote', render: r => r.mote ? <span style={styles.badge('236, 72, 153')}>{r.mote}</span> : <span style={{opacity:0.5}}>-</span> },
                { header: 'Teléfono', key: 'telefono' }
            ];
        } else if (activeTab === 'vehiculos') {
            columns = [
                { header: 'Matrícula', key: 'id', render: r => <span style={styles.badge('245, 158, 11')}>{r.id}</span> },
                { header: 'Vehículo', render: r => <span><b>{r.marca}</b> {r.modelo}</span> },
                { header: 'Color', key: 'color', render: r => <div style={{display:'flex', alignItems:'center', gap:'6px'}}><div style={{width:12, height:12, borderRadius:'50%', background: r.color?.toLowerCase() || '#ccc', border:'1px solid #fff'}}></div> {r.color}</div> },
                { header: 'Titular', key: 'titularNombre' }
            ];
        } else {
            columns = [
                { header: 'CIF', key: 'id', render: r => <span style={{ fontFamily: 'monospace' }}>{r.id}</span> },
                { header: 'Nombre Comercial', key: 'nombreComercial', render: r => <div style={{fontWeight: 600, color: '#34d399'}}>{r.nombreComercial}</div> },
                { header: 'Teléfono', key: 'telefono' },
                { header: 'Dirección', key: 'direccion' }
            ];
        }

        return (
            <>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            {columns.map((col, idx) => <th key={idx} style={styles.th}>{col.header}</th>)}
                            <th style={{ ...styles.th, textAlign: 'right' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedData.map((row) => (
                            <tr key={row.id} style={{ transition: 'background 0.2s' }} 
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                {columns.map((col, idx) => (
                                    <td key={idx} style={styles.td}>
                                        {col.render ? col.render(row) : (row[col.key] || <span style={{opacity:0.5}}>-</span>)}
                                    </td>
                                ))}
                                <td style={{ ...styles.td, textAlign: 'right' }}>
                                    <button 
                                        style={{...styles.actionBtn, marginRight: 8}} 
                                        onClick={() => openModal(activeTab, row)}
                                        title="Editar"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button 
                                        style={{...styles.actionBtn, color: '#ef4444'}} 
                                        onClick={() => handleDelete(activeTab, row.id)}
                                        title="Eliminar"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* --- UI DE PAGINACIÓN --- */}
                {totalPages > 0 && (
                    <div style={styles.pagination}>
                        <span>Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, currentData.length)} de {currentData.length} registros</span>
                        
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button 
                                style={{ ...styles.pageBtn, opacity: currentPage === 1 ? 0.5 : 1 }}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft size={16} /> Anterior
                            </button>
                            
                            {/* Números de página */}
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                // Lógica simple para mostrar páginas cercanas
                                let p = i + 1;
                                if (totalPages > 5 && currentPage > 3) {
                                    p = currentPage - 2 + i;
                                    if (p > totalPages) p = i + (totalPages - 4);
                                }
                                
                                return (
                                    <button 
                                        key={p}
                                        style={{ 
                                            ...styles.pageBtn, 
                                            background: currentPage === p ? 'var(--color-accent-neon)' : styles.pageBtn.background,
                                            color: currentPage === p ? 'black' : 'white',
                                            fontWeight: currentPage === p ? 'bold' : 'normal',
                                            border: currentPage === p ? 'none' : styles.pageBtn.border
                                        }}
                                        onClick={() => setCurrentPage(p)}
                                    >
                                        {p}
                                    </button>
                                );
                            })}

                            <button 
                                style={{ ...styles.pageBtn, opacity: currentPage === totalPages ? 0.5 : 1 }}
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Siguiente <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </>
        );
    };

    return (
        <div style={styles.pageContainer} className="fade-in">
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Base de Datos</h1>
                    <p style={styles.subtitle}>Gestión centralizada de identificaciones, vehículos y locales.</p>
                </div>
            </div>

            {/* Stats Cards / Tabs */}
            <div style={styles.statsGrid}>
                <div 
                    style={{
                        ...styles.statCard, 
                        border: activeTab === 'personas' ? '1px solid #34d399' : styles.statCard.border,
                        transform: activeTab === 'personas' ? 'translateY(-2px)' : 'none'
                    }}
                    onClick={() => setActiveTab('personas')}
                >
                    <div style={styles.statIcon('52, 211, 153')}>
                        <Users size={24} />
                    </div>
                    <div>
                        <h3 style={{margin:0, fontSize: '1.2rem'}}>Personas</h3>
                        <span style={{fontSize:'0.85rem', color:'#a0aec0'}}>Base de datos civil</span>
                    </div>
                </div>

                <div 
                    style={{
                        ...styles.statCard,
                        border: activeTab === 'vehiculos' ? '1px solid #f59e0b' : styles.statCard.border,
                        transform: activeTab === 'vehiculos' ? 'translateY(-2px)' : 'none'
                    }}
                    onClick={() => setActiveTab('vehiculos')}
                >
                    <div style={styles.statIcon('245, 158, 11')}>
                        <Truck size={24} />
                    </div>
                    <div>
                        <h3 style={{margin:0, fontSize: '1.2rem'}}>Vehículos</h3>
                        <span style={{fontSize:'0.85rem', color:'#a0aec0'}}>Registro de parque móvil</span>
                    </div>
                </div>

                <div 
                    style={{
                        ...styles.statCard,
                        border: activeTab === 'establecimientos' ? '1px solid #6366f1' : styles.statCard.border,
                        transform: activeTab === 'establecimientos' ? 'translateY(-2px)' : 'none'
                    }}
                    onClick={() => setActiveTab('establecimientos')}
                >
                    <div style={styles.statIcon('99, 102, 241')}>
                        <Briefcase size={24} />
                    </div>
                    <div>
                        <h3 style={{margin:0, fontSize: '1.2rem'}}>Locales</h3>
                        <span style={{fontSize:'0.85rem', color:'#a0aec0'}}>Establecimientos y comercios</span>
                    </div>
                </div>
            </div>

            {/* Toolbar & Buscador */}
            <div style={styles.toolbar}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={18} style={styles.searchIcon} />
                    <form onSubmit={handleSearch}>
                        <input 
                            style={styles.searchInput}
                            type="text" 
                            placeholder={`Buscar en ${activeTab} por nombre, ID, matrícula...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </form>
                </div>
                
                <button 
                    className="btn-primary" 
                    onClick={handleSearch}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', background: '#34d399', color: '#064e3b', fontWeight: '600', cursor: 'pointer' }}
                >
                    <Search size={18} /> Buscar
                </button>

                <button 
                    className="btn-success" 
                    onClick={() => openModal(activeTab)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: '600', cursor: 'pointer' }}
                >
                    <Plus size={18} /> Nuevo Registro
                </button>
            </div>

            {/* Resultados */}
            <div style={styles.tableContainer}>
                {renderTable()}
            </div>

            {/* Modales */}
            <PersonModal 
                isOpen={modalConfig.isOpen && modalConfig.type === 'personas'} 
                onClose={closeModal} 
                initialData={modalConfig.data} 
            />
            <VehicleModal 
                isOpen={modalConfig.isOpen && modalConfig.type === 'vehiculos'} 
                onClose={closeModal} 
                initialData={modalConfig.data} 
            />
            <EstablishmentModal 
                isOpen={modalConfig.isOpen && modalConfig.type === 'establecimientos'} 
                onClose={closeModal} 
                initialData={modalConfig.data} 
            />
        </div>
    );
}