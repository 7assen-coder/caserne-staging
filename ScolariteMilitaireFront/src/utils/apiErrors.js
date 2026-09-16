const REQUIRED_MSG = 'Ce champ est obligatoire.';
const REQUIRED_MSG_RE = /^ce champ est obligatoire\.?$/i;

const FIELD_LABELS = {
  matricule: 'Matricule',
  nom: 'Nom',
  prenom: 'Prénom',
  nom_famille: 'Nom de famille',
  nom_famille_ar: 'Nom (arabe)',
  prenom_ar: 'Prénom (arabe)',
  nni: 'NNI',
  sexe: 'Sexe',
  email: 'E-mail',
  email_pro: 'E-mail professionnel',
  emailPro: 'E-mail professionnel',
  email_perso: 'E-mail personnel',
  emailPerso: 'E-mail personnel',
  telephone: 'Téléphone',
  tel1: 'Téléphone principal',
  tel2_whatsapp: 'Tél. 2 WhatsApp',
  password: 'Mot de passe',
  niveau_actuel: 'Niveau actuel',
  niveau: 'Niveau actuel',
  departement: 'Département',
  semestre_actuel: 'Semestre actuel',
  parcours: 'Statut académique',
  voie_acces: 'Voie d’accès',
  diplome_acces: 'Diplôme d’accès',
  etablissement_diplome: 'Établissement',
  annee_premiere_inscription: 'Année univ. 1re inscr.',
  date_premiere_inscription: 'Date de 1re inscription',
  date_naissance: 'Date de naissance',
  lieu_naissance: 'Lieu de naissance',
  nationalite: 'Nationalité',
  num_bac: 'N° Bac',
  categorie_bac: 'Catégorie Bac',
  serie_bac: 'Série du Bac',
  moyenne_bac: 'Moyenne au Bac',
  ecole_bac: 'École du Bac',
  adresse_primaire: 'Adresse primaire',
  adresse_secondaire: 'Adresse secondaire',
  resident_avec_parents: 'Résident avec les parents',
  compte_bankily: 'Compte Bankily',
  prenom_pere: 'Prénom du père',
  nom_famille_pere: 'Nom de famille du père',
  fonction_pere: 'Fonction (père)',
  tel_pere: 'Tél. père',
  tel_pere_whatsapp: 'Tél. père WhatsApp',
  prenom_mere: 'Prénom de la mère',
  nom_famille_mere: 'Nom de famille de la mère',
  fonction_mere: 'Fonction (mère)',
  tel_mere: 'Tél. mère',
  tel_mere_whatsapp: 'Tél. mère WhatsApp',
  nom_urgence: 'Nom urgence',
  tel_urgence: 'Tél. urgence',
  tel_urgence_whatsapp: 'WhatsApp urgence',
  groupe_sanguin: 'Groupe sanguin',
  assureur: 'Assureur',
  num_assure: 'N° assuré',
  antecedents_medicaux: 'Antécédents',
  maladies_chroniques: 'Maladies chroniques',
  medicaments_reguliers: 'Médicaments',
  poids: 'Poids',
  taille: 'Taille',
  compagnie: 'Compagnie',
  section: 'Section',
  sport_pratique: 'Sport pratiqué',
  tour_poitrine: 'Tour poitrine',
  tour_ceinture: 'Tour ceinture',
  tour_taille: 'Tour taille',
  tour_bassin: 'Tour bassin',
  tour_cou: 'Tour cou',
  longueur_manche: 'Longueur manche',
  longueur_dos: 'Longueur dos',
  longueur_cote: 'Longueur côté',
  pointure: 'Pointure',
  cin: 'CIN',
  acte_naissance: 'Acte de naissance',
  photo_identite_militaire: 'Photo identité militaire',
  photo_identite_civile: 'Photo d’identité',
  photo_militaire_integrale: 'Photo militaire intégrale',
  type_mobilite: 'Type de mobilité',
  etablissement_echange: 'Établissement d’accueil',
  etablissement_double_diplome: 'Établissement d’accueil',
  specialite_mobilite: 'Spécialité de mobilité',
  non_field_errors: 'Erreur',
  detail: 'Détail',
  file: 'Fichier',
  photo: 'Photo',
  eleve: 'Élève',
};

const HTTP_MESSAGES = {
  400: 'Les informations envoyées sont incorrectes. Vérifiez le formulaire.',
  401: 'Session expirée. Reconnectez-vous pour continuer.',
  403: "Vous n'avez pas la permission d'effectuer cette action.",
  404: 'Élément introuvable.',
  408: 'La requête a pris trop de temps. Réessayez.',
  409: 'Un autre utilisateur a modifié cette fiche. Rechargez puis réessayez.',
  413: 'Le fichier dépasse la taille maximale autorisée.',
  415: 'Format de fichier non accepté.',
  422: 'Certaines informations sont invalides. Corrigez le formulaire.',
  429: 'Trop de tentatives. Patientez quelques instants.',
  500: 'Le serveur est temporairement indisponible. Réessayez plus tard.',
  502: 'Service momentanément indisponible. Réessayez plus tard.',
  503: 'Service momentanément indisponible. Réessayez plus tard.',
};

