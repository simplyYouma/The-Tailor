import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { initDatabase } from './lib/db';

/**
 * Entry point for The Tailor
 * Standard Yumi Hub Environment
 */
const startApp = async () => {
  // 🧵 Initialize SQLite if running inside Tauri
  if (window.__TAURI_INTERNALS__) {
    try {
      await initDatabase();
      console.log("[Main] Database synchronized.");
    } catch (err) {
      console.error("[Main] Failed to initialize database:", err);
    }
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

startApp();
