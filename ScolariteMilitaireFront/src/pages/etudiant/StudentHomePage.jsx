import { Link } from 'react-router-dom';
import { useOwnEleve } from '../../hooks/useOwnEleve';
import { useAuth } from '../../hooks/useAuth';

export default function StudentHomePage() {
  const { user } = useAuth();
  const { eleve, loading, error } = useOwnEleve();

  if (loading) {
    return <p className="text-slate-500">Chargement…</p>;
  }
  if (error) {
    return <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>;
  }

  const dm = eleve?.dossierMilitaire ?? {};
  const s = eleve?.scolarite ?? {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-navy">
          Bonjour{eleve?.prenom ? `, ${eleve.prenom}` : ''}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Consultez votre dossier et votre historique opérationnel. Aucune modification n’est
          possible depuis cet espace.
        </p>
      </div>

      <section className="rounded-2xl border border-light-gray bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Identité</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-500">Matricule</dt>
            <dd className="font-medium text-slate-900">{eleve?.matricule ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Nom complet</dt>
            <dd className="font-medium text-slate-900">
              {eleve?.prenom} {eleve?.nom}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Section / Compagnie</dt>
            <dd className="font-medium text-slate-900">
              {dm.section || '—'} / {dm.compagnie || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Département / Niveau</dt>
            <dd className="font-medium text-slate-900">
              {s.departement || s.filiere || '—'} · {s.niveau || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Compte</dt>
            <dd className="font-medium text-slate-900">{user?.email ?? '—'}</dd>
          </div>
        </dl>
        <div className="mt-5">
          <Link
            to="/etudiant/dossier"
            className="inline-flex rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy/90"
          >
            Voir mon dossier
          </Link>
        </div>
      </section>
    </div>
  );
}
