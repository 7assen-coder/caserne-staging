import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ChevronDown,
  ChevronRight,
  HeartPulse,
  RotateCcw,
  Search,
  Users,
} from 'lucide-react';
import Button from '../common/Button';
import MedicalFicheView from './MedicalFicheView';
import MedicalExportMenu from './MedicalExportMenu';
import { useFetch } from '../../hooks/useFetch';
import { medicalService } from '../../services/medicalService';
import { DEPARTEMENTS, NIVEAUX_SCOLARITE } from '../../utils/constants';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABEL, getCanonicalRole, getPermissions } from '../../utils/userRole';
import { useToast } from '../../context/ToastContext';
import { formatApiError, humanizeError } from '../../utils/apiErrors';
import {
  exportMedicalDetailExcel,
  exportMedicalDetailPdf,
  exportMedicalSynthesisExcel,
  exportMedicalSynthesisPdf,
} from '../../utils/medicalListExport';
import { computeMedicalStats } from '../../utils/medicalStats';
import { MEDICAL_CHANGED } from '../../utils/medicalStore';
import { initials } from '../../utils/formatters';

const EMPTY_FILTERS = {
  q: '',
  departement: '',
  niveau: '',
  medical: '',
  type: '',
};

const MEDICAL_FILTER_OPTIONS = [
  { value: '', label: 'Tous les dossiers' },
  { value: 'with', label: 'Avec consultations' },
  { value: 'without', label: 'Sans consultation' },
];

const TYPE_FILTER_OPTIONS = [
  { value: '', label: 'Tous types' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'incident', label: 'Incident médical' },
];

const SORT_OPTIONS = [
  { value: 'nom-asc', label: 'Nom (A → Z)' },
  { value: 'nom-desc', label: 'Nom (Z → A)' },
  { value: 'consultations-desc', label: 'Plus de consultations' },
  { value: 'date-desc', label: 'Dernière consultation récente' },
];

