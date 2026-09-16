import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ClipboardList,
  Clock,
  FileText,
  Search,
  Users,
} from 'lucide-react';
import DemandesFicheView from './DemandesFicheView';
import DemandeExportMenu from './DemandeExportMenu';
import OpsModuleShell from '../ops/OpsModuleShell';
import OpsFilterSelect from '../ops/OpsFilterSelect';
import OpsStudentRow from '../ops/OpsStudentRow';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { useAuth } from '../../hooks/useAuth';
import { demandeService, DEMANDES_CHANGED } from '../../services/demandeService';
import { DEPARTEMENTS, NIVEAUX_SCOLARITE } from '../../utils/constants';
import { ROLE_LABEL, getCanonicalRole, getPermissions } from '../../utils/userRole';
import { useToast } from '../../context/ToastContext';
import { formatApiError, humanizeError } from '../../utils/apiErrors';
import {
  exportDemandeDetailExcel,
  exportDemandeDetailPdf,
  exportDemandeSynthesisExcel,
  exportDemandeSynthesisPdf,
} from '../../utils/demandeListExport';
import { computeDemandeStats } from '../../utils/demandeStats';

const EMPTY_FILTERS = {
  q: '',
  departement: '',
  niveau: '',
  demande: '',
  statut: '',
};

const DEMANDE_FILTER_OPTIONS = [
  { value: '', label: 'Tous les dossiers' },
  { value: 'with', label: 'Avec demandes' },
  { value: 'without', label: 'Sans demande' },
];

const STATUT_FILTER_OPTIONS = [
  { value: '', label: 'Tous statuts' },
  { value: 'en_cours', label: 'Demande en cours' },
];

const SORT_OPTIONS = [
  { value: 'nom-asc', label: 'Nom (A → Z)' },
  { value: 'nom-desc', label: 'Nom (Z → A)' },
  { value: 'demandes-desc', label: 'Plus de demandes' },
  { value: 'date-desc', label: 'Dernière demande récente' },
];

const ROW_GRID =
  'sm:grid sm:grid-cols-[minmax(0,1fr)_6rem_5rem_4rem_minmax(0,1fr)_2rem] sm:items-center sm:gap-3';

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
  if (filters.demande === 'with') parts.push('avec demandes');
  if (filters.demande === 'without') parts.push('sans demande');
  if (filters.statut === 'en_cours') parts.push('en cours');
  return parts.length ? parts.join(' · ') : null;
}

