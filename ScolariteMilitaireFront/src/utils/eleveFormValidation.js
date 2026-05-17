import { isValidMrPhone8, sanitizeMrPhoneDigits } from './mrPhone';
import {
  SERIE_BAC_VALUES,
  SERIE_BAC_OPTIONS,
  STATUT_ETUDIANT_VALUES,
} from '../data/etudiantOptions';

export { SERIE_BAC_VALUES, SERIE_BAC_OPTIONS };

const DIGITS_MATRICULE = /^\d{5}$/;
const DIGITS_NNI = /^\d{10}$/;
/** N° Bac : 1 à 5 chiffres (maximum 5) */
const DIGITS_NUM_BAC = /^\d{1,5}$/;

function reqMsg(label) {
  return `${label} est obligatoire.`;
}

function digitsOnly(v, maxLen) {
  return String(v ?? '').replace(/\D/g, '').slice(0, maxLen);
}

export function sanitizeMatricule(raw) {
  return digitsOnly(raw, 5);
}

export function sanitizeNni(raw) {
  return digitsOnly(raw, 10);
}

export function sanitizeNumBac(raw) {
  return digitsOnly(raw, 5);
}

export function sanitizeDecimal(raw) {
  const s = String(raw ?? '').replace(/[^\d.,]/g, '').replace(',', '.');
  const parts = s.split('.');
  if (parts.length <= 1) return s;
  return `${parts[0]}.${parts.slice(1).join('').slice(0, 2)}`;
}

function simpleEmailOk(v) {
  const s = String(v ?? '').trim();
  if (!s) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function optionalMrPhone(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return true;
  return isValidMrPhone8(sanitizeMrPhoneDigits(s));
}

function moyenneOk(raw) {
  const s = String(raw ?? '').trim().replace(',', '.');
  if (!s) return false;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) && n >= 0 && n <= 20;
}

function decimalOk(raw, { min = 0, max = Number.POSITIVE_INFINITY } = {}) {
  const s = String(raw ?? '').trim().replace(',', '.');
  if (!s) return true;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) && n >= min && n <= max;
}

function annUniOk(raw) {
  const s = String(raw ?? '').trim();
  return /^\d{4}-\d{4}$/.test(s);
}

const STEP_KEYS = {
  ETAT_CIVIL: 'etat-civil',
  SCOLARITE: 'scolarite',
  PIECES: 'pieces',
  CONTACTS: 'contacts',
  SANTE: 'sante',
  MILITAIRE: 'militaire',
  HEBERGEMENT: 'hebergement',
  MOBILITE: 'mobilite',
};

export const STEP_KEYS_LIST = STEP_KEYS;

