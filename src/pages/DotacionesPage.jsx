// Archivo: /src/pages/DotacionesPage.jsx
// ✨ Módulo de Gestión de Dotaciones - Armamento, Vestuario y Equipamiento
// Basado en normativa andaluza: Ley 6/2023, Decreto 250/2007, Orden 15/04/2009
// VERSIÓN FINAL - Sin bucle infinito, con useRef correcto

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useDotacionesStore, TIPOS_ARMAS, TIPOS_VESTUARIO, TIPOS_EQUIPAMIENTO } from '../store/dotacionesStore';
import { useGlobalStore } from '../store/globalStore';
import { useAuthStore } from '../store/authStore';
import {
  Shield, Target, Tag, Package, Users, AlertTriangle, CheckCircle,
  Calendar, Clock, Search, Filter, Plus, Eye, Edit2, Trash2,
  RotateCw, Download, ChevronRight, User, FileText, Award,
  Crosshair, AlertCircle, Settings, BarChart2, List, ChevronLeft
} from 'react-feather';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Modales
import AsignarArmaModal from '../components/Modals/AsignarArmaModal';
import AsignarVestuarioModal from '../components/Modals/AsignarVestuarioModal';
import AsignarEquipamientoModal from '../components/Modals/AsignarEquipamientoModal';
import RevistaArmasModal from '../components/Modals/RevistaArmasModal';
import PracticaTiroModal from '../components/Modals/PracticaTiroModal';
import DotacionDetalleModal from '../components/Modals/DotacionDetalleModal';

// =========================================
// HELPER: Formato de Fechas Seguro
// =========================================
const formatDateSafe = (dateInput) => {
  if (!dateInput) return '---';
  try {
    let date;
    if (dateInput.toDate && typeof dateInput.toDate === 'function') {
      date = dateInput.toDate();
    } else {
      date = new Date(dateInput);
    }
    if (isNaN(date.getTime())) return 'Fecha inválida';
    return format(date, 'dd/MM/yyyy', { locale: es });
  } catch (e) {
    return 'Error';
  }
};

