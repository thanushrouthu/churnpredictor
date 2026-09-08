/**
 * Centralized API Base URL Configuration.
 * 
 * Strictly environment-variable driven (VITE_API_URL / VITE_API_BASE_URL).
 * Local development is configured via VITE_API_URL in frontend/.env.
 */

export const getApiBaseUrl = () => {
  // 1. Dynamic Vite environment variables
  const envApiUrl = typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL)
    : '';

  if (envApiUrl) {
    return envApiUrl.replace(/\/$/, '');
  }

  // 2. Local browser development fallback only when accessing via localhost
  if (typeof window !== 'undefined') {
    const { hostname, protocol } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
      return `${protocol}//${hostname}:8000`;
    }
  }

  // 3. In production, do not fall back to localhost
  return '';
};

export const API_BASE_URL = getApiBaseUrl();
export const API_URL = API_BASE_URL;

export default API_BASE_URL;
