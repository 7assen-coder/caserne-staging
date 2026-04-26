import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AppNavbar from './AppNavbar';
import Header from './Header';
import AppTopBar from './AppTopBar';

export default function MainLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-slate-50">
      <AppNavbar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <AppTopBar />
        <Header onMobileNavOpen={() => setMobileNavOpen(true)} />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div
            key={location.pathname}
            className="page-enter w-full px-4 py-8 md:px-8 lg:px-10 md:py-10 lg:py-12"
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
