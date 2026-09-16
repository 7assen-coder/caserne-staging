/**
 * Relative paths under VITE_API_BASE_URL (…/api/v1).
 * Single source of truth for SPA → API routing.
 */
export const apiPaths = {
  auth: {
    csrf: '/auth/csrf/',
    login: '/auth/login/',
    logout: '/auth/logout/',
    me: '/auth/me/',
    refresh: '/auth/refresh/',
    password: '/auth/password/',
    passwordReset: '/auth/password/reset/',
    passwordResetVerify: '/auth/password/reset/verify/',
    passwordResetConfirm: '/auth/password/reset/confirm/',
    users: '/auth/users/',
    user: (id) => `/auth/users/${id}/`,
    usersProvision: '/auth/users/provision/',
  },
  audit: {
    list: '/audit/',
    detail: (id) => `/audit/${id}/`,
  },
  eleves: {
    list: '/eleves/',
    detail: (id) => `/eleves/${id}/`,
    stats: '/eleves/stats/',
    scolariteSemestres: (id) => `/eleves/${id}/scolarite/semestres/`,
    scolariteMobilite: (id) => `/eleves/${id}/scolarite/mobilite/`,
    import: '/eleves/import/',
    importJob: (id) => `/eleves/import/jobs/${id}/`,
    importJobErrors: (id) => `/eleves/import/jobs/${id}/errors/`,
    importTemplate: '/eleves/import/template/',
  },
  contacts: {
    list: '/contacts/',
    detail: (id) => `/contacts/${id}/`,
  },
  sante: {
    list: '/sante/',
    detail: (id) => `/sante/${id}/`,
  },
  academique: {
    list: '/academique/',
    detail: (id) => `/academique/${id}/`,
  },
  militaire: {
    list: '/militaire/',
    detail: (id) => `/militaire/${id}/`,
  },
  hebergements: {
    list: '/hebergements/',
    detail: (id) => `/hebergements/${id}/`,
  },
  docs: {
    list: '/docs/',
    detail: (id) => `/docs/${id}/`,
  },
  equipements: {
    list: '/equipements/',
    detail: (id) => `/equipements/${id}/`,
    retour: (id) => `/equipements/${id}/retour/`,
  },
  sanctions: {
    list: '/sanctions/',
    detail: (id) => `/sanctions/${id}/`,
  },
  demandes: {
    list: '/demandes/',
    detail: (id) => `/demandes/${id}/`,
  },
  consultations: {
    list: '/consultations/',
    detail: (id) => `/consultations/${id}/`,
  },
  journal: {
    list: '/journal/',
    detail: (id) => `/journal/${id}/`,
  },
  appels: {
    list: '/appels/',
    detail: (id) => `/appels/${id}/`,
    lignes: (id) => `/appels/${id}/lignes/`,
  },
  droits: {
    batches: '/droits/batches/',
    batch: (id) => `/droits/batches/${id}/`,
    assurer: '/droits/batches/assurer/',
    seed: (id) => `/droits/batches/${id}/seed/`,
    valider: (id) => `/droits/batches/${id}/valider/`,
    unlock: (id) => `/droits/batches/${id}/unlock/`,
    lignes: '/droits/lignes/',
    ligne: (id) => `/droits/lignes/${id}/`,
  },
};

/** Auth URL fragments that must not trigger refresh/retry loops. */
export const AUTH_NO_REFRESH_RE = /\/auth\/(login|refresh|csrf)\//;
