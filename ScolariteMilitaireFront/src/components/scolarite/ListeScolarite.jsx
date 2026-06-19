import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Globe,
  GraduationCap,
  RotateCcw,
  Search,
  Users,
} from 'lucide-react';
import Button from '../common/Button';
import ScolariteFicheView from './ScolariteFicheView';
import ScolariteExportMenu from './ScolariteExportMenu';
import ScolariteColonnesPicker, { useScolariteColonnes } from './ScolariteColonnesPicker';
import SemestreBadge from './SemestreBadge';
import { useFetch } from '../../hooks/useFetch';
import { scolariteService } from '../../services/scolariteService';
import { DEPARTEMENTS, NIVEAUX_SCOLARITE } from '../../utils/constants';
import { STATUT_ACADEMIQUE_OPTIONS } from '../../utils/eleveScolariteAuto';
import { semestreColumnLabel } from '../../data/scolariteSemestres';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABEL, getCanonicalRole, getPermissions } from '../../utils/userRole';
import { useToast } from '../../context/ToastContext';
import { formatApiError, humanizeError } from '../../utils/apiErrors';
import {
  exportScolariteDetailExcel,
  exportScolariteSynthesisExcel,
  exportScolariteSynthesisPdf,
} from '../../utils/scolariteListExport';
import { computeScolariteStats } from '../../utils/scolariteStats';
import { SCOLARITE_CHANGED } from '../../utils/scolariteStore';
import { initials } from '../../utils/formatters';

const EMPTY_FILTERS = {
  q: '',
  departement: '',
  niveau: '',
  statut: '',
  mobilite: '',
};

const MOBILITE_FILTER_OPTIONS = [
  { value: '', label: 'Tous' },
  { value: 'with', label: 'En mobilité / DD' },
  { value: 'without', label: 'Sans mobilité' },
];

const SORT_OPTIONS = [
  { value: 'nom-asc', label: 'Nom (A → Z)' },
  { value: 'nom-desc', label: 'Nom (Z → A)' },
  { value: 'niveau-asc', label: 'Niveau' },
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
  if (filters.departement) {
    const d = DEPARTEMENTS.find((x) => x.value === filters.departement);
    parts.push(d?.label ?? filters.departement);
  }
  if (filters.niveau) parts.push(filters.niveau);
  if (filters.statut) {
    const s = STATUT_ACADEMIQUE_OPTIONS.find((x) => x.value === filters.statut);
    parts.push(s?.label ?? filters.statut);
  }
  if (filters.mobilite === 'with') parts.push('en mobilité');
  if (filters.mobilite === 'without') parts.push('sans mobilité');
  return parts.length ? parts.join(' · ') : null;
}

function rowToFichePreview(row) {
  return {
    ...row,
    relevesSemestres: [],
    scolarite: { departement: row.departement, niveau: row.niveau },
  };
}

