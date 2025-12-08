// Archivo: /src/pages/FusionadorPage.jsx (ORDEN VISUAL CORRECTO + MEJORADO)

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  getRegistroById, 
  getRegistroComponentes, 
  updateRegistro,
  addRegistroComponente,
  deleteRegistroComponente,
  updateRegistroComponentesOrden
} from '../../js/dataController';
import TemplateModal from '../components/TemplateModal'; 

import { 
  Layers, ArrowLeft, Eye, Trash2, FilePlus, RefreshCw, CheckCircle, Zap
} from 'react-feather';

import '../../css/views/_registro-view.css'; 
import '../../css/components/_loading.css';

function FusionadorPage() {
  const { id: documentoId } = useParams(); 
  const navigate = useNavigate();

  // --- Estado ---
  const [baseDocument, setBaseDocument] = useState(null);
  const [componentes, setComponentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFusing, setIsFusing] = useState(false);
  
  // Estado del Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('portada');

  // --- Carga de Datos ---
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const docData = await getRegistroById(documentoId);
      if (!docData) throw new Error("Documento no encontrado.");
      
      const compData = await getRegistroComponentes(documentoId);
      
      setBaseDocument(docData);
      // Ordenar componentes por el campo 'orden'
      const sortedComponents = compData.sort((a, b) => (a.orden || 0) - (b.orden || 0));
      setComponentes(sortedComponents);
      
      // 💡 LÓGICA DE BLOQUEO:
      // Solo bloqueamos si está fusionando o completado.
      // Si está 'borrador' o 'fallido', permitimos editar.
      const isLocked = docData.status === 'fusionando' || docData.status === 'completado';
      setIsFusing(isLocked);
      
      console.log(`[Fusionador] Documento cargado. Estado: ${docData.status}, Bloqueado: ${isLocked}`);

    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [documentoId]);

  useEffect(() => {
    if (!documentoId) return;
    loadData();
  }, [documentoId, loadData]);

  // --- MANEJADORES GENERALES ---

  const handleOpenModal = (type) => {
    setModalType(type);
    setIsModalOpen(true);
  };

  const handleComponentCreated = async (newComponentData) => {
    const componentToSave = {
      ...newComponentData,
      orden: componentes.length + 1 
    };

    try {
      await addRegistroComponente(documentoId, componentToSave);
      loadData(); 
      if(window.displayMessage) window.displayMessage('Componente añadido correctamente.', 'success');
    } catch (error) {
      alert("Error al guardar el componente.");
    }
  };

  const handleDeleteComponent = async (componentId) => {
      if(!confirm("¿Eliminar este componente?")) return;
      try {
          await deleteRegistroComponente(documentoId, componentId);
          loadData();
          if(window.displayMessage) window.displayMessage('Componente eliminado correctamente.', 'info');
      } catch (error) {
          alert("Error al eliminar.");
      }
  };

  const handleFusionSubmit = async () => {
    const confirmMsg = baseDocument.status === 'fallido' 
      ? '¿Reintentar el proceso de fusión?'
      : '¿Iniciar el proceso de fusión final? Esta acción no se puede deshacer.';
      
    if (!confirm(confirmMsg)) return;
    
    setIsFusing(true);
    if(window.showLoading) window.showLoading('Iniciando proceso...');
    
    try {
      await updateRegistro(documentoId, { status: 'fusionando' });
      setBaseDocument(prev => ({ ...prev, status: 'fusionando' }));
      
      if(window.displayMessage) window.displayMessage('Fusión en progreso. Serás redirigido.', 'info');
      
      // ========================================================
      // === 💡 CORRECCIÓN: NAVEGACIÓN SIN /app ===
      // ========================================================
      setTimeout(() => navigate('/registros'), 2000);
      // ========================================================

    } catch (err) {
      alert(`Error: ${err.message}`);
      setIsFusing(false);
      if(window.hideLoading) window.hideLoading();
    }
  };
  
  // --- LÓGICA VISUAL DE LA TABLA (ORDEN AUTOMÁTICO) ---
  // Construye una lista "virtual" que muestra el orden real de fusión:
  // [Portadas] → [Atestado Base] → [Otros]
  const getVirtualList = () => {
    const portadas = componentes.filter(c => c.type && c.type.toLowerCase().includes('portada'));
    const otros = componentes.filter(c => !c.type || !c.type.toLowerCase().includes('portada'));

    return [
      ...portadas.map(c => ({ 
        ...c, 
        isBase: false, 
        realIndex: componentes.findIndex(x => x.id === c.id),
        displayType: 'Portada'
      })),
      { 
        id: 'base-doc', 
        name: 'Documento Principal (Atestado)', 
        type: 'Base', 
        isBase: true, 
        pdfUrl: baseDocument?.pdfUrl,
        displayType: 'Base'
      },
      ...otros.map(c => ({ 
        ...c, 
        isBase: false, 
        realIndex: componentes.findIndex(x => x.id === c.id),
        displayType: c.type
      }))
    ];
  };

  const virtualList = baseDocument ? getVirtualList() : [];

  // --- Renderizado ---
  if (loading) return <div className="loading-spinner"></div>;
  if (error) return <div className="message message-error">{error}</div>;
  if (!baseDocument) return null;

  return (
    <div className="registro-view">
      <div className="card">
        <div className="card-header">
          <h2><Layers style={{marginRight:'0.5rem'}}/> Ensamblador de Documento</h2>
          {/* ======================================================== */}
          {/* === 💡 CORRECCIÓN: NAVEGACIÓN SIN /app === */}
          {/* ======================================================== */}
          <button className="button button-secondary" onClick={() => navigate('/registros')}>
            <ArrowLeft size={18}/> Volver a Registros
          </button>
          {/* ======================================================== */}
        </div>
        
        <div className="card-body">
          {/* Cabecera Base */}
          <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid var(--glass-dark-border)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <div>
                 <h3 style={{margin: 0}}>{baseDocument.registrationNumber}</h3>
                 <p style={{margin: '0.5rem 0', opacity: 0.8}}>{baseDocument.subject}</p>
             </div>
             <span className={`type-pill status-${baseDocument.status}`}>{baseDocument.status}</span>
          </div>

          <h4 style={{marginBottom: '0.5rem'}}>Estructura del Documento Final</h4>
          <p className="form-hint" style={{marginBottom: '1rem', fontSize: '0.9rem', opacity: 0.8}}>El sistema ordena automáticamente: <strong>Portadas</strong> al inicio → <strong>Atestado</strong> al medio → <strong>Actas</strong> al final.</p>
          
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{width: '50px'}}>#</th>
                  <th>Componente</th>
                  <th style={{width: '160px'}}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {/* Renderizar lista virtual (con orden automático) */}
                {virtualList.map((item, index) => (
                  <tr 
                    key={item.id}
                    style={item.isBase ? {
                      background: 'rgba(var(--rgb-green-neon), 0.05)', 
                      fontWeight: 'bold'
                    } : {}}
                  >
                    <td>{index + 1}</td>
                    <td>
                      {item.name}
                      <span className="type-pill" style={{fontSize:'0.7em', marginLeft: '8px', opacity: item.isBase ? 1 : 0.7}}>
                        {item.displayType}
                      </span>
                    </td>
                    <td className="actions-cell">
                      {item.isBase ? (
                        <span style={{fontSize: '0.8rem', opacity: 0.7}}>Fijo (Base)</span>
                      ) : (
                        <div style={{display: 'flex', gap: '4px'}}>
                          <button 
                            className="icon-button" 
                            onClick={() => window.open(item.pdfUrl, '_blank')}
                            title="Ver PDF"
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            className="icon-button button-danger" 
                            onClick={() => handleDeleteComponent(item.id)}
                            disabled={isFusing}
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {virtualList.length === 1 && <p className="empty-state" style={{marginTop: '1rem', textAlign: 'center'}}>Añade componentes para completar el documento.</p>}
          </div>

          {/* Botones de Añadir / Fusión */}
          <div className="actions-group" style={{marginTop: '2rem', justifyContent: 'space-between', display: 'flex'}}>
            <div style={{display:'flex', gap:'1rem'}}>
              <button className="button button-primary" onClick={() => handleOpenModal('portada')} disabled={isFusing}>
                <FilePlus size={18} style={{marginRight: '5px'}}/> Añadir Portada
              </button>
              <button className="button button-primary" onClick={() => handleOpenModal('acta')} disabled={isFusing}>
                <FilePlus size={18} style={{marginRight: '5px'}}/> Añadir Acta
              </button>
            </div>
            
            <div>
              {baseDocument.status === 'fusionando' ? (
                  <button className="button button-secondary" disabled>
                      <div className="loading-spinner-small"></div> Procesando...
                  </button>
              ) : baseDocument.status === 'completado' ? (
                  <button className="button button-success" onClick={() => window.open(baseDocument.pdfUrl, '_blank')}>
                      <CheckCircle size={18} style={{marginRight: '5px'}}/> Ver Documento Final
                  </button>
              ) : baseDocument.status === 'fallido' ? (
                  <button className="button button-danger" onClick={handleFusionSubmit}>
                      <RefreshCw size={18} style={{marginRight: '5px'}}/> Reintentar Fusión
                  </button>
              ) : (
                  <button className="button button-success" onClick={handleFusionSubmit} disabled={isFusing}>
                      <Zap size={18} style={{marginRight: '5px'}}/> Iniciar Fusión Final
                  </button>
              )}
            </div>
          </div>
          
        </div>
      </div>

      {/* Modal Inteligente */}
      <TemplateModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        type={modalType}
        onTemplateSelected={handleComponentCreated}
      />
    </div>
  );
}

export default FusionadorPage;