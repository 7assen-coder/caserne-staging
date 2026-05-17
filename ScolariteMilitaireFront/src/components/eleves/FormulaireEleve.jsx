import { useMemo, useRef, useState } from 'react';
import { Check, FileText, Upload as UploadIcon } from 'lucide-react';
import Button from '../common/Button';
import SelectField from '../common/SelectField';
import CloudUploadZone from './CloudUploadZone';
import { DEPARTEMENTS, NIVEAUX_SCOLARITE } from '../../utils/constants';
import { formatApiError } from '../../utils/apiErrors';
import {
  SERIE_BAC_OPTIONS,
  validateEleveStep,
  validateSubmitSteps,
  sanitizeMatricule,
  sanitizeNni,
  sanitizeNumBac,
  sanitizeDecimal,
} from '../../utils/eleveFormValidation';
import { sanitizeMrPhoneDigits, blockNonDigitKey } from '../../utils/mrPhone';
import {
  VOIES_ACCES_OPTIONS,
  DIPLOMES_ACCES_OPTIONS,
  GROUPES_SANGUINS_OPTIONS,
  STATUT_ETUDIANT_OPTIONS,
  COMPAGNIES_OPTIONS,
  SECTIONS_OPTIONS,
  compagnieAttendueDepuisNiveau,
  PARCOURS_MOBILITE_OPTIONS,
  ROLE_STEPS_VISIBLES,
} from '../../data/etudiantOptions';
import { PAYS_OPTIONS } from '../../data/pays';
import { WILAYAS_OPTIONS, getCommuneOptionsForWilaya } from '../../data/wilayasMauritanie';
import { computeIMC, classifyIMC, formatIMC } from '../../utils/imc';
import { getCurrentAcademicYear, getAcademicYearOptions, todayIso, deriveMobiliteAnneeFin } from '../../utils/anneeUniversitaire';
import { generateFicheTaillesPdf, parseFicheTaillesText } from '../../utils/ficheTaillesPdf';

const ALL_STEPS = [
  { key: 'etat-civil', label: 'État civil' },
  { key: 'scolarite', label: 'Scolarité' },
  { key: 'mobilite', label: 'Mobilité', mobiliteOnly: true },
  { key: 'pieces', label: 'Pièces' },
  { key: 'contacts', label: 'Contacts parents' },
  { key: 'sante', label: 'Santé' },
  { key: 'militaire', label: 'Dossier militaire' },
  { key: 'hebergement', label: 'Hébergement' },
];

function buildSteps({ role, mode }) {
  const allowed = new Set(ROLE_STEPS_VISIBLES[role] || ROLE_STEPS_VISIBLES.superviseur);
  if (mode === 'mobilite') allowed.add('mobilite');
  return ALL_STEPS.filter((s) => {
    if (s.mobiliteOnly) return mode === 'mobilite';
    return allowed.has(s.key);
  });
}

const DEFAULT_FILIERE = DEPARTEMENTS[0].value;

