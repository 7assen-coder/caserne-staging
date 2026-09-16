import { Link } from 'react-router-dom';
import EspLogo from '../common/EspLogo';
import LoginLangSwitch from './LoginLangSwitch';

export default function LoginTopBar({
  logoTo = '/login',
  prominent,
  overlay,
  showLanguages = true,
}) {
  return (
    <header
      dir="ltr"
      className="pointer-events-none absolute inset-x-0 top-0 z-50 flex items-center justify-between gap-4 px-5 py-5 font-sans sm:px-8 sm:py-6"
    >
      <Link
        to={logoTo}
        className={`pointer-events-auto flex items-center rounded-2xl shadow-xl transition ${
          overlay
            ? 'bg-white/12 p-2 ring-1 ring-white/25 backdrop-blur-xl hover:bg-white/18'
            : 'bg-black/35 p-1.5 shadow-lg ring-1 ring-white/15 backdrop-blur-md hover:bg-black/45'
        } ${prominent && !overlay ? 'p-2' : ''} ${prominent && overlay ? 'p-2.5' : ''}`}
        aria-label="Polyspace"
      >
        <EspLogo
          className={
            prominent
              ? overlay
                ? 'h-14 w-14 sm:h-16 sm:w-16'
                : 'h-14 w-14 sm:h-[4.25rem] sm:w-[4.25rem]'
              : 'h-11 w-11 sm:h-12 sm:w-12'
          }
        />
      </Link>
      {showLanguages && (
        <div className="pointer-events-auto shadow-lg">
          <LoginLangSwitch variant={overlay ? 'onDark' : 'light'} />
        </div>
      )}
    </header>
  );
}
