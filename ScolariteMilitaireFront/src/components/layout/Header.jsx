import { Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LoginLangSwitch from '../login/LoginLangSwitch';

export default function Header({ onMobileNavOpen }) {
  const { t } = useTranslation(['common']);

  const rowClass =
    'relative isolate mx-auto flex w-full max-w-none min-w-0 flex-nowrap items-center justify-end gap-x-3 overflow-x-auto px-4 py-1.5 [-ms-overflow-style:none] [scrollbar-width:thin] md:gap-x-4 md:px-6 md:py-2 lg:gap-x-5 lg:px-8 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300';

  return (
    <header className="app-header-safe relative w-full min-w-0 border-b border-navy-100 bg-white text-slate-900 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 bg-gradient-to-r from-navy-200 via-navy-300 to-navy-500 opacity-95"
        aria-hidden
      />

      <div className={rowClass}>
        <button
          type="button"
          className="me-auto shrink-0 rounded-full p-2 text-slate-700 transition hover:bg-slate-100 md:hidden"
          onClick={onMobileNavOpen}
          aria-label={t('common:openMenu')}
        >
          <Menu size={22} />
        </button>

        <LoginLangSwitch size="default" className="shrink-0" />
      </div>
    </header>
  );
}