function buildDefaults() {
  return {
    matricule: '',
    nom: '',
    prenom: '',
    nni: '',
    numeroBac: '',
    dateNaissance: '',
    lieuNaissance: '',
    wilayaNaissance: '',
    communeNaissance: '',
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
    statut: 'actif',
    filiere: DEFAULT_FILIERE,
    scolarite: {
      departement: DEFAULT_FILIERE,
      filiere: DEFAULT_FILIERE,
      niveau: NIVEAUX_SCOLARITE[0],
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
      compagnie: '',
      section: '',
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

function formatEmailInstitutionnel(matricule) {
  const d = String(matricule ?? '').replace(/\D/g, '');
  return d ? `${d}@esp.mr` : '';
}

function FormPanel({ children, className = '' }) {
  return (
    <div
      className={`rounded-xl border border-light-gray bg-white p-4 shadow-sm sm:rounded-2xl sm:p-5 md:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

export default function FormulaireEleve({
  eleve,
  onSubmit,
  onCancel,
  onStepSubmit,
  role = 'superviseur',
  mode = 'standard',
}) {
  const STEPS = useMemo(() => buildSteps({ role, mode }), [role, mode]);
  const stepKeys = useMemo(() => STEPS.map((s) => s.key), [STEPS]);

  const [values, setValues] = useState(() => {
    const base = eleve ? deepMerge(buildDefaults(), eleve) : buildDefaults();
    base.pieces = normalizePieces(base.pieces);
    return base;
  });
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState('');
  const [submitErr, setSubmitErr] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [scanInfo, setScanInfo] = useState('');

  const update = (path, v) => {
    setValues((prev) => setPath(prev, path.split('.'), v));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
  };

  const updateMany = (entries) => {
    setValues((prev) => {
      let out = prev;
      for (const [path, v] of entries) {
        out = setPath(out, path.split('.'), v);
      }
      return out;
    });
    setFieldErrors((prev) => {
      const next = { ...prev };
      for (const [path] of entries) delete next[path];
      return next;
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
    const parts = [values.communeNaissance, values.wilayaNaissance].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : values.lieuNaissance || '';
  }, [values.nationalite, values.wilayaNaissance, values.communeNaissance, values.lieuNaissance]);

  const augmentMobiliteAnneesFin = (v) => {
    const fin = deriveMobiliteAnneeFin(v.mobilite?.anneeDebut, v.mobilite?.type);
    return { ...v, mobilite: { ...v.mobilite, anneeFin: fin || '' } };
  };

  const mobiliteAnneeFinDerived = deriveMobiliteAnneeFin(
    values.mobilite?.anneeDebut,
    values.mobilite?.type,
  );

  const submit = async (e) => {
    e.preventDefault();
    setSubmitErr('');
    const fin = validateSubmitSteps(values, { stepKeys, mode });
    if (!fin.ok) {
      setStep(fin.firstStep);
      setFieldErrors(fin.errors);
      setSubmitErr(Object.values(fin.errors)[0] || 'Vérifiez les étapes du formulaire.');
      return;
    }
    setSubmitting(true);
    try {
      let finalValues = {
        ...values,
        lieuNaissance: composedLieuNaissance || values.lieuNaissance || '',
        sante: { ...values.sante, imc: imcFormatted },
      };
      if (mode === 'mobilite') finalValues = augmentMobiliteAnneesFin(finalValues);
      if (onStepSubmit) {
        await onStepSubmit(stepKeys[step], finalValues, { stepIndex: step, isFinal: true });
      }
      const emailSync = finalValues.contact?.emailPerso || finalValues.contact?.emailPro || '';
      await onSubmit?.({
        ...finalValues,
        contact: { ...finalValues.contact, email: emailSync },
        pieces: finalValues.pieces,
      });
    } catch (err) {
      setSubmitErr(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = async () => {
    if (step >= STEPS.length - 1) return;
    setStepError('');
    setSubmitErr('');
    const cur = validateEleveStep(step, values, { stepKeys, mode });
    if (!cur.ok) {
      setFieldErrors(cur.errors);
      setStepError(Object.values(cur.errors)[0] || 'Vérifiez les champs en rouge.');
      return;
    }
    setFieldErrors({});
    const nextStep = step + 1;
    let stepValues = {
      ...values,
      lieuNaissance: composedLieuNaissance || values.lieuNaissance || '',
      sante: { ...values.sante, imc: imcFormatted },
    };
    if (mode === 'mobilite' && stepKeys[step] === 'mobilite') {
      stepValues = augmentMobiliteAnneesFin(stepValues);
    }
    if (onStepSubmit) {
      setSubmitting(true);
      try {
        await onStepSubmit(stepKeys[step], stepValues, { stepIndex: step });
        setStep(nextStep);
      } catch (err) {
        setStepError(formatApiError(err));
      } finally {
        setSubmitting(false);
      }
      return;
    }
    setStep(nextStep);
  };

  const filiereOptions = DEPARTEMENTS;
  const niveauOptions = NIVEAUX_SCOLARITE.map((x) => ({ value: x, label: x }));
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
    if (!/text|csv/i.test(file.type) && !/\.txt$|\.csv$/i.test(file.name)) {
      setScanInfo(
        'Fichier joint. Pour la pré-saisie automatique, importer un fichier .txt/.csv avec une mensuration par ligne.',
      );
      return;
    }
    try {
      const text = await file.text();
      const parsed = parseFicheTaillesText(text);
      const entries = [];
      const map = {
        tourPoitrine: 'dossierMilitaire.tourPoitrine',
        tourCeinture: 'dossierMilitaire.tourCeinture',
        tourTaille: 'dossierMilitaire.tourTaille',
        tourBassin: 'dossierMilitaire.tourBassin',
        tourCou: 'dossierMilitaire.tourCou',
        longueurManche: 'dossierMilitaire.longueurManche',
        longueurDos: 'dossierMilitaire.longueurDos',
        longueurCote: 'dossierMilitaire.longueurCote',
        pointure: 'dossierMilitaire.pointure',
        poids: 'sante.poids',
        tailleCm: 'sante.tailleCm',
      };
      for (const [k, v] of Object.entries(parsed)) {
        if (map[k]) entries.push([map[k], v]);
      }
      if (entries.length > 0) {
        updateMany(entries);
        setScanInfo(`Pré-saisie automatique : ${entries.length} champ(s) renseigné(s).`);
      } else {
        setScanInfo('Aucune mensuration reconnue dans le fichier.');
      }
    } catch {
      setScanInfo('Lecture du fichier impossible.');
    }
  };

  const handleGenerateFiche = () => {
    generateFicheTaillesPdf({
      eleve: values,
      mensurations: values.dossierMilitaire,
      poids: values.sante?.poids,
      taille: values.sante?.tailleCm,
    });
  };

  const stepKey = stepKeys[step];

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-col gap-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:gap-5">
      <div className="-mx-1 overflow-x-auto pb-2 sm:mx-0 sm:overflow-visible sm:pb-0">
        <div className="relative flex min-w-[min(100%,520px)] shrink-0 items-start justify-between gap-1 border-b border-light-gray pb-4 sm:min-w-0 sm:gap-2">
          <div
            className="pointer-events-none absolute left-[10%] right-[10%] top-[15px] hidden h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent sm:block"
            aria-hidden
          />
          {STEPS.map((s, i) => {
            const done = i < step;
            const act = i === step;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => i < step && setStep(i)}
                className="relative z-[1] flex min-w-0 flex-1 flex-col items-center gap-1.5"
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold shadow-lg transition sm:h-10 sm:w-10 ${act
                      ? 'border-gold bg-amber-50 text-gold-700 ring-2 ring-gold/20'
                      : done
                        ? 'border-esp-green/50 bg-emerald-50 text-emerald-700'
                        : 'border-light-gray bg-off-white text-slate-600'
                    }`}
                >
                  {done ? <Check size={17} strokeWidth={2.5} /> : i + 1}
                </span>
                <span
                  className={`text-center text-[10px] leading-tight sm:text-xs ${act ? 'font-semibold text-slate-900' : done ? 'text-slate-700' : 'text-slate-500'
                    }`}
                >
                  {s.label}
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
                Identité
              </h4>
              <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
                <Field
                  label="Matricule"
                  value={values.matricule}
                  onChange={(v) => update('matricule', sanitizeMatricule(v))}
                  required
                  error={fieldErrors.matricule}
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={5}
                  onKeyDown={blockNonDigitKey}
                  placeholder="12345"
                />
                <Field label="Nom" value={values.nom} onChange={(v) => update('nom', v)} required error={fieldErrors.nom} />
                <Field label="Prénom" value={values.prenom} onChange={(v) => update('prenom', v)} required error={fieldErrors.prenom} />
                <Field
                  label="N° NNI"
                  value={values.nni}
                  onChange={(v) => update('nni', sanitizeNni(v))}
                  required
                  error={fieldErrors.nni}
                  inputMode="numeric"
                  maxLength={10}
                  onKeyDown={blockNonDigitKey}
                  placeholder="10 chiffres"
                />
                <SelectField
                  label="Sexe"
                  value={values.sexe}
                  onChange={(v) => update('sexe', v)}
                  options={[
                    { value: 'M', label: 'Masculin' },
                    { value: 'F', label: 'Féminin' },
                  ]}
                />
                <Field
                  label="Date de naissance"
                  type="date"
                  value={values.dateNaissance}
                  onChange={(v) => update('dateNaissance', v)}
                  required
                  error={fieldErrors.dateNaissance}
                />
                <SelectField
                  label="Nationalité"
                  value={values.nationalite}
                  onChange={(v) => update('nationalite', v)}
                  options={PAYS_OPTIONS}
                  required
                  error={fieldErrors.nationalite}
                />
                {isMauritanien ? (
                  <>
                    <SelectField
                      label="Wilaya de naissance"
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
                      label="Commune / moughataa"
                      value={values.communeNaissance}
                      onChange={(v) => update('communeNaissance', v)}
                      options={communeOptions}
                      required
                      error={fieldErrors.communeNaissance}
                    />
                  </>
                ) : (
                  <Field
                    label="Lieu de naissance (ville, pays)"
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
                Baccalauréat
              </h4>
              <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
                <Field
                  label="N° Bac"
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
                  label="Catégorie Bac"
                  value={values.categorieBac}
                  onChange={(v) => update('categorieBac', v)}
                  options={[
                    { value: 'National', label: 'National' },
                    { value: 'Etranger', label: 'Étranger' },
                  ]}
                />
                <SelectField
                  label="Série du Bac"
                  value={values.serieBac ?? ''}
                  onChange={(v) => update('serieBac', v)}
                  options={SERIE_BAC_OPTIONS}
                  required
                  error={fieldErrors.serieBac}
                />
                <Field
                  label="Moyenne au Bac"
                  value={values.moyenneBac}
                  onChange={(v) => update('moyenneBac', v)}
                  required
                  error={fieldErrors.moyenneBac}
                  placeholder="12,50"
                  inputMode="decimal"
                />
                <Field label="École du Bac" value={values.ecoleBac} onChange={(v) => update('ecoleBac', v)} required error={fieldErrors.ecoleBac} />
              </div>
            </FormPanel>

            <FormPanel>
              <h4 className="mb-4 border-b border-light-gray pb-2 font-serif text-sm font-semibold tracking-wide text-slate-900">
                Inscription & coordonnées principales
              </h4>
              <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
                <SelectField
                  label="Année universitaire"
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
                  label="Date de saisie"
                  type="date"
                  value={values.datePremiereInscription}
                  onChange={(v) => update('datePremiereInscription', v)}
                  required
                  error={fieldErrors.datePremiereInscription}
                />
                <Field
                  label="Adresse primaire"
                  value={values.contact.adresse}
                  onChange={(v) => update('contact.adresse', v)}
                  required
                  error={fieldErrors['contact.adresse']}
                />
                <Field
                  label="Téléphone principal (tel1)"
                  value={values.contact.telephone}
                  onChange={(v) => update('contact.telephone', sanitizeMrPhoneDigits(v))}
                  required
                  error={fieldErrors['contact.telephone']}
                  inputMode="numeric"
                  maxLength={8}
                  onKeyDown={blockNonDigitKey}
                  placeholder="31234567"
                />
                <SelectField
                  label="Résident avec les parents"
                  value={values.residentAvecParents}
                  onChange={(v) => update('residentAvecParents', v)}
                  options={[
                    { value: '', label: '—' },
                    { value: 'Oui', label: 'Oui' },
                    { value: 'Non', label: 'Non' },
                  ]}
                  required
                  error={fieldErrors.residentAvecParents}
                />
                <Field
                  label="Compte Bankily"
                  value={values.compteBankily}
                  onChange={(v) => update('compteBankily', sanitizeMrPhoneDigits(v))}
                  error={fieldErrors.compteBankily}
                  inputMode="numeric"
                  maxLength={8}
                  onKeyDown={blockNonDigitKey}
                  placeholder="Optionnel · 8 chiffres"
                />
                <Field
                  label="E-mail personnel"
                  value={values.contact.emailPerso}
                  onChange={(v) => update('contact.emailPerso', v)}
                  required
                  error={fieldErrors['contact.emailPerso']}
                  inputMode="email"
                  autoComplete="email"
                />
              </div>
            </FormPanel>
          </>
        )}

        {stepKey === 'scolarite' && (
          <FormPanel>
            <h4 className="mb-4 border-b border-light-gray pb-2 font-serif text-sm font-semibold tracking-wide text-slate-900">
              Scolarité
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
              <SelectField
                label="Département"
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
                label="Niveau actuel"
                value={values.scolarite.niveau}
                onChange={(v) => {
                  const compagnie = compagnieAttendueDepuisNiveau(v);
                  const updates = [['scolarite.niveau', v]];
                  if (compagnie) updates.push(['dossierMilitaire.compagnie', compagnie]);
                  updateMany(updates);
                }}
                options={niveauOptions}
                required
                error={fieldErrors['scolarite.niveau']}
              />
              <SelectField
                label="Statut académique"
                value={values.statut}
                onChange={(v) => update('statut', v)}
                options={STATUT_ETUDIANT_OPTIONS}
                required
                error={fieldErrors.statut}
              />
              <SelectField
                label="Voie d’accès"
                value={values.scolarite.voieAcces}
                onChange={(v) => update('scolarite.voieAcces', v)}
                options={VOIES_ACCES_OPTIONS}
                required
                error={fieldErrors['scolarite.voieAcces']}
              />
              <SelectField
                label="Diplôme d’accès"
                value={values.scolarite.diplomeAcces}
                onChange={(v) => update('scolarite.diplomeAcces', v)}
                options={DIPLOMES_ACCES_OPTIONS}
                required
                error={fieldErrors['scolarite.diplomeAcces']}
              />
              <Field
                label="Établissement (diplôme d’accès)"
                value={values.scolarite.etablissementPremierCycle}
                onChange={(v) => update('scolarite.etablissementPremierCycle', v)}
              />
            </div>
          </FormPanel>
        )}

        {stepKey === 'mobilite' && (
          <FormPanel>
            <h4 className="mb-4 border-b border-light-gray pb-2 font-serif text-sm font-semibold tracking-wide text-slate-900">
              Mobilité internationale
            </h4>
            <p className="mb-4 max-w-2xl text-xs leading-relaxed text-slate-500">
              Renseigner ici les informations spécifiques aux étudiants en double diplôme ou en semestre d’échange.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
              <SelectField
                label="Type de mobilité"
                value={values.mobilite.type}
                onChange={(v) => update('mobilite.type', v)}
                options={PARCOURS_MOBILITE_OPTIONS}
                required
                error={fieldErrors['mobilite.type']}
              />
              <Field
                label="Établissement d’accueil"
                value={values.mobilite.etablissement}
                onChange={(v) => update('mobilite.etablissement', v)}
                required
                error={fieldErrors['mobilite.etablissement']}
              />
              <Field
                label="Spécialité de mobilité"
                value={values.mobilite.specialite}
                onChange={(v) => update('mobilite.specialite', v)}
                required
                error={fieldErrors['mobilite.specialite']}
              />
              <SelectField
                label="Année universitaire de début"
                value={values.mobilite.anneeDebut}
                onChange={(v) => update('mobilite.anneeDebut', v)}
                options={anneeMobiliteOptions}
              />
              <div className="md:col-span-2">
                <span className="label">Année de fin</span>
                <div className="input min-h-[44px] flex items-center tabular-nums text-slate-900 sm:min-h-[2.5rem]">
                  {mobiliteAnneeFinDerived || '—'}
                </div>
              </div>
            </div>
          </FormPanel>
        )}

        {stepKey === 'pieces' && (
          <FormPanel className="!p-4 sm:!p-6">
            <h4 className="mb-1 border-b border-light-gray pb-2 font-serif text-sm font-semibold tracking-wide text-slate-900">
              Pièces & diplômes
            </h4>
            <p className="mb-5 max-w-2xl text-xs leading-relaxed text-text-light">
              Pièces demandées pour le dossier. Formats :{' '}
              <span className="font-semibold text-navy">PDF, JPG, PNG</span> — taille indicative max. 5&nbsp;Mo par fichier.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <CloudUploadZone
                  label="Photo d’identité (portrait du candidat)"
                  hint="Fond neutre, visage visible"
                  value={values.pieces.photoIdentite}
                  onChange={(f) => update('pieces.photoIdentite', f)}
                  accept="image/jpeg,image/png,image/webp,image/*"
                />
              </div>
              <CloudUploadZone
                label="Acte de naissance"
                hint="Document officiel"
                value={values.pieces.acteNaissance}
                onChange={(f) => update('pieces.acteNaissance', f)}
              />
              <CloudUploadZone
                label="Diplôme d'accès"
                hint="Fichier justificatif"
                value={values.pieces.diplomeAcces}
                onChange={(f) => update('pieces.diplomeAcces', f)}
              />
              <CloudUploadZone
                label="Diplôme du Bac"
                hint="Copie du diplôme"
                value={values.pieces.diplomeBac}
                onChange={(f) => update('pieces.diplomeBac', f)}
              />
              <CloudUploadZone
                label="Photo d'identité militaire"
                hint="Photo format identité"
                value={values.pieces.photoIdentiteMilitaire}
                onChange={(f) => update('pieces.photoIdentiteMilitaire', f)}
                accept="image/jpeg,image/png,image/webp,image/*"
              />
              <CloudUploadZone
                label="Photo d'identité civile"
                hint="Photo format identité"
                value={values.pieces.photoIdentiteCivile}
                onChange={(f) => update('pieces.photoIdentiteCivile', f)}
                accept="image/jpeg,image/png,image/webp,image/*"
              />
              <CloudUploadZone
                label="Photo militaire intégrale"
                hint="Photo complète"
                value={values.pieces.photoMilitaireIntegrale}
                onChange={(f) => update('pieces.photoMilitaireIntegrale', f)}
                accept="image/jpeg,image/png,image/webp,image/*"
              />
            </div>
          </FormPanel>
        )}

        {stepKey === 'contacts' && (
          <FormPanel>
            <h4 className="mb-4 border-b border-light-gray pb-2 font-serif text-sm font-semibold tracking-wide text-slate-900">
              Contacts parents & coordonnées
            </h4>

            <h5 className="mb-2 mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">Parents</h5>
            <div className="mb-6 grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
              <Field
                label="Prénom du père"
                value={values.parents.prenomPere}
                onChange={(v) => update('parents.prenomPere', v)}
                required
                error={fieldErrors['parents.prenomPere']}
              />
              <Field
                label="Nom de famille du père"
                value={values.parents.nomFamillePere}
                onChange={(v) => update('parents.nomFamillePere', v)}
                required
                error={fieldErrors['parents.nomFamillePere']}
              />
              <Field
                label="Fonction / profession (père)"
                value={values.parents.fonctionPere}
                onChange={(v) => update('parents.fonctionPere', v)}
              />
              <Field
                label="Prénom de la mère"
                value={values.parents.prenomMere}
                onChange={(v) => update('parents.prenomMere', v)}
              />
              <Field
                label="Nom de famille de la mère"
                value={values.parents.nomMere}
                onChange={(v) => update('parents.nomMere', v)}
                error={fieldErrors['parents.nomMere']}
              />
              <Field
                label="Fonction / profession (mère)"
                value={values.parents.fonctionMere}
                onChange={(v) => update('parents.fonctionMere', v)}
              />
            </div>

            <h5 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              Étudiant — téléphones & e-mail institutionnel
            </h5>
            <div className="mb-6 grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
              <Field
                label="N° tél. 1 (appels)"
                value={values.contact.telephone}
                onChange={(v) => update('contact.telephone', sanitizeMrPhoneDigits(v))}
                error={fieldErrors['contact.telephone']}
                inputMode="numeric"
                maxLength={8}
                onKeyDown={blockNonDigitKey}
                placeholder="31234567"
              />
              <Field
                label="N° tél. 2 WhatsApp (étudiant)"
                value={values.contact.tel2}
                onChange={(v) => update('contact.tel2', sanitizeMrPhoneDigits(v))}
                error={fieldErrors['contact.tel2']}
                inputMode="numeric"
                maxLength={8}
                onKeyDown={blockNonDigitKey}
              />
              <label className="block min-w-0 md:col-span-1">
                <span className="label">E-mail institutionnel (@esp.mr)</span>
                <div className="input flex min-h-[44px] cursor-not-allowed items-center bg-slate-100 text-slate-700 sm:min-h-[2.5rem]">
                  {formatEmailInstitutionnel(values.matricule) || '— (renseignez le matricule à l’étape 1)'}
                </div>
                <span className="mt-1 block text-[11px] leading-snug text-text-light">
                  Généré automatiquement à partir du matricule ; non modifiable.
                </span>
              </label>
            </div>

            <h5 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Adresses</h5>
            <div className="mb-6 grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
              <Field
                label="Adresse (résidence principale)"
                value={values.contact.adresse}
                onChange={(v) => update('contact.adresse', v)}
              />
              <div className="md:col-span-2">
                <Field
                  label="Adresse secondaire"
                  value={values.contact.adresseSecondaire}
                  onChange={(v) => update('contact.adresseSecondaire', v)}
                />
              </div>
            </div>

            <h5 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              Téléphones parents & personne à prévenir
            </h5>
            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
              <Field
                label="Tél. père"
                value={values.contact.telPere}
                onChange={(v) => update('contact.telPere', sanitizeMrPhoneDigits(v))}
                error={fieldErrors['contact.telPere']}
                inputMode="numeric"
                maxLength={8}
                onKeyDown={blockNonDigitKey}
              />
              <Field
                label="Tél. père WhatsApp"
                value={values.contact.telPereWhatsapp}
                onChange={(v) => update('contact.telPereWhatsapp', sanitizeMrPhoneDigits(v))}
                error={fieldErrors['contact.telPereWhatsapp']}
                inputMode="numeric"
                maxLength={8}
                onKeyDown={blockNonDigitKey}
              />
              <Field
                label="Tél. mère"
                value={values.contact.telMere}
                onChange={(v) => update('contact.telMere', sanitizeMrPhoneDigits(v))}
                error={fieldErrors['contact.telMere']}
                inputMode="numeric"
                maxLength={8}
                onKeyDown={blockNonDigitKey}
              />
              <Field
                label="Tél. mère WhatsApp"
                value={values.contact.telMereWhatsapp}
                onChange={(v) => update('contact.telMereWhatsapp', sanitizeMrPhoneDigits(v))}
                error={fieldErrors['contact.telMereWhatsapp']}
                inputMode="numeric"
                maxLength={8}
                onKeyDown={blockNonDigitKey}
              />
              <Field label="Nom urgence" value={values.contact.nomUrgence} onChange={(v) => update('contact.nomUrgence', v)} />
              <Field
                label="Tél. urgence"
                value={values.contact.telUrgence}
                onChange={(v) => update('contact.telUrgence', sanitizeMrPhoneDigits(v))}
                required
                error={fieldErrors['contact.telUrgence']}
                inputMode="numeric"
                maxLength={8}
                onKeyDown={blockNonDigitKey}
              />
              <Field
                label="WhatsApp urgence"
                value={values.contact.telUrgenceWhatsapp}
                onChange={(v) => update('contact.telUrgenceWhatsapp', sanitizeMrPhoneDigits(v))}
                error={fieldErrors['contact.telUrgenceWhatsapp']}
                inputMode="numeric"
                maxLength={8}
                onKeyDown={blockNonDigitKey}
              />
            </div>
          </FormPanel>
        )}

        {stepKey === 'sante' && (
          <FormPanel>
            <h4 className="mb-4 border-b border-light-gray pb-2 font-serif text-sm font-semibold tracking-wide text-slate-900">
              Dossier santé
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
              <SelectField
                label="Groupe sanguin"
                value={values.sante.groupeSanguin}
                onChange={(v) => update('sante.groupeSanguin', v)}
                options={GROUPES_SANGUINS_OPTIONS}
                required
                error={fieldErrors['sante.groupeSanguin']}
              />
              <Field label="Assureur" value={values.sante.assureur} onChange={(v) => update('sante.assureur', v)} />
              <Field
                label="N° assuré"
                value={values.sante.numeroAssure}
                onChange={(v) => update('sante.numeroAssure', v)}
                error={fieldErrors['sante.numeroAssure']}
                inputMode="numeric"
              />
              <Field label="Antécédents" value={values.sante.antecedents} onChange={(v) => update('sante.antecedents', v)} />
              <Field label="Maladies chroniques" value={values.sante.maladiesChroniques} onChange={(v) => update('sante.maladiesChroniques', v)} />
              <Field label="Médicaments à vie" value={values.sante.medicaments} onChange={(v) => update('sante.medicaments', v)} />
              <Field
                label="Poids (kg)"
                value={values.sante.poids}
                onChange={(v) => update('sante.poids', sanitizeDecimal(v))}
                error={fieldErrors['sante.poids']}
                inputMode="decimal"
                placeholder="72,5"
              />
              <Field
                label="Taille (cm)"
                value={values.sante.tailleCm}
                onChange={(v) => update('sante.tailleCm', sanitizeDecimal(v))}
                error={fieldErrors['sante.tailleCm']}
                inputMode="decimal"
                placeholder="178"
              />
              <ImcDisplay imc={imc} klass={imcKlass} />
            </div>
          </FormPanel>
        )}

        {stepKey === 'militaire' && (
          <FormPanel>
            <h4 className="mb-4 border-b border-light-gray pb-2 font-serif text-sm font-semibold tracking-wide text-slate-900">
              Dossier militaire
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
              <SelectField
                label="Compagnie"
                value={values.dossierMilitaire.compagnie}
                onChange={(v) => update('dossierMilitaire.compagnie', v)}
                options={COMPAGNIES_OPTIONS}
                required
                error={fieldErrors['dossierMilitaire.compagnie']}
              />
              <SelectField
                label="Section"
                value={values.dossierMilitaire.section}
                onChange={(v) => update('dossierMilitaire.section', v)}
                options={SECTIONS_OPTIONS}
                required
                error={fieldErrors['dossierMilitaire.section']}
              />
              <Field label="Sport pratiqué" value={values.dossierMilitaire.sportPratique} onChange={(v) => update('dossierMilitaire.sportPratique', v)} />
            </div>

            <div className="mt-5 rounded-xl border border-dashed border-light-gray bg-off-white/60 p-3 sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h5 className="font-serif text-sm font-semibold text-slate-900">Fiche de tailles</h5>
                  <p className="mt-1 text-xs text-text-light">
                    Importer un scan ou générer une fiche PDF à partir des mensurations saisies ci-dessous.
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
                  Générer la fiche PDF
                </Button>
              </div>
              <div className="mt-3">
                <ScanFicheUpload
                  value={values.dossierMilitaire.ficheTaillesScan}
                  onChange={handleScanFiche}
                />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
              <Field label="Tour poitrine" value={values.dossierMilitaire.tourPoitrine} onChange={(v) => update('dossierMilitaire.tourPoitrine', sanitizeDecimal(v))} error={fieldErrors['dossierMilitaire.tourPoitrine']} inputMode="decimal" />
              <Field label="Tour ceinture" value={values.dossierMilitaire.tourCeinture} onChange={(v) => update('dossierMilitaire.tourCeinture', sanitizeDecimal(v))} error={fieldErrors['dossierMilitaire.tourCeinture']} inputMode="decimal" />
              <Field label="Tour taille" value={values.dossierMilitaire.tourTaille} onChange={(v) => update('dossierMilitaire.tourTaille', sanitizeDecimal(v))} error={fieldErrors['dossierMilitaire.tourTaille']} inputMode="decimal" />
              <Field label="Tour bassin" value={values.dossierMilitaire.tourBassin} onChange={(v) => update('dossierMilitaire.tourBassin', sanitizeDecimal(v))} error={fieldErrors['dossierMilitaire.tourBassin']} inputMode="decimal" />
              <Field label="Tour cou" value={values.dossierMilitaire.tourCou} onChange={(v) => update('dossierMilitaire.tourCou', sanitizeDecimal(v))} error={fieldErrors['dossierMilitaire.tourCou']} inputMode="decimal" />
              <Field label="Longueur manche" value={values.dossierMilitaire.longueurManche} onChange={(v) => update('dossierMilitaire.longueurManche', sanitizeDecimal(v))} error={fieldErrors['dossierMilitaire.longueurManche']} inputMode="decimal" />
              <Field label="Longueur dos" value={values.dossierMilitaire.longueurDos} onChange={(v) => update('dossierMilitaire.longueurDos', sanitizeDecimal(v))} error={fieldErrors['dossierMilitaire.longueurDos']} inputMode="decimal" />
              <Field label="Longueur côté" value={values.dossierMilitaire.longueurCote} onChange={(v) => update('dossierMilitaire.longueurCote', sanitizeDecimal(v))} error={fieldErrors['dossierMilitaire.longueurCote']} inputMode="decimal" />
              <Field
                label="Pointure"
                value={values.dossierMilitaire.pointure}
                onChange={(v) => update('dossierMilitaire.pointure', String(v ?? '').replace(/\D/g, '').slice(0, 3))}
                error={fieldErrors['dossierMilitaire.pointure']}
                inputMode="numeric"
                onKeyDown={blockNonDigitKey}
              />
            </div>
          </FormPanel>
        )}

        {stepKey === 'hebergement' && (
          <FormPanel>
            <h4 className="mb-4 border-b border-light-gray pb-2 font-serif text-sm font-semibold tracking-wide text-slate-900">
              Hébergement
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
              <Field label="Bâtiment" value={values.hebergement.batiment} onChange={(v) => update('hebergement.batiment', v)} />
              <Field label="Étage" value={values.hebergement.etage} onChange={(v) => update('hebergement.etage', v)} />
              <Field label="Aile" value={values.hebergement.aile} onChange={(v) => update('hebergement.aile', v)} />
              <Field label="Chambre" value={values.hebergement.chambre} onChange={(v) => update('hebergement.chambre', v)} />
              <Field label="Lit" value={values.hebergement.lit} onChange={(v) => update('hebergement.lit', v)} />
              <SelectField
                label="Responsable chambre"
                value={values.hebergement.responsableChambre ? 'Oui' : 'Non'}
                onChange={(v) => update('hebergement.responsableChambre', v === 'Oui')}
                options={[{ value: 'Oui', label: 'Oui' }, { value: 'Non', label: 'Non' }]}
              />
              <SelectField
                label="Responsable aile"
                value={values.hebergement.responsableAile ? 'Oui' : 'Non'}
                onChange={(v) => update('hebergement.responsableAile', v === 'Oui')}
                options={[{ value: 'Oui', label: 'Oui' }, { value: 'Non', label: 'Non' }]}
              />
              <SelectField
                label="Responsable étage"
                value={values.hebergement.responsableEtage ? 'Oui' : 'Non'}
                onChange={(v) => update('hebergement.responsableEtage', v === 'Oui')}
                options={[{ value: 'Oui', label: 'Oui' }, { value: 'Non', label: 'Non' }]}
              />
            </div>
          </FormPanel>
        )}
      </div>

      {eleve && !onStepSubmit ? (
        <p className="mx-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-snug text-slate-600 sm:mx-0">
          Modification : « Suivant » fait défiler les étapes sans appeler le serveur. Les données restent dans le formulaire jusqu&apos;à
          « Enregistrer » sur la dernière étape. La création depuis « Nouvel étudiant » enregistre à chaque étape automatiquement.
        </p>
      ) : null}

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
          <Button type="button" variant="primary" onClick={handleNext} disabled={submitting}>
            {submitting ? 'Envoi…' : 'Suivant'}
          </Button>
        )}
        {step === STEPS.length - 1 && (
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        )}
      </div>
    </form>
  );
}

function ImcDisplay({ imc, klass }) {
  const value = imc != null ? formatIMC(imc) : '';
  const tone =
    klass?.tone === 'green'
      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
      : klass?.tone === 'amber'
        ? 'border-amber-300 bg-amber-50 text-amber-800'
        : klass?.tone === 'red'
          ? 'border-red-300 bg-red-50 text-red-800'
          : 'border-light-gray bg-off-white text-text-light';
  return (
    <label className="block min-w-0">
      <span className="label">IMC (auto)</span>
      <div className={`flex min-h-[44px] items-center gap-3 rounded-lg border px-3 py-2 ${tone}`}>
        <span className="font-serif text-lg font-semibold">{value || '—'}</span>
        <span className="text-xs font-semibold uppercase tracking-wide">
          {klass?.label || 'Renseigner poids et taille'}
        </span>
      </div>
    </label>
  );
}

function ScanFicheUpload({ value, onChange }) {
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
        Importer un scan
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
          Retirer
        </button>
      ) : null}
    </div>
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
}) {
  return (
    <label className="block min-w-0">
      <span className="label">
        {label}
        {required && <span className="text-brand-red"> *</span>}
      </span>
      <input
        type={type}
        className={`input min-h-[44px] sm:min-h-[2.5rem] ${error ? 'ring-2 ring-brand-red/40' : ''}`}
        required={required}
        value={value ?? ''}
        inputMode={inputMode}
        maxLength={maxLength}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onKeyDown={onKeyDown}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? <p className="mt-1.5 text-sm font-medium leading-snug text-brand-red">{error}</p> : null}
    </label>
  );
}
