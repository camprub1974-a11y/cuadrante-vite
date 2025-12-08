import React from 'react';

export default function Card({ children, title, icon: Icon, className = '', ...props }) {
  return (
    <div className={`card ${className}`} {...props}>
      {title && (
        <div className="card-header">
           {/* Replicamos la estructura de tu header */}
           <h2>
             {Icon && <Icon style={{ marginRight: '0.5rem' }} />} 
             {title}
           </h2>
        </div>
      )}
      <div className="card-body">
        {children}
      </div>
    </div>
  );
}