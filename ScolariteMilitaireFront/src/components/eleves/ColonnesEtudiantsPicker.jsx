import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Columns3, RotateCcw } from 'lucide-react';
import { COLONNE_GROUPES, ETUDIANT_COLONNES } from '../../data/etudiantColonnes';

function usePanelPosition(open, anchorRef) {
  const [style, setStyle] = useState(null);

  const update = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.min(352, window.innerWidth - 16);
    let left = r.right - width;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    setStyle({
      position: 'fixed',
      top: r.bottom + 8,
      left,
      width,
      zIndex: 9999,
    });
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (!open) {
      setStyle(null);
      return undefined;
    }
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, update]);

  return style;
}

export default function ColonnesEtudiantsPicker({
  visibleIds,
  onToggle,
  onReset,
  onSelectAll,
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);
  const panelRef = useRef(null);
  const panelStyle = usePanelPosition(open, anchorRef);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      const t = e.target;
      if (panelRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const grouped = Object.entries(COLONNE_GROUPES).map(([key, label]) => ({
    key,
    label,
    cols: ETUDIANT_COLONNES.filter((c) => c.group === key),
  }));

  const panel =
    open && panelStyle ? (
      <div
        ref={panelRef}
        style={panelStyle}
        className="rounded-xl border border-light-gray bg-white shadow-pop"
        role="dialog"
        aria-label="Choisir les colonnes affichées"
      >
        <div className="border-b border-light-gray px-4 py-3">
          <p className="text-sm font-bold text-navy">Colonnes visibles</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Colonnes affichées dans le tableau et dans l&apos;export Excel / PDF.
          </p>
        </div>

        <div className="max-h-[min(60vh,420px)] overflow-y-auto px-3 py-2">
          {grouped.map(({ key, label, cols }) =>
            cols.length > 0 ? (
              <div key={key} className="mb-3 last:mb-0">
                <p className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  {label}
                </p>
                <ul className="space-y-0.5">
                  {cols.map((col) => {
                    const locked = col.id === 'matricule';
                    const checked = visibleIds.includes(col.id);
                    return (
                      <li key={col.id}>
                        <label
                          className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-slate-800 transition hover:bg-slate-50 ${
                            locked ? 'cursor-default opacity-70' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 shrink-0 rounded border-slate-300 text-navy focus:ring-gold"
                            checked={checked}
                            disabled={locked}
                            onChange={() => !locked && onToggle(col.id)}
                          />
                          <span>{col.label}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null,
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-light-gray px-3 py-2.5">
          <button
            type="button"
            className="text-xs font-semibold text-navy hover:underline"
            onClick={() => onSelectAll?.()}
          >
            Tout afficher
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-navy"
            onClick={() => {
              onReset();
              setOpen(false);
            }}
          >
            <RotateCcw size={12} aria-hidden />
            Par défaut
          </button>
        </div>
      </div>
    ) : null;

  return (
    <div className={className}>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg border border-light-gray bg-white px-3 py-2 text-sm font-semibold text-navy shadow-sm transition hover:bg-slate-50"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Columns3 size={16} aria-hidden />
        Colonnes
        <span className="rounded-full bg-navy/10 px-2 py-0.5 text-xs font-bold text-navy">
          {visibleIds.length}
        </span>
      </button>
      {panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
