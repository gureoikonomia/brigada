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
const SESSION_REFRESH_LOCK = 'brigada-session-refresh';
const SESSION_REFRESH_STORAGE_LOCK = 'brigada:session-refresh-lock';
const SESSION_REFRESH_LOCK_LEASE_MS = 20_000;
const SESSION_REFRESH_LOCK_WAIT_MS = 20_000;
const sessionRefreshLockOwner = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
let sessionRefreshPromise;

function getRequestPath(config) {
  const path = config.url?.split('?')[0] || '';
  return path.replace(/^\/api(?=\/)/, '').replace(/\/+$/, '') || '/';
}

function isSessionRefreshRequest(config) {
  return getRequestPath(config) === '/auth/refresh';
}

function clearLocalSession() {
  localStorage.removeItem('user');
  window.dispatchEvent(new Event('brigada:unauthorized'));
}

function signalSessionRefreshUnavailable(error) {
  error.isSessionRefreshUnavailable = true;
  window.dispatchEvent(new Event('brigada:session-refresh-unavailable'));
}

function withSessionRefreshLock(refresh) {
  const locks = globalThis.navigator?.locks;
  if (typeof locks?.request === 'function') {
    return locks.request(SESSION_REFRESH_LOCK, { mode: 'exclusive' }, refresh);
  }

  if (typeof localStorage === 'undefined') return refresh();

  return (async () => {
    const deadline = Date.now() + SESSION_REFRESH_LOCK_WAIT_MS;
    while (Date.now() < deadline) {
      const currentLock = JSON.parse(localStorage.getItem(SESSION_REFRESH_STORAGE_LOCK) || 'null');
      if (
        !currentLock ||
        !Number.isFinite(currentLock.expiresAt) ||
        currentLock.expiresAt <= Date.now()
      ) {
        const lockValue = JSON.stringify({
          owner: sessionRefreshLockOwner,
          expiresAt: Date.now() + SESSION_REFRESH_LOCK_LEASE_MS,
        });
        localStorage.setItem(SESSION_REFRESH_STORAGE_LOCK, lockValue);
        await new Promise((resolve) => window.setTimeout(resolve, 10));

        const claimedLock = JSON.parse(
          localStorage.getItem(SESSION_REFRESH_STORAGE_LOCK) || 'null',
        );
        if (claimedLock?.owner === sessionRefreshLockOwner) {
          try {
            return await refresh();
          } finally {
            if (localStorage.getItem(SESSION_REFRESH_STORAGE_LOCK) === lockValue) {
              localStorage.removeItem(SESSION_REFRESH_STORAGE_LOCK);
            }
          }
        }
      }
      await new Promise((resolve) => window.setTimeout(resolve, 50));
    }

    throw new Error('No se pudo adquirir el bloqueo para renovar la sesión');
  })();
}

function refreshSession() {
  if (!sessionRefreshPromise) {
    sessionRefreshPromise = withSessionRefreshLock(() => api.post('/auth/refresh', {}))
      .catch((error) => {
        if (error.response?.status !== 401 || error.response.data?.code !== 'SESSION_INVALID') {
          signalSessionRefreshUnavailable(error);
        }
        throw error;
      })
      .finally(() => {
        sessionRefreshPromise = null;
      });
  }
  return sessionRefreshPromise;
}

export function isSessionRefreshUnavailable(error) {
  return error?.isSessionRefreshUnavailable === true;
}

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
  const requestPath = config.url?.split('?')[0].replace(/^\/api(?=\/)/, '');
  if (
    method &&
    !['GET', 'HEAD', 'OPTIONS'].includes(method) &&
    !(method === 'POST' && csrfExemptPostPaths.has(requestPath))
  ) {
    config.headers['X-CSRF-Token'] = await getCsrfToken();
  }
  return config;
});

// Solo los 401 de sesión deben cerrar la sesión local; otros 401 no implican
// que la cookie de autenticación haya dejado de ser válida.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (
      error.response?.status === 403 &&
      error.response.data?.code === 'CSRF_INVALID' &&
      config &&
      !config._csrfRetried
    ) {
      config._csrfRetried = true;
      await refreshCsrfToken();
      return api.request(config);
    }

    if (error.response?.status === 401 && error.response.data?.code === 'SESSION_INVALID') {
      clearLocalSession();
      return Promise.reject(error);
    }

    if (
      error.response?.status === 401 &&
      error.response.data?.code === 'SESSION_EXPIRED' &&
      config &&
      !isSessionRefreshRequest(config)
    ) {
      if (config._sessionRefreshRetried) {
        signalSessionRefreshUnavailable(error);
        return Promise.reject(error);
      }

      config._sessionRefreshRetried = true;
      await refreshSession();
      return api.request(config);
    }
    return Promise.reject(error);
  },
);

export default api;
