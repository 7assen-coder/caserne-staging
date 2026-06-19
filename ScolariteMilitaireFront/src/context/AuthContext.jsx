import { useEffect, useMemo, useState } from 'react';
import { AuthContext, DEMO_USERS } from './authStore';
import {
  fetchCurrentUser,
  loginRequest,
  logoutRequest,
  refreshAccessToken,
} from '../services/authService';
import {
  findLocalUserById,
  isLocalSessionToken,
  toPublicUser,
  updateLocalUserPassword,
  userIdFromLocalToken,
} from '../utils/localUserStore';
import { isFrontendOnly } from '../utils/frontendMode';
import { clearAccessToken, getAccessToken } from '../utils/authStorage';

const AUTH_BOOTSTRAP_TIMEOUT_MS = 4000;

function withBootstrapTimeout(promise) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error('AUTH_BOOTSTRAP_TIMEOUT')), AUTH_BOOTSTRAP_TIMEOUT_MS);
    }),
  ]);
}

function initialBootstrapped() {
  const token = getAccessToken();
  if (!token) return true;
  if (isLocalSessionToken(token)) return true;
  return false;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = getAccessToken();
    if (isLocalSessionToken(token)) {
      const record = findLocalUserById(userIdFromLocalToken(token));
      return record ? toPublicUser(record) : null;
    }
    return null;
  });
  const [mustChangePassword, setMustChangePassword] = useState(() => {
    const token = getAccessToken();
    if (isLocalSessionToken(token)) {
      const record = findLocalUserById(userIdFromLocalToken(token));
      return !!record?.mustChangePassword;
    }
    return false;
  });
  const [bootstrapped, setBootstrapped] = useState(initialBootstrapped);

  useEffect(() => {
    const id = window.setTimeout(() => setBootstrapped(true), 5000);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const token = getAccessToken();

    if (!token) {
      setUser(null);
      setMustChangePassword(false);
      setBootstrapped(true);
      return undefined;
    }

    if (isLocalSessionToken(token)) {
      const record = findLocalUserById(userIdFromLocalToken(token));
      if (!cancelled) {
        setUser(record ? toPublicUser(record) : null);
        setMustChangePassword(!!record?.mustChangePassword);
        setBootstrapped(true);
      }
      return undefined;
    }

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
            const me = await fetchCurrentUser();
            if (!cancelled) {
              setUser(me);
              setMustChangePassword(!!me?.mustChangePassword);
            }
          } catch {
            await refreshAccessToken();
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
