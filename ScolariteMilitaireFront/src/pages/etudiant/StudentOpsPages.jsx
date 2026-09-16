import { useEffect, useState } from 'react';
import { useOwnEleve } from '../../hooks/useOwnEleve';
import { scolariteService } from '../../services/scolariteService';
import { equipementService } from '../../services/equipementService';
import { sanctionService } from '../../services/sanctionService';
import { demandeService } from '../../services/demandeService';
import { medicalService } from '../../services/medicalService';
import { formatApiError } from '../../utils/apiErrors';
import ScolariteFicheView from '../../components/scolarite/ScolariteFicheView';
import EquipementFicheView from '../../components/equipement/EquipementFicheView';
import SanctionsFicheView from '../../components/sanctions/SanctionsFicheView';
import DemandesFicheView from '../../components/demandes/DemandesFicheView';
import MedicalFicheView from '../../components/medical/MedicalFicheView';
import ProfilePage from '../ProfilePage';

function StudentOpsShell({ title, load, View }) {
  const { eleveId, loading: eleveLoading, error: eleveError } = useOwnEleve();
  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = async () => {
    if (!eleveId) return;
    setLoading(true);
    setError('');
    try {
      setDossier(await load(eleveId));
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eleveLoading) return;
    if (!eleveId) {
      setLoading(false);
      setError(eleveError || 'Aucun dossier lié.');
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eleveId, eleveLoading]);

  if (eleveLoading || (loading && !dossier)) {
    return <p className="text-slate-500">Chargement — {title}…</p>;
  }
  if (error && !dossier) {
    return <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>;
  }

  return (
    <View
      dossier={dossier}
      loading={loading}
      onBack={() => window.history.back()}
      onRefresh={refresh}
      canEdit={false}
    />
  );
}

export function StudentScolaritePage() {
  return (
    <StudentOpsShell
      title="Scolarité"
      load={(id) => scolariteService.getStudent(id)}
      View={ScolariteFicheView}
    />
  );
}

export function StudentEquipementPage() {
  return (
    <StudentOpsShell
      title="Équipement"
      load={(id) => equipementService.getStudent(id)}
      View={EquipementFicheView}
    />
  );
}

export function StudentSanctionsPage() {
  return (
    <StudentOpsShell
      title="Sanctions"
      load={(id) => sanctionService.getStudent(id)}
      View={SanctionsFicheView}
    />
  );
}

export function StudentDemandesPage() {
  return (
    <StudentOpsShell
      title="Demandes"
      load={(id) => demandeService.getStudent(id)}
      View={DemandesFicheView}
    />
  );
}

export function StudentMedicalPage() {
  return (
    <StudentOpsShell
      title="Médical"
      load={(id) => medicalService.getStudent(id)}
      View={MedicalFicheView}
    />
  );
}

export function StudentProfilPage() {
  return <ProfilePage />;
}
