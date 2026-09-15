/**
 * Minimal API helper. Sends JSON with the stored JWT (if any).
 *
 * In development the Vite dev server proxies /api to the local backend
 * (see vite.config.js). In production, set VITE_API_URL to the backend
 * origin (e.g. https://api.example.com) in the hosting provider's
 * environment variables; requests then go to <VITE_API_URL>/api/...
 */
const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/+$/, '')}/api`
  : '/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('sb_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    let msg = (data && data.message) || `Request failed (${res.status})`;
    // A 404 on /api from a static host means the backend is missing there,
    // not the route: give an actionable hint instead of a bare status.
    if (res.status === 404 && !data) {
      msg =
        location.hostname === 'localhost' || location.hostname === '127.0.0.1'
          ? msg
          : `${msg} — the API server is not reachable from this deployment. Set VITE_API_URL to your hosted backend URL.`;
    }
    throw Object.assign(new Error(msg), { status: res.status, data });
  }
  return data;
}

export const api = {
  get:    (p) => request(p),
  post:   (p, body) => request(p, { method: 'POST', body: JSON.stringify(body) }),
  put:    (p, body) => request(p, { method: 'PUT', body: JSON.stringify(body) }),
  patch:  (p, body) => request(p, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (p) => request(p, { method: 'DELETE' }),
};