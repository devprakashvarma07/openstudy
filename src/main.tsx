import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error handler — prevents blank page on any uncaught error
window.addEventListener('error', (event) => {
  const root = document.getElementById('root');
  if (root && root.children.length === 0) {
    root.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui,sans-serif;padding:2rem;text-align:center;">
        <h1 style="font-size:1.5rem;font-weight:700;margin-bottom:1rem;">OpenStudy</h1>
        <p style="color:#666;margin-bottom:1.5rem;">Something went wrong. Please refresh the page.</p>
        <button onclick="location.reload()" style="padding:0.5rem 1.5rem;background:#5a4bda;color:#fff;border:none;border-radius:0.5rem;cursor:pointer;font-size:0.875rem;">Refresh Page</button>
      </div>
    `;
  }
  event.preventDefault();
});

createRoot(document.getElementById('root')!).render(<App />);
