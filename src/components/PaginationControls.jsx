// Archivo: /src/components/PaginationControls.jsx
// 🎨 Componente reutilizable de paginación con estilo consistente

import React from 'react';
import { ChevronLeft, ChevronRight } from 'react-feather';

const PaginationControls = ({
  currentPage = 1,
  pageHistory = [null],
  hasNextPage = true,
  loading = false,
  itemsCount = 0,
  onNextPage = () => {},
  onPrevPage = () => {},
  onPageClick = () => {}
}) => {
  const totalKnownPages = pageHistory.length;

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1rem 1.5rem',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      background: 'rgba(0,0,0,0.1)',
      gap: '2rem'
    }}>
      {/* Info de página */}
      <span style={{
        fontSize: '0.85rem',
        color: 'rgba(255,255,255,0.5)',
        whiteSpace: 'nowrap'
      }}>
        Página <strong style={{ color: 'var(--color-accent-neon)' }}>{currentPage}</strong>
        {itemsCount > 0 && (
          <> • Mostrando <strong>{itemsCount}</strong> elemento{itemsCount !== 1 ? 's' : ''}</>
        )}
      </span>

      {/* Botones de navegación */}
      <div style={{
        display: 'flex',
        gap: '6px',
        alignItems: 'center',
        flexShrink: 0
      }}>
        {/* Botón Anterior */}
        <button
          className="button button-sm button-ghost"
          onClick={onPrevPage}
          disabled={currentPage === 1 || loading}
          style={{
            padding: '6px 10px',
            borderRadius: '6px',
            cursor: currentPage === 1 || loading ? 'not-allowed' : 'pointer',
            opacity: currentPage === 1 || loading ? 0.3 : 1,
            transition: 'all 0.2s ease'
          }}
          title="Página anterior"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Números de página */}
        {pageHistory.map((_, idx) => {
          const pageNum = idx + 1;
          const isActive = currentPage === pageNum;
          const isVisible = Math.abs(currentPage - pageNum) <= 2 || pageNum === 1 || pageNum === totalKnownPages;

          if (!isVisible) return null;

          return (
            <button
              key={pageNum}
              className={`button button-sm ${isActive ? 'btn-gradient-primary' : 'button-ghost'}`}
              onClick={() => onPageClick(pageNum)}
              disabled={loading}
              style={{
                minWidth: '36px',
                padding: '6px',
                borderRadius: '6px',
                fontWeight: isActive ? '600' : 'normal',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                background: isActive ? 'linear-gradient(135deg, #34d399 0%, #00ff88 100%)' : 'transparent',
                color: isActive ? '#000' : 'rgba(255,255,255,0.6)',
                border: isActive ? 'none' : '1px solid rgba(255,255,255,0.1)',
                transition: 'all 0.2s ease',
                boxShadow: isActive ? '0 0 20px rgba(52, 211, 153, 0.5)' : 'none'
              }}
            >
              {pageNum}
            </button>
          );
        })}

        {/* Botón Siguiente */}
        <button
          className="button button-sm button-ghost"
          onClick={onNextPage}
          disabled={!hasNextPage || loading}
          style={{
            padding: '6px 10px',
            borderRadius: '6px',
            cursor: !hasNextPage || loading ? 'not-allowed' : 'pointer',
            opacity: !hasNextPage || loading ? 0.3 : 1,
            transition: 'all 0.2s ease'
          }}
          title="Página siguiente"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default PaginationControls;