export default function ListeDemandes() {
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
    queryKey: queryKeys.demandes.list(filters),
    queryFn: () => demandeService.listStudents(filters),
    enabled: bootstrapped && isAuthenticated,
  });

  useEffect(() => {
    const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.demandes.all });
    window.addEventListener(DEMANDES_CHANGED, refresh);
    return () => window.removeEventListener(DEMANDES_CHANGED, refresh);
  }, [queryClient]);

  const openFiche = useCallback(
    async (row) => {
      if (!row?.id) return;
      setFicheId(row.id);
      setFicheLoading(true);
      setFicheData(null);
      setFicheError(null);
      try {
        const dossier = await demandeService.getStudent(row.id, row);
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
    queryClient.invalidateQueries({ queryKey: queryKeys.demandes.all });
    setFicheLoading(true);
    setFicheError(null);
    try {
      const dossier = await demandeService.getStudent(ficheId, ficheData);
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
      if (sort === 'demandes-desc') return (b.nbDemandes ?? 0) - (a.nbDemandes ?? 0);
      if (sort === 'date-desc') {
        return String(b.derniereDate ?? '').localeCompare(String(a.derniereDate ?? ''));
      }
      return nameA.localeCompare(nameB, 'fr');
    });
    return copy;
  }, [data, sort]);

  const stats = useMemo(() => computeDemandeStats(filteredRows), [filteredRows]);
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
        if (option.format === 'xlsx') await exportDemandeDetailExcel(filteredRows);
        else await exportDemandeDetailPdf(filteredRows, meta);
      } else if (option.format === 'xlsx') {
        await exportDemandeSynthesisExcel(filteredRows);
      } else {
        await exportDemandeSynthesisPdf(filteredRows, meta);
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
      title="Registre demandes"
      subtitle={`Permissions et autorisations · ${ROLE_LABEL[role]}`}
      icon={ClipboardList}
      headerActions={
        <DemandeExportMenu
          studentCount={filteredRows.length}
          demandeCount={stats.totalDemandes}
          filtersLabel={activeFilterSummary ?? ''}
          disabled={loading || isError}
          busy={exportBusy}
          onExport={runExport}
        />
      }
      stats={[
        { label: 'Dossiers', value: stats.totalStudents, icon: Users, accent: 'navy' },
        {
          label: 'Avec demandes',
          value: stats.withDemandes,
          hint: `${stats.withoutDemandes} sans demande`,
          icon: FileText,
          accent: 'amber',
        },
        { label: 'En cours', value: stats.enCours, icon: Clock, accent: 'green' },
        { label: 'Acceptées', value: stats.acceptees, accent: 'slate' },
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
              placeholder="Matricule, nom…"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              className="input w-full py-2.5 pl-9 text-sm"
            />
          </label>
          <div className="lg:col-span-2">
            <OpsFilterSelect
              id="dem-filter-dept"
              label="Département"
              value={filters.departement}
              onChange={(v) => setFilters((f) => ({ ...f, departement: v }))}
              options={departementOptions}
            />
          </div>
          <div className="lg:col-span-2">
            <OpsFilterSelect
              id="dem-filter-niveau"
              label="Niveau"
              value={filters.niveau}
              onChange={(v) => setFilters((f) => ({ ...f, niveau: v }))}
              options={niveauOptions}
            />
          </div>
          <div className="lg:col-span-2">
            <OpsFilterSelect
              id="dem-filter-demande"
              label="Dossier"
              value={filters.demande}
              onChange={(v) => setFilters((f) => ({ ...f, demande: v }))}
              options={DEMANDE_FILTER_OPTIONS}
            />
          </div>
          <div className="lg:col-span-1">
            <OpsFilterSelect
              id="dem-filter-statut"
              label="Statut"
              value={filters.statut}
              onChange={(v) => setFilters((f) => ({ ...f, statut: v }))}
              options={STATUT_FILTER_OPTIONS}
            />
          </div>
          <div className="lg:col-span-2">
            <OpsFilterSelect
              id="dem-filter-sort"
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
      emptyIcon={ClipboardList}
      columnHeader={
        <div
          className="hidden border-b border-light-gray bg-slate-50/90 px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:grid sm:grid-cols-[minmax(0,1fr)_6rem_5rem_4rem_minmax(0,1fr)_2rem] sm:gap-3 sm:px-6"
          aria-hidden
        >
          <span>Étudiant</span>
          <span>Dépt</span>
          <span>Niv.</span>
          <span className="text-right">Nb</span>
          <span>Dernière demande</span>
          <span />
        </div>
      }
      fiche={
        ficheId ? (
          <DemandesFicheView
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
        const nb = row.nbDemandes ?? 0;
        return (
          <OpsStudentRow
            key={row.id}
            row={row}
            onOpen={openFiche}
            metaLine={row.matricule}
            gridClass={ROW_GRID}
            middle={
              <>
                <p className="truncate text-xs text-slate-600">
                  <span className="font-semibold text-slate-400 sm:hidden">Dépt · </span>
                  {row.departement || '—'}
                </p>
                <p className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-400 sm:hidden">Niv. · </span>
                  {row.niveau || '—'}
                </p>
                <div className="flex items-center justify-between sm:block sm:text-right">
                  <span className="text-xs font-semibold text-slate-400 sm:hidden">Nb</span>
                  <span className="font-serif text-lg font-semibold tabular-nums text-navy">{nb}</span>
                </div>
                <div className="min-w-0 text-xs text-slate-600">
                  {nb > 0 ? (
                    <>
                      <p className="truncate font-medium text-slate-800">
                        {formatDateShort(row.derniereDate)}
                        {row.derniereNature ? ` · ${row.derniereNature}` : ''}
                      </p>
                      {row.derniereDescription ? (
                        <p className="truncate text-slate-500">{row.derniereDescription}</p>
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
