/**
 * Centralized API Base URL Configuration.
 * 
 * Priority:
 * 1. import.meta.env.VITE_API_BASE_URL (configured in Vercel / .env for production)
 * 2. Localhost / 127.0.0.1 fallback on port 8000 for local development
 * 3. Empty string fallback (relative paths)
 */

export const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    const { hostname, protocol } = window.location;
    // Local development
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
      return `${protocol}//${hostname}:8000`;
    }
  }

  // Fallback default
  return 'http://127.0.0.1:8000';
};

export const API_BASE_URL = getApiBaseUrl();
