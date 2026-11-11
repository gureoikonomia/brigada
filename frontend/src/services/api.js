import axios from 'axios';
import { Capacitor } from '@capacitor/core';

const apiBaseUrl = Capacitor.isNativePlatform()
  ? import.meta.env.VITE_NATIVE_API_URL || 'https://appbrigada.netlify.app/api'
  : import.meta.env.DEV
    ? import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
    : '/api';

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  timeout: 15_000,
});

let csrfToken;
let csrfRequest;
let csrfRefreshRequest;
const csrfExemptPostPaths = new Set([
  '/auth/register',
  '/auth/login',
  '/auth/resend-verification',
  '/auth/verify-email',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/request-account-deletion',
  '/auth/confirm-account-deletion',
]);

async function getCsrfToken() {
  if (csrfToken) return csrfToken;
  if (!csrfRequest) {
    csrfRequest = axios
      .get(`${apiBaseUrl}/auth/csrf`, {
        withCredentials: true,
        timeout: 15_000,
      })
      .then(({ data }) => {
        csrfToken = data.csrfToken;
        return csrfToken;
      })
      .finally(() => {
        csrfRequest = null;
      });
  }
  return csrfRequest;
}

function refreshCsrfToken() {
  if (!csrfRefreshRequest) {
    csrfToken = undefined;
    csrfRequest = undefined;
    csrfRefreshRequest = getCsrfToken().finally(() => {
      csrfRefreshRequest = null;
    });
  }
  return csrfRefreshRequest;
}

api.interceptors.request.use(async (config) => {
  const method = config.method?.toUpperCase();
  const requestPath = config.url
    ?.split('?')[0]
    .replace(/^\/api(?=\/)/, '');
  if (
    method
    && !['GET', 'HEAD', 'OPTIONS'].includes(method)
    && !(method === 'POST' && csrfExemptPostPaths.has(requestPath))
  ) {
    config.headers['X-CSRF-Token'] = await getCsrfToken();
  }
  return config;
});

// Si el backend responde 401 (token inválido/expirado), limpiamos la sesión
// local para que la app vuelva a pedir login en la siguiente acción.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (
      error.response?.status === 403
      && error.response.data?.code === 'CSRF_INVALID'
      && config
      && !config._csrfRetried
    ) {
      config._csrfRetried = true;
      await refreshCsrfToken();
      return api.request(config);
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('brigada:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;