function StatCard({ label, value, hint, icon: Icon, accent }) {
  const accents = {
    navy: 'border-l-navy bg-white',
    sky: 'border-l-sky-500 bg-sky-50/40',
    rose: 'border-l-rose-500 bg-rose-50/40',
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

function formatDateShort(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return iso;
  }
}

function filtersSummary(filters) {
  const parts = [];
  if (filters.q?.trim()) parts.push(`« ${filters.q.trim()} »`);
  if (filters.departement) {
    const d = DEPARTEMENTS.find((x) => x.value === filters.departement);
    parts.push(d?.label ?? filters.departement);
  }
  if (filters.niveau) parts.push(filters.niveau);
  if (filters.medical === 'with') parts.push('avec consultations');
  if (filters.medical === 'without') parts.push('sans consultation');
  if (filters.type === 'consultation') parts.push('consultation');
  if (filters.type === 'incident') parts.push('incident médical');
  return parts.length ? parts.join(' · ') : null;
}

function rowToFichePreview(row) {
  return {
    ...row,
    consultations: [],
    sante: { groupeSanguin: row.groupeSanguin ?? '' },
    scolarite: { departement: row.departement, niveau: row.niveau },
  };
}

export default function ListeMedical() {
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
    window.addEventListener(MEDICAL_CHANGED, refresh);
    return () => window.removeEventListener(MEDICAL_CHANGED, refresh);
  }, []);

  const { data, loading, error } = useFetch(
    () => medicalService.listStudents(filters),
    [filters.q, filters.departement, filters.niveau, filters.medical, filters.type, key],
  );

  const openFiche = useCallback(async (row) => {
    if (!row?.id) return;
    setFicheId(row.id);
    setFicheLoading(true);
    setFicheData(rowToFichePreview(row));
    try {
      const dossier = await medicalService.getStudent(row.id, row);
      setFicheData(dossier);
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
    const dossier = await medicalService.getStudent(ficheId, ficheData);
    setFicheData(dossier);
  }, [ficheId, ficheData]);

  const filteredRows = useMemo(() => {
    const copy = [...(data ?? [])];
    copy.sort((a, b) => {
      const nameA = `${a.nom ?? ''} ${a.prenom ?? ''}`.trim();
      const nameB = `${b.nom ?? ''} ${b.prenom ?? ''}`.trim();
      if (sort === 'nom-desc') return nameB.localeCompare(nameA, 'fr');
      if (sort === 'consultations-desc') return (b.nbConsultations ?? 0) - (a.nbConsultations ?? 0);
      if (sort === 'date-desc') {
        return String(b.derniereDate ?? '').localeCompare(String(a.derniereDate ?? ''));
      }
      return nameA.localeCompare(nameB, 'fr');
    });
    return copy;
  }, [data, sort]);

  const stats = useMemo(() => computeMedicalStats(filteredRows), [filteredRows]);
  const activeFilterSummary = useMemo(() => filtersSummary(filters), [filters]);

  const hasActiveFilters = useMemo(
    () => Object.entries(filters).some(([, v]) => String(v ?? '').trim() !== ''),
    [filters],
  );

  const departementOptions = [
    { value: '', label: 'Tous les départements' },
    ...DEPARTEMENTS.filter((o) => o.value),
  ];

  const niveauOptions = [
    { value: '', label: 'Tous les niveaux' },
    ...NIVEAUX_SCOLARITE.map((n) => ({ value: n, label: n })),
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
        if (option.format === 'xlsx') await exportMedicalDetailExcel(filteredRows);
        else await exportMedicalDetailPdf(filteredRows, meta);
      } else if (option.format === 'xlsx') {
        await exportMedicalSynthesisExcel(filteredRows);
      } else {
        await exportMedicalSynthesisPdf(filteredRows, meta);
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
      <MedicalFicheView
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
          <span className="font-semibold text-navy">Suivi médical</span>
        </div>
      </nav>

      <header className="flex flex-col gap-4 rounded-2xl border border-light-gray bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-navy text-white shadow-sm">
            <HeartPulse size={22} strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="font-serif text-xl font-semibold text-slate-900 sm:text-2xl">
              Registre médical
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Consultations infirmerie · {ROLE_LABEL[role]}
            </p>
          </div>
        </div>
        <MedicalExportMenu
          studentCount={filteredRows.length}
          consultationCount={stats.totalConsultations}
          filtersLabel={activeFilterSummary ?? ''}
          disabled={loading}
          busy={exportBusy}
          onExport={runExport}
        />
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard label="Dossiers" value={stats.totalStudents} icon={Users} accent="navy" />
        <StatCard
          label="Avec consultations"
          value={stats.withConsultations}
          hint={`${stats.withoutConsultations} sans consultation`}
          icon={Activity}
          accent="sky"
        />
        <StatCard label="Consultations" value={stats.consultations} icon={HeartPulse} accent="slate" />
        <StatCard label="Incidents" value={stats.incidents} accent="rose" />
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
          <label className="relative lg:col-span-3">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Recherche
            </span>
            <Search
              className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              placeholder="Matricule, nom, groupe sanguin…"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              className="input w-full py-2.5 pl-9 text-sm"
            />
          </label>

          <div className="lg:col-span-2">
            <FilterSelect
              id="med-filter-dept"
              label="Département"
              value={filters.departement}
              onChange={(v) => setFilters((f) => ({ ...f, departement: v }))}
              options={departementOptions}
            />
          </div>
          <div className="lg:col-span-2">
            <FilterSelect
              id="med-filter-niveau"
              label="Niveau"
              value={filters.niveau}
              onChange={(v) => setFilters((f) => ({ ...f, niveau: v }))}
              options={niveauOptions}
            />
          </div>
          <div className="lg:col-span-2">
            <FilterSelect
              id="med-filter-medical"
              label="Dossier"
              value={filters.medical}
              onChange={(v) => setFilters((f) => ({ ...f, medical: v }))}
              options={MEDICAL_FILTER_OPTIONS}
            />
          </div>
          <div className="lg:col-span-1">
            <FilterSelect
              id="med-filter-type"
              label="Type"
              value={filters.type}
              onChange={(v) => setFilters((f) => ({ ...f, type: v }))}
              options={TYPE_FILTER_OPTIONS}
            />
          </div>
          <div className="lg:col-span-2">
            <FilterSelect
              id="med-filter-sort"
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
            className="hidden border-b border-light-gray bg-slate-50/90 px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 xl:grid xl:grid-cols-[minmax(0,1.2fr)_2.5rem_3.5rem_5rem_4rem_3.5rem_minmax(0,1fr)_2rem] xl:gap-2 xl:px-6"
            aria-hidden
          >
            <span>Étudiant</span>
            <span>Âge</span>
            <span>GS</span>
            <span>Dépt</span>
            <span>Niv.</span>
            <span className="text-right">Nb</span>
            <span>Dernière consultation</span>
            <span />
          </div>
        ) : null}

        {!loading && filteredRows.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <HeartPulse size={40} className="mx-auto text-slate-300" strokeWidth={1.25} aria-hidden />
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
                    <div className="h-12 rounded bg-slate-100" />
                  </li>
                );
              }

              const nomComplet = `${row.prenom ?? ''} ${row.nom ?? ''}`.trim();
              const nb = row.nbConsultations ?? 0;

              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => openFiche(row)}
                    className="group grid w-full grid-cols-1 gap-2 px-5 py-3.5 text-left transition hover:bg-navy/[0.03] xl:grid-cols-[minmax(0,1.2fr)_2.5rem_3.5rem_5rem_4rem_3.5rem_minmax(0,1fr)_2rem] xl:items-center xl:gap-2 xl:px-6 xl:py-3"
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

                    <p className="text-xs text-slate-600">
                      <span className="font-semibold text-slate-400 xl:hidden">Âge · </span>
                      {row.age != null ? row.age : '—'}
                    </p>
                    <p className="text-xs font-medium text-slate-700">
                      <span className="font-semibold text-slate-400 xl:hidden">GS · </span>
                      {row.groupeSanguin || '—'}
                    </p>
                    <p className="truncate text-xs text-slate-600">
                      <span className="font-semibold text-slate-400 xl:hidden">Dépt · </span>
                      {row.departement || '—'}
                    </p>
                    <p className="text-xs text-slate-600">
                      <span className="font-semibold text-slate-400 xl:hidden">Niv. · </span>
                      {row.niveau || '—'}
                    </p>
                    <p className="font-serif text-lg font-semibold tabular-nums text-navy xl:text-right xl:text-base">
                      <span className="text-xs font-semibold text-slate-400 xl:hidden">Nb · </span>
                      {nb}
                    </p>

                    <div className="min-w-0 text-xs text-slate-600">
                      {nb > 0 ? (
                        <>
                          <p className="truncate font-medium text-slate-800">
                            {formatDateShort(row.derniereDate)}
                            {row.derniereType ? ` · ${row.derniereType}` : ''}
                          </p>
                          {row.derniereMotif ? (
                            <p className="truncate text-slate-500">{row.derniereMotif}</p>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>

                    <ChevronRight
                      size={18}
                      className="hidden shrink-0 text-slate-300 group-hover:text-gold xl:block"
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
