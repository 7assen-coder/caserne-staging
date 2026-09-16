import { ArrowLeft } from 'lucide-react';
import Button from '../common/Button';
import LoadingBlock from '../common/LoadingBlock';
import QueryErrorPanel from '../common/QueryErrorPanel';
import { initials } from '../../utils/formatters';

/** Shared fiche chrome for ops modules (Phase 30). */
export default function OpsFicheShell({
  onBack,
  title = 'Fiche',
  eleve,
  photoUrl,
  loading = false,
  error = null,
  onRetry,
  miniStats = [],
  actions = null,
  children,
}) {
  if (loading) {
    return (
      <div className="space-y-4">
        <Button type="button" variant="ghost" icon={ArrowLeft} onClick={onBack}>
          Retour
        </Button>
        <LoadingBlock label="Chargement de la fiche…" />
      </div>
    );
  }

  if (error || !eleve) {
    return (
      <div className="space-y-4">
        <Button type="button" variant="ghost" icon={ArrowLeft} onClick={onBack}>
          Retour
        </Button>
        <QueryErrorPanel
          error={error ?? new Error('Fiche introuvable')}
          title="Impossible de charger la fiche."
          onRetry={onRetry}
        />
      </div>
    );
  }

  const nomComplet = `${eleve.prenom ?? ''} ${eleve.nom ?? ''}`.trim() || '—';
  const photo = photoUrl ?? eleve.photoUrl;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="ghost" icon={ArrowLeft} onClick={onBack}>
          Retour à la liste
        </Button>
        {actions}
      </div>

      <header className="rounded-2xl border border-light-gray bg-white p-5 shadow-sm sm:p-6">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{title}</p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          {photo ? (
            <img
              src={photo}
              alt=""
              className="h-16 w-16 rounded-full object-cover ring-1 ring-slate-200"
            />
          ) : (
            <span className="grid h-16 w-16 place-items-center rounded-full bg-navy/10 text-sm font-bold text-navy">
              {initials(eleve.nom, eleve.prenom)}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="font-serif text-2xl font-semibold text-navy">{nomComplet}</h1>
            <p className="text-sm text-slate-500">
              {eleve.matricule ? `Matricule ${eleve.matricule}` : '—'}
              {eleve.section ? ` · Section ${eleve.section}` : ''}
            </p>
          </div>
        </div>
        {miniStats.length > 0 ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {miniStats.map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-light-gray/80 bg-white px-4 py-3 shadow-sm"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {s.label}
                </p>
                <p className="mt-0.5 font-serif text-xl font-semibold tabular-nums text-navy">
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </header>

      {children}
    </div>
  );
}
