import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import DataTable from '../components/common/DataTable';
import SelectField from '../components/common/SelectField';
import { useFetch } from '../hooks/useFetch';
import { eleveService } from '../services/eleveService';
import { FILIERES, NIVEAUX_SCOLARITE } from '../utils/constants';
import {
  exportEtudiantsExcel,
  exportEtudiantsPdf,
  exportEtudiantsDocx,
} from '../utils/etudiantsListExport';

export default function ExportEtudiantsPage() {
  const [filters, setFilters] = useState({
    q: '',
    departement: '',
    annee: '',
  });
  const [selectedIds, setSelectedIds] = useState([]);
  const [busy, setBusy] = useState(null);

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

  const departementOptions = [
    { value: '', label: 'Tous les départements' },
    ...DEPARTEMENTS,
  ];

  const anneeOptions = [
    { value: '', label: 'Toutes les années' },
    ...NIVEAUX_SCOLARITE.map((x) => ({ value: x, label: x })),
  ];

  const columns = [
    { key: 'matricule', label: 'Matricule', sortable: true },
    {
      key: 'nom',
      label: 'Nom & prénom',
      sortable: true,
      render: (r) => (
        <div>
          <p className="font-medium text-text">
            {r.nom} {r.prenom}
          </p>
          <p className="text-sm text-text-light">{r.sexe === 'F' ? 'Féminin' : 'Masculin'}</p>
        </div>
      ),
    },
    { key: 'filiere', label: 'Département', sortable: true, accessor: (r) => r.scolarite?.filiere ?? '' },
    {
      key: 'niveau',
      label: 'Année (niveau)',
      sortable: true,
      accessor: (r) => r.scolarite?.niveau ?? '',
      render: (r) => <span className="text-slate-900">{r.scolarite?.niveau ?? '—'}</span>,
    },
  ];

  async function runExport(kind) {
    if (!selectedRows.length) {
      window.alert('Sélectionnez au moins un étudiant (cases à cocher), ou utilisez « Tout sélectionner ».');
      return;
    }
    const meta = {
      filenameBase: 'liste-etudiants-esp',
      title: 'Liste des étudiants — Direction de la scolarité',
    };
    try {
      setBusy(kind);
      if (kind === 'xlsx') await exportEtudiantsExcel(selectedRows, meta.filenameBase);
      else if (kind === 'pdf') await exportEtudiantsPdf(selectedRows, meta);
      else if (kind === 'docx') await exportEtudiantsDocx(selectedRows, meta);
    } catch (e) {
      console.error(e);
      window.alert(e?.message ?? 'Erreur lors de l’export.');
    } finally {
      setBusy(null);
    }
  }

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
          Filtrez la liste, sélectionnez les lignes à exporter, puis choisissez PDF, Word ou Excel.
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

      <Card className="xl:col-span-12">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-light-gray pb-3">
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-navy">{selectedIds.length}</span> étudiant(s) sélectionné(s)
            {' · '}
            <span>{rows.length}</span> dans les filtres actuels
          </p>
          <div className="flex flex-wrap gap-2">
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

        <DataTable
          columns={columns}
          rows={rows}
          pageSize={12}
          selection={{
            selectedIds,
            onToggleRow: toggleRowSelect,
            onTogglePage: togglePageSelect,
          }}
        />

        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-light-gray pt-6">
          <span className="mr-2 text-sm font-semibold text-slate-800">Exporter la sélection :</span>
          <Button
            type="button"
            variant="primary"
            disabled={!!busy || !selectedRows.length}
            onClick={() => runExport('xlsx')}
          >
            {busy === 'xlsx' ? '…' : 'Excel (.xlsx)'}
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!!busy || !selectedRows.length}
            onClick={() => runExport('pdf')}
          >
            {busy === 'pdf' ? '…' : 'PDF'}
          </Button>
          <Button
            type="button"
            variant="gold"
            disabled={!!busy || !selectedRows.length}
            onClick={() => runExport('docx')}
          >
            {busy === 'docx' ? '…' : 'Word (.docx)'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
