import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, FileText, Upload as UploadIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Button from '../common/Button';
import SelectField from '../common/SelectField';
import CloudUploadZone from './CloudUploadZone';
import { DEPARTEMENTS } from '../../utils/constants';
import { formatApiError, isVersionConflict } from '../../utils/apiErrors';
import VersionConflictModal from '../common/VersionConflictModal';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import {
  SERIE_BAC_OPTIONS,
  validateEleveStep,
  validateSubmitSteps,
  sanitizeMatricule,
  sanitizeNni,
  sanitizeNumBac,
  sanitizeDecimal,
  formatMoyenneFr,
  getLiveFieldError,
} from '../../utils/eleveFormValidation';
import { sanitizeDateFrInput, formatIsoToFr, parseFrToIso } from '../../utils/dateFr';
import { sanitizeMrPhoneDigits, blockNonDigitKey } from '../../utils/mrPhone';
import {
  VOIES_ACCES_OPTIONS,
  DIPLOMES_ACCES_OPTIONS,
  GROUPES_SANGUINS_OPTIONS,
  ROLE_STEPS_VISIBLES,
} from '../../data/etudiantOptions';
import {
  NIVEAUX_FORM_OPTIONS,
  STATUT_ACADEMIQUE_OPTIONS,
  applyAutoMilitaire,
  isNiveauMobiliteEligible,
  mobiliteTypeFromNiveau,
  normalizeStatutFormValue,
  statutAcademiqueToParcours,
  normalizeSectionLabel,
  formatSectionLabel,
} from '../../utils/eleveScolariteAuto';
import { PAYS_OPTIONS } from '../../data/pays';
import { WILAYAS_OPTIONS, getCommuneOptionsForWilaya, COMMUNE_AUTRE_VALUE } from '../../data/wilayasMauritanie';
import { computeIMC, classifyIMC, formatIMC } from '../../utils/imc';
import { formatListField } from '../../utils/listField';
import { getCurrentAcademicYear, getAcademicYearOptions, todayIso, deriveMobiliteAnneeFin } from '../../utils/anneeUniversitaire';
import {
  generateFicheTaillesPdf,
  importFicheMesures,
  mesuresToFormEntries,
} from '../../utils/ficheTaillesPdf';
import { loadNouvelEtudiantDraft, saveNouvelEtudiantDraft } from '../../utils/nouvelEtudiantPersistence';
import { useAuth } from '../../hooks/useAuth';
import { getSensitiveCaps } from '../../utils/userRole';

const ALL_STEPS = [
  { key: 'etat-civil', label: 'État civil', labelKey: 'stepEtatCivil' },
  { key: 'scolarite', label: 'Scolarité', labelKey: 'scolarite' },
  { key: 'mobilite', label: 'Mobilité', labelKey: 'stepMobilite' },
  { key: 'pieces', label: 'Pièces', labelKey: 'stepPieces' },
  { key: 'contacts', label: 'Informations de contact', labelKey: 'stepContacts' },
  { key: 'sante', label: 'Santé', labelKey: 'stepSante' },
  { key: 'militaire', label: 'Dossier militaire', labelKey: 'stepMilitaire' },
  { key: 'hebergement', label: 'Hébergement', labelKey: 'stepHebergement' },
];

function buildSteps({ role, mode, values, sensitiveCaps }) {
  const allowed = new Set(ROLE_STEPS_VISIBLES[role] || ROLE_STEPS_VISIBLES.superviseur);
  const showMobilite =
    mode === 'mobilite'
    || isNiveauMobiliteEligible(values?.scolarite?.niveau);
  return ALL_STEPS.filter((s) => {
    if (s.key === 'mobilite') return showMobilite;
    if (s.key === 'sante' && sensitiveCaps?.sante === 'none') return false;
    if (s.key === 'contacts' && sensitiveCaps?.parents === 'none') return false;
    return allowed.has(s.key);
  });
}

const DEFAULT_FILIERE = DEPARTEMENTS[0].value;

function buildDefaults() {
  const filiere = DEFAULT_FILIERE;
  const niveau = '3e année';
  const autoMil = applyAutoMilitaire(filiere, niveau);
  return {
    matricule: '',
    nom: '',
    prenom: '',
    nomAr: '',
    prenomAr: '',
    nni: '',
    numeroBac: '',
    dateNaissance: '',
    lieuNaissance: '',
    wilayaNaissance: '',
    communeNaissance: '',
    communeNaissanceLibre: '',
    nationalite: 'Mauritanie',
    categorieBac: 'National',
    serieBac: '',
    moyenneBac: '',
    ecoleBac: '',
    anneePremiereInscription: getCurrentAcademicYear(),
    datePremiereInscription: todayIso(),
    residentAvecParents: '',
    compteBankily: '',
    sexe: 'M',
    statut: 'normal',
    profilIncomplet: false,
    filiere,
    scolarite: {
      departement: filiere,
      filiere,
      niveau,
      anneeUni1ere: getCurrentAcademicYear(),
      voieAcces: '',
      diplomeAcces: '',
      etablissementPremierCycle: '',
      parcours: 'En cours normal',
    },
    mobilite: {
      type: '',
      etablissement: '',
      specialite: '',
      anneeDebut: '',
      anneeFin: '',
    },
    pieces: {
      photoIdentite: null,
      acteNaissance: null,
      diplomeAcces: null,
      diplomeBac: null,
      cin: null,
      photoIdentiteMilitaire: null,
      photoIdentiteCivile: null,
      photoMilitaireIntegrale: null,
    },
    parents: {
      prenomPere: '',
      nomFamillePere: '',
      fonctionPere: '',
      prenomMere: '',
      nomMere: '',
      fonctionMere: '',
    },
    sante: {
      groupeSanguin: '',
      assureur: '',
      numeroAssure: '',
      antecedents: '',
      maladiesChroniques: '',
      medicaments: '',
      poids: '',
      tailleCm: '',
      imc: '',
    },
    dossierMilitaire: {
      compagnie: autoMil.compagnie,
      section: autoMil.section,
      sportPratique: '',
      tourPoitrine: '',
      tourCeinture: '',
      tourTaille: '',
      tourBassin: '',
      tourCou: '',
      longueurManche: '',
      longueurDos: '',
      longueurCote: '',
      pointure: '',
      ficheTaillesScan: null,
    },
    contact: {
      telephone: '',
      tel2: '',
      emailPro: '',
      emailPerso: '',
      adresse: '',
      adresseSecondaire: '',
      telPere: '',
      telPereWhatsapp: '',
      telMere: '',
      telMereWhatsapp: '',
      nomUrgence: '',
      telUrgence: '',
      telUrgenceWhatsapp: '',
    },
    hebergement: {
      batiment: 'Résidence 1',
      etage: '',
      aile: '',
      chambre: '',
      lit: '',
      responsableChambre: false,
      responsableAile: false,
      responsableEtage: false,
    },
    dossier: [],
  };
}

function deepMerge(a, b) {
  if (!b || typeof b !== 'object') return a;
  const out = Array.isArray(a) ? [...a] : { ...a };
  for (const k of Object.keys(b)) {
    if (b[k] != null && typeof b[k] === 'object' && !Array.isArray(b[k]) && typeof a[k] === 'object' && a[k] != null) {
      out[k] = deepMerge(a[k], b[k]);
    } else {
      out[k] = b[k];
    }
  }
  return out;
}

function setPath(obj, pathParts, value) {
  if (pathParts.length === 1) return { ...obj, [pathParts[0]]: value };
  const [head, ...rest] = pathParts;
  return {
    ...obj,
    [head]: setPath(obj[head] && typeof obj[head] === 'object' ? obj[head] : {}, rest, value),
  };
}

