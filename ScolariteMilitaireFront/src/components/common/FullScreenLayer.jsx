import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * طبقة كاملة فوق الصفحة (full-screen layer).
 * - chrome=true و chromeScrollBody=true (افتراضي): تمرير واحد على منطقة المحتوى تحت العنوان (مناسب للنماذج الطويلة).
 * - chrome=true و chromeScrollBody=false: لا overflow-y على جسم المحتوى؛ للمحتوى الذي يدير التمرير بنفسه (نادر).
 * - chrome=false: overlay كامل؛ التمرير على الحاوية عادةً لصفحات طويلة.
 */
export default function FullScreenLayer({
  open,
  onClose,
  title,
  subtitle,
  chrome = true,
  /** إذا كان false مع chrome، لا يُطبَّق overflow-y على جسم المحتوى (النموذج متعدد الخطوات يمرّر داخلياً). */
  chromeScrollBody = true,
  children,
  className = '',
  contentClassName = '',
}) {
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

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
        aria-label="Fermer"
        onClick={onClose}
      />
      <div
        className={`relative h-full w-full overflow-hidden bg-white shadow-pop ring-1 ring-light-gray ${className}`}
        role="dialog"
        aria-modal
        aria-label={title || 'Fenêtre'}
      >
        {chrome ? (
          <>
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-light-gray bg-white px-5 py-4 sm:px-6 sm:py-5">
              <div className="min-w-0">
                {title && <h2 className="truncate font-serif text-xl font-semibold text-slate-900 sm:text-2xl">{title}</h2>}
                {subtitle && <p className="mt-1 text-sm text-text-light">{subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="-mr-2 -mt-2 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-light-gray bg-white text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </header>
            <div
              className={
                chromeScrollBody
                  ? `h-[calc(100%-4.25rem)] min-h-0 overflow-y-auto ${contentClassName}`
                  : `flex h-[calc(100%-4.25rem)] min-h-0 flex-col overflow-hidden ${contentClassName}`
              }
            >
              {children}
            </div>
          </>
        ) : (
          <div className={`h-full overflow-y-auto ${contentClassName}`}>{children}</div>
        )}
      </div>
    </div>
  );
}

