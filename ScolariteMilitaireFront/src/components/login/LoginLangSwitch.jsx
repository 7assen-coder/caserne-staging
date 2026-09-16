import { useLocale } from '../../context/LocaleContext';
import { useTranslation } from 'react-i18next';

const LANGS = [
  { code: 'fr', label: 'FR' },
  { code: 'ar', label: 'AR' },
];

export default function LoginLangSwitch({ variant = 'light', className = '', size = 'default' }) {
  const { lang, setLang } = useLocale();
  const { t } = useTranslation('a11y');
  const isDark = variant === 'onDark';
  const isLg = size === 'lg';

  return (
    <div
      dir="ltr"
      className={`inline-flex rounded-full p-0.5 ring-1 shadow-inner ${className} ${
        isDark ? 'bg-white/10 ring-white/15' : 'bg-slate-100 ring-slate-200/90'
      }`}
      role="group"
      aria-label={t('language')}
    >
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLang(l.code)}
          aria-pressed={lang === l.code}
          className={`font-semibold tracking-wide rounded-full transition-all duration-200 ${
            isLg ? 'min-w-[3rem] px-4 py-2 text-sm sm:text-base' : 'min-w-[2.5rem] px-3 py-1.5 text-xs'
          } ${
            isDark
              ? lang === l.code
                ? 'bg-white text-navy-900 shadow-md'
                : 'text-white/75 hover:text-white hover:bg-white/10'
              : lang === l.code
                ? 'bg-white text-navy-900 shadow-sm ring-1 ring-slate-200/80'
                : 'text-slate-700 hover:text-navy-800'
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
