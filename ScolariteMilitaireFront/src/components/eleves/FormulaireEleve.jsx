import { useState } from 'react';
import { Check } from 'lucide-react';
import Button from '../common/Button';
import SelectField from '../common/SelectField';
import CloudUploadZone from './CloudUploadZone';
import { FILIERES, NIVEAUX_SCOLARITE, VOIES_ACCES_ETUDIANT } from '../../utils/constants';
import { formatApiError } from '../../utils/apiErrors';
import {
  SERIE_BAC_OPTIONS,
  validateEleveStep,
  validateSubmitSteps,
  sanitizeMatricule,
  sanitizeNni,
  sanitizeNumBac,
} from '../../utils/eleveFormValidation';
import { sanitizeMrPhoneDigits, blockNonDigitKey } from '../../utils/mrPhone';

const STEPS = [
  { id: 0, label: 'État civil' },
  { id: 1, label: 'Scolarité' },
  { id: 2, label: 'Pièces & diplômes' },
  { id: 3, label: 'Contacts parents' },
  { id: 4, label: 'Dossier santé' },
  { id: 5, label: 'Dossier militaire' },
  { id: 6, label: 'Hébergement' },
];

const DEFAULT_FILIERE = FILIERES[0];

const DEFAULT = {
  matricule: '',
  nom: '',
  prenom: '',
  nni: '',
  numeroBac: '',
  dateNaissance: '',
  lieuNaissance: '',
  nationalite: '',
  categorieBac: 'National',
  serieBac: '',
  moyenneBac: '',
  ecoleBac: '',
  anneePremiereInscription: '',
  datePremiereInscription: '',
  residentAvecParents: '',
  compteBankily: '',
  sexe: 'M',
  filiere: DEFAULT_FILIERE,
  scolarite: {
    departement: DEFAULT_FILIERE,
    filiere: DEFAULT_FILIERE,
    niveau: NIVEAUX_SCOLARITE[0],
    anneeUni1ere: '2024-2025',
    voieAcces: VOIES_ACCES_ETUDIANT[0].value,
    diplomeAcces: '',
    etablissementPremierCycle: '',
    semestreActuel: '',
    donneesSemestres: '',
    diplome: '',
    etablissementEchange: '',
    etablissementDoubleDiplome: '',
    specialiteMobilite: '',
    parcours: 'En cours normal',
  },
  pieces: {
    photoIdentite: null,
    carteIdentite: null,
    releveBac: null,
    releveNotesSemestres: null,
    diplomeBac: null,
  },
  parents: {
    prenomPere: '',
    fonctionPere: '',
    prenomMere: '',
    nomMere: '',
    fonctionMere: '',
  },
  sante: {
    groupeSanguin: 'O+',
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
    contactUrgence: '',
    nomUrgence: '',
    telUrgence: '',
    telUrgenceWhatsapp: '',
  },
  facebook: '',
  linkedin: '',
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

function serializePieces(pieces) {
  if (!pieces || typeof pieces !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(pieces)) {
    out[k] = v instanceof File ? v.name : v ?? null;
  }
  return out;
}

function normalizePieces(pieces) {
  const p = pieces && typeof pieces === 'object' ? { ...pieces } : {};
  const legacy = [1, 2, 3, 4, 5].map((n) => p[`releveS${n}`]).find((x) => x != null) ?? null;
  for (let n = 1; n <= 5; n++) delete p[`releveS${n}`];
  return {
    photoIdentite: p.photoIdentite ?? null,
    carteIdentite: p.carteIdentite ?? null,
    releveBac: p.releveBac ?? null,
    releveNotesSemestres: p.releveNotesSemestres ?? legacy ?? null,
    diplomeBac: p.diplomeBac ?? null,
  };
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

export default function FormulaireEleve({ eleve, onSubmit, onCancel, onStepSubmit }) {
  const [values, setValues] = useState(() => {
    const base = eleve ? deepMerge(JSON.parse(JSON.stringify(DEFAULT)), eleve) : { ...DEFAULT };
    base.pieces = normalizePieces(base.pieces);
    return base;
  });
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState('');
  const [submitErr, setSubmitErr] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const update = (path, v) => {
    setValues((prev) => setPath(prev, path.split('.'), v));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitErr('');
    const fin = validateSubmitSteps(values);
    if (!fin.ok) {
      setStep(fin.firstStep);
      setFieldErrors(fin.errors);
      setSubmitErr(Object.values(fin.errors)[0] || 'Vérifiez les étapes du formulaire.');
      return;
    }
    setSubmitting(true);
    try {
      const emailSync = values.contact.emailPerso || values.contact.emailPro || '';
      await onSubmit?.({
        ...values,
        contact: { ...values.contact, email: emailSync },
        pieces: serializePieces(values.pieces),
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
    const cur = validateEleveStep(step, values);
    if (!cur.ok) {
      setFieldErrors(cur.errors);
      setStepError(Object.values(cur.errors)[0] || 'Vérifiez les champs en rouge.');
      return;
    }
    setFieldErrors({});
    const nextStep = step + 1;
    if (onStepSubmit) {
      setSubmitting(true);
      try {
        await onStepSubmit(step, values);
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

  const filiereOptions = FILIERES.map((x) => ({ value: x, label: x }));

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
              key={s.id}
              type="button"
              onClick={() => i < step && setStep(i)}
              className="relative z-[1] flex min-w-0 flex-1 flex-col items-center gap-1.5"
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold shadow-lg transition sm:h-10 sm:w-10 ${
                  act
                    ? 'border-gold bg-amber-50 text-gold-700 ring-2 ring-gold/20'
                    : done
                      ? 'border-esp-green/50 bg-emerald-50 text-emerald-700'
                      : 'border-light-gray bg-off-white text-slate-600'
                }`}
              >
                {done ? <Check size={17} strokeWidth={2.5} /> : i + 1}
              </span>
              <span
                className={`text-center text-[10px] leading-tight sm:text-xs ${
                  act ? 'font-semibold text-slate-900' : done ? 'text-slate-700' : 'text-slate-500'
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
        {step === 0 && (
          <>
            <FormPanel>
              <h4 className="mb-4 border-b border-light-gray pb-2 font-serif text-sm font-semibold tracking-wide text-slate-900">
                Identité & inscription (SI)
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
                <Field
                  label="N° Bac"
                  value={values.numeroBac}
                  onChange={(v) => update('numeroBac', sanitizeNumBac(v))}
                  required
                  error={fieldErrors.numeroBac}
                  inputMode="numeric"
                  maxLength={8}
                  onKeyDown={blockNonDigitKey}
                  placeholder="8 chiffres"
                />
                <Field
                  label="Date de naissance"
                  type="date"
                  value={values.dateNaissance}
                  onChange={(v) => update('dateNaissance', v)}
                  required
                  error={fieldErrors.dateNaissance}
                />
                <Field label="Lieu de naissance" value={values.lieuNaissance} onChange={(v) => update('lieuNaissance', v)} required error={fieldErrors.lieuNaissance} />
                <Field label="Nationalité" value={values.nationalite} onChange={(v) => update('nationalite', v)} required error={fieldErrors.nationalite} />
                <SelectField
                  label="Catégorie du Bac"
                  value={values.categorieBac}
                  onChange={(v) => update('categorieBac', v)}
                  options={[
                    { value: 'National', label: 'National' },
                    { value: 'Étranger', label: 'Étranger' },
                  ]}
                />
                <SelectField
                  label="Série du Bac"
                  value={values.serieBac ?? ''}
                  onChange={(v) => update('serieBac', v)}
                  options={SERIE_BAC_OPTIONS}
                  error={fieldErrors.serieBac}
                />
                <Field label="Moyenne Bac" value={values.moyenneBac} onChange={(v) => update('moyenneBac', v)} required error={fieldErrors.moyenneBac} placeholder="12,50" />
                <Field label="École du Bac" value={values.ecoleBac} onChange={(v) => update('ecoleBac', v)} required error={fieldErrors.ecoleBac} />
                <Field
                  label="Année première inscription"
                  value={values.anneePremiereInscription}
                  onChange={(v) => update('anneePremiereInscription', v)}
                  required
                  error={fieldErrors.anneePremiereInscription}
                  placeholder="2024-2025"
                />
                <Field
                  label="Date première inscription"
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
                <SelectField
                  label="Sexe"
                  value={values.sexe}
                  onChange={(v) => update('sexe', v)}
                  options={[
                    { value: 'M', label: 'Masculin' },
                    { value: 'F', label: 'Féminin' },
                  ]}
                />
              </div>
            </FormPanel>
            <FormPanel>
              <h4 className="mb-4 border-b border-light-gray pb-2 font-serif text-sm font-semibold tracking-wide text-slate-900">
                Parents (réf. dossier)
              </h4>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field label="Prénom père" value={values.parents.prenomPere} onChange={(v) => update('parents.prenomPere', v)} />
                <Field label="Fonction père" value={values.parents.fonctionPere} onChange={(v) => update('parents.fonctionPere', v)} />
                <Field label="Prénom mère" value={values.parents.prenomMere} onChange={(v) => update('parents.prenomMere', v)} />
                <Field label="Nom mère" value={values.parents.nomMere} onChange={(v) => update('parents.nomMere', v)} />
                <Field label="Fonction mère" value={values.parents.fonctionMere} onChange={(v) => update('parents.fonctionMere', v)} />
              </div>
            </FormPanel>
          </>
        )}

        {step === 1 && (
          <FormPanel>
            <h4 className="mb-4 border-b border-light-gray pb-2 font-serif text-sm font-semibold tracking-wide text-slate-900">
              Scolarité académique
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
              <SelectField
                label="Département / filière"
                value={values.scolarite.filiere}
                onChange={(v) => {
                  update('scolarite.filiere', v);
                  update('scolarite.departement', v);
                  update('filiere', v);
                }}
                options={filiereOptions}
                required
                error={fieldErrors['scolarite.filiere']}
              />
              <SelectField
                label="Niveau"
                value={values.scolarite.niveau}
                onChange={(v) => update('scolarite.niveau', v)}
                options={NIVEAUX_SCOLARITE.map((x) => ({ value: x, label: x }))}
                required
                error={fieldErrors['scolarite.niveau']}
              />
              <Field
                label="Année univ. 1ʳᵉ inscription"
                value={values.scolarite.anneeUni1ere}
                onChange={(v) => update('scolarite.anneeUni1ere', v)}
                required
                error={fieldErrors['scolarite.anneeUni1ere']}
              />
              <SelectField
                label="Voie d’accès"
                value={values.scolarite.voieAcces}
                onChange={(v) => update('scolarite.voieAcces', v)}
                options={VOIES_ACCES_ETUDIANT}
                required
                error={fieldErrors['scolarite.voieAcces']}
              />
              <SelectField
                label="Diplôme d’accès (1er cycle)"
                value={values.scolarite.diplomeAcces}
                onChange={(v) => update('scolarite.diplomeAcces', v)}
                options={[
                  { value: '', label: '—' },
                  { value: 'Licence', label: 'Licence' },
                  { value: 'CNIM', label: 'CNIM' },
                  { value: 'Autre', label: 'Autre' },
                ]}
              />
              <Field
                label="Établissement (diplôme 1er cycle)"
                value={values.scolarite.etablissementPremierCycle}
                onChange={(v) => update('scolarite.etablissementPremierCycle', v)}
              />
              <Field label="Semestre actuel" value={values.scolarite.semestreActuel} onChange={(v) => update('scolarite.semestreActuel', v)} />
              <Field label="Données semestres" value={values.scolarite.donneesSemestres} onChange={(v) => update('scolarite.donneesSemestres', v)} />
              <Field label="Diplôme" value={values.scolarite.diplome} onChange={(v) => update('scolarite.diplome', v)} />
              <Field
                label="Établissement échange"
                value={values.scolarite.etablissementEchange}
                onChange={(v) => update('scolarite.etablissementEchange', v)}
              />
              <Field
                label="Établissement double diplôme"
                value={values.scolarite.etablissementDoubleDiplome}
                onChange={(v) => update('scolarite.etablissementDoubleDiplome', v)}
              />
              <Field
                label="Spécialité mobilité"
                value={values.scolarite.specialiteMobilite}
                onChange={(v) => update('scolarite.specialiteMobilite', v)}
              />
              <Field label="Parcours" value={values.scolarite.parcours} onChange={(v) => update('scolarite.parcours', v)} error={fieldErrors['scolarite.parcours']} required />
            </div>
          </FormPanel>
        )}

        {step === 2 && (
          <FormPanel className="!p-4 sm:!p-6">
            <h4 className="mb-1 font-serif text-base font-semibold text-slate-50">Dossier — pièces jointes</h4>
            <p className="mb-5 max-w-2xl text-xs leading-relaxed text-slate-400">
              Photo d’identité, pièces administratives et relevés. Formats :{' '}
              <span className="text-gold/90">PDF, JPG, PNG</span> — taille indicative max. 5&nbsp;Mo par fichier (démo).
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <CloudUploadZone
                  label="Photo d’identité (portrait du candidat)"
                  hint="Fond neutre, visage visible — requis pour le dossier (comme l’app mobile)"
                  value={values.pieces.photoIdentite}
                  onChange={(f) => update('pieces.photoIdentite', f)}
                  accept="image/jpeg,image/png,image/webp,image/*"
                />
              </div>
              <CloudUploadZone
                label="Carte d’identité"
                hint="Scan recto-verso ou PDF"
                value={values.pieces.carteIdentite}
                onChange={(f) => update('pieces.carteIdentite', f)}
              />
              <CloudUploadZone
                label="Relevé de notes — Bac"
                hint="Bulletin ou relevé officiel"
                value={values.pieces.releveBac}
                onChange={(f) => update('pieces.releveBac', f)}
              />
              <CloudUploadZone
                label="Relevé de notes (S1 à S5)"
                hint="Un seul PDF regroupant tous les semestres"
                value={values.pieces.releveNotesSemestres}
                onChange={(f) => update('pieces.releveNotesSemestres', f)}
                accept="application/pdf,.pdf"
              />
              <CloudUploadZone
                label="Diplôme du Bac"
                hint="Copie conforme ou attestation"
                value={values.pieces.diplomeBac}
                onChange={(f) => update('pieces.diplomeBac', f)}
              />
            </div>
          </FormPanel>
        )}

        {step === 3 && (
          <FormPanel>
            <h4 className="mb-4 border-b border-light-gray pb-2 font-serif text-sm font-semibold tracking-wide text-slate-900">
              Contact (SI — détail)
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
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
              <Field label="Facebook" value={values.facebook} onChange={(v) => update('facebook', v)} />
              <Field label="LinkedIn" value={values.linkedin} onChange={(v) => update('linkedin', v)} />
              <div className="md:col-span-3">
                <p className="label">Messagerie institutionnelle</p>
                <Field
                  label="E-mail professionnel"
                  value={values.contact.emailPro}
                  onChange={(v) => update('contact.emailPro', v)}
                  error={fieldErrors['contact.emailPro']}
                  inputMode="email"
                  autoComplete="email"
                />
              </div>
              <Field
                label="E-mail personnel"
                value={values.contact.emailPerso}
                onChange={(v) => update('contact.emailPerso', v)}
                required
                error={fieldErrors['contact.emailPerso']}
                inputMode="email"
                autoComplete="email"
              />
              <Field label="Adresse (résidence principale)" value={values.contact.adresse} onChange={(v) => update('contact.adresse', v)} />
              <Field
                label="Adresse secondaire"
                value={values.contact.adresseSecondaire}
                onChange={(v) => update('contact.adresseSecondaire', v)}
              />
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
              <Field label="Contact urgence" value={values.contact.contactUrgence} onChange={(v) => update('contact.contactUrgence', v)} />
              <Field label="Nom urgence" value={values.contact.nomUrgence} onChange={(v) => update('contact.nomUrgence', v)} />
              <Field
                label="Tél. urgence"
                value={values.contact.telUrgence}
                onChange={(v) => update('contact.telUrgence', sanitizeMrPhoneDigits(v))}
                error={fieldErrors['contact.telUrgence']}
                inputMode="numeric"
                maxLength={8}
                onKeyDown={blockNonDigitKey}
              />
              <Field
                label="Tél. urgence WhatsApp"
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

        {step === 4 && (
          <FormPanel>
            <h4 className="mb-4 border-b border-light-gray pb-2 font-serif text-sm font-semibold tracking-wide text-slate-900">
              Santé
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
              <Field label="Groupe sanguin" value={values.sante.groupeSanguin} onChange={(v) => update('sante.groupeSanguin', v)} />
              <Field label="Assureur" value={values.sante.assureur} onChange={(v) => update('sante.assureur', v)} />
              <Field
                label="N° assuré"
                value={values.sante.numeroAssure}
                onChange={(v) => update('sante.numeroAssure', v)}
                error={fieldErrors['sante.numeroAssure']}
              />
              <Field label="Antécédents" value={values.sante.antecedents} onChange={(v) => update('sante.antecedents', v)} />
              <Field label="Maladies chroniques" value={values.sante.maladiesChroniques} onChange={(v) => update('sante.maladiesChroniques', v)} />
              <Field label="Médicaments à vie" value={values.sante.medicaments} onChange={(v) => update('sante.medicaments', v)} />
              <Field label="Poids (kg)" value={values.sante.poids} onChange={(v) => update('sante.poids', v)} error={fieldErrors['sante.poids']} />
              <Field label="Taille (cm)" value={values.sante.tailleCm} onChange={(v) => update('sante.tailleCm', v)} error={fieldErrors['sante.tailleCm']} />
              <Field label="IMC" value={values.sante.imc} onChange={(v) => update('sante.imc', v)} />
            </div>
          </FormPanel>
        )}

        {step === 5 && (
          <FormPanel>
            <h4 className="mb-4 border-b border-light-gray pb-2 font-serif text-sm font-semibold tracking-wide text-slate-900">
              Dossier militaire
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
              <Field label="Compagnie" value={values.dossierMilitaire.compagnie} onChange={(v) => update('dossierMilitaire.compagnie', v)} />
              <Field label="Section" value={values.dossierMilitaire.section} onChange={(v) => update('dossierMilitaire.section', v)} />
              <Field label="Sport pratiqué" value={values.dossierMilitaire.sportPratique} onChange={(v) => update('dossierMilitaire.sportPratique', v)} />
              <Field label="Tour poitrine" value={values.dossierMilitaire.tourPoitrine} onChange={(v) => update('dossierMilitaire.tourPoitrine', v)} error={fieldErrors['dossierMilitaire.tourPoitrine']} />
              <Field label="Tour ceinture" value={values.dossierMilitaire.tourCeinture} onChange={(v) => update('dossierMilitaire.tourCeinture', v)} error={fieldErrors['dossierMilitaire.tourCeinture']} />
              <Field label="Tour taille" value={values.dossierMilitaire.tourTaille} onChange={(v) => update('dossierMilitaire.tourTaille', v)} error={fieldErrors['dossierMilitaire.tourTaille']} />
              <Field label="Tour bassin" value={values.dossierMilitaire.tourBassin} onChange={(v) => update('dossierMilitaire.tourBassin', v)} error={fieldErrors['dossierMilitaire.tourBassin']} />
              <Field label="Tour cou" value={values.dossierMilitaire.tourCou} onChange={(v) => update('dossierMilitaire.tourCou', v)} error={fieldErrors['dossierMilitaire.tourCou']} />
              <Field label="Longueur manche" value={values.dossierMilitaire.longueurManche} onChange={(v) => update('dossierMilitaire.longueurManche', v)} error={fieldErrors['dossierMilitaire.longueurManche']} />
              <Field label="Longueur dos" value={values.dossierMilitaire.longueurDos} onChange={(v) => update('dossierMilitaire.longueurDos', v)} error={fieldErrors['dossierMilitaire.longueurDos']} />
              <Field label="Longueur côté" value={values.dossierMilitaire.longueurCote} onChange={(v) => update('dossierMilitaire.longueurCote', v)} error={fieldErrors['dossierMilitaire.longueurCote']} />
              <Field label="Pointure" value={values.dossierMilitaire.pointure} onChange={(v) => update('dossierMilitaire.pointure', v)} error={fieldErrors['dossierMilitaire.pointure']} />
            </div>
          </FormPanel>
        )}

        {step === 6 && (
          <FormPanel>
            <h4 className="mb-4 border-b border-light-gray pb-2 font-serif text-sm font-semibold tracking-wide text-slate-900">
              Hébergement
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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