// =========================================
// ESTILOS (Glassmorphism)
// =========================================
const styles = {
    pageContainer: {
        padding: '2rem',
        height: 'calc(100vh - 60px)',
        overflowY: 'auto',
        color: '#e2e8f0'
    },
    header: {
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
    },
    titleGroup: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem'
    },
    titleIcon: {
        background: 'rgba(0, 255, 136, 0.1)',
        padding: '12px',
        borderRadius: '16px',
        color: 'var(--color-accent-neon)',
        border: '1px solid rgba(0, 255, 136, 0.2)',
        boxShadow: '0 0 15px rgba(0, 255, 136, 0.1)'
    },
    title: {
        fontSize: '1.8rem',
        fontWeight: '700',
        color: 'white',
        margin: 0
    },
    subtitle: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: '0.9rem',
        marginTop: '4px'
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
    },
    statCard: (color) => ({
        background: 'var(--glass-dark-bg)',
        backdropFilter: 'blur(10px)',
        border: `1px solid ${color}33`,
        borderRadius: '16px',
        padding: '1.5rem',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.3s ease',
        cursor: 'default'
    }),
    statIcon: (color) => ({
        background: `${color}20`,
        color: color,
        padding: '10px',
        borderRadius: '12px',
        width: 'fit-content',
        marginBottom: '1rem'
    }),
    statValue: {
        fontSize: '2rem',
        fontWeight: '700',
        color: 'white',
        lineHeight: 1
    },
    statLabel: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: '0.85rem',
        marginTop: '0.5rem',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    },
    toolbar: {
        background: 'var(--glass-dark-bg)',
        border: '1px solid var(--glass-dark-border)',
        borderRadius: '16px',
        padding: '1rem',
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap'
    },
    searchInput: {
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '10px',
        padding: '0.7rem 1rem 0.7rem 2.5rem',
        color: 'white',
        width: '100%',
        minWidth: '250px',
        outline: 'none',
        fontSize: '0.9rem'
    },
    select: {
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '10px',
        padding: '0.7rem 1rem',
        color: 'white',
        outline: 'none',
        minWidth: '180px',
        fontSize: '0.9rem',
        cursor: 'pointer'
    },
    agentCard: {
        background: 'var(--glass-dark-bg)',
        border: '1px solid var(--glass-dark-border)',
        borderRadius: '12px',
        padding: '1rem 1.5rem',
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto auto',
        gap: '1.5rem',
        alignItems: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        marginBottom: '0.8rem'
    },
    agentAvatar: {
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '1.1rem'
    },
    detailSection: {
        background: 'rgba(30, 41, 59, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '16px',
        padding: '1.5rem',
        marginBottom: '1.5rem'
    },
    itemCard: (color) => ({
        background: 'rgba(0, 0, 0, 0.2)',
        borderLeft: `4px solid ${color}`,
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '10px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    })
};

export default function DotacionesPage() {
  const { user } = useAuthStore();
  const { agents } = useGlobalStore();
  const {
    dotaciones, selectedAgente, loading, stats, filters, currentView, modals,
    setCurrentView, setSelectedAgente, setFilter, loadDotacionesAgente,
    loadAllDotaciones, loadStats, openModal, closeModal,
    necesitaRevista, necesitaRenovacion, necesitaPracticaTiro,
    aceptarDotacion
  } = useDotacionesStore();

  const isAdmin = user?.role === 'admin' || user?.role === 'supervisor';
  const [searchTerm, setSearchTerm] = useState('');

  // =========================================
  // 1. CARGA INICIAL - SOLO UNA VEZ
  // =========================================
  const hasInitialized = useRef(false);

  useEffect(() => {
    // BLOQUEO ESTRICTO: Solo ejecutar una vez
    if (hasInitialized.current) {
      return;
    }

    // Para Admin
    if (isAdmin) {
      console.log('[DotacionesPage] Inicializando Admin');
      hasInitialized.current = true;
      loadStats();
      loadAllDotaciones();
      return;
    }

    // Para Agente normal (necesita agents cargados)
    if (user?.agentId && agents && agents.length > 0) {
      const myProfile = agents.find(
        a => String(a.id) === String(user.agentId) || 
             String(a.agentId) === String(user.agentId)
      );
      
      if (myProfile) {
        console.log('[DotacionesPage] Inicializando Agente:', myProfile.id);
        hasInitialized.current = true;
        setSelectedAgente(myProfile);
        setCurrentView('agente');
        loadDotacionesAgente(myProfile.id);
      }
    }
  }, [user, isAdmin, agents]); // Solo dependencias estables

  // =========================================
  // 2. CÁLCULO DE PENDIENTES DE ACEPTACIÓN
  // =========================================
  const pendientesAceptacion = useMemo(() => {
    if (!selectedAgente) return [];
    
    const agenteIdStr = String(selectedAgente.id);
    
    const armasPend = (dotaciones.armas || [])
      .filter(a => String(a.agenteId) === agenteIdStr && a.estado === 'pendiente_aceptacion')
      .map(i => ({
        ...i, 
        cat: 'armas', 
        label: 'Arma', 
        nombreArticulo: `${i.marca || ''} ${i.modelo || ''}`.trim() || i.tipoArma
      }));
      
    const ropaPend = (dotaciones.vestuario || [])
      .filter(v => String(v.agenteId) === agenteIdStr && v.estado === 'pendiente_aceptacion')
      .map(i => ({
        ...i, 
        cat: 'vestuario', 
        label: 'Vestuario', 
        nombreArticulo: TIPOS_VESTUARIO[i.tipo]?.nombre || i.tipo
      }));
      
    const equipoPend = (dotaciones.equipamiento || [])
      .filter(e => String(e.agenteId) === agenteIdStr && e.estado === 'pendiente_aceptacion')
      .map(i => ({
        ...i, 
        cat: 'equipamiento', 
        label: 'Equipo', 
        nombreArticulo: TIPOS_EQUIPAMIENTO[i.tipo]?.nombre || i.tipo
      }));
    
    return [...armasPend, ...ropaPend, ...equipoPend];
  }, [dotaciones, selectedAgente]);

  // =========================================
  // Handler para aceptar asignación
  // =========================================
  const handleAceptar = async (item) => {
    if (window.confirm(`¿Confirmas la recepción de: ${item.nombreArticulo || item.tipo}?`)) {
      const result = await aceptarDotacion(item.id, item.cat);
      if (result.success) {
        alert('Recepción confirmada correctamente.');
      } else {
        alert('Error: ' + (result.message || 'No se pudo confirmar'));
      }
    }
  };

  // =========================================
  // Filtrar agentes para la lista (solo Admin)
  // =========================================
  const agentesFiltered = useMemo(() => {
    if (!agents) return [];
    return agents.filter(agent => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          agent.name?.toLowerCase().includes(search) ||
          agent.agentId?.toString().includes(search)
        );
      }
      return true;
    });
  }, [agents, searchTerm]);

  // =========================================
  // Handlers Navegación
  // =========================================
  const handleSelectAgente = async (agente) => {
    console.log('[DotacionesPage] Seleccionando agente:', agente.id);
    setSelectedAgente(agente);
    setCurrentView('agente');
    await loadDotacionesAgente(agente.id);
  };

  const handleBack = () => {
    setSelectedAgente(null);
    setCurrentView('dashboard');
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div style={styles.pageContainer} className="fade-in">
      
      {/* --- HEADER --- */}
      <div style={styles.header}>
        <div style={styles.titleGroup}>
          <div style={styles.titleIcon}>
            <Shield size={32} />
          </div>
          <div>
            <h1 style={styles.title}>Dotaciones y Equipamiento</h1>
            <p style={styles.subtitle}>Gestión integral de recursos materiales y armamento</p>
          </div>
        </div>
      </div>

      {/* --- VISTA DASHBOARD (SOLO ADMINS) --- */}
      {currentView === 'dashboard' && isAdmin && (
        <>
          {/* Stats Cards */}
          <div style={styles.statsGrid}>
            <div style={styles.statCard('#00ff88')}>
              <div style={styles.statIcon('#00ff88')}><Target size={24}/></div>
              <div style={styles.statValue}>{stats.totalArmas || 0}</div>
              <div style={styles.statLabel}>Armas Asignadas</div>
            </div>
            <div style={styles.statCard('#3b82f6')}>
              <div style={styles.statIcon('#3b82f6')}><Tag size={24}/></div>
              <div style={styles.statValue}>{stats.totalVestuario || 0}</div>
              <div style={styles.statLabel}>Prendas Entregadas</div>
            </div>
            <div style={styles.statCard('#8b5cf6')}>
              <div style={styles.statIcon('#8b5cf6')}><Package size={24}/></div>
              <div style={styles.statValue}>{stats.totalEquipamiento || 0}</div>
              <div style={styles.statLabel}>Equipos Asignados</div>
            </div>
            <div style={styles.statCard('#fbbf24')}>
              <div style={styles.statIcon('#fbbf24')}><AlertTriangle size={24}/></div>
              <div style={styles.statValue}>{stats.pendientesRevista || 0}</div>
              <div style={styles.statLabel}>Revistas Pendientes</div>
            </div>
          </div>

          {/* Barra de Herramientas */}
          <div style={styles.toolbar}>
            <div style={{position: 'relative', flex: 1}}>
              <Search size={18} style={{position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)'}}/>
              <input 
                style={styles.searchInput} 
                placeholder="Buscar agente..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              style={styles.select}
              value={filters.tipo}
              onChange={e => setFilter('tipo', e.target.value)}
            >
              <option value="all" style={{color:'black'}}>Todos los recursos</option>
              <option value="armas" style={{color:'black'}}>Armamento</option>
              <option value="vestuario" style={{color:'black'}}>Vestuario</option>
              <option value="equipamiento" style={{color:'black'}}>Equipamiento</option>
            </select>
          </div>

          {/* Lista de Agentes */}
          <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
            {loading && !agents ? (
              <div style={{textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.5)'}}>
                <RotateCw className="spin" size={32}/>
                <p style={{marginTop: 10}}>Cargando datos...</p>
              </div>
            ) : (
              agentesFiltered.map((agente, idx) => (
                <div 
                  key={agente.id} 
                  style={{...styles.agentCard, animationDelay: `${idx * 0.05}s`}}
                  onClick={() => handleSelectAgente(agente)}
                  className="hover-scale"
                >
                  <div style={styles.agentAvatar}>{getInitials(agente.name)}</div>
                  <div>
                    <h3 style={{margin: '0 0 4px 0', color: 'white', fontSize: '1.1rem'}}>{agente.name}</h3>
                    <p style={{margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem'}}>Agente #{agente.agentId}</p>
                  </div>
                  <div style={{display: 'flex', gap: '1.5rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem'}}>
                    <span style={{display:'flex', alignItems:'center', gap:6}}><Target size={14}/> Dotación</span>
                  </div>
                  <ChevronRight size={20} color="rgba(255,255,255,0.3)"/>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* --- VISTA DETALLE AGENTE --- */}
      {currentView === 'agente' && selectedAgente && (
        <div className="fade-in">
          {/* Header Detalle */}
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '1.5rem'}}>
              {isAdmin && (
                <button 
                  onClick={handleBack}
                  style={{background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '10px', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white'}}
                  title="Volver al listado"
                >
                  <ChevronLeft size={20}/>
                </button>
              )}
              
              <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                <div style={{...styles.agentAvatar, width: 56, height: 56, fontSize: '1.5rem'}}>{getInitials(selectedAgente.name)}</div>
                <div>
                  <h2 style={{margin: '0 0 4px 0', color: 'white', fontSize: '1.4rem'}}>{selectedAgente.name}</h2>
                  <p style={{margin: 0, color: 'rgba(255,255,255,0.5)'}}>TIP: {selectedAgente.agentId}</p>
                </div>
              </div>
            </div>
            
            {isAdmin && (
              <div style={{display: 'flex', gap: '10px'}}>
                <button className="button button-secondary" onClick={() => openModal('revistaArmas')}>
                  <Calendar size={16} style={{marginRight:8}}/> Revista
                </button>
                <button className="button button-secondary" onClick={() => openModal('practicaTiro')}>
                  <Crosshair size={16} style={{marginRight:8}}/> Tiro
                </button>
              </div>
            )}
          </div>

          {/* SECCIÓN: PENDIENTES DE ACEPTACIÓN */}
          {pendientesAceptacion.length > 0 && (
            <div style={{marginBottom: '2rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '16px', padding: '1.5rem'}}>
              <h3 style={{margin: '0 0 1rem 0', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '10px'}}>
                <Clock size={20}/> Tienes dotaciones pendientes de aceptar
              </h3>
              <div style={{display: 'grid', gap: '10px'}}>
                {pendientesAceptacion.map(item => (
                  <div key={item.id} style={{background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'}}>
                    <div>
                      <span style={{fontSize: '0.7rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', display: 'block'}}>
                        {item.label} • Asignado el {formatDateSafe(item.fechaAsignacion || item.fechaEntrega)}
                      </span>
                      <strong style={{color: 'white', fontSize: '1rem'}}>
                        {item.nombreArticulo || item.tipo} {item.modelo ? ` - ${item.modelo}` : ''}
                      </strong>
                      {item.talla && (
                        <span style={{marginLeft: '10px', background:'rgba(255,255,255,0.1)', padding:'2px 6px', borderRadius:'4px', fontSize:'0.8rem'}}>
                          Talla: {item.talla}
                        </span>
                      )}
                    </div>
                    <button 
                      className="button btn-gradient-success" 
                      onClick={() => handleAceptar(item)} 
                      style={{padding: '8px 16px', fontSize: '0.9rem'}}
                      disabled={loading}
                    >
                      {loading ? (
                        <><RotateCw size={16} className="spin" style={{marginRight: 5}}/> Procesando...</>
                      ) : (
                        <><CheckCircle size={16} style={{marginRight: 5}}/> Confirmar Recepción</>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECCIÓN: ARMAMENTO */}
          <div style={styles.detailSection}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center'}}>
              <h3 style={{margin: 0, color: '#ef4444', display: 'flex', gap: 10, alignItems: 'center'}}>
                <Target size={20}/> Armamento
              </h3>
              {isAdmin && (
                <button className="button button-sm btn-gradient-primary" onClick={() => openModal('asignarArma')}>
                  <Plus size={16}/> Asignar
                </button>
              )}
            </div>
            
            {(dotaciones.armas || [])
              .filter(a => String(a.agenteId) === String(selectedAgente.id) && a.estado === 'activa')
              .map(arma => (
                <div key={arma.id} style={styles.itemCard('#ef4444')}>
                  <div>
                    <div style={{fontWeight: 'bold', color: 'white'}}>{arma.marca} {arma.modelo}</div>
                    <div style={{fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)'}}>Serie: {arma.numeroSerie}</div>
                  </div>
                  <div style={{display: 'flex', gap: 10, alignItems: 'center'}}>
                    {necesitaRevista && necesitaRevista(arma.ultimaRevista) && (
                      <span style={{fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '4px 8px', borderRadius: '4px', display:'flex', alignItems:'center', gap:4}}>
                        <AlertCircle size={12}/> Revista Pendiente
                      </span>
                    )}
                    <div style={{color:'rgba(255,255,255,0.5)', fontSize:'0.85rem'}}>
                      {formatDateSafe(arma.fechaAsignacion)}
                    </div>
                    <button className="icon-button" onClick={() => openModal('detalleAsignacion', { dotacion: arma, tipo: 'armas' })}>
                      <Eye size={16}/>
                    </button>
                  </div>
                </div>
              ))}
            {(dotaciones.armas || []).filter(a => String(a.agenteId) === String(selectedAgente.id) && a.estado === 'activa').length === 0 && (
              <p style={{color:'rgba(255,255,255,0.3)', fontStyle:'italic'}}>No tiene armamento activo.</p>
            )}
          </div>

          {/* SECCIÓN: VESTUARIO */}
          <div style={styles.detailSection}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center'}}>
              <h3 style={{margin: 0, color: '#3b82f6', display: 'flex', gap: 10, alignItems: 'center'}}>
                <Tag size={20}/> Vestuario
              </h3>
              {isAdmin && (
                <button className="button button-sm btn-gradient-primary" onClick={() => openModal('asignarVestuario')}>
                  <Plus size={16}/> Asignar
                </button>
              )}
            </div>
            {(dotaciones.vestuario || [])
              .filter(v => String(v.agenteId) === String(selectedAgente.id) && v.estado === 'activa')
              .map(prenda => (
                <div key={prenda.id} style={styles.itemCard('#3b82f6')}>
                  <div>
                    <div style={{fontWeight: 'bold', color: 'white'}}>{TIPOS_VESTUARIO[prenda.tipo]?.nombre || prenda.tipo}</div>
                    <div style={{fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)'}}>Talla: {prenda.talla}</div>
                  </div>
                  <div style={{display:'flex', gap: 10, alignItems:'center'}}>
                    <div style={{fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)'}}>
                      {formatDateSafe(prenda.fechaEntrega)}
                    </div>
                    <button className="icon-button" onClick={() => openModal('detalleAsignacion', { dotacion: prenda, tipo: 'vestuario' })}>
                      <Eye size={16}/>
                    </button>
                  </div>
                </div>
              ))}
            {(dotaciones.vestuario || []).filter(v => String(v.agenteId) === String(selectedAgente.id) && v.estado === 'activa').length === 0 && (
              <p style={{color:'rgba(255,255,255,0.3)', fontStyle:'italic'}}>Sin vestuario asignado.</p>
            )}
          </div>

          {/* SECCIÓN: EQUIPAMIENTO */}
          <div style={styles.detailSection}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center'}}>
              <h3 style={{margin: 0, color: '#8b5cf6', display: 'flex', gap: 10, alignItems: 'center'}}>
                <Package size={20}/> Equipamiento
              </h3>
              {isAdmin && (
                <button className="button button-sm btn-gradient-primary" onClick={() => openModal('asignarEquipamiento')}>
                  <Plus size={16}/> Asignar
                </button>
              )}
            </div>
            {(dotaciones.equipamiento || [])
              .filter(e => String(e.agenteId) === String(selectedAgente.id) && e.estado === 'activa')
              .map(equipo => (
                <div key={equipo.id} style={styles.itemCard('#8b5cf6')}>
                  <div>
                    <div style={{fontWeight: 'bold', color: 'white'}}>{TIPOS_EQUIPAMIENTO[equipo.tipo]?.nombre || equipo.tipo}</div>
                    <div style={{fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)'}}>{equipo.marca} {equipo.modelo}</div>
                  </div>
                  <div style={{display:'flex', gap: 10, alignItems:'center'}}>
                    <div style={{fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)'}}>
                      {formatDateSafe(equipo.fechaAsignacion)}
                    </div>
                    <button className="icon-button" onClick={() => openModal('detalleAsignacion', { dotacion: equipo, tipo: 'equipamiento' })}>
                      <Eye size={16}/>
                    </button>
                  </div>
                </div>
              ))}
            {(dotaciones.equipamiento || []).filter(e => String(e.agenteId) === String(selectedAgente.id) && e.estado === 'activa').length === 0 && (
              <p style={{color:'rgba(255,255,255,0.3)', fontStyle:'italic'}}>Sin equipamiento asignado.</p>
            )}
          </div>
        </div>
      )}

      {/* --- MODALES --- */}
      {modals.asignarArma && selectedAgente && (
        <AsignarArmaModal agente={selectedAgente} onClose={() => closeModal('asignarArma')} />
      )}
      
      {modals.asignarVestuario && selectedAgente && (
        <AsignarVestuarioModal agente={selectedAgente} onClose={() => closeModal('asignarVestuario')} />
      )}
      
      {modals.asignarEquipamiento && selectedAgente && (
        <AsignarEquipamientoModal agente={selectedAgente} onClose={() => closeModal('asignarEquipamiento')} />
      )}
      
      {modals.revistaArmas && selectedAgente && (
        <RevistaArmasModal 
          agente={selectedAgente} 
          armas={(dotaciones.armas || []).filter(a => String(a.agenteId) === String(selectedAgente.id))} 
          onClose={() => closeModal('revistaArmas')} 
        />
      )}
      
      {modals.practicaTiro && selectedAgente && (
        <PracticaTiroModal 
          agente={selectedAgente} 
          armas={(dotaciones.armas || []).filter(a => String(a.agenteId) === String(selectedAgente.id) && a.estado === 'activa')}
          onClose={() => closeModal('practicaTiro')} 
        />
      )}
      
      {modals.detalleAsignacion && (
        <DotacionDetalleModal 
          dotacion={modals.detalleAsignacion.dotacion} 
          tipo={modals.detalleAsignacion.tipo} 
          onClose={() => closeModal('detalleAsignacion')} 
        />
      )}

      <style>{`
        .hover-scale:hover { transform: translateY(-2px); border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}