function validateEtatCivil(values, errors, { mode = 'standard' } = {}) {
  const m = String(values.matricule ?? '').trim();
  if (!m) errors.matricule = reqMsg('Le matricule');
  else if (!DIGITS_MATRICULE.test(m)) errors.matricule = 'Le matricule doit contenir exactement 5 chiffres.';

  const nom = String(values.nom ?? '').trim();
  if (!nom || nom.length < 2) errors.nom = reqMsg('Le nom');

  const prenom = String(values.prenom ?? '').trim();
  if (!prenom || prenom.length < 2) errors.prenom = reqMsg('Le prénom');

  const nni = String(values.nni ?? '').trim();
  if (!nni) errors.nni = reqMsg('Le NNI');
  else if (!DIGITS_NNI.test(nni)) errors.nni = 'Le NNI doit contenir exactement 10 chiffres.';

  const nb = String(values.numeroBac ?? '').trim();
  if (!nb) errors.numeroBac = reqMsg('Le numéro de Bac');
  else if (!DIGITS_NUM_BAC.test(nb)) {
    errors.numeroBac = 'Le numéro de Bac doit contenir entre 1 et 5 chiffres.';
  }

  if (!String(values.dateNaissance ?? '').trim()) errors.dateNaissance = reqMsg('La date de naissance');

  const wil = String(values.wilayaNaissance ?? '').trim();
  const com = String(values.communeNaissance ?? '').trim();
  const lieu = String(values.lieuNaissance ?? '').trim();
  if (!wil && !lieu) errors.wilayaNaissance = reqMsg('La wilaya de naissance');
  if (!com && !lieu) errors.communeNaissance = reqMsg('La commune de naissance');

  if (!String(values.nationalite ?? '').trim()) errors.nationalite = reqMsg('La nationalité');

  const serie = String(values.serieBac ?? '').trim();
  if (!serie) errors.serieBac = reqMsg('La série du Bac');
  else if (!SERIE_BAC_VALUES.includes(serie)) {
    errors.serieBac = 'Choisissez une série parmi la liste.';
  }

  const moy = values.moyenneBac;
  if (!String(moy ?? '').trim()) errors.moyenneBac = reqMsg('La moyenne au Bac');
  else if (!moyenneOk(moy)) errors.moyenneBac = 'Indiquez une moyenne entre 0 et 20 (ex. 14,25).';

  if (!String(values.ecoleBac ?? '').trim()) errors.ecoleBac = reqMsg("L'établissement du Bac");

  const annUni = String(values.scolarite?.anneeUni1ere ?? '').trim();
  if (!annUni) errors['scolarite.anneeUni1ere'] = reqMsg("L'année universitaire");
  else if (!annUniOk(annUni)) errors['scolarite.anneeUni1ere'] = 'Format attendu : AAAA-AAAA (ex : 2025-2026).';

  if (!String(values.datePremiereInscription ?? '').trim()) {
    errors.datePremiereInscription = reqMsg('La date de saisie');
  }

  const adr = String(values.contact?.adresse ?? '').trim();
  if (!adr) errors['contact.adresse'] = reqMsg("L'adresse primaire");

  const tel = sanitizeMrPhoneDigits(values.contact?.telephone ?? '');
  if (!tel) errors['contact.telephone'] = reqMsg('Le téléphone principal');
  else if (!isValidMrPhone8(tel)) {
    errors['contact.telephone'] = 'Le téléphone doit comporter 8 chiffres et commencer par 2, 3 ou 4.';
  }

  const bank = String(values.compteBankily ?? '').trim();
  if (bank) {
    const b = sanitizeMrPhoneDigits(bank);
    if (!isValidMrPhone8(b)) {
      errors.compteBankily = 'Le compte Bankily doit comporter 8 chiffres et commencer par 2, 3 ou 4.';
    }
  }

  if (!String(values.residentAvecParents ?? '').trim()) {
    errors.residentAvecParents = reqMsg('La résidence avec les parents');
  }

  const ep = String(values.contact?.emailPerso ?? '').trim();
  if (!ep) errors['contact.emailPerso'] = reqMsg("L'e-mail personnel");
  else if (!simpleEmailOk(ep)) errors['contact.emailPerso'] = 'Format e-mail invalide.';

  if (mode === 'standard' || mode === 'mobilite') {
    return errors;
  }
  return errors;
}

function validateScolarite(values, errors, { mode = 'standard' } = {}) {
  if (!String(values.scolarite?.filiere ?? '').trim()) errors['scolarite.filiere'] = reqMsg('La filière');
  if (!String(values.scolarite?.niveau ?? '').trim()) errors['scolarite.niveau'] = reqMsg('Le niveau');

  const statut = String(values.statut ?? '').trim();
  if (!statut) errors.statut = reqMsg('Le statut');
  else if (!STATUT_ETUDIANT_VALUES.includes(statut)) errors.statut = 'Statut invalide.';

  if (!String(values.scolarite?.voieAcces ?? '').trim()) errors['scolarite.voieAcces'] = reqMsg("La voie d'accès");
  if (!String(values.scolarite?.diplomeAcces ?? '').trim()) {
    errors['scolarite.diplomeAcces'] = reqMsg('Le diplôme d’accès');
  }
  if (mode === 'mobilite') {
    if (!String(values.mobilite?.type ?? '').trim()) errors['mobilite.type'] = reqMsg('Le type de mobilité');
    if (!String(values.mobilite?.etablissement ?? '').trim()) {
      errors['mobilite.etablissement'] = reqMsg("L'établissement d'accueil");
    }
    if (!String(values.mobilite?.specialite ?? '').trim()) {
      errors['mobilite.specialite'] = reqMsg('La spécialité de mobilité');
    }
  }
}

function validateContacts(values, errors) {
  const pp = String(values.parents?.prenomPere ?? '').trim();
  if (!pp) errors['parents.prenomPere'] = reqMsg('Le prénom du père');
  const np = String(values.parents?.nomFamillePere ?? '').trim();
  if (!np) errors['parents.nomFamillePere'] = reqMsg('Le nom de famille du père');

  const telUr = sanitizeMrPhoneDigits(values.contact?.telUrgence ?? '');
  if (!telUr) errors['contact.telUrgence'] = reqMsg('Le téléphone d’urgence');
  else if (!isValidMrPhone8(telUr)) {
    errors['contact.telUrgence'] = 'Le téléphone doit comporter 8 chiffres et commencer par 2, 3 ou 4.';
  }

  const telMain = sanitizeMrPhoneDigits(values.contact?.telephone ?? '');
  if (telMain && !isValidMrPhone8(telMain)) {
    errors['contact.telephone'] = 'Le téléphone doit comporter 8 chiffres et commencer par 2, 3 ou 4.';
  }
  const pairs = [
    ['contact.tel2', values.contact?.tel2],
    ['contact.telPere', values.contact?.telPere],
    ['contact.telPereWhatsapp', values.contact?.telPereWhatsapp],
    ['contact.telMere', values.contact?.telMere],
    ['contact.telMereWhatsapp', values.contact?.telMereWhatsapp],
    ['contact.telUrgenceWhatsapp', values.contact?.telUrgenceWhatsapp],
  ];
  for (const [path, raw] of pairs) {
    const s = String(raw ?? '').trim();
    if (s && !optionalMrPhone(s)) {
      errors[path] = '8 chiffres, commence par 2, 3 ou 4.';
    }
  }
}

