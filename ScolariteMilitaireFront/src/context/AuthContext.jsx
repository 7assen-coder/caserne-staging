import { useEffect, useMemo, useState } from 'react';
import { AuthContext, DEMO_USERS } from './authStore';
import {
  changePasswordRequest,
  fetchCurrentUser,
  loginRequest,
  logoutRequest,
} from '../services/authService';
import { isFrontendOnly } from '../utils/frontendMode';
import { clearAccessToken, clearLegacyTokens } from '../utils/authStorage';
import { ensureCsrfToken } from '../utils/csrf';
import { api, refreshSession } from '../services/api';
import {
  AUTH_BOOTSTRAP_HARD_FALLBACK_MS,
  AUTH_BOOTSTRAP_TIMEOUT_MS,
  AUTH_EXPIRED_EVENT,
} from '../services/apiConstants';
import { queryClient } from '../lib/queryClient';

const LOCAL_USERS_KEY = 'esp_local_users_v1';

function withBootstrapTimeout(promise) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error('AUTH_BOOTSTRAP_TIMEOUT')), AUTH_BOOTSTRAP_TIMEOUT_MS);
    }),
  ]);
}

function clearLegacyLocalAuth() {
  try {
    clearLegacyTokens();
    localStorage.removeItem(LOCAL_USERS_KEY);
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    clearLegacyLocalAuth();
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => setBootstrapped(true), AUTH_BOOTSTRAP_HARD_FALLBACK_MS);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      setMustChangePassword(false);
      clearAccessToken();
      queryClient.clear();
      try {
        if (window.location.pathname !== '/login' && !window.location.pathname.startsWith('/login/')) {
          window.location.assign('/login');
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  useEffect(() => {
    let cancelled = false;
    clearLegacyLocalAuth();

    if (isFrontendOnly()) {
      clearAccessToken();
      if (!cancelled) {
        setUser(null);
        setMustChangePassword(false);
        setBootstrapped(true);
      }
      return undefined;
    }

    (async () => {
      try {
        await withBootstrapTimeout((async () => {
          try {
            await ensureCsrfToken(api);
          } catch {
            /* CSRF optional until first mutating call */
          }
          try {
            const me = await fetchCurrentUser();
            if (!cancelled) {
              setUser(me);
              setMustChangePassword(!!me?.mustChangePassword);
            }
          } catch {
            await refreshSession();
            const me = await fetchCurrentUser();
            if (!cancelled) {
              setUser(me);
              setMustChangePassword(!!me?.mustChangePassword);
            }
          }
        })());
      } catch {
        clearAccessToken();
        if (!cancelled) {
          setUser(null);
          setMustChangePassword(false);
        }
      } finally {
        if (!cancelled) setBootstrapped(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = async ({ email, password, remember_me }) => {
    const { user: nextUser, mustChangePassword: mustChange } = await loginRequest({
      email,
      password,
      remember_me,
    });
    setUser(nextUser);
    setMustChangePassword(!!mustChange);
    return nextUser;
  };

  const completePasswordChange = async (newPassword, currentPassword = '') => {
    const updated = await changePasswordRequest({
      current_password: currentPassword,
      new_password: newPassword,
    });
    setUser(updated);
    setMustChangePassword(false);
    return updated;
  };

  const logout = async () => {
    await logoutRequest();
    setUser(null);
    setMustChangePassword(false);
    queryClient.clear();
  };

  const value = useMemo(
    () => ({
      user,
      bootstrapped,
      isAuthenticated: !!user,
      mustChangePassword,
      fonction: user?.fonction,
      sensitiveCaps: user?.sensitive_caps || null,
      login,
      logout,
      completePasswordChange,
      demoUsers: DEMO_USERS,
    }),
    [user, bootstrapped, mustChangePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
