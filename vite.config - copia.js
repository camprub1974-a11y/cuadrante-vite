// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    // Esto está bien, lo mantenemos.
    dedupe: ['nanostores'],
  },

  // ✅ AÑADE ESTA SECCIÓN PARA CORREGIR EL ERROR
  // Le decimos a Vite explícitamente que los archivos .js son JavaScript normal, no JSX.
  esbuild: {
    loader: 'js', // Usa el loader 'js' por defecto
    include: /src\/.*\.js$/, // Incluye solo los archivos .js que necesiten un trato especial (si los hubiera)
    exclude: [], // No excluye nada por ahora
  },
  
  // Optimización para que el servidor de desarrollo entienda que no hay JSX en los .js
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'js',
      },
    },
  },
});