import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolverRef = useRef(null);

  const close = useCallback((result) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setState(null);
  }, []);

  const confirm = useCallback((options) => {
    const opts = typeof options === 'string' ? { message: options } : options;
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({
        title: opts.title ?? 'Confirmer',
        message: opts.message ?? '',
        confirmLabel: opts.confirmLabel ?? 'Confirmer',
        cancelLabel: opts.cancelLabel ?? 'Annuler',
        variant: opts.variant ?? 'default',
      });
    });
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Modal
        open={!!state}
        onClose={() => close(false)}
        title={state?.title}
        size="sm"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => close(false)}>
              {state?.cancelLabel ?? 'Annuler'}
            </Button>
            <Button
              type="button"
              variant={state?.variant === 'danger' ? 'danger' : 'primary'}
              onClick={() => close(true)}
            >
              {state?.confirmLabel ?? 'Confirmer'}
            </Button>
          </>
        }
      >
        <div className="flex gap-3">
          {state?.variant === 'danger' ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
              <AlertTriangle size={20} aria-hidden />
            </div>
          ) : null}
          <p className="text-sm leading-relaxed text-slate-700">{state?.message}</p>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm doit être utilisé dans ConfirmProvider');
  return ctx.confirm;
}
