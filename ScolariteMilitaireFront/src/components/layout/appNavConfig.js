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
  UserCircle,
  Users,
} from 'lucide-react';
import { FONCTIONS } from '../../utils/constants';

const ROLES_SCOLA = [FONCTIONS.TERRAIN, FONCTIONS.ENCADREMENT, FONCTIONS.COMMANDEMENT];

export const GESTION_ETUDIANTS_DOSSIERS_PATH = '/eleves/dossiers';

/** Chemins qui activent la sous-section Dossiers dans le menu. */
export const DOSSIERS_ACTIVE_PATHS = [
  GESTION_ETUDIANTS_DOSSIERS_PATH,
  '/eleves/nouveau',
  '/eleves/import',
  '/eleves/export',
  '/eleves/mobilite',
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
    label: 'Gestion',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord', roles: ROLES_SCOLA },
      {
        icon: Users,
        label: 'Gestion des étudiants',
        roles: ROLES_SCOLA,
        children: [
          {
            to: GESTION_ETUDIANTS_DOSSIERS_PATH,
            icon: FolderOpen,
            label: 'Dossiers',
            matchPaths: DOSSIERS_ACTIVE_PATHS,
          },
          { to: '/eleves/scolarite', icon: GraduationCap, label: 'Scolarité' },
          { to: '/eleves/equipement', icon: Package, label: 'Équipement' },
          { to: '/eleves/sanctions', icon: Scale, label: 'Sanctions' },
          { to: '/eleves/droits', icon: Coins, label: 'Droits' },
          { to: '/eleves/demandes', icon: ScrollText, label: 'Demandes' },
          { to: '/eleves/suivi-medical', icon: HeartPulse, label: 'Suivi médical' },
          { to: '/eleves/presence', icon: CalendarCheck, label: 'Présence' },
          { to: '/eleves/journal', icon: BookOpen, label: 'Journal' },
        ],
      },
    ],
  },
  {
    label: 'Profil',
    items: [{ to: '/profile', icon: UserCircle, label: 'Mon profil' }],
  },
];

export function getAppNavSections(fonction) {
  return APP_NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items
      .map((item) => {
        if (item.children) {
          const children = item.children.filter(
            (child) => !child.roles || child.roles.includes(fonction),
          );
          if (!item.roles || item.roles.includes(fonction)) {
            return children.length ? { ...item, children } : null;
          }
          return null;
        }
        if (item.roles && !item.roles.includes(fonction)) return null;
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
