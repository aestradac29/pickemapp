import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './src/components/ErrorBoundary';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('No se encontró el elemento root para montar la aplicación.');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
