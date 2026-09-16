import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AppNavbar from './AppNavbar';
import Header from './Header';
import RouteErrorBoundary from '../common/RouteErrorBoundary';
import { isFrontendOnly } from '../../utils/frontendMode';

export default function MainLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="app-shell flex h-screen min-h-0 overflow-hidden bg-navy-50/40">
      <AppNavbar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Header onMobileNavOpen={() => setMobileNavOpen(true)} />
        {isFrontendOnly() ? (
          <div
            role="status"
            className="shrink-0 border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-950"
          >
            Demo mode (VITE_FRONTEND_ONLY) — operational data is not persisted to Postgres.
          </div>
        ) : null}
        <main
          id="main-content"
          tabIndex={-1}
          className="app-main-safe min-h-0 flex-1 overflow-y-auto overflow-x-hidden outline-none"
        >
          <div
            key={location.pathname}
            className="page-enter w-full min-w-0 max-w-full px-4 py-8 md:px-8 lg:px-10 md:py-10 lg:py-12"
          >
            <RouteErrorBoundary>
              <Outlet />
            </RouteErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
