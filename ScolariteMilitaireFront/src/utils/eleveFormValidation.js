import { isValidMrPhone8, sanitizeMrPhoneDigits } from './mrPhone';

export const SERIE_BAC_VALUES = ['', 'C', 'D', 'T', 'LA', 'LO', 'Etrangere'];

export const SERIE_BAC_OPTIONS = [
  { value: '', label: '— (optionnel)' },
  { value: 'C', label: 'C' },
  { value: 'D', label: 'D' },
  { value: 'T', label: 'T' },
  { value: 'LA', label: 'LA' },
  { value: 'LO', label: 'LO' },
  { value: 'Etrangere', label: 'Étrangère' },
];

const DIGITS_MATRICULE = /^\d{5}$/;
const DIGITS_NNI = /^\d{10}$/;
const DIGITS_NUM_BAC = /^\d{8}$/;

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
  return digitsOnly(raw, 8);
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

export function validateEleveStep(step, values) {
  const errors = {};

  if (step === 0) {
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
    else if (!DIGITS_NUM_BAC.test(nb)) errors.numeroBac = 'Le numéro de Bac doit contenir exactement 8 chiffres.';

    if (!String(values.dateNaissance ?? '').trim()) errors.dateNaissance = reqMsg('La date de naissance');
    if (!String(values.lieuNaissance ?? '').trim()) errors.lieuNaissance = reqMsg('Le lieu de naissance');
    if (!String(values.nationalite ?? '').trim()) errors.nationalite = reqMsg('La nationalité');

    const serie = String(values.serieBac ?? '').trim();
    if (serie && !SERIE_BAC_VALUES.includes(serie)) {
      errors.serieBac = 'Choisissez une série parmi la liste ou laissez vide.';
    }

    const moy = values.moyenneBac;
    if (!String(moy ?? '').trim()) errors.moyenneBac = reqMsg('La moyenne au Bac');
    else if (!moyenneOk(moy)) errors.moyenneBac = 'Indiquez une moyenne entre 0 et 20 (ex. 14,25).';

    if (!String(values.ecoleBac ?? '').trim()) errors.ecoleBac = reqMsg("L'établissement du Bac");

    if (!String(values.anneePremiereInscription ?? '').trim()) {
      errors.anneePremiereInscription = reqMsg("L'année de première inscription");
    }

    if (!String(values.datePremiereInscription ?? '').trim()) {
      errors.datePremiereInscription = reqMsg('La date de première inscription');
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
  }

  if (step === 1) {
    if (!String(values.scolarite?.filiere ?? '').trim()) errors['scolarite.filiere'] = reqMsg('La filière');
    if (!String(values.scolarite?.niveau ?? '').trim()) errors['scolarite.niveau'] = reqMsg('Le niveau');
    if (!String(values.scolarite?.anneeUni1ere ?? '').trim()) errors['scolarite.anneeUni1ere'] = reqMsg("L'année universitaire");
    if (!String(values.scolarite?.voieAcces ?? '').trim()) errors['scolarite.voieAcces'] = reqMsg("La voie d'accès");
    if (!String(values.scolarite?.parcours ?? '').trim()) errors['scolarite.parcours'] = reqMsg('Le parcours');
  }

  if (step === 3) {
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
      ['contact.telUrgence', values.contact?.telUrgence],
      ['contact.telUrgenceWhatsapp', values.contact?.telUrgenceWhatsapp],
    ];
    for (const [path, raw] of pairs) {
      const s = String(raw ?? '').trim();
      if (s && !optionalMrPhone(s)) {
        errors[path] = '8 chiffres, commence par 2, 3 ou 4.';
      }
    }

    const ep = String(values.contact?.emailPerso ?? '').trim();
    if (!ep) errors['contact.emailPerso'] = reqMsg("L'e-mail personnel");
    else if (!simpleEmailOk(ep)) errors['contact.emailPerso'] = 'Format e-mail invalide.';

    const epro = String(values.contact?.emailPro ?? '').trim();
    if (epro && !simpleEmailOk(epro)) errors['contact.emailPro'] = 'Format e-mail invalide.';
  }

  if (step === 4) {
    const numAssure = String(values.sante?.numeroAssure ?? '').trim();
    if (numAssure && !/^\d+$/.test(numAssure.replace(/\s/g, ''))) {
      errors['sante.numeroAssure'] = 'Numéro uniquement composé de chiffres.';
    }
    const poids = String(values.sante?.poids ?? '').trim();
    if (poids && Number.isNaN(Number.parseFloat(poids.replace(',', '.')))) {
      errors['sante.poids'] = 'Nombre décimal attendu.';
    }
    const taille = String(values.sante?.tailleCm ?? '').trim();
    if (taille && Number.isNaN(Number.parseFloat(taille.replace(',', '.')))) {
      errors['sante.tailleCm'] = 'Nombre attendu.';
    }
  }

  if (step === 5) {
    const nm = ['tourPoitrine', 'tourCeinture', 'tourTaille', 'tourBassin', 'tourCou', 'longueurManche', 'longueurDos', 'longueurCote'];
    for (const k of nm) {
      const s = String(values.dossierMilitaire?.[k] ?? '').trim();
      if (s && Number.isNaN(Number.parseFloat(s.replace(',', '.')))) {
        errors[`dossierMilitaire.${k}`] = 'Nombre décimal attendu.';
      }
    }
    const pt = String(values.dossierMilitaire?.pointure ?? '').trim();
    if (pt && !/^\d{1,3}$/.test(pt)) errors['dossierMilitaire.pointure'] = 'Pointure : chiffres uniquement.';
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateSubmitSteps(values) {
  const errors = {};
  let firstStep = null;
  for (let s = 0; s <= 5; s++) {
    const r = validateEleveStep(s, values);
    if (!r.ok && firstStep === null) firstStep = s;
    Object.assign(errors, r.errors);
  }
  return {
    ok: Object.keys(errors).length === 0,
    errors,
    firstStep: firstStep ?? 0,
  };
}
