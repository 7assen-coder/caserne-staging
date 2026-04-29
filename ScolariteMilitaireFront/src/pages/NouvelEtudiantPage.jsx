import { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import FormulaireEleve from '../components/eleves/FormulaireEleve';
import { eleveService } from '../services/eleveService';

export default function NouvelEtudiantPage() {
  const navigate = useNavigate();
  const createEleveIdRef = useRef(null);
  const createContextRef = useRef({ eleveId: null });
  const createFlowRef = useRef({
    eleveId: null,
    dossierAcademiqueId: null,
    documentsId: null,
    contactsParentsId: null,
    dossierSanteId: null,
    dossierMilitaireId: null,
    hebergementId: null,
  });

  const resetFlow = () => {
    createEleveIdRef.current = null;
    createContextRef.current = { eleveId: null };
    createFlowRef.current = {
      eleveId: null,
      dossierAcademiqueId: null,
      documentsId: null,
      contactsParentsId: null,
      dossierSanteId: null,
      dossierMilitaireId: null,
      hebergementId: null,
    };
  };

  const handleLeave = () => {
    resetFlow();
    navigate('/eleves', { replace: false });
  };

  return (
    <div className="grid grid-cols-1 gap-6 md:gap-8 xl:grid-cols-12 xl:gap-x-8">
      <nav className="text-base text-text-light xl:col-span-12">
        <Link to="/dashboard" className="hover:text-navy">
          Accueil
        </Link>
        <span className="mx-2">/</span>
        <Link to="/eleves" className="hover:text-navy">
          Étudiants
        </Link>
        <span className="mx-2">/</span>
        <span className="text-navy font-semibold">Nouvel étudiant</span>
      </nav>

      <div className="xl:col-span-12">
        <Link
          to="/eleves"
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-navy hover:text-navy/80"
        >
          <ArrowLeft size={18} aria-hidden />
          Retour à la liste
        </Link>
        <div className="mb-6 border-b border-light-gray pb-4">
          <h1 className="page-title">Nouvel étudiant</h1>
          <p className="mt-1 text-sm text-text-light md:text-base">
            Création d&apos;un dossier — formulaire multi-étapes
          </p>
        </div>
      </div>

      <div className="xl:col-span-12 min-h-0 w-full max-w-full overflow-x-hidden rounded-2xl border border-light-gray bg-white px-3 pb-10 pt-4 shadow-[0_1px_3px_rgba(15,27,51,0.06)] sm:px-8 sm:pb-12 sm:pt-6">
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
                createContextRef.current = { eleveId: created.id };
              }
              return;
            }
            const eleveId = flow.eleveId || createEleveIdRef.current || createContextRef.current.eleveId;
            if (!eleveId) throw new Error('Création élève non effectuée.');
            if (step === 1) {
              const res = flow.dossierAcademiqueId
                ? await eleveService.updateDossierAcademique(flow.dossierAcademiqueId, eleveId, values)
                : await eleveService.createDossierAcademique(eleveId, values);
              flow.dossierAcademiqueId = res?.data?.id ?? flow.dossierAcademiqueId;
            }
            if (step === 2) {
              const p = values.pieces || {};
              const requiredFiles = [
                { key: 'photoIdentite', label: 'Photo d’identité', value: p.photoIdentite },
                { key: 'carteIdentite', label: 'Carte d’identité', value: p.carteIdentite },
                { key: 'releveNotesSemestres', label: 'Acte de naissance (fichier lié)', value: p.releveNotesSemestres },
                { key: 'releveBac', label: 'Diplôme d’accès (fichier lié)', value: p.releveBac },
                { key: 'diplomeBac', label: 'Diplôme Bac', value: p.diplomeBac },
              ];
              const missing = requiredFiles.filter((f) => !(f.value instanceof File)).map((f) => f.label);
              if (missing.length > 0) {
                throw new Error(`Fichiers obligatoires manquants: ${missing.join(', ')}.`);
              }
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
          }}
          onSubmit={async (values) => {
            const flow = createFlowRef.current;
            const eleveId = flow.eleveId || createEleveIdRef.current || createContextRef.current.eleveId;
            if (!eleveId) {
              throw new Error("L'étudiant doit être créé à l'étape 1");
            }
            const hebergementRes = flow.hebergementId
              ? await eleveService.updateHebergement(flow.hebergementId, eleveId, values)
              : await eleveService.createHebergement(eleveId, values);
            flow.hebergementId = hebergementRes?.data?.id ?? flow.hebergementId;
            resetFlow();
            navigate('/eleves', { replace: true });
          }}
          onCancel={handleLeave}
        />
      </div>
    </div>
  );
}
