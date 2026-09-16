import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Scale,
  Search,
  Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SanctionsFicheView from './SanctionsFicheView';
import SanctionExportMenu from './SanctionExportMenu';
import OpsModuleShell from '../ops/OpsModuleShell';
import OpsFilterSelect from '../ops/OpsFilterSelect';
import OpsStudentRow from '../ops/OpsStudentRow';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { useAuth } from '../../hooks/useAuth';
import { sanctionService, SANCTIONS_CHANGED } from '../../services/sanctionService';
import { DEPARTEMENTS, NIVEAUX_SCOLARITE } from '../../utils/constants';
import { ROLE_LABEL, getCanonicalRole, getPermissions } from '../../utils/userRole';
import { useToast } from '../../context/ToastContext';
import { formatApiError, humanizeError } from '../../utils/apiErrors';
import { formatDate } from '../../utils/formatLocale';
import {
  exportSanctionDetailExcel,
  exportSanctionDetailPdf,
  exportSanctionSynthesisExcel,
  exportSanctionSynthesisPdf,
} from '../../utils/sanctionListExport';
import { computeSanctionStats } from '../../utils/sanctionStats';

const EMPTY_FILTERS = {
  q: '',
  departement: '',
  niveau: '',
  sanction: '',
  statut: '',
};

const ROW_GRID =
  'sm:grid sm:grid-cols-[minmax(0,1fr)_6rem_5rem_4rem_minmax(0,1fr)_2rem] sm:items-center sm:gap-3';

function formatDateShort(iso) {
  if (!iso) return '—';
  return formatDate(iso, { day: '2-digit', month: '2-digit', year: 'numeric' }) || iso;
}

function filtersSummary(filters, t) {
  const parts = [];
  if (filters.q?.trim()) parts.push(`« ${filters.q.trim()} »`);
  if (filters.departement) {
    const d = DEPARTEMENTS.find((x) => x.value === filters.departement);
    parts.push(d?.label ?? filters.departement);
  }
  if (filters.niveau) parts.push(filters.niveau);
  if (filters.sanction === 'with') parts.push(t('withSanctions'));
  if (filters.sanction === 'without') parts.push(t('withoutSanctions', { count: '' }).trim());
  if (filters.statut === 'en_cours') parts.push(t('inProgress'));
  return parts.length ? parts.join(' · ') : null;
}

