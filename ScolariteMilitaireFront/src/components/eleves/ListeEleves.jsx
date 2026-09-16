import { useCallback, useEffect, useMemo, useState } from 'react';
import ColonnesEtudiantsPicker from './ColonnesEtudiantsPicker';
import { useEtudiantColonnes } from '../../hooks/useEtudiantColonnes';
import { buildDataTableColumns, MOBILE_LIST_COLUMN_ORDER } from '../../utils/etudiantColonnesTable';
import { Link, useLocation } from 'react-router-dom';
import {
  Search,
  Plus,
  Upload,
  FileDown,
  ShieldAlert,
  RotateCcw,
} from 'lucide-react';
import Card from '../common/Card';
import DataTable from '../common/DataTable';
import ExportModal from '../common/ExportModal';
import StickyFilterBar from '../common/StickyFilterBar';
import FullScreenLayer from '../common/FullScreenLayer';
import SelectField from '../common/SelectField';
import Button from '../common/Button';
import QueryErrorPanel from '../common/QueryErrorPanel';
import FormulaireEleve from './FormulaireEleve';
import EleveFicheView from './EleveFicheView';
import { useElevesPage, useInvalidateEleves } from '../../hooks/useElevesQueries';
import { eleveService } from '../../services/eleveService';
import { DEPARTEMENTS, NIVEAUX_SCOLARITE } from '../../utils/constants';
import {
  COMPAGNIES_OPTIONS,
  SECTIONS_OPTIONS,
} from '../../data/etudiantOptions';
import { useAuth } from '../../hooks/useAuth';
import { getCanonicalRole, getPermissions } from '../../utils/userRole';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { formatApiError } from '../../utils/apiErrors';
import { exportEtudiantsExcel, exportEtudiantsPdf } from '../../utils/etudiantsListExport';
import { IMPORTED_ELEVES_CHANGED } from '../../utils/importedElevesStore';
import { useTranslation } from 'react-i18next';

const EMPTY_FILTERS = {
  q: '',
  departement: '',
  annee: '',
  compagnie: '',
  section: '',
};

const PAGE_SIZE = 25;