function isHtmlString(value) {
  if (typeof value !== 'string') return false;
  const t = value.trim();
  return /<html|<!doctype|<title|<body/i.test(t);
}

function stripHtml(value) {
  return String(value)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function looksLikeTechDump(text) {
  return (
    /IntegrityError|OperationalError|ProgrammingError|Traceback|django\.|psycopg|SQLSTATE|at 0x[0-9a-f]+/i.test(text)
    || (/\{".*"\}/.test(text) && text.length > 120)
  );
}

function humanizeRawMessage(raw) {
  if (raw == null || raw === '') return '';
  let text = typeof raw === 'string' ? raw : String(raw);
  if (isHtmlString(text)) {
    if (/413|Request Entity Too Large|Content Too Large/i.test(text)) {
      return HTTP_MESSAGES[413];
    }
    if (/404|Not Found/i.test(text)) return HTTP_MESSAGES[404];
    if (/403|Forbidden/i.test(text)) return HTTP_MESSAGES[403];
    if (/500|Internal Server Error/i.test(text)) return HTTP_MESSAGES[500];
    const stripped = stripHtml(text);
    if (stripped.length > 180) return 'Une erreur est survenue. Réessayez ou contactez l’administrateur.';
    return stripped || 'Une erreur est survenue.';
  }
  text = text.trim();

  if (looksLikeTechDump(text)) {
    return 'Une erreur est survenue. Réessayez ou contactez l’administrateur.';
  }

  // Strip common DRF / Django prefixes
  text = text
    .replace(/^ValidationError:\s*/i, '')
    .replace(/^\[ErrorDetail\(string='/i, '')
    .replace(/',\s*code='[^']+'\)\]$/i, '')
    .trim();

  if (/this field may not be blank|this field is required|this field may not be null/i.test(text)) {
    return REQUIRED_MSG;
  }
  if (/ce champ ne peut (être|etre) vide|ce champ est obligatoire|cette valeur ne peut (être|etre) nulle/i.test(text)) {
    return REQUIRED_MSG;
  }

  const maxLen = text.match(/no more than (\d+) characters|pas plus de (\d+) caract/i);
  if (maxLen) {
    const n = maxLen[1] || maxLen[2];
    return `Trop long (maximum ${n} caractères).`;
  }
  const minLen = text.match(/at least (\d+) characters|au moins (\d+) caract/i);
  if (minLen) {
    const n = minLen[1] || minLen[2];
    return `Trop court (minimum ${n} caractères).`;
  }

  if (/enter a valid email|adresse e-?mail.*invalide|saisissez une adresse e-?mail/i.test(text)) {
    return 'Adresse e-mail invalide.';
  }
  if (/a valid integer is required|entier valide|nombre entier/i.test(text)) {
    return 'Nombre invalide.';
  }
  if (/a valid number is required|nombre valide/i.test(text)) {
    return 'Nombre invalide.';
  }
  if (/date has wrong format|enter a valid date|date invalide|saisissez une date/i.test(text)) {
    return 'Date invalide.';
  }
  if (/is not a valid choice|n['']est pas un choix valide/i.test(text)) {
    return 'Valeur non reconnue. Choisissez une option dans la liste.';
  }
  if (/already exists|existe déjà|unique set|must be unique/i.test(text)) {
    return 'Cette valeur existe déjà.';
  }
  if (/ensure this value is (greater|less)|valeur.*limites|hors limites/i.test(text)) {
    return 'Valeur hors limites autorisées.';
  }
  if (/incorrect type|not a valid string|pas une chaîne|type incorrect/i.test(text)) {
    return 'Format incorrect.';
  }
  if (/upload a valid image|image invalide|fichier.*illisible/i.test(text)) {
    return 'Fichier image invalide.';
  }

  const statusMatch = text.match(/status code (\d{3})/i);
  if (statusMatch) {
    const code = Number(statusMatch[1]);
    if (HTTP_MESSAGES[code]) return HTTP_MESSAGES[code];
  }

  if (/network error/i.test(text)) {
    return 'Impossible de joindre le serveur. Vérifiez votre connexion internet.';
  }
  if (/timeout|ECONNABORTED/i.test(text)) {
    return HTTP_MESSAGES[408];
  }
  if (/login_locked|temporairement verrouillé|verrouillé/i.test(text)) {
    return text.length < 200 ? text : 'Compte temporairement verrouillé. Réessayez plus tard.';
  }
  if (/failed to fetch/i.test(text)) {
    return 'Connexion interrompue. Vérifiez votre réseau et réessayez.';
  }
  if (/unexpected token|<!doctype/i.test(text)) {
    return 'Le serveur a renvoyé une réponse inattendue. Réessayez plus tard.';
  }

  // Already French and short enough — keep; otherwise avoid dumping English jargon.
  if (/^[A-Za-z][A-Za-z0-9 _.'-]{0,80}$/.test(text) && /\b(field|null|blank|required|invalid|error)\b/i.test(text)) {
    return 'Informations incorrectes. Vérifiez le formulaire.';
  }

  return text;
}

function stringifyToken(token) {
  if (token == null) return '';
  if (typeof token === 'string') return humanizeRawMessage(token);
  if (typeof token === 'number' || typeof token === 'boolean') return String(token);
  if (Array.isArray(token)) {
    return token.map((x) => stringifyToken(x)).filter(Boolean).join(' ');
  }
  if (typeof token === 'object') {
    const msg = token.message || token.detail || token.string;
    if (msg) return humanizeRawMessage(String(msg));
    try {
      return humanizeRawMessage(JSON.stringify(token));
    } catch {
      return 'Erreur inconnue.';
    }
  }
  return humanizeRawMessage(String(token));
}

function firstListItem(v) {
  if (v == null) return '';
  if (Array.isArray(v)) return v.map(stringifyToken).filter(Boolean).join(' — ') || stringifyToken(v[0]);
  return stringifyToken(v);
}

function fieldLabel(key) {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  const leaf = String(key).includes('.') ? String(key).split('.').pop() : key;
  if (FIELD_LABELS[leaf]) return FIELD_LABELS[leaf];
  return String(key).replace(/_/g, ' ').replace(/\./g, ' · ');
}

/** Build "Label est obligatoire." or "Label : message" without repeating "Ce champ". */
function formatFieldLine(key, rawMsg) {
  const label = fieldLabel(key);
  const msg = firstListItem(rawMsg);
  if (!msg) return label;
  if (REQUIRED_MSG_RE.test(msg.trim())) {
    return `${label} est obligatoire.`;
  }
  if (label === key) return msg;
  return `${label} : ${msg}`;
}

function flattenFieldErrors(obj, prefix = '') {
  const out = [];
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v != null && typeof v === 'object' && !Array.isArray(v) && typeof v.detail === 'undefined' && typeof v.string === 'undefined') {
      out.push(...flattenFieldErrors(v, key));
    } else {
      out.push(formatFieldLine(k, v));
    }
  }
  return out;
}

/** Message court et lisible pour l’utilisateur final (erreurs API, réseau, fichiers, etc.). */
export function isVersionConflict(err) {
  return err?.response?.status === 409 && err?.response?.data?.code === 'version_conflict';
}

export function versionConflictPayload(err) {
  return err?.response?.data || null;
}

export function formatApiError(err) {
  const status = err?.response?.status;
  const data = err?.response?.data;

  if (status === 409) {
    const d = typeof data?.detail === 'string' ? data.detail : null;
    return d || HTTP_MESSAGES[409];
  }

  if (status && HTTP_MESSAGES[status] && status !== 400 && status !== 422) {
    return HTTP_MESSAGES[status];
  }

  if (!data) {
    const msg = err?.message;
    if (msg) return humanizeRawMessage(msg);
    return 'Erreur réseau. Vérifiez votre connexion.';
  }

  if (typeof data === 'string') {
    if (isHtmlString(data)) {
      if (status === 413) return HTTP_MESSAGES[413];
      return humanizeRawMessage(stripHtml(data));
    }
    return humanizeRawMessage(data);
  }

  if (data.code === 'token_not_valid' || data.messages) {
    return HTTP_MESSAGES[401];
  }

  if (data.error && typeof data.error === 'string') {
    return humanizeRawMessage(data.error);
  }

  if (data.non_field_errors) {
    return firstListItem(data.non_field_errors);
  }

  if (data.detail != null) {
    if (typeof data.detail === 'string') {
      if (isHtmlString(data.detail)) return humanizeRawMessage(stripHtml(data.detail));
      return humanizeRawMessage(data.detail);
    }
    if (Array.isArray(data.detail)) {
      return data.detail.map((d) => stringifyToken(d)).filter(Boolean).join(' ');
    }
    if (typeof data.detail === 'object') {
      const flat = flattenFieldErrors(data.detail);
      return flat.join(' — ') || HTTP_MESSAGES[400];
    }
  }

  const skip = new Set(['detail', 'code', 'messages', 'error']);
  const entries = Object.entries(data).filter(([k]) => !skip.has(k));
  if (entries.length > 0) {
    const lines = [];
    for (const [k, v] of entries) {
      if (v != null && typeof v === 'object' && !Array.isArray(v) && typeof v.detail === 'undefined' && typeof v.string === 'undefined') {
        lines.push(...flattenFieldErrors(v, k));
      } else {
        lines.push(formatFieldLine(k, v));
      }
    }
    return lines.join(' · ') || HTTP_MESSAGES[400];
  }

  if (status && HTTP_MESSAGES[status]) return HTTP_MESSAGES[status];
  return humanizeRawMessage(err?.message) || 'Une erreur est survenue.';
}

/** Alias pour erreurs JavaScript simples ou messages bruts. */
export function humanizeError(errOrMessage) {
  if (errOrMessage == null) return 'Une erreur est survenue.';
  if (typeof errOrMessage === 'string') return humanizeRawMessage(errOrMessage);
  if (errOrMessage?.response || errOrMessage?.isAxiosError) return formatApiError(errOrMessage);
  if (errOrMessage?.message) return humanizeRawMessage(errOrMessage.message);
  return 'Une erreur est survenue.';
}
