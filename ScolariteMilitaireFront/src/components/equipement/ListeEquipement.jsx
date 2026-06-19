import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  Package,
  PackageCheck,
  PackageOpen,
  RotateCcw,
  Search,
  Users,
} from 'lucide-react';
import Button from '../common/Button';
import EquipementFicheView from './EquipementFicheView';
import EquipementExportMenu from './EquipementExportMenu';
import { useFetch } from '../../hooks/useFetch';
import { equipementService } from '../../services/equipementService';
import { SECTIONS_OPTIONS, COMPAGNIES_OPTIONS } from '../../data/etudiantOptions';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABEL, getCanonicalRole, getPermissions } from '../../utils/userRole';
import { useToast } from '../../context/ToastContext';
import { formatApiError, humanizeError } from '../../utils/apiErrors';
import {
  exportEquipementDetailExcel,
  exportEquipementDetailPdf,
  exportEquipementSynthesisExcel,
  exportEquipementSynthesisPdf,
} from '../../utils/equipementListExport';
import { computeEquipementStats } from '../../utils/equipementStats';
import { EQUIPEMENT_CHANGED } from '../../utils/equipementStore';
import { initials } from '../../utils/formatters';

const EMPTY_FILTERS = { q: '', section: '', compagnie: '', stock: '' };

const STOCK_FILTER_OPTIONS = [
  { value: '', label: 'Tous les dossiers' },
  { value: 'with', label: 'Avec équipement' },
  { value: 'without', label: 'Sans équipement' },
];

const SORT_OPTIONS = [
  { value: 'nom-asc', label: 'Nom (A → Z)' },
  { value: 'nom-desc', label: 'Nom (Z → A)' },
  { value: 'items-desc', label: 'Plus d\'items' },
  { value: 'items-asc', label: 'Moins d\'items' },
];

