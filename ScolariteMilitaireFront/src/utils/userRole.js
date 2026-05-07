export const ROLES = {
  SUPERADMIN: 'superadmin',
  SUPERVISEUR: 'superviseur',
  COMMANDANT: 'commandant',
  CHEF_SECTION: 'chef-section',
  ETUDIANT: 'etudiant',
};

export const ROLE_LABEL = {
  [ROLES.SUPERADMIN]: 'Superadmin',
  [ROLES.SUPERVISEUR]: 'Superviseur',
  [ROLES.COMMANDANT]: 'Commandant de compagnie',
  [ROLES.CHEF_SECTION]: 'Chef de section',
  [ROLES.ETUDIANT]: 'Étudiant',
};

export const ROLE_HIERARCHY = [
  ROLES.SUPERADMIN,
  ROLES.SUPERVISEUR,
  ROLES.COMMANDANT,
  ROLES.CHEF_SECTION,
  ROLES.ETUDIANT,
];

export const ROLE_OPTIONS = ROLE_HIERARCHY.map((r) => ({ value: r, label: ROLE_LABEL[r] }));

const LEGACY_BACKEND_TO_ROLE = {
  commandement: ROLES.SUPERADMIN,
  encadrement: ROLES.SUPERVISEUR,
  terrain: ROLES.COMMANDANT,
};

const ROLE_TO_LEGACY_BACKEND = {
  [ROLES.SUPERADMIN]: 'commandement',
  [ROLES.SUPERVISEUR]: 'encadrement',
  [ROLES.COMMANDANT]: 'terrain',
  [ROLES.CHEF_SECTION]: 'terrain',
  [ROLES.ETUDIANT]: 'terrain',
};

export function getCanonicalRole(fonction) {
  if (!fonction) return ROLES.SUPERVISEUR;
  const f = String(fonction).toLowerCase();
  if (Object.values(ROLES).includes(f)) return f;
  return LEGACY_BACKEND_TO_ROLE[f] || ROLES.SUPERVISEUR;
}

export function roleToBackendFonction(role) {
  if (!role) return 'encadrement';
  return ROLE_TO_LEGACY_BACKEND[role] || 'encadrement';
}

const PERMISSIONS = {
  [ROLES.SUPERADMIN]: {
    canCreateStudent: true,
    canEditStudent: true,
    canDeleteStudent: true,
    canCreateMobilite: true,
    canCreateUserRoles: [ROLES.SUPERADMIN, ROLES.SUPERVISEUR, ROLES.COMMANDANT, ROLES.CHEF_SECTION, ROLES.ETUDIANT],
  },
  [ROLES.SUPERVISEUR]: {
    canCreateStudent: true,
    canEditStudent: true,
    canDeleteStudent: true,
    canCreateMobilite: true,
    canCreateUserRoles: [ROLES.SUPERVISEUR, ROLES.COMMANDANT, ROLES.CHEF_SECTION, ROLES.ETUDIANT],
  },
  [ROLES.COMMANDANT]: {
    canCreateStudent: true,
    canEditStudent: true,
    canDeleteStudent: false,
    canCreateMobilite: true,
    canCreateUserRoles: [ROLES.COMMANDANT, ROLES.CHEF_SECTION, ROLES.ETUDIANT],
  },
  [ROLES.CHEF_SECTION]: {
    canCreateStudent: false,
    canEditStudent: false,
    canDeleteStudent: false,
    canCreateMobilite: false,
    canCreateUserRoles: [],
  },
  [ROLES.ETUDIANT]: {
    canCreateStudent: false,
    canEditStudent: false,
    canDeleteStudent: false,
    canCreateMobilite: false,
    canCreateUserRoles: [],
  },
};

export function getPermissions(roleOrFonction) {
  const role = getCanonicalRole(roleOrFonction);
  return PERMISSIONS[role] || PERMISSIONS[ROLES.CHEF_SECTION];
}

export function canCreateRole(currentRoleOrFonction, targetRole) {
  const perms = getPermissions(currentRoleOrFonction);
  return perms.canCreateUserRoles.includes(targetRole);
}

export function getCreatableRoleOptions(currentRoleOrFonction) {
  const perms = getPermissions(currentRoleOrFonction);
  return ROLE_OPTIONS.filter((o) => perms.canCreateUserRoles.includes(o.value));
}
