// Archivo: /src/components/UI/FileUploader.jsx
// Componente reutilizable para subir archivos con UI moderna

import React, { useState, useRef } from 'react';
import { Upload, File, X, Image, FileText, CheckCircle } from 'react-feather';

export default function FileUploader({ 
  onFileSelect, 
  accept = ".pdf,.jpg,.jpeg,.png",
  maxSize = 5, // MB
  label = "Adjuntar documento",
  currentFile = null,
  onRemove = null
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(currentFile);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const acceptedTypes = accept.split(',').map(t => t.trim());
  
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
    
    // Validar tipo
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    const isValidType = acceptedTypes.some(type => {
      if (type.startsWith('.')) return fileExt === type.toLowerCase();
      return file.type.includes(type.replace('*', ''));
    });
    
    if (!isValidType) {
      setError(`Tipo de archivo no permitido. Usa: ${accept}`);
      return false;
    }
    
    // Validar tamaño
    if (file.size > maxSize * 1024 * 1024) {
      setError(`El archivo excede el límite de ${maxSize}MB`);
      return false;
    }
    
    return true;
  };

  const handleFile = (file) => {
    if (validateFile(file)) {
      setSelectedFile(file);
      if (onFileSelect) onFileSelect(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    setSelectedFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
    if (onRemove) onRemove();
    if (onFileSelect) onFileSelect(null);
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const FileIcon = selectedFile ? getFileIcon(selectedFile.name) : Upload;

  return (
    <div style={{ width: '100%' }}>
      {/* Label */}
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

      {/* Drop Zone */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          position: 'relative',
          border: `2px dashed ${isDragging ? 'var(--color-accent-neon)' : error ? '#ef4444' : 'rgba(255,255,255,0.15)'}`,
          borderRadius: '12px',
          padding: selectedFile ? '12px 16px' : '24px 16px',
          background: isDragging 
            ? 'rgba(0, 255, 136, 0.05)' 
            : selectedFile 
              ? 'rgba(0, 255, 136, 0.03)' 
              : 'rgba(255,255,255,0.02)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          textAlign: 'center'
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
          // Archivo seleccionado
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            {/* Icono del archivo */}
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: 'rgba(0, 255, 136, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <FileIcon size={22} color="var(--color-accent-neon)" />
            </div>

            {/* Info del archivo */}
            <div style={{ flex: 1, textAlign: 'left', overflow: 'hidden' }}>
              <p style={{
                margin: 0,
                fontSize: '0.9rem',
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
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.5)'
              }}>
                {formatFileSize(selectedFile.size)}
              </p>
            </div>

            {/* Indicador de éxito */}
            <CheckCircle size={20} color="#34d399" style={{ flexShrink: 0 }} />

            {/* Botón eliminar */}
            <button
              onClick={handleRemove}
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '8px',
                padding: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
              }}
            >
              <X size={16} color="#ef4444" />
            </button>
          </div>
        ) : (
          // Estado vacío - Drop zone
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: isDragging ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255,255,255,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}>
              <Upload 
                size={24} 
                color={isDragging ? 'var(--color-accent-neon)' : 'rgba(255,255,255,0.4)'} 
              />
            </div>
            
            <div>
              <p style={{
                margin: 0,
                fontSize: '0.9rem',
                color: isDragging ? 'var(--color-accent-neon)' : 'rgba(255,255,255,0.7)',
                fontWeight: '500'
              }}>
                {isDragging ? 'Suelta el archivo aquí' : 'Arrastra un archivo o haz clic'}
              </p>
              <p style={{
                margin: '4px 0 0 0',
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.4)'
              }}>
                PDF, JPG, PNG • Máx. {maxSize}MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p style={{
          margin: '8px 0 0 0',
          fontSize: '0.8rem',
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <X size={14} /> {error}
        </p>
      )}
    </div>
  );
}