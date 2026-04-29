import { createContext, useContext } from 'react';

export const AuthContext = createContext(null);

export const DEMO_USERS = [];

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
