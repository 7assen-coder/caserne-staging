import { ROLES, getCanonicalRole } from './userRole';

/** Post-login / home destination by role. */
export function homePathForRole(fonction) {
  return getCanonicalRole(fonction) === ROLES.ETUDIANT ? '/etudiant' : '/dashboard';
}

export function isStudentRole(fonction) {
  return getCanonicalRole(fonction) === ROLES.ETUDIANT;
}
