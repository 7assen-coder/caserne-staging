import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Password input with show/hide toggle. Eye stays on the physical right (dir=ltr wrapper).
 */
export default function PasswordInput({
  id,
  className = '',
  disabled = false,
  ...props
}) {
  const { t } = useTranslation('a11y');
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative" dir="ltr">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        className={`${className} pe-12`.trim()}
        disabled={disabled}
        {...props}
      />
      <button
        type="button"
        tabIndex={0}
        className="absolute end-2 top-1/2 z-[1] flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-navy/30 disabled:opacity-50"
        onClick={() => setVisible((v) => !v)}
        disabled={disabled}
        aria-label={visible ? t('hidePassword') : t('showPassword')}
        aria-pressed={visible}
      >
        {visible ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
      </button>
    </div>
  );
}
