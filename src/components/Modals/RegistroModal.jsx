// Archivo: /src/components/Modals/RegistroModal.jsx

import React, { useState } from 'react';
import { 
  X, Check, User, Hash, Inbox, Upload, File, Image, FileText, CheckCircle
} from 'react-feather';
import { createRegistro, uploadRecordImage } from '../../../js/dataController';
import { useAuthStore } from '../../store/authStore';

// =========================================
// COMPONENTE: FileUploader Integrado
// =========================================
function FileUploader({ 
  onFileSelect, 
  accept = ".pdf,.jpg,.jpeg,.png",
  maxSize = 5,
  label = "Adjuntar documento",
  selectedFile = null
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = React.useRef(null);

  const getFileIcon = (fileName) => {
    if (!fileName) return File;
    const ext = fileName.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return Image;
    if (['pdf'].includes(ext)) return FileText;
    return File;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file) => {
    setError(null);
    const acceptedTypes = accept.split(',').map(t => t.trim());
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    
    const isValidType = acceptedTypes.some(type => {
      if (type.startsWith('.')) return fileExt === type.toLowerCase();
      if (type === 'image/*') return file.type.startsWith('image/');
      return file.type.includes(type.replace('*', ''));
    });
    
    if (!isValidType) {
      setError(`Tipo no permitido. Usa: PDF, JPG, PNG`);
      return false;
    }
    
    if (file.size > maxSize * 1024 * 1024) {
      setError(`Máximo ${maxSize}MB`);
      return false;
    }
    
    return true;
  };

  const handleFile = (file) => {
    if (validateFile(file)) {
      if (onFileSelect) onFileSelect(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
    if (onFileSelect) onFileSelect(null);
  };

  const FileIcon = selectedFile ? getFileIcon(selectedFile.name) : Upload;

  return (
    <div style={{ width: '100%' }}>
      <label style={{
        display: 'block',
        fontSize: '0.8rem',
        fontWeight: '600',
        color: 'rgba(255,255,255,0.7)',
        marginBottom: '8px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        {label}
      </label>

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          position: 'relative',
          border: `2px dashed ${isDragging ? 'var(--color-accent-neon)' : error ? '#ef4444' : 'rgba(255,255,255,0.15)'}`,
          borderRadius: '12px',
          padding: selectedFile ? '12px 16px' : '20px 16px',
          background: isDragging 
            ? 'rgba(0, 255, 136, 0.05)' 
            : selectedFile 
              ? 'rgba(0, 255, 136, 0.03)' 
              : 'rgba(255,255,255,0.02)',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          style={{ display: 'none' }}
        />

        {selectedFile ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(0, 255, 136, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <FileIcon size={20} color="var(--color-accent-neon)" />
            </div>

            <div style={{ flex: 1, overflow: 'hidden' }}>
              <p style={{
                margin: 0,
                fontSize: '0.85rem',
                fontWeight: '600',
                color: 'white',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {selectedFile.name}
              </p>
              <p style={{
                margin: '2px 0 0 0',
                fontSize: '0.7rem',
                color: 'rgba(255,255,255,0.5)'
              }}>
                {formatFileSize(selectedFile.size)}
              </p>
            </div>

            <CheckCircle size={18} color="#34d399" style={{ flexShrink: 0 }} />

            <button
              onClick={handleRemove}
              type="button"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <X size={14} color="#ef4444" />
            </button>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: isDragging ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255,255,255,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Upload 
                size={22} 
                color={isDragging ? 'var(--color-accent-neon)' : 'rgba(255,255,255,0.4)'} 
              />
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <p style={{
                margin: 0,
                fontSize: '0.85rem',
                color: isDragging ? 'var(--color-accent-neon)' : 'rgba(255,255,255,0.6)',
                fontWeight: '500'
              }}>
                {isDragging ? 'Suelta aquí' : 'Arrastra o haz clic'}
              </p>
              <p style={{
                margin: '3px 0 0 0',
                fontSize: '0.7rem',
                color: 'rgba(255,255,255,0.4)'
              }}>
                PDF, JPG, PNG • Máx. {maxSize}MB
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p style={{
          margin: '6px 0 0 0',
          fontSize: '0.75rem',
          color: '#ef4444'
        }}>
          {error}
        </p>
      )}
    </div>
  );
}

// =========================================
// COMPONENTE PRINCIPAL: RegistroModal
// =========================================
export default function RegistroModal({ isOpen, onClose, onSaved }) {
  const { user } = useAuthStore();
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    interesado: '',
    dni: '',
    asunto: '',
    comentario: '',
    tipo: 'fisico'
  });

  const [file, setFile] = useState(null);

  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        interesado: '',
        dni: '',
        asunto: '',
        comentario: '',
        tipo: 'fisico'
      });
      setFile(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.interesado || !formData.asunto) {
      alert("El interesado y el asunto son obligatorios.");
      return;
    }

    setSaving(true);
    try {
      let pdfUrl = null;

      if (file) {
        pdfUrl = await uploadRecordImage(file);
      }

      const payload = {
        direction: 'entrada',
        interesado: formData.interesado,
        dni: formData.dni,
        asunto: formData.asunto,
        subject: formData.asunto,
        comentario: formData.comentario,
        tipoPresentacion: formData.tipo,
        pdfUrl: pdfUrl,
        estado: 'pendiente',
        createdBy: user.uid,
        createdAt: new Date(),
        fechaPresentacion: new Date()
      };

      await createRegistro(payload);

      if (onSaved) onSaved();
      onClose();

    } catch (error) {
      console.error(error);
      alert("Error al crear el registro: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay active" style={{ zIndex: 1060 }}>
      <div className="modal-content" style={{ maxWidth: '580px' }}>
        
        {/* CABECERA */}
        <div className="modal-header" style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--glass-dark-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem' }}>
            <div style={{
              background: 'rgba(0, 255, 136, 0.1)',
              padding: '8px',
              borderRadius: '10px',
              display: 'flex'
            }}>
              <Inbox size={20} color="var(--color-accent-neon)" />
            </div>
            Nuevo Registro de Entrada
          </h3>
          <button 
            className="icon-button" 
            onClick={onClose} 
            disabled={saving}
            style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '8px',
              padding: '8px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body" style={{ 
          padding: '1.5rem', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1.25rem' 
        }}>
          
          {/* FILA 1: Interesado y DNI */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" style={{
                fontSize: '0.8rem',
                fontWeight: '600',
                color: 'rgba(255,255,255,0.7)',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'block'
              }}>
                Interesado / Remitente *
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'rgba(255,255,255,0.4)'
                }}/>
                <input 
                  type="text" 
                  className="input w-100" 
                  style={{ paddingLeft: '38px' }}
                  placeholder="Nombre completo o Entidad"
                  required
                  value={formData.interesado}
                  onChange={e => setFormData({...formData, interesado: e.target.value})}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{
                fontSize: '0.8rem',
                fontWeight: '600',
                color: 'rgba(255,255,255,0.7)',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'block'
              }}>
                DNI / CIF
              </label>
              <div style={{ position: 'relative' }}>
                <Hash size={16} style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'rgba(255,255,255,0.4)'
                }}/>
                <input 
                  type="text" 
                  className="input w-100" 
                  style={{ paddingLeft: '38px' }}
                  placeholder="Opcional"
                  value={formData.dni}
                  onChange={e => setFormData({...formData, dni: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* ASUNTO */}
          <div className="form-group">
            <label className="form-label" style={{
              fontSize: '0.8rem',
              fontWeight: '600',
              color: 'rgba(255,255,255,0.7)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              display: 'block'
            }}>
              Asunto (Resumen) *
            </label>
            <input 
              type="text" 
              className="input w-100" 
              placeholder="Ej: Solicitud de vado permanente..."
              required
              value={formData.asunto}
              onChange={e => setFormData({...formData, asunto: e.target.value})}
            />
          </div>

          {/* DESCRIPCIÓN */}
          <div className="form-group">
            <label className="form-label" style={{
              fontSize: '0.8rem',
              fontWeight: '600',
              color: 'rgba(255,255,255,0.7)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              display: 'block'
            }}>
              Exposición / Detalles
            </label>
            <textarea 
              className="input w-100" 
              rows="3" 
              placeholder="Detalles adicionales de la solicitud..."
              value={formData.comentario}
              onChange={e => setFormData({...formData, comentario: e.target.value})}
              style={{ resize: 'vertical', minHeight: '80px' }}
            />
          </div>

          {/* FILA 2: Archivo y Tipo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem', alignItems: 'start' }}>
            
            {/* FileUploader Mejorado */}
            <FileUploader 
              label="Adjuntar Documento (PDF/IMG)"
              accept=".pdf,image/*"
              maxSize={5}
              selectedFile={file}
              onFileSelect={setFile}
            />

            {/* Tipo Presentación */}
            <div className="form-group">
              <label className="form-label" style={{
                fontSize: '0.8rem',
                fontWeight: '600',
                color: 'var(--color-accent-neon)',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'block'
              }}>
                Tipo Presentación
              </label>
              <select 
                className="selector w-100"
                value={formData.tipo}
                onChange={e => setFormData({...formData, tipo: e.target.value})}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  background: 'rgba(0, 255, 136, 0.05)',
                  border: '1px solid rgba(0, 255, 136, 0.2)',
                  color: 'white',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                <option value="fisico">Presencial (Físico)</option>
                <option value="telematico">Telemático / Email</option>
                <option value="correo">Correo Administrativo</option>
              </select>
            </div>
          </div>

          {/* FOOTER */}
          <div style={{
            marginTop: '0.5rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--glass-dark-border)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px'
          }}>
            <button 
              type="button" 
              className="button button-secondary" 
              onClick={onClose} 
              disabled={saving}
              style={{ padding: '10px 20px' }}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="button btn-gradient-success" 
              disabled={saving}
              style={{ 
                padding: '10px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {saving ? (
                <>
                  <span className="loading-spinner" style={{ width: '16px', height: '16px' }}></span>
                  Guardando...
                </>
              ) : (
                <>
                  <Check size={18} />
                  Registrar Entrada
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}