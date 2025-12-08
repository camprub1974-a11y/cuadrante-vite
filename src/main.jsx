// Archivo: /src/main.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import '../css/main.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 💡 CAMBIO: Se ha eliminado basename="/app" para permitir que el Router de React maneje la ruta raíz (/) y la lógica de login/redirección. */}
    <BrowserRouter> 
      <App />
    </BrowserRouter>
  </React.StrictMode>
);