function StatCard({ label, value, hint, icon: Icon, accent }) {
  const accents = {
    navy: 'border-l-navy bg-white',
    green: 'border-l-emerald-600 bg-emerald-50/40',
    amber: 'border-l-amber-500 bg-amber-50/40',
    slate: 'border-l-slate-400 bg-slate-50/60',
  };
  return (
    <div
      className={`flex min-h-[5.5rem] flex-col justify-between rounded-xl border border-light-gray border-l-4 px-4 py-3.5 shadow-sm ${accents[accent] ?? accents.navy}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        {Icon ? <Icon size={16} className="shrink-0 text-slate-400" aria-hidden /> : null}
      </div>
      <p className="font-serif text-3xl font-semibold tabular-nums leading-none text-navy">{value}</p>
      {hint ? <p className="text-[11px] text-slate-500">{hint}</p> : <span className="h-4" aria-hidden />}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, id }) {
  return (
    <label htmlFor={id} className="flex min-w-0 flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input w-full cursor-pointer appearance-none py-2.5 pl-3 pr-9 text-sm"
        >
          {options.map((o) => (
            <option key={String(o.value)} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
      </div>
    </label>
  );
}

function filtersSummary(filters) {
  const parts = [];
  if (filters.q?.trim()) parts.push(`« ${filters.q.trim()} »`);
  if (filters.section) parts.push(filters.section);
  if (filters.compagnie) parts.push(filters.compagnie);
  if (filters.stock === 'with') parts.push('équipés');
  if (filters.stock === 'without') parts.push('sans stock');
  return parts.length ? parts.join(' · ') : null;
}

export default function ListeEquipement() {
  const { fonction } = useAuth();
  const role = getCanonicalRole(fonction);
  const perms = getPermissions(role);
  const canEdit = perms.canEditStudent;
  const toast = useToast();

  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
  const [sort, setSort] = useState('nom-asc');
  const [key, setKey] = useState(0);
  const [ficheId, setFicheId] = useState(null);
  const [ficheData, setFicheData] = useState(null);
  const [ficheLoading, setFicheLoading] = useState(false);
  const [exportBusy, setExportBusy] = useState(null);

  useEffect(() => {
    const refresh = () => setKey((k) => k + 1);
    window.addEventListener(EQUIPEMENT_CHANGED, refresh);
    return () => window.removeEventListener(EQUIPEMENT_CHANGED, refresh);
  }, []);

  const { data, loading, error } = useFetch(
    () => equipementService.listStudents(filters),
    [filters.q, filters.section, filters.compagnie, key],
  );

  const openFiche = useCallback(async (row) => {
    if (!row?.id) return;
    setFicheId(row.id);
    setFicheLoading(true);
    setFicheData(null);
    try {
      const dossier = await equipementService.getStudent(row.id);
      setFicheData(dossier);
    } catch (err) {
      toast.error(formatApiError(err));
      setFicheId(null);
    } finally {
      setFicheLoading(false);
    }
  }, [toast]);

  const refreshFiche = useCallback(async () => {
    if (!ficheId) return;
    setKey((k) => k + 1);
    const dossier = await equipementService.getStudent(ficheId);
    setFicheData(dossier);
  }, [ficheId]);

  const filteredRows = useMemo(() => {
    let list = data ?? [];
    if (filters.stock === 'with') list = list.filter((r) => (r.nbItems ?? 0) > 0);
    if (filters.stock === 'without') list = list.filter((r) => (r.nbItems ?? 0) === 0);

    const copy = [...list];
    copy.sort((a, b) => {
      const nameA = `${a.nom ?? ''} ${a.prenom ?? ''}`.trim();
      const nameB = `${b.nom ?? ''} ${b.prenom ?? ''}`.trim();
      if (sort === 'nom-desc') return nameB.localeCompare(nameA, 'fr');
      if (sort === 'items-desc') return (b.nbItems ?? 0) - (a.nbItems ?? 0);
      if (sort === 'items-asc') return (a.nbItems ?? 0) - (b.nbItems ?? 0);
      return nameA.localeCompare(nameB, 'fr');
    });
    return copy;
  }, [data, filters.stock, sort]);

  const stats = useMemo(() => computeEquipementStats(filteredRows), [filteredRows]);
  const activeFilterSummary = useMemo(() => filtersSummary(filters), [filters]);

  const hasActiveFilters = useMemo(
    () => Object.entries(filters).some(([, v]) => String(v ?? '').trim() !== ''),
    [filters],
  );

  const sectionFilterOptions = [
    { value: '', label: 'Toutes les sections' },
    ...SECTIONS_OPTIONS.filter((o) => o.value),
  ];

  const compagnieFilterOptions = [
    { value: '', label: 'Toutes les compagnies' },
    ...COMPAGNIES_OPTIONS.filter((o) => o.value),
  ];

  const runExport = async (option) => {
    if (!filteredRows.length) {
      toast.warning('Aucun dossier à exporter.');
      return;
    }
    try {
      setExportBusy(option.id);
      const meta = { filtersLabel: activeFilterSummary ?? 'aucun' };
      if (option.scope === 'detail') {
        if (option.format === 'xlsx') await exportEquipementDetailExcel(filteredRows);
        else await exportEquipementDetailPdf(filteredRows, meta);
      } else if (option.format === 'xlsx') {
        await exportEquipementSynthesisExcel(filteredRows);
      } else {
        await exportEquipementSynthesisPdf(filteredRows, meta);
      }
      toast.success(`${option.label} téléchargé.`);
    } catch (err) {
      toast.error(humanizeError(err));
    } finally {
      setExportBusy(null);
    }
  };

  if (ficheId) {
    return (
      <EquipementFicheView
        dossier={ficheData}
        loading={ficheLoading}
        onBack={() => {
          setFicheId(null);
          setFicheData(null);
          setKey((k) => k + 1);
        }}
        onRefresh={refreshFiche}
        canEdit={canEdit}
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 pb-8">
      {/* Fil d'Ariane */}
      <nav>
        <div className="inline-flex items-center gap-2 rounded-full border border-light-gray bg-white px-3 py-1.5 text-sm text-text-light shadow-sm">
          <Link to="/dashboard" className="font-medium transition hover:text-navy">
            Accueil
          </Link>
          <span aria-hidden>/</span>
          <span className="font-semibold text-navy">Équipement</span>
        </div>
      </nav>

      {/* En-tête — une seule ligne */}
      <header className="flex flex-col gap-4 rounded-2xl border border-light-gray bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-navy text-white shadow-sm">
            <Package size={22} strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="font-serif text-xl font-semibold text-slate-900 sm:text-2xl">
              Registre équipement
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Remises, retours et pièces jointes · {ROLE_LABEL[role]}
            </p>
          </div>
        </div>
        <EquipementExportMenu
          studentCount={filteredRows.length}
          itemCount={stats.totalItems}
          filtersLabel={activeFilterSummary ?? ''}
          disabled={loading}
          busy={exportBusy}
          onExport={runExport}
        />
      </header>

      {/* KPI — ligne dédiée, hauteurs égales */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard label="Dossiers" value={stats.totalStudents} icon={Users} accent="navy" />
        <StatCard
          label="Pièces totales"
          value={stats.totalItems}
          hint={`${stats.withItems} dossier${stats.withItems > 1 ? 's' : ''} équipé${stats.withItems > 1 ? 's' : ''}`}
          icon={Package}
          accent="green"
        />
        <StatCard label="En usage" value={stats.enUsage} icon={PackageOpen} accent="amber" />
        <StatCard label="Rendu" value={stats.rendu} icon={PackageCheck} accent="slate" />
      </div>

      {/* Barre de filtres — grille alignée, toujours visible */}
      <section className="rounded-2xl border border-light-gray bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-light-gray px-5 py-3 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Recherche et filtres
          </p>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={() => setFilters({ ...EMPTY_FILTERS })}
              className="inline-flex items-center gap-1 text-xs font-semibold text-navy hover:underline"
            >
              <RotateCcw size={12} aria-hidden />
              Réinitialiser
            </button>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-12 lg:items-end lg:gap-3">
          <label className="relative lg:col-span-4">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Recherche
            </span>
            <Search
              className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              placeholder="Matricule, nom…"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              className="input w-full py-2.5 pl-9 text-sm"
            />
          </label>

          <div className="lg:col-span-2">
            <FilterSelect
              id="eq-filter-section"
              label="Section"
              value={filters.section}
              onChange={(v) => setFilters((f) => ({ ...f, section: v }))}
              options={sectionFilterOptions}
            />
          </div>
          <div className="lg:col-span-2">
            <FilterSelect
              id="eq-filter-compagnie"
              label="Compagnie"
              value={filters.compagnie}
              onChange={(v) => setFilters((f) => ({ ...f, compagnie: v }))}
              options={compagnieFilterOptions}
            />
          </div>
          <div className="lg:col-span-2">
            <FilterSelect
              id="eq-filter-stock"
              label="Stock"
              value={filters.stock}
              onChange={(v) => setFilters((f) => ({ ...f, stock: v }))}
              options={STOCK_FILTER_OPTIONS}
            />
          </div>
          <div className="lg:col-span-2">
            <FilterSelect
              id="eq-filter-sort"
              label="Tri"
              value={sort}
              onChange={setSort}
              options={SORT_OPTIONS}
            />
          </div>
        </div>

        {activeFilterSummary ? (
          <div className="border-t border-light-gray bg-off-white/60 px-5 py-2.5 text-xs text-slate-600 sm:px-6">
            Filtres actifs : <span className="font-medium text-navy">{activeFilterSummary}</span>
          </div>
        ) : null}
      </section>

      {/* Liste — en-têtes de colonnes alignés */}
      <section className="overflow-hidden rounded-2xl border border-light-gray bg-white shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-light-gray px-5 py-3.5 sm:px-6">
          <h2 className="text-sm font-semibold text-navy">Dossiers étudiants</h2>
          <span className="text-xs text-slate-500">
            {loading ? 'Chargement…' : `${filteredRows.length} résultat${filteredRows.length > 1 ? 's' : ''}`}
          </span>
        </div>

        {error ? (
          <p className="mx-5 my-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 sm:mx-6">
            {formatApiError(error)}
          </p>
        ) : null}

        {!loading && filteredRows.length > 0 ? (
          <div
            className="hidden border-b border-light-gray bg-slate-50/90 px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:grid sm:grid-cols-[minmax(0,1fr)_7rem_5rem_2rem] sm:gap-4 sm:px-6"
            aria-hidden
          >
            <span>Étudiant</span>
            <span className="text-center">Section</span>
            <span className="text-right">Pièces</span>
            <span />
          </div>
        ) : null}

        {!loading && filteredRows.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Package size={40} className="mx-auto text-slate-300" strokeWidth={1.25} aria-hidden />
            <p className="mt-3 text-sm font-medium text-slate-600">Aucun dossier ne correspond aux critères.</p>
            {hasActiveFilters ? (
              <Button
                type="button"
                variant="ghost"
                className="mt-2"
                onClick={() => setFilters({ ...EMPTY_FILTERS })}
              >
                Effacer les filtres
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {(loading ? Array.from({ length: 5 }) : filteredRows).map((row, i) => {
              if (loading) {
                return (
                  <li key={`sk-${i}`} className="animate-pulse px-5 py-4 sm:px-6">
                    <div className="sm:grid sm:grid-cols-[minmax(0,1fr)_7rem_5rem_2rem] sm:items-center sm:gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-lg bg-slate-200" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-36 rounded bg-slate-200" />
                          <div className="h-3 w-24 rounded bg-slate-100" />
                        </div>
                      </div>
                    </div>
                  </li>
                );
              }

              const nb = row.nbItems ?? 0;
              const nomComplet = `${row.prenom ?? ''} ${row.nom ?? ''}`.trim();

              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => openFiche(row)}
                    className="group grid w-full grid-cols-1 gap-2 px-5 py-3.5 text-left transition hover:bg-navy/[0.03] sm:grid-cols-[minmax(0,1fr)_7rem_5rem_2rem] sm:items-center sm:gap-4 sm:px-6 sm:py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {row.photoUrl ? (
                        <img
                          src={row.photoUrl}
                          alt=""
                          className="h-11 w-11 shrink-0 rounded-lg object-cover ring-1 ring-slate-200"
                        />
                      ) : (
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-navy text-xs font-bold text-white">
                          {initials(row.nom, row.prenom)}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900 group-hover:text-navy">
                          {nomComplet || '—'}
                        </p>
                        <p className="truncate font-mono text-[11px] text-gold">{row.matricule}</p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 sm:text-center">
                      <span className="font-semibold text-slate-400 sm:hidden">Section · </span>
                      {row.section || '—'}
                    </p>

                    <div className="flex items-center justify-between sm:block sm:text-right">
                      <span className="text-xs font-semibold text-slate-400 sm:hidden">Pièces</span>
                      <span className="font-serif text-lg font-semibold tabular-nums text-navy">{nb}</span>
                    </div>

                    <ChevronRight
                      size={18}
                      className="hidden shrink-0 text-slate-300 group-hover:text-gold sm:block"
                      aria-hidden
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
