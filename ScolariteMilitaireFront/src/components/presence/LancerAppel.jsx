import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, RotateCcw, Send, X as XIcon } from 'lucide-react';
import Button from '../common/Button';
import ResultatAppel from './ResultatAppel';
import { useFetch } from '../../hooks/useFetch';
import { eleveService } from '../../services/eleveService';
import { presenceService } from '../../services/presenceService';
import { SECTIONS, TYPES_RASSEMBLEMENT, MOTIFS_ABSENCE } from '../../utils/constants';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import { formatApiError } from '../../utils/apiErrors';

export default function LancerAppel({ onSubmitted }) {
  const { user } = useAuth();
  const toast = useToast();
  const [section, setSection] = useState(SECTIONS[0]);
  const [type, setType] = useState(TYPES_RASSEMBLEMENT[0].value);
  const [statuts, setStatuts] = useState({});
  const [motifs, setMotifs] = useState({});
  const [submitted, setSubmitted] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data: eleves, loading, error } = useFetch(
    () => eleveService.list({ section }),
    [section],
  );

  const reset = () => {
    setStatuts({});
    setMotifs({});
    setSubmitted(null);
  };

  const markAllPresent = () => {
    const next = {};
    (eleves ?? []).forEach((e) => {
      next[e.id] = 'present';
    });
    setStatuts(next);
    setMotifs({});
  };

  const toggle = (id) => {
    setStatuts((prev) => {
      const next = { ...prev, [id]: prev[id] === 'absent' ? 'present' : 'absent' };
      if (next[id] === 'present') {
        setMotifs((m) => {
          const copy = { ...m };
          delete copy[id];
          return copy;
        });
      }
      return next;
    });
  };

  const counts = useMemo(() => {
    const list = eleves ?? [];
    let presents = 0;
    let absents = 0;
    list.forEach((e) => {
      if (statuts[e.id] === 'absent') absents += 1;
      else presents += 1;
    });
    return { presents, absents, total: list.length };
  }, [statuts, eleves]);

  const envoyer = async () => {
    const list = eleves ?? [];
    if (!list.length) {
      toast.warning('Aucun élève dans cette section.');
      return;
    }

    const missingMotif = list.find(
      (e) => statuts[e.id] === 'absent' && !String(motifs[e.id] ?? '').trim(),
    );
    if (missingMotif) {
      toast.warning('Indiquez le motif pour chaque absent.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        section,
        type,
        compagnie: list[0]?.dossierMilitaire?.compagnie ?? list[0]?.compagnie ?? '',
        superviseur: `${user?.grade ?? ''} ${user?.prenom ?? ''} ${user?.nom ?? ''}`.trim(),
        total: counts.total,
        presents: counts.presents,
        absents: counts.absents,
        statut: 'transmis',
        detail: list.map((e) => ({
          eleveId: e.id,
          matricule: e.matricule,
          nom: `${e.prenom ?? ''} ${e.nom ?? ''}`.trim(),
          statut: statuts[e.id] === 'absent' ? 'absent' : 'present',
          motif: statuts[e.id] === 'absent' ? motifs[e.id] : null,
        })),
      };
      const saved = await presenceService.create(payload);
      setSubmitted(saved);
      onSubmitted?.();
      toast.success('Appel enregistré.');
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (submitted) {
    return (
      <div className="space-y-4">
        <ResultatAppel appel={submitted} />
        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={reset}>
            <RotateCcw size={16} className="mr-1.5" aria-hidden />
            Lancer un nouvel appel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-light-gray bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-sm font-semibold text-navy">Paramètres de l&apos;appel</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Section</span>
            <select
              className="input w-full"
              value={section}
              onChange={(e) => {
                setSection(e.target.value);
                reset();
              }}
            >
              {SECTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Type de rassemblement</span>
            <select className="input w-full" value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES_RASSEMBLEMENT.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <Button
              type="button"
              variant="secondary"
              onClick={markAllPresent}
              disabled={loading || !(eleves?.length)}
              className="w-full"
            >
              <Check size={16} className="mr-1.5" aria-hidden />
              Tout marquer présent
            </Button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-light-gray bg-white shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-light-gray px-5 py-3.5 sm:px-6">
          <h2 className="text-sm font-semibold text-navy">Effectif — {section}</h2>
          <span className="text-xs text-slate-500">
            {loading
              ? 'Chargement…'
              : `${counts.total} élève${counts.total > 1 ? 's' : ''} · ${counts.presents} présents · ${counts.absents} absents`}
          </span>
        </div>

        {error ? (
          <p className="mx-5 my-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 sm:mx-6">
            {formatApiError(error)}
          </p>
        ) : null}

        {!loading && !error && (eleves ?? []).length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-medium text-slate-700">
              Aucun élève dans la section « {section} ».
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Importez ou créez des dossiers avec la section correspondante.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link to="/eleves/import" className="btn btn-primary">
                Importer des étudiants
              </Link>
              <Link to="/eleves/nouveau" className="btn btn-secondary">
                Nouveau dossier
              </Link>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {(loading ? Array.from({ length: 4 }) : eleves ?? []).map((e, i) => {
              if (loading) {
                return (
                  <li key={`sk-${i}`} className="animate-pulse px-5 py-4 sm:px-6">
                    <div className="h-10 rounded bg-slate-100" />
                  </li>
                );
              }
              const statut = statuts[e.id] === 'absent' ? 'absent' : 'present';
              const isAbsent = statut === 'absent';
              return (
                <li
                  key={e.id}
                  className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-6"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {e.prenom} {e.nom}
                    </p>
                    <p className="font-mono text-xs text-gold">{e.matricule}</p>
                  </div>

                  {isAbsent ? (
                    <select
                      className="input w-full sm:w-52"
                      value={motifs[e.id] ?? ''}
                      onChange={(ev) => setMotifs({ ...motifs, [e.id]: ev.target.value })}
                    >
                      <option value="">Motif (obligatoire)</option>
                      {MOTIFS_ABSENCE.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => toggle(e.id)}
                    className={`inline-flex shrink-0 items-center gap-2 self-start rounded-full border px-3 py-1.5 text-xs font-medium transition sm:self-center ${
                      isAbsent
                        ? 'border-red-200 bg-red-50 text-red-700'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    }`}
                  >
                    {isAbsent ? <XIcon size={14} aria-hidden /> : <Check size={14} aria-hidden />}
                    {isAbsent ? 'Absent' : 'Présent'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="ghost" onClick={reset}>
          <RotateCcw size={16} className="mr-1.5" aria-hidden />
          Réinitialiser
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={envoyer}
          disabled={saving || loading || counts.total === 0}
        >
          <Send size={16} className="mr-1.5" aria-hidden />
          {saving ? 'Enregistrement…' : 'Enregistrer l’appel'}
        </Button>
      </div>
    </div>
  );
}
