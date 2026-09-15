/**
 * Minimal API helper. Sends JSON with the stored JWT (if any).
 */
const BASE = '/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('sb_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const msg = (data && data.message) || `Request failed (${res.status})`;
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