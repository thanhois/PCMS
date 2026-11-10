import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import authApi from '../api/authApi';
import {
  clearAccessToken,
  getAccessToken,
  onUnauthorized,
  setAccessToken,
} from '../api/axiosClient';

const AuthContext = createContext(null);

const USER_STORAGE_KEY = 'pcms_auth_user';

const persistUser = (userData) => {
  try {
    if (typeof window !== 'undefined') {
      if (userData) {
        window.sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      } else {
        window.sessionStorage.removeItem(USER_STORAGE_KEY);
      }
    }
  } catch {
    // Ignore storage errors
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      if (typeof window !== 'undefined' && getAccessToken()) {
        const raw = window.sessionStorage.getItem(USER_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      }
    } catch {
      // Ignore parse errors
    }
    return null;
  });
  const [token, setTokenState] = useState(() => getAccessToken());
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = useCallback(() => {
    clearAccessToken();
    persistUser(null);
    setIsLoggingOut(true);
    setTokenState(null);
    setUser(null);
  }, []);

  const clearLoggingOut = useCallback(() => {
    setIsLoggingOut(false);
  }, []);

  useEffect(() => {
    onUnauthorized(() => {
      persistUser(null);
      setTokenState(null);
      setUser(null);
    });
  }, []);

  const login = useCallback(async ({ login: loginId, password }) => {
    const response = await authApi.login({ login: loginId, password });
    const { accessToken, user: userData } = response.data;

    setIsLoggingOut(false);
    setAccessToken(accessToken);
    persistUser(userData);
    setTokenState(accessToken);
    setUser(userData);

    return response;
  }, []);

  const register = useCallback(async (payload) => {
    const response = await authApi.register(payload);
    return response;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!getAccessToken()) return null;
    const response = await authApi.getCurrentUser();
    persistUser(response.data);
    setUser(response.data);
    return response.data;
  }, []);

  const updateProfile = useCallback(async (payload) => {
    const response = await authApi.updateProfile(payload);
    if (response?.data) {
      persistUser(response.data);
      setUser(response.data);
    }
    return response;
  }, []);

  const changePassword = useCallback(async (payload) => {
    const response = await authApi.changePassword(payload);
    setUser((prev) => {
      const next = prev ? { ...prev, mustChangePassword: false } : prev;
      persistUser(next);
      return next;
    });
    return response;
  }, []);

  const value = useMemo(
    () => ({
      user,
      accessToken: token,
      isAuthenticated: Boolean(token && user),
      isLoggingOut,
      login,
      register,
      logout,
      clearLoggingOut,
      refreshProfile,
      updateProfile,
      changePassword,
    }),
    [
      user,
      token,
      isLoggingOut,
      login,
      register,
      logout,
      clearLoggingOut,
      refreshProfile,
      updateProfile,
      changePassword,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
