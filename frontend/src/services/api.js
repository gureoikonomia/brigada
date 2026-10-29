import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_URL || (
  import.meta.env.DEV ? 'http://localhost:3000/api' : undefined
);

if (!apiBaseUrl) {
  throw new Error('VITE_API_URL debe configurarse para la compilación de producción');
}

if (import.meta.env.PROD) {
  let productionApiUrl;
  try {
    productionApiUrl = new URL(apiBaseUrl);
  } catch {
    throw new Error('VITE_API_URL debe ser una URL HTTPS válida en producción');
  }

  const isLocalHost = ['localhost', '127.0.0.1', '[::1]'].includes(productionApiUrl.hostname);
  const apiPath = productionApiUrl.pathname.replace(/\/$/, '');
  if (
    productionApiUrl.protocol !== 'https:'
    || isLocalHost
    || apiPath !== '/api'
    || productionApiUrl.search
    || productionApiUrl.hash
  ) {
    throw new Error('VITE_API_URL debe ser una URL pública HTTPS terminada en /api y sin query ni hash');
  }
}

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  timeout: 15_000,
});

let csrfToken;
let csrfRequest;
let csrfRefreshRequest;

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
  if (method && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
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
