import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronRight,
  Globe,
  GraduationCap,
  Search,
  Users,
} from 'lucide-react';
import ScolariteFicheView from './ScolariteFicheView';
import ScolariteExportMenu from './ScolariteExportMenu';
import ScolariteColonnesPicker, { useScolariteColonnes } from './ScolariteColonnesPicker';
import SemestreBadge from './SemestreBadge';
import OpsModuleShell from '../ops/OpsModuleShell';
import OpsFilterSelect from '../ops/OpsFilterSelect';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { useAuth } from '../../hooks/useAuth';
import { scolariteService, SCOLARITE_CHANGED } from '../../services/scolariteService';
import { DEPARTEMENTS, NIVEAUX_SCOLARITE } from '../../utils/constants';
import { STATUT_ACADEMIQUE_OPTIONS } from '../../utils/eleveScolariteAuto';
import { semestreColumnLabel } from '../../data/scolariteSemestres';
import { ROLE_LABEL, getCanonicalRole, getPermissions } from '../../utils/userRole';
import { useToast } from '../../context/ToastContext';
import { formatApiError, humanizeError } from '../../utils/apiErrors';
import {
  exportScolariteDetailExcel,
  exportScolariteSynthesisExcel,
  exportScolariteSynthesisPdf,
} from '../../utils/scolariteListExport';
import { computeScolariteStats } from '../../utils/scolariteStats';
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

