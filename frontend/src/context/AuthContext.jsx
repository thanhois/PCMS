import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import authApi from '../api/authApi';
import {
  clearAccessToken,
  getAccessToken,
  onUnauthorized,
  setAccessToken,
} from '../api/axiosClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Toàn bộ token và thông tin user chỉ lưu trong bộ nhớ (React state + biến module in-memory)
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(() => getAccessToken());

  const logout = useCallback(() => {
    clearAccessToken();
    setTokenState(null);
    setUser(null);
  }, []);

  useEffect(() => {
    onUnauthorized(() => {
      setTokenState(null);
      setUser(null);
    });
  }, []);

  const login = useCallback(async ({ login: loginId, password }) => {
    const response = await authApi.login({ login: loginId, password });
    const { accessToken, user: userData } = response.data;

    // Lưu token vào biến toàn cục in-memory của Axios + state
    setAccessToken(accessToken);
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
    setUser(response.data);
    return response.data;
  }, []);

  const value = useMemo(
    () => ({
      user,
      accessToken: token,
      isAuthenticated: Boolean(token && user),
      login,
      register,
      logout,
      refreshProfile,
    }),
    [user, token, login, register, logout, refreshProfile]
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
