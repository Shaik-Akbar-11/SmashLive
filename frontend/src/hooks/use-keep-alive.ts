/**
 * Pings the backend every 14 minutes to prevent Render free tier from sleeping.
 * Call once at app startup.
 */
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace('/api', '');

let started = false;

export function startKeepAlive() {
  if (started) return;
  started = true;
  fetch(`${API_URL}/health`).catch(() => {});
  setInterval(() => {
    fetch(`${API_URL}/health`).catch(() => {});
  }, 14 * 60 * 1000);
}
