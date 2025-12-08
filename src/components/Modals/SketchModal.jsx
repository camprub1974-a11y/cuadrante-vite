// Archivo: /src/components/Modals/SketchModal.jsx
// ✨ VERSIÓN PREMIUM: Preview en tiempo real, progreso de subida, validación visual

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Save, Image as ImageIcon, Globe, Maximize2, Loader, 
  MapPin, Calendar, Clock, Users, FileText, AlertTriangle,
  Upload, CheckCircle, Info, ExternalLink
} from 'react-feather';
import { useSketchStore } from '../../store/sketchStore';
import FileUploader from '../UI/FileUploader';

const EXTERNAL_EDITOR_URL = "https://www.formacionandaluza.es/sarius"; 

// =========================================
// ESTILOS PREMIUM
// =========================================
const modalStyles = `
  .sketch-modal-premium .form-section {
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px;
    padding: 1.25rem;
    margin-bottom: 1rem;
  }
  
  .sketch-modal-premium .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--color-accent-neon);
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  
  .sketch-modal-premium .input-premium {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: white;
    padding: 12px 14px;
    border-radius: 10px;
    width: 100%;
    transition: all 0.2s ease;
  }
  
  .sketch-modal-premium .input-premium:focus {
    border-color: var(--color-accent-neon);
    box-shadow: 0 0 0 3px rgba(0, 255, 136, 0.1);
    outline: none;
  }
  
  .sketch-modal-premium .input-premium.error {
    border-color: #ef4444;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
  }
  
  .sketch-modal-premium .input-premium::placeholder {
    color: rgba(255,255,255,0.3);
  }
  
  .sketch-modal-premium .error-message {
    color: #ef4444;
    font-size: 0.8rem;
    margin-top: 6px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .sketch-modal-premium .preview-card {
    background: linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 100%);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    overflow: hidden;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  .sketch-modal-premium .preview-image {
    flex: 1;
    min-height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    position: relative;
    overflow: hidden;
  }
  
  .sketch-modal-premium .preview-image img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
  
  .sketch-modal-premium .preview-info {
    padding: 1rem;
    background: rgba(0,0,0,0.3);
  }
  
  .sketch-modal-premium .type-selector {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }
  
  .sketch-modal-premium .type-option {
    padding: 10px;
    border-radius: 10px;
    border: 2px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.02);
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;
    font-size: 0.8rem;
    color: rgba(255,255,255,0.7);
  }
  
  .sketch-modal-premium .type-option:hover {
    border-color: rgba(255,255,255,0.2);
    background: rgba(255,255,255,0.05);
  }
  
  .sketch-modal-premium .type-option.selected {
    border-color: var(--color-accent-neon);
    background: rgba(0, 255, 136, 0.1);
    color: var(--color-accent-neon);
  }
  
  .sketch-modal-premium .editor-banner {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.1) 100%);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 12px;
    padding: 1rem;
    text-align: center;
  }
  
  .sketch-modal-premium .upload-progress {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: rgba(255,255,255,0.1);
    overflow: hidden;
  }
  
  .sketch-modal-premium .upload-progress-bar {
    height: 100%;
    background: linear-gradient(90deg, var(--color-accent-neon), #34d399);
    transition: width 0.3s ease;
  }
  
  @keyframes pulse-border {
    0%, 100% { border-color: rgba(0, 255, 136, 0.3); }
    50% { border-color: rgba(0, 255, 136, 0.8); }
  }
  
  .sketch-modal-premium .saving-indicator {
    animation: pulse-border 1s infinite;
  }
`;

// Configuración de tipos
const typeOptions = [
  { value: 'croquis', label: 'Croquis', color: '#00ff88' },
  { value: 'atestado', label: 'Atestado', color: '#ef4444' },
  { value: 'estadillo', label: 'Estadillo', color: '#fbbf24' },
  { value: 'ninguno', label: 'Otros', color: '#9ca3af' }
];

