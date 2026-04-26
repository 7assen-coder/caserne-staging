import { createContext, useContext } from 'react';
import { FONCTIONS } from '../utils/constants';

export const AuthContext = createContext(null);

export const DEMO_USERS = [
  {
    id: 'u1',
    matricule: 'SM-001',
    nom: 'MOHAMED',
    prenom: 'Sidi',
    fonction: FONCTIONS.COMMANDEMENT,
    grade: 'Commandant',
    email: 'commandement@esp.mr',
  },
  {
    id: 'u2',
    matricule: 'SM-002',
    nom: 'Hassen',
    prenom: 'Med',
    fonction: FONCTIONS.ENCADREMENT,
    grade: 'Directrice adj.',
    email: 'm.hassen@esp.mr',
  },
  {
    id: 'u3',
    matricule: 'SM-003',
    nom: 'ELY',
    prenom: 'Ahmed',
    fonction: FONCTIONS.TERRAIN,
    grade: 'Lieutenant',
    section: 'Section 1A',
    email: 'terrain@esp.mr',
  },
];

export const STORAGE_KEY = 'esp_auth_user';

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}

