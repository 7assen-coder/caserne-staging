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

/* menu latéral : sections et liens */
export const APP_NAV_SECTIONS = [
  {
    label: 'Gestion',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord', roles: ROLES_SCOLA },
      { to: '/gestion-eleves', icon: Users, label: 'Gestion des élèves', roles: ROLES_SCOLA },
      { to: '/eleves', icon: FolderOpen, label: 'Dossiers', roles: ROLES_SCOLA },
      { to: '/scolarite', icon: GraduationCap, label: 'Scolarité', roles: ROLES_SCOLA },
      { to: '/equipement', icon: Package, label: 'Équipement', roles: ROLES_SCOLA },
      { to: '/sanctions', icon: Scale, label: 'Sanctions', roles: ROLES_SCOLA },
      { to: '/droits', icon: Coins, label: 'Droits', roles: ROLES_SCOLA },
      { to: '/demandes', icon: ScrollText, label: 'Demandes', roles: ROLES_SCOLA },
      { to: '/suivi-medical', icon: HeartPulse, label: 'Suivi médical', roles: ROLES_SCOLA },
      { to: '/presence', icon: CalendarCheck, label: 'Présence', roles: ROLES_SCOLA },
      { to: '/journal', icon: BookOpen, label: 'Journal', roles: ROLES_SCOLA },
    ],
  },
  {
    label: 'Profil',
    items: [{ to: '/profile', icon: UserCircle, label: 'Mon profil' }],
  },
];

export function getAppNavFlatItems(fonction) {
  const sections = APP_NAV_SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((i) => !i.roles || i.roles.includes(fonction)),
  })).filter((s) => s.items.length > 0);
  return sections.flatMap((s) => s.items);
}

/** Routes du menu principal sans sous-chemin — active exacte dans la barre latérale. */
export const APP_NAV_EXACT_MATCH_ROUTES = new Set([
  '/dashboard',
  '/gestion-eleves',
  '/eleves',
  '/scolarite',
  '/equipement',
  '/sanctions',
  '/droits',
  '/demandes',
  '/suivi-medical',
  '/presence',
  '/journal',
  '/profile',
]);