function validateSante(values, errors) {
  const numAssure = String(values.sante?.numeroAssure ?? '').trim();
  if (numAssure && !/^\d+$/.test(numAssure.replace(/\s/g, ''))) {
    errors['sante.numeroAssure'] = 'Numéro uniquement composé de chiffres.';
  }
  if (!decimalOk(values.sante?.poids, { min: 20, max: 250 })) {
    errors['sante.poids'] = 'Poids invalide (ex : 72,5 kg).';
  }
  if (!decimalOk(values.sante?.tailleCm, { min: 80, max: 250 })) {
    errors['sante.tailleCm'] = 'Taille en cm invalide (ex : 178).';
  }
  const groupe = String(values.sante?.groupeSanguin ?? '').trim();
  if (!groupe) errors['sante.groupeSanguin'] = reqMsg('Le groupe sanguin');
}

function validateMilitaire(values, errors) {
  if (!String(values.dossierMilitaire?.compagnie ?? '').trim()) {
    errors['dossierMilitaire.compagnie'] = reqMsg('La compagnie');
  }
  if (!String(values.dossierMilitaire?.section ?? '').trim()) {
    errors['dossierMilitaire.section'] = reqMsg('La section');
  }
  const nm = ['tourPoitrine', 'tourCeinture', 'tourTaille', 'tourBassin', 'tourCou', 'longueurManche', 'longueurDos', 'longueurCote'];
  for (const k of nm) {
    if (!decimalOk(values.dossierMilitaire?.[k], { min: 0, max: 250 })) {
      errors[`dossierMilitaire.${k}`] = 'Nombre décimal attendu.';
    }
  }
  const pt = String(values.dossierMilitaire?.pointure ?? '').trim();
  if (pt && !/^\d{1,3}$/.test(pt)) errors['dossierMilitaire.pointure'] = 'Pointure : chiffres uniquement.';
}

export function validateEleveStepByKey(stepKey, values, options = {}) {
  const errors = {};
  switch (stepKey) {
    case STEP_KEYS.ETAT_CIVIL:
      validateEtatCivil(values, errors, options);
      break;
    case STEP_KEYS.SCOLARITE:
      validateScolarite(values, errors, options);
      break;
    case STEP_KEYS.CONTACTS:
      validateContacts(values, errors);
      break;
    case STEP_KEYS.SANTE:
      validateSante(values, errors);
      break;
    case STEP_KEYS.MILITAIRE:
      validateMilitaire(values, errors);
      break;
    default:
      break;
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateEleveStep(stepIndex, values, options = {}) {
  const order = options.stepKeys || [
    STEP_KEYS.ETAT_CIVIL,
    STEP_KEYS.SCOLARITE,
    STEP_KEYS.PIECES,
    STEP_KEYS.CONTACTS,
    STEP_KEYS.SANTE,
    STEP_KEYS.MILITAIRE,
    STEP_KEYS.HEBERGEMENT,
  ];
  const key = order[stepIndex] || order[0];
  return validateEleveStepByKey(key, values, options);
}

export function validateSubmitSteps(values, options = {}) {
  const order = options.stepKeys || [
    STEP_KEYS.ETAT_CIVIL,
    STEP_KEYS.SCOLARITE,
    STEP_KEYS.PIECES,
    STEP_KEYS.CONTACTS,
    STEP_KEYS.SANTE,
    STEP_KEYS.MILITAIRE,
    STEP_KEYS.HEBERGEMENT,
  ];
  const errors = {};
  let firstStep = null;
  for (let i = 0; i < order.length; i++) {
    const r = validateEleveStepByKey(order[i], values, options);
    if (!r.ok && firstStep === null) firstStep = i;
    Object.assign(errors, r.errors);
  }
  return {
    ok: Object.keys(errors).length === 0,
    errors,
    firstStep: firstStep ?? 0,
  };
}
