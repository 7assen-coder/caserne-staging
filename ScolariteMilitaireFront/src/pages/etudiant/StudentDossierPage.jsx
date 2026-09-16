import { useNavigate } from 'react-router-dom';
import EleveFicheView from '../../components/eleves/EleveFicheView';
import { useOwnEleve } from '../../hooks/useOwnEleve';

export default function StudentDossierPage() {
  const navigate = useNavigate();
  const { eleve, loading, error } = useOwnEleve();

  if (loading) return <p className="text-slate-500">Chargement du dossier…</p>;
  if (error) {
    return <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>;
  }
  if (!eleve) return <p className="text-slate-500">Dossier introuvable.</p>;

  return (
    <EleveFicheView
      eleve={eleve}
      loading={loading}
      onBack={() => navigate('/etudiant')}
      onEditDossier={null}
      onDelete={null}
    />
  );
}
