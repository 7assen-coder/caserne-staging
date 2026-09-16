import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  HeartPulse,
  Search,
  Users,
} from 'lucide-react';
import MedicalFicheView from './MedicalFicheView';
import MedicalExportMenu from './MedicalExportMenu';
import OpsModuleShell from '../ops/OpsModuleShell';
import OpsFilterSelect from '../ops/OpsFilterSelect';
import OpsStudentRow from '../ops/OpsStudentRow';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { useAuth } from '../../hooks/useAuth';
import { medicalService, MEDICAL_CHANGED } from '../../services/medicalService';
import { DEPARTEMENTS, NIVEAUX_SCOLARITE } from '../../utils/constants';
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

const ROW_GRID =
  'xl:grid xl:grid-cols-[minmax(0,1.2fr)_2.5rem_3.5rem_5rem_4rem_3.5rem_minmax(0,1fr)_2rem] xl:items-center xl:gap-2';

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

export default function ListeMedical() {
  const { fonction, bootstrapped, isAuthenticated } = useAuth();
  const role = getCanonicalRole(fonction);
  const perms = getPermissions(role);
  const canEdit = perms.canEditStudent;
  const toast = useToast();

  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
  const [sort, setSort] = useState('nom-asc');
  const [ficheId, setFicheId] = useState(null);
  const [ficheData, setFicheData] = useState(null);
  const [ficheLoading, setFicheLoading] = useState(false);
  const [ficheError, setFicheError] = useState(null);
  const [exportBusy, setExportBusy] = useState(null);

  const queryClient = useQueryClient();
  const { data, isPending: loading, error, refetch, isError } = useQuery({
    queryKey: queryKeys.medical.list(filters),
    queryFn: () => medicalService.listStudents(filters),
    enabled: bootstrapped && isAuthenticated,
  });

  useEffect(() => {
    const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.medical.all });
    window.addEventListener(MEDICAL_CHANGED, refresh);
    return () => window.removeEventListener(MEDICAL_CHANGED, refresh);
  }, [queryClient]);

  const openFiche = useCallback(
    async (row) => {
      if (!row?.id) return;
      setFicheId(row.id);
      setFicheLoading(true);
      setFicheData(null);
      setFicheError(null);
      try {
        const dossier = await medicalService.getStudent(row.id, row);
        setFicheData(dossier);
      } catch (err) {
        setFicheError(err);
        toast.error(formatApiError(err));
      } finally {
        setFicheLoading(false);
      }
    },
    [toast],
  );

  const refreshFiche = useCallback(async () => {
    if (!ficheId) return;
    queryClient.invalidateQueries({ queryKey: queryKeys.medical.all });
    setFicheLoading(true);
    setFicheError(null);
    try {
      const dossier = await medicalService.getStudent(ficheId, ficheData);
      setFicheData(dossier);
    } catch (err) {
      setFicheError(err);
    } finally {
      setFicheLoading(false);
    }
  }, [ficheId, ficheData, queryClient]);

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

  return (
    <OpsModuleShell
      title="Registre médical"
      subtitle={`Consultations infirmerie · ${ROLE_LABEL[role]}`}
      icon={HeartPulse}
      headerActions={
        <MedicalExportMenu
          studentCount={filteredRows.length}
          consultationCount={stats.totalConsultations}
          filtersLabel={activeFilterSummary ?? ''}
          disabled={loading || isError}
          busy={exportBusy}
          onExport={runExport}
        />
      }
      stats={[
        { label: 'Dossiers', value: stats.totalStudents, icon: Users, accent: 'navy' },
        {
          label: 'Avec consultations',
          value: stats.withConsultations,
          hint: `${stats.withoutConsultations} sans consultation`,
          icon: Activity,
          accent: 'sky',
        },
        { label: 'Consultations', value: stats.consultations, icon: HeartPulse, accent: 'slate' },
        { label: 'Incidents', value: stats.incidents, accent: 'rose' },
      ]}
      filters={filters}
      emptyFilters={EMPTY_FILTERS}
      onFiltersChange={setFilters}
      filterSummary={activeFilterSummary}
      filterFields={
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-end lg:gap-3">
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
            <OpsFilterSelect
              id="med-filter-dept"
              label="Département"
              value={filters.departement}
              onChange={(v) => setFilters((f) => ({ ...f, departement: v }))}
              options={departementOptions}
            />
          </div>
          <div className="lg:col-span-2">
            <OpsFilterSelect
              id="med-filter-niveau"
              label="Niveau"
              value={filters.niveau}
              onChange={(v) => setFilters((f) => ({ ...f, niveau: v }))}
              options={niveauOptions}
            />
          </div>
          <div className="lg:col-span-2">
            <OpsFilterSelect
              id="med-filter-medical"
              label="Dossier"
              value={filters.medical}
              onChange={(v) => setFilters((f) => ({ ...f, medical: v }))}
              options={MEDICAL_FILTER_OPTIONS}
            />
          </div>
          <div className="lg:col-span-1">
            <OpsFilterSelect
              id="med-filter-type"
              label="Type"
              value={filters.type}
              onChange={(v) => setFilters((f) => ({ ...f, type: v }))}
              options={TYPE_FILTER_OPTIONS}
            />
          </div>
          <div className="lg:col-span-2">
            <OpsFilterSelect
              id="med-filter-sort"
              label="Tri"
              value={sort}
              onChange={setSort}
              options={SORT_OPTIONS}
            />
          </div>
        </div>
      }
      query={{
        isPending: loading,
        isError,
        error,
        refetch,
        isEmpty: filteredRows.length === 0,
      }}
      listHeader={{ title: 'Dossiers étudiants', count: filteredRows.length }}
      emptyIcon={HeartPulse}
      columnHeader={
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
      }
      fiche={
        ficheId ? (
          <MedicalFicheView
            dossier={ficheData}
            loading={ficheLoading}
            error={ficheError}
            onBack={() => {
              setFicheId(null);
              setFicheData(null);
              setFicheError(null);
            }}
            onRefresh={refreshFiche}
            canEdit={canEdit}
          />
        ) : null
      }
    >
      {filteredRows.map((row) => {
        const nb = row.nbConsultations ?? 0;
        return (
          <OpsStudentRow
            key={row.id}
            row={row}
            onOpen={openFiche}
            metaLine={row.matricule}
            gridClass={ROW_GRID}
            middle={
              <>
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
                <div className="flex items-center justify-between xl:block xl:text-right">
                  <span className="text-xs font-semibold text-slate-400 xl:hidden">Nb</span>
                  <span className="font-serif text-lg font-semibold tabular-nums text-navy xl:text-base">
                    {nb}
                  </span>
                </div>
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
              </>
            }
          />
        );
      })}
    </OpsModuleShell>
  );
}
