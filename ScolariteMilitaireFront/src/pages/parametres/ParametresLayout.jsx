import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { User, Shield, Bell, Users } from 'lucide-react';

const SECTIONS = [
  { to: 'profil', label: 'Profil', icon: User },
  { to: 'compte', label: 'Compte & sécurité', icon: Shield },
  { to: 'notifications', label: 'Notifications', icon: Bell },
  { to: 'equipe', label: 'Équipe', icon: Users },
];

export default function ParametresLayout() {
  return (
    <div className="w-full space-y-8">
      <header className="space-y-4">
        <div>
          <h1 className="page-title">Paramètres</h1>
          <p className="page-subtitle mt-2 max-w-3xl">
            Consultation de la fiche, sécurisation du compte, alertes métiers et gouvernance d’équipe.
          </p>
        </div>
        <nav
          className="-mb-px flex flex-wrap gap-2 border-b border-light-gray pb-3"
          aria-label="Sections paramètres"
        >
          {SECTIONS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `inline-flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm font-semibold transition sm:px-4 sm:py-3 sm:text-base ${
                  isActive
                    ? 'border-amber-500/50 bg-amber-50 text-navy shadow-[inset_0_1px_0_0_rgba(253,185,19,0.12)]'
                    : 'border-transparent bg-white text-text-light hover:border-light-gray hover:bg-off-white hover:text-navy'
                }`
              }
            >
              <Icon size={20} strokeWidth={2} className="shrink-0 text-amber-500/80" />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <div className="w-full min-w-0 max-w-none">
        <Outlet />
      </div>
    </div>
  );
}

export function ParametresIndexRedirect() {
  return <Navigate to="profil" replace />;
}
