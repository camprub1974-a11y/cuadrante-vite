// src/pages/TemplatesPage.jsx

import React, { useEffect } from 'react';
import { useTemplateStore } from '../store/templateStore';

import {
  Clipboard,
  Plus,
  Code,
  Download,
  Trash2,
  Edit2,
  Copy,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  RefreshCw,
  Search,
  Filter
} from 'react-feather';

import TemplateModal from '../components/Modals/TemplateModal';

// --- ESTILOS INLINE (Glassmorphism) ---
const styles = {
  pageContainer: {
    padding: '2rem',
    height: '100%',
    overflowY: 'auto',
    color: '#e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },

  header: {
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

  title: {
    fontSize: '1.8rem',
    fontWeight: '700',
    background: 'linear-gradient(90deg, #fff, #a0aec0)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0
  },

  subtitle: {
    margin: 0,
    fontSize: '0.9rem',
    color: 'rgba(148,163,184,0.9)'
  },

  toolbar: {
    background: 'rgba(30, 41, 59, 0.7)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem'
  },

  select: {
    appearance: 'none',
    background:
      "rgba(15, 23, 42, 0.6) url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2334d399' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\") no-repeat right 0.8rem center",
    backgroundSize: '1.2rem',
    border: '1px solid rgba(52, 211, 153, 0.4)',
    borderRadius: '12px',
    padding: '0.6rem 2.5rem 0.6rem 1.2rem',
    color: '#e2e8f0',
    outline: 'none',
    minWidth: '220px',
    fontSize: '0.95rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    fontWeight: '500'
  },

  filterLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#34d399',
    fontWeight: '600',
    fontSize: '0.9rem'
  },

  contentArea: {
    display: 'flex',
    gap: '1.5rem',
    height: 'calc(100vh - 250px)',
    minHeight: '500px'
  },

  listPanel: (isPreviewOpen) => ({
    flex: isPreviewOpen ? '1' : '1',
    background: 'rgba(30, 41, 59, 0.7)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    transition: 'all 0.3s ease'
  }),

  previewPanel: {
    flex: '1',
    background: 'white',
    borderRadius: '16px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '-10px 0 30px rgba(0,0,0,0.3)',
    animation: 'slideInRight 0.3s ease'
  },

  tableContainer: {
    flex: 1,
    overflowY: 'auto'
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },

  th: {
    padding: '1rem 1.5rem',
    textAlign: 'left',
    color: '#a0aec0',
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'rgba(0, 0, 0, 0.2)',
    position: 'sticky',
    top: 0,
    zIndex: 1
  },

  td: {
    padding: '1rem 1.5rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    color: '#e2e8f0',
    fontSize: '0.9rem'
  },

  row: {
    transition: 'background 0.2s',
    cursor: 'default'
  },

  pill: (type) => {
    const colors = {
      informe: { bg: 'rgba(99, 102, 241, 0.2)', text: '#a5b4fc' },
      acta: { bg: 'rgba(239, 68, 68, 0.2)', text: '#fca5a5' },
      atestado: { bg: 'rgba(245, 158, 11, 0.2)', text: '#fcd34d' },
      portada: { bg: 'rgba(16, 185, 129, 0.2)', text: '#6ee7b7' },
      oficio: { bg: 'rgba(59, 130, 246, 0.2)', text: '#93c5fd' },
      estadillo: { bg: 'rgba(236, 72, 153, 0.2)', text: '#f9a8d4' }
    };

    const style =
      (type && colors[type.toLowerCase()]) || {
        bg: 'rgba(148, 163, 184, 0.2)',
        text: '#cbd5e1'
      };

    return {
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: '0.75rem',
      fontWeight: '600',
      background: style.bg,
      color: style.text,
      textTransform: 'uppercase',
      display: 'inline-block'
    };
  },

  actionBtn: {
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '6px',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  pagination: {
    padding: '1rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(0,0,0,0.1)'
  },

  paginationInfo: {
    fontSize: '0.85rem',
    color: 'rgba(255,255,255,0.5)'
  },

  paginationButton: (isActive) => ({
    minWidth: '36px',
    height: '32px',
    padding: '0 6px',
    borderRadius: '8px',
    border: isActive ? 'none' : '1px solid rgba(255,255,255,0.1)',
    background: isActive
      ? 'linear-gradient(135deg, #34d399 0%, #10b981 100%)'
      : 'rgba(255,255,255,0.05)',
    color: isActive ? '#064e3b' : 'white',
    fontWeight: isActive ? 'bold' : 'normal',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    fontSize: '0.9rem'
  }),

  navButton: (disabled) => ({
    padding: '6px 10px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)',
    color: disabled ? 'rgba(255,255,255,0.2)' : 'white',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }),

  primaryButton: {
    padding: '0.75rem 1.3rem',
    borderRadius: '999px',
    border: 'none',
    background: 'linear-gradient(135deg, #34d399, #10b981)',
    color: '#022c22',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer'
  }
};

const TEMPLATE_TYPES = [
  { value: 'all', label: 'Todos los tipos' },
  { value: 'atestado', label: 'Atestado' },
  { value: 'informe', label: 'Informe' },
  { value: 'denuncia', label: 'Denuncia' },
  { value: 'notificacion', label: 'Notificación' },
  { value: 'acta', label: 'Acta' },
  { value: 'oficio', label: 'Oficio' },
  { value: 'solicitud', label: 'Solicitud' },
  { value: 'otros', label: 'Otros' }
];

export default function TemplatesPage() {
  const {
    templates,
    loading,
    error,
    fetchTemplates,
    filterType,
    setFilterType,
    currentPage,
    hasNextPage,
    totalItems,
    itemsPerPage,
    nextPage,
    prevPage,
    pageCursors,
    goToPage,
    previewTemplate,
    setPreviewTemplate,
    isModalOpen,
    editingTemplate,
    openModal,
    closeModal,
    deleteTemplate,
    duplicateTemplate,
    saveTemplate
  } = useTemplateStore();

  useEffect(() => {
    fetchTemplates(1);
  }, [fetchTemplates]);

  const handleFilterChange = (e) => {
    setFilterType(e.target.value);
  };

  const handleDelete = async (id) => {
    if (
      window.confirm(
        '¿Seguro que quieres eliminar esta plantilla? Esta acción no se puede deshacer.'
      )
    ) {
      await deleteTemplate(id);
    }
  };

  const handleDuplicate = async (id) => {
    if (window.confirm('¿Duplicar plantilla?')) {
      await duplicateTemplate(id);
    }
  };

  const handleImportJSON = () => {
    const jsonString = prompt('Pega el JSON de la plantilla aquí:');
    if (jsonString) {
      try {
        const data = JSON.parse(jsonString);
        if (!data.templateName || !data.content) {
          throw new Error('JSON inválido');
        }
        openModal(data);
      } catch (e) {
        alert('Error: El JSON no es válido.');
      }
    }
  };

  const handleExportJSON = (template) => {
    const { id, createdAt, updatedAt, ...cleanData } = template;
    const jsonString = JSON.stringify(cleanData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(template.templateName || 'plantilla').replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleNewTemplate = () => {
    openModal(null);
  };

  const handleRowClick = (tpl) => {
    setPreviewTemplate(tpl);
  };

  const handleRefresh = () => {
    fetchTemplates(currentPage);
  };

  // --- Render Paginación ---
  const renderPagination = () => {
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage || 1));
    const maxPageAccessible = pageCursors.length;

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    if (endPage - startPage < 4) {
      if (startPage === 1) {
        endPage = Math.min(totalPages, 5);
      } else if (endPage === totalPages) {
        startPage = Math.max(1, totalPages - 4);
      }
    }

    const pagesToShow = [];
    for (let p = startPage; p <= endPage; p++) {
      pagesToShow.push(p);
    }

    return (
      <div style={styles.pagination}>
        <span style={styles.paginationInfo}>
          Página{' '}
          <strong style={{ color: '#34d399' }}>{currentPage}</strong>{' '}
          de {totalPages}
          {totalItems > 0 && ` (${totalItems} plantillas)`}
        </span>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {/* Botón Anterior con Texto */}
          <button
            type="button"
            style={{
              ...styles.navButton(currentPage === 1 || loading),
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px'
            }}
            onClick={prevPage}
            disabled={currentPage === 1 || loading}
          >
            <ChevronLeft size={16} />
            <span>Anterior</span>
          </button>

          {pagesToShow.map((p) => {
            const canGoTo = p <= maxPageAccessible;

            return (
              <button
                key={p}
                type="button"
                style={{
                  ...styles.paginationButton(currentPage === p),
                  opacity: canGoTo ? 1 : 0.5,
                  cursor: canGoTo ? 'pointer' : 'not-allowed'
                }}
                onClick={() => canGoTo && goToPage(p)}
                disabled={!canGoTo || loading}
              >
                {p}
              </button>
            );
          })}

          {/* Botón Siguiente con Texto */}
          <button
            type="button"
            style={{
              ...styles.navButton(!hasNextPage || loading),
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px'
            }}
            onClick={nextPage}
            disabled={!hasNextPage || loading}
          >
            <span>Siguiente</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  // --- Tabla ---
  const renderTableBody = () => {
    if (loading) {
      return (
        <tbody>
          <tr>
            <td colSpan={4} style={styles.td}>
              Cargando plantillas...
            </td>
          </tr>
        </tbody>
      );
    }

    if (!templates || templates.length === 0) {
      return (
        <tbody>
          <tr>
            <td colSpan={4} style={styles.td}>
              No hay plantillas encontradas.
            </td>
          </tr>
        </tbody>
      );
    }

    return (
      <tbody>
        {templates.map((tpl, idx) => (
          <tr
            key={tpl.id || idx}
            style={{
              ...styles.row,
              background:
                previewTemplate && previewTemplate.id === tpl.id
                  ? 'rgba(52,211,153,0.08)'
                  : idx % 2 === 0
                  ? 'transparent'
                  : 'rgba(15,23,42,0.6)'
            }}
            onClick={() => handleRowClick(tpl)}
          >
            <td style={styles.td}>
              {tpl.templateName || tpl.name || 'Sin nombre'}
            </td>
            <td style={styles.td}>
              <span style={styles.pill(tpl.documentType || tpl.type || '')}>
                {tpl.documentType || tpl.type || 'N/D'}
              </span>
            </td>
            <td style={styles.td}>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  style={styles.actionBtn}
                  title="Editar"
                  onClick={(e) => {
                    e.stopPropagation();
                    openModal(tpl);
                  }}
                >
                  <Edit2 size={16} />
                </button>

                <button
                  type="button"
                  style={styles.actionBtn}
                  title="Duplicar"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDuplicate(tpl.id);
                  }}
                >
                  <Copy size={16} />
                </button>

                <button
                  type="button"
                  style={styles.actionBtn}
                  title="Exportar JSON"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExportJSON(tpl);
                  }}
                >
                  <Download size={16} />
                </button>

                <button
                  type="button"
                  style={{ ...styles.actionBtn, color: '#f97373' }}
                  title="Eliminar"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(tpl.id);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </td>
            <td style={styles.td}>
              {tpl.previewUrl && (
                <button
                  type="button"
                  style={styles.actionBtn}
                  title="Ver"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(tpl.previewUrl, '_blank');
                  }}
                >
                  <Eye size={16} />
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    );
  };

  return (
    <div style={styles.pageContainer} className="fade-in">
      {/* HEADER */}
      <div style={styles.header}>
        <div style={styles.titleGroup}>
          <FileText size={32} color="#34d399" />
          <div>
            <h1 style={styles.title}>Plantillas de documentos</h1>
            <p style={styles.subtitle}>
              Configura los documentos y actas del sistema
            </p>
          </div>
        </div>

        <button type="button" style={styles.primaryButton} onClick={handleNewTemplate}>
          <Plus size={18} />
          <span>Nueva plantilla</span>
        </button>
      </div>

      {/* TOOLBAR / FILTROS */}
      <div style={styles.toolbar}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={styles.filterLabel}>
            <Filter size={16} />
            Tipo de documento
          </span>

          <select
            style={styles.select}
            value={filterType}
            onChange={handleFilterChange}
          >
            {TEMPLATE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          {error && (
            <span style={{ color: '#f97373', fontSize: '0.85rem' }}>
              Error: {error}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            style={styles.actionBtn}
            title="Refrescar"
            onClick={handleRefresh}
          >
            <RefreshCw size={16} />
          </button>

          <button
            type="button"
            style={styles.actionBtn}
            title="Importar JSON"
            onClick={handleImportJSON}
          >
            <Code size={16} />
          </button>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div style={styles.contentArea}>
        {/* Lista de plantillas */}
        <div style={styles.listPanel(!!previewTemplate)}>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Nombre de Plantilla</th>
                  <th style={styles.th}>Tipo Documento</th>
                  <th style={styles.th}>Acciones</th>
                  <th style={styles.th}>Vista</th>
                </tr>
              </thead>
              {renderTableBody()}
            </table>
          </div>

          {/* Paginación */}
          {renderPagination()}
        </div>

        {/* Panel de previsualización simple */}
        {previewTemplate && (
          <div style={styles.previewPanel}>
            <div
              style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid rgba(15,23,42,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <Clipboard size={18} color="#111827" />
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: '#111827'
                    }}
                  >
                    {previewTemplate.templateName || 'Plantilla'}
                  </h2>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.8rem',
                      color: '#6b7280'
                    }}
                  >
                    {previewTemplate.documentType || 'Sin tipo definido'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
                onClick={() => setPreviewTemplate(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                padding: '1rem 1.5rem',
                flex: 1,
                overflowY: 'auto',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                background: '#0f172a',
                color: '#e5e7eb'
              }}
            >
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {JSON.stringify(previewTemplate.content || previewTemplate, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE EDICIÓN / CREACIÓN */}
      <TemplateModal
        isOpen={isModalOpen}
        initialData={editingTemplate}
        onClose={closeModal}
        onSave={saveTemplate}
      />
    </div>
  );
}