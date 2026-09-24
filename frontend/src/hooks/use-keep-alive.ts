/**
 * Pings the backend every 10 minutes to prevent Render free tier from sleeping.
 * Render sleeps after 15 minutes — 10 min interval keeps it always awake.
 */
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace('/api', '');

let started = false;

export function startKeepAlive() {
  if (started) return;
  started = true;
  // Ping immediately on app load
  fetch(`${API_URL}/health`).catch(() => {});
  // Then every 10 minutes
  setInterval(() => {
    fetch(`${API_URL}/health`).catch(() => {});
  }, 10 * 60 * 1000);
}
