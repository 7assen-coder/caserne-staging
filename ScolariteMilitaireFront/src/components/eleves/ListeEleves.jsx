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
  Globe,
  UserPlus,
  ShieldAlert,
} from 'lucide-react';
import Card from '../common/Card';
import DataTable from '../common/DataTable';
import FullScreenLayer from '../common/FullScreenLayer';
import SelectField from '../common/SelectField';
import FormulaireEleve from './FormulaireEleve';
import EleveFicheView from './EleveFicheView';
import { useFetch } from '../../hooks/useFetch';
import { eleveService } from '../../services/eleveService';
import { FILIERES, NIVEAUX_SCOLARITE } from '../../utils/constants';
import {
  COMPAGNIES_OPTIONS,
  SECTIONS_OPTIONS,
} from '../../data/etudiantOptions';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABEL, getCanonicalRole, getPermissions } from '../../utils/userRole';

export default function ListeEleves() {
  const { fonction } = useAuth();
  const role = getCanonicalRole(fonction);
  const perms = getPermissions(role);

  const [filters, setFilters] = useState({
    q: '',
    departement: '',
    annee: '',
    compagnie: '',
    section: '',
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
    ...FILIERES.map((f) => ({ value: f, label: f })),
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
    {
      key: 'compagnie',
      label: 'Compagnie',
      sortable: true,
      accessor: (r) => r.dossierMilitaire?.compagnie ?? '',
      render: (r) => <span className="text-slate-900">{r.dossierMilitaire?.compagnie || '—'}</span>,
    },
    {
      key: 'section',
      label: 'Section',
      sortable: true,
      accessor: (r) => r.dossierMilitaire?.section ?? '',
      render: (r) => <span className="text-slate-900">{r.dossierMilitaire?.section || '—'}</span>,
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
          onEditDossier={() => perms.canEditStudent && setEditing(ficheResolu)}
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

      <Card
        title="Filtres"
        subtitle="Recherche, département, année, compagnie et section"
        className="xl:col-span-12"
        actions={
          <span className="text-text-muted dark:text-slate-500 inline-flex items-center gap-1 text-sm">
            <Filter size={14} /> {loading ? 'Chargement…' : 'Prêt'}
          </span>
        }
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="relative min-w-0 flex-1 lg:min-w-[220px]">
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
                {perms.canEditStudent ? (
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
                ) : null}
                {perms.canDeleteStudent ? (
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
                ) : null}
              </>
            )}
          </div>
        </div>
        <DataTable
          columns={columns}
          rows={filteredRows}
          pageSize={12}
          onRowClick={(row) => setSelectedEleveId(row.id)}
        />
      </Card>

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
