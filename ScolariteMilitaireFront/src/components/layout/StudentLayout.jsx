import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  FileText,
  GraduationCap,
  HeartPulse,
  Home,
  LogOut,
  Menu,
  Package,
  Scale,
  ScrollText,
  UserCircle,
  X,
} from 'lucide-react';
import EspLogo from '../common/EspLogo';
import RouteErrorBoundary from '../common/RouteErrorBoundary';
import { useAuth } from '../../hooks/useAuth';
import { APP_NAME } from '../../data/institution';

const NAV = [
  { to: '/etudiant', end: true, icon: Home, label: 'Accueil' },
  { to: '/etudiant/dossier', icon: FileText, label: 'Dossier' },
  { to: '/etudiant/scolarite', icon: GraduationCap, label: 'Scolarité' },
  { to: '/etudiant/equipement', icon: Package, label: 'Équipement' },
  { to: '/etudiant/sanctions', icon: Scale, label: 'Sanctions' },
  { to: '/etudiant/demandes', icon: ScrollText, label: 'Demandes' },
  { to: '/etudiant/medical', icon: HeartPulse, label: 'Médical' },
  { to: '/etudiant/profil', icon: UserCircle, label: 'Profil' },
];

export default function StudentLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const navClass = ({ isActive }) =>
    `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
      isActive
        ? 'bg-white text-navy-900 ring-1 ring-white/70'
        : 'text-slate-100/90 hover:bg-white/10 hover:text-white'
    }`;

  const side = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-4">
        <EspLogo className="h-9 w-9" />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">{APP_NAME}</p>
          <p className="truncate text-xs text-slate-300">Espace étudiant</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV.map(({ to, end, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setMobileOpen(false)}
            className={navClass}
          >
            <Icon size={17} aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <p className="mb-2 truncate px-2 text-xs text-slate-300">
          {user?.prenom} {user?.nom}
        </p>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-100 hover:bg-white/10"
        >
          <LogOut size={17} aria-hidden />
          Déconnexion
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-navy-50/40">
      <aside className="hidden w-60 shrink-0 bg-navy md:block">{side}</aside>
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Fermer le menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 h-full w-64 bg-navy shadow-xl">
            <button
              type="button"
              className="absolute end-2 top-2 rounded-lg p-2 text-white"
              onClick={() => setMobileOpen(false)}
              aria-label="Fermer"
            >
              <X size={20} />
            </button>
            {side}
          </aside>
        </div>
      ) : null}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-3 border-b border-navy-100 bg-white px-4 py-3 md:px-6">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Menu"
          >
            <Menu size={22} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-navy">
              {NAV.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)))?.label
                || 'Espace étudiant'}
            </p>
          </div>
          <BookOpen size={18} className="hidden text-esp-green sm:block" aria-hidden />
        </header>
        <div
          role="status"
          className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-950"
        >
          Espace étudiant — consultation uniquement
        </div>
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div key={pathname} className="page-enter mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-8">
            <RouteErrorBoundary>
              <Outlet />
            </RouteErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
