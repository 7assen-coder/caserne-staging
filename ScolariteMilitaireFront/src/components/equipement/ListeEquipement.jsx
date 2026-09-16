import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Package,
  PackageCheck,
  PackageOpen,
  Search,
  Users,
} from 'lucide-react';
import EquipementFicheView from './EquipementFicheView';
import EquipementExportMenu from './EquipementExportMenu';
import OpsModuleShell from '../ops/OpsModuleShell';
import OpsFilterSelect from '../ops/OpsFilterSelect';
import OpsStudentRow from '../ops/OpsStudentRow';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { useAuth } from '../../hooks/useAuth';
import { equipementService, EQUIPEMENT_CHANGED } from '../../services/equipementService';
import { SECTIONS_OPTIONS, COMPAGNIES_OPTIONS } from '../../data/etudiantOptions';
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

const EMPTY_FILTERS = { q: '', section: '', compagnie: '', stock: '' };

const STOCK_FILTER_OPTIONS = [
  { value: '', label: 'Tous les dossiers' },
  { value: 'with', label: 'Avec équipement' },
  { value: 'without', label: 'Sans équipement' },
];

const SORT_OPTIONS = [
  { value: 'nom-asc', label: 'Nom (A → Z)' },
  { value: 'nom-desc', label: 'Nom (Z → A)' },
  { value: 'items-desc', label: "Plus d'items" },
  { value: 'items-asc', label: "Moins d'items" },
];

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
    queryKey: queryKeys.equipement.list(filters),
    queryFn: () => equipementService.listStudents(filters),
    enabled: bootstrapped && isAuthenticated,
  });

  useEffect(() => {
    const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.equipement.all });
    window.addEventListener(EQUIPEMENT_CHANGED, refresh);
    return () => window.removeEventListener(EQUIPEMENT_CHANGED, refresh);
  }, [queryClient]);

  const openFiche = useCallback(
    async (row) => {
      if (!row?.id) return;
      setFicheId(row.id);
      setFicheLoading(true);
      setFicheData(null);
      setFicheError(null);
      try {
        const dossier = await equipementService.getStudent(row.id);
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
    queryClient.invalidateQueries({ queryKey: queryKeys.equipement.all });
    setFicheLoading(true);
    setFicheError(null);
    try {
      const dossier = await equipementService.getStudent(ficheId);
      setFicheData(dossier);
    } catch (err) {
      setFicheError(err);
    } finally {
      setFicheLoading(false);
    }
  }, [ficheId, queryClient]);

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

  return (
    <OpsModuleShell
      title="Registre équipement"
      subtitle={`Remises, retours et pièces jointes · ${ROLE_LABEL[role]}`}
      icon={Package}
      headerActions={
        <EquipementExportMenu
          studentCount={filteredRows.length}
          itemCount={stats.totalItems}
          filtersLabel={activeFilterSummary ?? ''}
          disabled={loading || isError}
          busy={exportBusy}
          onExport={runExport}
        />
      }
      stats={[
        { label: 'Dossiers', value: stats.totalStudents, icon: Users, accent: 'navy' },
        {
          label: 'Pièces totales',
          value: stats.totalItems,
          hint: `${stats.withItems} dossier${stats.withItems > 1 ? 's' : ''} équipé${stats.withItems > 1 ? 's' : ''}`,
          icon: Package,
          accent: 'green',
        },
        { label: 'En usage', value: stats.enUsage, icon: PackageOpen, accent: 'amber' },
        { label: 'Rendu', value: stats.rendu, icon: PackageCheck, accent: 'slate' },
      ]}
      filters={filters}
      emptyFilters={EMPTY_FILTERS}
      onFiltersChange={setFilters}
      filterSummary={activeFilterSummary}
      filterFields={
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-end lg:gap-3">
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
            <OpsFilterSelect
              id="eq-filter-section"
              label="Section"
              value={filters.section}
              onChange={(v) => setFilters((f) => ({ ...f, section: v }))}
              options={sectionFilterOptions}
            />
          </div>
          <div className="lg:col-span-2">
            <OpsFilterSelect
              id="eq-filter-compagnie"
              label="Compagnie"
              value={filters.compagnie}
              onChange={(v) => setFilters((f) => ({ ...f, compagnie: v }))}
              options={compagnieFilterOptions}
            />
          </div>
          <div className="lg:col-span-2">
            <OpsFilterSelect
              id="eq-filter-stock"
              label="Stock"
              value={filters.stock}
              onChange={(v) => setFilters((f) => ({ ...f, stock: v }))}
              options={STOCK_FILTER_OPTIONS}
            />
          </div>
          <div className="lg:col-span-2">
            <OpsFilterSelect
              id="eq-filter-sort"
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
      emptyIcon={Package}
      columnHeader={
        <div
          className="hidden border-b border-light-gray bg-slate-50/90 px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:grid sm:grid-cols-[minmax(0,1fr)_7rem_5rem_2rem] sm:gap-4 sm:px-6"
          aria-hidden
        >
          <span>Étudiant</span>
          <span className="text-center">Section</span>
          <span className="text-right">Pièces</span>
          <span />
        </div>
      }
      fiche={
        ficheId ? (
          <EquipementFicheView
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
      {filteredRows.map((row) => (
        <OpsStudentRow
          key={row.id}
          row={row}
          onOpen={openFiche}
          metaLine={row.matricule}
          middle={
            <>
              <p className="text-xs text-slate-600 sm:text-center">
                <span className="font-semibold text-slate-400 sm:hidden">Section · </span>
                {row.section || '—'}
              </p>
              <div className="flex items-center justify-between sm:block sm:text-right">
                <span className="text-xs font-semibold text-slate-400 sm:hidden">Pièces</span>
                <span className="font-serif text-lg font-semibold tabular-nums text-navy">
                  {row.nbItems ?? 0}
                </span>
              </div>
            </>
          }
        />
      ))}
    </OpsModuleShell>
  );
}
