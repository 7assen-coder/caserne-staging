import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Pencil, Filter, Eye, Trash2, FileSpreadsheet } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import DataTable from '../common/DataTable';
import FullScreenLayer from '../common/FullScreenLayer';
import SelectField from '../common/SelectField';
import FormulaireEleve from './FormulaireEleve';
import EleveFicheView from './EleveFicheView';
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
  const [ficheEleveData, setFicheEleveData] = useState(null);
  const [ficheLoading, setFicheLoading] = useState(false);
  const [selectedEleveId, setSelectedEleveId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [createContext, setCreateContext] = useState({ eleveId: null });
  const createEleveIdRef = useRef(null);
  const createFlowRef = useRef({
    eleveId: null,
    dossierAcademiqueId: null,
    documentsId: null,
    contactsParentsId: null,
    dossierSanteId: null,
    dossierMilitaireId: null,
    hebergementId: null,
  });

  const ficheResolu = useMemo(() => ficheEleveData, [ficheEleveData]);
  const selectedEleve = useMemo(
    () => (selectedEleveId ? (data ?? []).find((e) => e.id === selectedEleveId) ?? null : null),
    [selectedEleveId, data],
  );
  const rows = data ?? [];

  const n = rows.length;

  const handleExportXlsx = async () => {
    if (!rows.length) return;
    const XLSX = await import('xlsx');
    const exportRows = rows.map((e) => ({
      id: e.id,
      matricule: e.matricule ?? '',
      prenom: e.prenom ?? '',
      nom_famille: e.nom ?? '',
      sexe: e.sexe ?? '',
      nni: e.nni ?? '',
      num_bac: e.numeroBac ?? '',
      date_naissance: e.dateNaissance ?? '',
      lieu_naissance: e.lieuNaissance ?? '',
      nationalite: e.nationalite ?? '',
      categorie_bac: e.categorieBac ?? '',
      serie_bac: e.serieBac ?? '',
      moyenne_bac: e.moyenneBac ?? '',
      ecole_bac: e.ecoleBac ?? '',
      annee_premiere_inscription: e.anneePremiereInscription ?? '',
      date_premiere_inscription: e.datePremiereInscription ?? '',
      voie_acces: e.voieAcces ?? '',
      diplome_acces: e.diplomeAcces ?? '',
      etablissement_diplome: e.etablissementDiplome ?? '',
      adresse_primaire: e.adressePrimaire ?? '',
      adresse_secondaire: e.adresseSecondaire ?? '',
      resident_avec_parents: e.residentAvecParents ?? '',
      compte_bankily: e.compteBankily ?? '',
      email_pro: e.emailPro ?? '',
      email_perso: e.emailPerso ?? '',
      tel1: e.tel1 ?? '',
      tel2_whatsapp: e.tel2Whatsapp ?? '',
      facebook: e.facebook ?? '',
      linkedin: e.linkedin ?? '',
    }));
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Etudiants');
    XLSX.writeFile(wb, `etudiants-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

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

  if (ficheEleve?.id) {
    return (
      <div className="flex min-h-[min(100vh,900px)] w-[calc(100%+2rem)] max-w-none -mx-4 flex-col md:-mx-8 md:w-[calc(100%+4rem)] lg:-mx-10 lg:w-[calc(100%+5rem)]">
        <EleveFicheView
          eleve={ficheResolu ?? selectedEleve ?? ficheEleve}
          loading={ficheLoading}
          onBack={() => {
            setFicheEleve(null);
            setFicheEleveData(null);
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
            contentClassName="p-5 sm:p-6"
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
    <div className="grid grid-cols-1 gap-7 md:gap-8 xl:grid-cols-12 xl:gap-x-8">
      <nav className="xl:col-span-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-light-gray bg-white px-3 py-1.5 text-sm text-text-light shadow-sm">
          <Link to="/dashboard" className="font-medium transition hover:text-navy">
            Accueil
          </Link>
          <span>/</span>
          <span className="font-semibold text-navy">Étudiants</span>
        </div>
      </nav>

      <div className="page-header xl:col-span-12">
        <div className="min-w-0 flex-1">
          <h1 className="page-title">Gestion des étudiants</h1>
          <p className="mt-2 text-base text-text-light">
            Suivi des dossiers, recherche rapide et actions administratives.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-navy-100 bg-navy-50 px-3 py-1 text-xs font-semibold text-navy">
              Total: {n} étudiant{n > 1 ? 's' : ''}
            </span>
            <span className="inline-flex items-center rounded-full border border-light-gray bg-white px-3 py-1 text-xs font-semibold text-slate-700">
              Département: {filters.departement || 'Tous'}
            </span>
            <span className="inline-flex items-center rounded-full border border-light-gray bg-white px-3 py-1 text-xs font-semibold text-slate-700">
              Niveau: {filters.annee || 'Tous'}
            </span>
          </div>
        </div>
        <Button
          variant="primary"
          size="lg"
          icon={Plus}
          onClick={() => {
            createEleveIdRef.current = null;
            setCreateContext({ eleveId: null });
            createFlowRef.current = {
              eleveId: null,
              dossierAcademiqueId: null,
              documentsId: null,
              contactsParentsId: null,
              dossierSanteId: null,
              dossierMilitaireId: null,
              hebergementId: null,
            };
            setCreating(true);
          }}
          className="shrink-0"
        >
          Nouvel étudiant
        </Button>
      </div>

      <Card
        title="Filtres"
        subtitle="Département, année (niveau), recherche nominative"
        className="xl:col-span-12"
        accent="navy"
        bodyClassName="!pt-4"
        actions={
          <span className="text-text-muted dark:text-slate-500 inline-flex items-center gap-1 text-sm font-semibold">
            <Filter size={14} /> {loading ? 'Chargement…' : 'Prêt'}
          </span>
        }
      >
        <div className="rounded-2xl border border-light-gray bg-slate-50/70 p-4 md:p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="relative min-w-0 flex-1 lg:min-w-[240px]">
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
        </div>
      </Card>

      <Card className="xl:col-span-12" accent="gold">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-light-gray pb-3">
          <div className="inline-flex items-center rounded-full border border-light-gray bg-white px-3 py-1 text-sm text-slate-600">
            {selectedEleve ? `${selectedEleve.prenom} ${selectedEleve.nom} sélectionné` : 'Sélectionnez un étudiant'}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportXlsx}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
              title="Exporter Excel"
              aria-label="Exporter Excel"
            >
              <FileSpreadsheet size={18} />
              Export Excel (.xlsx)
            </button>
            {selectedEleve && (
              <>
                <button
                  type="button"
                  onClick={async () => {
                    setFicheEleve({ id: selectedEleve.id });
                    setFicheLoading(true);
                    try {
                      const fullEleve = await eleveService.get(selectedEleve.id);
                      setFicheEleveData(fullEleve);
                    } finally {
                      setFicheLoading(false);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
                  title="Voir le détail"
                  aria-label="Voir le détail"
                >
                  <Eye size={18} />
                  Détail
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(selectedEleve)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
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
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
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
        <div className="overflow-hidden rounded-2xl border border-light-gray bg-white">
          <DataTable
            columns={columns}
            rows={rows}
            pageSize={12}
            onRowClick={(row) => setSelectedEleveId(row.id)}
          />
        </div>
      </Card>

      {editing && (
        <FullScreenLayer
          open
          onClose={() => setEditing(null)}
          title="Modifier le dossier"
          subtitle="Mise à jour des informations — formulaire multi-étapes"
          chrome
          contentClassName="p-5 sm:p-6"
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

      <FullScreenLayer
        open={creating}
        onClose={() => {
          setCreating(false);
          createEleveIdRef.current = null;
          setCreateContext({ eleveId: null });
          createFlowRef.current = {
            eleveId: null,
            dossierAcademiqueId: null,
            documentsId: null,
            contactsParentsId: null,
            dossierSanteId: null,
            dossierMilitaireId: null,
            hebergementId: null,
          };
        }}
        title="Nouvel étudiant"
        subtitle="Création d’un dossier — formulaire multi-étapes"
        chrome
        contentClassName="p-5 sm:p-6"
      >
        <FormulaireEleve
          onStepSubmit={async (step, values) => {
            const flow = createFlowRef.current;
            if (step === 0) {
              if (flow.eleveId) {
                await eleveService.update(flow.eleveId, values);
              } else {
                const created = await eleveService.createEleve(values);
                flow.eleveId = created.id;
                createEleveIdRef.current = created.id;
                setCreateContext({ eleveId: created.id });
              }
              return;
            }
            const eleveId = flow.eleveId || createEleveIdRef.current || createContext.eleveId;
            if (!eleveId) throw new Error('Création élève non effectuée.');
            if (step === 1) {
              const res = flow.dossierAcademiqueId
                ? await eleveService.updateDossierAcademique(flow.dossierAcademiqueId, eleveId, values)
                : await eleveService.createDossierAcademique(eleveId, values);
              flow.dossierAcademiqueId = res?.data?.id ?? flow.dossierAcademiqueId;
            }
            if (step === 2) {
              const res = flow.documentsId
                ? await eleveService.updateDocuments(flow.documentsId, eleveId, values)
                : await eleveService.createDocuments(eleveId, values);
              flow.documentsId = res?.data?.id ?? flow.documentsId;
            }
            if (step === 3) {
              const res = flow.contactsParentsId
                ? await eleveService.updateContactsParents(flow.contactsParentsId, eleveId, values)
                : await eleveService.createContactsParents(eleveId, values);
              flow.contactsParentsId = res?.data?.id ?? flow.contactsParentsId;
            }
            if (step === 4) {
              const res = flow.dossierSanteId
                ? await eleveService.updateDossierSante(flow.dossierSanteId, eleveId, values)
                : await eleveService.createDossierSante(eleveId, values);
              flow.dossierSanteId = res?.data?.id ?? flow.dossierSanteId;
            }
            if (step === 5) {
              const res = flow.dossierMilitaireId
                ? await eleveService.updateDossierMilitaire(flow.dossierMilitaireId, eleveId, values)
                : await eleveService.createDossierMilitaire(eleveId, values);
              flow.dossierMilitaireId = res?.data?.id ?? flow.dossierMilitaireId;
            }
            if (step === 6) {
              const res = flow.hebergementId
                ? await eleveService.updateHebergement(flow.hebergementId, eleveId, values)
                : await eleveService.createHebergement(eleveId, values);
              flow.hebergementId = res?.data?.id ?? flow.hebergementId;
            }
          }}
          onSubmit={async () => {
            const flow = createFlowRef.current;
            const eleveId = flow.eleveId || createEleveIdRef.current || createContext.eleveId;
            if (!eleveId) {
              throw new Error('L\'étudiant doit être créé à l\'étape 1');
            }
            setCreating(false);
            createEleveIdRef.current = null;
            setCreateContext({ eleveId: null });
            createFlowRef.current = {
              eleveId: null,
              dossierAcademiqueId: null,
              documentsId: null,
              contactsParentsId: null,
              dossierSanteId: null,
              dossierMilitaireId: null,
              hebergementId: null,
            };
            setKey((k) => k + 1);
          }}
          onCancel={() => {
            setCreating(false);
            createEleveIdRef.current = null;
            setCreateContext({ eleveId: null });
            createFlowRef.current = {
              eleveId: null,
              dossierAcademiqueId: null,
              documentsId: null,
              contactsParentsId: null,
              dossierSanteId: null,
              dossierMilitaireId: null,
              hebergementId: null,
            };
          }}
        />
      </FullScreenLayer>
    </div>
  );
}
