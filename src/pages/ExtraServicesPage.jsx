// Archivo: /src/pages/ExtraServicesPage.jsx (Integración Final con Botón IRPF y Protección de Carga)

import React, { useEffect, useState } from 'react';
import { useExtraServicesStore } from '../store/extraServicesStore';
import { useGlobalStore } from '../store/globalStore';
import { useAuthStore } from '../store/authStore';
import { 
    Briefcase, Plus, Filter, Printer, Calendar, Search, ChevronDown, FileText,
    // 💡 Iconos para paginación y estadísticas
    ChevronLeft, ChevronRight, TrendingUp 
} from 'react-feather';
import { useNavigate } from 'react-router-dom'; 

import ExtraServicesTable from '../components/ExtraServices/ExtraServicesTable';
import ExtraServiceModal from '../components/Modals/ExtraServiceModal';
import ExtraServicesStats from '../components/ExtraServices/ExtraServicesStats'; // 💡 IMPORTAR ESTADÍSTICAS

function ExtraServicesPage() {
    // 💡 Inicializar hook de navegación
    const navigate = useNavigate();
    
  const { 
    paginatedServices, 
    loading, filters, stats, 
    loadServices, setFilter, generateReport, deleteService,
    currentPage, totalPages, setPage 
  } = useExtraServicesStore();
  
  const { agents } = useGlobalStore();
  const { user } = useAuthStore(); // Usado para la protección
  const isAdmin = user?.role === 'admin' || user?.role === 'supervisor';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Carga inicial PROTEGIDA
  useEffect(() => {
    // 💡 Si no hay usuario cargado, NO HACER NADA AÚN
    if (!user || !user.uid) return;

    if (!filters.startDate) {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        setFilter('startDate', start);
        setFilter('endDate', end);
    }
    
    loadServices(); // Solo se llama si user existe
  }, [user, loadServices, setFilter]); // 💡 Se ejecutará automáticamente cuando 'user' pase de null a objeto y al cambiar el filtro/loadServices (aunque loadServices no debería cambiar)

  // Handlers (Mantenido)
  const handleGeneratePDF = async () => {
      setIsGeneratingPdf(true);
      const result = await generateReport();
      setIsGeneratingPdf(false);
      
      if (result.success) {
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
          alert("Error al generar informe: " + result.message);
      }
  };

  const handleEditService = (service) => {
      setServiceToEdit(service);
      setIsModalOpen(true);
  };

  const handleNewService = () => {
      setServiceToEdit(null);
      setIsModalOpen(true);
  };
  
  const handleDeleteService = async (id) => {
      if(confirm("¿Estás seguro de que quieres eliminar este servicio extraordinario?")) {
          const result = await deleteService(id);
          if (result.success) {
              loadServices(); 
          } else {
              alert("Error al eliminar el servicio: " + result.message);
          }
      }
  };
  
  // Lógica para renderizar números de página (Mantenido)
  const renderPaginationNumbers = () => {
      let pages = [];
      const maxVisiblePages = 5;
      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      if (endPage - startPage < maxVisiblePages - 1) {
          startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }

      for (let p = startPage; p <= endPage; p++) {
          pages.push(
              <button 
                  key={p}
                  className={`button button-sm ${currentPage === p ? 'button-primary' : 'button-ghost'}`}
                  onClick={() => setPage(p)}
                  style={{minWidth: '30px', padding: '0'}}
              >
                  {p}
              </button>
          );
      }
      return pages;
  };


  return (
    <div className="view-container" style={{ padding: '1.5rem', height: 'calc(100vh - 60px)', overflowY: 'auto' }}>
      
      {/* HEADER (Mantenido) */}
      <div className="view-header" style={{marginBottom: '2rem'}}>
        <div className="view-title" style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          <div style={{background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '12px'}}>
              <Briefcase size={28} className="text-accent" style={{color: 'var(--color-accent-neon)'}} />
          </div>
          <div>
              <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '700', color: 'white' }}>Servicios Extraordinarios</h1>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>Gestión y control de horas extra</p>
          </div>
        </div>
      </div>

      {/* BARRA DE CONTROLES Y FILTROS (Mantenido) */}
      <div className="card" style={{ marginBottom: '1.5rem', background: 'var(--glass-dark-bg)', border: '1px solid var(--glass-dark-border)' }}>
        <div className="card-body" style={{ padding: '1.2rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
            
            {/* GRUPO IZQUIERDA: Filtros de Fecha y Agente (Mantenido) */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                
                {/* Filtro de Fechas */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <Calendar size={16} style={{color: 'var(--color-accent-neon)'}}/>
                    <input 
                        type="date" className="input-ghost" 
                        value={filters.startDate} onChange={e => setFilter('startDate', e.target.value)}
                        style={{background: 'transparent', border: 'none', color: 'white', fontSize: '0.9rem', outline: 'none'}}
                    />
                    <span style={{opacity: 0.3}}>—</span>
                    <input 
                        type="date" className="input-ghost" 
                        value={filters.endDate} onChange={e => setFilter('endDate', e.target.value)}
                        style={{background: 'transparent', border: 'none', color: 'white', fontSize: '0.9rem', outline: 'none'}}
                    />
                </div>

                {/* Filtro de Agente (Solo Admin) */}
                {isAdmin && (
                    <div style={{position: 'relative', display: 'flex', alignItems: 'center'}}>
                        <Search size={14} style={{position: 'absolute', left: 12, opacity: 0.5, pointerEvents: 'none', color: 'white'}}/>
                        <select 
                            className="selector"
                            value={filters.agentId}
                            onChange={e => setFilter('agentId', e.target.value)}
                            style={{
                                paddingLeft: '32px', paddingRight: '30px', 
                                minWidth: '200px', height: '38px', 
                                background: 'rgba(255,255,255,0.03)', 
                                border: '1px solid rgba(255,255,255,0.1)', 
                                color: 'white', borderRadius: '8px',
                                appearance: 'none', cursor: 'pointer'
                            }}
                        >
                            <option value="all" style={{color: 'black'}}>Todos los Agentes</option>
                            {agents.map(a => <option key={a.id} value={a.id} style={{color: 'black'}}>{a.name}</option>)}
                        </select>
                        <ChevronDown size={14} style={{position: 'absolute', right: 10, opacity: 0.5, pointerEvents: 'none', color: 'white'}}/>
                    </div>
                )}

                {/* Botón Filtrar */}
                <button 
                    className="button ripple-effect" 
                    onClick={loadServices}
                    style={{
                        background: 'rgba(255,255,255,0.1)', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'white', height: '38px', padding: '0 15px'
                    }}
                >
                    <Filter size={16} /> <span style={{marginLeft: 6}}>Filtrar</span>
                </button>
            </div>

            {/* GRUPO DERECHA: Acciones (Informe, IRPF y Nuevo) */}
            <div style={{ display: 'flex', gap: '12px' }}>

                {/* 💡 BOTÓN CALCULADORA IRPF */}
                <button 
                    className="button ripple-effect" 
                    onClick={() => navigate('/calculadora-irpf')}
                    title="Simular impacto en IRPF"
                    style={{borderColor: '#fbbf24', color: '#fbbf24', background: 'transparent', boxShadow: '0 0 10px rgba(251, 191, 36, 0.1)'}}
                >
                    <TrendingUp size={18} /> 
                    <span style={{marginLeft: 8}}>Simular IRPF</span>
                </button>
                
                {/* Botón Informe PDF */}
                <button 
                    className="button ripple-effect" 
                    onClick={handleGeneratePDF}
                    disabled={isGeneratingPdf}
                    style={{
                        background: 'transparent',
                        border: '1px solid #60a5fa', 
                        color: '#60a5fa',
                        boxShadow: '0 0 10px rgba(96, 165, 250, 0.1)'
                    }}
                >
                    {isGeneratingPdf ? <div className="loading-spinner-small"></div> : <FileText size={18} />}
                    <span style={{marginLeft: 8}}>Informe PDF</span>
                </button>

                {/* Botón Nuevo */}
                <button className="button btn-gradient-primary ripple-effect" onClick={handleNewService}>
                    <Plus size={18} /> 
                    <span style={{marginLeft: 8}}>Nuevo Servicio</span>
                </button>
            </div>
        </div>
      </div>

      {/* 💡 1. INSERTAR ESTADÍSTICAS AQUÍ */}
      <ExtraServicesStats />

      {/* TABLA DE RESULTADOS Y PAGINACIÓN */}
      <div className="card" style={{ minHeight: '300px', background: 'var(--glass-dark-bg)', border: '1px solid var(--glass-dark-border)', display: 'flex', flexDirection: 'column', padding: 0 }}>
          {loading && !paginatedServices.length ? (
              <div className="loading-spinner-container" style={{padding: '3rem'}}><div className="loading-spinner"></div></div>
          ) : (
              <>
                  <ExtraServicesTable 
                      services={paginatedServices} // 💡 PASAR PAGINADOS
                      onEdit={handleEditService}
                      onDelete={handleDeleteService} 
                  />

                  {/* 💡 2. BARRA DE PAGINACIÓN */}
                  <div className="pagination-bar" style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '1rem', borderTop: '1px solid var(--glass-dark-border)'
                  }}>
                      <div style={{fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)'}}>
                          Mostrando página <strong style={{color: 'white'}}>{currentPage}</strong> de <strong>{totalPages}</strong>
                          <span style={{marginLeft: '10px'}}>({stats.totalServicios || 0} registros totales)</span>
                      </div>
                      
                      <div style={{display: 'flex', gap: '0.5rem'}}>
                          <button 
                              className="icon-button" 
                              disabled={currentPage === 1}
                              onClick={() => setPage(currentPage - 1)}
                              style={{opacity: currentPage === 1 ? 0.5 : 1}}
                          >
                              <ChevronLeft size={18} />
                          </button>
                          
                          {/* Números de página */}
                          <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                             {renderPaginationNumbers()}
                          </div>

                          <button 
                              className="icon-button" 
                              disabled={currentPage === totalPages}
                              onClick={() => setPage(currentPage + 1)}
                              style={{opacity: currentPage === totalPages ? 0.5 : 1}}
                          >
                              <ChevronRight size={18} />
                          </button>
                      </div>
                  </div>
              </>
          )}
      </div>

      {/* MODAL DE CREACIÓN/EDICIÓN */}
      <ExtraServiceModal 
          isOpen={isModalOpen} 
          onClose={() => {
              setIsModalOpen(false);
              setServiceToEdit(null); // Limpiar al cerrar
              loadServices(); // Recargar la lista tras guardar/cancelar
          }}
          serviceToEdit={serviceToEdit}
      />

    </div>
  );
}

export default ExtraServicesPage;