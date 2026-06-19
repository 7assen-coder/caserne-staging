import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Coins,
  ExternalLink,
  Lock,
  Pencil,
  RotateCcw,
  Search,
  Users,
  Wallet,
} from 'lucide-react';
import Button from '../common/Button';
import DroitsExportMenu from './DroitsExportMenu';
import { useFetch } from '../../hooks/useFetch';
import { droitsService } from '../../services/droitsService';
import {
  COMPAGNIE_NIVEAU_LABEL,
  DROITS_COMPAGNIES,
  DROITS_ETATS,
  MOIS_OPTIONS,
  moisLabel,
  yearOptions,
} from '../../data/droitsCatalog';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABEL, getCanonicalRole, getPermissions } from '../../utils/userRole';
import { useToast } from '../../context/ToastContext';
import { formatApiError, humanizeError } from '../../utils/apiErrors';
import { exportDroitsExcel, exportDroitsPdf } from '../../utils/droitsListExport';
import { computeDroitsStats } from '../../utils/droitsStats';
import { DROITS_CHANGED } from '../../utils/droitsStore';
import { initials } from '../../utils/formatters';

const now = new Date();

function StatCard({ label, value, hint, icon: Icon, accent }) {
  const accents = {
    navy: 'border-l-navy bg-white',
    green: 'border-l-emerald-600 bg-emerald-50/40',
    amber: 'border-l-amber-500 bg-amber-50/40',
    slate: 'border-l-slate-400 bg-slate-50/60',
  };
  return (
    <div
      className={`flex min-h-[5.5rem] flex-col justify-between rounded-xl border border-light-gray border-l-4 px-4 py-3.5 shadow-sm ${accents[accent] ?? accents.navy}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        {Icon ? <Icon size={16} className="shrink-0 text-slate-400" aria-hidden /> : null}
      </div>
      <p className="font-serif text-2xl font-semibold tabular-nums leading-none text-navy sm:text-3xl">
        {value}
      </p>
      {hint ? <p className="text-[11px] text-slate-500">{hint}</p> : <span className="h-4" aria-hidden />}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, id }) {
  return (
    <label htmlFor={id} className="flex min-w-0 flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input w-full cursor-pointer appearance-none py-2.5 pl-3 pr-9 text-sm"
        >
          {options.map((o) => (
            <option key={String(o.value)} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
      </div>
    </label>
  );
}

function EtatBadge({ etat }) {
  const percu = etat === 'percu';
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${
        percu
          ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
          : 'bg-amber-50 text-amber-900 ring-amber-200'
      }`}
    >
      {percu ? 'Perçu' : 'Non perçu'}
    </span>
  );
}

