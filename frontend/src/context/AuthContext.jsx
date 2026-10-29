import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as authService from '../services/auth.service';

const AuthContext = createContext(null);

function getStoredUser() {
  try {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    localStorage.removeItem('user');
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);
  const [loading, setLoading] = useState(true);
  const [sessionCheckFailed, setSessionCheckFailed] = useState(false);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      localStorage.removeItem('user');
    };
    window.addEventListener('brigada:unauthorized', handleUnauthorized);

    authService
      .getProfile()
      .then((profile) => {
        setUser(profile);
        localStorage.setItem('user', JSON.stringify(profile));
      })
      .catch((error) => {
        if (error.response?.status !== 401) setSessionCheckFailed(true);
      })
      .finally(() => setLoading(false));

    return () => window.removeEventListener('brigada:unauthorized', handleUnauthorized);
  }, []);

  const login = useCallback(async (credentials) => {
    const { user: loggedUser } = await authService.login(credentials);
    localStorage.setItem('user', JSON.stringify(loggedUser));
    setUser(loggedUser);
    return loggedUser;
  }, []);

  const register = useCallback(async (payload) => {
    return authService.register(payload);
  }, []);

  const clearLocalSession = useCallback(() => {
    localStorage.removeItem('user');
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
      const next = { ...prev, ...updatedFields };
      localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      sessionCheckFailed,
      login,
      register,
      logout,
      clearLocalSession,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
