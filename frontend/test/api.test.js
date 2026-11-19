import axios, { AxiosError } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
}));

let api;

function response(config, data = {}, status = 200) {
  return {
    config,
    data,
    headers: {},
    status,
    statusText: status === 200 ? 'OK' : 'Unauthorized',
  };
}

function httpError(config, status, code) {
  return new AxiosError(
    `Request failed with status code ${status}`,
    status >= 500 ? 'ERR_BAD_RESPONSE' : 'ERR_BAD_REQUEST',
    config,
    null,
    response(config, { code }, status),
  );
}

function requestPath(config) {
  return config.url.split('?')[0];
}

beforeEach(async () => {
  vi.resetModules();
  localStorage.clear();
  vi.spyOn(axios, 'get').mockResolvedValue({ data: { csrfToken: 'csrf-in-memory' } });
  ({ default: api } = await import('../src/services/api.js'));
});

afterEach(() => {
  vi.restoreAllMocks();
  delete navigator.locks;
});

describe('silent session refresh interceptor', () => {
  it('shares one refresh between concurrent requests and keeps the CSRF token', async () => {
    const attempts = new Map();
    let refreshCalls = 0;
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const lockRequest = vi.fn((_name, _options, callback) => callback());
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: { request: lockRequest },
    });

    api.defaults.adapter = async (config) => {
      const path = requestPath(config);
      if (path === '/auth/refresh') {
        refreshCalls += 1;
        expect(localStorage.getItem('brigada:session-refresh-lock')).toBeNull();
        expect(config.headers.get('X-CSRF-Token')).toBe('csrf-in-memory');
        return response(config, { refreshed: true });
      }

      const count = (attempts.get(path) || 0) + 1;
      attempts.set(path, count);
      if (count === 1) throw httpError(config, 401, 'SESSION_EXPIRED');
      expect(config.headers.get('X-CSRF-Token')).toBe('csrf-in-memory');
      return response(config, { path });
    };

    const results = await Promise.all([api.post('/resource/one'), api.post('/resource/two')]);

    expect(results.map(({ data }) => data.path)).toEqual(['/resource/one', '/resource/two']);
    expect(refreshCalls).toBe(1);
    expect(lockRequest).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'brigada:session-refresh-unavailable' }),
    );
  });

  it('keeps single-flight behavior when Web Locks are unavailable', async () => {
    let refreshCalls = 0;
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: undefined,
    });
    api.defaults.adapter = async (config) => {
      if (requestPath(config) === '/auth/refresh') {
        refreshCalls += 1;
        expect(localStorage.getItem('brigada:session-refresh-lock')).not.toBeNull();
        return response(config, { refreshed: true });
      }
      if (config._sessionRefreshRetried) return response(config, { ok: true });
      throw httpError(config, 401, 'SESSION_EXPIRED');
    };

    await Promise.all([api.get('/resource/one'), api.get('/resource/two')]);

    expect(refreshCalls).toBe(1);
    expect(localStorage.getItem('brigada:session-refresh-lock')).toBeNull();
  });

  it('retries the original request at most once', async () => {
    let resourceCalls = 0;
    let refreshCalls = 0;
    const { getProfile } = await import('../src/services/auth.service.js');
    api.defaults.adapter = async (config) => {
      if (requestPath(config) === '/auth/refresh') {
        refreshCalls += 1;
        return response(config, { refreshed: true });
      }
      resourceCalls += 1;
      throw httpError(config, 401, 'SESSION_EXPIRED');
    };

    await expect(getProfile()).rejects.toMatchObject({
      response: { status: 401, data: { code: 'SESSION_EXPIRED' } },
      isSessionRefreshUnavailable: true,
    });

    expect(resourceCalls).toBe(2);
    expect(refreshCalls).toBe(1);
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('preserves the local user and emits no unauthorized event on a network failure', async () => {
    localStorage.setItem('user', '{"id":"user-1"}');
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    api.defaults.adapter = async (config) => {
      if (requestPath(config) === '/auth/refresh') {
        throw new AxiosError('Network Error', 'ERR_NETWORK', config);
      }
      throw httpError(config, 401, 'SESSION_EXPIRED');
    };

    await expect(api.get('/resource')).rejects.toMatchObject({
      code: 'ERR_NETWORK',
      isSessionRefreshUnavailable: true,
    });

    expect(localStorage.getItem('user')).toBe('{"id":"user-1"}');
    expect(dispatchSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'brigada:unauthorized' }),
    );
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'brigada:session-refresh-unavailable' }),
    );
  });

  it('preserves the local user when the refresh endpoint returns a server error', async () => {
    localStorage.setItem('user', '{"id":"user-1"}');
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    api.defaults.adapter = async (config) => {
      if (requestPath(config) === '/auth/refresh') {
        throw httpError(config, 503, 'SERVICE_UNAVAILABLE');
      }
      throw httpError(config, 401, 'SESSION_EXPIRED');
    };

    await expect(api.get('/resource')).rejects.toMatchObject({
      response: { status: 503, data: { code: 'SERVICE_UNAVAILABLE' } },
      isSessionRefreshUnavailable: true,
    });

    expect(localStorage.getItem('user')).toBe('{"id":"user-1"}');
    expect(dispatchSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'brigada:unauthorized' }),
    );
  });

  it('clears the local user only when refresh returns SESSION_INVALID', async () => {
    localStorage.setItem('user', '{"id":"user-1"}');
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    api.defaults.adapter = async (config) => {
      if (requestPath(config) === '/auth/refresh') {
        throw httpError(config, 401, 'SESSION_INVALID');
      }
      throw httpError(config, 401, 'SESSION_EXPIRED');
    };

    await expect(api.get('/resource')).rejects.toMatchObject({
      response: { status: 401, data: { code: 'SESSION_INVALID' } },
    });

    expect(localStorage.getItem('user')).toBeNull();
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'brigada:unauthorized' }),
    );
    expect(dispatchSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'brigada:session-refresh-unavailable' }),
    );
  });
});
