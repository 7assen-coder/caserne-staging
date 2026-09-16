import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({ open, onClose, title, subtitle, size = 'md', children, footer }) {
  const { t } = useTranslation('a11y');
  const titleId = useId();
  const panelRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    previouslyFocused.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    const focusables = () => [...(panel?.querySelectorAll(FOCUSABLE) ?? [])].filter(
      (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true',
    );

    const tId = window.setTimeout(() => {
      const nodes = focusables();
      const closeBtn = panel?.querySelector('[data-modal-close]');
      (closeBtn || nodes[0] || panel)?.focus?.();
    }, 0);

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const nodes = focusables();
      if (nodes.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(tId);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus?.();
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
      <div className="absolute inset-0 bg-slate-900/25 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={`relative flex max-h-[92vh] w-full flex-col overflow-hidden shadow-pop ring-1 ring-light-gray sm:rounded-2xl ${sizes[size] ?? sizes.md} bg-white text-slate-900 outline-none`}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-light-gray px-5 py-4 md:px-6 md:py-5">
          <div className="min-w-0">
            {title && (
              <h3 id={titleId} className="truncate font-serif text-xl font-semibold text-slate-900 md:text-2xl">
                {title}
              </h3>
            )}
            {subtitle && <p className="mt-1 text-xs text-slate-600 md:text-sm">{subtitle}</p>}
          </div>
          <button
            type="button"
            data-modal-close
            onClick={onClose}
            className="-me-2 -mt-2 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label={t('closeDialog')}
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
