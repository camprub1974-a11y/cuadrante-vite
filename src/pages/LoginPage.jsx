// Archivo: /src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { User, Lock, Loader, AlertTriangle } from 'react-feather';

export default function LoginPage() {
  const { login } = useAuthStore(); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      await login(email, password);
    } catch (err) {
      console.error(err);
      setError("Credenciales incorrectas o error de conexión.");
    } finally {
      setLoading(false);
    }
  };

  // --- ESTILOS ---
  const styles = {
    container: {
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start', // Alineado a la izquierda
        paddingLeft: '10%', 
        paddingRight: '1rem',
        position: 'relative', // Necesario para posicionar el texto de versión

        // --- FONDO ---
        backgroundColor: '#0f172a',
        backgroundImage: `url("/Fondo.png")`, 
        backgroundSize: 'cover',   
        backgroundPosition: 'right center', // Fondo alineado a la derecha
        backgroundRepeat: 'no-repeat', 
        backgroundAttachment: 'fixed' 
    },
    loginCard: {
        padding: '3rem',
        width: '100%',
        maxWidth: '400px',
        background: 'rgba(15, 23, 42, 0.92)', 
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '24px',
        boxShadow: '0 30px 60px rgba(0, 0, 0, 0.7)',
        zIndex: 10 
    },
    logoContainer: {
        width: '90px', height: '90px', margin: '0 auto 1.5rem',
        background: 'rgba(0, 255, 136, 0.1)',
        borderRadius: '22px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid rgba(0, 255, 136, 0.25)',
    },
    inputContainer: {
        position: 'relative',
        marginBottom: '1.5rem'
    },
    inputIcon: {
        position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8'
    },
    input: {
        width: '100%', padding: '14px 14px 14px 48px',
        background: 'rgba(0, 0, 0, 0.3)', 
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '14px', color: 'white', outline: 'none', fontSize: '1rem',
        transition: 'all 0.3s ease'
    },
    button: {
        width: '100%', padding: '16px',
        background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)',
        border: 'none', borderRadius: '14px',
        color: '#064e3b', fontWeight: '800', fontSize: '1.05rem',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.8 : 1,
        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px',
        boxShadow: '0 10px 25px -5px rgba(0, 255, 136, 0.4)',
        transition: 'transform 0.2s ease'
    },
    // 💡 NUEVO ESTILO: Texto de versión en la esquina
    versionTag: {
        position: 'absolute',
        bottom: '20px',
        right: '25px',
        color: '#00ff88', // Verde Neón
        fontFamily: "'Courier New', Courier, monospace", // Fuente técnica/moderna
        fontSize: '0.9rem',
        fontWeight: 'bold',
        letterSpacing: '2px', // Espaciado moderno
        textShadow: '0 0 10px rgba(0, 255, 136, 0.6)', // Brillo neón
        opacity: 0.8,
        userSelect: 'none',
        zIndex: 5
    }
  };

  return (
    <div style={styles.container}>
      
      {/* TARJETA DE LOGIN */}
      <div style={styles.loginCard}>
        <div style={{textAlign: 'center', marginBottom: '2.5rem'}}>
          <div style={styles.logoContainer}>
            <img 
               src="/escudo_policia_local.png" 
               alt="Logo" 
               style={{width: '65%', height: 'auto'}}
               onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
          <h1 style={{fontSize: '2rem', fontWeight: '900', color: 'white', marginBottom: '0.5rem'}}>
            Jefatura Digital
          </h1>
          <p style={{color: '#94a3b8', fontSize: '1.05rem'}}>Acceso seguro al sistema</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={styles.inputContainer}>
            <label style={{display: 'block', color: '#e2e8f0', marginBottom: '0.75rem', fontSize: '0.95rem', fontWeight: 600}}>
              Email Corporativo
            </label>
            <div style={{position: 'relative'}}>
              <User size={20} style={styles.inputIcon}/>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                placeholder="agente@cuadrante.es"
                required
                onFocus={(e) => e.target.style.borderColor = 'rgba(0, 255, 136, 0.5)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>
          </div>

          <div style={{marginBottom: '2.5rem'}}>
            <label style={{display: 'block', color: '#e2e8f0', marginBottom: '0.75rem', fontSize: '0.95rem', fontWeight: 600}}>
              Contraseña
            </label>
            <div style={{position: 'relative'}}>
              <Lock size={20} style={styles.inputIcon}/>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                placeholder="••••••••"
                required
                onFocus={(e) => e.target.style.borderColor = 'rgba(0, 255, 136, 0.5)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>
          </div>

          {error && (
            <div style={{
              background: 'rgba(220, 38, 38, 0.15)', border: '1px solid rgba(220, 38, 38, 0.3)',
              color: '#fca5a5', padding: '14px', borderRadius: '12px', marginBottom: '2rem',
              display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem', fontWeight: 500
            }}>
              <AlertTriangle size={20} /> {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            style={styles.button}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.transform = 'translateY(0)')}
          >
            {loading ? <Loader className="spin" size={24}/> : 'Acceder al Sistema'}
          </button>
        </form>
      </div>

      {/* 💡 ETIQUETA DE VERSIÓN EN LA ESQUINA */}
      <div style={styles.versionTag}>
        GestPL@ACR/2025
      </div>
      
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        input::placeholder { color: #64748b; opacity: 1; }
        body { margin: 0; padding: 0; }
        
        /* Ajuste para móviles: centrar todo */
        @media (max-width: 768px) {
            .login-container {
                justify-content: center !important;
                padding-left: 1rem !important;
                background-position: center center !important;
            }
        }
      `}</style>
    </div>
  );
}