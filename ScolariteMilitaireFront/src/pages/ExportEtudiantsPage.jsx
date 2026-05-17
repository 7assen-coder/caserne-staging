import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileDown, FileSpreadsheet, Search } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import DataTable from '../components/common/DataTable';
import SelectField from '../components/common/SelectField';
import ColonnesEtudiantsPicker from '../components/eleves/ColonnesEtudiantsPicker';
import { useFetch } from '../hooks/useFetch';
import { useEtudiantColonnes } from '../hooks/useEtudiantColonnes';
import { eleveService } from '../services/eleveService';
import { DEPARTEMENTS, NIVEAUX_SCOLARITE } from '../utils/constants';
import { buildDataTableColumns } from '../utils/etudiantColonnesTable';
import { exportEtudiantsExcel, exportEtudiantsPdf } from '../utils/etudiantsListExport';
import { APP_NAME } from '../data/institution';

export default function ExportEtudiantsPage() {
  const [filters, setFilters] = useState({
    q: '',
    departement: '',
    annee: '',
  });
  const [selectedIds, setSelectedIds] = useState([]);
  const [busy, setBusy] = useState(null);
  const { visibleIds, toggle, reset, selectAll } = useEtudiantColonnes();

  const { data, loading } = useFetch(() => eleveService.list(filters), [filters]);
  const rows = data ?? [];

  useEffect(() => {
    setSelectedIds([]);
  }, [filters.q, filters.departement, filters.annee]);

  const toggleRowSelect = useCallback((id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const togglePageSelect = useCallback((pageIds, checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      pageIds.forEach((pid) => {
        if (checked) next.add(pid);
        else next.delete(pid);
      });
      return [...next];
    });
  }, []);

  const selectedRows = useMemo(
    () => rows.filter((r) => selectedIds.includes(r.id)),
    [rows, selectedIds],
  );

  const tableColumns = useMemo(() => buildDataTableColumns(visibleIds), [visibleIds]);

  const departementOptions = [
    { value: '', label: 'Tous les départements' },
    ...DEPARTEMENTS,
  ];

  const anneeOptions = [
    { value: '', label: 'Toutes les années' },
    ...NIVEAUX_SCOLARITE.map((x) => ({ value: x, label: x })),
  ];

  async function runExport(format) {
    if (!selectedRows.length) {
      window.alert('Sélectionnez au moins un étudiant (cases à cocher), ou utilisez « Tout sélectionner ».');
      return;
    }
    if (!visibleIds.length) {
      window.alert('Sélectionnez au moins une colonne via le bouton « Colonnes ».');
      return;
    }
    const meta = {
      filenameBase: 'liste-etudiants-esp',
      title: `Liste des étudiants — ${APP_NAME}`,
    };
    try {
      setBusy(format);
      if (format === 'xlsx') {
        await exportEtudiantsExcel(selectedRows, visibleIds, meta.filenameBase);
      } else {
        await exportEtudiantsPdf(selectedRows, visibleIds, meta);
      }
    } catch (e) {
      console.error(e);
      window.alert(e?.message ?? 'Erreur lors de l’export.');
    } finally {
      setBusy(null);
    }
  }

  const exportDisabled = !!busy || !selectedRows.length;

  return (
    <div className="grid grid-cols-1 gap-6 md:gap-8 xl:grid-cols-12 xl:gap-x-8">
      <nav className="text-base text-text-light xl:col-span-12">
        <Link to="/dashboard" className="hover:text-navy">
          Accueil
        </Link>
        <span className="mx-2">/</span>
        <Link to="/eleves" className="hover:text-navy">
          Étudiants
        </Link>
        <span className="mx-2">/</span>
        <span className="text-navy font-semibold">Exporter</span>
      </nav>

      <div className="xl:col-span-12">
        <Link
          to="/eleves"
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-navy hover:text-navy/80"
        >
          <ArrowLeft size={18} aria-hidden />
          Retour à la liste
        </Link>
        <h1 className="page-title">Exporter les étudiants</h1>
        <p className="page-subtitle mt-2 max-w-3xl">
          Choisissez les colonnes, sélectionnez les étudiants, puis exportez en Excel ou PDF via{' '}
          <strong>{APP_NAME}</strong>.
        </p>
      </div>

      <Card
        title="Filtres"
        subtitle="Recherche nominative ou par matricule, département, année (niveau)"
        className="xl:col-span-12"
        actions={
          <span className="text-text-muted inline-flex items-center gap-1 text-sm">
            {loading ? 'Chargement…' : `${rows.length} résultat(s)`}
          </span>
        }
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="relative min-w-0 flex-1 lg:min-w-[240px]">
            <span className="label">Recherche</span>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Nom, prénom, matricule…"
                className="input pl-9"
                value={filters.q}
                onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              />
            </div>
          </div>
          <div className="w-full min-w-0 sm:min-w-[260px] sm:max-w-md lg:w-[min(100%,320px)]">
            <SelectField
              label="Département"
              value={filters.departement}
              onChange={(v) => setFilters({ ...filters, departement: v })}
              options={departementOptions}
              id="export-filter-dep"
            />
          </div>
          <div className="w-full min-w-0 sm:min-w-[220px] sm:max-w-md lg:w-[min(100%,280px)]">
            <SelectField
              label="Année (niveau)"
              value={filters.annee}
              onChange={(v) => setFilters({ ...filters, annee: v })}
              options={anneeOptions}
              id="export-filter-annee"
            />
          </div>
        </div>
      </Card>

      <Card className="xl:col-span-12 !overflow-visible">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-light-gray pb-3">
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-navy">{selectedIds.length}</span> étudiant(s)
            sélectionné(s)
            {' · '}
            <span className="font-semibold text-navy">{visibleIds.length}</span> colonne(s)
            {' · '}
            <span>{rows.length}</span> dans les filtres
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <ColonnesEtudiantsPicker
              visibleIds={visibleIds}
              onToggle={toggle}
              onReset={reset}
              onSelectAll={selectAll}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!rows.length}
              onClick={() => setSelectedIds(rows.map((r) => r.id))}
            >
              Tout sélectionner
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
              Tout désélectionner
            </Button>
          </div>
        </div>

        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-navy/15 bg-navy-50/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-700">
            Export des <strong>{visibleIds.length} colonnes</strong> affichées pour{' '}
            <strong>{selectedIds.length || '…'}</strong> étudiant(s) sélectionné(s).
          </p>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              type="button"
              variant="primary"
              disabled={exportDisabled}
              onClick={() => runExport('xlsx')}
            >
              <FileSpreadsheet size={18} className="mr-1.5" aria-hidden />
              {busy === 'xlsx' ? 'Export…' : 'Exporter Excel'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={exportDisabled}
              onClick={() => runExport('pdf')}
            >
              <FileDown size={18} className="mr-1.5" aria-hidden />
              {busy === 'pdf' ? 'Export…' : 'Exporter PDF'}
            </Button>
          </div>
        </div>

        <DataTable
          columns={tableColumns}
          rows={rows}
          pageSize={12}
          selection={{
            selectedIds,
            onToggleRow: toggleRowSelect,
            onTogglePage: togglePageSelect,
          }}
        />
      </Card>
    </div>
  );
}
