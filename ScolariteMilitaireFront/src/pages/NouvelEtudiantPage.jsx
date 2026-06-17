import { useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import FormulaireEleve from '../components/eleves/FormulaireEleve';
import { eleveService } from '../services/eleveService';
import { useAuth } from '../hooks/useAuth';
import { ROLE_LABEL, getCanonicalRole, getPermissions } from '../utils/userRole';
import {
  clearNouvelEtudiantPersistence,
  loadNouvelEtudiantFlow,
  saveNouvelEtudiantFlow,
} from '../utils/nouvelEtudiantPersistence';

const STEP_KEY_TO_API = {
  'etat-civil': 'eleve',
  scolarite: 'dossier-academique',
  pieces: 'documents',
  contacts: 'contacts-parents',
  sante: 'dossier-sante',
  militaire: 'dossier-militaire',
  hebergement: 'hebergement',
};

export default function NouvelEtudiantPage() {
  const navigate = useNavigate();
  const { fonction } = useAuth();
  const role = getCanonicalRole(fonction);
  const perms = getPermissions(role);

  const flowRef = useRef(loadNouvelEtudiantFlow() ?? {
    eleveId: null,
    dossierAcademiqueId: null,
    documentsId: null,
    contactsParentsId: null,
    dossierSanteId: null,
    dossierMilitaireId: null,
    hebergementId: null,
  });

  const persistFlow = () => {
    saveNouvelEtudiantFlow(flowRef.current);
  };

  const resetFlow = () => {
    flowRef.current = {
      eleveId: null,
      dossierAcademiqueId: null,
      documentsId: null,
      contactsParentsId: null,
      dossierSanteId: null,
      dossierMilitaireId: null,
      hebergementId: null,
    };
    clearNouvelEtudiantPersistence();
  };

  const handleLeave = () => {
    resetFlow();
    navigate('/gestion-eleves', { replace: false });
  };

  const handleStepSubmit = useMemo(
    () => async (stepKey, values) => {
      const flow = flowRef.current;
      const apiKey = STEP_KEY_TO_API[stepKey];

      if (apiKey === 'eleve') {
        if (flow.eleveId) {
          await eleveService.update(flow.eleveId, values);
        } else {
          const created = await eleveService.createEleve(values);
          flow.eleveId = created.id;
        }
        persistFlow();
        return;
      }

      const eleveId = flow.eleveId;
      if (!eleveId) throw new Error('Étape « État civil » non finalisée.');

      if (apiKey === 'dossier-academique') {
        const res = flow.dossierAcademiqueId
          ? await eleveService.updateDossierAcademique(flow.dossierAcademiqueId, eleveId, values)
          : await eleveService.createDossierAcademique(eleveId, values);
        flow.dossierAcademiqueId = res?.data?.id ?? flow.dossierAcademiqueId;
        persistFlow();
        return;
      }

      if (apiKey === 'documents') {
        const p = values.pieces || {};
        /** Clés alignées sur `FormulaireEleve` (étape Pièces) et `eleveService.createDocuments`. */
        const requiredFiles = [
          { key: 'photoIdentite', label: 'Photo d’identité', value: p.photoIdentite },
          { key: 'cin', label: 'CIN', value: p.cin },
          { key: 'acteNaissance', label: 'Acte de naissance', value: p.acteNaissance },
          { key: 'diplomeAcces', label: 'Diplôme d’accès', value: p.diplomeAcces },
          { key: 'diplomeBac', label: 'Diplôme du Bac', value: p.diplomeBac },
        ];
        const missing = requiredFiles.filter((f) => !(f.value instanceof File)).map((f) => f.label);
        if (missing.length > 0) {
          throw new Error(`Fichiers obligatoires manquants : ${missing.join(', ')}.`);
        }
        const res = flow.documentsId
          ? await eleveService.updateDocuments(flow.documentsId, eleveId, values)
          : await eleveService.createDocuments(eleveId, values);
        flow.documentsId = res?.data?.id ?? flow.documentsId;
        persistFlow();
        return;
      }

      if (apiKey === 'contacts-parents') {
        const res = flow.contactsParentsId
          ? await eleveService.updateContactsParents(flow.contactsParentsId, eleveId, values)
          : await eleveService.createContactsParents(eleveId, values);
        flow.contactsParentsId = res?.data?.id ?? flow.contactsParentsId;
        persistFlow();
        return;
      }

      if (apiKey === 'dossier-sante') {
        const res = flow.dossierSanteId
          ? await eleveService.updateDossierSante(flow.dossierSanteId, eleveId, values)
          : await eleveService.createDossierSante(eleveId, values);
        flow.dossierSanteId = res?.data?.id ?? flow.dossierSanteId;
        persistFlow();
        return;
      }

      if (apiKey === 'dossier-militaire') {
        const res = flow.dossierMilitaireId
          ? await eleveService.updateDossierMilitaire(flow.dossierMilitaireId, eleveId, values)
          : await eleveService.createDossierMilitaire(eleveId, values);
        flow.dossierMilitaireId = res?.data?.id ?? flow.dossierMilitaireId;
        persistFlow();
        return;
      }

      if (apiKey === 'hebergement') {
        const res = flow.hebergementId
          ? await eleveService.updateHebergement(flow.hebergementId, eleveId, values)
          : await eleveService.createHebergement(eleveId, values);
        flow.hebergementId = res?.data?.id ?? flow.hebergementId;
        persistFlow();
      }
    },
    [],
  );

  if (!perms.canCreateStudent) {
    return (
      <div className="grid grid-cols-1 gap-6 md:gap-8 xl:grid-cols-12 xl:gap-x-8">
        <nav className="text-base text-text-light xl:col-span-12">
          <Link to="/dashboard" className="hover:text-navy">
            Accueil
          </Link>
          <span className="mx-2">/</span>
          <Link to="/gestion-eleves" className="hover:text-navy">
            Gestion des élèves
          </Link>
          <span className="mx-2">/</span>
          <span className="text-navy font-semibold">Nouvel étudiant</span>
        </nav>

        <div className="xl:col-span-12">
          <Link
            to="/gestion-eleves"
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-navy hover:text-navy/80"
          >
            <ArrowLeft size={18} aria-hidden />
            Retour à la liste
          </Link>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-5 text-amber-900 shadow-sm">
            <h1 className="page-title inline-flex items-center gap-2">
              <ShieldAlert size={26} aria-hidden /> Accès en lecture seule
            </h1>
            <p className="mt-2 text-sm md:text-base">
              Votre rôle actuel (<strong>{ROLE_LABEL[role]}</strong>) ne permet pas de créer un nouvel étudiant.
              Contactez un Superviseur ou un Superadmin pour obtenir l’habilitation correspondante.
            </p>
          </div>
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
        <Link to="/gestion-eleves" className="hover:text-navy">
          Gestion des élèves
        </Link>
        <span className="mx-2">/</span>
        <span className="text-navy font-semibold">Nouvel étudiant</span>
      </nav>

      <div className="xl:col-span-12">
        <Link
          to="/gestion-eleves"
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-navy hover:text-navy/80"
        >
          <ArrowLeft size={18} aria-hidden />
          Retour à la liste
        </Link>
        <div className="mb-6 border-b border-light-gray pb-4">
          <h1 className="page-title">Nouvel étudiant</h1>
          <p className="mt-1 text-sm text-text-light md:text-base">
            Création d’un dossier — formulaire multi-étapes. Vous êtes connecté en tant que{' '}
            <strong className="text-navy">{ROLE_LABEL[role]}</strong>.
          </p>
        </div>
      </div>

      <div className="xl:col-span-12 min-h-0 w-full max-w-full overflow-x-hidden rounded-2xl border border-light-gray bg-white px-3 pb-10 pt-4 shadow-[0_1px_3px_rgba(15,27,51,0.06)] sm:px-8 sm:pb-12 sm:pt-6">
        <FormulaireEleve
          role={role}
          mode="standard"
          persistKey="nouvel-etudiant"
          onStepSubmit={handleStepSubmit}
          onSubmit={async () => {
            resetFlow();
            navigate('/gestion-eleves', { replace: true });
          }}
          onCancel={handleLeave}
        />
      </div>
    </div>
  );
}
