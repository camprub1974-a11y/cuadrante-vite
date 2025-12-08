// Archivo: /src/components/Modals/IncidenciaModal.jsx

import React, { useState, useEffect } from 'react';
import { X, MapPin, Save, Send, CheckCircle, Crosshair, Loader, FileText, Printer } from 'react-feather';
import { useIncidenciasStore } from '../../store/incidenciasStore';
import { useAuthStore } from '../../store/authStore';
import { jsPDF } from "jspdf";
import { format } from 'date-fns';

export default function IncidenciaModal({ onClose, incidencia }) {
    const { addIncidencia, updateStatus, loading } = useIncidenciasStore();
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'admin' || user?.role === 'supervisor';
    const isNew = !incidencia;

    const [gettingLocation, setGettingLocation] = useState(false);

    const [form, setForm] = useState({
        tipo: 'Señalización',
        description: '',
        address: '',
        lat: '',
        lng: ''
    });

    const [gestionData, setGestionData] = useState({
        communicatedTo: '',
        resolutionNotes: ''
    });

    useEffect(() => {
        if (incidencia) {
            setForm(incidencia);
            setGestionData({
                communicatedTo: incidencia.communicatedTo || '',
                resolutionNotes: incidencia.resolutionNotes || ''
            });
        }
    }, [incidencia]);

    // --- HELPER: Convertir imagen local a Base64 ---
    const urlToBase64 = async (url) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error("Error cargando imagen local:", error);
            return null;
        }
    };

    // --- GENERAR PDF ---
    const generarPDFTramite = async (datosIncidencia, departamento) => {
        const doc = new jsPDF();
        const fechaActual = format(new Date(), 'dd/MM/yyyy HH:mm');
        const idIncidencia = datosIncidencia.id ? datosIncidencia.id.slice(0, 6).toUpperCase() : 'N/A';

        // 1. DIBUJAR FONDO CABECERA
        doc.setFillColor(30, 41, 59); // Azul oscuro
        doc.rect(0, 0, 210, 35, 'F'); 

        // 2. CARGAR ESCUDO (LOCAL)
        try {
            // 💡 Carga directa desde la carpeta public
            const logoBase64 = await urlToBase64('/escudo_policia_local.png');
            
            if (logoBase64) {
                // (imagen, formato, x, y, ancho, alto)
                doc.addImage(logoBase64, 'PNG', 15, 5, 25, 25);
            }
        } catch (error) {
            console.warn("No se pudo cargar el escudo local.", error);
        }

        // 3. TEXTOS CABECERA
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.text("COMUNICACIÓN DE INCIDENCIA", 115, 18, null, null, "center");
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("POLICÍA LOCAL - GESTIÓN DE VÍA PÚBLICA", 115, 26, null, null, "center");

        // --- CAJA DE INFORMACIÓN ---
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        
        let y = 50;
        
        doc.setDrawColor(200);
        doc.setFillColor(245, 245, 245);
        doc.rect(15, y - 5, 180, 20, 'FD');

        doc.setFont("helvetica", "bold");
        doc.text("ID REFERENCIA:", 20, y);
        doc.setFont("helvetica", "normal");
        doc.text(`#${idIncidencia}`, 55, y);

        doc.setFont("helvetica", "bold");
        doc.text("FECHA REPORTE:", 110, y);
        doc.setFont("helvetica", "normal");
        doc.text(datosIncidencia.createdAt ? format(new Date(datosIncidencia.createdAt), 'dd/MM/yyyy HH:mm') : '-', 145, y);
        
        y += 8;
        doc.setFont("helvetica", "bold");
        doc.text("AGENTE:", 20, y);
        doc.setFont("helvetica", "normal");
        doc.text(`${datosIncidencia.agentName || 'Agente'} (${datosIncidencia.agentId || 'N/A'})`, 55, y);

        // --- DETALLES ---
        y += 20;
        doc.setFontSize(12);
        doc.setTextColor(30, 41, 59);
        doc.setFont("helvetica", "bold");
        doc.text("DETALLES DEL DESPERFECTO", 15, y);
        doc.setDrawColor(30, 41, 59);
        doc.line(15, y + 2, 195, y + 2); 
        
        y += 10;
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);

        // Tipo
        doc.setFont("helvetica", "bold");
        doc.text("TIPO:", 20, y);
        doc.setFont("helvetica", "normal");
        doc.text(datosIncidencia.tipo || '-', 60, y);
        
        // Ubicación
        y += 8;
        doc.setFont("helvetica", "bold");
        doc.text("UBICACIÓN:", 20, y);
        doc.setFont("helvetica", "normal");
        doc.text(datosIncidencia.address || 'Sin dirección registrada', 60, y);

        // Coordenadas
        if (datosIncidencia.lat && datosIncidencia.lng) {
            y += 8;
            doc.setFont("helvetica", "bold");
            doc.text("COORDENADAS:", 20, y);
            doc.setFont("helvetica", "normal");
            doc.text(`${datosIncidencia.lat}, ${datosIncidencia.lng}`, 60, y);
            
            doc.setTextColor(0, 0, 255);
            doc.textWithLink("(Ver en Google Maps)", 110, y, { url: `http://googleusercontent.com/maps.google.com/?q=${datosIncidencia.lat},${datosIncidencia.lng}` });
            doc.setTextColor(0, 0, 0);
        }

        // Descripción
        y += 12;
        doc.setFont("helvetica", "bold");
        doc.text("DESCRIPCIÓN:", 20, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        
        const splitDescription = doc.splitTextToSize(datosIncidencia.description || 'Sin descripción detallada.', 170);
        doc.text(splitDescription, 20, y);
        
        y += (splitDescription.length * 5) + 15;

        // --- TRÁMITE ---
        doc.setFillColor(240, 253, 244); 
        doc.setDrawColor(34, 197, 94); 
        doc.rect(15, y, 180, 25, 'FD');

        y += 8;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(21, 128, 61);
        doc.text("TRÁMITE ADMINISTRATIVO", 20, y);
        
        y += 8;
        doc.setTextColor(0, 0, 0);
        doc.text("COMUNICADO A:", 20, y);
        doc.setFontSize(12);
        doc.text(departamento.toUpperCase(), 60, y);
        
        // --- PIE ---
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(`Documento generado electrónicamente el ${fechaActual}`, 105, 285, null, null, "center");

        doc.save(`Incidencia_${idIncidencia}_${departamento.replace(/\s+/g, '_')}.pdf`);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        await addIncidencia(form);
    };

    const handleTramitar = async () => {
        if(!gestionData.communicatedTo) return alert("Por favor, indica a qué departamento o entidad se comunica.");
        
        if(confirm(`Se marcará como TRAMITADA y se generará el documento PDF para: ${gestionData.communicatedTo}. ¿Continuar?`)) {
            const result = await updateStatus(incidencia.id, { 
                status: 'tramitada', 
                communicatedTo: gestionData.communicatedTo 
            });

            if (result.success) {
                await generarPDFTramite(incidencia, gestionData.communicatedTo);
            }
        }
    };

    const handleResolver = async () => {
        await updateStatus(incidencia.id, { 
            status: 'resuelta', 
            resolutionNotes: gestionData.resolutionNotes 
        });
    };

    const handleGetLocation = (e) => {
        e.preventDefault();
        if (!navigator.geolocation) return alert("Tu navegador no soporta geolocalización.");
        setGettingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setForm(prev => ({
                    ...prev,
                    lat: latitude,
                    lng: longitude,
                    address: prev.address || `Ubicación GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
                }));
                setGettingLocation(false);
            },
            (error) => {
                console.error("Error GPS:", error);
                alert("No se pudo obtener la ubicación.");
                setGettingLocation(false);
            },
            { enableHighAccuracy: true }
        );
    };

    return (
        <div className="modal-overlay">
            <div className="modal-container glass-panel">
                <div className="modal-header">
                    <h2>{isNew ? 'Nueva Incidencia' : `Incidencia #${incidencia.id.slice(0,4)}`}</h2>
                    <button 
                        onClick={onClose} 
                        style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: 'rgba(255, 255, 255, 0.7)',
                            cursor: 'pointer',
                            padding: '8px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '36px',
                            height: '36px',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <X size={20}/>
                    </button>
                </div>
                
                <div className="modal-body">
                    {/* FORMULARIO */}
                    <form id="incidenciaForm" onSubmit={handleCreate}>
                        <div className="form-group">
                            <label>Tipo de Incidencia</label>
                            <select 
                                value={form.tipo} 
                                onChange={e => setForm({...form, tipo: e.target.value})}
                                disabled={!isNew} 
                                className="selector"
                            >
                                <option>Señalización</option>
                                <option>Calzada/Acerado</option>
                                <option>Alumbrado</option>
                                <option>Mobiliario Urbano</option>
                                <option>Limpieza</option>
                                <option>Jardinería</option>
                                <option>Otros</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Descripción del desperfecto</label>
                            <textarea 
                                value={form.description}
                                onChange={e => setForm({...form, description: e.target.value})}
                                disabled={!isNew}
                                className="selector" rows="4"
                                placeholder="Describe el problema detalladamente..."
                            />
                        </div>

                        <div className="form-group">
                            <label><MapPin size={14}/> Ubicación / Dirección</label>
                            <div style={{display: 'flex', gap: '8px'}}>
                                <input 
                                    value={form.address}
                                    onChange={e => setForm({...form, address: e.target.value})}
                                    disabled={!isNew}
                                    className="selector"
                                    placeholder="Calle, número o referencia..."
                                    style={{flex: 1}}
                                />
                                {isNew && (
                                    <button 
                                        type="button" 
                                        className="button button-secondary"
                                        onClick={handleGetLocation}
                                        disabled={gettingLocation}
                                        title="Obtener ubicación"
                                        style={{minWidth: '42px', justifyContent: 'center', padding: 0}}
                                    >
                                        {gettingLocation ? <Loader size={18} className="spin"/> : <Crosshair size={18}/>}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                            <div className="form-group">
                                <label style={{fontSize: '0.8rem', opacity: 0.5}}>Latitud</label>
                                <input value={form.lat} disabled className="selector" type="number" readOnly/>
                            </div>
                            <div className="form-group">
                                <label style={{fontSize: '0.8rem', opacity: 0.5}}>Longitud</label>
                                <input value={form.lng} disabled className="selector" type="number" readOnly/>
                            </div>
                        </div>
                    </form>

                    {/* VISTA DE GESTIÓN (ADMIN) */}
                    {!isNew && isAdmin && (
                        <div style={{marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem'}}>
                            <h3 style={{color: '#fbbf24', fontSize: '1.1rem', marginBottom: '1rem'}}>Gestión Administrativa</h3>
                            
                            {incidencia.status === 'pendiente' && (
                                <div className="form-group">
                                    <label>Comunicar a (Departamento/Entidad):</label>
                                    <input 
                                        className="selector" 
                                        placeholder="Ej: Mantenimiento, Diputación, Alumbrado..."
                                        value={gestionData.communicatedTo}
                                        onChange={e => setGestionData({...gestionData, communicatedTo: e.target.value})}
                                    />
                                    <button 
                                        className="button btn-gradient-primary" 
                                        style={{marginTop: 10, width: '100%', justifyContent: 'center'}} 
                                        onClick={handleTramitar}
                                        disabled={loading}
                                    >
                                        {loading ? <Loader className="spin" size={16}/> : <FileText size={16} style={{marginRight: 8}}/>}
                                        Tramitar y Generar Documento
                                    </button>
                                </div>
                            )}

                            {incidencia.status === 'tramitada' && (
                                <div className="form-group">
                                    <div style={{color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                                        <span>✅ Comunicado a: <strong>{incidencia.communicatedTo}</strong></span>
                                        <button 
                                            onClick={() => generarPDFTramite(incidencia, incidencia.communicatedTo)}
                                            style={{background: 'transparent', border: '1px solid #10b981', color: '#10b981', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4}}
                                            title="Descargar copia"
                                        >
                                            <Printer size={14}/> Copia
                                        </button>
                                    </div>
                                    <label>Notas de Resolución:</label>
                                    <textarea 
                                        className="selector" 
                                        placeholder="Descripción del arreglo o actuación..."
                                        value={gestionData.resolutionNotes}
                                        onChange={e => setGestionData({...gestionData, resolutionNotes: e.target.value})}
                                    />
                                    <button className="button button-success" style={{marginTop: 10, width: '100%', justifyContent: 'center'}} onClick={handleResolver}>
                                        <CheckCircle size={16} style={{marginRight: 8}}/> Finalizar Incidencia
                                    </button>
                                </div>
                            )}

                             {incidencia.status === 'resuelta' && (
                                <div style={{textAlign: 'center', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px'}}>
                                    <h4 style={{color: '#10b981', margin: 0}}>¡Incidencia Resuelta!</h4>
                                    <p style={{fontSize: '0.9rem', opacity: 0.8, marginTop: '5px'}}>{incidencia.resolutionNotes}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    {isNew ? (
                        <button type="submit" form="incidenciaForm" className="button btn-gradient-primary" disabled={loading}>
                            {loading ? <Loader className="spin" size={18}/> : <Save size={18} style={{marginRight: 6}}/>}
                            {loading ? ' Guardando...' : ' Registrar Incidencia'}
                        </button>
                    ) : (
                        <button onClick={onClose} className="button button-secondary">Cerrar</button>
                    )}
                </div>
            </div>
            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}