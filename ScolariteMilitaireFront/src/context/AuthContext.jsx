import { useEffect, useMemo, useState } from 'react';
import { AuthContext, DEMO_USERS, STORAGE_KEY } from './authStore';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  }, [user]);

  const login = (fonctionOrEmailOrPhone) => {
    const raw = String(fonctionOrEmailOrPhone ?? '').trim().toLowerCase();
    /* MR : 8 chiffres, préfixe 2–4 (démo) */
    if (/^[234]\d{7}$/.test(raw)) {
      const found = DEMO_USERS[1];
      setUser(found);
      return found;
    }
    if (raw.endsWith('@esp.mr')) {
      const byMail = DEMO_USERS.find((u) => u.email.toLowerCase() === raw);
      const found = byMail ?? DEMO_USERS[1];
      setUser(found);
      return found;
    }
    const found = DEMO_USERS.find((u) => u.fonction === fonctionOrEmailOrPhone) ?? DEMO_USERS[0];
    setUser(found);
    return found;
  };

  const logout = () => setUser(null);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      fonction: user?.fonction,
      login,
      logout,
      demoUsers: DEMO_USERS,
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
