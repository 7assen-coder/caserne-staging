import { useCallback, useEffect, useState } from 'react';
import { Columns3 } from 'lucide-react';
import Button from '../common/Button';
import {
  DEFAULT_VISIBLE_SEMESTRE_COLS,
  SEMESTRE_COLUMNS,
} from '../../data/scolariteSemestres';

const STORAGE_KEY = 'esp_scolarite_colonnes_v1';

function loadVisible() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_VISIBLE_SEMESTRE_COLS];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_VISIBLE_SEMESTRE_COLS];
    return SEMESTRE_COLUMNS.map((c) => c.key).filter((k) => parsed.includes(k));
  } catch {
    return [...DEFAULT_VISIBLE_SEMESTRE_COLS];
  }
}

export function useScolariteColonnes() {
  const [visibleKeys, setVisibleKeys] = useState(loadVisible);
  const [open, setOpen] = useState(false);

  const persist = useCallback((keys) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
    setVisibleKeys(keys);
  }, []);

  const toggle = useCallback(
    (key) => {
      setVisibleKeys((prev) => {
        const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
        const ordered = SEMESTRE_COLUMNS.map((c) => c.key).filter((k) => next.includes(k));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ordered));
        return ordered;
      });
    },
    [],
  );

  const selectAll = useCallback(() => persist(SEMESTRE_COLUMNS.map((c) => c.key)), [persist]);
  const reset = useCallback(() => persist([...DEFAULT_VISIBLE_SEMESTRE_COLS]), [persist]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (!e.target.closest?.('[data-scolarite-col-picker]')) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return { visibleKeys, toggle, selectAll, reset, open, setOpen };
}

export default function ScolariteColonnesPicker({ visibleKeys, toggle, selectAll, reset, open, setOpen }) {
  return (
    <div className="relative" data-scolarite-col-picker>
      <Button
        type="button"
        variant="secondary"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5"
      >
        <Columns3 size={15} aria-hidden />
        Colonnes
        <span className="rounded-full bg-navy/10 px-1.5 py-0.5 text-[10px] font-bold text-navy">
          {visibleKeys.length}
        </span>
      </Button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-56 rounded-xl border border-light-gray bg-white p-3 shadow-xl ring-1 ring-slate-200/80">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Semestres affichés</p>
          <ul className="mt-2 max-h-52 space-y-1 overflow-y-auto">
            {SEMESTRE_COLUMNS.map(({ key, label }) => (
              <li key={key}>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={visibleKeys.includes(key)}
                    onChange={() => toggle(key)}
                    className="rounded border-slate-300 text-esp-green focus:ring-gold"
                  />
                  {label}
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex gap-2 border-t border-light-gray pt-2">
            <button type="button" onClick={selectAll} className="text-xs font-semibold text-navy hover:underline">
              Tout
            </button>
            <button type="button" onClick={reset} className="text-xs font-semibold text-slate-500 hover:underline">
              Défaut
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
