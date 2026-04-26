import { mockDelay } from './api';
import { appels, presenceTrend, presenceParSection, topAbsences } from '../data/mockData';

let _appels = [...appels];

export const presenceService = {
  list: (filters = {}) => {
    let result = _appels;
    if (filters.section) result = result.filter((a) => a.section === filters.section);
    if (filters.type) result = result.filter((a) => a.type === filters.type);
    return mockDelay(result);
  },
  get: (id) => mockDelay(_appels.find((a) => a.id === id)),
  create: (data) => {
    const neu = { id: `a${Date.now()}`, date: new Date().toISOString(), ...data };
    _appels = [neu, ..._appels];
    return mockDelay(neu);
  },
  trend: () => mockDelay(presenceTrend),
  parSection: () => mockDelay(presenceParSection),
  topAbsences: () => mockDelay(topAbsences),
};