function normalizePieces(pieces) {
  const p = pieces && typeof pieces === 'object' ? { ...pieces } : {};
  return {
    photoIdentite: p.photoIdentite ?? null,
    acteNaissance: p.acteNaissance ?? null,
    diplomeAcces: p.diplomeAcces ?? null,
    diplomeBac: p.diplomeBac ?? null,
    photoIdentiteMilitaire: p.photoIdentiteMilitaire ?? null,
    photoIdentiteCivile: p.photoIdentiteCivile ?? null,
    photoMilitaireIntegrale: p.photoMilitaireIntegrale ?? null,
    cin: p.cin ?? null,
  };
}

/** Map API `documents` URLs into form `pieces` slots for edit prefills. */
function piecesFromDocuments(documents) {
  const d = documents && typeof documents === 'object' ? documents : {};
  const civil = d.photo_identite_civile || null;
  return {
    photoIdentite: civil,
    photoIdentiteCivile: civil,
    photoIdentiteMilitaire: d.photo_identite_militaire || null,
    photoMilitaireIntegrale: d.photo_militaire_integrale || null,
    acteNaissance: d.acte_naissance || null,
    diplomeAcces: d.diplome_acces || null,
    diplomeBac: d.diplome_bac || null,
    cin: d.cin || null,
  };
}

function coalescePiece(...candidates) {
  for (const v of candidates) {
    if (v instanceof File) return v;
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (v && typeof v === 'object' && typeof v.url === 'string' && v.url.trim()) {
      return v.url.trim();
    }
  }
  return null;
}

function hydratePieces(eleve, mergedPieces) {
  const docs = piecesFromDocuments(eleve?.documents);
  const p = mergedPieces && typeof mergedPieces === 'object' ? mergedPieces : {};
  return normalizePieces({
    photoIdentite: coalescePiece(p.photoIdentite, p.photoIdentiteCivile, docs.photoIdentite, eleve?.photoUrl),
    photoIdentiteCivile: coalescePiece(p.photoIdentiteCivile, p.photoIdentite, docs.photoIdentiteCivile, eleve?.photoUrl),
    photoIdentiteMilitaire: coalescePiece(p.photoIdentiteMilitaire, docs.photoIdentiteMilitaire),
    photoMilitaireIntegrale: coalescePiece(p.photoMilitaireIntegrale, docs.photoMilitaireIntegrale),
    acteNaissance: coalescePiece(p.acteNaissance, docs.acteNaissance),
    diplomeAcces: coalescePiece(p.diplomeAcces, docs.diplomeAcces),
    diplomeBac: coalescePiece(p.diplomeBac, docs.diplomeBac),
    cin: coalescePiece(p.cin, docs.cin),
  });
}

function formatEmailInstitutionnel(matricule) {
  const d = String(matricule ?? '').replace(/\D/g, '');
  return d ? `${d}@esp.mr` : '';
}

