import { mockDelay } from './api';
import { permissions } from '../data/mockData';

let _permissions = [...permissions];

export const permissionService = {
  list: (filters = {}) => {
    let result = _permissions;
    if (filters.statut) result = result.filter((p) => p.statut === filters.statut);
    if (filters.section) result = result.filter((p) => p.section === filters.section);
    return mockDelay(result);
  },
  get: (id) => mockDelay(_permissions.find((p) => p.id === id)),
  create: (data) => {
    const neu = {
      id: `p${Date.now()}`,
      statut: 'en_attente',
      dateDemande: new Date().toISOString(),
      ...data,
    };
    _permissions = [neu, ..._permissions];
    return mockDelay(neu);
  },
  validate: (id, { statut, commentaire, validePar }) => {
    _permissions = _permissions.map((p) =>
      p.id === id ? { ...p, statut, commentaire, validePar } : p,
    );
    return mockDelay(_permissions.find((p) => p.id === id));
  },
};
