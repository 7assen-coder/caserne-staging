import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, subtitle, size = 'md', children, footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-900/25 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative flex max-h-[92vh] w-full flex-col overflow-hidden shadow-pop ring-1 ring-light-gray sm:rounded-2xl ${sizes[size] ?? sizes.md} bg-white text-slate-900`}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-light-gray px-5 py-4 md:px-6 md:py-5">
          <div className="min-w-0">
            {title && (
              <h3 className="truncate font-serif text-xl font-semibold text-slate-900 md:text-2xl">{title}</h3>
            )}
            {subtitle && <p className="mt-1 text-xs text-text-light md:text-sm">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 -mt-2 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Fermer"
          >
            <X size={22} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6">{children}</div>
        {footer && (
          <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-light-gray bg-off-white px-5 py-3 md:px-6 md:py-4">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
