import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Badge from '../common/Badge';
import ResultatAppel from './ResultatAppel';
import PresenceExportMenu from './PresenceExportMenu';
import { useFetch } from '../../hooks/useFetch';
import { presenceService } from '../../services/presenceService';
import { SECTIONS, TYPES_RASSEMBLEMENT, STATUT_LABEL } from '../../utils/constants';
import { formatDateTime } from '../../utils/formatters';
import { PRESENCE_CHANGED } from '../../utils/presenceStore';
import {
  exportPresenceHistoriqueExcel,
  exportPresenceHistoriquePdf,
} from '../../utils/presenceListExport';
import { useToast } from '../../context/ToastContext';
import { humanizeError } from '../../utils/apiErrors';

function filtersSummary(filters) {
  const parts = [];
  if (filters.q?.trim()) parts.push(`Recherche : « ${filters.q.trim()} »`);
  if (filters.section) parts.push(`Section : ${filters.section}`);
  if (filters.type) parts.push(`Type : ${STATUT_LABEL[filters.type] ?? filters.type}`);
  return parts.length ? parts.join(' · ') : 'Tous les appels enregistrés';
}

export default function HistoriqueAppel({
  filters: controlledFilters,
  onFiltersChange,
  refreshKey = 0,
}) {
  const [localFilters, setLocalFilters] = useState({ section: '', type: '', q: '' });
  const filters = controlledFilters ?? localFilters;
  const setFilters = onFiltersChange ?? setLocalFilters;
  const [selectedId, setSelectedId] = useState(null);
  const [key, setKey] = useState(0);
  const [exportBusy, setExportBusy] = useState(null);
  const toast = useToast();

  useEffect(() => {
    const refresh = () => setKey((k) => k + 1);
    window.addEventListener(PRESENCE_CHANGED, refresh);
    return () => window.removeEventListener(PRESENCE_CHANGED, refresh);
  }, []);

  const { data, loading } = useFetch(
    () => presenceService.list(filters),
    [filters.section, filters.type, filters.q, key, refreshKey],
  );

  const { data: selectedAppel } = useFetch(
    () => (selectedId ? presenceService.get(selectedId) : Promise.resolve(null)),
    [selectedId, key, refreshKey],
  );

  const appels = data ?? [];
  const ligneCount = appels.reduce((n, a) => n + (a.detail?.length ?? a.total ?? 0), 0);

  async function handleExport(option) {
    try {
      setExportBusy(option.id);
      if (option.format === 'pdf') {
        await exportPresenceHistoriquePdf(filters);
        toast.success('Registre PDF téléchargé.');
      } else {
        await exportPresenceHistoriqueExcel(filters);
        toast.success('Registre Excel téléchargé.');
      }
    } catch (err) {
      toast.error(humanizeError(err));
    } finally {
      setExportBusy(null);
    }
  }

  if (selectedId && selectedAppel) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setSelectedId(null)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-navy"
        >
          <ArrowLeft size={16} aria-hidden />
          Retour à l’historique
        </button>
        <ResultatAppel appel={selectedAppel} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-serif font-semibold text-navy">Historique des appels</h2>
          <p className="text-sm text-slate-500">Consultez le détail nominatif de chaque appel</p>
        </div>
        <PresenceExportMenu
          appelCount={appels.length}
          ligneCount={ligneCount}
          filtersLabel={filtersSummary(filters)}
          disabled={loading}
          busy={exportBusy}
          onExport={handleExport}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input
          type="search"
          placeholder="Rechercher section, superviseur…"
          value={filters.q ?? ''}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          className="input w-full sm:col-span-1"
        />
        <select
          className="input w-full"
          value={filters.section}
          onChange={(e) => setFilters({ ...filters, section: e.target.value })}
        >
          <option value="">Toutes les sections</option>
          {SECTIONS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          className="input w-full"
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
        >
          <option value="">Tous les types</option>
          {TYPES_RASSEMBLEMENT.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-light-gray bg-white">
        <div className="hidden border-b border-light-gray bg-slate-50/90 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:grid sm:grid-cols-[minmax(0,1.2fr)_5rem_5rem_4rem_4rem_4rem_5rem] sm:gap-2 sm:px-5">
          <span>Date / section</span>
          <span>Type</span>
          <span>Superviseur</span>
          <span className="text-right">Eff.</span>
          <span className="text-right">P</span>
          <span className="text-right">A</span>
          <span>Statut</span>
        </div>

        {loading ? (
          <div className="animate-pulse px-5 py-8">
            <div className="h-10 rounded bg-slate-100" />
          </div>
        ) : null}

        {!loading && appels.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-slate-500">
            Aucun appel enregistré. Lancez un premier appel depuis l’onglet « Lancer un appel ».
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {appels.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(row.id)}
                  className="grid w-full grid-cols-1 gap-1 px-4 py-3.5 text-left transition hover:bg-navy/[0.03] sm:grid-cols-[minmax(0,1.2fr)_5rem_5rem_4rem_4rem_4rem_5rem] sm:items-center sm:gap-2 sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {formatDateTime(row.date)}
                    </p>
                    <p className="truncate text-xs text-slate-500">{row.section}</p>
                  </div>
                  <p className="truncate text-xs text-slate-600">
                    {STATUT_LABEL[row.type] ?? row.type}
                  </p>
                  <p className="truncate text-xs text-slate-600">{row.superviseur || '—'}</p>
                  <p className="text-sm tabular-nums text-slate-700 sm:text-right">{row.total}</p>
                  <p className="text-sm tabular-nums text-emerald-700 sm:text-right">{row.presents}</p>
                  <p className="text-sm tabular-nums text-red-700 sm:text-right">{row.absents}</p>
                  <div>
                    <Badge tone={row.statut === 'en_cours' ? 'alerte' : 'present'}>
                      {row.statut === 'en_cours' ? 'En cours' : 'Transmis'}
                    </Badge>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
