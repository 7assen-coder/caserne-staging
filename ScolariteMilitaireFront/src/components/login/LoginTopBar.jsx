import { Link } from 'react-router-dom';
import EspLogo from '../common/EspLogo';
import LoginLangSwitch from './LoginLangSwitch';

export default function LoginTopBar({
  lang,
  onLangChange,
  logoTo = '/login',
  prominent,
  overlay,
  showLanguages = true,
}) {
  return (
    <header className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between gap-4 px-5 sm:px-8 py-5 sm:py-6 pointer-events-none font-sans">
      <Link
        to={logoTo}
        className={`pointer-events-auto flex items-center rounded-2xl shadow-xl transition ${
          overlay
            ? 'ring-1 ring-white/25 bg-white/12 backdrop-blur-xl p-2 hover:bg-white/18'
            : 'ring-1 ring-white/15 bg-black/35 backdrop-blur-md shadow-lg hover:bg-black/45 p-1.5'
        } ${prominent && !overlay ? 'p-2' : ''} ${prominent && overlay ? 'p-2.5' : ''}`}
        aria-label="Accueil connexion"
      >
        <EspLogo
          className={
            prominent
              ? overlay
                ? 'w-14 h-14 sm:w-16 sm:h-16'
                : 'w-14 h-14 sm:w-[4.25rem] sm:h-[4.25rem]'
              : 'w-11 h-11 sm:w-12 sm:h-12'
          }
        />
      </Link>
      {showLanguages && (
        <div className="pointer-events-auto shadow-lg">
          <LoginLangSwitch value={lang} onChange={onLangChange} variant={overlay ? 'onDark' : 'light'} />
        </div>
      )}
    </header>
  );
}
