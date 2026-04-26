const LANGS = ['FR', 'AR'];

/**
 * Segment FR | AR — style type formulaires SaaS (pill).
 * variant="onDark" : pour barre sur fond photo (recovery / header sombre).
 */
export default function LoginLangSwitch({ value, onChange, variant = 'light', className = '', size = 'default' }) {
  const isDark = variant === 'onDark';
  const isLg = size === 'lg';

  return (
    <div
      className={`inline-flex rounded-full p-0.5 ring-1 shadow-inner ${className} ${
        isDark ? 'bg-white/10 ring-white/15' : 'bg-slate-100 ring-slate-200/90'
      }`}
      role="group"
      aria-label="Langue"
    >
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          className={`font-semibold tracking-wide rounded-full transition-all duration-200 ${
            isLg ? 'min-w-[3rem] px-4 py-2 text-sm sm:text-base' : 'min-w-[2.5rem] px-3 py-1.5 text-xs'
          } ${
            isDark
              ? value === l
                ? 'bg-white text-navy-900 shadow-md'
                : 'text-white/75 hover:text-white hover:bg-white/10'
              : value === l
                ? 'bg-white text-navy-900 shadow-sm ring-1 ring-slate-200/80'
                : 'text-slate-500 hover:text-navy-800'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