function WorkflowStep({ step, label, active, done }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
          active
            ? 'bg-navy text-white shadow-sm'
            : done
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-slate-100 text-slate-500'
        }`}
      >
        {done && !active ? '✓' : step}
      </span>
      <span className={`truncate text-xs font-semibold ${active ? 'text-navy' : 'text-slate-500'}`}>
        {label}
      </span>
    </div>
  );
}

export default function GestionDroits() {
  const { fonction } = useAuth();
  const role = getCanonicalRole(fonction);
  const perms = getPermissions(role);
  const canEdit = perms.canEditStudent;
  const toast = useToast();

  const [annee, setAnnee] = useState(now.getFullYear());
  const [mois, setMois] = useState(now.getMonth() + 1);
  const [compagnie, setCompagnie] = useState(DROITS_COMPAGNIES[0]?.value ?? '1re Compagnie');
  const [editMode, setEditMode] = useState(false);
  const [draftRows, setDraftRows] = useState([]);
  const [defaultMontant, setDefaultMontant] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [key, setKey] = useState(0);
  const [busy, setBusy] = useState(null);
  const [exportBusy, setExportBusy] = useState(null);

  useEffect(() => {
    const refresh = () => setKey((k) => k + 1);
    window.addEventListener(DROITS_CHANGED, refresh);
    return () => window.removeEventListener(DROITS_CHANGED, refresh);
  }, []);

  const { data: batch, loading, error } = useFetch(
    () => droitsService.loadBatch(annee, mois, compagnie),
    [annee, mois, compagnie, key],
  );

  useEffect(() => {
    if (!batch) return;
    setDraftRows(batch.rows ?? []);
    setDefaultMontant(String(batch.defaultMontant ?? ''));
    setEditMode(false);
    setSearchQ('');
  }, [batch]);

  const isValidated = Boolean(batch?.validated) && !editMode;
  const editable = canEdit && !isValidated;

  const filteredRows = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return draftRows;
    return draftRows.filter(
      (r) =>
        r.nom?.toLowerCase().includes(q)
        || r.prenom?.toLowerCase().includes(q)
        || String(r.matricule ?? '').toLowerCase().includes(q)
        || r.section?.toLowerCase().includes(q),
    );
  }, [draftRows, searchQ]);

  const stats = useMemo(() => computeDroitsStats(filteredRows), [filteredRows]);
  const tauxPercu = stats.total
    ? Math.round((stats.percu / stats.total) * 100)
    : 0;

  const updateRow = useCallback((eleveId, patch) => {
    setDraftRows((rows) =>
      rows.map((r) => (String(r.eleveId) === String(eleveId) ? { ...r, ...patch } : r)),
    );
  }, []);

  const markAllEtat = (etat) => {
    setDraftRows((rows) => rows.map((r) => ({ ...r, etat })));
    toast.success(etat === 'percu' ? 'Tous marqués Perçu.' : 'Tous marqués Non perçu.');
  };

  const applyDefaultToAll = () => {
    const m = Number(defaultMontant);
    if (!Number.isFinite(m) || m < 0) {
      toast.warning('Montant par défaut invalide.');
      return;
    }
    setDraftRows((rows) => rows.map((r) => ({ ...r, montant: m })));
    droitsService.setDefaultMontant(annee, mois, compagnie, m);
    toast.success('Montant appliqué à tous les étudiants.');
  };

  const handleValidate = async () => {
    setBusy('validate');
    try {
      await droitsService.validate(annee, mois, compagnie, draftRows);
      toast.success('Feuille de droits validée.');
      setEditMode(false);
      setKey((k) => k + 1);
    } catch (err) {
      toast.error(humanizeError(err));
    } finally {
      setBusy(null);
    }
  };

  const handleUnlock = async () => {
    setBusy('unlock');
    try {
      droitsService.unlock(annee, mois, compagnie);
      setEditMode(true);
      toast.info('Mode édition activé.');
      setKey((k) => k + 1);
    } catch (err) {
      toast.error(humanizeError(err));
    } finally {
      setBusy(null);
    }
  };

  const handleSaveDraft = async () => {
    setBusy('save');
    try {
      droitsService.saveAll(annee, mois, compagnie, draftRows);
      if (defaultMontant) {
        droitsService.setDefaultMontant(annee, mois, compagnie, Number(defaultMontant));
      }
      toast.success('Modifications enregistrées.');
      setKey((k) => k + 1);
    } catch (err) {
      toast.error(humanizeError(err));
    } finally {
      setBusy(null);
    }
  };

  const runExport = async (option) => {
    try {
      setExportBusy(option.id);
      const payload = {
        annee,
        mois,
        compagnie,
        validated: batch?.validated,
        rows: draftRows,
      };
      if (option.format === 'xlsx') await exportDroitsExcel(payload);
      else await exportDroitsPdf(payload);
      toast.success(`${option.label} téléchargé.`);
    } catch (err) {
      toast.error(humanizeError(err));
    } finally {
      setExportBusy(null);
    }
  };

  const formatMontant = (n) => `${(Number(n) || 0).toLocaleString('fr-FR')} MRU`;
  const niveauCompagnie = COMPAGNIE_NIVEAU_LABEL[compagnie] ?? '';

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 pb-8">
      <nav>
        <div className="inline-flex items-center gap-2 rounded-full border border-light-gray bg-white px-3 py-1.5 text-sm text-text-light shadow-sm">
          <Link to="/dashboard" className="font-medium transition hover:text-navy">
            Accueil
          </Link>
          <span aria-hidden>/</span>
          <span className="font-semibold text-navy">Droits</span>
        </div>
      </nav>

      <header className="flex flex-col gap-4 rounded-2xl border border-light-gray bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-navy text-white shadow-sm">
            <Coins size={22} strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="font-serif text-xl font-semibold text-slate-900 sm:text-2xl">
              Gestion des droits
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Bourses mensuelles · {ROLE_LABEL[role]}
            </p>
          </div>
        </div>
        <DroitsExportMenu
          studentCount={draftRows.length}
          disabled={loading}
          busy={exportBusy}
          onExport={runExport}
        />
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard label="Effectif" value={stats.total} icon={Users} accent="navy" />
        <StatCard
          label="Perçu"
          value={stats.percu}
          hint={`${tauxPercu}% · ${stats.nonPercu} non perçu`}
          accent="green"
        />
        <StatCard
          label="Versé"
          value={formatMontant(stats.montantPercu)}
          icon={Wallet}
          accent="amber"
        />
        <StatCard label="Prévision" value={formatMontant(stats.montantTotal)} accent="slate" />
      </div>

      {/* Workflow — étapes 8.1 */}
      <section className="overflow-hidden rounded-2xl border border-light-gray bg-white shadow-sm">
        <div className="border-b border-light-gray bg-gradient-to-r from-navy/5 via-white to-esp-green/5 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <WorkflowStep step={1} label="Année" active={Boolean(annee)} done={Boolean(annee)} />
            <ChevronRight size={14} className="hidden text-slate-300 sm:block" aria-hidden />
            <WorkflowStep step={2} label="Mois" active={Boolean(mois)} done={Boolean(mois)} />
            <ChevronRight size={14} className="hidden text-slate-300 sm:block" aria-hidden />
            <WorkflowStep step={3} label="Compagnie" active={Boolean(compagnie)} done={Boolean(compagnie)} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-3 sm:px-6">
          <FilterSelect
            id="droits-annee"
            label="Année"
            value={annee}
            onChange={(v) => setAnnee(Number(v))}
            options={yearOptions()}
          />
          <FilterSelect
            id="droits-mois"
            label="Mois"
            value={mois}
            onChange={(v) => setMois(Number(v))}
            options={MOIS_OPTIONS}
          />
          <FilterSelect
            id="droits-compagnie"
            label="Compagnie"
            value={compagnie}
            onChange={setCompagnie}
            options={DROITS_COMPAGNIES}
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-light-gray bg-off-white/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-navy/10 text-navy">
              <Calendar size={18} aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-navy">
                {moisLabel(mois)} {annee} · {compagnie}
              </p>
              <p className="text-xs text-slate-500">
                Niveau {niveauCompagnie || '—'} · Montant de référence{' '}
                <span className="font-semibold text-slate-700">{formatMontant(defaultMontant)}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isValidated ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                <Lock size={12} aria-hidden />
                Feuille validée
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-200">
                <Pencil size={12} aria-hidden />
                Mode édition
              </span>
            )}
            {canEdit && isValidated ? (
              <Button type="button" variant="secondary" size="sm" onClick={handleUnlock} disabled={busy === 'unlock'}>
                Modifier
              </Button>
            ) : null}
            {canEdit && !isValidated ? (
              <>
                <Button type="button" variant="secondary" size="sm" onClick={handleSaveDraft} disabled={busy === 'save'}>
                  Enregistrer
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleValidate}
                  disabled={busy === 'validate' || !draftRows.length}
                >
                  <CheckCircle2 size={14} className="mr-1" aria-hidden />
                  Valider la feuille
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </section>

      {/* Barre d'outils édition — 8.2 / 8.3 */}
      {editable ? (
        <section className="rounded-2xl border border-light-gray bg-white px-5 py-4 shadow-sm sm:px-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Paramètres du lot
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Montant par défaut (MRU)
              </span>
              <input
                type="number"
                min={0}
                step={100}
                value={defaultMontant}
                onChange={(e) => setDefaultMontant(e.target.value)}
                className="input w-40 py-2 text-sm tabular-nums"
              />
            </label>
            <Button type="button" variant="ghost" onClick={applyDefaultToAll}>
              <RotateCcw size={14} className="mr-1" aria-hidden />
              Appliquer à tous
            </Button>
            <span className="hidden h-8 w-px bg-slate-200 sm:block" aria-hidden />
            <Button type="button" variant="ghost" onClick={() => markAllEtat('percu')}>
              Tout Perçu
            </Button>
            <Button type="button" variant="ghost" onClick={() => markAllEtat('non_percu')}>
              Tout Non perçu
            </Button>
          </div>
        </section>
      ) : null}

      {/* Tableau compagnie — 8.2 à 8.6 */}
      <section className="overflow-hidden rounded-2xl border border-light-gray bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-light-gray px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-sm font-semibold text-navy">
              Feuille de la {compagnie}
            </h2>
            <p className="text-xs text-slate-500">
              {loading ? 'Chargement…' : `${filteredRows.length} / ${draftRows.length} étudiant${draftRows.length > 1 ? 's' : ''}`}
            </p>
          </div>
          <label className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              type="search"
              placeholder="Filtrer par nom, matricule…"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              className="input w-full py-2 pl-9 text-sm"
            />
          </label>
        </div>

        {error ? (
          <p className="mx-5 my-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 sm:mx-6">
            {formatApiError(error)}
          </p>
        ) : null}

        {loading ? (
          <div className="space-y-2 p-5 sm:p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Coins size={40} className="mx-auto text-slate-300" strokeWidth={1.25} aria-hidden />
            <p className="mt-3 text-sm font-medium text-slate-600">
              {draftRows.length === 0
                ? `Aucun étudiant rattaché à ${compagnie}.`
                : 'Aucun résultat pour cette recherche.'}
            </p>
            {searchQ ? (
              <Button type="button" variant="ghost" className="mt-2" onClick={() => setSearchQ('')}>
                Effacer la recherche
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-light-gray bg-slate-50/90 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Étudiant</th>
                    <th className="px-4 py-3">Section</th>
                    <th className="px-4 py-3">Niveau</th>
                    <th className="px-4 py-3">Montant (MRU)</th>
                    <th className="px-4 py-3">État</th>
                    <th className="px-4 py-3">Remarques</th>
                    <th className="px-4 py-3 text-right">Dossier</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const nomComplet = `${row.prenom ?? ''} ${row.nom ?? ''}`.trim();
                    return (
                      <tr key={row.eleveId} className="border-b border-slate-100 hover:bg-slate-50/60">
                        <td className="px-4 py-3">
                          <div className="flex min-w-0 items-center gap-2.5">
                            {row.photoUrl ? (
                              <img src={row.photoUrl} alt="" className="h-9 w-9 rounded-lg object-cover ring-1 ring-slate-200" />
                            ) : (
                              <span className="grid h-9 w-9 place-items-center rounded-lg bg-navy text-[10px] font-bold text-white">
                                {initials(row.nom, row.prenom)}
                              </span>
                            )}
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-900">{nomComplet || '—'}</p>
                              <p className="font-mono text-[11px] text-gold">{row.matricule}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{row.section || '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{row.niveau || '—'}</td>
                        <td className="px-4 py-3">
                          {editable ? (
                            <input
                              type="number"
                              min={0}
                              step={100}
                              value={row.montant}
                              onChange={(e) => updateRow(row.eleveId, { montant: Number(e.target.value) || 0 })}
                              className="input w-28 py-1.5 text-sm tabular-nums"
                            />
                          ) : (
                            <span className="font-medium tabular-nums">{formatMontant(row.montant)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {editable ? (
                            <select
                              value={row.etat}
                              onChange={(e) => updateRow(row.eleveId, { etat: e.target.value })}
                              className="input cursor-pointer py-1.5 text-sm"
                            >
                              {DROITS_ETATS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>
                          ) : (
                            <EtatBadge etat={row.etat} />
                          )}
                        </td>
                        <td className="max-w-[12rem] px-4 py-3">
                          {editable ? (
                            <input
                              type="text"
                              value={row.remarques}
                              onChange={(e) => updateRow(row.eleveId, { remarques: e.target.value })}
                              placeholder="—"
                              className="input w-full py-1.5 text-sm"
                            />
                          ) : (
                            <span className="text-slate-600">{row.remarques || '—'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            to="/eleves/dossiers"
                            state={{ openEleveId: row.eleveId }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-navy hover:underline"
                          >
                            <ExternalLink size={13} aria-hidden />
                            Ouvrir
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-navy/10 bg-slate-50/80 text-sm font-semibold text-navy">
                    <td className="px-4 py-3" colSpan={3}>
                      Totaux ({stats.total} étudiants)
                    </td>
                    <td className="px-4 py-3 tabular-nums">{formatMontant(stats.montantTotal)}</td>
                    <td className="px-4 py-3" colSpan={2}>
                      {stats.percu} perçu · {formatMontant(stats.montantPercu)} versé
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            <ul className="divide-y divide-slate-100 lg:hidden">
              {filteredRows.map((row) => {
                const nomComplet = `${row.prenom ?? ''} ${row.nom ?? ''}`.trim();
                return (
                  <li key={row.eleveId} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{nomComplet}</p>
                        <p className="font-mono text-[11px] text-gold">{row.matricule}</p>
                        <p className="text-xs text-slate-500">{row.section || '—'} · {row.niveau || '—'}</p>
                      </div>
                      {!editable ? <EtatBadge etat={row.etat} /> : null}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <label className="text-xs">
                        <span className="text-slate-400">Montant</span>
                        {editable ? (
                          <input
                            type="number"
                            min={0}
                            value={row.montant}
                            onChange={(e) => updateRow(row.eleveId, { montant: Number(e.target.value) || 0 })}
                            className="input mt-1 w-full py-1.5 text-sm"
                          />
                        ) : (
                          <p className="mt-0.5 font-medium">{formatMontant(row.montant)}</p>
                        )}
                      </label>
                      {editable ? (
                        <label className="text-xs">
                          <span className="text-slate-400">État</span>
                          <select
                            value={row.etat}
                            onChange={(e) => updateRow(row.eleveId, { etat: e.target.value })}
                            className="input mt-1 w-full py-1.5 text-sm"
                          >
                            {DROITS_ETATS.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                    </div>
                    {editable ? (
                      <label className="mt-2 block text-xs">
                        <span className="text-slate-400">Remarques</span>
                        <input
                          type="text"
                          value={row.remarques}
                          onChange={(e) => updateRow(row.eleveId, { remarques: e.target.value })}
                          className="input mt-1 w-full py-1.5 text-sm"
                        />
                      </label>
                    ) : row.remarques ? (
                      <p className="mt-2 text-xs text-slate-600">{row.remarques}</p>
                    ) : null}
                    <Link
                      to="/eleves/dossiers"
                      state={{ openEleveId: row.eleveId }}
                      className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-navy"
                    >
                      <ExternalLink size={13} aria-hidden />
                      Dossier étudiant
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
