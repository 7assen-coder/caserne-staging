import { useEffect, useMemo, useState } from 'react';
import { AuthContext, DEMO_USERS } from './authStore';
import { fetchCurrentUser, loginRequest, logoutRequest } from '../services/authService';
import { api } from '../services/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token =
        typeof localStorage !== 'undefined' ? localStorage.getItem('esp_token') : null;

      if (!token) {
        if (!cancelled) {
          setUser(null);
          setBootstrapped(true);
        }
        return;
      }

      try {
        const me = await fetchCurrentUser();
        if (!cancelled) setUser(me);
      } catch {
        try {
          const { data } = await api.post('/auth/token/refresh/', {});
          if (data?.access) localStorage.setItem('esp_token', data.access);
          const me = await fetchCurrentUser();
          if (!cancelled) setUser(me);
        } catch {
          localStorage.removeItem('esp_token');
          if (!cancelled) setUser(null);
        }
      } finally {
        if (!cancelled) setBootstrapped(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async ({ channel, email, phone, password, remember_me }) => {
    const payload =
      channel === 'email'
        ? { email: email.trim().toLowerCase(), password, remember_me }
        : { phone: phone.trim(), password, remember_me };
    const nextUser = await loginRequest(payload);
    setUser(nextUser);
    return nextUser;
  };

  const logout = async () => {
    await logoutRequest();
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      bootstrapped,
      isAuthenticated: !!user,
      fonction: user?.fonction,
      login,
      logout,
      demoUsers: DEMO_USERS,
    }),
    [user, bootstrapped],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
