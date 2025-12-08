import React, { useState, useEffect } from 'react';
import { X, Save, Loader, Briefcase, MapPin, Phone, AlertTriangle, FileText } from 'react-feather';
import { useCollectionStore } from '../../../store/collectionStore';

// Estilos Glassmorphism
const styles = {
    overlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(5px)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
    },
    content: {
        background: 'rgba(30, 41, 59, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        width: '95%', maxWidth: '700px',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        color: 'white'
    },
    header: {
        padding: '1.5rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    },
    title: { margin: 0, fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' },
    closeBtn: { background: 'none', border: 'none', color: '#a0aec0', cursor: 'pointer' },
    body: { padding: '2rem' },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' },
    fullWidth: { gridColumn: '1 / -1' },
    label: { display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#a0aec0', fontWeight: 500 },
    input: {
        width: '100%', padding: '0.75rem',
        background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px', color: 'white', fontSize: '0.95rem',
        outline: 'none', transition: 'border-color 0.2s'
    },
    footer: {
        padding: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: 'rgba(0,0,0,0.2)'
    },
    btnCancel: {
        padding: '0.75rem 1.5rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
        color: 'white', borderRadius: '8px', cursor: 'pointer'
    },
    btnSave: {
        padding: '0.75rem 1.5rem', background: '#6366f1', border: 'none', // Color índigo para locales
        color: 'white', borderRadius: '8px', fontWeight: 600, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: '8px'
    },
    errorMsg: {
        color: '#ef4444', fontSize: '0.9rem', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '8px',
        background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '8px'
    }
};

export default function EstablishmentModal({ isOpen, onClose, initialData }) {
    const { addItem, updateItem } = useCollectionStore();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        id: '', // CIF es el ID
        nombreComercial: '',
        licenciaActividad: '',
        titularDni: '',
        telefono: '',
        direccion: ''
    });

    useEffect(() => {
        if (isOpen && initialData) {
            setFormData({
                id: initialData.id || '',
                nombreComercial: initialData.nombreComercial || '',
                licenciaActividad: initialData.licenciaActividad || '',
                titularDni: initialData.titularDni || '',
                telefono: initialData.telefono || '',
                direccion: initialData.direccion || ''
            });
        } else if (isOpen) {
            setFormData({ id: '', nombreComercial: '', licenciaActividad: '', titularDni: '', telefono: '', direccion: '' });
        }
        setError(null);
    }, [isOpen, initialData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const docId = formData.id.trim().toUpperCase();
        if (!docId) {
            setError("El CIF es obligatorio.");
            setLoading(false);
            return;
        }

        const payload = {
            nombreComercial: formData.nombreComercial,
            licenciaActividad: formData.licenciaActividad,
            titularDni: formData.titularDni.toUpperCase(),
            telefono: formData.telefono,
            direccion: formData.direccion
        };

        const result = initialData 
            ? await updateItem('establecimientos', docId, payload)
            : await addItem('establecimientos', docId, payload);

        setLoading(false);
        if (result.success) onClose();
        else setError(result.message);
    };

    if (!isOpen) return null;

    return (
        <div style={styles.overlay}>
            <div style={styles.content} className="fade-in-up">
                <div style={styles.header}>
                    <h3 style={styles.title}>
                        <Briefcase size={22} color="#6366f1"/> 
                        {initialData ? 'Editar Establecimiento' : 'Nuevo Establecimiento'}
                    </h3>
                    <button style={styles.closeBtn} onClick={onClose}><X size={20}/></button>
                </div>
                
                <form onSubmit={handleSubmit}>
                    <div style={styles.body}>
                        <div style={styles.grid}>
                            
                            <div style={styles.fullWidth}>
                                <label style={styles.label}>CIF *</label>
                                <input 
                                    style={{...styles.input, borderColor: '#6366f1', background: 'rgba(99, 102, 241, 0.1)'}}
                                    type="text" 
                                    value={formData.id} 
                                    onChange={e => setFormData({...formData, id: e.target.value.toUpperCase()})}
                                    readOnly={!!initialData}
                                    placeholder="B-12345678"
                                    required 
                                />
                            </div>

                            <div style={styles.fullWidth}>
                                <label style={styles.label}>Nombre Comercial</label>
                                <input 
                                    style={{...styles.input, fontSize: '1.1rem', fontWeight: 500}} 
                                    type="text" 
                                    value={formData.nombreComercial} 
                                    onChange={e => setFormData({...formData, nombreComercial: e.target.value})} 
                                    placeholder="Ej: Bar Central"
                                />
                            </div>

                            <div>
                                <label style={styles.label}><FileText size={12}/> Licencia Actividad</label>
                                <input style={styles.input} type="text" value={formData.licenciaActividad} onChange={e => setFormData({...formData, licenciaActividad: e.target.value})} />
                            </div>
                            <div>
                                <label style={styles.label}><Phone size={12}/> Teléfono</label>
                                <input style={styles.input} type="tel" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} />
                            </div>

                            <div style={styles.fullWidth}>
                                <label style={styles.label}>DNI Titular / Gerente</label>
                                <input style={styles.input} type="text" value={formData.titularDni} onChange={e => setFormData({...formData, titularDni: e.target.value.toUpperCase()})} />
                            </div>

                            <div style={styles.fullWidth}>
                                <label style={styles.label}><MapPin size={12}/> Dirección Completa</label>
                                <textarea 
                                    style={{...styles.input, resize: 'vertical', minHeight: '80px'}}
                                    value={formData.direccion} 
                                    onChange={e => setFormData({...formData, direccion: e.target.value})}
                                    placeholder="Calle, número, localidad..."
                                />
                            </div>
                        </div>

                        {error && <div style={styles.errorMsg}><AlertTriangle size={18}/> {error}</div>}
                    </div>

                    <div style={styles.footer}>
                        <button type="button" style={styles.btnCancel} onClick={onClose}>Cancelar</button>
                        <button type="submit" style={styles.btnSave} disabled={loading}>
                            {loading ? <Loader className="spin" size={18} /> : <Save size={18} />}
                            Guardar Local
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}