/** Stable React Query keys (Phase 27). */

export const queryKeys = {
  eleves: {
    all: ['eleves'],
    lists: () => [...queryKeys.eleves.all, 'list'],
    list: (params) => [...queryKeys.eleves.lists(), params],
    details: () => [...queryKeys.eleves.all, 'detail'],
    detail: (id) => [...queryKeys.eleves.details(), id],
    dashboardStats: () => [...queryKeys.eleves.all, 'dashboardStats'],
  },
  scolarite: {
    all: ['scolarite'],
    list: (f) => [...queryKeys.scolarite.all, 'list', f],
  },
  equipement: {
    all: ['equipement'],
    list: (f) => [...queryKeys.equipement.all, 'list', f],
  },
  sanctions: {
    all: ['sanctions'],
    list: (f) => [...queryKeys.sanctions.all, 'list', f],
  },
  demandes: {
    all: ['demandes'],
    list: (f) => [...queryKeys.demandes.all, 'list', f],
  },
  medical: {
    all: ['medical'],
    list: (f) => [...queryKeys.medical.all, 'list', f],
  },
  journal: {
    all: ['journal'],
    list: (f) => [...queryKeys.journal.all, 'list', f],
  },
  presence: {
    all: ['presence'],
    eleves: (f) => [...queryKeys.presence.all, 'eleves', f],
    historique: (f) => [...queryKeys.presence.all, 'historique', f],
    appel: (id) => [...queryKeys.presence.all, 'appel', id],
    parSection: () => [...queryKeys.presence.all, 'parSection'],
    trend: () => [...queryKeys.presence.all, 'trend'],
    topAbsences: () => [...queryKeys.presence.all, 'topAbsences'],
  },
  droits: {
    all: ['droits'],
    batch: (f) => [...queryKeys.droits.all, 'batch', f],
  },
  stock: {
    all: ['stock'],
    list: () => [...queryKeys.stock.all, 'list'],
    mouvements: () => [...queryKeys.stock.all, 'mouvements'],
  },
  permissions: {
    all: ['permissions'],
    list: (f) => [...queryKeys.permissions.all, 'list', f],
  },
  inscriptions: {
    all: ['inscriptions'],
    list: (f) => [...queryKeys.inscriptions.all, 'list', f],
  },
};
