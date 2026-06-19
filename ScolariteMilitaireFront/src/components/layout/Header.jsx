import { Search, Menu } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { initials } from '../../utils/formatters';

export default function Header({ onMobileNavOpen }) {
  const { user } = useAuth();

  const rowClass =
    'relative isolate mx-auto flex w-full max-w-none min-w-0 flex-nowrap items-center gap-x-3 overflow-x-auto px-4 py-2.5 [-ms-overflow-style:none] [scrollbar-width:thin] md:min-h-[3.5rem] md:gap-x-4 md:px-6 lg:gap-x-5 lg:px-8 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300';

  return (
    <header className="app-header-safe relative w-full min-w-0 border-b border-navy-100 bg-white text-slate-900 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 bg-gradient-to-r from-navy-200 via-navy-300 to-navy-500 opacity-95"
        aria-hidden
      />

      <div className={rowClass}>
        <button
          type="button"
          className="shrink-0 rounded-full p-2 text-slate-700 transition hover:bg-slate-100 md:hidden"
          onClick={onMobileNavOpen}
          aria-label="Ouvrir le menu de navigation"
        >
          <Menu size={22} />
        </button>

        <label className="relative min-w-0 flex-1 basis-0 md:max-w-none">
          <span className="sr-only">Recherche</span>
          <Search
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 sm:left-4"
            aria-hidden
          />
          <input
            type="search"
            placeholder="Rechercher…"
            className="h-10 w-full rounded-full border border-navy-100 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 shadow-inner shadow-slate-200/60 outline-none ring-0 transition placeholder:text-slate-400 focus:border-navy-400 focus:ring-2 focus:ring-navy-200 sm:h-11 sm:pl-11"
          />
        </label>

        <div
          className="pointer-events-none flex h-9 min-w-0 max-w-[min(100%,20rem)] shrink-0 select-none items-center gap-2 rounded-full border border-navy-100 bg-navy-50 py-0.5 pl-0.5 pr-2.5 text-slate-900 shadow-sm sm:h-10 sm:max-w-[min(100%,24rem)] sm:pr-3 lg:max-w-[min(100%,28rem)] lg:pr-3.5"
          aria-label={`Connecté : ${user?.prenom ?? ''} ${user?.nom ?? ''}`.trim()}
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-navy-gradient text-[10px] font-bold text-white ring-2 ring-gold/30 sm:h-9 sm:w-9 sm:text-[11px]">
            {initials(user?.nom, user?.prenom)}
          </span>
          <span className="min-w-0 truncate text-left text-xs font-medium text-slate-900 sm:text-sm">
            {user?.prenom} {user?.nom}
          </span>
        </div>
      </div>
    </header>
  );
}
