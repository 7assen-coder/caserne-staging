export const ROLES = {
  ETUDIANT: 'etudiant',
  SUPERVISEUR: 'superviseur',
  CHEF_SECTION: 'chef_section',
  COMMANDANT_COMPAGNIE: 'commandant_compagnie',
  COMMANDANT_GROUPEMENT: 'commandant_groupement',
  COMMANDANT_UNITE: 'commandant_unite',
  ADMINISTRATEUR: 'administrateur',
};

export const ROLE_LABEL = {
  [ROLES.ETUDIANT]: 'Étudiant',
  [ROLES.SUPERVISEUR]: 'Superviseur',
  [ROLES.CHEF_SECTION]: 'Chef de section',
  [ROLES.COMMANDANT_COMPAGNIE]: 'Commandant de compagnie',
  [ROLES.COMMANDANT_GROUPEMENT]: 'Commandant de groupement',
  [ROLES.COMMANDANT_UNITE]: "Commandant d'unité",
  [ROLES.ADMINISTRATEUR]: 'Administrateur',
};

export const ROLE_HIERARCHY = [
  ROLES.ADMINISTRATEUR,
  ROLES.COMMANDANT_UNITE,
  ROLES.COMMANDANT_GROUPEMENT,
  ROLES.COMMANDANT_COMPAGNIE,
  ROLES.CHEF_SECTION,
  ROLES.SUPERVISEUR,
  ROLES.ETUDIANT,
];

export const ROLE_OPTIONS = ROLE_HIERARCHY.map((r) => ({ value: r, label: ROLE_LABEL[r] }));

/** Legacy backend valeurs → nouveaux rôles */
const LEGACY_BACKEND_TO_ROLE = {
  commandement: ROLES.ADMINISTRATEUR,
  encadrement: ROLES.SUPERVISEUR,
  terrain: ROLES.CHEF_SECTION,
  superadmin: ROLES.ADMINISTRATEUR,
  superviseur: ROLES.SUPERVISEUR,
  commandant: ROLES.COMMANDANT_COMPAGNIE,
  'chef-section': ROLES.CHEF_SECTION,
  etudiant: ROLES.ETUDIANT,
};

const ROLE_TO_BACKEND = {
  [ROLES.ETUDIANT]: ROLES.ETUDIANT,
  [ROLES.SUPERVISEUR]: ROLES.SUPERVISEUR,
  [ROLES.CHEF_SECTION]: ROLES.CHEF_SECTION,
  [ROLES.COMMANDANT_COMPAGNIE]: ROLES.COMMANDANT_COMPAGNIE,
  [ROLES.COMMANDANT_GROUPEMENT]: ROLES.COMMANDANT_GROUPEMENT,
  [ROLES.COMMANDANT_UNITE]: ROLES.COMMANDANT_UNITE,
  [ROLES.ADMINISTRATEUR]: ROLES.ADMINISTRATEUR,
};

export function getCanonicalRole(fonction) {
  if (!fonction) return ROLES.SUPERVISEUR;
  const f = String(fonction).toLowerCase();
  if (Object.values(ROLES).includes(f)) return f;
  return LEGACY_BACKEND_TO_ROLE[f] || ROLES.SUPERVISEUR;
}

export function roleToBackendFonction(role) {
  if (!role) return ROLES.SUPERVISEUR;
  const canonical = getCanonicalRole(role);
  return ROLE_TO_BACKEND[canonical] || ROLES.SUPERVISEUR;
}

const PERMISSIONS = {
  [ROLES.ETUDIANT]: {
    canCreateStudent: false,
    canEditStudent: false,
    canDeleteStudent: false,
    canCreateMobilite: false,
    canImportStudents: false,
    canManageUsers: false,
    readOnly: true,
    canCreateUserRoles: [],
  },
  [ROLES.SUPERVISEUR]: {
    canCreateStudent: false,
    canEditStudent: false,
    canDeleteStudent: false,
    canCreateMobilite: false,
    canImportStudents: false,
    canManageUsers: false,
    readOnly: true,
    canCreateUserRoles: [],
  },
  [ROLES.CHEF_SECTION]: {
    canCreateStudent: false,
    canEditStudent: false,
    canDeleteStudent: false,
    canCreateMobilite: false,
    canImportStudents: false,
    canManageUsers: false,
    readOnly: true,
    canCreateUserRoles: [],
  },
  [ROLES.COMMANDANT_COMPAGNIE]: {
    canCreateStudent: false,
    canEditStudent: false,
    canDeleteStudent: false,
    canCreateMobilite: false,
    canImportStudents: false,
    canManageUsers: false,
    readOnly: true,
    canCreateUserRoles: [],
  },
  [ROLES.COMMANDANT_GROUPEMENT]: {
    canCreateStudent: false,
    canEditStudent: false,
    canDeleteStudent: false,
    canCreateMobilite: false,
    canImportStudents: false,
    canManageUsers: false,
    readOnly: true,
    canCreateUserRoles: [],
  },
  [ROLES.COMMANDANT_UNITE]: {
    canCreateStudent: true,
    canEditStudent: true,
    canDeleteStudent: true,
    canCreateMobilite: true,
    canImportStudents: true,
    canManageUsers: false,
    readOnly: false,
    canCreateUserRoles: [],
  },
  [ROLES.ADMINISTRATEUR]: {
    canCreateStudent: true,
    canEditStudent: true,
    canDeleteStudent: true,
    canCreateMobilite: true,
    canImportStudents: true,
    canManageUsers: true,
    readOnly: false,
    canCreateUserRoles: [
      ROLES.ADMINISTRATEUR,
      ROLES.COMMANDANT_UNITE,
      ROLES.COMMANDANT_GROUPEMENT,
      ROLES.COMMANDANT_COMPAGNIE,
      ROLES.CHEF_SECTION,
      ROLES.SUPERVISEUR,
    ],
  },
};

