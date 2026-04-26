import { LayoutDashboard, Users } from 'lucide-react';
import { FONCTIONS } from '../../utils/constants';

const ROLES_SCOLA = [FONCTIONS.TERRAIN, FONCTIONS.ENCADREMENT, FONCTIONS.COMMANDEMENT];

/* menu latéral : sections et liens */
export const APP_NAV_SECTIONS = [
  {
    label: 'Gestion',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord', roles: ROLES_SCOLA },
      { to: '/eleves', icon: Users, label: 'Étudiants', roles: ROLES_SCOLA },
    ],
  },
];

export function getAppNavFlatItems(fonction) {
  const sections = APP_NAV_SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((i) => !i.roles || i.roles.includes(fonction)),
  })).filter((s) => s.items.length > 0);
  return sections.flatMap((s) => s.items);
}
