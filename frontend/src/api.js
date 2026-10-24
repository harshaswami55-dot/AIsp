/**
 * Authenticated fetch wrapper — attaches the stored JWT if present.
 */
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export function apiUrl(url) {
  return `${API_BASE_URL}${url}`;
}

export function apiFetch(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  const hasFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (options.body && typeof options.body === 'object' && !hasFormData) {
    headers['Content-Type'] = 'application/json';
    return fetch(apiUrl(url), { ...options, headers, body: JSON.stringify(options.body) });
  }
  return fetch(apiUrl(url), { ...options, headers });
}

export function authFetch(url, options = {}) {
  const token = localStorage.getItem('ai360_token');
  const headers = { ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    return fetch(apiUrl(url), { ...options, headers, body: JSON.stringify(options.body) });
  }
  return fetch(apiUrl(url), { ...options, headers });
}

export function clearAuth() {
  localStorage.removeItem('ai360_token');
}