function FormPanel({ children, className = '' }) {
  return (
    <div
      className={`min-w-0 max-w-full overflow-x-hidden rounded-xl border border-light-gray bg-white p-4 shadow-sm sm:rounded-2xl sm:p-5 md:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

function formatAffectation(compagnie, section) {
  const parts = [
    String(compagnie ?? '').trim(),
    formatSectionLabel(section, compagnie),
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : '';
}

export default function FormulaireEleve({
  eleve,
  onSubmit,
  onCancel,
  onStepSubmit,
  role = 'superviseur',
  mode = 'standard',
  persistKey = '',
}) {
  const { t } = useTranslation('eleves');
  const confirm = useConfirm();
  const toast = useToast();
  const { user } = useAuth();
  const sensitiveCaps = useMemo(
    () => getSensitiveCaps(user, role),
    [user, role],
  );
  const draftRef = useRef(null);
  if (!draftRef.current && persistKey && !eleve) {
    draftRef.current = loadNouvelEtudiantDraft();
  }

  const [values, setValues] = useState(() => {
    let base = eleve ? deepMerge(buildDefaults(), eleve) : buildDefaults();
    if (!eleve && draftRef.current?.values) {
      base = deepMerge(base, draftRef.current.values);
    }
    base.pieces = hydratePieces(eleve, base.pieces);
    base.statut = normalizeStatutFormValue(base.statut);
    base.scolarite = {
      ...base.scolarite,
      parcours: statutAcademiqueToParcours(base.statut),
    };
    const autoMil = applyAutoMilitaire(base.scolarite?.filiere, base.scolarite?.niveau);
    base.dossierMilitaire = {
      ...base.dossierMilitaire,
      compagnie: base.dossierMilitaire?.compagnie || autoMil.compagnie,
      section: base.dossierMilitaire?.section || autoMil.section,
    };
    return base;
  });

  const STEPS = useMemo(
    () => buildSteps({ role, mode, values, sensitiveCaps }),
    [role, mode, values.scolarite?.niveau, sensitiveCaps],
  );
  const stepKeys = useMemo(() => STEPS.map((s) => s.key), [STEPS]);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(() => {
    if (!eleve && draftRef.current?.step != null) return draftRef.current.step;
    return 0;
  });
  const [stepError, setStepError] = useState('');
  const [submitErr, setSubmitErr] = useState('');
  const [versionConflict, setVersionConflict] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [scanInfo, setScanInfo] = useState('');

  useEffect(() => {
    if (!persistKey || eleve) return;
    const timer = window.setTimeout(() => {
      saveNouvelEtudiantDraft({ step, values });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [persistKey, eleve, step, values]);

  useEffect(() => {
    if (step >= STEPS.length) {
      setStep(Math.max(0, STEPS.length - 1));
    }
  }, [STEPS.length, step]);

  useEffect(() => {
    setValues((prev) => {
      const autoMil = applyAutoMilitaire(prev.scolarite?.filiere, prev.scolarite?.niveau);
      if (
        autoMil.compagnie === prev.dossierMilitaire?.compagnie
        && autoMil.section === prev.dossierMilitaire?.section
      ) {
        return prev;
      }
      return {
        ...prev,
        dossierMilitaire: {
          ...prev.dossierMilitaire,
          compagnie: autoMil.compagnie,
          section: autoMil.section,
        },
      };
    });
  }, [values.scolarite?.filiere, values.scolarite?.niveau]);

  // Sync / clear mobilité when niveau changes (strict eligibility).
  useEffect(() => {
    const niveau = values.scolarite?.niveau;
    const eligible = isNiveauMobiliteEligible(niveau);
    const lockedType = mobiliteTypeFromNiveau(niveau);
    setValues((prev) => {
      const m = prev.mobilite || {};
      if (eligible) {
        if (m.type === lockedType) return prev;
        return {
          ...prev,
          mobilite: { ...m, type: lockedType },
        };
      }
      if (!m.type && !m.anneeDebut && !m.anneeFin && !m.etablissement && !m.specialite) {
        return prev;
      }
      return {
        ...prev,
        mobilite: {
          type: '',
          etablissement: '',
          specialite: '',
          anneeDebut: '',
          anneeFin: '',
        },
      };
    });
  }, [values.scolarite?.niveau]);

  useEffect(() => {
    const main = document.getElementById('main-content');
    if (main) {
      main.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [step]);

  const validationOptions = useMemo(
    () => ({
      stepKeys,
      mode,
      isCreate: !eleve,
      isEdit: Boolean(eleve),
      eleve: eleve || null,
      previousMatricule: eleve?.matricule ?? null,
      allowIncomplete: Boolean(eleve?.profilIncomplet || values.profilIncomplet),
    }),
    [stepKeys, mode, eleve, values.profilIncomplet],
  );

  const update = (path, v) => {
    setValues((prev) => {
      const nextVals = setPath(prev, path.split('.'), v);
      const liveErr = getLiveFieldError(path, nextVals, {
        isCreate: !eleve,
        previousMatricule: eleve?.matricule ?? null,
      });
      setFieldErrors((prevErr) => {
        const next = { ...prevErr };
        if (liveErr) next[path] = liveErr;
        else delete next[path];
        return next;
      });
      return nextVals;
    });
  };

  const updateMany = (entries) => {
    setValues((prev) => {
      let out = prev;
      for (const [path, v] of entries) {
        out = setPath(out, path.split('.'), v);
      }
      setFieldErrors((prevErr) => {
        const next = { ...prevErr };
        for (const [path] of entries) {
          const liveErr = getLiveFieldError(path, out, {
            isCreate: !eleve,
            previousMatricule: eleve?.matricule ?? null,
          });
          if (liveErr) next[path] = liveErr;
          else delete next[path];
        }
        return next;
      });
      return out;
    });
  };

  const imc = useMemo(
    () => computeIMC(values.sante?.poids, values.sante?.tailleCm),
    [values.sante?.poids, values.sante?.tailleCm],
  );
  const imcKlass = useMemo(() => classifyIMC(imc), [imc]);
  const imcFormatted = useMemo(() => (imc != null ? formatIMC(imc) : ''), [imc]);

  const composedLieuNaissance = useMemo(() => {
    const isMr = (values.nationalite || '').toLowerCase() === 'mauritanie';
    if (!isMr) return values.lieuNaissance || '';
    const communeLabel =
      values.communeNaissance === COMMUNE_AUTRE_VALUE
        ? values.communeNaissanceLibre
        : values.communeNaissance;
    const parts = [communeLabel, values.wilayaNaissance].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : values.lieuNaissance || '';
  }, [
    values.nationalite,
    values.wilayaNaissance,
    values.communeNaissance,
    values.communeNaissanceLibre,
    values.lieuNaissance,
  ]);

  const lockedMobiliteType = mobiliteTypeFromNiveau(values.scolarite?.niveau);

  const augmentMobiliteAnneesFin = (v) => {
    const type = mobiliteTypeFromNiveau(v.scolarite?.niveau) || v.mobilite?.type;
    const fin = deriveMobiliteAnneeFin(v.mobilite?.anneeDebut, type);
    return {
      ...v,
      mobilite: { ...v.mobilite, type: type || '', anneeFin: fin || '' },
    };
  };

  const mobiliteAnneeFinDerived = deriveMobiliteAnneeFin(
    values.mobilite?.anneeDebut,
    lockedMobiliteType || values.mobilite?.type,
  );

  const submit = async (e) => {
    e.preventDefault();
    setSubmitErr('');
    const fin = validateSubmitSteps(values, validationOptions);
    if (!fin.ok) {
      setStep(fin.firstStep);
      setFieldErrors(fin.errors);
      const msg = Object.values(fin.errors)[0] || 'Vérifiez les étapes du formulaire.';
      setSubmitErr(msg);
      toast.warning(msg);
      return;
    }

    if (!eleve) {
      const ok = await confirm({
        title: 'Confirmer la création',
        message: `Créer le dossier de ${values.prenom} ${values.nom} (matricule ${values.matricule}) ?`,
        confirmLabel: 'Créer l’étudiant',
        cancelLabel: 'Annuler',
      });
      if (!ok) return;
    }

    setSubmitting(true);
    try {
      let finalValues = {
        ...values,
        lieuNaissance: composedLieuNaissance || values.lieuNaissance || '',
        sante: { ...values.sante, imc: imcFormatted },
      };
      if (isNiveauMobiliteEligible(finalValues.scolarite?.niveau)) {
        finalValues = augmentMobiliteAnneesFin(finalValues);
      }
      if (onStepSubmit) {
        await onStepSubmit(stepKeys[step], finalValues, { stepIndex: step, isFinal: true });
      }
      const emailSync = finalValues.contact?.emailPerso || finalValues.contact?.emailPro || '';
      await onSubmit?.({
        ...finalValues,
        contact: { ...finalValues.contact, email: emailSync },
        pieces: finalValues.pieces,
      });
      toast.success(eleve ? 'Dossier enregistré avec succès.' : 'Étudiant créé avec succès.');
    } catch (err) {
      if (isVersionConflict(err)) {
        setVersionConflict(err.response?.data || { detail: formatApiError(err) });
        toast.error(formatApiError(err));
      } else {
        const msg = formatApiError(err);
        setSubmitErr(msg);
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = async () => {
    if (step >= STEPS.length - 1) return;
    setStepError('');
    setSubmitErr('');
    const cur = validateEleveStep(step, values, validationOptions);
    if (!cur.ok) {
      setFieldErrors(cur.errors);
      const msg = Object.values(cur.errors)[0] || 'Vérifiez les champs en rouge.';
      setStepError(msg);
      toast.warning(msg);
      return;
    }
    setFieldErrors({});
    const nextStep = step + 1;
    let stepValues = {
      ...values,
      lieuNaissance: composedLieuNaissance || values.lieuNaissance || '',
      sante: { ...values.sante, imc: imcFormatted },
    };
    if (isNiveauMobiliteEligible(stepValues.scolarite?.niveau) && stepKeys[step] === 'mobilite') {
      stepValues = augmentMobiliteAnneesFin(stepValues);
    }
    if (onStepSubmit) {
      setSubmitting(true);
      try {
        await onStepSubmit(stepKeys[step], stepValues, { stepIndex: step });
        setStep(nextStep);
      } catch (err) {
        const msg = formatApiError(err);
        setStepError(msg);
        toast.error(msg);
      } finally {
        setSubmitting(false);
      }
      return;
    }
    setStep(nextStep);
  };

  const filiereOptions = DEPARTEMENTS;
  const niveauOptions = NIVEAUX_FORM_OPTIONS;
  const anneeUniOptions = getAcademicYearOptions();
  const anneeMobiliteOptions = [{ value: '', label: '— Sélectionner —' }, ...anneeUniOptions];
  const isMauritanien = (values.nationalite || '').toLowerCase() === 'mauritanie';
  const communeOptions = useMemo(
    () => getCommuneOptionsForWilaya(values.wilayaNaissance),
    [values.wilayaNaissance],
  );

  const handleScanFiche = async (file) => {
    update('dossierMilitaire.ficheTaillesScan', file);
    setScanInfo('');
    if (!file || !(file instanceof File)) return;
    try {
      const { values, method } = await importFicheMesures(file);
      const entries = mesuresToFormEntries(values);
      if (entries.length > 0) {
        updateMany(entries);
        const methodKey =
          method === 'payload'
            ? 'scanFilledPayload'
            : method === 'ocr'
              ? 'scanFilledOcr'
              : 'scanFilledText';
        setScanInfo(t(methodKey, { count: entries.length }));
      } else if (/\.pdf$/i.test(file.name) || /pdf/i.test(file.type)) {
        setScanInfo(t('scanAttachedNoParse'));
      } else {
        setScanInfo(t('scanNoMeasures'));
      }
    } catch {
      setScanInfo(t('scanReadError'));
    }
  };

  const handleGenerateFiche = async () => {
    try {
      await generateFicheTaillesPdf({
        eleve: values,
        mensurations: values.dossierMilitaire,
        poids: values.sante?.poids,
        taille: values.sante?.tailleCm,
      });
      toast.success('Fiche mesure téléchargée.');
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const stepKey = stepKeys[step];

  return (
    <form onSubmit={submit} className="flex min-h-0 w-full min-w-0 max-w-full flex-col gap-4 pb-[max(5.5rem,env(safe-area-inset-bottom))] sm:gap-5 sm:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <VersionConflictModal
        open={!!versionConflict}
        message={versionConflict?.detail}
        onReload={() => {
          setVersionConflict(null);
          window.location.reload();
        }}
        onClose={() => setVersionConflict(null)}
      />
      <div className="w-full min-w-0 max-w-full overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
        <div className="relative flex w-max min-w-full items-start justify-between gap-1 border-b border-light-gray pb-4 sm:w-full sm:gap-2">
          <div
            className="pointer-events-none absolute left-[10%] right-[10%] top-[15px] hidden h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent sm:block"
            aria-hidden
          />
          {STEPS.map((s, i) => {
            const isEdit = Boolean(eleve);
            const done = i < step;
            const act = i === step;
            const clickable = isEdit || i <= step;
            return (
              <button
                key={s.key}
                type="button"
                disabled={!clickable}
                onClick={() => {
                  if (!clickable) return;
                  if (isEdit) {
                    setStep(i);
                    setStepError('');
                    setFieldErrors({});
                    return;
                  }
                  if (i < step) setStep(i);
                }}
                className={`relative z-[1] flex w-[4.5rem] min-w-0 flex-col items-center gap-1.5 sm:w-auto sm:flex-1 ${
                  clickable ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold shadow-lg transition sm:h-10 sm:w-10 ${act
                      ? 'border-gold bg-amber-50 text-gold-700 ring-2 ring-gold/20'
                      : done || isEdit
                        ? 'border-esp-green/50 bg-emerald-50 text-emerald-700'
                        : 'border-light-gray bg-off-white text-slate-600'
                    }`}
                >
                  {done && !act ? <Check size={17} strokeWidth={2.5} /> : i + 1}
                </span>
                <span
                  className={`max-w-full truncate text-center text-[10px] leading-tight sm:whitespace-normal sm:text-xs ${act ? 'font-semibold text-slate-900' : done || isEdit ? 'text-slate-700' : 'text-slate-500'
                    }`}
                >
                  {s.labelKey ? t(s.labelKey) : s.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 space-y-4 sm:space-y-5">
        {(stepError || submitErr) && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium leading-snug text-red-800 sm:px-4">
            {submitErr || stepError}
          </div>
        )}

        {stepKey === 'etat-civil' && (
          <>
            <FormPanel>
              <h4 className="mb-4 border-b border-light-gray pb-2 font-serif text-sm font-semibold tracking-wide text-slate-900">
                {t('identity')}
              </h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3">
                <Field
                  label={t('matricule')}
                  value={values.matricule}
                  onChange={(v) => update('matricule', sanitizeMatricule(v))}
                  required
                  error={fieldErrors.matricule}
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={6}
                  onKeyDown={blockNonDigitKey}
                  placeholder="251280"
                />
                <Field label={t('nom')} value={values.nom} onChange={(v) => update('nom', v)} required error={fieldErrors.nom} />
                <Field label={t('prenom')} value={values.prenom} onChange={(v) => update('prenom', v)} required error={fieldErrors.prenom} />
                <Field
                  label={t('nni')}
                  value={values.nni}
                  onChange={(v) => update('nni', sanitizeNni(v))}
                  required={sensitiveCaps.edit_nni}
                  error={fieldErrors.nni}
                  inputMode="numeric"
                  maxLength={10}
                  onKeyDown={blockNonDigitKey}
                  placeholder={sensitiveCaps.nni === 'masked' ? t('nniMasked') : '0123456789'}
                  disabled={!sensitiveCaps.edit_nni}
                />
                <SelectField
                  label={t('sexe')}
                  value={values.sexe}
                  onChange={(v) => update('sexe', v)}
                  required
                  error={fieldErrors.sexe}
                  options={[
                    { value: 'M', label: 'M' },
                    { value: 'F', label: 'F' },
                  ]}
                />
                <DateNaissanceField
                  label={t('dateNaissance')}
                  value={values.dateNaissance}
                  onChange={(iso) => update('dateNaissance', iso)}
                  onPartialChange={(fr) => {
                    const err = fr && !parseFrToIso(fr)
                      ? (fr.length >= 10 ? 'Indiquez une date valide (JJ/MM/AAAA).' : '')
                      : '';
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      if (err) next.dateNaissance = err;
                      else delete next.dateNaissance;
                      return next;
                    });
                  }}
                  required
                  error={fieldErrors.dateNaissance}
                />
                <SelectField
                  label={t('nationalite')}
                  value={values.nationalite}
                  onChange={(v) => update('nationalite', v)}
                  options={PAYS_OPTIONS}
                  required
                  error={fieldErrors.nationalite}
                />
                {isMauritanien ? (
                  <>
                    <SelectField
                      label={t('wilayaNaissance')}
                      value={values.wilayaNaissance}
                      onChange={(v) => updateMany([
                        ['wilayaNaissance', v],
                        ['communeNaissance', ''],
                      ])}
                      options={WILAYAS_OPTIONS}
                      required
                      error={fieldErrors.wilayaNaissance}
                    />
                    <SelectField
                      label={t('communeNaissance')}
                      value={values.communeNaissance}
                      onChange={(v) => updateMany([
                        ['communeNaissance', v],
                        ['communeNaissanceLibre', v === COMMUNE_AUTRE_VALUE ? values.communeNaissanceLibre : ''],
                      ])}
                      options={communeOptions}
                      required
                      error={fieldErrors.communeNaissance}
                    />
                    {values.communeNaissance === COMMUNE_AUTRE_VALUE ? (
                      <Field
                        label={t('autreCommune')}
                        value={values.communeNaissanceLibre}
                        onChange={(v) => update('communeNaissanceLibre', v)}
                        required
                        error={fieldErrors.communeNaissanceLibre}
                      />
                    ) : null}
                  </>
                ) : (
                  <Field
                    label={t('lieuNaissance')}
                    value={values.lieuNaissance}
                    onChange={(v) => update('lieuNaissance', v)}
                    required
                    error={fieldErrors.lieuNaissance}
                  />
                )}
              </div>
            </FormPanel>

            <FormPanel>
              <h4 className="mb-4 border-b border-light-gray pb-2 font-serif text-sm font-semibold tracking-wide text-slate-900">
                {t('baccalaureat')}
              </h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3">
                <Field
                  label={t('numeroBac')}
                  value={values.numeroBac}
                  onChange={(v) => update('numeroBac', sanitizeNumBac(v))}
                  required
                  error={fieldErrors.numeroBac}
                  inputMode="numeric"
                  maxLength={5}
                  onKeyDown={blockNonDigitKey}
                  placeholder="1 à 5 chiffres"
                />
                <SelectField
                  label={t('categorieBac')}
                  value={values.categorieBac}
                  onChange={(v) => update('categorieBac', v)}
                  options={[
                    { value: 'National', label: 'National' },
                    { value: 'Etranger', label: 'Étranger' },
                  ]}
                />
                <SelectField
                  label={t('serieBac')}
                  value={values.serieBac ?? ''}
                  onChange={(v) => update('serieBac', v)}
                  options={SERIE_BAC_OPTIONS}
                  required
                  error={fieldErrors.serieBac}
                />
                <Field
                  label={t('moyenneBac')}
                  value={values.moyenneBac}
                  onChange={(v) => update('moyenneBac', sanitizeDecimal(v).replace('.', ','))}
                  onBlur={() => {
                    setValues((prev) => {
                      const formatted = formatMoyenneFr(prev.moyenneBac);
                      if (!formatted || formatted === prev.moyenneBac) return prev;
                      return { ...prev, moyenneBac: formatted };
                    });
                  }}
                  required
                  error={fieldErrors.moyenneBac}
                  placeholder="12,50"
                  inputMode="decimal"
                />
                <Field label={t('ecoleBac')} value={values.ecoleBac} onChange={(v) => update('ecoleBac', v)} required error={fieldErrors.ecoleBac} />
              </div>
            </FormPanel>
          </>
        )}

        {stepKey === 'scolarite' && (
          <FormPanel>
            <h4 className="mb-4 border-b border-light-gray pb-2 font-serif text-sm font-semibold tracking-wide text-slate-900">
              {t('scolarite')}
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3">
              <SelectField
                label={t('departement')}
                value={values.scolarite.filiere}
                onChange={(v) => updateMany([
                  ['scolarite.filiere', v],
                  ['scolarite.departement', v],
                  ['filiere', v],
                ])}
                options={filiereOptions}
                required
                error={fieldErrors['scolarite.filiere']}
              />
              <SelectField
                label={t('niveauActuel')}
                value={values.scolarite.niveau}
                onChange={(v) => update('scolarite.niveau', v)}
                options={niveauOptions}
                required
                error={fieldErrors['scolarite.niveau']}
              />
              <SelectField
                label={t('statutAcademique')}
                value={values.statut}
                onChange={(v) => updateMany([
                  ['statut', v],
                  ['scolarite.parcours', statutAcademiqueToParcours(v)],
                ])}
                options={STATUT_ACADEMIQUE_OPTIONS}
                required
                error={fieldErrors.statut}
              />
              <SelectField
                label={t('anneeUni1ere')}
                value={values.scolarite.anneeUni1ere}
                onChange={(v) => updateMany([
                  ['scolarite.anneeUni1ere', v],
                  ['anneePremiereInscription', v],
                ])}
                options={anneeUniOptions}
                required
                error={fieldErrors['scolarite.anneeUni1ere']}
              />
              <Field
                label={t('datePremiereInscription')}
                type="date"
                value={values.datePremiereInscription}
                onChange={(v) => update('datePremiereInscription', v)}
                required
                error={fieldErrors.datePremiereInscription}
              />
              <SelectField
                label={t('voieAcces')}
                value={values.scolarite.voieAcces}
                onChange={(v) => update('scolarite.voieAcces', v)}
                options={VOIES_ACCES_OPTIONS}
                required
                error={fieldErrors['scolarite.voieAcces']}
              />
              <SelectField
                label={t('diplomeAcces')}
                value={values.scolarite.diplomeAcces}
                onChange={(v) => update('scolarite.diplomeAcces', v)}
                options={DIPLOMES_ACCES_OPTIONS}
                required
                error={fieldErrors['scolarite.diplomeAcces']}
              />
              <Field
                label={t('etablissement')}
                value={values.scolarite.etablissementPremierCycle}
                onChange={(v) => update('scolarite.etablissementPremierCycle', v)}
              />
              <ReadOnlyField
                label={t('affectation')}
                value={formatAffectation(
                  values.dossierMilitaire.compagnie,
                  values.dossierMilitaire.section,
                )}
              />
            </div>
          </FormPanel>
        )}

        {stepKey === 'mobilite' && (
          <FormPanel>
            <h4 className="mb-4 border-b border-light-gray pb-2 font-serif text-sm font-semibold tracking-wide text-slate-900">
              {t('mobiliteInternationale')}
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="min-w-0">
                <ReadOnlyField
                  label={t('typeMobilite')}
                  value={lockedMobiliteType || values.mobilite.type}
                />
              </div>
              <div className="min-w-0">
                <Field
                  label={t('etablissementAccueil')}
                  value={values.mobilite.etablissement}
                  onChange={(v) => update('mobilite.etablissement', v)}
                  required
                  error={fieldErrors['mobilite.etablissement']}
                />
              </div>
              <div className="min-w-0 sm:col-span-2">
                <Field
                  label={t('specialiteMobilite')}
                  value={values.mobilite.specialite}
                  onChange={(v) => update('mobilite.specialite', v)}
                  required
                  error={fieldErrors['mobilite.specialite']}
                />
              </div>
              <div className="col-span-full grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <div className="min-w-0">
                  <SelectField
                    label={t('anneeUnivDebut')}
                    value={values.mobilite.anneeDebut}
                    onChange={(v) => update('mobilite.anneeDebut', v)}
                    options={anneeMobiliteOptions}
                  />
                </div>
                <div className="min-w-0">
                  <ReadOnlyField
                    label={t('anneeFin')}
                    value={mobiliteAnneeFinDerived}
                  />
                </div>
              </div>
            </div>
          </FormPanel>
        )}

        {stepKey === 'pieces' && (
          <FormPanel className="!p-4 sm:!p-6">
            <h4 className="mb-1 border-b border-light-gray pb-2 font-serif text-sm font-semibold tracking-wide text-slate-900">
              {t('piecesTitre')}
            </h4>
            <p className="mb-5 max-w-2xl text-xs leading-relaxed text-text-light">
              {t('piecesIntro')}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <CloudUploadZone
                variant="light"
                label={t('photoIdentite')}
                hint={t('hintPhotoAuto')}
                value={values.pieces.photoIdentite}
                onChange={(f) => update('pieces.photoIdentite', f)}
                accept="image/jpeg,image/png,image/webp,image/*"
                kind="photo"
              />
              <CloudUploadZone
                variant="light"
                label={t('cin')}
                hint={t('hintDocAuto')}
                value={values.pieces.cin}
                onChange={(f) => update('pieces.cin', f)}
              />
              <CloudUploadZone
                variant="light"
                label={t('acteNaissance')}
                hint={t('hintDocAuto')}
                value={values.pieces.acteNaissance}
                onChange={(f) => update('pieces.acteNaissance', f)}
              />
              <CloudUploadZone
                variant="light"
                label={t('diplomeAccesPiece')}
                hint={t('hintDocAuto')}
                value={values.pieces.diplomeAcces}
                onChange={(f) => update('pieces.diplomeAcces', f)}
              />
              <CloudUploadZone
                variant="light"
                label={t('diplomeBac')}
                hint={t('hintDocAuto')}
                value={values.pieces.diplomeBac}
                onChange={(f) => update('pieces.diplomeBac', f)}
              />
              <CloudUploadZone
                variant="light"
                label={t('photoIdentiteMilitaire')}
                hint={t('hintPhotoAuto')}
                value={values.pieces.photoIdentiteMilitaire}
                onChange={(f) => update('pieces.photoIdentiteMilitaire', f)}
                accept="image/jpeg,image/png,image/webp,image/*"
                kind="photo"
              />
              <CloudUploadZone
                className="sm:col-span-2"
                variant="light"
                label={t('photoMilitaireIntegrale')}
                hint={t('hintPhotoAuto')}
                value={values.pieces.photoMilitaireIntegrale}
                onChange={(f) => update('pieces.photoMilitaireIntegrale', f)}
                accept="image/jpeg,image/png,image/webp,image/*"
                kind="photo"
              />
            </div>
          </FormPanel>
        )}

        {stepKey === 'contacts' && (
          <>
            <FormPanel>
              <h4 className="mb-4 border-b border-light-gray pb-2 font-serif text-sm font-semibold tracking-wide text-slate-900">
                {t('informationsContact')}
              </h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <div className="min-w-0 sm:col-span-2">
                  <Field
                    label={t('adressePrimaire')}
                    value={values.contact.adresse}
                    onChange={(v) => update('contact.adresse', v)}
                    required
                    error={fieldErrors['contact.adresse']}
                  />
                </div>
                <div className="min-w-0 sm:col-span-2">
                  <Field
                    label={t('adresseSecondaire')}
                    value={values.contact.adresseSecondaire}
                    onChange={(v) => update('contact.adresseSecondaire', v)}
                  />
                </div>
                <div className="min-w-0">
                  <Field
                    label={t('telephonePrincipal')}
                    value={values.contact.telephone}
                    onChange={(v) => update('contact.telephone', sanitizeMrPhoneDigits(v))}
                    required
                    error={fieldErrors['contact.telephone']}
                    inputMode="numeric"
                    maxLength={8}
                    onKeyDown={blockNonDigitKey}
                    placeholder="31234567"
                  />
                </div>
                <div className="min-w-0">
                  <Field
                    label={t('tel2Whatsapp')}
                    value={values.contact.tel2}
                    onChange={(v) => update('contact.tel2', sanitizeMrPhoneDigits(v))}
                    error={fieldErrors['contact.tel2']}
                    inputMode="numeric"
                    maxLength={8}
                    onKeyDown={blockNonDigitKey}
                  />
                </div>
                <div className="min-w-0">
                  <Field
                    label={t('emailPersonnel')}
                    value={values.contact.emailPerso}
                    onChange={(v) => update('contact.emailPerso', v)}
                    required
                    error={fieldErrors['contact.emailPerso']}
                    inputMode="email"
                    autoComplete="email"
                  />
                </div>
                <div className="min-w-0">
                  <Field
                    label={t('emailInstitutionnel')}
                    value={formatEmailInstitutionnel(values.matricule)}
                    onChange={() => {}}
                    disabled
                  />
                </div>
                <div className="min-w-0 sm:col-span-2">
                  <SelectField
                    label={t('residentAvecParents')}
                    value={values.residentAvecParents}
                    onChange={(v) => update('residentAvecParents', v)}
                    options={[
                      { value: '', label: '—' },
                      { value: 'Oui', label: t('oui') },
                      { value: 'Non', label: t('non') },
                    ]}
                    required
                    error={fieldErrors.residentAvecParents}
                  />
                </div>
              </div>
            </FormPanel>

            <FormPanel>
              <h4 className="mb-4 border-b border-light-gray pb-2 font-serif text-sm font-semibold tracking-wide text-slate-900">
                {t('contactsParentsUrgence')}
              </h4>

              <h5 className="mb-2 mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                {t('parents')}
              </h5>
              <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <div className="min-w-0">
                  <Field
                    label={t('prenomPere')}
                    value={values.parents.prenomPere}
                    onChange={(v) => update('parents.prenomPere', v)}
                    required
                    error={fieldErrors['parents.prenomPere']}
                  />
                </div>
                <div className="min-w-0">
                  <Field
                    label={t('nomFamillePere')}
                    value={values.parents.nomFamillePere}
                    onChange={(v) => update('parents.nomFamillePere', v)}
                    required
                    error={fieldErrors['parents.nomFamillePere']}
                  />
                </div>
                <div className="min-w-0 sm:col-span-2">
                  <Field
                    label={t('fonctionPere')}
                    value={values.parents.fonctionPere}
                    onChange={(v) => update('parents.fonctionPere', v)}
                  />
                </div>
                <div className="min-w-0">
                  <Field
                    label={t('prenomMere')}
                    value={values.parents.prenomMere}
                    onChange={(v) => update('parents.prenomMere', v)}
                  />
                </div>
                <div className="min-w-0">
                  <Field
                    label={t('nomFamilleMere')}
                    value={values.parents.nomMere}
                    onChange={(v) => update('parents.nomMere', v)}
                    error={fieldErrors['parents.nomMere']}
                  />
                </div>
                <div className="min-w-0 sm:col-span-2">
                  <Field
                    label={t('fonctionMere')}
                    value={values.parents.fonctionMere}
                    onChange={(v) => update('parents.fonctionMere', v)}
                  />
                </div>
              </div>

              <h5 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                {t('telephonesParentsUrgence')}
              </h5>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <div className="min-w-0">
                  <Field
                    label={t('telPere')}
                    value={values.contact.telPere}
                    onChange={(v) => update('contact.telPere', sanitizeMrPhoneDigits(v))}
                    error={fieldErrors['contact.telPere']}
                    inputMode="numeric"
                    maxLength={8}
                    onKeyDown={blockNonDigitKey}
                  />
                </div>
                <div className="min-w-0">
                  <Field
                    label={t('telPereWhatsapp')}
                    value={values.contact.telPereWhatsapp}
                    onChange={(v) => update('contact.telPereWhatsapp', sanitizeMrPhoneDigits(v))}
                    error={fieldErrors['contact.telPereWhatsapp']}
                    inputMode="numeric"
                    maxLength={8}
                    onKeyDown={blockNonDigitKey}
                  />
                </div>
                <div className="min-w-0">
                  <Field
                    label={t('telMere')}
                    value={values.contact.telMere}
                    onChange={(v) => update('contact.telMere', sanitizeMrPhoneDigits(v))}
                    error={fieldErrors['contact.telMere']}
                    inputMode="numeric"
                    maxLength={8}
                    onKeyDown={blockNonDigitKey}
                  />
                </div>
                <div className="min-w-0">
                  <Field
                    label={t('telMereWhatsapp')}
                    value={values.contact.telMereWhatsapp}
                    onChange={(v) => update('contact.telMereWhatsapp', sanitizeMrPhoneDigits(v))}
                    error={fieldErrors['contact.telMereWhatsapp']}
                    inputMode="numeric"
                    maxLength={8}
                    onKeyDown={blockNonDigitKey}
                  />
                </div>
                <div className="min-w-0 sm:col-span-2">
                  <Field
                    label={t('nomUrgence')}
                    value={values.contact.nomUrgence}
                    onChange={(v) => update('contact.nomUrgence', v)}
                  />
                </div>
                <div className="min-w-0">
                  <Field
                    label={t('telUrgence')}
                    value={values.contact.telUrgence}
                    onChange={(v) => update('contact.telUrgence', sanitizeMrPhoneDigits(v))}
                    error={fieldErrors['contact.telUrgence']}
                    inputMode="numeric"
                    maxLength={8}
                    onKeyDown={blockNonDigitKey}
                    placeholder={t('optionnel8Chiffres')}
                  />
                </div>
                <div className="min-w-0">
                  <Field
                    label={t('whatsappUrgence')}
                    value={values.contact.telUrgenceWhatsapp}
                    onChange={(v) => update('contact.telUrgenceWhatsapp', sanitizeMrPhoneDigits(v))}
                    error={fieldErrors['contact.telUrgenceWhatsapp']}
                    inputMode="numeric"
                    maxLength={8}
                    onKeyDown={blockNonDigitKey}
                  />
                </div>
              </div>
            </FormPanel>
          </>
        )}

        {stepKey === 'sante' && (
          <FormPanel>
            <h4 className="mb-4 border-b border-light-gray pb-2 font-serif text-sm font-semibold tracking-wide text-slate-900">
              {t('dossierSante')}
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="min-w-0">
                <SelectField
                  label={t('groupeSanguin')}
                  value={values.sante.groupeSanguin}
                  onChange={(v) => update('sante.groupeSanguin', v)}
                  options={GROUPES_SANGUINS_OPTIONS}
                  required
                  error={fieldErrors['sante.groupeSanguin']}
                />
              </div>
              <div className="min-w-0">
                <Field
                  label={t('numeroAssure')}
                  value={values.sante.numeroAssure}
                  onChange={(v) => update('sante.numeroAssure', v)}
                  error={fieldErrors['sante.numeroAssure']}
                  inputMode="numeric"
                />
              </div>
              <div className="min-w-0 sm:col-span-2">
                <Field
                  label={t('assureur')}
                  value={values.sante.assureur}
                  onChange={(v) => update('sante.assureur', v)}
                  onBlur={() => update('sante.assureur', formatListField(values.sante.assureur))}
                  placeholder={t('hintListeVirgule')}
                />
              </div>
              <div className="min-w-0 sm:col-span-2">
                <Field
                  label={t('antecedents')}
                  value={values.sante.antecedents}
                  onChange={(v) => update('sante.antecedents', v)}
                  onBlur={() => update('sante.antecedents', formatListField(values.sante.antecedents))}
                  placeholder={t('hintListeVirgule')}
                />
              </div>
              <div className="min-w-0 sm:col-span-2">
                <Field
                  label={t('maladiesChroniques')}
                  value={values.sante.maladiesChroniques}
                  onChange={(v) => update('sante.maladiesChroniques', v)}
                  onBlur={() => update('sante.maladiesChroniques', formatListField(values.sante.maladiesChroniques))}
                  placeholder={t('hintListeVirgule')}
                />
              </div>
              <div className="min-w-0 sm:col-span-2">
                <Field
                  label={t('medicamentsAVie')}
                  value={values.sante.medicaments}
                  onChange={(v) => update('sante.medicaments', v)}
                  onBlur={() => update('sante.medicaments', formatListField(values.sante.medicaments))}
                  placeholder={t('hintListeVirgule')}
                />
              </div>
              <div className="min-w-0">
                <Field
                  label={t('poidsKg')}
                  value={values.sante.poids}
                  onChange={(v) => update('sante.poids', sanitizeDecimal(v))}
                  error={fieldErrors['sante.poids']}
                  inputMode="decimal"
                  placeholder="72,5"
                />
              </div>
              <div className="min-w-0">
                <Field
                  label={t('tailleCm')}
                  value={values.sante.tailleCm}
                  onChange={(v) => update('sante.tailleCm', sanitizeDecimal(v))}
                  error={fieldErrors['sante.tailleCm']}
                  inputMode="decimal"
                  placeholder="178"
                />
              </div>
              <div className="min-w-0 sm:col-span-2">
                <ImcDisplay imc={imc} klass={imcKlass} t={t} />
              </div>
            </div>
          </FormPanel>
        )}

        {stepKey === 'militaire' && (
          <FormPanel>
            <h4 className="mb-4 border-b border-light-gray pb-2 font-serif text-sm font-semibold tracking-wide text-slate-900">
              {t('dossierMilitaire')}
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="min-w-0">
                <ReadOnlyField
                  label={t('affectation')}
                  value={formatAffectation(
                    values.dossierMilitaire.compagnie,
                    values.dossierMilitaire.section,
                  )}
                />
              </div>
              <div className="min-w-0">
                <Field
                  label={t('compteBankily')}
                  value={values.compteBankily}
                  onChange={(v) => update('compteBankily', sanitizeMrPhoneDigits(v))}
                  error={fieldErrors.compteBankily}
                  inputMode="numeric"
                  maxLength={8}
                  onKeyDown={blockNonDigitKey}
                  placeholder={t('optionnel8Chiffres')}
                />
              </div>
              <div className="min-w-0 sm:col-span-2">
                <Field
                  label={t('sportPratique')}
                  value={values.dossierMilitaire.sportPratique}
                  onChange={(v) => update('dossierMilitaire.sportPratique', v)}
                  onBlur={() => update(
                    'dossierMilitaire.sportPratique',
                    formatListField(values.dossierMilitaire.sportPratique),
                  )}
                  placeholder={t('hintListeVirgule')}
                />
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-dashed border-light-gray bg-off-white/60 p-3 sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h5 className="font-serif text-sm font-semibold text-slate-900">{t('ficheTailles')}</h5>
                  <p className="mt-1 text-xs text-text-light">
                    {t('ficheTaillesHint')}
                  </p>
                  {scanInfo ? (
                    <p className="mt-2 text-xs font-medium text-emerald-700">{scanInfo}</p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleGenerateFiche}
                  className="shrink-0"
                >
                  <FileText size={16} aria-hidden />
                  {t('genererFichePdf')}
                </Button>
              </div>
              <div className="mt-3">
                <ScanFicheUpload
                  value={values.dossierMilitaire.ficheTaillesScan}
                  onChange={handleScanFiche}
                  importLabel={t('importerScan')}
                  removeLabel={t('retirer')}
                />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="min-w-0">
                <Field label={t('tourPoitrine')} value={values.dossierMilitaire.tourPoitrine} onChange={(v) => update('dossierMilitaire.tourPoitrine', sanitizeDecimal(v))} error={fieldErrors['dossierMilitaire.tourPoitrine']} inputMode="decimal" />
              </div>
              <div className="min-w-0">
                <Field label={t('tourCeinture')} value={values.dossierMilitaire.tourCeinture} onChange={(v) => update('dossierMilitaire.tourCeinture', sanitizeDecimal(v))} error={fieldErrors['dossierMilitaire.tourCeinture']} inputMode="decimal" />
              </div>
              <div className="min-w-0">
                <Field label={t('tourTaille')} value={values.dossierMilitaire.tourTaille} onChange={(v) => update('dossierMilitaire.tourTaille', sanitizeDecimal(v))} error={fieldErrors['dossierMilitaire.tourTaille']} inputMode="decimal" />
              </div>
              <div className="min-w-0">
                <Field label={t('tourBassin')} value={values.dossierMilitaire.tourBassin} onChange={(v) => update('dossierMilitaire.tourBassin', sanitizeDecimal(v))} error={fieldErrors['dossierMilitaire.tourBassin']} inputMode="decimal" />
              </div>
              <div className="min-w-0">
                <Field label={t('tourCou')} value={values.dossierMilitaire.tourCou} onChange={(v) => update('dossierMilitaire.tourCou', sanitizeDecimal(v))} error={fieldErrors['dossierMilitaire.tourCou']} inputMode="decimal" />
              </div>
              <div className="min-w-0">
                <Field label={t('longueurManche')} value={values.dossierMilitaire.longueurManche} onChange={(v) => update('dossierMilitaire.longueurManche', sanitizeDecimal(v))} error={fieldErrors['dossierMilitaire.longueurManche']} inputMode="decimal" />
              </div>
              <div className="min-w-0">
                <Field label={t('longueurDos')} value={values.dossierMilitaire.longueurDos} onChange={(v) => update('dossierMilitaire.longueurDos', sanitizeDecimal(v))} error={fieldErrors['dossierMilitaire.longueurDos']} inputMode="decimal" />
              </div>
              <div className="min-w-0">
                <Field label={t('longueurCote')} value={values.dossierMilitaire.longueurCote} onChange={(v) => update('dossierMilitaire.longueurCote', sanitizeDecimal(v))} error={fieldErrors['dossierMilitaire.longueurCote']} inputMode="decimal" />
              </div>
              <div className="min-w-0">
                <Field
                  label={t('pointure')}
                  value={values.dossierMilitaire.pointure}
                  onChange={(v) => update('dossierMilitaire.pointure', String(v ?? '').replace(/\D/g, '').slice(0, 3))}
                  error={fieldErrors['dossierMilitaire.pointure']}
                  inputMode="numeric"
                  onKeyDown={blockNonDigitKey}
                />
              </div>
            </div>
          </FormPanel>
        )}

        {stepKey === 'hebergement' && (
          <FormPanel>
            <h4 className="mb-4 border-b border-light-gray pb-2 font-serif text-sm font-semibold tracking-wide text-slate-900">
              {t('hebergement')}
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="min-w-0">
                <Field label={t('batiment')} value={values.hebergement.batiment} onChange={(v) => update('hebergement.batiment', v)} />
              </div>
              <div className="min-w-0">
                <Field label={t('etage')} value={values.hebergement.etage} onChange={(v) => update('hebergement.etage', v)} />
              </div>
              <div className="min-w-0">
                <Field label={t('aile')} value={values.hebergement.aile} onChange={(v) => update('hebergement.aile', v)} />
              </div>
              <div className="min-w-0">
                <Field label={t('chambre')} value={values.hebergement.chambre} onChange={(v) => update('hebergement.chambre', v)} />
              </div>
              <div className="min-w-0">
                <Field label={t('lit')} value={values.hebergement.lit} onChange={(v) => update('hebergement.lit', v)} />
              </div>
              <div className="min-w-0">
                <SelectField
                  label={t('responsableChambre')}
                  value={values.hebergement.responsableChambre ? 'Oui' : 'Non'}
                  onChange={(v) => update('hebergement.responsableChambre', v === 'Oui')}
                  options={[{ value: 'Oui', label: t('oui') }, { value: 'Non', label: t('non') }]}
                />
              </div>
              <div className="min-w-0">
                <SelectField
                  label={t('responsableAile')}
                  value={values.hebergement.responsableAile ? 'Oui' : 'Non'}
                  onChange={(v) => update('hebergement.responsableAile', v === 'Oui')}
                  options={[{ value: 'Oui', label: t('oui') }, { value: 'Non', label: t('non') }]}
                />
              </div>
              <div className="min-w-0">
                <SelectField
                  label={t('responsableEtage')}
                  value={values.hebergement.responsableEtage ? 'Oui' : 'Non'}
                  onChange={(v) => update('hebergement.responsableEtage', v === 'Oui')}
                  options={[{ value: 'Oui', label: t('oui') }, { value: 'Non', label: t('non') }]}
                />
              </div>
            </div>
          </FormPanel>
        )}
      </div>

      <div className="sticky bottom-0 z-[5] mt-auto flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-light-gray bg-off-white/95 px-1 py-3 backdrop-blur-sm supports-[padding:max(0px)]:pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:static sm:bg-transparent sm:px-0 sm:py-4 sm:backdrop-blur-none">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
        {step > 0 && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setStep((s) => s - 1);
              setStepError('');
              setSubmitErr('');
              setFieldErrors({});
            }}
          >
            Précédent
          </Button>
        )}
        {step < STEPS.length - 1 && (
          <Button type="button" variant={eleve ? 'secondary' : 'primary'} onClick={handleNext} disabled={submitting}>
            {submitting ? 'Envoi…' : 'Suivant'}
          </Button>
        )}
        {(eleve || step === STEPS.length - 1) && (
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        )}
      </div>
    </form>
  );
}

function ImcDisplay({ imc, klass, t }) {
  const value = imc != null ? formatIMC(imc) : '';
  const tone =
    klass?.tone === 'green'
      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
      : klass?.tone === 'amber'
        ? 'border-amber-300 bg-amber-50 text-amber-800'
        : klass?.tone === 'red'
          ? 'border-red-300 bg-red-50 text-red-800'
          : 'border-light-gray bg-off-white text-text-light';
  const IMC_I18N = {
    maigreurSevere: 'imcMaigreurSevere',
    maigreurModeree: 'imcMaigreurModeree',
    maigreurLegere: 'imcMaigreurLegere',
    normale: 'imcNormale',
    surpoids: 'imcSurpoids',
    obesite1: 'imcObesite1',
    obesite2: 'imcObesite2',
    obesite3: 'imcObesite3',
  };
  const classLabel = klass?.code && t
    ? t(IMC_I18N[klass.code] || '')
    : '';
  return (
    <label className="form-field-contained min-w-0">
      <span className="label">{t ? t('imc') : 'IMC'}</span>
      <div className={`flex min-h-[44px] min-w-0 flex-wrap items-center gap-2 rounded-lg border px-3 py-2 sm:gap-3 ${tone}`}>
        <span className="font-serif text-lg font-semibold">{value || '—'}</span>
        <span className="break-words text-xs font-semibold uppercase tracking-wide">
          {classLabel || (t ? t('renseignerPoidsTaille') : 'Renseigner poids et taille')}
        </span>
      </div>
    </label>
  );
}

function ScanFicheUpload({
  value,
  onChange,
  importLabel = 'Importer un scan',
  removeLabel = 'Retirer',
}) {
  const ref = useRef(null);
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-light-gray bg-white px-3 py-2">
      <input
        ref={ref}
        type="file"
        accept=".pdf,.txt,.csv,image/*,application/pdf,text/plain,text/csv"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="inline-flex items-center gap-1.5 rounded-lg border border-light-gray bg-off-white px-3 py-1.5 text-sm font-semibold text-navy transition hover:bg-slate-50"
      >
        <UploadIcon size={16} aria-hidden />
        {importLabel}
      </button>
      <span className="min-w-0 truncate text-xs text-text-light">
        {value instanceof File ? value.name : value || 'Aucun fichier sélectionné'}
      </span>
      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange(null);
            if (ref.current) ref.current.value = '';
          }}
          className="text-xs font-semibold text-red-700 hover:underline"
        >
          {removeLabel}
        </button>
      ) : null}
    </div>
  );
}

function DateNaissanceField({ label, value, onChange, onPartialChange, required, error }) {
  const [text, setText] = useState(() => formatIsoToFr(value) || '');
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) {
      setText(formatIsoToFr(value) || '');
    }
  }, [value]);

  return (
    <Field
      label={label || 'Date de naissance'}
      value={text}
      onChange={(v) => {
        const next = sanitizeDateFrInput(v);
        setText(next);
        const iso = parseFrToIso(next);
        if (iso) {
          onChange(iso);
          onPartialChange?.('');
        } else if (!next) {
          onChange('');
          onPartialChange?.('');
        } else {
          onPartialChange?.(next);
        }
      }}
      onFocus={() => {
        focusedRef.current = true;
      }}
      onBlur={() => {
        focusedRef.current = false;
        const iso = parseFrToIso(text);
        if (iso) {
          setText(formatIsoToFr(iso));
          onChange(iso);
        } else if (!text.trim()) {
          onChange('');
        }
      }}
      required={required}
      error={error}
      inputMode="numeric"
      placeholder="JJ/MM/AAAA"
      maxLength={10}
      autoComplete="bday"
    />
  );
}

function ReadOnlyField({ label, value, hint }) {
  return (
    <label className="form-field-contained min-w-0 max-w-full">
      <span className="label text-sm leading-tight break-words">{label}</span>
      <div className="input flex min-h-[44px] min-w-0 max-w-full items-center break-words bg-slate-50 text-slate-800 sm:min-h-[2.5rem]">
        {value || '—'}
      </div>
      {hint ? <p className="mt-1 text-xs leading-tight text-text-light">{hint}</p> : null}
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
  error,
  inputMode,
  maxLength,
  onKeyDown,
  placeholder,
  autoComplete,
  disabled,
  dir,
  lang,
  onBlur,
  onFocus,
}) {
  const id = `field-${label}`.replace(/\s+/g, '-').toLowerCase();
  const errId = `${id}-error`;
  return (
    <div className="form-field-contained min-w-0 max-w-full">
      <label htmlFor={id} className="label text-sm leading-tight break-words">
        {label}
        {required && <span className="text-brand-red"> *</span>}
      </label>
      <input
        id={id}
        type={type}
        className={`input min-h-[44px] w-full max-w-full min-w-0 sm:min-h-[2.5rem] ${error ? 'ring-2 ring-brand-red/40' : ''} ${disabled ? 'bg-slate-50 text-slate-600' : ''}`}
        required={required}
        value={value ?? ''}
        inputMode={inputMode}
        maxLength={maxLength}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onKeyDown={onKeyDown}
        disabled={disabled}
        readOnly={disabled}
        dir={dir}
        lang={lang}
        aria-invalid={!!error}
        aria-describedby={error ? errId : undefined}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onFocus={onFocus}
      />
      {error ? (
        <p id={errId} className="mt-1.5 text-sm font-medium leading-snug text-brand-red" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
