// frontend/src/config/api.js
// Centralized API Base URL configuration for production and local environments

const resolveApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '');
  }
  return 'https://allver.onrender.com/api';
};

const resolveBackendUrl = () => {
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL.replace(/\/+$/, '');
  }
  return 'https://allver.onrender.com';
};

export const API_BASE_URL = resolveApiBaseUrl();
export const BACKEND_URL = resolveBackendUrl();

export const getAuthToken = () => {
  try {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.token || user.jwt || null;
    }
  } catch {
    // Ignore parse error
  }
  return null;
};
