import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client'
import App from './App.jsx';
import './index.css';

// Initialize sound system globally
import './utils/financialSounds.js';

// Filter out non-critical console warnings
import './utils/consoleFilter.js';

// Initialize RPC before app starts
import { initializeWithWorkingRPC } from '../config/index.js';

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

// Initialize app with working RPC
async function initializeApp() {
  try {
    // Check and configure working RPC before rendering
    await initializeWithWorkingRPC();

    // Render app after RPC is configured
    ReactDOM.createRoot(document.getElementById('root')).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  } catch (error) {
    console.error('Failed to initialize app:', error);
    // Render anyway with default config
    ReactDOM.createRoot(document.getElementById('root')).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  }
}

// Start app initialization
initializeApp();
