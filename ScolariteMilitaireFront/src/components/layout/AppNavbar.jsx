import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import EspLogo from '../common/EspLogo';
import {
  getAppNavSections,
  APP_NAV_EXACT_MATCH_ROUTES,
  isNavItemActive,
} from './appNavConfig';
import { APP_NAME } from '../../data/institution';

function NavLeaf({ item, light, onNavigate, pathname, label }) {
  const { to, icon: Icon } = item;
  const end = APP_NAV_EXACT_MATCH_ROUTES.has(to) && !item.matchPaths;

  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) => {
        const active = item.matchPaths ? isNavItemActive(pathname, item) : isActive;
        return `group flex w-full items-center justify-start gap-2.5 rounded-lg px-3 py-2.5 text-base font-semibold transition-colors duration-150 ${
          light
            ? active
              ? 'bg-white text-navy-900 ring-1 ring-white/70'
              : 'text-slate-100 hover:bg-white/10 hover:text-white'
            : active
              ? 'bg-navy text-white'
              : 'text-slate-700 hover:bg-navy-50 hover:text-navy'
        }`;
      }}
    >
      <Icon size={18} strokeWidth={2} className="shrink-0 text-current" />
      {label}
    </NavLink>
  );
}

function NavGroup({ item, light, onNavigate, pathname, label, childLabels }) {
  const { icon: Icon, children = [] } = item;
  const groupActive = children.some((child) => isNavItemActive(pathname, child));

  return (
    <div>
      <div
        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-base font-semibold ${
          light
            ? groupActive
              ? 'text-white'
              : 'text-slate-100'
            : groupActive
              ? 'text-navy'
              : 'text-slate-700'
        }`}
      >
        <Icon size={18} strokeWidth={2} className="shrink-0 text-current" />
        {label}
      </div>
      <ul
        className={`mt-1 flex flex-col gap-1 border-s ps-3 ms-4 ${light ? 'border-white/20' : 'border-slate-200'}`}
      >
        {children.map((child) => (
          <li key={child.to}>
            <NavLink
              to={child.to}
              end={APP_NAV_EXACT_MATCH_ROUTES.has(child.to) && !child.matchPaths}
              onClick={onNavigate}
              className={({ isActive }) => {
                const active = child.matchPaths
                  ? isNavItemActive(pathname, child)
                  : isActive;
                return `group flex w-full items-center justify-start gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors duration-150 ${
                  light
                    ? active
                      ? 'bg-white text-navy-900 ring-1 ring-white/70'
                      : 'text-slate-100/90 hover:bg-white/10 hover:text-white'
                    : active
                      ? 'bg-navy text-white'
                      : 'text-slate-600 hover:bg-navy-50 hover:text-navy'
                }`;
              }}
            >
              <child.icon size={18} strokeWidth={2} className="shrink-0 text-current" />
              {childLabels[child.to] ?? child.labelKey}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AppNavbar({ mobileOpen, onMobileClose }) {
  const { fonction, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useTranslation(['nav', 'common']);
  const sections = getAppNavSections(fonction);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
    onMobileClose?.();
  };

  const linkList = (onNavigate, light = false) => (
    <nav aria-label={t('nav:mainNav')}>
      <ul className="flex flex-col gap-1.5">
        {sections.flatMap((section) =>
          section.items.map((item) => {
            const label = t(`nav:${item.labelKey}`);
            const childLabels = Object.fromEntries(
              (item.children ?? []).map((c) => [c.to, t(`nav:${c.labelKey}`)]),
            );
            return (
              <li key={item.to ?? item.labelKey}>
                {item.children ? (
                  <NavGroup
                    item={item}
                    light={light}
                    onNavigate={onNavigate}
                    pathname={pathname}
                    label={label}
                    childLabels={childLabels}
                  />
                ) : (
                  <NavLeaf
                    item={item}
                    light={light}
                    onNavigate={onNavigate}
                    pathname={pathname}
                    label={label}
                  />
                )}
              </li>
            );
          }),
        )}
      </ul>
    </nav>
  );

  return (
    <>
      <aside className="hidden h-full w-72 shrink-0 flex-col border-e border-navy-800 bg-navy-gradient text-white md:flex">
        <div className="border-b border-white/15 px-5 py-5">
          <Link to="/dashboard" className="flex min-w-0 items-center gap-3">
            <EspLogo className="h-10 w-10 shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-white">{APP_NAME}</p>
              <p className="truncate text-[10px] font-medium uppercase tracking-wide text-white/70">
                {t('common:tagline')}
              </p>
            </div>
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-5">{linkList(undefined, true)}</div>
        <div className="border-t border-white/15 p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-lg border border-white/25 bg-white/10 px-3 py-2.5 text-base font-semibold text-white transition hover:bg-white/20"
          >
            {t('common:logout')}
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-[60] flex md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={t('nav:mainNav')}
        >
          <aside className="app-mobile-nav-safe relative z-[1] flex h-full w-[min(100%,19rem)] shrink-0 flex-col border-e border-light-gray bg-white text-slate-900 shadow-2xl shadow-slate-900/10">
            <div className="flex items-center justify-between gap-2 border-b border-light-gray px-4 py-3.5">
              <Link to="/dashboard" className="flex min-w-0 items-center gap-2" onClick={onMobileClose}>
                <EspLogo className="h-9 w-9 shrink-0" />
                <span className="truncate text-sm font-bold tracking-tight text-slate-900">{APP_NAME}</span>
              </Link>
              <button
                type="button"
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                onClick={onMobileClose}
                aria-label={t('common:close')}
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4">{linkList(onMobileClose, false)}</div>
            <div className="border-t border-light-gray p-4">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full rounded-lg border border-light-gray bg-slate-50 px-3 py-2.5 text-base font-semibold text-navy transition hover:bg-slate-100"
              >
                {t('common:logout')}
              </button>
            </div>
          </aside>
          <button
            type="button"
            className="min-w-0 flex-1 bg-slate-900/25 backdrop-blur-sm"
            aria-label={t('common:close')}
            onClick={onMobileClose}
          />
        </div>
      )}
    </>
  );
}
