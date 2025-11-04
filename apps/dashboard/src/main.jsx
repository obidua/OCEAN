import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client'
import App from './App.jsx';
import './index.css';

// Initialize sound system globally
import './utils/financialSounds.js';

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // console.log('SW registered:', registration);
      })
      .catch((error) => {
        // console.log('SW registration failed:', error);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