export default function SketchModal({ isOpen, onClose, initialData }) {
  const { addSketch, editSketch } = useSketchStore();
  
  const [formData, setFormData] = useState({
    lugar: '',
    fecha: new Date().toISOString().split('T')[0],
    hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    implicados: '',
    documentoRealizado: 'croquis',
    leyenda: '',
    heridos: '',
    imageUrl: ''
  });
  
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showEditor, setShowEditor] = useState(false);
  const [errors, setErrors] = useState({});

  // Limpiar preview URL al desmontar
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Cargar datos iniciales o resetear
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        const dateObj = initialData.fechaSuceso ? new Date(initialData.fechaSuceso) : new Date();
        setFormData({
          lugar: initialData.lugar || '',
          fecha: dateObj.toISOString().split('T')[0],
          hora: dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          implicados: initialData.implicados || '',
          documentoRealizado: initialData.documentoRealizado || 'croquis',
          leyenda: initialData.leyenda || '',
          heridos: initialData.heridos || '',
          imageUrl: initialData.imageUrl || ''
        });
        setPreviewUrl(initialData.imageUrl || null);
      } else {
        setFormData({
          lugar: '',
          fecha: new Date().toISOString().split('T')[0],
          hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          implicados: '',
          documentoRealizado: 'croquis',
          leyenda: '',
          heridos: '',
          imageUrl: ''
        });
        setPreviewUrl(null);
      }
      setFile(null);
      setErrors({});
      setShowEditor(false);
      setUploadProgress(0);
    }
  }, [isOpen, initialData]);

  // Manejar selección de archivo
  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile);
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    }
  };

  // Validación
  const validate = () => {
    const newErrors = {};
    if (!formData.lugar.trim()) newErrors.lugar = 'El lugar es obligatorio';
    if (!formData.implicados.trim()) newErrors.implicados = 'Indica los vehículos/personas implicados';
    if (!initialData && !file && !formData.imageUrl) newErrors.file = 'Debes subir una imagen del croquis';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Enviar formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const fechaSuceso = new Date(`${formData.fecha}T${formData.hora}`).toISOString();
    
    setSaving(true);
    
    // Simular progreso de subida
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    try {
      const dataToSave = { ...formData, fechaSuceso };
      
      let result;
      if (initialData) {
        result = await editSketch(initialData.id, dataToSave, file);
      } else {
        result = await addSketch(dataToSave, file);
      }

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.success) {
        setTimeout(() => {
          setSaving(false);
          onClose();
        }, 500);
      } else {
        setErrors({ submit: result.message || 'Error al guardar' });
        setSaving(false);
        setUploadProgress(0);
      }
    } catch (error) {
      clearInterval(progressInterval);
      setErrors({ submit: error.message });
      setSaving(false);
      setUploadProgress(0);
    }
  };

  if (!isOpen) return null;

  const isEditing = !!initialData;

  return (
    <>
      <style>{modalStyles}</style>
      
      {/* Modal Principal */}
      <div className="modal-overlay active" style={{ zIndex: 1060 }}>
        <div 
          className={`modal-content sketch-modal-premium ${saving ? 'saving-indicator' : ''}`}
          style={{ 
            maxWidth: '1000px', 
            maxHeight: '92vh', 
            display: 'flex', 
            flexDirection: 'column',
            borderRadius: '20px',
            border: saving ? '2px solid rgba(0, 255, 136, 0.3)' : '1px solid var(--glass-dark-border)'
          }}
        >
          {/* Header */}
          <div className="modal-header" style={{ 
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ margin: 0, display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.2), rgba(0, 200, 100, 0.1))',
                padding: '10px',
                borderRadius: '12px'
              }}>
                <ImageIcon size={22} color="var(--color-accent-neon)"/>
              </div>
              {isEditing ? 'Editar Croquis' : 'Nuevo Croquis de Accidente'}
            </h3>
            <button 
              className="icon-button" 
              onClick={onClose}
              disabled={saving}
              style={{ opacity: saving ? 0.5 : 1 }}
            >
              <X size={22}/>
            </button>
          </div>

          {/* Body */}
          <div className="modal-body" style={{ 
            padding: '1.5rem', 
            overflowY: 'auto',
            flex: 1
          }}>
            <form id="sketch-form" onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                
                {/* ====== COLUMNA IZQUIERDA: DATOS ====== */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                  
                  {/* Sección Ubicación */}
                  <div className="form-section">
                    <div className="section-title">
                      <MapPin size={14}/> Ubicación del Suceso
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label" style={{ marginBottom: '6px', display: 'block' }}>
                        Lugar <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input 
                        className={`input-premium ${errors.lugar ? 'error' : ''}`}
                        value={formData.lugar}
                        onChange={e => setFormData({ ...formData, lugar: e.target.value })}
                        placeholder="Calle, pk, cruce, intersección..."
                      />
                      {errors.lugar && (
                        <div className="error-message">
                          <AlertTriangle size={12}/> {errors.lugar}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                      <div className="form-group">
                        <label className="form-label" style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={12}/> Fecha
                        </label>
                        <input 
                          type="date"
                          className="input-premium"
                          value={formData.fecha}
                          onChange={e => setFormData({ ...formData, fecha: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={12}/> Hora
                        </label>
                        <input 
                          type="time"
                          className="input-premium"
                          value={formData.hora}
                          onChange={e => setFormData({ ...formData, hora: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sección Implicados */}
                  <div className="form-section">
                    <div className="section-title">
                      <Users size={14}/> Implicados
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label" style={{ marginBottom: '6px', display: 'block' }}>
                        Vehículos / Personas <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <textarea 
                        className={`input-premium ${errors.implicados ? 'error' : ''}`}
                        rows="3"
                        value={formData.implicados}
                        onChange={e => setFormData({ ...formData, implicados: e.target.value })}
                        placeholder="Describa los vehículos y personas involucradas..."
                        style={{ resize: 'vertical', minHeight: '80px' }}
                      />
                      {errors.implicados && (
                        <div className="error-message">
                          <AlertTriangle size={12}/> {errors.implicados}
                        </div>
                      )}
                    </div>

                    <div className="form-group" style={{ marginTop: '12px' }}>
                      <label className="form-label" style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertTriangle size={12} color="#ef4444"/> Heridos / Lesiones
                      </label>
                      <textarea 
                        className="input-premium"
                        rows="2"
                        value={formData.heridos}
                        onChange={e => setFormData({ ...formData, heridos: e.target.value })}
                        placeholder="Descripción de heridos si los hubiera..."
                        style={{ resize: 'vertical' }}
                      />
                    </div>
                  </div>

                  {/* Sección Tipo Documento */}
                  <div className="form-section">
                    <div className="section-title">
                      <FileText size={14}/> Tipo de Documento
                    </div>
                    
                    <div className="type-selector">
                      {typeOptions.map(opt => (
                        <div
                          key={opt.value}
                          className={`type-option ${formData.documentoRealizado === opt.value ? 'selected' : ''}`}
                          onClick={() => setFormData({ ...formData, documentoRealizado: opt.value })}
                          style={{
                            borderColor: formData.documentoRealizado === opt.value ? opt.color : undefined,
                            color: formData.documentoRealizado === opt.value ? opt.color : undefined
                          }}
                        >
                          {opt.label}
                        </div>
                      ))}
                    </div>

                    <div className="form-group" style={{ marginTop: '12px' }}>
                      <label className="form-label" style={{ marginBottom: '6px', display: 'block' }}>
                        Leyenda / Notas
                      </label>
                      <input 
                        className="input-premium"
                        value={formData.leyenda}
                        onChange={e => setFormData({ ...formData, leyenda: e.target.value })}
                        placeholder="Notas adicionales para el croquis..."
                      />
                    </div>
                  </div>
                </div>

                {/* ====== COLUMNA DERECHA: IMAGEN ====== */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  {/* Banner Editor */}
                  <div className="editor-banner">
                    <button 
                      type="button"
                      className="button button-primary w-100 ripple-effect"
                      onClick={() => setShowEditor(true)}
                      style={{ justifyContent: 'center', marginBottom: '8px' }}
                    >
                      <Globe size={18} style={{ marginRight: 8 }}/> Abrir Editor Online
                    </button>
                    <p style={{ fontSize: '0.75rem', opacity: 0.7, margin: 0 }}>
                      Dibuja el croquis en el editor, guárdalo y súbelo aquí
                    </p>
                  </div>

                  {/* Preview Card */}
                  <div className="preview-card" style={{ flex: 1 }}>
                    <div className="preview-image">
                      {previewUrl ? (
                        <img src={previewUrl} alt="Preview del croquis"/>
                      ) : (
                        <div style={{ 
                          textAlign: 'center', 
                          color: 'rgba(255,255,255,0.3)',
                          padding: '2rem'
                        }}>
                          <ImageIcon size={60} style={{ marginBottom: '1rem', opacity: 0.5 }}/>
                          <p style={{ margin: 0, fontSize: '0.9rem' }}>
                            {errors.file ? (
                              <span style={{ color: '#ef4444' }}>
                                <AlertTriangle size={14} style={{ marginRight: 6 }}/>
                                {errors.file}
                              </span>
                            ) : (
                              'La imagen aparecerá aquí'
                            )}
                          </p>
                        </div>
                      )}
                      
                      {/* Barra de progreso */}
                      {saving && uploadProgress > 0 && (
                        <div className="upload-progress">
                          <div 
                            className="upload-progress-bar"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="preview-info">
                      <FileUploader 
                        onFileSelect={handleFileSelect}
                        currentFile={file || formData.imageUrl}
                        accept="image/*"
                        label="Arrastra o selecciona el croquis"
                        compact
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Error general */}
              {errors.submit && (
                <div style={{
                  marginTop: '1rem',
                  padding: '12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '10px',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertTriangle size={18}/> {errors.submit}
                </div>
              )}
            </form>
          </div>

          {/* Footer */}
          <div className="modal-footer" style={{ 
            padding: '1.25rem 1.5rem',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(0,0,0,0.2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
              {saving ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent-neon)' }}>
                  <Loader size={16} className="spin"/> Guardando...
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Info size={14}/> Revisa los datos antes de guardar
                </span>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="button"
                className="button button-secondary"
                onClick={onClose}
                disabled={saving}
              >
                Cancelar
              </button>
              <button 
                type="submit"
                form="sketch-form"
                className="button btn-gradient-success"
                disabled={saving}
                style={{ minWidth: '160px' }}
              >
                {saving ? (
                  <>
                    <Loader size={18} className="spin" style={{ marginRight: 8 }}/>
                    {uploadProgress < 100 ? `${uploadProgress}%` : 'Finalizando...'}
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} style={{ marginRight: 8 }}/>
                    {isEditing ? 'Actualizar' : 'Guardar Croquis'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Editor Externo */}
      {showEditor && (
        <div className="modal-overlay active" style={{ zIndex: 1070, background: 'rgba(0,0,0,0.95)' }}>
          <div style={{ 
            width: '98vw', 
            height: '95vh', 
            display: 'flex', 
            flexDirection: 'column', 
            background: '#111827', 
            borderRadius: '16px', 
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            {/* Header del editor */}
            <div style={{
              height: '56px',
              background: 'linear-gradient(90deg, #111827 0%, #1f2937 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 20px',
              borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  background: 'rgba(52, 211, 153, 0.15)',
                  padding: '8px',
                  borderRadius: '8px'
                }}>
                  <Maximize2 size={18} color="#34d399"/>
                </div>
                <h4 style={{ color: 'white', margin: 0, fontSize: '1rem' }}>
                  Editor de Croquis
                </h4>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ 
                  color: '#9ca3af', 
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Info size={14}/> 
                  Dibuja, guarda la imagen y cierra para subirla
                </span>
                
                <a 
                  href={EXTERNAL_EDITOR_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button button-secondary button-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <ExternalLink size={14}/> Abrir en nueva pestaña
                </a>
                
                <button 
                  className="button button-danger"
                  onClick={() => setShowEditor(false)}
                >
                  <X size={16} style={{ marginRight: 6 }}/> Cerrar Editor
                </button>
              </div>
            </div>

            {/* Iframe */}
            <iframe 
              src={EXTERNAL_EDITOR_URL}
              title="Editor Croquis"
              style={{ 
                flex: 1, 
                width: '100%', 
                border: 'none', 
                background: 'white' 
              }}
              allowFullScreen
            />
          </div>
        </div>
      )}
    </>
  );
}