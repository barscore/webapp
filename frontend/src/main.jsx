import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './hooks/useAuth.js';
import 'leaflet/dist/leaflet.css';
import './index.css';

// Service worker only in production — in dev it fights HMR and can serve a
// stale offline page. In dev, actively unregister any leftover SW + caches.
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* registration is best-effort */
      });
    });
  } else {
    navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
    if (window.caches) caches.keys().then((ks) => ks.forEach((k) => caches.delete(k)));
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
