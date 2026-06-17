import { useCallback, useEffect, useMemo, useState } from 'react';
import ColonnesEtudiantsPicker from './ColonnesEtudiantsPicker';
import { useEtudiantColonnes } from '../../hooks/useEtudiantColonnes';
import { buildDataTableColumns, MOBILE_LIST_COLUMN_ORDER } from '../../utils/etudiantColonnesTable';
import { Link } from 'react-router-dom';
import {
  Search,
  Plus,
  Filter,
  Upload,
  FileDown,
  Globe,
  UserPlus,
  ShieldAlert,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';
import Card from '../common/Card';
import DataTable from '../common/DataTable';
import ExportModal from '../common/ExportModal';
import StickyFilterBar from '../common/StickyFilterBar';
import FullScreenLayer from '../common/FullScreenLayer';
import SelectField from '../common/SelectField';
import Button from '../common/Button';
import FormulaireEleve from './FormulaireEleve';
import EleveFicheView from './EleveFicheView';
import { useFetch } from '../../hooks/useFetch';
import { eleveService } from '../../services/eleveService';
import { DEPARTEMENTS, NIVEAUX_SCOLARITE } from '../../utils/constants';
import {
  COMPAGNIES_OPTIONS,
  SECTIONS_OPTIONS,
} from '../../data/etudiantOptions';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABEL, getCanonicalRole, getPermissions } from '../../utils/userRole';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { formatApiError, humanizeError } from '../../utils/apiErrors';
import { exportEtudiantsExcel, exportEtudiantsPdf } from '../../utils/etudiantsListExport';
import { APP_NAME } from '../../data/institution';
import { IMPORTED_ELEVES_CHANGED } from '../../utils/importedElevesStore';

const EMPTY_FILTERS = {
  q: '',
  departement: '',
  annee: '',
  compagnie: '',
  section: '',
};

