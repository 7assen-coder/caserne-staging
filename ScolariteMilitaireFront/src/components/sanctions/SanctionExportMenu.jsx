import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  FileDown,
  FileSpreadsheet,
  Layers,
  List,
  Loader2,
} from 'lucide-react';
import Button from '../common/Button';

const EXPORT_OPTIONS = [
  {
    id: 'synthesis-pdf',
    label: 'Synthèse PDF',
    description: 'Tableau par étudiant : département, niveau, totaux et dernière sanction.',
    icon: FileDown,
    format: 'pdf',
    scope: 'synthesis',
  },
  {
    id: 'synthesis-xlsx',
    label: 'Synthèse Excel',
    description: 'Même vue synthétique, fichier .xlsx pour le suivi administratif.',
    icon: FileSpreadsheet,
    format: 'xlsx',
    scope: 'synthesis',
  },
  {
    id: 'detail-xlsx',
    label: 'Registre détaillé Excel',
    description: 'Une ligne par sanction avec dates, statut et pièces jointes.',
    icon: Layers,
    format: 'xlsx',
    scope: 'detail',
  },
  {
    id: 'detail-pdf',
    label: 'Registre détaillé PDF',
    description: 'Historique complet des sanctions filtrées, format paysage.',
    icon: List,
    format: 'pdf',
    scope: 'detail',
  },
];

export default function SanctionExportMenu({
  studentCount = 0,
  sanctionCount = 0,
  filtersLabel = '',
  disabled = false,
  busy = null,
  onExport,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const handlePick = (option) => {
    if (disabled || busy) return;
    onExport?.(option);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative w-full sm:w-auto">
      <Button
        type="button"
        variant="secondary"
        disabled={disabled || studentCount < 1}
        onClick={() => setOpen((v) => !v)}
        className="w-full justify-center sm:w-auto"
      >
        {busy ? (
          <Loader2 size={16} className="mr-1.5 animate-spin" aria-hidden />
        ) : (
          <FileDown size={16} className="mr-1.5" aria-hidden />
        )}
        {busy ? 'Export en cours…' : 'Exporter le registre'}
        {!busy ? (
          <ChevronDown
            size={14}
            className={`ml-1.5 opacity-70 transition ${open ? 'rotate-180' : ''}`}
            aria-hidden
          />
        ) : null}
      </Button>

      {open ? (
        <div
          className="absolute right-0 z-30 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-2xl border border-light-gray bg-white shadow-xl ring-1 ring-slate-200/80 sm:w-[22rem]"
          role="menu"
        >
          <div className="border-b border-light-gray bg-gradient-to-br from-slate-50 to-white px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wider text-esp-green">Exports sanctions</p>
            <p className="mt-1 text-sm text-slate-700">
              <strong className="text-navy">{studentCount}</strong> dossier{studentCount > 1 ? 's' : ''}
              {' · '}
              <strong className="text-navy">{sanctionCount}</strong> sanction{sanctionCount > 1 ? 's' : ''}
            </p>
            {filtersLabel ? (
              <p className="mt-1 truncate text-[11px] text-slate-500">Filtres : {filtersLabel}</p>
            ) : null}
          </div>

          <ul className="max-h-[min(70vh,20rem)] overflow-y-auto p-2">
            {EXPORT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isBusy = busy === opt.id;
              return (
                <li key={opt.id}>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!!busy || studentCount < 1}
                    onClick={() => handlePick(opt)}
                    className="flex w-full gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-navy/5 disabled:opacity-50"
                  >
                    <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-navy/10 text-navy">
                      {isBusy ? (
                        <Loader2 size={16} className="animate-spin" aria-hidden />
                      ) : (
                        <Icon size={16} aria-hidden />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-900">{opt.label}</span>
                      <span className="mt-0.5 block text-xs leading-snug text-slate-500">
                        {opt.description}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
