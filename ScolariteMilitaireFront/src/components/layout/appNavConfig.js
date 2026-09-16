import {
  BookOpen,
  CalendarCheck,
  Coins,
  FolderOpen,
  GraduationCap,
  HeartPulse,
  LayoutDashboard,
  Package,
  Scale,
  ScrollText,
  Settings,
  UserCircle,
  Users,
  Shield,
} from 'lucide-react';
import { AUDIT_VIEW_ROLES, OFFICER_ROLES, getCanonicalRole } from '../../utils/userRole';

const ROLES_SCOLA = OFFICER_ROLES;

export const GESTION_ETUDIANTS_DOSSIERS_PATH = '/eleves/dossiers';

/** Chemins qui activent la sous-section Dossiers dans le menu. */
export const DOSSIERS_ACTIVE_PATHS = [
  GESTION_ETUDIANTS_DOSSIERS_PATH,
  '/eleves/nouveau',
  '/eleves/import',
];

export function isNavItemActive(pathname, item) {
  const paths = item.matchPaths ?? [item.to];
  return paths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/* menu latéral : sections et liens */
export const APP_NAV_SECTIONS = [
  {
    labelKey: 'gestion',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard', roles: ROLES_SCOLA },
      {
        icon: Users,
        labelKey: 'students',
        roles: ROLES_SCOLA,
        children: [
          {
            to: GESTION_ETUDIANTS_DOSSIERS_PATH,
            icon: FolderOpen,
            labelKey: 'dossiers',
            matchPaths: DOSSIERS_ACTIVE_PATHS,
          },
          { to: '/eleves/scolarite', icon: GraduationCap, labelKey: 'scolarite' },
          { to: '/eleves/equipement', icon: Package, labelKey: 'equipement' },
          { to: '/eleves/sanctions', icon: Scale, labelKey: 'sanctions' },
          { to: '/eleves/droits', icon: Coins, labelKey: 'droits' },
          { to: '/eleves/demandes', icon: ScrollText, labelKey: 'demandes' },
          { to: '/eleves/suivi-medical', icon: HeartPulse, labelKey: 'medical' },
          { to: '/eleves/presence', icon: CalendarCheck, labelKey: 'presence' },
          { to: '/eleves/journal', icon: BookOpen, labelKey: 'journal' },
        ],
      },
      {
        icon: Settings,
        labelKey: 'parametres',
        children: [
          { to: '/profile', icon: UserCircle, labelKey: 'myProfile' },
          {
            to: '/audit',
            icon: Shield,
            labelKey: 'auditLogs',
            roles: AUDIT_VIEW_ROLES,
          },
        ],
      },
    ],
  },
];

export function getAppNavSections(fonction) {
  const role = getCanonicalRole(fonction);
  return APP_NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items
      .map((item) => {
        if (item.children) {
          const children = item.children.filter(
            (child) => !child.roles || child.roles.includes(role),
          );
          if (!item.roles || item.roles.includes(role)) {
            return children.length ? { ...item, children } : null;
          }
          return null;
        }
        if (item.roles && !item.roles.includes(role)) return null;
        return item;
      })
      .filter(Boolean),
  })).filter((section) => section.items.length > 0);
}

/** @deprecated Conservé pour recherche / usages ponctuels */
export function getAppNavFlatItems(fonction) {
  const sections = getAppNavSections(fonction);
  return sections.flatMap((s) =>
    s.items.flatMap((item) => (item.children ? item.children : [item])),
  );
}

/** Routes du menu sans sous-chemin — correspondance exacte. */
export const APP_NAV_EXACT_MATCH_ROUTES = new Set([
  '/dashboard',
  '/profile',
  '/audit',
  GESTION_ETUDIANTS_DOSSIERS_PATH,
  '/eleves/scolarite',
  '/eleves/equipement',
  '/eleves/sanctions',
  '/eleves/droits',
  '/eleves/demandes',
  '/eleves/suivi-medical',
  '/eleves/presence',
  '/eleves/journal',
]);
