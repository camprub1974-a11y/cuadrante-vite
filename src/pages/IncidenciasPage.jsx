import React, { useEffect } from 'react';
import { useIncidenciasStore } from '../store/incidenciasStore';
import { useAuthStore } from '../store/authStore';
import { 
    AlertTriangle, CheckCircle, Clock, MapPin, Plus, 
    Filter, Search, ArrowRight, Eye 
} from 'react-feather';
import { format } from 'date-fns';
import IncidenciaModal from '../components/Modals/IncidenciaModal';

// Reutilizamos estilos glassmorphism
const styles = {
    // ... Copia los estilos base de DotacionesPage o usa una clase común
    pageContainer: { padding: '2rem', height: 'calc(100vh - 60px)', overflowY: 'auto', color: '#e2e8f0' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' },
    card: { 
        background: 'var(--glass-dark-bg)', 
        border: '1px solid rgba(255,255,255,0.1)', 
        borderRadius: '16px', 
        padding: '1.5rem',
        position: 'relative',
        overflow: 'hidden'
    },
    badge: (status) => ({
        padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold',
        background: status === 'pendiente' ? 'rgba(239, 68, 68, 0.2)' : 
                   status === 'tramitada' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(16, 185, 129, 0.2)',
        color: status === 'pendiente' ? '#ef4444' : 
               status === 'tramitada' ? '#fbbf24' : '#10b981',
        border: `1px solid ${status === 'pendiente' ? '#ef4444' : status === 'tramitada' ? '#fbbf24' : '#10b981'}`
    })
};

export default function IncidenciasPage() {
    const { 
        incidencias, 
        loadIncidencias, 
        loading, 
        filters, 
        setFilter, 
        stats, 
        openModal, 
        closeModal, // 💡 CORRECCIÓN AÑADIDA
        modalOpen, 
        selectedIncidencia 
    } = useIncidenciasStore();

    const { user } = useAuthStore();
    const isAdmin = user?.role === 'admin' || user?.role === 'supervisor';

    useEffect(() => {
        loadIncidencias();
    }, [filters.status]);

    return (
        <div style={styles.pageContainer} className="fade-in">
            {/* Header */}
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center'}}>
                <div>
                    <h1 style={{fontSize: '1.8rem', fontWeight: 700, margin: 0, color: 'white'}}>Incidencias Vía Pública</h1>
                    <p style={{color: 'rgba(255,255,255,0.5)', margin: '5px 0 0'}}>Reporte y seguimiento de desperfectos</p>
                </div>
                <button className="button btn-gradient-primary" onClick={() => openModal(null)}>
                    <Plus size={18} style={{marginRight: 8}}/> Nueva Incidencia
                </button>
            </div>

            {/* Stats (Solo Admin visualmente relevante, pero útil para todos) */}
            <div style={{display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap'}}>
                <div style={{...styles.card, flex: 1, borderColor: '#ef4444'}}>
                    <div style={{fontSize: '2rem', fontWeight: 700, color: '#ef4444'}}>{stats.pendientes}</div>
                    <div style={{color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem'}}>Pendientes</div>
                </div>
                <div style={{...styles.card, flex: 1, borderColor: '#fbbf24'}}>
                    <div style={{fontSize: '2rem', fontWeight: 700, color: '#fbbf24'}}>{stats.tramitadas}</div>
                    <div style={{color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem'}}>En Trámite</div>
                </div>
                <div style={{...styles.card, flex: 1, borderColor: '#10b981'}}>
                    <div style={{fontSize: '2rem', fontWeight: 700, color: '#10b981'}}>{stats.resueltas}</div>
                    <div style={{color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem'}}>Resueltas</div>
                </div>
            </div>

            {/* Filtros */}
            <div style={{marginBottom: '1.5rem', display: 'flex', gap: '10px'}}>
                {['all', 'pendiente', 'tramitada', 'resuelta'].map(st => (
                    <button 
                        key={st}
                        onClick={() => setFilter('status', st)}
                        style={{
                            padding: '8px 16px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)',
                            background: filters.status === st ? 'rgba(255,255,255,0.1)' : 'transparent',
                            color: filters.status === st ? 'white' : 'rgba(255,255,255,0.5)',
                            textTransform: 'capitalize', cursor: 'pointer'
                        }}
                    >
                        {st === 'all' ? 'Todas' : st}
                    </button>
                ))}
            </div>

            {/* Grid */}
            {loading ? <p>Cargando...</p> : (
                <div style={styles.grid}>
                    {incidencias.map(inc => (
                        <div key={inc.id} style={styles.card}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem'}}>
                                <span style={styles.badge(inc.status)}>{inc.status.toUpperCase()}</span>
                                <span style={{fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)'}}>
                                    {inc.createdAt ? format(inc.createdAt, 'dd/MM/yyyy') : '-'}
                                </span>
                            </div>
                            
                            <h3 style={{margin: '0 0 0.5rem 0', color: 'white'}}>{inc.tipo}</h3>
                            <p style={{color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '1rem', height: '40px', overflow: 'hidden'}}>
                                {inc.description}
                            </p>

                            <div style={{display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginBottom: '1rem'}}>
                                <MapPin size={14}/> {inc.address || 'Ubicación registrada'}
                            </div>

                            <button 
                                className="button button-secondary" 
                                style={{width: '100%', justifyContent: 'center'}}
                                onClick={() => openModal(inc)}
                            >
                                {isAdmin ? 'Gestionar' : 'Ver Detalles'}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {modalOpen && <IncidenciaModal onClose={closeModal} incidencia={selectedIncidencia} />}
        </div>
    );
}