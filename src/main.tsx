import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global interceptor for alert inside sandboxed iframe
if (typeof window !== 'undefined') {
  window.alert = (message: any) => {
    const event = new CustomEvent('show-toast', {
      detail: { message: String(message) }
    });
    window.dispatchEvent(event);
  };
}

// Register service worker for hybrid offline capabilities
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('Service Worker registered successfully:', reg.scope))
      .catch((err) => console.warn('Service Worker registration failed:', err));
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

