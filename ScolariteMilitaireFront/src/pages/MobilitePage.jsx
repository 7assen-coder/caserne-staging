import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Globe, Plus, Search, ShieldAlert } from 'lucide-react';
import Card from '../components/common/Card';
import DataTable from '../components/common/DataTable';
import FullScreenLayer from '../components/common/FullScreenLayer';
import Button from '../components/common/Button';
import SelectField from '../components/common/SelectField';
import { eleveService } from '../services/eleveService';
import { useAuth } from '../hooks/useAuth';
import { getPermissions } from '../utils/userRole';
import { formatApiError } from '../utils/apiErrors';
import {
  PARCOURS_MOBILITE_OPTIONS,
} from '../data/etudiantOptions';
import { deriveMobiliteAnneeFin, getAcademicYearOptions } from '../utils/anneeUniversitaire';

const DEFAULT_MOBILITE = {
  type: '',
  etablissement: '',
  specialite: '',
  anneeDebut: '',
  anneeFin: '',
};

function isInMobilite(e) {
  const m = e?.mobilite;
  return Boolean(m && (m.type || m.etablissement || m.specialite));
}

export default function MobilitePage() {
  const { fonction } = useAuth();
  const perms = getPermissions(fonction);

  const [list, setList] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listErr, setListErr] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [openAdd, setOpenAdd] = useState(false);

  useEffect(() => {
    let cancel = false;
    eleveService
      .list()
      .then((rows) => {
        if (!cancel) setList(rows);
      })
      .catch((err) => {
        if (!cancel) setListErr(formatApiError(err));
      })
      .finally(() => {
        if (!cancel) setLoadingList(false);
      });
    return () => {
      cancel = true;
    };
  }, [reloadKey]);

  const enMobilite = useMemo(() => list.filter(isInMobilite), [list]);

  const filteredMobilite = useMemo(() => {
    const term = search.trim().toLowerCase();
    return enMobilite.filter((e) => {
      if (typeFilter && e.mobilite?.type !== typeFilter) return false;
      if (!term) return true;
      return (
        (e.matricule || '').toLowerCase().includes(term)
        || (e.nom || '').toLowerCase().includes(term)
        || (e.prenom || '').toLowerCase().includes(term)
        || (e.mobilite?.etablissement || '').toLowerCase().includes(term)
        || (e.mobilite?.specialite || '').toLowerCase().includes(term)
      );
    });
  }, [enMobilite, search, typeFilter]);

  const typeFilterOptions = [
    { value: '', label: 'Tous les types' },
    { value: 'Double diplôme', label: 'Double diplôme (DD)' },
    { value: 'Semestre d’échange', label: 'Semestre d’échange (SE)' },
  ];

  const columns = [
    { key: 'matricule', label: 'Matricule', sortable: true },
    {
      key: 'nom',
      label: 'Nom & prénom',
      sortable: true,
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-text">
            {r.nom} {r.prenom}
          </p>
          <p className="truncate text-xs text-text-light">{r.scolarite?.filiere || '—'}</p>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      accessor: (r) => r.mobilite?.type || '',
      render: (r) => {
        const t = r.mobilite?.type || '—';
        const isDD = t === 'Double diplôme';
        return (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ring-1 ${
              isDD
                ? 'bg-amber-50 text-amber-800 ring-amber-200'
                : 'bg-sky-50 text-sky-800 ring-sky-200'
            }`}
          >
            {isDD ? 'DD' : t === 'Semestre d’échange' ? 'SE' : '—'}
          </span>
        );
      },
    },
    {
      key: 'etablissement',
      label: 'Établissement',
      sortable: true,
      accessor: (r) => r.mobilite?.etablissement || '',
      render: (r) => <span className="text-slate-900">{r.mobilite?.etablissement || '—'}</span>,
    },
    {
      key: 'specialite',
      label: 'Spécialité',
      sortable: true,
      accessor: (r) => r.mobilite?.specialite || '',
      render: (r) => <span className="text-slate-900">{r.mobilite?.specialite || '—'}</span>,
    },
  ];

  if (!perms.canCreateMobilite) {
    return (
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <nav className="text-base text-text-light xl:col-span-12">
          <Link to="/dashboard" className="hover:text-navy">
            Accueil
          </Link>
          <span className="mx-2">/</span>
          <span className="text-navy font-semibold">Mobilité</span>
        </nav>
        <div className="xl:col-span-12 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-5 text-amber-900 shadow-sm">
          <h1 className="page-title inline-flex items-center gap-2">
            <ShieldAlert size={26} aria-hidden /> Accès restreint
          </h1>
          <p className="mt-2 text-sm md:text-base">
            Vous n’êtes pas autorisé(e) à consulter ou enregistrer une mobilité.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:gap-8 xl:grid-cols-12 xl:gap-x-8">
      <nav className="text-base text-text-light xl:col-span-12">
        <Link to="/dashboard" className="hover:text-navy">
          Accueil
        </Link>
        <span className="mx-2">/</span>
        <Link to="/eleves/dossiers" className="hover:text-navy">
          Gestion des élèves
        </Link>
        <span className="mx-2">/</span>
        <span className="text-navy font-semibold">Mobilité (DD / Échange)</span>
      </nav>

      <div className="xl:col-span-12">
        <Link
          to="/eleves/dossiers"
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-navy hover:text-navy/80"
        >
          <ArrowLeft size={18} aria-hidden />
          Retour à la liste des étudiants
        </Link>
      </div>

      <div className="page-header xl:col-span-12">
        <div className="min-w-0 flex-1">
          <h1 className="page-title inline-flex items-center gap-2">
            <Globe size={26} aria-hidden /> Mobilité (DD / Échange)
          </h1>
          <p className="mt-1 text-sm text-text-light md:text-base">
            Liste des étudiants actuellement en Double diplôme ou Semestre d’échange.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <Link
            to="/eleves/dossiers"
            className="btn btn-secondary btn-lg w-full justify-center sm:w-auto"
          >
            Retour
          </Link>
          <button
            type="button"
            onClick={() => setOpenAdd(true)}
            className="btn btn-primary btn-lg inline-flex w-full items-center justify-center gap-2 sm:w-auto"
          >
            <Plus size={18} aria-hidden />
            <span>Ajouter une mobilité</span>
          </button>
        </div>
      </div>

      <Card
        title="Filtres"
        subtitle="Recherche, type de mobilité"
        className="xl:col-span-12"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
          <div className="relative min-w-0 flex-1 sm:min-w-[220px]">
            <span className="label">Recherche</span>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Matricule, nom, établissement, spécialité…"
                className="input pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Rechercher dans la liste des étudiants en mobilité"
              />
            </div>
          </div>
          <div className="w-full min-w-0 sm:w-[260px]">
            <SelectField
              label="Type"
              value={typeFilter}
              onChange={setTypeFilter}
              options={typeFilterOptions}
              id="filter-type-mobilite"
            />
          </div>
        </div>
      </Card>

      <Card className="xl:col-span-12">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-light-gray pb-3">
          <div className="text-sm text-slate-500">
            {loadingList
              ? 'Chargement…'
              : `${filteredMobilite.length} étudiant${filteredMobilite.length > 1 ? 's' : ''} en mobilité`}
          </div>
        </div>
        {listErr ? (
          <p className="px-2 py-4 text-sm font-medium text-red-700">{listErr}</p>
        ) : (
          <DataTable columns={columns} rows={filteredMobilite} pageSize={12} />
        )}
      </Card>

      <FullScreenLayer
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        title="Ajouter une mobilité"
        subtitle="Sélectionnez un étudiant existant et complétez ses informations de mobilité."
        chrome
        contentClassName="px-4 pb-8 pt-2 sm:px-6 sm:pb-10 lg:px-8"
      >
        <AjouterMobiliteForm
          students={list}
          onSaved={() => {
            setOpenAdd(false);
            setReloadKey((k) => k + 1);
          }}
          onCancel={() => setOpenAdd(false)}
        />
      </FullScreenLayer>
    </div>
  );
}

function AjouterMobiliteForm({ students, onSaved, onCancel }) {
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [mobilite, setMobilite] = useState(DEFAULT_MOBILITE);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [topErr, setTopErr] = useState('');
  const [success, setSuccess] = useState('');

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return students;
    return students.filter(
      (e) =>
        (e.matricule || '').toLowerCase().includes(term)
        || (e.nom || '').toLowerCase().includes(term)
        || (e.prenom || '').toLowerCase().includes(term),
    );
  }, [students, q]);

  const selected = useMemo(
    () => students.find((e) => e.id === selectedId) ?? null,
    [students, selectedId],
  );

  const anneeOptions = useMemo(
    () => [{ value: '', label: '— Sélectionner —' }, ...getAcademicYearOptions()],
    [],
  );

  const updateMobilite = (key, value) => {
    setMobilite((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const mobiliteAnneeFinAffichee = useMemo(
    () => deriveMobiliteAnneeFin(mobilite.anneeDebut, mobilite.type),
    [mobilite.anneeDebut, mobilite.type],
  );

  const validate = () => {
    const e = {};
    if (!mobilite.type) e.type = 'Sélectionner SE ou DD.';
    if (!mobilite.etablissement.trim()) e.etablissement = 'Établissement d’accueil obligatoire.';
    if (!mobilite.specialite.trim()) e.specialite = 'Spécialité obligatoire.';
    const ad = String(mobilite.anneeDebut ?? '').trim();
    if (ad && !/^\d{4}-\d{4}$/.test(ad)) {
      e.anneeDebut = 'Format année : AAAA-AAAA (ex. 2025-2026).';
    }
    return e;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    setTopErr('');
    setSuccess('');
    if (!selected) {
      setTopErr('Sélectionnez d’abord un étudiant existant.');
      return;
    }
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      setTopErr(Object.values(e)[0]);
      return;
    }
    setSubmitting(true);
    try {
      const valuesForApi = {
        ...selected,
        statut: selected.statut || 'actif',
        scolarite: { ...(selected.scolarite || {}) },
        mobilite: {
          ...mobilite,
          raison: '',
          anneeFin:
            deriveMobiliteAnneeFin(mobilite.anneeDebut, mobilite.type) || '',
        },
      };
      const existingDossierAcademiqueId =
        selected.dossierAcademiqueId
        || selected.dossier_academique?.id
        || selected.scolarite?.dossierAcademiqueId
        || null;

      if (existingDossierAcademiqueId) {
        await eleveService.updateDossierAcademique(existingDossierAcademiqueId, selected.id, valuesForApi);
      } else {
        await eleveService.createDossierAcademique(selected.id, valuesForApi);
      }

      setSuccess(`Mobilité (${mobilite.type}) enregistrée pour ${selected.prenom} ${selected.nom}.`);
      setMobilite(DEFAULT_MOBILITE);
      setTimeout(() => onSaved?.(), 700);
    } catch (err) {
      setTopErr(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-x-6">
      <section className="lg:col-span-5 min-h-0 rounded-2xl border border-light-gray bg-white p-3 shadow-sm sm:p-4">
        <div className="mb-3 border-b border-light-gray pb-3">
          <div className="relative min-w-0 flex-1">
            <Search size={14} className="absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Rechercher matricule, nom, prénom…"
              className="input pl-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Rechercher un étudiant existant"
            />
          </div>
        </div>
        {filtered.length === 0 ? (
          <p className="px-2 py-4 text-sm text-text-light">Aucun étudiant trouvé.</p>
        ) : (
          <ul className="max-h-[55vh] divide-y divide-light-gray overflow-auto lg:max-h-[60vh]">
            {filtered.map((e) => {
              const active = e.id === selectedId;
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(e.id)}
                    className={`flex w-full items-center justify-between gap-2 px-2 py-2.5 text-left transition ${
                      active ? 'bg-amber-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">
                        {e.prenom} {e.nom}
                      </p>
                      <p className="truncate text-xs text-text-light">
                        {e.matricule || '—'} · {e.scolarite?.filiere || '—'} · {e.scolarite?.niveau || '—'}
                      </p>
                    </div>
                    {active ? (
                      <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-bold uppercase text-gold-700">
                        sélectionné
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <form onSubmit={onSubmit} className="lg:col-span-7 space-y-4">
        {(topErr || success) && (
          <div
            className={`rounded-xl border px-3 py-2.5 text-sm font-medium leading-snug sm:px-4 ${
              topErr
                ? 'border-red-200 bg-red-50 text-red-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
          >
            {topErr || success}
          </div>
        )}

        <div className="rounded-2xl border border-light-gray bg-white p-4 shadow-sm sm:p-5">
          <h3 className="mb-2 font-serif text-base font-semibold text-slate-900">Étudiant concerné</h3>
          {selected ? (
            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <p>
                <span className="text-text-light">Matricule :</span>{' '}
                <strong className="text-slate-900">{selected.matricule || '—'}</strong>
              </p>
              <p>
                <span className="text-text-light">Nom :</span>{' '}
                <strong className="text-slate-900">{selected.prenom} {selected.nom}</strong>
              </p>
              <p>
                <span className="text-text-light">Filière :</span>{' '}
                <strong className="text-slate-900">{selected.scolarite?.filiere || '—'}</strong>
              </p>
              <p>
                <span className="text-text-light">Niveau :</span>{' '}
                <strong className="text-slate-900">{selected.scolarite?.niveau || '—'}</strong>
              </p>
            </div>
          ) : (
            <p className="text-sm text-text-light">
              Sélectionnez un étudiant dans la liste de gauche.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-light-gray bg-white p-4 shadow-sm sm:p-5">
          <h3 className="mb-3 border-b border-light-gray pb-2 font-serif text-base font-semibold text-slate-900">
            Informations de mobilité
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
            <SelectField
              label="Type de mobilité"
              value={mobilite.type}
              onChange={(v) => updateMobilite('type', v)}
              options={PARCOURS_MOBILITE_OPTIONS}
              required
              error={errors.type}
            />
            <Field
              label="Établissement d’accueil (SE / DD)"
              value={mobilite.etablissement}
              onChange={(v) => updateMobilite('etablissement', v)}
              required
              error={errors.etablissement}
            />
            <Field
              label="Spécialité"
              value={mobilite.specialite}
              onChange={(v) => updateMobilite('specialite', v)}
              required
              error={errors.specialite}
            />
            <SelectField
              label="Année universitaire de début"
              value={mobilite.anneeDebut}
              onChange={(v) => updateMobilite('anneeDebut', v)}
              options={anneeOptions}
            />
            <div className="md:col-span-2">
              <span className="label">Année de fin</span>
              <div className="input min-h-[44px] flex items-center tabular-nums text-slate-900 sm:min-h-[2.5rem]">
                {mobiliteAnneeFinAffichee || '—'}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-light-gray pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <Button type="button" variant="secondary" onClick={onCancel} className="w-full sm:w-auto">
            Annuler
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={submitting || !selected}
            className="w-full sm:w-auto"
          >
            {submitting ? 'Enregistrement…' : 'Enregistrer la mobilité'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required, error, placeholder }) {
  return (
    <label className="block min-w-0">
      <span className="label">
        {label}
        {required && <span className="text-brand-red"> *</span>}
      </span>
      <input
        type={type}
        className={`input min-h-[44px] sm:min-h-[2.5rem] ${error ? 'ring-2 ring-brand-red/40' : ''}`}
        required={required}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? <p className="mt-1.5 text-sm font-medium leading-snug text-brand-red">{error}</p> : null}
    </label>
  );
}
