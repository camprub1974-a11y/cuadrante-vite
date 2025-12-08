// EN: /vite.config.js (REEMPLAZAR COMPLETO - VERSIÓN BLINDADA)

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    
    // ========================================================
    // === 💡 MIDDLEWARE MEJORADO ===
    // ========================================================
    {
      name: 'vite-plugin-strangler-fig',
      enforce: 'pre', 
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // 1. Si la URL es exactamente /app o /app/
          if (req.url === '/app' || req.url === '/app/') {
            req.url = '/app.html';
            return next();
          }
          
          // 2. Si la URL empieza por /app/ PERO NO TIENE EXTENSIÓN (es una ruta de React Router)
          //    Ej: /app/registros/crear -> Servir app.html
          //    Ej: /app/assets/index.js -> NO TOCAR (es un archivo)
          if (req.url.startsWith('/app/') && !req.url.includes('.')) {
             req.url = '/app.html';
             return next();
          }

          next();
        });
      }
    }
    // ========================================================
  ],
  
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        app: resolve(__dirname, 'app.html'),
        
        // Vistas antiguas (Asegúrate de que la lista esté completa)
        planificacion: resolve(__dirname, 'views/planificacion.html'),
        cuadrante: resolve(__dirname, 'views/cuadrante.html'),
        partes_servicio: resolve(__dirname, 'views/partes_servicio.html'),
        service_report: resolve(__dirname, 'views/service_report.html'),
        tareas: resolve(__dirname, 'views/tareas.html'),
        registro_electronico: resolve(__dirname, 'views/registro_electronico.html'),
        identificaciones: resolve(__dirname, 'views/identificaciones.html'),
        croquizador: resolve(__dirname, 'views/croquizador.html'),
        servicios_extra: resolve(__dirname, 'views/servicios_extra.html'),
        plantillas: resolve(__dirname, 'views/plantillas.html'),
        errorplanificacion: resolve(__dirname, 'views/errorplanificacion.html'),
        registros_estadisticas: resolve(__dirname, 'views/registros_estadisticas.html'),
        template_manager: resolve(__dirname, 'views/template_manager.html'),
        documentos_compuestos: resolve(__dirname, 'views/documentos_compuestos.html')
      }
    }
  }
});