export default function ListeEleves() {
  const { fonction } = useAuth();
  const role = getCanonicalRole(fonction);
  const perms = getPermissions(role);
  const confirm = useConfirm();
  const toast = useToast();

  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
  const [key, setKey] = useState(0);

  useEffect(() => {
    const refresh = () => setKey((k) => k + 1);
    window.addEventListener(IMPORTED_ELEVES_CHANGED, refresh);
    return () => window.removeEventListener(IMPORTED_ELEVES_CHANGED, refresh);
  }, []);

  const { data, loading, error } = useFetch(() => eleveService.list(filters), [filters, key]);
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
        setKey((k) => k + 1);
      } catch (err) {
        console.error(err);
        toast.error(formatApiError(err));
      }
    },
    [confirm, toast],
  );

  const handleUpdate = async (values) => {
    const studentId = editing?.id ?? values?.id;
    if (!studentId) {
      throw new Error('Impossible d’enregistrer : dossier étudiant sans identifiant.');
    }
    try {
      const updated = await eleveService.update(studentId, values);
      setEditing(null);
      setKey((k) => k + 1);
      if (ficheEleveData && ficheEleveData.id === studentId) {
        setFicheEleveData(updated);
      }
      toast.success('Dossier enregistré.');
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      throw error;
    }
  };

  const filteredRows = useMemo(() => {
    const list = data ?? [];
    return list.filter((e) => {
      if (filters.compagnie && e.dossierMilitaire?.compagnie !== filters.compagnie) return false;
      if (filters.section && e.dossierMilitaire?.section !== filters.section) return false;
      return true;
    });
  }, [data, filters.compagnie, filters.section]);

  const departementOptions = [
    { value: '', label: 'Tous les départements' },
    ...DEPARTEMENTS,
  ];

  const anneeOptions = [
    { value: '', label: 'Toutes les années' },
    ...NIVEAUX_SCOLARITE.map((x) => ({ value: x, label: x })),
  ];

  const compagnieFilterOptions = [
    { value: '', label: 'Toutes les compagnies' },
    ...COMPAGNIES_OPTIONS.filter((o) => o.value),
  ];

  const sectionFilterOptions = [
    { value: '', label: 'Toutes les sections' },
    ...SECTIONS_OPTIONS.filter((o) => o.value),
  ];

  const columns = useMemo(() => buildDataTableColumns(visibleIds), [visibleIds]);

  const hasActiveFilters = useMemo(
    () => Object.entries(filters).some(([, v]) => String(v ?? '').trim() !== ''),
    [filters],
  );

  const openExport = () => {
    if (!filteredRows.length) {
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
    if (!filteredRows.length || !visibleIds.length) return;
    const meta = {
      filenameBase: 'liste-etudiants-esp',
      title: `Liste des étudiants — ${APP_NAME}`,
    };
    try {
      setExportBusy(format);
      if (format === 'xlsx') {
        await exportEtudiantsExcel(filteredRows, visibleIds, meta.filenameBase);
      } else {
        await exportEtudiantsPdf(filteredRows, visibleIds, meta);
      }
      toast.success(format === 'xlsx' ? 'Export Excel téléchargé.' : 'Export PDF téléchargé.');
      setExportOpen(false);
    } catch (err) {
      toast.error(humanizeError(err));
    } finally {
      setExportBusy(null);
    }
  };

  const ficheDisplay = ficheEleveData ?? ficheEleve;

  if (ficheEleve?.id) {
    return (
      <div className="flex min-h-[min(100vh,900px)] w-[calc(100%+2rem)] max-w-none -mx-4 flex-col md:-mx-8 md:w-[calc(100%+4rem)] lg:-mx-10 lg:w-[calc(100%+5rem)]">
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
    <div className="grid min-w-0 max-w-full grid-cols-1 gap-7 overflow-x-hidden md:gap-8 xl:grid-cols-12 xl:gap-x-8">
      <nav className="xl:col-span-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-light-gray bg-white px-3 py-1.5 text-sm text-text-light shadow-sm">
          <Link to="/dashboard" className="font-medium transition hover:text-navy">
            Accueil
          </Link>
          <span>/</span>
          <span className="font-semibold text-navy">Gestion des élèves</span>
        </div>
      </nav>

      <div className="page-header xl:col-span-12">
        <div className="min-w-0 flex-1">
          <h1 className="page-title">Gestion des élèves</h1>
          <p className="mt-1 text-sm text-text-light md:text-base">
            Connecté en tant que <strong className="text-navy">{ROLE_LABEL[role]}</strong>
            {!perms.canCreateStudent ? (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200">
                <ShieldAlert size={12} aria-hidden />
                Lecture seule
              </span>
            ) : null}
          </p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-flow-col sm:auto-cols-max sm:items-center">
          {perms.canCreateMobilite ? (
            <Link
              to="/eleves/mobilite"
              className="btn btn-secondary btn-lg w-full justify-center inline-flex items-center gap-2 sm:w-auto"
              title="Liste des étudiants en mobilité et ajout de mobilité"
            >
              <Globe size={18} aria-hidden />
              <span>Mobilité (DD / Échange)</span>
            </Link>
          ) : null}

          {perms.canCreateUserRoles.length > 0 ? (
            <Link
              to="/utilisateurs/nouveau"
              className="btn btn-secondary btn-lg w-full justify-center inline-flex items-center gap-2 sm:w-auto"
              title="Créer un nouvel utilisateur (rôle)"
            >
              <UserPlus size={18} aria-hidden />
              <span>Nouvel utilisateur</span>
            </Link>
          ) : null}

          {perms.canCreateStudent ? (
            <Link
              to="/eleves/nouveau"
              className="btn btn-primary btn-lg w-full justify-center inline-flex items-center gap-2 sm:w-auto"
            >
              <Plus size={18} aria-hidden />
              <span>Nouvel étudiant</span>
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="btn btn-primary btn-lg w-full justify-center inline-flex cursor-not-allowed items-center gap-2 opacity-60 sm:w-auto"
              title="Votre rôle ne permet pas la création"
            >
              <Plus size={18} aria-hidden />
              <span>Nouvel étudiant</span>
            </button>
          )}
        </div>
      </div>

      <StickyFilterBar>
        <Card
          title="Filtres"
          subtitle="Recherche, département, année, compagnie et section"
          className="border-0 shadow-none"
          accent="navy"
          bodyClassName="!pt-4"
          actions={
            <span className="text-text-muted dark:text-slate-500 inline-flex items-center gap-1 text-sm font-semibold">
              <Filter size={14} /> {loading ? 'Chargement…' : 'Prêt'}
            </span>
          }
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
            <div className="relative min-w-0 flex-1 lg:min-w-[220px]">
              <span className="label">Recherche</span>
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-text-muted"
                />
                <input
                  type="text"
                  placeholder="Nom, prénom, matricule…"
                  className="input border-slate-200 bg-white pl-9 shadow-sm"
                  value={filters.q}
                  onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                  aria-label="Recherche par nom, prénom ou matricule"
                />
              </div>
            </div>
            <div className="w-full min-w-0 sm:min-w-[220px] sm:max-w-md lg:w-[min(100%,260px)]">
              <SelectField
                label="Département"
                value={filters.departement}
                onChange={(v) => setFilters({ ...filters, departement: v })}
                options={departementOptions}
                id="filter-departement"
              />
            </div>
            <div className="w-full min-w-0 sm:min-w-[180px] sm:max-w-sm lg:w-[min(100%,200px)]">
              <SelectField
                label="Année (niveau)"
                value={filters.annee}
                onChange={(v) => setFilters({ ...filters, annee: v })}
                options={anneeOptions}
                id="filter-annee"
              />
            </div>
            <div className="w-full min-w-0 sm:min-w-[200px] sm:max-w-sm lg:w-[min(100%,220px)]">
              <SelectField
                label="Compagnie"
                value={filters.compagnie}
                onChange={(v) => setFilters({ ...filters, compagnie: v })}
                options={compagnieFilterOptions}
                id="filter-compagnie"
              />
            </div>
            <div className="w-full min-w-0 sm:min-w-[180px] sm:max-w-sm lg:w-[min(100%,200px)]">
              <SelectField
                label="Section"
                value={filters.section}
                onChange={(v) => setFilters({ ...filters, section: v })}
                options={sectionFilterOptions}
                id="filter-section"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:ml-auto">
            {hasActiveFilters ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon={RotateCcw}
                onClick={() => setFilters({ ...EMPTY_FILTERS })}
              >
                Réinitialiser
              </Button>
            ) : null}
          </div>
        </Card>
      </StickyFilterBar>

      {error ? (
        <div className="xl:col-span-12 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-900">
          <p className="font-semibold">Impossible de charger la liste des étudiants.</p>
          <p className="mt-1">{formatApiError(error)}</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3"
            icon={RefreshCw}
            onClick={() => setKey((k) => k + 1)}
          >
            Réessayer
          </Button>
        </div>
      ) : null}

      <Card className="xl:col-span-12" accent="gold">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-light-gray pb-3">
          <p className="text-sm text-slate-500">
            {loading
              ? 'Chargement…'
              : `${filteredRows.length} étudiant${filteredRows.length > 1 ? 's' : ''} · cliquez sur une ligne pour ouvrir le dossier`}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <ColonnesEtudiantsPicker
              visibleIds={visibleIds}
              onToggle={toggle}
              onReset={reset}
              onSelectAll={selectAll}
            />
            <Link
              to="/eleves/import"
              className="inline-flex items-center gap-1.5 rounded-lg border border-light-gray bg-white px-3 py-2 text-sm font-semibold text-navy shadow-sm transition hover:bg-slate-50"
            >
              <Upload size={18} aria-hidden />
              Importer
            </Link>
            <button
              type="button"
              onClick={openExport}
              disabled={loading || !filteredRows.length}
              className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileDown size={18} aria-hidden />
              Exporter
            </button>
            <Link
              to="/eleves/export"
              className="inline-flex items-center gap-1.5 rounded-lg border border-navy/20 bg-white px-3 py-2 text-xs font-semibold text-navy transition hover:bg-navy/5"
              title="Export avancé avec sélection par cases"
            >
              Export avancé
            </Link>
          </div>
        </div>
        {loading ? (
          <div className="py-16 text-center text-sm text-slate-500">Chargement des étudiants…</div>
        ) : (
          <DataTable
            columns={columns}
            rows={filteredRows}
            pageSize={12}
            onRowClick={openFiche}
            mobileColumnOrder={MOBILE_LIST_COLUMN_ORDER}
            dualHorizontalScroll
            stickyHeader
            empty="Aucun étudiant ne correspond aux filtres."
          />
        )}
      </Card>

      <ExportModal
        open={exportOpen}
        onClose={() => !exportBusy && setExportOpen(false)}
        title="Exporter la liste filtrée"
        subtitle={`${filteredRows.length} étudiant(s) · ${visibleIds.length} colonne(s)`}
        studentCount={filteredRows.length}
        columnCount={visibleIds.length}
        busy={exportBusy}
        onExportExcel={() => runExport('xlsx')}
        onExportPdf={() => runExport('pdf')}
      />
    </div>
  );
}
