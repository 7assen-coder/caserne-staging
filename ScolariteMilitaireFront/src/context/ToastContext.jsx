import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { humanizeError } from '../utils/apiErrors';

const ToastContext = createContext(null);

let externalToast = null;

export function toast(type, message, options = {}) {
  externalToast?.({ type, message, duration: options.duration });
}

toast.success = (message, options) => toast('success', message, options);
toast.error = (message, options) => toast('error', message, options);
toast.warning = (message, options) => toast('warning', message, options);
toast.info = (message, options) => toast('info', message, options);

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const STYLES = {
  success: 'border-emerald-300 bg-emerald-50 text-emerald-950 shadow-emerald-200/50',
  error: 'border-red-300 bg-red-50 text-red-950 shadow-red-200/50',
  warning: 'border-amber-300 bg-amber-50 text-amber-950 shadow-amber-200/50',
  info: 'border-sky-300 bg-sky-50 text-sky-950 shadow-sky-200/50',
};

const ICON_STYLES = {
  success: 'text-emerald-600',
  error: 'text-red-600',
  warning: 'text-amber-600',
  info: 'text-sky-600',
};

function ToastItem({ item, onDismiss }) {
  const Icon = ICONS[item.type] ?? Info;
  return (
    <div
      role="alert"
      className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border px-4 py-3.5 shadow-lg ring-1 ring-black/5 animate-[toast-in_0.28s_ease-out] ${STYLES[item.type] ?? STYLES.info}`}
    >
      <Icon size={22} className={`mt-0.5 shrink-0 ${ICON_STYLES[item.type] ?? ICON_STYLES.info}`} aria-hidden />
      <p className="min-w-0 flex-1 text-sm font-medium leading-snug">{item.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        className="-mr-1 shrink-0 rounded-lg p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100"
        aria-label="Fermer"
      >
        <X size={18} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  const dismiss = useCallback((id) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(({ type = 'info', message, duration = 5200 }) => {
    const text = humanizeError(message);
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setItems((prev) => [...prev.slice(-4), { id, type, message: text }]);
    if (duration > 0) {
      window.setTimeout(() => dismiss(id), duration);
    }
  }, [dismiss]);

  useEffect(() => {
    externalToast = push;
    return () => {
      externalToast = null;
    };
  }, [push]);

  const value = useMemo(
    () => ({
      toast: push,
      success: (m, o) => push({ type: 'success', message: m, ...o }),
      error: (m, o) => push({ type: 'error', message: m, duration: 6500, ...o }),
      warning: (m, o) => push({ type: 'warning', message: m, ...o }),
      info: (m, o) => push({ type: 'info', message: m, ...o }),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-[10000] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6"
        aria-live="polite"
        aria-relevant="additions"
      >
        {items.map((item) => (
          <ToastItem key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast doit être utilisé dans ToastProvider');
  return ctx;
}

export { toast as globalToast };
