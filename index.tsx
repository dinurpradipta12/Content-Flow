import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Proper service worker management for cache busting
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (let registration of registrations) {
        // Check for updates immediately
        registration.update();
        
        // After update check, clear old caches
        if (registration.waiting) {
          // New SW is waiting, skip waiting to activate immediately
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }
    });
  });
  
  // Listen for controller change when new SW activates
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    console.log('[SW] Controller changed, reloading page...');
    window.location.reload();
  });
}

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