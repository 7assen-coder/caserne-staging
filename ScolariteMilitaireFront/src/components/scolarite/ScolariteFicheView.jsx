import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Download,
  ExternalLink,
  Globe,
  GraduationCap,
} from 'lucide-react';
import Button from '../common/Button';
import SelectField from '../common/SelectField';
import SemestreBadge from './SemestreBadge';
import {
  SEMESTRE_COLUMNS,
  VALIDATION_SEMESTRE_OPTIONS,
  semestresMobiliteForNiveau,
} from '../../data/scolariteSemestres';
import { PARCOURS_MOBILITE_OPTIONS } from '../../data/etudiantOptions';
import { scolariteService } from '../../services/scolariteService';
import { downloadScolariteFichePdf } from '../../utils/scolariteFichePdf';
import { initials } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';
import { humanizeError } from '../../utils/apiErrors';

function MiniStat({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-light-gray/80 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-0.5 font-serif text-xl font-semibold tabular-nums text-navy">{value}</p>
        </div>
        {Icon ? <Icon size={18} className="text-esp-green/70" aria-hidden /> : null}
      </div>
    </div>
  );
}

export default function ScolariteFicheView({
  dossier,
  loading,
  onBack,
  onRefresh,
  canEdit = true,
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(null);
  const [mobiliteDraft, setMobiliteDraft] = useState(null);

  const nomComplet = `${dossier?.prenom ?? ''} ${dossier?.nom ?? ''}`.trim();
  const semestres = dossier?.semestres ?? {};
  const mobilite = mobiliteDraft ?? dossier?.mobilite ?? { type: '', etablissement: '', specialite: '' };
  const mobiliteKeys = useMemo(
    () => semestresMobiliteForNiveau(dossier?.niveau),
    [dossier?.niveau],
  );

  const counts = useMemo(() => {
    let filled = 0;
    let integral = 0;
    SEMESTRE_COLUMNS.forEach(({ key }) => {
      const v = semestres[key];
      if (v) {
        filled += 1;
        if (v === 'integral') integral += 1;
      }
    });
    return { filled, integral };
  }, [semestres]);

  const handleSemestreChange = useCallback(
    async (key, value) => {
      if (!dossier?.id) return;
      setBusy(key);
      try {
        scolariteService.updateSemestre(dossier.id, key, value);
        toast.success(`${key} mis à jour.`);
        await onRefresh?.();
      } catch (err) {
        toast.error(humanizeError(err));
      } finally {
        setBusy(null);
      }
    },
    [dossier?.id, toast, onRefresh],
  );

  const saveMobilite = async () => {
    if (!dossier?.id) return;
    setBusy('mobilite');
    try {
      scolariteService.updateMobilite(dossier.id, mobilite);
      setMobiliteDraft(null);
      toast.success('Mobilité enregistrée.');
      await onRefresh?.();
    } catch (err) {
      toast.error(humanizeError(err));
    } finally {
      setBusy(null);
    }
  };

  const handleExportPdf = async () => {
    try {
      setBusy('pdf');
      await downloadScolariteFichePdf(dossier);
      toast.success('Fiche scolarité téléchargée.');
    } catch (err) {
      toast.error(humanizeError(err));
    } finally {
      setBusy(null);
    }
  };

  if (loading && !dossier?.id) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-500">
        Chargement du suivi scolarité…
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-8">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-navy"
      >
        <ArrowLeft size={16} aria-hidden />
        Retour au registre
      </button>

      <section className="overflow-hidden rounded-2xl border border-light-gray bg-white shadow-sm">
        <div className="h-1.5 bg-gradient-to-r from-navy via-esp-green to-gold" />
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-7">
          <div className="flex min-w-0 gap-4">
            {dossier?.photoUrl ? (
              <img
                src={dossier.photoUrl}
                alt=""
                className="h-20 w-20 shrink-0 rounded-2xl object-cover ring-2 ring-slate-100"
              />
            ) : (
              <span className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-navy text-xl font-bold text-white">
                {initials(dossier?.nom, dossier?.prenom)}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-esp-green">Suivi scolarité</p>
              <h1 className="truncate font-serif text-2xl font-semibold text-slate-900 sm:text-3xl">
                {nomComplet || '—'}
              </h1>
              <p className="mt-1 font-mono text-sm text-gold">{dossier?.matricule}</p>
              <p className="mt-1 text-sm text-slate-500">
                {dossier?.departement || '—'} · {dossier?.niveau || '—'} ·{' '}
                <span className="font-medium text-navy">{dossier?.statutLabel}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/eleves/dossiers"
              state={{ openEleveId: dossier?.id }}
              className="btn btn-secondary inline-flex items-center gap-2"
            >
              <ExternalLink size={16} aria-hidden />
              Dossier étudiant
            </Link>
            <Button type="button" variant="secondary" onClick={handleExportPdf} disabled={busy === 'pdf'}>
              <Download size={16} className="mr-1.5" aria-hidden />
              {busy === 'pdf' ? 'Export…' : 'Fiche PDF'}
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 border-t border-light-gray bg-off-white/40 px-5 py-4 sm:px-7">
          <MiniStat label="Semestres renseignés" value={counts.filled} icon={BookOpen} />
          <MiniStat label="Validations intégrales" value={counts.integral} icon={GraduationCap} />
          <MiniStat
            label="Mobilité"
            value={mobilite?.type ? 'Oui' : 'Non'}
            icon={Globe}
          />
        </div>
      </section>

      {/* Grille semestres */}
      <section className="overflow-hidden rounded-2xl border border-light-gray bg-white shadow-sm">
        <div className="border-b border-light-gray px-5 py-4 sm:px-6">
          <h2 className="text-sm font-semibold text-navy">Validations par semestre</h2>
          <p className="text-xs text-text-light">S1 à S6 · parcours DD / échange (S3DD, S4DD, S5, S5E, S5DD)</p>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 sm:p-6">
          {SEMESTRE_COLUMNS.map(({ key, label }) => {
            const isMobiliteKey = ['S3DD', 'S4DD', 'S5M', 'S5E', 'S5DD'].includes(key);
            const highlight = isMobiliteKey && mobiliteKeys.includes(key);
            return (
              <div
                key={key}
                className={`rounded-xl border px-3 py-3 ${
                  highlight ? 'border-gold/40 bg-amber-50/40' : 'border-light-gray bg-off-white/30'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-navy">{label}</span>
                  <SemestreBadge value={semestres[key]} />
                </div>
                {canEdit ? (
                  <select
                    className="input mt-2 w-full py-1.5 text-xs"
                    value={semestres[key] ?? ''}
                    disabled={busy === key}
                    onChange={(e) => handleSemestreChange(key, e.target.value)}
                  >
                    {VALIDATION_SEMESTRE_OPTIONS.map((o) => (
                      <option key={o.value || 'empty'} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="mt-2 text-[11px] text-slate-500">
                    {VALIDATION_SEMESTRE_OPTIONS.find((o) => o.value === (semestres[key] ?? ''))?.label ?? '—'}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Mobilité */}
      <section className="overflow-hidden rounded-2xl border border-light-gray bg-white shadow-sm">
        <div className="border-b border-light-gray px-5 py-4 sm:px-6">
          <h2 className="text-sm font-semibold text-navy">Mobilité / double diplôme</h2>
          <p className="text-xs text-text-light">Échange ou DD — établissement partenaire</p>
        </div>
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <SelectField
            label="Type de parcours"
            value={mobilite.type ?? ''}
            onChange={(v) => setMobiliteDraft({ ...mobilite, type: v })}
            options={PARCOURS_MOBILITE_OPTIONS}
            disabled={!canEdit}
          />
          <label className="block text-sm">
            <span className="label">Établissement partenaire</span>
            <input
              type="text"
              className="input w-full"
              value={mobilite.etablissement ?? ''}
              disabled={!canEdit}
              onChange={(e) => setMobiliteDraft({ ...mobilite, etablissement: e.target.value })}
              placeholder="Nom de l'université / école"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="label">Spécialité / filière mobilité</span>
            <input
              type="text"
              className="input w-full"
              value={mobilite.specialite ?? ''}
              disabled={!canEdit}
              onChange={(e) => setMobiliteDraft({ ...mobilite, specialite: e.target.value })}
            />
          </label>
          {canEdit ? (
            <div className="sm:col-span-2">
              <Button
                type="button"
                variant="primary"
                disabled={busy === 'mobilite'}
                onClick={saveMobilite}
              >
                {busy === 'mobilite' ? 'Enregistrement…' : 'Enregistrer la mobilité'}
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      {/* Relevés (données mock existantes) */}
      {dossier?.relevesSemestres?.length ? (
        <section className="overflow-hidden rounded-2xl border border-light-gray bg-white shadow-sm">
          <div className="border-b border-light-gray px-5 py-4 sm:px-6">
            <h2 className="text-sm font-semibold text-navy">Relevés de notes (aperçu)</h2>
            <p className="text-xs text-text-light">Données issues du dossier étudiant</p>
          </div>
          <ul className="divide-y divide-slate-100">
            {dossier.relevesSemestres.map((rel) => (
              <li key={rel.code} className="px-5 py-4 sm:px-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-slate-900">{rel.periode}</p>
                  <p className="text-sm text-slate-600">
                    Moy. {rel.moyenneGenerale} · {rel.creditObtenu}/{rel.creditTotal} crédits
                  </p>
                </div>
                <p className="mt-1 text-xs text-slate-500">{rel.resultat}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