export default function ListeSanctions() {
  const { t } = useTranslation('modules');
  const { fonction, bootstrapped, isAuthenticated } = useAuth();
  const role = getCanonicalRole(fonction);
  const perms = getPermissions(role);
  const canEdit = perms.canEditStudent;
  const toast = useToast();

  const SANCTION_FILTER_OPTIONS = useMemo(
    () => [
      { value: '', label: t('allDossiers') },
      { value: 'with', label: t('withSanctions') },
      { value: 'without', label: t('withoutSanctions', { count: '—' }) },
    ],
    [t],
  );

  const STATUT_FILTER_OPTIONS = useMemo(
    () => [
      { value: '', label: t('allStatuses') },
      { value: 'en_cours', label: t('inProgress') },
    ],
    [t],
  );

  const SORT_OPTIONS = useMemo(
    () => [
      { value: 'nom-asc', label: `${t('colStudent')} (A → Z)` },
      { value: 'nom-desc', label: `${t('colStudent')} (Z → A)` },
      { value: 'sanctions-desc', label: t('withSanctions') },
      { value: 'date-desc', label: t('colLastSanction') },
    ],
    [t],
  );

  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
  const [sort, setSort] = useState('nom-asc');
  const [ficheId, setFicheId] = useState(null);
  const [ficheData, setFicheData] = useState(null);
  const [ficheLoading, setFicheLoading] = useState(false);
  const [ficheError, setFicheError] = useState(null);
  const [exportBusy, setExportBusy] = useState(null);

  const queryClient = useQueryClient();
  const { data, isPending: loading, error, refetch, isError } = useQuery({
    queryKey: queryKeys.sanctions.list(filters),
    queryFn: () => sanctionService.listStudents(filters),
    enabled: bootstrapped && isAuthenticated,
  });

  useEffect(() => {
    const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.sanctions.all });
    window.addEventListener(SANCTIONS_CHANGED, refresh);
    return () => window.removeEventListener(SANCTIONS_CHANGED, refresh);
  }, [queryClient]);

  const openFiche = useCallback(
    async (row) => {
      if (!row?.id) return;
      setFicheId(row.id);
      setFicheLoading(true);
      setFicheData(null);
      setFicheError(null);
      try {
        const dossier = await sanctionService.getStudent(row.id, row);
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
    queryClient.invalidateQueries({ queryKey: queryKeys.sanctions.all });
    setFicheLoading(true);
    setFicheError(null);
    try {
      const dossier = await sanctionService.getStudent(ficheId, ficheData);
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
      if (sort === 'sanctions-desc') return (b.nbSanctions ?? 0) - (a.nbSanctions ?? 0);
      if (sort === 'date-desc') {
        return String(b.derniereDate ?? '').localeCompare(String(a.derniereDate ?? ''));
      }
      return nameA.localeCompare(nameB, 'fr');
    });
    return copy;
  }, [data, sort]);

  const stats = useMemo(() => computeSanctionStats(filteredRows), [filteredRows]);
  const activeFilterSummary = useMemo(() => filtersSummary(filters, t), [filters, t]);

  const departementOptions = [
    { value: '', label: t('department') },
    ...DEPARTEMENTS.filter((o) => o.value),
  ];

  const niveauOptions = [
    { value: '', label: t('level') },
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
        if (option.format === 'xlsx') await exportSanctionDetailExcel(filteredRows);
        else await exportSanctionDetailPdf(filteredRows, meta);
      } else if (option.format === 'xlsx') {
        await exportSanctionSynthesisExcel(filteredRows);
      } else {
        await exportSanctionSynthesisPdf(filteredRows, meta);
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
      title={t('sanctions')}
      subtitle={t('sanctionsSubtitle', { role: ROLE_LABEL[role] })}
      icon={Scale}
      headerActions={
        <SanctionExportMenu
          studentCount={filteredRows.length}
          sanctionCount={stats.totalSanctions}
          filtersLabel={activeFilterSummary ?? ''}
          disabled={loading || isError}
          busy={exportBusy}
          onExport={runExport}
        />
      }
      stats={[
        { label: t('dossiers'), value: stats.totalStudents, icon: Users, accent: 'navy' },
        {
          label: t('withSanctions'),
          value: stats.withSanctions,
          hint: t('withoutSanctions', { count: stats.withoutSanctions }),
          icon: AlertTriangle,
          accent: 'amber',
        },
        { label: t('inProgress'), value: stats.enCours, icon: Scale, accent: 'green' },
        { label: t('closed'), value: stats.cloturees, accent: 'slate' },
      ]}
      filters={filters}
      emptyFilters={EMPTY_FILTERS}
      onFiltersChange={setFilters}
      filterSummary={activeFilterSummary}
      filterFields={
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-end lg:gap-3">
          <label className="relative lg:col-span-3">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {t('search')}
            </span>
            <Search
              className="pointer-events-none absolute bottom-3 start-3 h-4 w-4 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              placeholder={t('searchPlaceholder')}
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              className="input w-full py-2.5 ps-9 text-sm"
            />
          </label>
          <div className="lg:col-span-2">
            <OpsFilterSelect
              id="san-filter-dept"
              label={t('department')}
              value={filters.departement}
              onChange={(v) => setFilters((f) => ({ ...f, departement: v }))}
              options={departementOptions}
            />
          </div>
          <div className="lg:col-span-2">
            <OpsFilterSelect
              id="san-filter-niveau"
              label={t('level')}
              value={filters.niveau}
              onChange={(v) => setFilters((f) => ({ ...f, niveau: v }))}
              options={niveauOptions}
            />
          </div>
          <div className="lg:col-span-2">
            <OpsFilterSelect
              id="san-filter-sanction"
              label={t('dossier')}
              value={filters.sanction}
              onChange={(v) => setFilters((f) => ({ ...f, sanction: v }))}
              options={SANCTION_FILTER_OPTIONS}
            />
          </div>
          <div className="lg:col-span-1">
            <OpsFilterSelect
              id="san-filter-statut"
              label={t('status')}
              value={filters.statut}
              onChange={(v) => setFilters((f) => ({ ...f, statut: v }))}
              options={STATUT_FILTER_OPTIONS}
            />
          </div>
          <div className="lg:col-span-2">
            <OpsFilterSelect
              id="san-filter-sort"
              label={t('sort')}
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
      listHeader={{ title: t('listHeader'), count: filteredRows.length }}
      emptyIcon={Scale}
      columnHeader={
        <div
          className="hidden border-b border-light-gray bg-slate-50/90 px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:grid sm:grid-cols-[minmax(0,1fr)_6rem_5rem_4rem_minmax(0,1fr)_2rem] sm:gap-3 sm:px-6"
          aria-hidden
        >
          <span>{t('colStudent')}</span>
          <span>{t('colDept')}</span>
          <span>{t('colLevel')}</span>
          <span className="text-end">{t('colCount')}</span>
          <span>{t('colLastSanction')}</span>
          <span />
        </div>
      }
      fiche={
        ficheId ? (
          <SanctionsFicheView
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
        const nb = row.nbSanctions ?? 0;
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
