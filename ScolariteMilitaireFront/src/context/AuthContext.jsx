import { useEffect, useMemo, useState } from 'react';
import { AuthContext, DEMO_USERS } from './authStore';
import {
  fetchCurrentUser,
  loginRequest,
  logoutRequest,
  refreshAccessToken,
} from '../services/authService';
import { updateLocalUserPassword } from '../utils/localUserStore';
import { clearAccessToken, getAccessToken } from '../utils/authStorage';
import { isLocalSessionToken } from '../utils/localUserStore';

const AUTH_BOOTSTRAP_TIMEOUT_MS = 6000;

function withBootstrapTimeout(promise) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error('AUTH_BOOTSTRAP_TIMEOUT')), AUTH_BOOTSTRAP_TIMEOUT_MS);
    }),
  ]);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const token = getAccessToken();

      if (!token) {
        if (!cancelled) {
          setUser(null);
          setMustChangePassword(false);
          setBootstrapped(true);
        }
        return;
      }

      try {
        await withBootstrapTimeout((async () => {
          try {
            const me = await fetchCurrentUser();
            if (!cancelled) {
              setUser(me);
              setMustChangePassword(!!me?.mustChangePassword);
            }
          } catch {
            if (!isLocalSessionToken(token)) {
              await refreshAccessToken();
            }
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

  const completePasswordChange = async (newPassword) => {
    if (!user?.email) throw new Error('Session invalide.');
    const updated = updateLocalUserPassword(user.email, newPassword);
    setUser(updated);
    setMustChangePassword(false);
    return updated;
  };

  const logout = async () => {
    await logoutRequest();
    setUser(null);
    setMustChangePassword(false);
  };

  const value = useMemo(
    () => ({
      user,
      bootstrapped,
      isAuthenticated: !!user,
      mustChangePassword,
      fonction: user?.fonction,
      login,
      logout,
      completePasswordChange,
      demoUsers: DEMO_USERS,
    }),
    [user, bootstrapped, mustChangePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
