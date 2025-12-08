import React, { useState, useEffect } from 'react';
import { X, Save, Loader, Truck, User, Phone, Info, AlertTriangle } from 'react-feather';
import { useCollectionStore } from '../../../store/collectionStore';

// Estilos Glassmorphism (Consistentes con PersonModal)
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
    sectionTitle: { 
        gridColumn: '1 / -1', fontSize: '0.85rem', textTransform: 'uppercase', 
        letterSpacing: '1px', color: '#34d399', marginTop: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' 
    },
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
        padding: '0.75rem 1.5rem', background: '#f59e0b', border: 'none', // Color ámbar para vehículos
        color: 'white', borderRadius: '8px', fontWeight: 600, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: '8px'
    },
    errorMsg: {
        color: '#ef4444', fontSize: '0.9rem', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '8px',
        background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '8px'
    }
};

export default function VehicleModal({ isOpen, onClose, initialData }) {
    const { addItem, updateItem } = useCollectionStore();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        id: '', // Matrícula es el ID
        marca: '',
        modelo: '',
        color: '',
        titularDni: '',
        titularNombre: '',
        telefono: '',
        observaciones: ''
    });

    useEffect(() => {
        if (isOpen && initialData) {
            setFormData({
                id: initialData.id || '',
                marca: initialData.marca || '',
                modelo: initialData.modelo || '',
                color: initialData.color || '',
                titularDni: initialData.titularDni || '',
                titularNombre: initialData.titularNombre || '',
                telefono: initialData.telefonoContacto || initialData.telefono || '', 
                observaciones: initialData.observaciones || ''
            });
        } else if (isOpen) {
            setFormData({ id: '', marca: '', modelo: '', color: '', titularDni: '', titularNombre: '', telefono: '', observaciones: '' });
        }
        setError(null);
    }, [isOpen, initialData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const docId = formData.id.trim().toUpperCase();
        if (!docId) {
            setError("La matrícula es obligatoria.");
            setLoading(false);
            return;
        }

        const payload = {
            marca: formData.marca,
            modelo: formData.modelo,
            color: formData.color,
            titularDni: formData.titularDni.toUpperCase(),
            titularNombre: formData.titularNombre,
            telefonoContacto: formData.telefono,
            observaciones: formData.observaciones
        };

        const result = initialData 
            ? await updateItem('vehiculos', docId, payload)
            : await addItem('vehiculos', docId, payload);

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
                        <Truck size={22} color="#f59e0b"/> 
                        {initialData ? 'Editar Vehículo' : 'Nuevo Vehículo'}
                    </h3>
                    <button style={styles.closeBtn} onClick={onClose}><X size={20}/></button>
                </div>
                
                <form onSubmit={handleSubmit}>
                    <div style={styles.body}>
                        <div style={styles.grid}>
                            {/* Datos del Vehículo */}
                            <div style={styles.fullWidth}>
                                <label style={styles.label}>Matrícula *</label>
                                <input 
                                    style={{...styles.input, borderColor: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', fontSize: '1.1rem', fontWeight: 'bold', letterSpacing: '1px'}}
                                    type="text" 
                                    value={formData.id} 
                                    onChange={e => setFormData({...formData, id: e.target.value.toUpperCase()})}
                                    readOnly={!!initialData}
                                    placeholder="0000-XXX"
                                    required 
                                />
                            </div>

                            <div>
                                <label style={styles.label}>Marca</label>
                                <input style={styles.input} type="text" value={formData.marca} onChange={e => setFormData({...formData, marca: e.target.value})} placeholder="Ej: Seat" />
                            </div>
                            <div>
                                <label style={styles.label}>Modelo</label>
                                <input style={styles.input} type="text" value={formData.modelo} onChange={e => setFormData({...formData, modelo: e.target.value})} placeholder="Ej: Ibiza" />
                            </div>
                            <div style={styles.fullWidth}>
                                <label style={styles.label}>Color</label>
                                <input style={styles.input} type="text" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} placeholder="Ej: Blanco" />
                            </div>

                            {/* Datos del Titular */}
                            <div style={styles.sectionTitle}>Datos del Titular</div>

                            <div>
                                <label style={styles.label}><User size={12}/> DNI Titular</label>
                                <input style={styles.input} type="text" value={formData.titularDni} onChange={e => setFormData({...formData, titularDni: e.target.value.toUpperCase()})} />
                            </div>
                            <div>
                                <label style={styles.label}><Phone size={12}/> Teléfono Contacto</label>
                                <input style={styles.input} type="tel" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} />
                            </div>
                            <div style={styles.fullWidth}>
                                <label style={styles.label}>Nombre Completo Titular</label>
                                <input style={styles.input} type="text" value={formData.titularNombre} onChange={e => setFormData({...formData, titularNombre: e.target.value})} />
                            </div>

                            <div style={styles.fullWidth}>
                                <label style={styles.label}><Info size={12}/> Observaciones / Estado</label>
                                <textarea 
                                    style={{...styles.input, resize: 'vertical', minHeight: '80px'}}
                                    value={formData.observaciones} 
                                    onChange={e => setFormData({...formData, observaciones: e.target.value})}
                                    placeholder="Anotaciones adicionales..."
                                />
                            </div>
                        </div>

                        {error && <div style={styles.errorMsg}><AlertTriangle size={18}/> {error}</div>}
                    </div>

                    <div style={styles.footer}>
                        <button type="button" style={styles.btnCancel} onClick={onClose}>Cancelar</button>
                        <button type="submit" style={styles.btnSave} disabled={loading}>
                            {loading ? <Loader className="spin" size={18} /> : <Save size={18} />}
                            Guardar Vehículo
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}