export default function ListeScolarite() {
  const { fonction } = useAuth();
  const role = getCanonicalRole(fonction);
  const perms = getPermissions(role);
  const canEdit = perms.canEditStudent;
  const toast = useToast();
  const colonnes = useScolariteColonnes();

  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
  const [sort, setSort] = useState('nom-asc');
  const [key, setKey] = useState(0);
  const [ficheId, setFicheId] = useState(null);
  const [ficheData, setFicheData] = useState(null);
  const [ficheLoading, setFicheLoading] = useState(false);
  const [exportBusy, setExportBusy] = useState(null);

  useEffect(() => {
    const refresh = () => setKey((k) => k + 1);
    window.addEventListener(SCOLARITE_CHANGED, refresh);
    return () => window.removeEventListener(SCOLARITE_CHANGED, refresh);
  }, []);

  const { data, loading, error } = useFetch(
    () => scolariteService.listStudents(filters),
    [filters.q, filters.departement, filters.niveau, filters.statut, filters.mobilite, key],
  );

  const openFiche = useCallback(async (row) => {
    if (!row?.id) return;
    setFicheId(row.id);
    setFicheData(rowToFichePreview(row));
    setFicheLoading(true);
    try {
      const dossier = await scolariteService.getStudent(row.id, row);
      if (dossier) {
        setFicheData(dossier);
      } else {
        toast.error('Impossible de charger le dossier scolarité.');
        setFicheId(null);
        setFicheData(null);
      }
    } catch (err) {
      toast.error(formatApiError(err));
      setFicheId(null);
      setFicheData(null);
    } finally {
      setFicheLoading(false);
    }
  }, [toast]);

  const refreshFiche = useCallback(async () => {
    if (!ficheId) return;
    setKey((k) => k + 1);
    try {
      const dossier = await scolariteService.getStudent(ficheId, ficheData);
      if (dossier) setFicheData(dossier);
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }, [ficheId, ficheData, toast]);

  const rows = useMemo(() => {
    const list = data ?? [];
    const copy = [...list];
    copy.sort((a, b) => {
      const nameA = `${a.nom ?? ''} ${a.prenom ?? ''}`.trim();
      const nameB = `${b.nom ?? ''} ${b.prenom ?? ''}`.trim();
      if (sort === 'nom-desc') return nameB.localeCompare(nameA, 'fr');
      if (sort === 'niveau-asc') return String(a.niveau).localeCompare(String(b.niveau), 'fr');
      return nameA.localeCompare(nameB, 'fr');
    });
    return copy;
  }, [data, sort]);

  const stats = useMemo(() => computeScolariteStats(rows), [rows]);
  const activeFilterSummary = useMemo(() => filtersSummary(filters), [filters]);
  const hasActiveFilters = useMemo(
    () => Object.entries(filters).some(([, v]) => String(v ?? '').trim() !== ''),
    [filters],
  );

  const departementOptions = [{ value: '', label: 'Tous les départements' }, ...DEPARTEMENTS];
  const niveauOptions = [
    { value: '', label: 'Tous les niveaux' },
    ...NIVEAUX_SCOLARITE.map((x) => ({ value: x, label: x })),
  ];
  const statutOptions = [
    { value: '', label: 'Tous les statuts' },
    ...STATUT_ACADEMIQUE_OPTIONS,
  ];

  const runExport = async (option) => {
    if (!rows.length) {
      toast.warning('Aucun dossier à exporter.');
      return;
    }
    try {
      setExportBusy(option.id);
      const meta = {
        filtersLabel: activeFilterSummary ?? '',
        visibleSemestres: colonnes.visibleKeys,
      };
      if (option.scope === 'detail') {
        await exportScolariteDetailExcel(rows);
      } else if (option.format === 'xlsx') {
        await exportScolariteSynthesisExcel(rows, colonnes.visibleKeys);
      } else {
        await exportScolariteSynthesisPdf(rows, meta);
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
      <ScolariteFicheView
        dossier={ficheData}
        loading={ficheLoading && !ficheData?.id}
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
      <nav>
        <div className="inline-flex items-center gap-2 rounded-full border border-light-gray bg-white px-3 py-1.5 text-sm text-text-light shadow-sm">
          <Link to="/dashboard" className="font-medium transition hover:text-navy">
            Accueil
          </Link>
          <span aria-hidden>/</span>
          <span className="font-semibold text-navy">Scolarité</span>
        </div>
      </nav>

      <header className="flex flex-col gap-4 rounded-2xl border border-light-gray bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-navy text-white shadow-sm">
            <GraduationCap size={22} strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="font-serif text-xl font-semibold text-slate-900 sm:text-2xl">
              Suivi scolarité
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Validations semestres et mobilité · {ROLE_LABEL[role]}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ScolariteColonnesPicker {...colonnes} />
          <ScolariteExportMenu
            studentCount={rows.length}
            columnCount={colonnes.visibleKeys.length}
            filtersLabel={activeFilterSummary ?? ''}
            disabled={loading}
            busy={exportBusy}
            onExport={runExport}
          />
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard label="Dossiers" value={stats.totalStudents} icon={Users} accent="navy" />
        <StatCard
          label="Validations"
          value={stats.validations}
          hint={`${stats.integral} intégrales · ${stats.partial} partielles`}
          icon={BookOpen}
          accent="green"
        />
        <StatCard label="Mobilité / DD" value={stats.enMobilite} icon={Globe} accent="amber" />
        <StatCard label="Redoublement" value={stats.redoublement} icon={GraduationCap} accent="slate" />
      </div>

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
              placeholder="Matricule, nom ou prénom…"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              className="input w-full py-2.5 pl-9 text-sm"
            />
          </label>
          <div className="lg:col-span-2">
            <FilterSelect
              id="sc-filter-dept"
              label="Département"
              value={filters.departement}
              onChange={(v) => setFilters((f) => ({ ...f, departement: v }))}
              options={departementOptions}
            />
          </div>
          <div className="lg:col-span-2">
            <FilterSelect
              id="sc-filter-niveau"
              label="Niveau"
              value={filters.niveau}
              onChange={(v) => setFilters((f) => ({ ...f, niveau: v }))}
              options={niveauOptions}
            />
          </div>
          <div className="lg:col-span-2">
            <FilterSelect
              id="sc-filter-statut"
              label="Statut"
              value={filters.statut}
              onChange={(v) => setFilters((f) => ({ ...f, statut: v }))}
              options={statutOptions}
            />
          </div>
          <div className="lg:col-span-2">
            <FilterSelect
              id="sc-filter-mobilite"
              label="Mobilité"
              value={filters.mobilite}
              onChange={(v) => setFilters((f) => ({ ...f, mobilite: v }))}
              options={MOBILITE_FILTER_OPTIONS}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 border-t border-light-gray px-5 py-3 sm:grid-cols-2 sm:px-6 lg:max-w-xs">
          <FilterSelect
            id="sc-filter-sort"
            label="Tri"
            value={sort}
            onChange={setSort}
            options={SORT_OPTIONS}
          />
        </div>

        {activeFilterSummary ? (
          <div className="border-t border-light-gray bg-off-white/60 px-5 py-2.5 text-xs text-slate-600 sm:px-6">
            Filtres actifs : <span className="font-medium text-navy">{activeFilterSummary}</span>
          </div>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-2xl border border-light-gray bg-white shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-light-gray px-5 py-3.5 sm:px-6">
          <h2 className="text-sm font-semibold text-navy">Registre académique</h2>
          <span className="text-xs text-slate-500">
            {loading ? 'Chargement…' : `${rows.length} dossier${rows.length > 1 ? 's' : ''} — cliquer pour le détail`}
          </span>
        </div>

        {error ? (
          <p className="mx-5 my-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 sm:mx-6">
            {formatApiError(error)}
          </p>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-light-gray bg-slate-50/90 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="sticky left-0 z-10 bg-slate-50/95 px-4 py-3">Étudiant</th>
                <th className="px-3 py-3">Dépt.</th>
                <th className="px-3 py-3">Niveau</th>
                <th className="px-3 py-3">Statut</th>
                {colonnes.visibleKeys.map((colKey) => (
                  <th key={colKey} className="px-2 py-3 text-center">
                    {semestreColumnLabel(colKey)}
                  </th>
                ))}
                <th className="px-3 py-3">Mobilité</th>
                <th className="w-8 px-2 py-3" aria-hidden />
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={`sk-${i}`} className="animate-pulse border-b border-slate-100">
                      <td className="px-4 py-3" colSpan={6 + colonnes.visibleKeys.length}>
                        <div className="h-4 w-full max-w-md rounded bg-slate-200" />
                      </td>
                    </tr>
                  ))
                : null}
              {!loading && rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5 + colonnes.visibleKeys.length + 2}
                    className="px-6 py-14 text-center text-sm text-slate-500"
                  >
                    Aucun dossier ne correspond aux critères.
                    {hasActiveFilters ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="mt-2 block w-full"
                        onClick={() => setFilters({ ...EMPTY_FILTERS })}
                      >
                        Effacer les filtres
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ) : null}
              {!loading
                ? rows.map((row) => {
                    const nomComplet = `${row.prenom ?? ''} ${row.nom ?? ''}`.trim();
                    const deptShort = String(row.departement ?? '').split('—')[0]?.trim() || row.departement;
                    return (
                      <tr
                        key={row.id}
                        className="group cursor-pointer border-b border-slate-100 transition hover:bg-navy/[0.03]"
                        onClick={() => openFiche(row)}
                      >
                        <td className="sticky left-0 z-10 bg-white px-4 py-3 group-hover:bg-[#f8f9fb]">
                          <div className="flex min-w-[11rem] items-center gap-2.5">
                            {row.photoUrl ? (
                              <img
                                src={row.photoUrl}
                                alt=""
                                className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-slate-200"
                              />
                            ) : (
                              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-navy/90 text-[10px] font-bold text-white">
                                {initials(row.nom, row.prenom)}
                              </span>
                            )}
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-900">{nomComplet}</p>
                              <p className="font-mono text-[10px] text-gold">{row.matricule}</p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-xs font-medium text-slate-600">
                          {deptShort || '—'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-xs">{row.niveau || '—'}</td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                            {row.statutLabel}
                          </span>
                        </td>
                        {colonnes.visibleKeys.map((colKey) => (
                          <td key={colKey} className="px-2 py-3 text-center">
                            <SemestreBadge value={row.semestres?.[colKey]} />
                          </td>
                        ))}
                        <td className="max-w-[8rem] truncate px-3 py-3 text-xs text-slate-600" title={row.mobiliteLabel}>
                          {row.mobilite?.type ?? '—'}
                        </td>
                        <td className="px-2 py-3 text-slate-300 group-hover:text-gold">
                          <ChevronRight size={16} aria-hidden />
                        </td>
                      </tr>
                    );
                  })
                : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center gap-4 border-t border-light-gray bg-off-white/50 px-5 py-3 text-[11px] text-slate-500 sm:px-6">
          <span className="font-semibold text-slate-600">Légende :</span>
          <span>
            <SemestreBadge value="integral" /> Validé intégralement
          </span>
          <span>
            <SemestreBadge value="partial" /> Validé partiellement
          </span>
          <span>
            <SemestreBadge value="none" /> Non validé
          </span>
          <span>
            <SemestreBadge value="" /> Non renseigné
          </span>
        </div>
      </section>
    </div>
  );
}
