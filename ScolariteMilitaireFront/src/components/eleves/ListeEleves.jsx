import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Plus,
  Pencil,
  Filter,
  Eye,
  Trash2,
  Upload,
  FileDown,
} from 'lucide-react';
import Card from '../common/Card';
import DataTable from '../common/DataTable';
import FullScreenLayer from '../common/FullScreenLayer';
import SelectField from '../common/SelectField';
import FormulaireEleve from './FormulaireEleve';
import { useFetch } from '../../hooks/useFetch';
import { eleveService } from '../../services/eleveService';
import { FILIERES, NIVEAUX_SCOLARITE } from '../../utils/constants';

export default function ListeEleves() {
  const [filters, setFilters] = useState({
    q: '',
    departement: '',
    annee: '',
  });
  const [key, setKey] = useState(0);
  const { data, loading } = useFetch(() => eleveService.list(filters), [filters, key]);
  const [ficheEleve, setFicheEleve] = useState(null);
  const [selectedEleveId, setSelectedEleveId] = useState(null);
  const [editing, setEditing] = useState(null);
  const ficheResolu = useMemo(() => {
    if (!ficheEleve?.id) return null;
    return data?.find((e) => e.id === ficheEleve.id) ?? ficheEleve;
  }, [ficheEleve, data]);
  const selectedEleve = useMemo(
    () => (selectedEleveId ? (data ?? []).find((e) => e.id === selectedEleveId) ?? null : null),
    [selectedEleveId, data],
  );
  const rows = data ?? [];

  const departementOptions = [
    { value: '', label: 'Tous les départements' },
    ...FILIERES.map((f) => ({ value: f, label: f })),
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

  if (ficheResolu) {
    return (
      <div className="flex min-h-[min(100vh,900px)] w-[calc(100%+2rem)] max-w-none -mx-4 flex-col md:-mx-8 md:w-[calc(100%+4rem)] lg:-mx-10 lg:w-[calc(100%+5rem)]">
        <EleveFicheView
          eleve={ficheResolu}
          onBack={() => {
            setFicheEleve(null);
            setEditing(null);
          }}
          onEditDossier={() => setEditing(ficheResolu)}
        />
        {editing && (
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
              onSubmit={async (values) => {
                await eleveService.update(editing.id, values);
                setEditing(null);
                setKey((k) => k + 1);
              }}
              onCancel={() => setEditing(null)}
            />
          </FullScreenLayer>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:gap-10 xl:grid-cols-12 xl:gap-x-8">
      <nav className="text-base text-text-light xl:col-span-12">
        <Link to="/dashboard" className="hover:text-navy">
          Accueil
        </Link>
        <span className="mx-2">/</span>
        <span className="text-navy font-semibold">Étudiants</span>
      </nav>

      <div className="page-header xl:col-span-12">
        <div className="min-w-0 flex-1">
          <h1 className="page-title">Gestion des étudiants</h1>
        </div>
        <Link
          to="/eleves/nouveau"
          className="btn btn-primary btn-lg shrink-0 inline-flex items-center gap-2"
        >
          <Plus size={18} aria-hidden />
          <span>Nouvel étudiant</span>
        </Link>
      </div>

      <Card
        title="Filtres"
        subtitle="Département, année (niveau), recherche nominative"
        className="xl:col-span-12"
        actions={
          <span className="text-text-muted dark:text-slate-500 inline-flex items-center gap-1 text-sm">
            <Filter size={14} /> {loading ? 'Chargement…' : 'Prêt'}
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
                aria-label="Recherche par nom, prénom ou matricule"
              />
            </div>
          </div>
          <div className="w-full min-w-0 sm:min-w-[260px] sm:max-w-md lg:w-[min(100%,320px)]">
            <SelectField
              label="Département"
              value={filters.departement}
              onChange={(v) => setFilters({ ...filters, departement: v })}
              options={departementOptions}
              id="filter-departement"
            />
          </div>
          <div className="w-full min-w-0 sm:min-w-[220px] sm:max-w-md lg:w-[min(100%,280px)]">
            <SelectField
              label="Année (niveau)"
              value={filters.annee}
              onChange={(v) => setFilters({ ...filters, annee: v })}
              options={anneeOptions}
              id="filter-annee"
            />
          </div>
        </div>
      </Card>

      <Card className="xl:col-span-12">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-light-gray pb-3">
          <div className="text-sm text-slate-500">
            {selectedEleve
              ? `${selectedEleve.prenom} ${selectedEleve.nom} sélectionné`
              : 'Sélectionnez un étudiant dans le tableau'}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/eleves/import"
              className="inline-flex items-center gap-1.5 rounded-lg border border-light-gray bg-white px-3 py-2 text-sm font-semibold text-navy shadow-sm transition hover:bg-slate-50"
            >
              <Upload size={18} aria-hidden />
              Importer
            </Link>
            <Link
              to="/eleves/export"
              className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-navy/90"
            >
              <FileDown size={18} aria-hidden />
              Exporter
            </Link>
            {selectedEleve && (
              <>
                <button
                  type="button"
                  onClick={() => setFicheEleve(selectedEleve)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
                  title="Voir le détail"
                  aria-label="Voir le détail"
                >
                  <Eye size={18} />
                  Détail
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(selectedEleve)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
                  title="Modifier"
                  aria-label="Modifier"
                >
                  <Pencil size={18} />
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = window.confirm(`Supprimer ${selectedEleve.prenom} ${selectedEleve.nom} ?`);
                    if (!ok) return;
                    await eleveService.delete(selectedEleve.id);
                    setSelectedEleveId(null);
                    setKey((k) => k + 1);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                  title="Supprimer"
                  aria-label="Supprimer"
                >
                  <Trash2 size={18} />
                  Supprimer
                </button>
              </>
            )}
          </div>
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          pageSize={12}
          onRowClick={(row) => setSelectedEleveId(row.id)}
        />
      </Card>

      {editing && (
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
            onSubmit={async (values) => {
              await eleveService.update(editing.id, values);
              setEditing(null);
              setKey((k) => k + 1);
            }}
            onCancel={() => setEditing(null)}
          />
        </FullScreenLayer>
      )}
    </div>
  );
}
