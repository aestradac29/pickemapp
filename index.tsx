
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// --- REDIRECTION LOGIC ---
// Si el usuario accede desde el dominio antiguo de Google Cloud, redirigir a Vercel
const OLD_DOMAIN = "lol-pick-em-pro-606660166462.us-west1.run.app";
const NEW_URL = "https://pickemapp.vercel.app";

if (window.location.hostname === OLD_DOMAIN) {
  // Redirección inmediata manteniendo la ruta y parámetros
  window.location.replace(NEW_URL + window.location.pathname + window.location.search);
} else {
  // Solo renderizamos la app si NO estamos redirigiendo para evitar "flicker"
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("Could not find root element to mount to");
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
