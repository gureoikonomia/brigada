import { useState, useEffect, useCallback, useRef } from 'react';
import * as authService from '../services/auth.service';
import AuthContext from './auth-context';

const USER_STORAGE_KEY = 'user';
const USER_ROLES = new Set(['user', 'moderator', 'admin']);

function normalizeUser(user) {
  if (!user || typeof user !== 'object') return null;

  const id = user.id || user._id;
  if (typeof id !== 'string' || !id || !USER_ROLES.has(user.role)) return null;

  return {
    id,
    name: typeof user.name === 'string' ? user.name : '',
    email: typeof user.email === 'string' ? user.email : '',
    role: user.role,
    avatarUrl: typeof user.avatarUrl === 'string' ? user.avatarUrl : null,
  };
}

function getStoredUser() {
  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    if (!stored) return null;

    const user = normalizeUser(JSON.parse(stored));
    if (!user) {
      localStorage.removeItem(USER_STORAGE_KEY);
      return null;
    }

    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    return user;
  } catch {
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);
  const [loading, setLoading] = useState(true);
  const [sessionCheckFailed, setSessionCheckFailed] = useState(false);
  const sessionCheckInFlight = useRef(false);

  const refreshSession = useCallback(async () => {
    if (sessionCheckInFlight.current) return;
    sessionCheckInFlight.current = true;

    try {
      const profile = normalizeUser(await authService.getProfile());
      if (!profile) throw new Error('Respuesta de perfil inválida');

      setUser(profile);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
      setSessionCheckFailed(false);
    } catch (error) {
      if (error.response?.status !== 401) setSessionCheckFailed(true);
    } finally {
      sessionCheckInFlight.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setSessionCheckFailed(false);
      localStorage.removeItem(USER_STORAGE_KEY);
    };
    const handleRefreshUnavailable = () => setSessionCheckFailed(true);
    window.addEventListener('brigada:unauthorized', handleUnauthorized);
    window.addEventListener('brigada:session-refresh-unavailable', handleRefreshUnavailable);
    Promise.resolve().then(refreshSession);

    return () => {
      window.removeEventListener('brigada:unauthorized', handleUnauthorized);
      window.removeEventListener('brigada:session-refresh-unavailable', handleRefreshUnavailable);
    };
  }, [refreshSession]);

  useEffect(() => {
    if (!sessionCheckFailed) return undefined;

    const retryTimer = window.setTimeout(refreshSession, 5000);
    window.addEventListener('focus', refreshSession);
    window.addEventListener('online', refreshSession);
    return () => {
      window.clearTimeout(retryTimer);
      window.removeEventListener('focus', refreshSession);
      window.removeEventListener('online', refreshSession);
    };
  }, [refreshSession, sessionCheckFailed]);

  const login = useCallback(async (credentials) => {
    const { user: loggedUser } = await authService.login(credentials);
    const normalizedUser = normalizeUser(loggedUser);
    if (!normalizedUser) throw new Error('Respuesta de inicio de sesión inválida');

    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalizedUser));
    setUser(normalizedUser);
    setSessionCheckFailed(false);
    return normalizedUser;
  }, []);

  const register = useCallback(async (payload) => {
    return authService.register(payload);
  }, []);

  const clearLocalSession = useCallback(() => {
    localStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
    setSessionCheckFailed(false);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    clearLocalSession();
  }, [clearLocalSession]);

  // Actualiza el usuario en memoria y en localStorage tras editar el perfil,
  // sin necesidad de volver a hacer login ni recargar la página.
  const updateUser = useCallback((updatedFields) => {
    setUser((prev) => {
      const next = normalizeUser({ ...prev, ...updatedFields });
      if (!next) return prev;
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        sessionCheckFailed,
        login,
        register,
        logout,
        clearLocalSession,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
