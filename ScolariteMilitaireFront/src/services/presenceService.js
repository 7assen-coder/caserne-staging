import {
  addAppel,
  computePresenceParSection,
  computePresenceTrend,
  computeTopAbsences,
  getAppel,
  listAppels,
} from '../utils/presenceStore';

export const presenceService = {
  list: (filters = {}) => Promise.resolve(listAppels(filters)),
  get: (id) => Promise.resolve(id ? getAppel(id) : null),
  create: (data) => Promise.resolve(addAppel(data)),
  trend: () => Promise.resolve(computePresenceTrend()),
  parSection: () => Promise.resolve(computePresenceParSection()),
  topAbsences: () => Promise.resolve(computeTopAbsences()),
};