export default function ListeScolarite() {
  const { fonction, bootstrapped, isAuthenticated } = useAuth();
  const role = getCanonicalRole(fonction);
  const perms = getPermissions(role);
  const canEdit = perms.canEditStudent;
  const toast = useToast();
  const colonnes = useScolariteColonnes();

  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
  const [sort, setSort] = useState('nom-asc');
  const [ficheId, setFicheId] = useState(null);
  const [ficheData, setFicheData] = useState(null);
  const [ficheLoading, setFicheLoading] = useState(false);
  const [ficheError, setFicheError] = useState(null);
  const [exportBusy, setExportBusy] = useState(null);

  const queryClient = useQueryClient();
  const { data, isPending: loading, error, refetch, isError } = useQuery({
    queryKey: queryKeys.scolarite.list(filters),
    queryFn: () => scolariteService.listStudents(filters),
    enabled: bootstrapped && isAuthenticated,
  });

  useEffect(() => {
    const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.scolarite.all });
    window.addEventListener(SCOLARITE_CHANGED, refresh);
    return () => window.removeEventListener(SCOLARITE_CHANGED, refresh);
  }, [queryClient]);

  const openFiche = useCallback(
    async (row) => {
      if (!row?.id) return;
      setFicheId(row.id);
      setFicheLoading(true);
      setFicheData(null);
      setFicheError(null);
      try {
        const dossier = await scolariteService.getStudent(row.id, row);
        if (dossier) {
          setFicheData(dossier);
        } else {
          setFicheError(new Error('Impossible de charger le dossier scolarité.'));
          toast.error('Impossible de charger le dossier scolarité.');
        }
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
    queryClient.invalidateQueries({ queryKey: queryKeys.scolarite.all });
    setFicheLoading(true);
    setFicheError(null);
    try {
      const dossier = await scolariteService.getStudent(ficheId, ficheData);
      if (dossier) setFicheData(dossier);
      else setFicheError(new Error('Impossible de charger le dossier scolarité.'));
    } catch (err) {
      setFicheError(err);
      toast.error(formatApiError(err));
    } finally {
      setFicheLoading(false);
    }
  }, [ficheId, ficheData, queryClient, toast]);

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

  return (
    <OpsModuleShell
      title="Suivi scolarité"
      subtitle={`Validations semestres et mobilité · ${ROLE_LABEL[role]}`}
      icon={GraduationCap}
      headerActions={
        <div className="flex flex-wrap items-center gap-2">
          <ScolariteColonnesPicker {...colonnes} />
          <ScolariteExportMenu
            studentCount={rows.length}
            columnCount={colonnes.visibleKeys.length}
            filtersLabel={activeFilterSummary ?? ''}
            disabled={loading || isError}
            busy={exportBusy}
            onExport={runExport}
          />
        </div>
      }
      stats={[
        { label: 'Dossiers', value: stats.totalStudents, icon: Users, accent: 'navy' },
        {
          label: 'Validations',
          value: stats.validations,
          hint: `${stats.integral} intégrales · ${stats.partial} partielles`,
          icon: BookOpen,
          accent: 'green',
        },
        { label: 'Mobilité / DD', value: stats.enMobilite, icon: Globe, accent: 'amber' },
        { label: 'Redoublant', value: stats.redoublement, icon: GraduationCap, accent: 'slate' },
      ]}
      filters={filters}
      emptyFilters={EMPTY_FILTERS}
      onFiltersChange={setFilters}
      filterSummary={activeFilterSummary}
      filterFields={
        <>
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
                placeholder="Matricule, nom ou prénom…"
                value={filters.q}
                onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                className="input w-full py-2.5 pl-9 text-sm"
              />
            </label>
            <div className="lg:col-span-2">
              <OpsFilterSelect
                id="sc-filter-dept"
                label="Département"
                value={filters.departement}
                onChange={(v) => setFilters((f) => ({ ...f, departement: v }))}
                options={departementOptions}
              />
            </div>
            <div className="lg:col-span-2">
              <OpsFilterSelect
                id="sc-filter-niveau"
                label="Niveau"
                value={filters.niveau}
                onChange={(v) => setFilters((f) => ({ ...f, niveau: v }))}
                options={niveauOptions}
              />
            </div>
            <div className="lg:col-span-2">
              <OpsFilterSelect
                id="sc-filter-statut"
                label="Statut"
                value={filters.statut}
                onChange={(v) => setFilters((f) => ({ ...f, statut: v }))}
                options={statutOptions}
              />
            </div>
            <div className="lg:col-span-2">
              <OpsFilterSelect
                id="sc-filter-mobilite"
                label="Mobilité"
                value={filters.mobilite}
                onChange={(v) => setFilters((f) => ({ ...f, mobilite: v }))}
                options={MOBILITE_FILTER_OPTIONS}
              />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 border-t border-light-gray pt-3 sm:grid-cols-2 lg:max-w-xs">
            <OpsFilterSelect
              id="sc-filter-sort"
              label="Tri"
              value={sort}
              onChange={setSort}
              options={SORT_OPTIONS}
            />
          </div>
        </>
      }
      query={{
        isPending: loading,
        isError,
        error,
        refetch,
        isEmpty: rows.length === 0,
      }}
      listHeader={{
        title: 'Registre académique',
        count: rows.length,
        countLabel: loading
          ? 'Chargement…'
          : `${rows.length} dossier${rows.length > 1 ? 's' : ''} — cliquer pour le détail`,
      }}
      emptyIcon={GraduationCap}
      wrapList={false}
      fiche={
        ficheId ? (
          <ScolariteFicheView
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
            {rows.map((row) => {
              const nomComplet = `${row.prenom ?? ''} ${row.nom ?? ''}`.trim();
              const deptShort =
                String(row.departement ?? '').split('—')[0]?.trim() || row.departement;
              return (
                <tr
                  key={row.id}
                  className="group cursor-pointer border-b border-slate-100 transition hover:bg-navy/[0.03]"
                  onClick={() => openFiche(row)}
                >
                  <td className="sticky left-0 z-10 bg-white px-4 py-3 group-hover:bg-[#f8f9fb]">
                    <div className="flex min-w-[11rem] items-center gap-2.5">
                      {row.photoThumbUrl || row.photoUrl ? (
                        <img
                          src={row.photoThumbUrl || row.photoUrl}
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
                  <td
                    className="max-w-[8rem] truncate px-3 py-3 text-xs text-slate-600"
                    title={row.mobiliteLabel}
                  >
                    {row.mobilite?.type ?? '—'}
                  </td>
                  <td className="px-2 py-3 text-slate-300 group-hover:text-gold">
                    <ChevronRight size={16} aria-hidden />
                  </td>
                </tr>
              );
            })}
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
    </OpsModuleShell>
  );
}