export function getPermissions(roleOrFonction) {
  const role = getCanonicalRole(roleOrFonction);
  return PERMISSIONS[role] || PERMISSIONS[ROLES.SUPERVISEUR];
}

export function canCreateRole(currentRoleOrFonction, targetRole) {
  const perms = getPermissions(currentRoleOrFonction);
  return (perms.canCreateUserRoles || []).includes(targetRole);
}

export function getCreatableRoleOptions(currentRoleOrFonction) {
  const perms = getPermissions(currentRoleOrFonction);
  return ROLE_OPTIONS.filter((o) => (perms.canCreateUserRoles || []).includes(o.value));
}

/** Roles allowed to access the main scolarité officer UI (not étudiant). */
export const OFFICER_ROLES = [
  ROLES.SUPERVISEUR,
  ROLES.CHEF_SECTION,
  ROLES.COMMANDANT_COMPAGNIE,
  ROLES.COMMANDANT_GROUPEMENT,
  ROLES.COMMANDANT_UNITE,
  ROLES.ADMINISTRATEUR,
];

/** Roles allowed to view the accountability audit trail. */
export const AUDIT_VIEW_ROLES = [ROLES.ADMINISTRATEUR];

export function canViewAudit(roleOrFonction) {
  return AUDIT_VIEW_ROLES.includes(getCanonicalRole(roleOrFonction));
}

/**
 * Server `/me` sensitive_caps is source of truth.
 * Fallback mirrors Phase 7 matrix when caps absent (legacy sessions).
 */
const SENSITIVE_FALLBACK = {
  [ROLES.ETUDIANT]: {
    nni: 'full',
    sante: 'full',
    parents: 'full',
    edit_nni: false,
    edit_sante: false,
    edit_parents: false,
  },
  [ROLES.SUPERVISEUR]: {
    nni: 'masked',
    sante: 'none',
    parents: 'none',
    edit_nni: false,
    edit_sante: false,
    edit_parents: false,
  },
  [ROLES.CHEF_SECTION]: {
    nni: 'full',
    sante: 'full',
    parents: 'full',
    edit_nni: false,
    edit_sante: false,
    edit_parents: false,
  },
  [ROLES.COMMANDANT_COMPAGNIE]: {
    nni: 'full',
    sante: 'full',
    parents: 'full',
    edit_nni: false,
    edit_sante: false,
    edit_parents: false,
  },
  [ROLES.COMMANDANT_GROUPEMENT]: {
    nni: 'full',
    sante: 'full',
    parents: 'full',
    edit_nni: false,
    edit_sante: false,
    edit_parents: false,
  },
  [ROLES.COMMANDANT_UNITE]: {
    nni: 'full',
    sante: 'full',
    parents: 'full',
    edit_nni: true,
    edit_sante: true,
    edit_parents: true,
  },
  [ROLES.ADMINISTRATEUR]: {
    nni: 'full',
    sante: 'full',
    parents: 'full',
    edit_nni: true,
    edit_sante: true,
    edit_parents: true,
  },
};

export function getSensitiveCaps(userOrCaps, roleOrFonction) {
  const fromUser =
    userOrCaps && typeof userOrCaps === 'object' && userOrCaps.sensitive_caps
      ? userOrCaps.sensitive_caps
      : userOrCaps && typeof userOrCaps === 'object' && ('nni' in userOrCaps || 'edit_nni' in userOrCaps)
        ? userOrCaps
        : null;
  if (fromUser && fromUser.nni) {
    return {
      nni: fromUser.nni,
      sante: fromUser.sante || 'none',
      parents: fromUser.parents || 'none',
      edit_nni: !!fromUser.edit_nni,
      edit_sante: !!fromUser.edit_sante,
      edit_parents: !!fromUser.edit_parents,
    };
  }
  const role = getCanonicalRole(roleOrFonction || userOrCaps?.fonction);
  return SENSITIVE_FALLBACK[role] || SENSITIVE_FALLBACK[ROLES.SUPERVISEUR];
}