export default function ListeEleves() {
  const { t } = useTranslation(['eleves', 'common']);
  const location = useLocation();
  const { fonction } = useAuth();
  const role = getCanonicalRole(fonction);
  const perms = getPermissions(role);
  const confirm = useConfirm();
  const toast = useToast();

  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page, setPage] = useState(0);
  const invalidateEleves = useInvalidateEleves();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ((filters.q ?? '').trim()), 300);
    return () => clearTimeout(t);
  }, [filters.q]);

  useEffect(() => {
    setPage(0);
  }, [debouncedQ, filters.departement, filters.annee, filters.compagnie, filters.section]);

  useEffect(() => {
    const refresh = () => {
      invalidateEleves();
    };
    window.addEventListener(IMPORTED_ELEVES_CHANGED, refresh);
    return () => window.removeEventListener(IMPORTED_ELEVES_CHANGED, refresh);
  }, [invalidateEleves]);

  const listParams = useMemo(
    () => ({
      q: debouncedQ,
      departement: filters.departement,
      annee: filters.annee,
      compagnie: filters.compagnie,
      section: filters.section,
      page: page + 1,
      pageSize: PAGE_SIZE,
    }),
    [debouncedQ, filters.departement, filters.annee, filters.compagnie, filters.section, page],
  );

  const { data: pageData, isPending: loading, error, refetch } = useElevesPage(listParams);

  const rows = pageData?.results ?? [];
  const totalCount = pageData?.count ?? 0;
  const [ficheEleve, setFicheEleve] = useState(null);
  const [ficheEleveData, setFicheEleveData] = useState(null);
  const [ficheLoading, setFicheLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportBusy, setExportBusy] = useState(null);
  const { visibleIds, toggle, reset, selectAll } = useEtudiantColonnes();

  const openFiche = useCallback(async (row) => {
    if (!row?.id) return;
    setFicheEleve({ id: row.id });
    setFicheLoading(true);
    setFicheEleveData(null);
    try {
      const fullEleve = await eleveService.get(row.id);
      setFicheEleveData(fullEleve);
    } catch (err) {
      console.error(err);
      toast.error(formatApiError(err));
      setFicheEleve(null);
    } finally {
      setFicheLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const openId = location.state?.openEleveId;
    if (!openId) return;
    openFiche({ id: openId });
    window.history.replaceState({}, document.title, location.pathname);
  }, [location.state?.openEleveId, location.pathname, openFiche]);

  const handleDelete = useCallback(
    async (eleve) => {
      if (!eleve?.id) return;
      const ok = await confirm({
        title: 'Supprimer cet étudiant ?',
        message: `Le dossier de ${eleve.prenom} ${eleve.nom} (${eleve.matricule}) sera supprimé définitivement.`,
        confirmLabel: 'Supprimer',
        cancelLabel: 'Annuler',
        variant: 'danger',
      });
      if (!ok) return;
      try {
        await eleveService.delete(eleve.id);
        toast.success('Étudiant supprimé.');
        setFicheEleve(null);
        setFicheEleveData(null);
        await invalidateEleves();
      } catch (err) {
        console.error(err);
        toast.error(formatApiError(err));
      }
    },
    [confirm, toast, invalidateEleves],
  );

  const handleUpdate = async (values) => {
    const studentId = editing?.id ?? values?.id;
    if (!studentId) {
      throw new Error('Impossible d’enregistrer : dossier étudiant sans identifiant.');
    }
    try {
      const updated = await eleveService.update(studentId, values);
      setEditing(null);
      await invalidateEleves();
      if (ficheEleveData && ficheEleveData.id === studentId) {
        setFicheEleveData(updated);
      }
      toast.success('Dossier enregistré.');
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      throw error;
    }
  };

  const filteredRows = rows;

  const departementOptions = [
    { value: '', label: 'Tous' },
    ...DEPARTEMENTS,
  ];

  const anneeOptions = [
    { value: '', label: 'Toutes' },
    ...NIVEAUX_SCOLARITE.map((x) => ({ value: x, label: x })),
  ];

  const compagnieFilterOptions = [
    { value: '', label: 'Toutes' },
    ...COMPAGNIES_OPTIONS.filter((o) => o.value),
  ];

  const sectionFilterOptions = [
    { value: '', label: 'Toutes' },
    ...SECTIONS_OPTIONS.filter((o) => o.value),
  ];

  const columns = useMemo(() => buildDataTableColumns(visibleIds), [visibleIds]);

  const hasActiveFilters = useMemo(
    () => Object.entries(filters).some(([, v]) => String(v ?? '').trim() !== ''),
    [filters],
  );

  const openExport = () => {
    if (!totalCount) {
      toast.warning('Aucun étudiant à exporter avec les filtres actuels.');
      return;
    }
    if (!visibleIds.length) {
      toast.warning('Choisissez au moins une colonne via le bouton « Colonnes ».');
      return;
    }
    setExportOpen(true);
  };

  const runExport = async (format) => {
    if (!totalCount || !visibleIds.length) return;
    const meta = {
      filenameBase: 'liste-etudiants-esp',
      title: 'Liste des étudiants',
    };
    try {
      setExportBusy(format);
      const exportRows = await eleveService.listAllPages({
        q: debouncedQ,
        departement: filters.departement,
        annee: filters.annee,
        compagnie: filters.compagnie,
        section: filters.section,
      });
      if (format === 'xlsx') {
        await exportEtudiantsExcel(exportRows, visibleIds, meta);
      } else {
        await exportEtudiantsPdf(exportRows, visibleIds, meta);
      }
      toast.success(format === 'xlsx' ? 'Export Excel prêt.' : 'Export PDF prêt.');
      setExportOpen(false);
    } catch (err) {
      console.error(err);
      toast.error(formatApiError(err));
    } finally {
      setExportBusy(null);
    }
  };

  const ficheDisplay = ficheEleveData ?? ficheEleve;

  if (ficheEleve?.id) {
    return (
      <div className="flex min-h-[min(100vh,900px)] w-[calc(100%+2rem)] max-w-none -mx-4 -mt-8 flex-col md:-mx-8 md:-mt-10 md:w-[calc(100%+4rem)] lg:-mx-10 lg:-mt-12 lg:w-[calc(100%+5rem)]">
        <EleveFicheView
          eleve={ficheDisplay}
          loading={ficheLoading}
          onBack={() => {
            setFicheEleve(null);
            setFicheEleveData(null);
            setEditing(null);
          }}
          onEditDossier={perms.canEditStudent ? () => setEditing(ficheEleveData ?? ficheEleve) : undefined}
          onDelete={perms.canDeleteStudent ? () => handleDelete(ficheDisplay) : undefined}
        />
        {editing && perms.canEditStudent && (
          <FullScreenLayer
            open
            onClose={() => setEditing(null)}
            title="Modifier le dossier"
            subtitle="Mise à jour des informations — formulaire multi-étapes"
            chrome
            contentClassName="px-5 pb-8 pt-2 sm:px-8 sm:pb-10"
          >
            <FormulaireEleve
              eleve={editing}
              role={role}
              onSubmit={handleUpdate}
              onCancel={() => setEditing(null)}
            />
          </FullScreenLayer>
        )}
      </div>
    );
  }

  return (
    <div className="grid min-w-0 max-w-full grid-cols-1 gap-6 md:gap-8 xl:grid-cols-12 xl:gap-x-8">
      <div className="page-header min-w-0 xl:col-span-12">
        <div className="min-w-0 flex-1">
          <h1 className="page-title text-2xl sm:text-3xl md:text-5xl">{t('eleves:pageTitle')}</h1>
          {!perms.canCreateStudent ? (
            <p className="mt-1 text-sm text-text-light md:text-base">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200">
                <ShieldAlert size={12} aria-hidden />
                {t('eleves:readOnly')}
              </span>
            </p>
          ) : null}
        </div>
        <div className="flex w-full min-w-0 sm:w-auto">
          {perms.canCreateStudent ? (
            <Link
              to="/eleves/nouveau"
              className="btn btn-primary btn-lg w-full justify-center inline-flex items-center gap-2 sm:w-auto"
            >
              <Plus size={18} aria-hidden className="shrink-0" />
              <span className="truncate">{t('eleves:create')}</span>
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="btn btn-primary btn-lg w-full justify-center inline-flex cursor-not-allowed items-center gap-2 opacity-60 sm:w-auto"
              title={t('eleves:readOnly')}
            >
              <Plus size={18} aria-hidden className="shrink-0" />
              <span className="truncate">{t('eleves:create')}</span>
            </button>
          )}
        </div>
      </div>

      <StickyFilterBar>
        <div className="flex min-w-0 flex-col gap-2 p-3 [&_.form-field-contained]:gap-0.5 [&_.label]:!mb-0.5 [&_.label]:text-[11px] [&_.input]:h-9 [&_.input]:py-1.5 [&_.input]:text-sm">
          <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-end md:gap-2">
            <div className="relative min-w-0 flex-1 md:min-w-[12rem]">
              <span className="label !mb-0.5 text-[11px]">{t('eleves:search')}</span>
              <div className="relative">
                <Search
                  size={14}
                  className="absolute start-2.5 top-1/2 z-[1] -translate-y-1/2 text-text-muted"
                />
                <input
                  type="text"
                  placeholder={t('eleves:searchPlaceholder')}
                  className="input h-9 w-full border-slate-200 bg-white py-1.5 ps-8 text-sm shadow-sm"
                  value={filters.q}
                  onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                  aria-label="Recherche par nom, prénom ou matricule"
                />
              </div>
            </div>
            <div className="grid min-w-0 grid-cols-2 gap-2 md:contents">
              <div className="min-w-0 md:flex-1">
                <SelectField
                  label="Département"
                  value={filters.departement}
                  onChange={(v) => setFilters({ ...filters, departement: v })}
                  options={departementOptions}
                  id="filter-departement"
                />
              </div>
              <div className="min-w-0 md:flex-1">
                <SelectField
                  label="Année"
                  value={filters.annee}
                  onChange={(v) => setFilters({ ...filters, annee: v })}
                  options={anneeOptions}
                  id="filter-annee"
                />
              </div>
              <div className="min-w-0 md:flex-1">
                <SelectField
                  label="Compagnie"
                  value={filters.compagnie}
                  onChange={(v) => setFilters({ ...filters, compagnie: v })}
                  options={compagnieFilterOptions}
                  id="filter-compagnie"
                />
              </div>
              <div className="min-w-0 md:flex-1">
                <SelectField
                  label="Section"
                  value={filters.section}
                  onChange={(v) => setFilters({ ...filters, section: v })}
                  options={sectionFilterOptions}
                  id="filter-section"
                />
              </div>
            </div>
            {hasActiveFilters ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon={RotateCcw}
                className="shrink-0 self-stretch md:self-end"
                onClick={() => setFilters({ ...EMPTY_FILTERS })}
              >
                Réinitialiser
              </Button>
            ) : null}
          </div>
        </div>
      </StickyFilterBar>

      {error ? (
        <div className="min-w-0 xl:col-span-12">
          <QueryErrorPanel
            error={error}
            title="Impossible de charger la liste des étudiants."
            onRetry={() => refetch()}
          />
        </div>
      ) : null}

      <Card className="min-w-0 max-w-full xl:col-span-12" accent="gold">
        <div className="mb-4 flex min-w-0 flex-col gap-3 border-b border-light-gray pb-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p className="min-w-0 text-sm text-slate-500">
            {loading
              ? 'Chargement…'
              : `${filteredRows.length} étudiant${filteredRows.length > 1 ? 's' : ''} · cliquez sur une ligne pour ouvrir le dossier`}
          </p>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <ColonnesEtudiantsPicker
              visibleIds={visibleIds}
              onToggle={toggle}
              onReset={reset}
              onSelectAll={selectAll}
            />
            <Link
              to="/eleves/import"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-light-gray bg-white px-3 py-2 text-sm font-semibold text-navy shadow-sm transition hover:bg-slate-50"
            >
              <Upload size={18} aria-hidden className="shrink-0" />
              <span className="truncate">{t('eleves:import')}</span>
            </Link>
            <button
              type="button"
              onClick={openExport}
              disabled={loading || !totalCount}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-navy px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileDown size={18} aria-hidden className="shrink-0" />
              <span className="truncate">Exporter</span>
            </button>
          </div>
        </div>
        {loading ? (
          <div className="py-16 text-center text-sm text-slate-500">Chargement des étudiants…</div>
        ) : (
          <div className="min-w-0 max-w-full">
            <DataTable
              columns={columns}
              rows={filteredRows}
              mode="server"
              totalCount={totalCount}
              page={page}
              onPageChange={setPage}
              pageSize={PAGE_SIZE}
              onRowClick={openFiche}
              mobileColumnOrder={MOBILE_LIST_COLUMN_ORDER}
              dualHorizontalScroll={false}
              hideScrollbar
              stickyHeader
              empty={
                hasActiveFilters
                  ? 'Aucun étudiant ne correspond aux filtres.'
                  : 'Aucun étudiant.'
              }
            />
          </div>
        )}
      </Card>

      <ExportModal
        open={exportOpen}
        onClose={() => !exportBusy && setExportOpen(false)}
        title={t('eleves:exportTitle')}
        subtitle={`${totalCount} étudiant(s) · ${visibleIds.length} colonne(s)`}
        studentCount={totalCount}
        columnCount={visibleIds.length}
        busy={exportBusy}
        onExportExcel={() => runExport('xlsx')}
        onExportPdf={() => runExport('pdf')}
      />
    </div>
  );
}
