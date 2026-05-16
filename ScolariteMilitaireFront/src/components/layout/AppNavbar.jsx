import { NavLink, Link, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import EspLogo from '../common/EspLogo';
import { getAppNavFlatItems } from './appNavConfig';
import { APP_NAME } from '../../data/institution';

export default function AppNavbar({ mobileOpen, onMobileClose }) {
  const { fonction, logout } = useAuth();
  const navigate = useNavigate();
  const flatItems = getAppNavFlatItems(fonction);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
    onMobileClose?.();
  };

  const linkList = (onNavigate, light = false) => (
    <ul className="flex flex-col gap-1.5">
      {flatItems.map(({ to, icon: Icon, label }) => (
        <li key={to}>
          <NavLink
            to={to}
            end={to === '/dashboard'}
            onClick={onNavigate}
            className={({ isActive }) =>
              `group flex w-full items-center justify-start gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors duration-150 ${
                light
                  ? isActive
                    ? 'bg-white text-navy-900 ring-1 ring-white/70'
                    : 'text-slate-100 hover:bg-white/10 hover:text-white'
                  : isActive
                    ? 'bg-navy text-white'
                    : 'text-slate-700 hover:bg-navy-50 hover:text-navy'
              }`
            }
          >
            <Icon
              size={18}
              strokeWidth={2}
              className={`shrink-0 transition-colors ${
                light ? 'text-current' : 'text-current'
              }`}
            />
            {label}
          </NavLink>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <aside className="hidden h-full w-72 shrink-0 flex-col border-r border-navy-800 bg-navy-gradient text-white md:flex">
        <div className="border-b border-white/15 px-5 py-5">
          <Link to="/dashboard" className="flex min-w-0 items-center gap-3">
            <EspLogo className="h-10 w-10 shrink-0" />
            <div>
              <p className="truncate text-base font-semibold text-white">{APP_NAME}</p>
            </div>
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-5">{linkList(undefined, true)}</div>
        <div className="border-t border-white/15 p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-lg border border-white/25 bg-white/10 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            Déconnexion
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-[60] flex md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/25 backdrop-blur-sm"
            aria-label="Fermer le menu"
            onClick={onMobileClose}
          />
          <aside className="relative ml-auto flex h-full w-[min(100%,19rem)] flex-col border-l border-light-gray bg-white text-slate-900 shadow-2xl shadow-slate-900/10">
            <div className="flex items-center justify-between gap-2 border-b border-light-gray px-4 py-3.5">
              <Link to="/dashboard" className="flex min-w-0 items-center gap-2" onClick={onMobileClose}>
                <EspLogo className="h-9 w-9 shrink-0" />
                <span className="truncate text-sm font-bold tracking-tight text-slate-900">{APP_NAME}</span>
              </Link>
              <button
                type="button"
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                onClick={onMobileClose}
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4">{linkList(onMobileClose, false)}</div>
          </aside>
        </div>
      )}
    </>
  );
}
